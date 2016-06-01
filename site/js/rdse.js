$(function() {

    var n = 121;
    var w = 20;
    var resolution = 1.0;
    var lastEncoding = undefined;
    var encoding = undefined;
    var min = 0;
    var max = 1000;
    var value = 50;
    var lastValue = undefined;
    var compare = false;
    var rdse = undefined;

    var $nSlider = $('#n-slider');
    var $wSlider = $('#w-slider');
    var $valueSlider = $('#value-slider');
    var $resolutionSlider = $('#resolution-slider');
    var $compareSwitch = $('#compare').bootstrapSwitch({state: false});

    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $valueDisplay = $('#value-display');
    var $lastValueDisplay = $('#last-value-display');

    function encodeScalar(input) {
        lastEncoding = encoding;
        lastValue = value;

        if (! rdse) {
            rdse = new HTM.encoders.RDSE(resolution, n, w);
        }

        encoding = rdse.encode(input);

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
        $resolutionSlider.slider({
            min: 0,
            max: 10,
            value: resolution,
            step: 0.25,
            slide: function(event, ui) {
                resolution = ui.value;
                updateUi();
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