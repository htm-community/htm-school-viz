$(function() {

    // The functions below all rely on these values.
    var n = 256;
    var w = 5;

    var $nSlider = $('#n-slider');
    var $sSlider = $('#sparsity-slider');

    function drawSdr(newN, newW) {
        n = newN;
        w = newW;
        var sparsity = w / n;
        var sdr = SDR.tools.getRandom(n, w);
        SDR.draw(sdr, 'sdr', {spartan: true, size: 60});
        updateDisplayValues(Number(sparsity).toFixed(4), sdr);
    }

    function updateDisplayValues(sparsity, sdr) {
        var probability = SDR.tools.getExactMatchProbability(sdr);
        $('#probability-display').html(probability);
        $('#n-display').html(n);
        $nSlider.slider('value', n);
        $('#w-display').html(w);
        $('#sparsity-display').html(sparsity);
        $sSlider.slider('value', sparsity * 100);
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
            } else if (source == 'sparsity-slider') {
                myW = Math.floor(n * (value / 100));
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
        $sSlider.slider({
            min: 1, max: 20, value: 2, step: 0.1,
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