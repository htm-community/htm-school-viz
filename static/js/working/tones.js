var beats = 16;
var loop;

// Set up an empty sequence
var sequence = [];
_.times(beats, function() {
    sequence.push([0, 0, 0, 0]);
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
var noteNames = ["F#", "E", "C#", "A"];

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
            var $cell = $('<td>');
            if (sequence[beat][pad] == 1) {
                $cell.addClass('on');
            }
            $cell.data('beat', beat);
            $cell.data('pad', pad);
            $cell.addClass('beat-' + beat);
            $cell.addClass('pad-' + pad);
            $row.append($cell);
        });
        $table.append($row);
    });
    $table.click(function(event) {
        var $cell = $(event.target);
        var beat = $cell.data('beat');
        var pad = $cell.data('pad');
        if (sequence[beat][pad] == 0) sequence[beat][pad] = 1;
        else sequence[beat][pad] = 0;
        $cell.toggleClass('on');
    });
    $grid.append($table);
    return $grid;
}


// Set up the SequencerInterface.
var grid = renderSequencerGrid('#sequencer-grid', beats, 4);

loop = new Tone.Sequence(function(time, beat) {
    var column = sequence[beat];
    for (var i = 0; i < 4; i++){
        if (column[i] === 1){
            //slightly randomized velocities
            var vel = Math.random() * 0.5 + 0.5;
            keys.start(noteNames[i], time, 0, "32n", 0, vel);
        }
    }
    grid.find('td').removeClass('on-beat');
    grid.find('.beat-' + beat).addClass('on-beat');
}, countIntsIntoArray(beats), beats + "n");

Tone.Transport.start();

loop.start();

