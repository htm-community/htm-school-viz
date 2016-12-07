$(function() {

    var learn = true;
    var playing = false;

    var spClient;
    var tmClient;

    // SP params we are not allowing user to change
    var inputDimensions = [400];
    var columnDimensions = [1024];
    var cellsPerColumn = 4;
    var lengthLargestSide = 32;
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var cells, cellviz;

    var counter = 0;
    var lastPredictiveCells = [];

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var swap = false;
    var $swapSwitch = $('#swap').bootstrapSwitch({state: swap});
    var tmReset = false;
    var $resetSwitch = $('#reset').bootstrapSwitch({state: tmReset});

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

    function getTmParams() {
        // TODO: Provide a UI to change TM Params.
        return {
            columnDimensions: columnDimensions,
            cellsPerColumn: cellsPerColumn,
            activationThreshold: 10,
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
            0: 0xFFFFFF, // white for inactive cells
            1: 0xFFFF00, // yellow for active cells
            2: 0xFF0000, // red for predictive cells
            3: 0xFFAC33, // orange for active & predictive cells
            4: 0x6699FF  // cyan for correctly predicted cells from last step
        };

        // The Cells interface is how to update the visualization inside the canvas.
        cells = new HtmCells(x, y, z);

        // The HtmCellVisualization object handles all interactions with the DOM.
        cellviz = new HtmCellVisualization(
            cells, {
                elementId: 'tm',
                colors: colors,
                spacing: 1.4
            }
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
                z: 45
            }
        });
    }

    function renderTmViz(activeCells, predictiveCells) {
        cells.updateAll(0);

        activeCells.forEach(function(activeIndex) {
            var column = Math.floor(activeIndex / cellsPerColumn);
            var celly = activeIndex % cellsPerColumn; // y
            var cellz = Math.floor(column / lengthLargestSide); // z
            var cellx = column % lengthLargestSide;
            cells.update(cellx, celly, cellz, 1);
        });

        lastPredictiveCells.forEach(function(activeIndex) {
            var column = Math.floor(activeIndex / cellsPerColumn);
            var celly = activeIndex % cellsPerColumn; // y
            var cellz = Math.floor(column / lengthLargestSide); // z
            var cellx = column % lengthLargestSide;
            cells.update(cellx, celly, cellz, 4);
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

        lastPredictiveCells = predictiveCells;
    }

    function getEncoding() {
        var n = inputDimensions[0];
        var buckets = 8;
        var ticker = counter % buckets;
        var swapTrigger = counter % (buckets * 2);
        var bucketWidth = Math.floor(n / buckets);
        var out = SDR.tools.getEmpty(n);

        if (swap && (swapTrigger == 2 || swapTrigger == 3)) {
            if (ticker == 2) ticker = 3;
            else if (ticker == 3) ticker = 2;
        }

        var startIndex = bucketWidth * ticker;
        var stopIndex = startIndex + bucketWidth;
        for (var i = startIndex; i < stopIndex; i++) {
            out[i] = 1;
        }
        counter++;
        return out;
    }

    function runOnePointThroughSp(callback) {
        // Encode data point into SDR.
        var encoding = getEncoding();
        var reset = tmReset && (encoding[encoding.length - 1] == 1);

        // Run encoding through SP.
        spClient.compute(encoding, {
            learn: learn
        }, function(err, spBits) {
            if (err) throw err;
            var activeColumns = spBits.activeColumns;

            if (reset) {
                console.log('TM Reset after this row of data.');
            }
            tmClient.compute(activeColumns, {
                learn: learn,
                reset: reset
            }, function(err, response) {
                if (err) throw err;
                var activeCells = response.activeCells;
                var predictiveCells = response.predictiveCells;
                renderSdrs(
                    encoding,
                    activeColumns
                );
                renderTmViz(activeCells, predictiveCells);
                if (callback) callback();
            });
        });
    }

    function stepThroughData() {
        if (playing) runOnePointThroughSp(stepThroughData);
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
            }
        });
    }

    function play() {
        playing = true;
        stepThroughData();
    }

    function pause() {
        playing = false;
    }

    $swapSwitch.on('switchChange.bootstrapSwitch', function(evt, state) {
        swap = state;
    });
    $resetSwitch.on('switchChange.bootstrapSwitch', function(evt, state) {
        tmReset = state;
    });

    spParams.render(function() {
        initModel(function() {
            setupTmViz();
            addDataControlHandlers();
            runOnePointThroughSp();
        });
    }, function() {
        initModel();
    });

});
