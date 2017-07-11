const beats = 16

// Set up an empty sequence.
let sequence = []
for (let i = 0; i < beats; i++) {
    sequence.push([0,0,0,0])
}

//setup a polyphonic sampler
const keys = new Tone.MultiPlayer({
    urls : {
        "A" : "../ep11/audio/casio/A1.mp3",
        "C#" : "../ep11/audio/casio/Cs2.mp3",
        "E" : "../ep11/audio/casio/E2.mp3",
        "F#" : "../ep11/audio/casio/Fs2.mp3",
    },
    volume : -10,
    fadeOut : 0.1,
}).toMaster()

const noteNames = ["F#", "E", "C#", "A"]

let countIntsIntoArray = (size) => {
    let out = []
    for (let i = 0; i < size; i++) {
        out.push(i)
    }
    return out
}

let renderSequencerGrid = (selector, beats, pads) => {
    let $grid = $(selector)
    let $table = $('<table>')

    for (let pad = 0; pad < pads; pad++) {
        let $row = $('<tr>')
        for (let beat = 0; beat < beats; beat++) {
            let on = ''
            let $cell = $('<td>')
            if (sequence[beat][pad] == 1) {
                $cell.addClass('on')
            }
            $cell.data('beat', beat)
            $cell.data('pad', pad)
            $cell.addClass('beat-' + beat)
            $cell.addClass('pad-' + pad)
            $row.append($cell)
        }
        $table.append($row)
    }

    $table.click((event) => {
        let $cell = $(event.target)
        let beat = $cell.data('beat')
        let pad = $cell.data('pad')
        if (beat != undefined && pad != undefined) {
            if (sequence[beat][pad] == 0) sequence[beat][pad] = 1
            else sequence[beat][pad] = 0
            $cell.toggleClass('on')
        }
    })

    $grid.append($table)
    return $grid
}


// Set up the SequencerInterface.
var grid = renderSequencerGrid('#sequencer-grid', beats, 4)

let loop = new Tone.Sequence((time, beat) => {
    let column = sequence[beat]
    for (let i = 0; i < 4; i++){
        if (column[i] === 1) {
            //slightly randomized velocities
            var vel = Math.random() * 0.5 + 0.5
            keys.start(noteNames[i], time, 0, "32n", 0, vel)
        }
    }
    grid.find('td').removeClass('on-beat')
    grid.find('.beat-' + beat).addClass('on-beat')
}, countIntsIntoArray(beats), beats + "n")

Tone.Transport.start()

loop.start()
