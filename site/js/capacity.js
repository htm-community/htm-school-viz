$(function() {

    // The functions below all rely on these values.
    var n = 256;
    var w = 5;
    var sparsity = w / n;
    var sdr = SDR.tools.getRandom(n, w);

    var $nSlider = $('#n-slider');
    var $wSlider = $('#w-slider');
    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $uniquenessDisplay = $('#uniqueness-display');
    var $sparsityDisplay = $('#sparsity-display');

    function drawSdr(newN, newW) {
        n = newN;
        w = newW;
        sparsity = w / n;
        sdr = SDR.tools.getRandom(n, w);
        SDR.draw(sdr, 'sdr', {spartan: true, size: 60});
        updateDisplayValues(Number(sparsity).toFixed(4), sdr);
    }

    function updateDisplayValues(sparsity, sdr) {
        var uniqueness = SDR.tools.getUniqueness(sdr);
        if (Number.isNaN(uniqueness)) {
            uniqueness = 'NaN';
        } else if (! isFinite(uniqueness)) {
            uniqueness = '&infin;';
        } else {
            uniqueness = Math.round(uniqueness).toLocaleString();
        }
        $uniquenessDisplay.html(uniqueness);
        $nDisplay.html(n);
        $nSlider.slider('value', n);
        $wDisplay.html(w);
        $wSlider.slider('value', w);
        $wSlider.slider('option', 'max', n);
        $sparsityDisplay.html(sparsity);
    }

    function validate(testN, testW) {
        return testW < testN;
    }

    function drawSliders() {
        function slide(event, ui) {
            var source = event.target.id;
            var value = ui.value;
            var myN = n;
            var myW = w;
            if (source == 'n-slider') {
                myN = value;
            } else if (source == 'w-slider') {
                myW = value;
            } else {
                throw new Error('Unknown event');
            }
            if (validate(myN, myW)) {
                drawSdr(myN, myW);
            } else {
                event.preventDefault();
            }
        }
        $nSlider.slider({
            min: 16, max: 2048, value: n, step: 1,
            slide: slide
        });
        $wSlider.slider({
            min: 1, max: n, value: 1, step: 1,
            slide: slide
        });
    }

    drawSliders();
    drawSdr(n, w);

    $("#card").flip({
        autoSize: true,
        forceWidth: true,
        forceHeight: true
    }).on('flip:done', function() {
        $('#props').show();
    });

});