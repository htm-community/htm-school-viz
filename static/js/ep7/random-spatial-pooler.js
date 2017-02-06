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

    var history = {
        inputEncoding: [],
        activeColumns: [],
        overlaps: []
    };

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');

    var spClient;

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
    var chartHeight = 300;
    var inputChart = new HTM.utils.chart.InputChart(
        '#input-chart', '/static/data/hotgym-short.csv',
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
        spClient = new HTM.SpatialPoolerClient(false);
        loading(true);
        spClient.initialize(spParams.getParams(), function() {
            loading(false);
            if (callback) callback();
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
                        activeColumns) {

        var dim = 800;
        drawSdr(
            'input-encoding', inputEncoding, dim, dim, 'green'
        );
        drawSdr(
            'active-columns', activeColumns, dim, dim, 'orange'
        );
    }

    function runOnePointThroughSp(cursor, callback) {
        if (cursor == undefined) cursor = inputChart.dataCursor;
        var data = inputChart.data;
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

        // Run encoding through SP.
        states = ['activeColumns', 'overlaps']
        spClient.compute(encoding, learn, states, function(err, spBits) {
            if (err) throw err;
            var activeColumns = spBits.state.activeColumns;
            var overlaps = spBits.state.overlaps;

            var closeAc = _.map(getClosestSdrIndices(
                activeColumns, history.activeColumns, Math.floor(cursor * 0.1)
            ), function(inputIndex) {
                return {
                    index: inputIndex,
                    data: data[inputIndex]
                };
            });
            var closeEc = _.map(getClosestSdrIndices(
                encoding, history.inputEncoding, Math.floor(cursor * 0.05)
            ), function(inputIndex) {
                return {
                    index: inputIndex,
                    data: data[inputIndex]
                };
            });

            inputChart.updateChartMarkers(date, closeAc, closeEc);

            renderSdrs(
                encoding,
                activeColumns
            );

            history.inputEncoding[cursor] = encoding;
            history.activeColumns[cursor] = activeColumns;
            history.overlaps[cursor] = overlaps;
            if (callback) callback();
        });
    }

    function stepThroughData(callback) {
        if (!playing || inputChart.dataCursor == inputChart.data.length - 1) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(inputChart.dataCursor++, stepThroughData);
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
            } else if (this.id == 'stop') {
                stop();
            } else if (this.id == 'next') {
                runOnePointThroughSp(inputChart.dataCursor++);
            } else if (this.id == 'prev') {
                runOnePointThroughSp(inputChart.dataCursor--);
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

    function stop() {
        var $play = $('#play');
        playing = false;
        $play.find('span').attr('class', 'glyphicon glyphicon-play');
        $play.removeClass('btn-success');
        $('#input-chart').html('');
        inputChart.render(chartWidth, chartHeight);
        inputChart.dataCursor = 0;
        runOnePointThroughSp();
    }

    initSp(function() {
        inputChart.render(function() {
            //addSlider();
            addDataControlHandlers();
            runOnePointThroughSp(inputChart.dataCursor++);
        });
    });

});
