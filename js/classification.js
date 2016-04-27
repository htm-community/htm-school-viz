
$(function() {

    // The functions below all rely on these values.
    var n = 256;
    var w = 8;
    var theta = Math.floor(w * 3/4);
    var t = w - theta;
    var sparsity = w / n;
    var matchIndex = undefined;
    var matchSdr = undefined;
    var nextSdr = undefined;
    var sdrUnion = SDR.tools.getRandom(n, 0);
    var sdrStack = [];
    var setSize = 1;
    var maxN = 512;
    var rectSize = 18;

    var $stack = $('#sdr-stack');
    var $wSlider = $('#w-slider');
    var $tSlider = $('#t-slider');
    var $thetaSlider = $('#theta-slider');

    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $tDisplay = $('#t-display');
    var $thetaDisplay = $('#theta-display');
    var $sparsityDisplay = $('#sparsity-display');

    var $nextSdr = $('#next-sdr');

    function drawSdrStack() {
        $stack.html('');
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

    function drawMatchSdr() {
        SDR.draw(matchSdr, 'match-sdr', {
            spartan: true,
            line: true,
            size: rectSize,
            maxWidth: 2500
        });
    }

    function drawUnionSdr() {
        SDR.draw(sdrUnion, 'sdr-union', {
            spartan: true,
            size: rectSize,
            line: true,
            maxWidth: 2500
        });
    }

    function updateDisplayValues() {
        $nDisplay.html(n);
        $wDisplay.html(w);
        $tDisplay.html(t);
        $thetaDisplay.html(theta);
        $sparsityDisplay.html(sparsity.toFixed(2));
        $wSlider.slider('option', 'max', n);
        $tSlider.slider('option', 'max', w - theta);
        $thetaSlider.slider('option', 'max', w);
        $wSlider.slider('value', w);
        $thetaSlider.slider('value', theta);
        $tSlider.slider('value', t);
    }

    function validate(testN, testW, testTheta, testT) {
        return testW <= testN
            && testT <= (testW - testTheta);
    }

    function draw(myN, myW, myTheta, myT, callback) {
        var err = undefined;
        if (validate(myN, myW, myTheta, myT)) {
            n = myN;
            w = myW;
            theta = myTheta;
            t = myT;
            sparsity = w / n;
            drawUnionSdr();
            updateDisplayValues();
        } else {
            err = new Error('Invalid values.');
        }
        if (callback) callback(err);

    }

    function drawSliders() {
        $wSlider.slider({
            min: 1, max: n, value: w, step: 1,
            slide: function(event, ui) {
                draw(n, ui.value, theta, t, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
        $thetaSlider.slider({
            min: 1, max: w, value: theta, step: 1,
            slide: function(event, ui) {
                draw(n, w, ui.value, t, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
        $tSlider.slider({
            min: 1, max: w - theta, value: t, step: 1,
            slide: function(event, ui) {
                draw(n, w, theta, ui.value, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
    }

    function drawNextSdr(n, w) {
        nextSdr = SDR.tools.getRandom(n, w);
        SDR.draw(nextSdr, 'next-sdr', {
            spartan: true,
            size: rectSize,
            line: true,
            maxWidth: 2500
        });
    }

    function generateSdrStack() {
        sdrStack = [];
        _.times(setSize, function () {
            sdrStack.push(SDR.tools.getRandom(n, w));
        });
        matchIndex = _.random(sdrStack.length - 1);
        matchSdr = SDR.tools.addBitNoise(sdrStack[matchIndex], t);
    }

    function addSdr() {
        drawNextSdr(n, w);
        $nextSdr.slideDown(function() {
            setTimeout(function() {
                sdrStack.push(nextSdr);
                drawSdrStack();
                sdrUnion = SDR.tools.union(sdrUnion, nextSdr);
                drawUnionSdr();
                setTimeout(function() {
                    $nextSdr.slideUp();
                }, 500);
            }, 500);
        });
    }

    function matchSdr() {

    }

    function addButtonClickHandler() {
        $('button').click(function() {
            var action = $(this).data('action');
            if (action == 'add') {
                addSdr();
            } else {
                matchSdr();
            }
        });
    }

    generateSdrStack();
    drawSliders();
    generateSdrStack();
    drawSdrStack();
    draw(n, w, theta, t);
    addButtonClickHandler();

});