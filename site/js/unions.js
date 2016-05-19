$(function() {

    /* The functions below all rely on these values. */

    // Primitives
    var n = 256;
    var w = 4;
    var sparsity = w / n;
    var theta = w;
    var t = 0;
    var bitSize = 8;
    var bitStretch = 2;
    var maxBitDisplay = 256;
    var sdrCount = 0;
    var populationIncrement = 20;

    // SDRs
    var nextSdr = SDR.tools.getRandom(n, w);
    var originalMatchSdr = undefined;
    var matchSdr = undefined;
    var unionSdr = SDR.tools.getRandom(n, 0);
    var sdrStack = [];

    // UI elements
    var $stack = $('#sdr-stack');

    var $tSlider = $('#t-slider');
    var $thetaSlider = $('#theta-slider');

    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $tDisplay = $('#t-display');
    var $thetaDisplay = $('#theta-display');
    var $sparsityDisplay = $('#sparsity-display');
    var $fppValue = $('#fpp-value');
    var $sdrCount = $('#sdr-count');
    var $match = $('#match');
    var $unionOverlap = $('#union-overlap');

    var $nextSdr = $('#next-sdr');
    var $unionSdr = $('#union-sdr');
    var $addBtn = $('#add-btn');
    var $populateBtn = $('#populate-btn');
    var $switchBtn = $('#switch-btn');
    var $goBigBtn = $('#go-big-btn');

    // Can be either 'add' or 'match'.
    var viewMode = 'add';


    // Setters

    function setN(myN) {
        n = myN;
        setW(Math.floor(n * 0.02));
        nextSdr = SDR.tools.getRandom(n, w);
        sdrStack = [];
    }

    function setW(myW) {
        w = myW;
        sparsity = w / n;
        nextSdr = SDR.tools.getRandom(n, w);
    }

    function setTheta(myTheta) {
        theta = myTheta;
    }

    function setT(myT) {
        t = myT;
    }

    /* UI and Draw functions */

    function drawSdrStack() {
        $stack.html('');
        _.each(sdrStack, function(sdr, i) {
            var sdrId = 'sdr-' + i;
            $stack.prepend(
                '<div class="row sdr">'
                + '<div class="col-md-10 plot" id="' + sdrId + '"></div>'
                    //+ '<div class="col-md-1 marker"></div>'
                + '<div class="col-md-2 overlap"></div>'
                + '</div>'
            );
            SDR.draw(getFirstElements(sdr, maxBitDisplay), sdrId, {
                spartan: true,
                size: bitSize,
                stretch: bitStretch,
                line: true,
                slide: i == sdrStack.length - 1
            });
        });
    }

    function drawUnion() {
        $unionSdr.html('');
        SDR.draw(getFirstElements(unionSdr, maxBitDisplay), 'union-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true
        });
    }

    // Used to only display the first X elements in an SDR to reduce stress on
    // the UI.
    function getFirstElements(sdr, count) {
        return sdr.slice(0, count);
    }

    function drawNextSdr() {
        SDR.draw(getFirstElements(nextSdr, maxBitDisplay), 'next-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true,
            slide: true
        });
    }

    function drawMatchSdr() {
        SDR.draw(getFirstElements(matchSdr, maxBitDisplay), 'next-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true
        });
    }

    function updateUi() {
        $nDisplay.html(n);
        $wDisplay.html(w);
        $tDisplay.html(t + ' (' + Math.round(t/w*100) + '%)');
        $thetaDisplay.html(theta);
        $sparsityDisplay.html(sparsity.toFixed(2));
        $thetaSlider.slider('value', theta);
        $thetaSlider.slider('option', 'max', w);
        $tSlider.slider('value', t);
        $tSlider.slider('option', 'max', w);
        $sdrCount.html(sdrCount);
        $fppValue.html(calculateFalsePositive().toPrecision(5));
        if (! sdrStack || sdrStack.length < 2) {
            $switchBtn.prop('disabled', true);
        } else {
            $switchBtn.prop('disabled', false);
        }
    }

    /* Handler functions - all the event handling happens here. */

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
            calculateUnion();
            sdrCount++;
            drawUnion();
            sdrStack.push(nextSdr);
            drawSdrStack();
            updateUi();
        });
        $populateBtn.click(function() {
            _.times(populationIncrement, function() {
                nextSdr = SDR.tools.getRandom(n, w);
                sdrStack.push(nextSdr);
                calculateUnion();
                sdrCount++;
            });
            drawUnion();
            drawSdrStack();
            updateUi();
        });
        $switchBtn.click(function() {
            if (viewMode == 'add') viewMode = 'match';
            else viewMode = 'add';
            switchView();
        });
        $goBigBtn.click(function() {
            setN(2048);
            setT(Math.floor(w * 0.25));
            setTheta(Math.floor(w * 0.75));
            unionSdr = SDR.tools.getRandom(n, 0);
            sdrCount = 0;
            drawUnion();
            drawSdrStack();
            $goBigBtn.prop('disabled', true);
            viewMode = 'add';
            matchSdr = undefined;
            switchView();
            updateUi();
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
                    matchUnion();
                    drawMatchSdr();
                    drawUnion();
                }
            }
        });
        $stack.click(function(evt) {
            var $sdrSvg = undefined;
            var id = undefined;
            var index = undefined;
            var matchW = undefined;
            if (viewMode == 'match') {
                $sdrSvg = $(evt.target).parent();
                id = $sdrSvg.attr('id');
                index = parseInt(id.split('-')[1]);
                // The original match SDR will be a copy of the one clicked.
                originalMatchSdr = sdrStack[index].slice(0);
                // The match SDR will be mutated by the UI.
                matchSdr = SDR.tools.addBitNoise(originalMatchSdr, t);
                matchW = SDR.tools.population(matchSdr);
                $tSlider.slider('option', 'disabled', false);
                $tSlider.slider('option', 'max', matchW);
                drawSdrStack();
                matchUnion();
                $nextSdr.addClass('highlight');
                $sdrSvg.parent().addClass('highlight');
                drawMatchSdr();
                $('#sdr-' + index).parent().addClass('selected');
                updateUi();
            }
        });
    }

    function drawSliders() {
        $thetaSlider.slider({
            min: 1, max: w, value: theta, step: 1,
            disabled: true,
            slide: function(event, ui) {
                if (validate(w, ui.value, t)) {
                    setTheta(ui.value);
                    matchUnion();
                    updateUi();
                }
            }
        });
        $tSlider.slider({
            min: 0, max: w - theta, value: t, step: 1,
            disabled: true,
            slide: function(event, ui) {
                if (validate(w, theta, ui.value)) {
                    setT(ui.value);
                    matchSdr = SDR.tools.addBitNoise(originalMatchSdr, t);
                    drawMatchSdr();
                    matchUnion();
                    updateUi();
                }
            }
        });
    }


    function calculateFalsePositive() {
        var matchW = w;
        var bigOne = math.bignumber(1.0);
        if (matchSdr) matchW = math.bignumber(SDR.tools.population(matchSdr));
        var sparsity = math.divide(matchW, n);
        var inverseSparsity = math.subtract(bigOne, sparsity);
        var t3 = math.pow(inverseSparsity, sdrCount);
        var t4 = math.subtract(bigOne, t3);
        var t5 = math.pow(t4, matchW);
        return t5;
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

    function calculateUnion() {
        unionSdr = SDR.tools.union(unionSdr, nextSdr);
    }

    function switchView() {
        if (n > maxBitDisplay) {
            $('#sdr-portion').html((maxBitDisplay / n * 100) + '%');
            $('.big-warning').show();
        } else {
            $('.big-warning').hide();
        }
        if (viewMode == 'add') {
            $thetaSlider.slider('option', 'disabled', true);
            $tSlider.slider('option', 'disabled', true);
            $addBtn.prop('disabled', false);
            $populateBtn.prop('disabled', false);
            drawNextSdr();
            $('.btn-group').slideDown();
            $('.match-instructions').slideUp();
            $('.next-match').hide();
        } else {
            $switchBtn.prop('disabled', true);
            $thetaSlider.slider('option', 'disabled', false);
            $addBtn.prop('disabled', true);
            $populateBtn.prop('disabled', true);
            $nextSdr.html('');
            $('.btn-group').slideUp();
            $('.match-instructions').slideDown();
            $('.next-match').show();
        }
    }

    function matchUnion() {
        if (SDR.tools.isMatch(matchSdr, unionSdr, theta)) {
            $match.html('MATCH').removeClass('bg-danger').addClass('bg-success');
        } else {
            $match.html('NOPE').removeClass('bg-success').addClass('bg-danger');
        }
        $unionOverlap.html('Overlap: ' + SDR.tools.getOverlapScore(matchSdr, unionSdr));
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

});
