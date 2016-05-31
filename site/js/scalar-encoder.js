$(function() {

    var n = 256;
    var w = 5;
    var minRange = [-100, 100];
    var min = Math.floor(_.mean(minRange));
    var maxRange = [100, 1000];
    var max = 100;
    var lastEncoding = undefined;
    var encoding = undefined;
    var value = 50;
    var lastValue = undefined;
    var compare = false;

    var $minSlider = $('#min-slider');
    var $maxSlider = $('#max-slider');
    var $nSlider = $('#n-slider');
    var $wSlider = $('#w-slider');
    var $valueSlider = $('#value-slider');
    var $compareSwitch = $('#compare').bootstrapSwitch({state: false});

    var $minDisplay = $('#min-display');
    var $maxDisplay = $('#max-display');
    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $valueDisplay = $('#value-display');
    var $lastValueDisplay = $('#last-value-display');

    function encodeScalar(input) {
        lastEncoding = encoding;
        lastValue = value;
        encoding = HTM.encoders.scalar.encode(n, w, min, max, input);
        if (lastEncoding && compare) {
            SDR.drawComparison(lastEncoding, encoding, 'encoding', {
                spartan: true,
                size: 60
            });
        } else {
            SDR.draw(encoding, 'encoding', {
                spartan: true,
                size: 60
            });
        }
    }

    function validate(testW, testN, testMin, testMax) {
        return testW < testN
            && testMin < testMax;
    }

    function drawSliders() {
        $minSlider.slider({
            min: minRange[0],
            max: minRange[1],
            value: min,
            step: 1,
            slide: function(event, ui) {
                if (validate(w, n, value, ui.value, max)) {
                    min = ui.value;
                    updateUi();
                } else event.preventDefault();
            }
        });
        $maxSlider.slider({
            min: maxRange[0],
            max: maxRange[1],
            value: max,
            step: 1,
            slide: function(event, ui) {
                if (validate(w, n, min, ui.value)) {
                    max = ui.value;
                    updateUi();
                } else event.preventDefault();
            }
        });
        $nSlider.slider({
            min: 0,
            max: 2048,
            value: n,
            step: 1,
            slide: function(event, ui) {
                if (validate(w, ui.value, min, max)) {
                    n = ui.value;
                    updateUi();
                } else event.preventDefault();
            }
        });
        $wSlider.slider({
            min: 0,
            max: n,
            value: w,
            step: 1,
            slide: function(event, ui) {
                if (validate(ui.value, n, min, max)) {
                    w = ui.value;
                    updateUi();
                } else event.preventDefault();
            }
        });
        $valueSlider.slider({
            min: min,
            max: max,
            value: value,
            step: 1,
            slide: function(event, ui) {
                value = ui.value;
                updateUi();
            }
        });
    }

    function addHandlers() {
        $compareSwitch.on('switchChange.bootstrapSwitch', function(evt, state) {
            compare = state;
        });
    }

    function updateUi() {
        // Update display values.
        $minDisplay.html(min);
        $maxDisplay.html(max);
        $wDisplay.html(w);
        $nDisplay.html(n);
        $valueDisplay.html(value);
        $lastValueDisplay.html(lastValue);
        // Update slider bounds based on new values.
        $nSlider.slider('value', n);
        $wSlider.slider('option', 'max', n);
        $wSlider.slider('value', w);
        $valueSlider.slider('option', 'min', min - 100);
        $valueSlider.slider('option', 'max', max + 100);
        encodeScalar(value);
    }

    function initUi() {
        drawSliders();
        addHandlers();
        updateUi();
    }

    initUi()
});