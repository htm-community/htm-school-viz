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

    // SDRs
    var nextSdr = SDR.tools.getRandom(n, w);
    var originalMatchSdr = undefined;
    var matchSdr = undefined;
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
    var $fppDisplay = $('#false-positive-display');
    var $fppValue = $('#fpp-value');
    var $sdrCount = $('#sdr-count');

    var $nextSdr = $('#next-sdr');
    var $addBtn = $('#add-btn');
    var $populateBtn = $('#populate-btn');
    var $switchBtn = $('#switch-btn');
    var $goBigBtn = $('#go-big-btn');
    var $fppCheck = $('#fpp-on');

    // Can be either 'add' or 'match'.
    var viewMode = 'add';
    // Should we do an expensive operation?
    var calcFpp = false;


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
            line: true
        });
    }

    function drawMatchSdr() {
        SDR.draw(getFirstElements(matchSdr, maxBitDisplay), 'next-sdr', {
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
        $tDisplay.html(t + ' (' + Math.round(t/w*100) + '%)');
        $thetaDisplay.html(theta);
        $sparsityDisplay.html(sparsity.toFixed(2));
        $thetaSlider.slider('value', theta);
        $thetaSlider.slider('option', 'max', w);
        $tSlider.slider('value', t);
        $tSlider.slider('option', 'max', w);
        $sdrCount.html(sdrStack.length);
        if (! sdrStack || sdrStack.length < 2) {
            $switchBtn.prop('disabled', true);
        } else {
            $switchBtn.prop('disabled', false);
        }
        if (calcFpp) {
            $fppValue.html(calculateFalsePositive().toPrecision(5));
            $fppDisplay.show();
        }
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
            sdrStack.push(nextSdr);
            drawSdrStack();
            updateUi();
        });
        $populateBtn.click(function() {
            sdrStack = sdrStack.concat(_.map(_.range(50), function() {
                return SDR.tools.getRandom(n, w);
            }));
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
            drawSdrStack();
            $goBigBtn.prop('disabled', true);
            viewMode = 'add';
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
                    matchStack();
                    drawMatchSdr();
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
                matchStack();
                $nextSdr.addClass('highlight');
                $sdrSvg.parent().addClass('highlight');
                drawMatchSdr();
                $('#sdr-' + index).parent().addClass('selected');
            }
        });
        $fppCheck.change(function() {
            calcFpp = !! this.checked;
        });
    }

    function drawSliders() {
        $thetaSlider.slider({
            min: 1, max: w, value: theta, step: 1,
            disabled: true,
            slide: function(event, ui) {
                if (validate(w, ui.value, t)) {
                    setTheta(ui.value);
                    matchStack();
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
                    matchStack();
                    updateUi();
                }
            }
        });
    }

    /* Utils */

    function calculateFalsePositive() {
        // Assuming that all sdrs in the stack have the same n and w.
        var fppOfOneSdr = SDR.tools.calculateFalsePositiveProbability(
            n, w, w, theta
        );
        return math.multiply(fppOfOneSdr, sdrStack.length);
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
            $switchBtn.html('Match');
            $('.match-instructions').slideUp();
            $('.next-match').hide();
            $fppValue.html('');
            $fppDisplay.hide();
        } else {
            $thetaSlider.slider('option', 'disabled', false);
            $addBtn.prop('disabled', true);
            $populateBtn.prop('disabled', true);
            $nextSdr.html('');
            $switchBtn.html('Add More');
            $('.match-instructions').slideDown();
            $('.next-match').show();
            if (calcFpp) $fppDisplay.show();
        }
    }

    function reOrderStackByOverlapScore() {
        $stack.append($stack.children('div').detach().sort(function(left, right) {
            var leftOverlap = parseInt($(left).find('.progress-bar').text());
            var rightOverlap = parseInt($(right).find('.progress-bar').text());
            return rightOverlap - leftOverlap;
        }));
    }

    function matchStack() {
        var $nextSdr = $('#next-sdr-svg');
        $stack.find('div.sdr').each(function() {
            var $sdr = $(this);
            var id = $sdr.find('.plot').attr('id');
            var index = parseInt(id.split('-')[1]);
            var sdr = sdrStack[index];
            var $marker = $sdr.find('.marker');
            var $overlap = $sdr.find('.overlap');
            var overlap = SDR.tools.getOverlapScore(sdr, matchSdr);
            var percent = Math.min(Math.floor(overlap / theta * 100), 100);
            var clazz = '';
            if (overlap >= theta) clazz = 'match';
            $marker.addClass(clazz);
            $overlap.html('<div class="progress"><div class="progress-bar" role="progressbar" '
                + 'aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100" '
                + 'style="width: ' + percent + '%;">' + overlap + '</span></div></div></div>');
            updateUiForSdrMatch(sdr, $sdr, matchSdr);
            updateUiForSdrMatch(matchSdr, $nextSdr, sdr);
            if (calcFpp) $fppDisplay.show();
            else $fppDisplay.hide();
        });
        reOrderStackByOverlapScore();
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