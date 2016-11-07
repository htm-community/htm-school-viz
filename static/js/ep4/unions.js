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
    var unionSdr = SDR.tools.getRandom(n, 0);
    var sdrStack = [];

    // UI elements
    var $stack = $('#sdr-stack');

    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $fppValue = $('#fpp-value');
    var $sdrCount = $('#sdr-count');
    var $match = $('#match');
    var $unionOverlap = $('#union-overlap');
    var $unionDensityDisplay = $('#union-density');

    var $nextSdr = $('#next-sdr');
    var $unionSdr = $('#union-sdr');
    var $addBtn = $('#add-btn');
    var $populateBtn = $('#populate-btn');
    var $matchBtn = $('#match-btn');
    var $goBigBtn = $('#go-big-btn');


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

    function updateUi() {
        $nDisplay.html(n);
        $wDisplay.html(w);
        $sdrCount.html(sdrCount);
        $fppValue.html(calculateFalsePositive().toPrecision(5));
        if (unionSdr) {
            $unionDensityDisplay.html(
                Math.round(SDR.tools.sparsity(unionSdr) * 100) + '%'
            )
        }
        if (! sdrStack || sdrStack.length < 2) {
            $matchBtn.prop('disabled', true);
        } else {
            $matchBtn.prop('disabled', false);
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
        $matchBtn.click(function() {
            nextSdr = SDR.tools.getRandom(n, w);
            drawNextSdr();
            $('.next-match').show();
            matchUnion();
        });
        $goBigBtn.click(function() {
            setN(2048);
            setT(Math.floor(w * 0.25));
            setTheta(w);
            unionSdr = SDR.tools.getRandom(n, 0);
            sdrCount = 0;
            drawUnion();
            drawSdrStack();
            $goBigBtn.prop('disabled', true);
            matchUnion();
            updateUi();
        });
    }

    function addClickHandlers() {
    }

    function calculateFalsePositive() {
        var matchW = w;
        var bigOne = math.bignumber(1.0);
        var sparsity = math.divide(matchW, n);
        var inverseSparsity = math.subtract(bigOne, sparsity);
        var t3 = math.pow(inverseSparsity, sdrCount);
        var t4 = math.subtract(bigOne, t3);
        var t5 = math.pow(t4, matchW);
        return t5;
    }

    /* Utils */

    function calculateUnion() {
        unionSdr = SDR.tools.union(unionSdr, nextSdr);
    }

    function matchUnion() {
        if (SDR.tools.isMatch(nextSdr, unionSdr, theta)) {
            $match.html('MATCH').removeClass('bg-danger').addClass('bg-success');
        } else {
            $match.html('NOPE').removeClass('bg-success').addClass('bg-danger');
        }
        $unionOverlap.html('Overlap: ' + SDR.tools.getOverlapScore(nextSdr, unionSdr));
    }


    function initializeUi() {
        addButtonHandlers();
        addClickHandlers();
        drawNextSdr();
        updateUi();
    }

    initializeUi();

});
