$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    var learn = false;
    var playing = false;
    var save = false;
    var noise = 0.0;

    var randomHistory = {
        inputEncoding: [],
        activeColumns: []
    };
    var learningHistory = {
        activeColumns: []
    };

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');

    var randomSpClient;
    var learningSpClient;

    // SP params we are not allowing user to change
    var inputDimensions = [
        scalarN
        + dateEncoder.timeOfDayEncoder.getWidth()
        + dateEncoder.weekendEncoder.getWidth()
    ];
    var columnDimensions = [2048];
    var randSpParams = new HTM.utils.sp.Params(
        '', inputDimensions, columnDimensions
    );
    var learnSpParams = new HTM.utils.sp.Params(
        '', inputDimensions, columnDimensions
    );

    var chartWidth = 1900;
    var chartHeight = 120;
    var randomChart = new HTM.utils.chart.InputChart(
        '#random-chart', '/static/data/hotgym-short.csv',
        chartWidth, chartHeight
    );
    var learningChart = new HTM.utils.chart.InputChart(
        '#learning-chart', '/static/data/hotgym-short.csv',
        chartWidth, chartHeight
    );

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    function loading(isLoading, isModal) {
        if (isModal == undefined) {
            isModal = true;
        }
        if (isLoading) {
            waitingForServer = true;
            if (! isModal) {
                $loading.addClass('little');
            }
            $loading.show();
        } else {
            waitingForServer = false;
            $loading.hide();
            $loading.removeClass('little');
        }
    }

    function initSp(callback) {
        loading(true);
        // This might be an interested view to show boosting in action.
        //learnSpParams.setParam("maxBoost", 2);
        randomSpClient = new HTM.SpatialPoolerClient(save);
        learningSpClient = new HTM.SpatialPoolerClient(save);
        randomSpClient.initialize(randSpParams.getParams(), function() {
            learningSpClient.initialize(learnSpParams.getParams(), function() {
                loading(false);
                if (callback) callback();
            });
        });
    }

    function drawSdr(id, sdr, w, h, style) {
        var margin = {top: 20, right: 20, bottom: 20, left: 20},
            width = w - margin.left - margin.right,
            height = h - margin.top - margin.bottom,
            rowLength = Math.floor(Math.sqrt(sdr.length)),
            fullRectSize = Math.floor(width / rowLength),
            rectSize = fullRectSize - 1,
            onColor = 'steelblue'
            ;

        $('#' + id).html('');

        var svg = d3.select('#' + id).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            ;

        var styleFunction = function(d, i) {
            var fill = 'white';
            if (d == 1) {
                fill = onColor;
            }
            return 'fill:' + fill;
        };

        if (style) {
            if (typeof(style) == 'string') {
                onColor = style;
            } else if (typeof(style) == 'function') {
                styleFunction = style;
            } else {
                throw new Error('style must be function or string');
            }
        }

        svg.selectAll('rect')
            .data(sdr)
            .enter()
            .append('rect')
            .attr('x', function(d, i) {
                var offset = i % rowLength;
                return offset * fullRectSize;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * fullRectSize;
            })
            .attr('index', function(d, i) { return i; })
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('style', styleFunction)
        ;
    }

    function renderSdrs(inputEncoding,
                        randomAc,
                        learningAc) {

        var dim = 800;
        drawSdr(
            'input-encoding', inputEncoding, dim, dim, 'green'
        );
        drawSdr(
            'random-columns', randomAc, dim, dim, 'orange'
        );
        drawSdr(
            'learning-columns', learningAc, dim, dim, 'orange'
        );
    }

    function runOnePointThroughSp(callback) {
        var chart = randomChart;
        var cursor = chart.dataCursor;
        var data = chart.data;
        var point = data[cursor];
        var date = moment(point.date);
        var power = parseFloat(point['consumption']);
        var encoding = [];
        var noisyEncoding = [];
        var day = date.day();
        var isWeekend = (day == 6) || (day == 0);    // 6 = Saturday, 0 = Sunday

        // Update UI display of current data point.
        $powerDisplay.html(power);
        $todDisplay.html(date.format('h A'));
        $weekendDisplay.html(isWeekend ? 'yes' : 'no');

        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        encoding = encoding.concat(dateEncoder.encodeWeekend(date));

        noisyEncoding = SDR.tools.addNoise(encoding, noise);

        // Run encoding through SP.
        randomSpClient.compute(noisyEncoding, {
            learn: learn
        }, function(randomSpBits) {
            var randomAc = randomSpBits.activeColumns;

            learningSpClient.compute(noisyEncoding, {
                learn: true
            }, function(learningSpBits) {
                var learningAc = learningSpBits.activeColumns;

                var randomAcOverlaps = _.map(randomHistory.activeColumns, function(hist) {
                    return SDR.tools.getOverlapScore(randomAc, hist);
                });
                var learningAcOverlaps = _.map(learningHistory.activeColumns, function(hist) {
                    return SDR.tools.getOverlapScore(learningAc, hist);
                });

                randomChart.renderOverlapHistory(date, randomAcOverlaps, data);
                learningChart.renderOverlapHistory(date, learningAcOverlaps, data);

                renderSdrs(
                    noisyEncoding,
                    randomAc,
                    learningAc
                );

                randomHistory.inputEncoding[cursor] = encoding;
                randomHistory.activeColumns[cursor] = randomAc;
                learningHistory.activeColumns[cursor] = learningAc;
                if (callback) callback();
            });

        });
    }

    function stepThroughData(callback) {
        if (!playing || randomChart.dataCursor == randomChart.data.length - 1) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(stepThroughData);
        randomChart.dataCursor++;
        learningChart.dataCursor++;
    }

    function addDataControlHandlers() {
        $('.player button').click(function(evt) {
            var $btn = $(this);
            if (this.id == 'play') {
                if ($btn.hasClass('btn-success')) {
                    pause();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-play');
                } else {
                    play();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-pause');
                }
                $btn.toggleClass('btn-success');
            } else if (this.id == 'next') {
                runOnePointThroughSp();
                randomChart.dataCursor++;
                learningChart.dataCursor++;
            }
        });
    }

    function createSlider() {
        var $noiseSlider = $('#noise-slider');
        var $noiseDisplay = $('#noise-display');
        $noiseDisplay.html(noise);
        $noiseSlider.slider({
            min: 0.0,
            max: 1.0,
            value: noise,
            step: 0.01,
            slide: function(event, ui) {
                noise = ui.value;
                $noiseDisplay.html(noise);
            }
        });
    }

    function play() {
        playing = true;
        stepThroughData(function (err) {
            if (err) throw err;
        });
    }

    function pause() {
        playing = false;
    }

    createSlider();

    initSp(function() {
        randomChart.render(function() {
            learningChart.render(function() {
                addDataControlHandlers();
                runOnePointThroughSp();
                randomChart.dataCursor++;
                learningChart.dataCursor++;
            });
        });
    });

});
