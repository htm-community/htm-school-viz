$(function() {

    /* The functions below all rely on these values. */

    // Primitives
    var n = 256;
    var w = 4;
    var sparsity = w / n;
    var theta = Math.floor(w * (3/4));
    var t = w - theta;
    var bitSize = 8;
    var bitStretch = 2;

    // SDRs
    var nextSdr = SDR.tools.getRandom(n, w);
    var matchSdr = undefined;
    var sdrStack = [];

    // UI elements
    var $stack = $('#sdr-stack');

    var $wSlider = $('#w-slider');
    var $tSlider = $('#t-slider');
    var $thetaSlider = $('#theta-slider');

    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $tDisplay = $('#t-display');
    var $thetaDisplay = $('#theta-display');
    var $sparsityDisplay = $('#sparsity-display');
    var $falsePosDisplay = $('#false-positive-display');

    var $match = $('#match');
    var $nextSdr = $('#next-sdr');
    var $addBtn = $('#add-btn');
    var $populateBtn = $('#populate-btn');
    var $switchBtn = $('#switch-btn');

    // Can be either 'add' or 'match'.
    var viewMode = 'add';


    // Setters

    function setW(myW) {
        w = myW;
        sparsity = w / n;
        nextSdr = SDR.tools.getRandom(n, w);
    }

    /* UI and Draw functions */

    function drawSliders() {
        $wSlider.slider({
            min: 1, max: n, value: w, step: 1,
            slide: function(event, ui) {
                if (validate(ui.value, theta, t)) {
                    setW(ui.value);
                    drawNextSdr();
                    updateUi();
                } else {
                    event.preventDefault();
                }
            }
        });
        $thetaSlider.slider({
            min: 1, max: w, value: theta, step: 1,
            disabled: true,
            slide: function(event, ui) {
                //drawMatch(ui.value, t, function(err) {
                //    if (err) event.preventDefault();
                //});
            }
        });
        $tSlider.slider({
            min: 0, max: w - theta, value: t, step: 1,
            disabled: true,
            slide: function(event, ui) {
                //drawMatch(theta, ui.value, function(err) {
                //    if (err) event.preventDefault();
                //});
            }
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

    function updateUi() {
            $nDisplay.html(n);
            $wDisplay.html(w);
            $tDisplay.html(t);
            $thetaDisplay.html(theta);
            $sparsityDisplay.html(sparsity.toFixed(2));
            //if (viewMode == 'add') updateUiForAdding();
            //else updateUiForMatching();
    }

    function updateUiForSdrMatch(left, $left, right) {
        var matches = SDR.tools.population(SDR.tools.overlap(right, left)) >= theta;
        $left.removeClass('highlight');
        if (matches) {
            $left.addClass('match');
        } else {
            $left.removeClass('match');
            $left.find('rect').each(function() {
                var $rect = $(this);
                var c = $rect.attr('class');
                $rect.attr('class', c.replace('match', ''));
            });
        }
        _.each(SDR.tools.getMatchingBitIndices(left, right), function(i) {
            var $rect = $left.find('[index="' + i +'"]');
            var c = $rect.attr('class');
            $rect.attr('class', c + ' match');
        });
    }


    /* Handler functions */

    function addButtonHandlers() {
        $addBtn.click(function() {
            $addBtn.prop('disabled', true);
            $nextSdr.removeClass('highlight');
            $('#next-sdr-svg').slideUp(100, function() {
                $nextSdr.removeClass('highlight');
                nextSdr = SDR.tools.getRandom(n, w);
                drawNextSdr();
                $addBtn.prop('disabled', false);
            });
            sdrStack.push(nextSdr);
            drawSdrStack();
        });
        $populateBtn.click(function() {
            sdrStack = sdrStack.concat(_.map(_.range(50), function() {
                return SDR.tools.getRandom(n, _.random(3, 14));
            }));
            drawSdrStack();
        });
        $switchBtn.click(function() {
            if (viewMode == 'add') viewMode = 'match';
            else viewMode = 'add';
            switchView();
        });
    }

    function addClickHandlers() {
        $nextSdr.click(function(evt) {
            var $rect = $(evt.target);
            var on = undefined;
            var index = undefined;
            var bit = undefined;
            var newClass = undefined;
            if ($rect.prop('nodeName') == 'rect') {
                on = $rect.attr('class');
                index = parseInt($rect.attr('index'));
                bit = 1;
                newClass = 'on';
                if (on == 'on') {
                    bit = 0;
                    newClass = '';
                }
                $rect.attr('class', newClass);
                if (viewMode == 'add') {
                    nextSdr[index] = bit;
                } else {
                    matchSdr[index] = bit;
                    drawSdrStack();
                    matchStack(matchSdr);
                    drawMatchSdr();
                }
            }
        });
        $stack.click(function(evt) {
            var $sdrSvg = undefined;
            var id = undefined;
            var index = undefined;
            //var matchW = undefined;
            if (viewMode == 'match') {
                $sdrSvg = $(evt.target).parent();
                id = $sdrSvg.attr('id');
                index = parseInt(id.split('-')[1]);
                // The match SDR is a copy of the one clicked.
                matchSdr = sdrStack[index].slice(0);
                //matchW = SDR.tools.population(matchSdr);
                //if (! validate(w, theta, t, matchSdr)) {
                //    theta = Math.floor(matchW * (3/4));
                //    t = Math.floor((matchW - theta) * (1/2));
                //}
                drawSdrStack();
                matchStack(matchSdr);
                $nextSdr.addClass('highlight');
                $sdrSvg.parent().addClass('highlight');
                drawMatchSdr();
            }
        });
    }

    /* Utils */

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

    function switchView() {
        if (viewMode == 'add') {
            $wSlider.slider('option', 'disabled', false);
            $thetaSlider.slider('option', 'disabled', true);
            $tSlider.slider('option', 'disabled', true);
            $addBtn.prop('disabled', false);
            $populateBtn.prop('disabled', false);
            drawNextSdr();
        } else {
            $wSlider.slider('option', 'disabled', true);
            $thetaSlider.slider('option', 'disabled', false);
            $tSlider.slider('option', 'disabled', false);
            $addBtn.prop('disabled', true);
            $populateBtn.prop('disabled', true);
            $nextSdr.html('');
        }
    }

    function getUiMatchIndication(sdr, matchSdr) {
        var overlap = SDR.tools.getOverlapScore(sdr, matchSdr);
        var percent = Math.floor(overlap / theta * 100);
        var clazz = '';
        if (overlap >= theta) clazz = 'match';
        var html = '<div class="progress ' + clazz + '">'
            + '<div class="progress-bar" role="progressbar" '
            + 'aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100" '
            + 'style="width: ' + percent + '%;">' + overlap + '</span></div></div>';
        return html;
    }

    function matchStack(matchSdr) {
        var $nextSdr = $('#next-sdr-svg');
        // Need to update the theta based on the matchSdr.
        theta = Math.floor(w * (3/4));
        $stack.find('div.sdr').each(function() {
            var $sdr = $(this);
            var $meta = $sdr.find('.meta');
            var id = parseInt($sdr.attr('id').split('-')[1]);
            var sdr = sdrStack[id];
            $meta.html(getUiMatchIndication(sdr, matchSdr));
            //console.log('Updating sdr bit matches for %s', $sdr.attr('id'));
            updateUiForSdrMatch(sdr, $sdr, matchSdr);
            updateUiForSdrMatch(matchSdr, $nextSdr, sdr);
        });
    }


    function initializeUi() {
        drawSliders();
        addButtonHandlers();
        addClickHandlers();
        switchView();
        drawNextSdr();
        updateUi();
    }

    initializeUi();


    //function addNextSdr() {
    //    $addBtn.prop('disabled', true);
    //    $nextSdr.removeClass('highlight');
    //    $('#next-sdr-svg').slideUp(100, function() {
    //        $nextSdr.removeClass('highlight');
    //        nextSdr = SDR.tools.getRandom(n, w);
    //        drawNextSdr();
    //        $addBtn.prop('disabled', false);
    //    });
    //    sdrStack.push(nextSdr);
    //    drawSdrStack();
    //}
    //
    //function calculateFalsePositiveProbability() {
    //    return math.bignumber(0);
    //    //return _.reduce(sdrStack, function(sum, sdr) {
    //    //    var overlapSet = SDR.tools._getOverlapSet(n, SDR.tools.population(sdr), t, w);
    //    //    var uniqueness = SDR.tools.getUniqueness(sdr);
    //    //    return math.add(sum, math.divide(overlapSet, uniqueness));
    //    //}, math.bignumber(0));
    //}
    //
    //function sdrsMatch() {
    //    return SDR.tools.population(SDR.tools.overlap(matchSdr, stackMatchSdr)) >= theta;
    //}
    //
    //function updateUi() {
    //    $nDisplay.html(n);
    //    $wDisplay.html(w);
    //    $tDisplay.html(t);
    //    $thetaDisplay.html(theta);
    //    $sparsityDisplay.html(sparsity.toFixed(2));
    //    if (viewMode == 'add') updateUiForAdding();
    //    else updateUiForMatching();
    //}
    //
    //function updateUiForAdding() {
    //    $wSlider.slider('option', 'disabled', false);
    //    $wSlider.slider('option', 'max', n);
    //    $wSlider.slider('value', w);
    //    $falsePosDisplay.html();
    //
    //    $thetaSlider.slider('option', 'disabled', true);
    //
    //    $addBtn.prop('disabled', false);
    //}
    //
    //function updateUiForMatching() {
    //    var matchW = SDR.tools.population(matchSdr);
    //
    //    $falsePosDisplay.html(
    //        calculateFalsePositiveProbability().toPrecision(5)
    //    );
    //
    //    $wSlider.slider('option', 'disabled', true);
    //
    //    $thetaSlider.slider('option', 'disabled', false);
    //    $thetaSlider.slider('option', 'max', matchW);
    //    $thetaSlider.slider('value', theta);
    //
    //    $tSlider.slider('option', 'disabled', false);
    //    $tSlider.slider('option', 'max', matchW - theta);
    //    $tSlider.slider('value', t);
    //
    //    $addBtn.prop('disabled', true);
    //
    //    if (sdrsMatch()) {
    //        $match.html('MATCH').removeClass('bg-danger').addClass('bg-success');
    //    } else {
    //        $match.html('NOPE').removeClass('bg-success').addClass('bg-danger');
    //    }
    //    $match.slideDown();
    //
    //    SDR.drawComparison(stackMatchSdr, matchSdr, 'match-compare', {
    //        spartan: 'min',
    //        size: 12
    //    });
    //}
    //
    //function drawAdd(myW, callback) {
    //    var err = undefined;
    //    if (validate(myW, theta, t)) {
    //        w = myW;
    //        sparsity = w / n;
    //        nextSdr = SDR.tools.getRandom(n, w);
    //        drawNextSdr();
    //        updateUi();
    //    } else {
    //        err = new Error('Invalid values.');
    //    }
    //    if (callback) callback(err);
    //}
    //
    //function drawMatch(myTheta, myT, callback) {
    //    var err = undefined;
    //    if (validate(w, myTheta, myT)) {
    //        theta = myTheta;
    //        t = myT;
    //        matchSdr = SDR.tools.addBitNoise(stackMatchSdr, t);
    //        drawMatchSdr();
    //        updateUi();
    //    } else {
    //        err = new Error('Invalid values.');
    //    }
    //    if (callback) callback(err);
    //}
    //

    //function drawSliders() {
    //    $wSlider.slider({
    //        min: 1, max: n, value: w, step: 1,
    //        slide: function(event, ui) {
    //            drawAdd(ui.value, function(err) {
    //                if (err) event.preventDefault();
    //            });
    //        }
    //    });
    //    $thetaSlider.slider({
    //        min: 1, max: w, value: theta, step: 1,
    //        disabled: true,
    //        slide: function(event, ui) {
    //            drawMatch(ui.value, t, function(err) {
    //                if (err) event.preventDefault();
    //            });
    //        }
    //    });
    //    $tSlider.slider({
    //        min: 0, max: w - theta, value: t, step: 1,
    //        disabled: true,
    //        slide: function(event, ui) {
    //            drawMatch(theta, ui.value, function(err) {
    //                if (err) event.preventDefault();
    //            });
    //        }
    //    });
    //}
    //
    //function addButtonClickHandler() {
    //    $addBtn.click(addNextSdr);
    //}
    //
    //function addSdrClickHandler() {
    //    $stack.click(function(evt) {
    //        var $sdrSvg = $(evt.target).parent();
    //        var id = $sdrSvg.attr('id');
    //        var index = parseInt(id.split('-')[1]);
    //        var matchW;
    //        stackMatchSdr = sdrStack[index];
    //        matchSdr = SDR.tools.addBitNoise(stackMatchSdr, t);
    //        matchW = SDR.tools.population(stackMatchSdr);
    //        if (! validate(w, theta, t, matchSdr)) {
    //            theta = Math.floor(matchW * (3/4));
    //            t = Math.floor((matchW - theta) * (1/2));
    //        }
    //        matchStack(matchSdr);
    //        $nextSdr.addClass('highlight');
    //        $sdrSvg.parent().addClass('highlight');
    //        drawMatchSdr();
    //        switchView('match');
    //    });
    //}
    //
    //drawSliders();
    //drawNextSdr(w);
    //addButtonClickHandler();
    //addSdrClickHandler();
    //switchView(viewMode);

});