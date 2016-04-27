$(function() {

    // The functions below all rely on these values.
    var n = 256;
    var w = 4;
    var sparsity = w / n;
    var theta = Math.floor(w * 3/4);
    var t = w - theta;
    var bitSize = 8;
    var bitStretch = 2;

    var nextSdr = SDR.tools.getRandom(n, w);
    var matchSdr = undefined;
    var stackMatchSdr = undefined;
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

    var $addBtn = $('#add-btn');
    var $matchBtn = $('#match-btn');

    var viewMode = 'add';

    function drawNextSdr() {
        SDR.draw(nextSdr, 'next-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true,
            slide: true
        });
    }

    function drawMatchSdr() {
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
        sdrUnion = SDR.tools.union(sdrUnion, nextSdr);
    }

    //function matchNextSdr() {
    //    var nextPopulation = SDR.tools.population(nextSdr);
    //    var overlap = SDR.tools.overlap(nextSdr, sdrUnion);
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
        $addBtn.prop('disabled', true);
        $nextSdr.removeClass('highlight');
        $('#next-sdr-svg').slideUp(100, function() {
            $nextSdr.removeClass('highlight');
            nextSdr = SDR.tools.getRandom(n, w);
            drawNextSdr();
            $addBtn.prop('disabled', false);
        });
        sdrStack.push(nextSdr);
        calculateUnion();
        drawSdrStack();
        drawUnionSdr();
    }

    function switchView(mode) {
        viewMode = mode;
        updateUi();
    }

    function updateUi() {
        $nDisplay.html(n);
        $wDisplay.html(w);
        $tDisplay.html(t);
        $thetaDisplay.html(theta);
        $sparsityDisplay.html(sparsity.toFixed(2));

        if (viewMode == 'add') updateUiForAdding();
        else updateUiForMatching();
    }

    function updateUiForAdding() {
        $wSlider.slider('option', 'disabled', false);
        $wSlider.slider('option', 'max', n);
        $wSlider.slider('value', w);

        $thetaSlider.slider('option', 'disabled', true);

        $matchBtn.prop('disabled', true);
        $addBtn.prop('disabled', false);
    }

    function updateUiForMatching() {
        var matchW = SDR.tools.population(matchSdr);

        $wSlider.slider('option', 'disabled', true);

        $thetaSlider.slider('option', 'disabled', false);
        $thetaSlider.slider('option', 'max', matchW);
        $thetaSlider.slider('value', theta);

        $tSlider.slider('option', 'disabled', false);
        $tSlider.slider('option', 'max', matchW - theta);
        $tSlider.slider('value', t);

        $matchBtn.prop('disabled', false);
        $addBtn.prop('disabled', true);
    }

    function validate(testW, testTheta, testT, testMatch) {
        var matchW;
        var wngood = testW <= n;
        if (testMatch) {
            matchW = SDR.tools.population(testMatch);
            return wngood
                && testTheta <= matchW
                && testT <= (matchW - testTheta);
        } else {
            return wngood;
        }
    }

    function drawAdd(myW, callback) {
        var err = undefined;
        if (validate(myW, theta, t)) {
            w = myW;
            sparsity = w / n;
            nextSdr = SDR.tools.getRandom(n, w);
            drawNextSdr();
            updateUi();
        } else {
            err = new Error('Invalid values.');
        }
        if (callback) callback(err);
    }

    function drawMatch(myTheta, myT, callback) {
        var err = undefined;
        if (validate(w, myTheta, myT)) {
            theta = myTheta;
            t = myT;
            matchSdr = SDR.tools.addBitNoise(stackMatchSdr, t);
            drawMatchSdr();
            updateUi();
        } else {
            err = new Error('Invalid values.');
        }
        if (callback) callback(err);
    }

    function drawSliders() {
        $wSlider.slider({
            min: 1, max: n, value: w, step: 1,
            slide: function(event, ui) {
                drawAdd(ui.value, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
        $thetaSlider.slider({
            min: 1, max: w, value: theta, step: 1,
            disabled: true,
            slide: function(event, ui) {
                drawMatch(ui.value, t, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
        $tSlider.slider({
            min: 0, max: w - theta, value: t, step: 1,
            disabled: true,
            slide: function(event, ui) {
                drawMatch(theta, ui.value, function(err) {
                    if (err) event.preventDefault();
                });
            }
        });
    }

    function addButtonClickHandler() {
        $addBtn.click(addNextSdr);
    }

    function addSdrClickHandler() {
        $stack.click(function(evt) {
            var $sdrSvg = $(evt.target).parent();
            var id = $sdrSvg.attr('id');
            var index = parseInt(id.split('-')[1]);
            stackMatchSdr = sdrStack[index];
            if (! validate(w, theta, t, SDR.tools.addBitNoise(stackMatchSdr, t))) {
                evt.preventDefault();
                evt.stopPropagation();
            } else {
                $stack.find('div.sdr').removeClass('highlight');
                $nextSdr.addClass('highlight');
                $sdrSvg.parent().addClass('highlight');
                matchSdr = SDR.tools.addBitNoise(stackMatchSdr, t);
                drawMatchSdr();
                switchView('match');
            }
        });
    }

    drawSliders();
    drawNextSdr(w);
    drawUnionSdr();
    addButtonClickHandler();
    addSdrClickHandler();
    switchView(viewMode);

});