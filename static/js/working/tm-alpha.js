$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    var learn = true;
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
    var tmClient;

    // SP params we are not allowing user to change
    var inputDimensions = [
        scalarN
        + dateEncoder.timeOfDayEncoder.getWidth()
        + dateEncoder.weekendEncoder.getWidth()
    ];
    var columnDimensions = [1024];
    var cellsPerColumn = 4;
    var lengthLargestSide = 32;
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var chartWidth = 2000;
    var chartHeight = 300;
    var inputChart = new HTM.utils.chart.InputChart(
        '#input-chart', '/static/data/hotgym-short.csv',
        chartWidth, chartHeight
    );

    var cells, cellviz;

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

    // TODO: This is dumb but fine for now
    function getTmParams() {
        return {
            columnDimensions: columnDimensions,
            cellsPerColumn: cellsPerColumn,
            activationThreshold: 13,
            initialPermanence: 0.21,
            connectedPermanence: 0.50,
            minThreshold: 10,
            maxNewSynapseCount: 20,
            permanenceIncrement: 0.10,
            permanenceDecrement: 0.10,
            predictedSegmentDecrement: 0.0,
            maxSegmentsPerCell: 255,
            maxSynapsesPerSegment: 255
        };
    }

    function initModel(callback) {
        spClient = new HTM.SpatialPoolerClient();
        tmClient = new HTM.TemporalMemoryClient();
        loading(true);
        spClient.initialize(spParams.getParams(), function() {
            console.log('SP initialized.');
            var tmParams = getTmParams();
            tmClient.initialize(tmParams, {id: spClient._id}, function() {
                console.log('TM initialized.');
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
                        activeColumns) {

        var dim = 600;
        drawSdr(
            'input-encoding', inputEncoding, dim, dim, 'green'
        );
        drawSdr(
            'active-columns', activeColumns, dim, dim, 'orange'
        );
    }

    function setupTmViz() {
        // The problem space.
        var numColumns = columnDimensions[0];

        // Translate into cell dimensions.
        // x = left->right
        // y = down->up
        // z = near->far
        var x = numColumns / lengthLargestSide;
        var y = cellsPerColumn;
        var z = lengthLargestSide;

        var colors = {
            0: 0xffffff, // white for inactive cells
            1: 0xffff00, // yellow for active cells
            2: 0xff0000, // red for predictive cells
            3: 0xFFAC33  // orange for predictive cells
        };

        // The Cells interface is how to update the visualization inside the canvas.
        cells = new HtmCells(x, y, z);

        // The HtmCellVisualization object handles all interactions with the DOM.
        cellviz = new HtmCellVisualization(
            cells, {elementId: 'tm', colors: colors}
        );

        // Renders the canvas with empty cells into the DOM and canvas.
        cellviz.render({
            position: {
                //x: -40,
                //y: 10
            },
            rotation: {
                x: 90 * Math.PI / 180
                //y: 45 * Math.PI / 180
            },
            camera: {
                z: 40
            }
        });
    }

    function renderTmViz(activeCells, predictiveCells) {
        // The problem space.
        var numColumns = columnDimensions[0];

        cells.updateAll(0);

        activeCells.forEach(function(activeIndex) {
            var column = Math.floor(activeIndex / cellsPerColumn);
            var celly = activeIndex % cellsPerColumn; // y
            var cellz = Math.floor(column / lengthLargestSide); // z
            var cellx = column % lengthLargestSide;
            cells.update(cellx, celly, cellz, 1);
        });

        predictiveCells.forEach(function(activeIndex) {
            var column = Math.floor(activeIndex / cellsPerColumn);
            var celly = activeIndex % cellsPerColumn; // y
            var cellz = Math.floor(column / lengthLargestSide); // z
            var cellx = column % lengthLargestSide;
            var cellValue = 2;
            if (cells.getCellValue(cellx, celly, cellz) == 1) {
                cellValue = 3;
            }
            cells.update(cellx, celly, cellz, cellValue);
        });

        cellviz.redraw();
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
        spClient.compute(encoding, {
            learn: learn
        }, function(err, spBits) {
            if (err) throw err;
            var activeColumns = spBits.activeColumns;
            var overlaps = spBits.overlaps;

            tmClient.compute(activeColumns, {
                learn: learn
            }, function(err, response) {
                if (err) throw err;
                var activeCells = response.activeCells;
                var predictiveCells = response.predictiveCells;
                inputChart.updateChartMarkers(date);
                renderSdrs(
                    encoding,
                    activeColumns
                );
                renderTmViz(activeCells, predictiveCells);
                history.inputEncoding[cursor] = encoding;
                history.activeColumns[cursor] = activeColumns;
                history.overlaps[cursor] = overlaps;
                if (callback) callback();
            });
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
            } else if (this.id == 'next') {
                runOnePointThroughSp(inputChart.dataCursor++);
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
        initModel(function() {
            setupTmViz();
            inputChart.render(function() {
                //addSlider();
                addDataControlHandlers();
                runOnePointThroughSp(inputChart.dataCursor++);
            });
        });
    }, function() {
        initModel();
    });

});
