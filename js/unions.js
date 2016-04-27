$(function() {

    // The functions below all rely on these values.
    var n = 256;
    var w = 4;
    var sparsity = w / n;
    var theta = Math.floor(w * 3/4);
    var t = w - theta;
    var bitSize = 8;
    var bitStretch = 2;

    var sdrNext = undefined;
    var sdrStack = [];
    var sdrUnion = SDR.tools.getRandom(n, 0);

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

    function drawNextSdr(newW) {
        w = newW;
        sparsity = w / n;
        sdrNext = SDR.tools.getRandom(n, w);
        SDR.draw(sdrNext, 'next-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true,
            slide: true
        });
        updateDisplayValues();
    }

    function drawMatchSdr(index) {
        var matchSdr = SDR.tools.addBitNoise(sdrStack[index], t);
        SDR.draw(matchSdr, 'next-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true,
            slide: true
        });
    }

    function drawUnionSdr() {
        SDR.draw(sdrUnion, 'sdr-union', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true
        });
    }

    function drawSdrStack() {
        $stack.html('');
        _.each(sdrStack, function(sdr, i) {
            var sdrId = 'sdr-' + i;
            $stack.prepend('<div id="' + sdrId + '" class="sdr">');
            SDR.draw(sdr, sdrId, {
                spartan: true,
                size: bitSize,
                stretch: bitStretch,
                line: true,
                slide: i == sdrStack.length - 1
            });
        });
    }

    function calculateUnion() {
        sdrUnion = SDR.tools.union(sdrUnion, sdrNext);
    }

    //function matchNextSdr() {
    //    var nextPopulation = SDR.tools.population(sdrNext);
    //    var overlap = SDR.tools.overlap(sdrNext, sdrUnion);
    //    var bitsSame = SDR.tools.population(overlap);
    //    var match = bitsSame == nextPopulation;
    //    var message = '<h3>' + match + ': ' + bitsSame + ' bits overlap out of ' + nextPopulation + '.</h3>';
    //    var $dialog = $('#dialog');
    //    $dialog.html(message);
    //    $dialog.dialog({
    //        modal: true,
    //        width: '400px',
    //        buttons: {
    //            Ok: function() {
    //                $(this).dialog("close");
    //            }
    //        }
    //    });
    //}

    function addNextSdr() {
        $nextSdr.removeClass('highlight');
        $('#next-sdr-svg').slideUp(function() {
            $nextSdr.removeClass('highlight');
            drawNextSdr(w);
        });
        sdrStack.push(sdrNext);
        calculateUnion();
        drawSdrStack();
        drawUnionSdr();
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

    function validate(testW, testTheta, testT) {
        return testW <= n
            && testT <= (testW - testTheta);
    }

    function draw(myW, myTheta, myT, callback) {
        var err = undefined;
        if (validate(myW, myTheta, myT)) {
            theta = myTheta;
            t = myT;
            drawNextSdr(myW);
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
                draw(ui.value, theta, t, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
        $thetaSlider.slider({
            min: 1, max: w, value: theta, step: 1,
            slide: function(event, ui) {
                draw(w, ui.value, t, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
        $tSlider.slider({
            min: 0, max: w - theta, value: t, step: 1,
            slide: function(event, ui) {
                draw(w, theta, ui.value, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
    }

    function addButtonClickHandler() {
        $('button').click(addNextSdr);
    }

    function addSdrClickHandler() {
        $stack.click(function(evt) {
            var $sdrSvg = $(evt.target).parent();
            var id = $sdrSvg.attr('id');
            var index = parseInt(id.split('-')[1]);
            $stack.find('div.sdr').removeClass('highlight');
            $sdrSvg.parent().addClass('highlight');
            $nextSdr.addClass('highlight');
            drawMatchSdr(index);
        });
    }

    drawSliders();
    drawNextSdr(w);
    drawUnionSdr();
    addButtonClickHandler();
    addSdrClickHandler();

});