$(function() {

    var learn = true;
    var playing = false;
    var noise = 0.10;

    var spClient;
    var tmClient;
    var computeClient;

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

    var beats = 8;
    var padCount = 4;
    var loop;
    var lastBeat = beats - 1;
    var bpm = 80;

    // Set up an empty sequence
    var sequence = [];
    _.times(beats, function() {
        // Random initial beats
        var pads = [0, 0, 0, 0];
        var turnOn = getRandomInt(0, 5);
        if (pads[turnOn] !== undefined) pads[turnOn] = 1;
        sequence.push(pads);
    });
    //setup a polyphonic sampler
    var keys = new Tone.MultiPlayer({
        urls : {
            "A" : "./audio/casio/A1.mp3",
            "C#" : "./audio/casio/Cs2.mp3",
            "E" : "./audio/casio/E2.mp3",
            "F#" : "./audio/casio/Fs2.mp3",
        },
        volume : -10,
        fadeOut : 0.1,
    }).toMaster();
    //the notes
    var noteNames = ["F#", "E", "C#", "A", "rest"];


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
                computeClient = new HTM.ComputeClient(tmClient._id);
                console.log('Compute client initialized.');
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

    function updatePredictions(predictions, beat) {
        // Display predictions on next beat.
        var predictedValue = predictions[0][1];
        var predictedPadIdx = noteNames.indexOf(predictedValue);
        var isCorrect = '✘';
        var nextBeat = beat + 1;
        if (nextBeat >= beats) {
            nextBeat = 0;
        }
        grid.find('td.note').removeClass('prediction');
        grid.find('.beat-' + nextBeat + '.pad-' + predictedPadIdx).addClass('prediction');

        // Display last beat prediction result.
        var nextChosenPadIdx = noteNames.indexOf(grid.find('.beat-' + nextBeat + '.on').html());
        if (nextChosenPadIdx == predictedPadIdx) {
            isCorrect = '✔︎';
        }
        grid.find('tr.info td.beat-' + nextBeat).html(isCorrect);
    }

    function encode(pads) {
        var n = inputDimensions[0];
        var buckets = 5;
        var bucketWidth = Math.floor(n / buckets);
        var out = SDR.tools.getEmpty(n);
        var encoding;
        var bucketIdx;
        var actValue;
        _.each(pads, function(value, padIndex) {
            var start = padIndex * bucketWidth;
            if (value == 1) {
                _.times(bucketWidth, function(cnt) {
                    out[start + cnt] = 1;
                });
                bucketIdx = padIndex
                actValue = noteNames[padIndex];
                if (actValue == undefined) {
                    actValue = 'rest';
                }
            }
        });
        encoding = SDR.tools.addNoise(out, noise);
        return {
            encoding: encoding,
            bucketIdx: bucketIdx,
            actValue: actValue
        };
    }

    function runOnePointThroughSp(pads, beat) {
        // Encode data point into SDR.
        var raw = encode(pads);
        // Reset on last beat.
        var reset = beat == beats - 1;
        var encoding = raw.encoding;
        var bucketIdx = raw.bucketIdx;
        var actValue = raw.actValue;

        counter++;

        // Run encoding through SP/TM.
        computeClient.compute(encoding, {
            bucketIdx: bucketIdx,
            actValue: actValue,
            learn: learn
        }, function(err, response) {
            if (err) throw err;
            var activeColumns = response.activeColumns;

            if (reset) {
                console.log('TM Reset after this row of data.');
            }
            var activeCells = response.activeCells;
            var predictiveCells = response.predictiveCells;
            renderSdrs(
                encoding,
                activeColumns
            );
            renderTmViz(activeCells, predictiveCells);
            updatePredictions(response.inference, beat);
        });
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function processOneBeat(time, beat) {
        var pads = sequence[beat];
        var rest = 1;
        // Turn off the rest bit initially.
        pads[padCount] = 0;
        for (var i = 0; i < padCount; i++){
            if (pads[i] === 1){
                //slightly randomized velocities
                var vel = Math.random() * 0.5 + 0.5;
                keys.start(noteNames[i], time, 0, "32n", 0, vel);
            }
        }
        // If any pads are active, turn off the rest bit.
        if (pads.indexOf(1) > -1) {
            rest = 0;
        }
        pads[padCount] = rest;
        grid.find('td').removeClass('on-beat');
        grid.find('.beat-' + beat).addClass('on-beat');
        runOnePointThroughSp(pads, beat);
        lastBeat = beat;
    }

    function addDataControlHandlers() {
        $('.player button').click(function(evt) {
            var $btn = $(this);
            var nextBeat;
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
                nextBeat = lastBeat + 1;
                if (nextBeat >= beats) {
                    nextBeat = 0;
                }
                processOneBeat(new Tone.Time().addNow(), nextBeat);
            }
        });
    }

    function play() {
        playing = true;
        loop.start();
    }

    function pause() {
        playing = false;
        loop.stop();
    }

    function countIntsIntoArray(size) {
        var out = [];
        _.times(size, function(count) {
            out.push(count);
        });
        return out;
    }

    function renderSequencerGrid(selector, beats, pads) {
        var $grid = $(selector);
        var $table = $('<table>');
        _.times(pads, function(pad) {
            var $row = $('<tr>');
            _.times(beats, function(beat) {
                var on = '';
                var $cell = $('<td class="note">');
                if (sequence[beat][pad] == 1) {
                    $cell.addClass('on');
                }
                $cell.data('beat', beat);
                $cell.data('pad', pad);
                $cell.addClass('beat-' + beat);
                $cell.addClass('pad-' + pad);
                $cell.html(noteNames[pad]);
                $row.append($cell);
            });
            $table.append($row);
        });
        // Add one more row for additional info about the beat.
        var $infoTr = $('<tr class="info">');
        _.times(beats, function(beat) {
            var $cell = $('<td>');
            $cell.addClass('beat-' + beat);
            $infoTr.append($cell);
        });
        $table.append($infoTr);
        $table.click(function(event) {
            event.preventDefault();
            event.stopPropagation();
            var $cell = $(event.target);
            var beat = $cell.data('beat');
            var pad = $cell.data('pad');
            if (beat != undefined && pad != undefined) {
                if (sequence[beat][pad] == 0) sequence[beat][pad] = 1;
                else sequence[beat][pad] = 0;
                $cell.toggleClass('on');
            }
        });
        $grid.append($table);
        return $grid;
    }

    // Set up the SequencerInterface.
    var grid = renderSequencerGrid('#sequencer-grid', beats, padCount);

    loop = new Tone.Sequence(
        processOneBeat, countIntsIntoArray(beats), beats + "n"
    );

    Tone.Transport.bpm.value = bpm;
    Tone.Transport.start();

    keys.connect(new Tone.Delay (0.9));

    spParams.render(function() {
        initModel(function() {
            setupTmViz();
            addDataControlHandlers();
            //runOnePointThroughSp();
        });
    }, function() {
        initModel();
    });


});
