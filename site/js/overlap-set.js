$(function() {

    // The functions below all rely on these values.
    var n = 600;
    var maxN = 1024;
    var wx = 40;
    var w = wx;
    var b = 40;
    var rectSize = 48;
    var sparsity = Number(wx / n);
    var overlapSparsity = Number(w / n);
    var sdr = undefined;
    var rightTermSdr = undefined;
    var leftTermSdr = undefined;

    var $nSlider = $('#n-slider');
    var $bSlider = $('#b-slider');
    var $wSlider = $('#w-slider');
    var $wxSlider = $('#wx-slider');
    var $overlapSetDisplay = $('#overlap-set-display');
    var $falsePositiveDisplay = $('#false-positive-display');
    var $nDisplay = $('.n-display');
    var $wDisplay = $('.w-display');
    var $bDisplay = $('.b-display');
    var $wxDisplay = $('#wx-display');
    var $sparsityDisplay = $('#sparsity-display');
    var $overlapSparsityDisplay = $('.overlap-sparsity-display');
    var $ltTermDisplay = $('#left-term-display');
    var $rtTermDisplay = $('#right-term-display');

    function draw(event, ui) {
        var source = event.target.id;
        var value = ui.value;
        var myN = n;
        var myW = w;
        var myWx = wx;
        var myB = b;

        if (source == 'n-slider') {
            myN = value;
        } else if (source == 'wx-slider') {
            myWx = value;
        } else if (source == 'b-slider') {
            myB = value;
        } else if (source == 'w-slider') {
            myW = value;
        } else {
            throw new Error('Unknown event');
        }

        if (validate(myN, myW, myB, myWx)) {
            b = myB;
            w = myW;
            n = myN;
            wx = myWx;
            sparsity = Number(wx / n);
            overlapSparsity = Number(w / n);
            drawSdrs();
            updateDisplayValues(sdr);
        } else {
            event.preventDefault();
        }
    }

    function drawSdrs() {
        var lilRects = 12;
        sdr = SDR.tools.getRandom(n, wx);
        SDR.draw(sdr, 'sdr', {spartan: true, size: rectSize});
        leftTermSdr = SDR.tools.getRandom(wx, b);
        rightTermSdr = SDR.tools.getRandom(n - wx, w - b);
        SDR.draw(leftTermSdr, 'left-term-sdr', {spartan: 'min', size: lilRects});
        SDR.draw(rightTermSdr, 'right-term-sdr', {spartan: 'min', size: lilRects});
    }

    function updateDisplayValues() {
        var overlapSet = SDR.tools.getOverlapSet(sdr, b, w);
        var falsePosProbability = math.divide(
            overlapSet, SDR.tools.getUniqueness(sdr)
        );
        $overlapSetDisplay.html(overlapSet.toPrecision(5));
        $falsePositiveDisplay.html(falsePosProbability.toPrecision(5));
        $nDisplay.html(n);
        $nSlider.slider('value', n);
        $wDisplay.html(w);
        $bDisplay.html(b);
        $bSlider.slider('option', 'max', Math.min(wx, w));
        $bSlider.slider('value', b);
        $wxDisplay.html(wx);
        $wSlider.slider('option', 'max', n/2);
        $wSlider.slider('value', w);
        $sparsityDisplay.html(sparsity.toFixed(4));
        $wxSlider.slider('option', 'max', n);
        $wxSlider.slider('value', wx);
        $overlapSparsityDisplay.html(overlapSparsity.toFixed(4));
        $ltTermDisplay.html(SDR.tools.getUniqueness(leftTermSdr).toPrecision(4));
        $rtTermDisplay.html(SDR.tools.getUniqueness(rightTermSdr).toPrecision(4));
    }

    function validate(testN, testW, testB, testWx) {
        return testB <= testWx
            && testB <= testW
            && testW < testN
            && testWx < testN
            && (testW - testB) <= (testN - testWx);
    }

    function drawSliders() {
        $nSlider.slider({
            min: 16, max: maxN, value: n, step: 1,
            slide: draw
        });
        $bSlider.slider({
            min: 1, max: w, value: b, step: 1,
            slide: draw
        });
        $wSlider.slider({
            min: 1, max: maxN, value: w, step: 1,
            slide: draw
        });
        $wxSlider.slider({
            min: 1, max: n, value: wx, step: 1,
            slide: draw
        });
    }

    function goBigOrGoHome() {
        n = 2048;
        maxN = n;
        wx = 40;
        w = 40;
        b = 40;
        drawSdrs();
        updateDisplayValues();
    }

    drawSliders();
    drawSdrs();
    updateDisplayValues();

    $('#go-big').click(function() {
        goBigOrGoHome();
    });

    $('table.formula').click(function() {
        $('table.formula tr.bottom').toggle();
    });
});