$(function() {

    var n = 400;
    var w = 21;
    var nBuckets = n - (w - 1);
    var minRange = [-100, 100];
    var min = Math.floor(_.mean(minRange));
    var maxRange = [100, 1000];
    var max = 100;
    var lastEncoding = undefined;
    var encoding = undefined;
    var value = 50;
    var lastValue = undefined;
    var compare = false;
    var periodic = false;
    var scalarEncoder = undefined;

    var $minSlider = $('#min-slider');
    var $maxSlider = $('#max-slider');
    var $nSlider = $('#n-slider');
    var $wSlider = $('#w-slider');
    var $valueSlider = $('#value-slider');
    var $compareSwitch = $('#compare').bootstrapSwitch({state: compare});
    var $periodicSwitch = $('#periodic').bootstrapSwitch({state: periodic});

    var $minDisplay = $('#min-display');
    var $maxDisplay = $('#max-display');
    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $valueDisplay = $('#value-display');
    var $lastValueDisplay = $('#last-value-display');
    var $bucketsDisplay = $('#buckets-display');

    function initParamsChanged(e) {
        return e instanceof HTM.encoders.ScalarEncoder && periodic
            || e instanceof HTM.encoders.PeriodicScalarEncoder && ! periodic
            || w !== e.w
            || n !== e.n
            || min !== e.minValue
            || max !== e.maxValue;
    }


    function encodeScalar(input) {
        if (! scalarEncoder || initParamsChanged(scalarEncoder)) {
            if (periodic) {
                scalarEncoder = new HTM.encoders.PeriodicScalarEncoder(n, w, null, min, max);
            } else {
                scalarEncoder = new HTM.encoders.ScalarEncoder(n, w, min, max);
            }
        }
        lastEncoding = encoding;
        lastValue = value;
        encoding = scalarEncoder.encode(input);
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
                if (validate(w, n, ui.value, max)) {
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
                    nBuckets = n - (w - 1);
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
                    nBuckets = n - (w - 1);
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
            updateUi();
        });
        $periodicSwitch.on('switchChange.bootstrapSwitch', function(evt, state) {
            periodic = state;
            updateUi();
        });
    }

    function updateUi() {
        // Update display values.
        var defaultMin = min - 100;
        var defaultMax = max + 100;
        if (periodic) {
            defaultMin = min;
            defaultMax = max - 1;
        }
        $minDisplay.html(min);
        $maxDisplay.html(max);
        $wDisplay.html(w);
        $nDisplay.html(n);
        $valueDisplay.html(value);
        $lastValueDisplay.html(lastValue);
        $bucketsDisplay.html(nBuckets);
        // Update slider bounds based on new values.
        $nSlider.slider('value', n);
        $wSlider.slider('option', 'max', n);
        $wSlider.slider('value', w);
        $valueSlider.slider('option', 'min', defaultMin);
        $valueSlider.slider('option', 'max', defaultMax);
        encodeScalar(value);
    }

    function initUi() {
        drawSliders();
        addHandlers();
        updateUi();
    }

    initUi()
});