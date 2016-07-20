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
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var chartWidth = 2000;
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

    function getClosestSdrIndices(target, sdrs, count) {
        if (! count) count = 10;
        var overlaps = _.map(sdrs, function(sdr, i) {
            return {
                overlap: SDR.tools.getOverlapScore(target, sdr),
                index: i
            };
        });
        var sortedOverlaps = _.sortBy(overlaps, function(o) {
            return o.overlap;
        }).reverse();
        return _.map(sortedOverlaps, function(o) { return o.index; }).slice(0, count);
    }

    function initSp(callback) {
        var params = spParams.getParams();
        loading(true);
        randomSpClient = new HTM.SpatialPoolerClient(false);
        learningSpClient = new HTM.SpatialPoolerClient(false);
        randomSpClient.initialize(params, function() {
            learningSpClient.initialize(params, function() {
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

        function getClosest(target, sdrs, data, perc) {
            return _.map(getClosestSdrIndices(
                target, sdrs, Math.floor(cursor * perc)
            ), function(inputIndex) {
                return {
                    index: inputIndex,
                    data: data[inputIndex]
                };
            });
        }

        // Run encoding through SP.
        randomSpClient.compute(encoding, {
            learn: learn
        }, function(randomSpBits) {
            var randomAc = randomSpBits.activeColumns;
            var showPerc = 0.1;

            learningSpClient.compute(encoding, {
                learn: true
            }, function(learningSpBits) {
                var learningAc = learningSpBits.activeColumns;

                var closeRandomAc = getClosest(randomAc, randomHistory.activeColumns, data, showPerc);
                var closeLearningAc = getClosest(learningAc, learningHistory.activeColumns, data, showPerc);
                var closeEc = getClosest(encoding, randomHistory.inputEncoding, data, showPerc);

                randomChart.updateChartMarkers(date, closeRandomAc, closeEc);
                learningChart.updateChartMarkers(date, closeLearningAc, closeEc);

                renderSdrs(
                    encoding,
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

    spParams.render(function() {
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
    }, function() {
        initSp();
    });

});
