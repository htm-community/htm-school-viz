
$(function() {

    // The functions below all rely on these values.
    var n = 26;
    var w = 4;
    var sparsity = w / n;
    var sdrStack = [];
    var setSize = 10;
    var maxSetSize = 100;
    var maxN = 512;
    var rectSize = 18;

    var $stack = $('#sdr-stack');
    var $nSlider = $('#n-slider');
    var $wSlider = $('#w-slider');
    var $setSizeSlider = $('#set-size-slider');

    var $setSizeDisplay = $('#set-size-display');
    var $wDisplay = $('#w-display');
    var $nDisplay = $('#n-display');
    var $sparsityDisplay = $('#sparsity-display');

    function drawSdrStack() {
        $stack.html('');
        sdrStack = [];
        _.times(setSize, function() {
            sdrStack.push(SDR.tools.getRandom(n, w));
        });
        _.each(sdrStack, function(sdr, i) {
            var sdrId = 'sdr-' + i;
            $stack.prepend('<div id="' + sdrId + '" class="sdr">');
            SDR.draw(sdr, sdrId, {
                spartan: true,
                line: true,
                size: rectSize,
                maxWidth: 2500
            });
        });
    }

    function updateDisplayValues() {
        $nDisplay.html(n);
        $wDisplay.html(w);
        $sparsityDisplay.html(sparsity.toFixed(2));
        $wSlider.slider('option', 'max', n);
        $wSlider.slider('value', w);
        $nSlider.slider('value', n);
        $setSizeDisplay.html(setSize);
    }

    function validate(testN, testW) {
        return testW <= testN;
    }

    function draw(myN, myW, callback) {
        var err = undefined;
        if (validate(myN, myW)) {
            n = myN;
            w = myW;
            sparsity = w / n;
            drawSdrStack();
            updateDisplayValues();
        } else {
            err = new Error('Invalid values.');
        }
        if (callback) callback(err);

    }

    function drawSliders() {
        $nSlider.slider({
            min: 1, max: maxN, value: n, step: 1,
            slide: function(event, ui) {
                draw(ui.value, w, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
        $wSlider.slider({
            min: 1, max: n, value: w, step: 1,
            slide: function(event, ui) {
                draw(n, ui.value, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
        $setSizeSlider.slider({
            min: 1, max: maxSetSize, value: setSize, step: 1,
            slide: function(event, ui) {
                setSize = ui.value;
                draw(n, w);
            }
        });
    }

    drawSliders();
    draw(n, w);

});