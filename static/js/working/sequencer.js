$(function() {

    var learn = true;
    var playing = false;
    var noise = 0.00;

    var spClient;
    var tmClient;
    var computeClient;

    // SP params we are not allowing user to change
    var inputDimensions = [100];
    var columnDimensions = [256];
    var cellsPerColumn = 2;
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var counter = 0;
    var bucketLabels = [];

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    // Set up an globals for sound sequencer settings.
    var sequence = [];
    var keys = undefined;
    var noteNames = undefined;
    var grid = undefined;
    var beats = 8;
    var padCount = 4;
    var loop;
    var lastBeat = beats - 1;
    var bpm = 60;

    ////////////////////////////////////////
    // Utility functions
    ////////////////////////////////////////

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function countIntsIntoArray(size) {
        var out = [];
        _.times(size, function(count) {
            out.push(count);
        });
        return out;
    }

    ////////////////////////////////////////
    // UI functions
    ////////////////////////////////////////

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

    function updatePredictions(predictions, beat) {
        // Display predictions on next beat.
        var predictedValue = predictions[0][1];

        console.log('predicted notes: %s', predictedValue);

        var mark = '✘';
        var nextBeat = beat + 1;
        if (nextBeat >= beats) {
            nextBeat = 0;
        }

        var $nextInfoCell = grid.find('tr.info td.beat-' + nextBeat);
        $nextInfoCell.removeClass('correct');

        grid.find('td.note').removeClass('prediction');

        var $nextBeatCells = grid.find('.beat-' + nextBeat + '.on');
        var nextBeatNoteNames = [];
        _.each($nextBeatCells, function(cell) {
            nextBeatNoteNames.push(cell.innerHTML);
        });
        if (nextBeatNoteNames.join('-') == predictedValue
        || nextBeatNoteNames.length == 0 && predictedValue == 'rest') {
            mark = '✔';
            $nextInfoCell.addClass('correct');
        }

        _.each(predictedValue.split('-'), function(note) {
            var predictedPadIdx = noteNames.indexOf(note);
            grid.find('.beat-' + nextBeat + '.pad-' + predictedPadIdx)
                .addClass('prediction');
        });

        $nextInfoCell.html(mark);
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

    ////////////////////////////////////////
    // HTM-related functions
    ////////////////////////////////////////

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
        spClient.initialize(spParams.getParams(), function(spResp) {
            console.log('SP initialized.');
            var tmParams = getTmParams();
            tmClient.initialize(tmParams, {id: spClient._id}, function(tmResp) {
                console.log('TM initialized.');
                computeClient = new HTM.ComputeClient(tmClient._id);
                console.log('Compute client initialized.');
                loading(false);
                if (callback) callback(spResp, tmResp);
            });
        });
    }

    function getEncodingDetails(pads) {
        var on = [];
        var bucketIdx = bucketLabels.length;
        var actValue;
        _.each(pads, function(padOn, padIndex) {
            if (padOn) {
                on.push(noteNames[padIndex]);
            }
        });
        actValue = on.join('-');
        if (bucketLabels.indexOf(actValue) == -1) {
            bucketLabels.push(actValue);
        } else {
            bucketIdx = bucketLabels.indexOf(actValue);
        }
        return {
            bucketIdx: bucketIdx,
            actValue: actValue
        };
    }

    function encode(pads) {
        var n = inputDimensions[0];
        var buckets = 5;
        var bucketWidth = Math.floor(n / buckets);
        var out = SDR.tools.getEmpty(n);
        var encoding;
        var encodingDetails;
        _.each(pads, function(padOn, padIndex) {
            var start = padIndex * bucketWidth;
            if (padOn) {
                _.times(bucketWidth, function(cnt) {
                    out[start + cnt] = 1;
                });
            }
        });
        encodingDetails = getEncodingDetails(pads);
        encoding = SDR.tools.addNoise(out, noise);
        //console.log('%s in bucket %s', encodingDetails.actValue, encodingDetails.bucketIdx);
        return {
            encoding: encoding,
            bucketIdx: encodingDetails.bucketIdx,
            actValue: encodingDetails.actValue
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
        var computeConfig = {
          bucketIdx: bucketIdx,
          actValue: actValue,
          spLearn: false,
          tmLearn: learn,
          reset: reset,
          // getInhibitionMasks: true,
          // getPotentialPools: true,
          getPermanences: true,
          getActiveSegments: true,
          getConnectedSynapses: true,
        };

        counter++;

        if (reset) {
            console.log('TM Reset after this row of data.');
        }

        // Run encoding through SP/TM.
        computeClient.compute(encoding, computeConfig, function(err, response) {
            if (err) throw err;
            updatePredictions(response.inference, beat);
        });
    }

    ////////////////////////////////////////
    // Sequence interface
    ////////////////////////////////////////

    function play() {
        playing = true;
        loop.start();
    }

    function pause() {
        playing = false;
        loop.stop();
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

    ////////////////////////////////////////
    // Global Program Start
    ////////////////////////////////////////

    function start() {
        _.times(beats, function() {
            // Random initial beats
            var pads = [0, 0, 0, 0];
            var turnOn = getRandomInt(0, 5);
            if (pads[turnOn] !== undefined) pads[turnOn] = 1;
            sequence.push(pads);
        });
        // Setup a polyphonic sampler
        keys = new Tone.MultiPlayer({
            urls : {
                "A" : "./audio/casio/A1.mp3",
                "C#" : "./audio/casio/Cs2.mp3",
                "E" : "./audio/casio/E2.mp3",
                "F#" : "./audio/casio/Fs2.mp3",
            },
            volume : -10,
            fadeOut : 0.1,
        }).toMaster();
        // the notes
        noteNames = ["F#", "E", "C#", "A", "rest"];
        // Set up the SequencerInterface.
        grid = renderSequencerGrid('#sequencer-grid', beats, padCount);

        loop = new Tone.Sequence(
            processOneBeat, countIntsIntoArray(beats), beats + "n"
        );

        Tone.Transport.bpm.value = bpm;
        Tone.Transport.start();

        keys.connect(new Tone.Delay (0.75));

        initModel(function(err, spResp, tmResp) {
            if (err) throw err;
            // setupCellViz();
            // addClickHandling();
            // setupDatGui();
            addDataControlHandlers();
            loading(false);
        });
    }

    start();

});
