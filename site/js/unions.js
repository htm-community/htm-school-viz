$(function() {

    // The functions below all rely on these values.
    var n = 256;
    var w = 4;
    var bitSize = 8;
    var bitStretch = 2;

    var sdrNext = undefined;
    var sdrStack = [];
    var sdrUnion = SDR.tools.getRandom(n, 0);

    var $sSlider = $('#sparsity-slider');

    function drawNextSdr(newN, newW) {
        n = newN;
        w = newW;
        sdrNext = SDR.tools.getRandom(n, w);
        SDR.draw(sdrNext, 'next-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true
        });
        updateDisplayValues(w / n);
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
        var $stack = $('#sdr-stack');
        $stack.html('');
        _.each(sdrStack, function(sdr, i) {
            var sdrId = 'sdr-' + i;
            $stack.prepend('<div id="' + sdrId + '" class="sdr">');
            SDR.draw(sdr, sdrId, {
                spartan: true,
                size: bitSize,
                stretch: bitStretch,
                line: true
            });
        });
    }

    function calculateUnion() {
        sdrUnion = SDR.tools.union(sdrUnion, sdrNext);
    }

    function matchNextSdr() {
        var nextPopulation = SDR.tools.population(sdrNext);
        var overlap = SDR.tools.overlap(sdrNext, sdrUnion);
        var bitsSame = SDR.tools.population(overlap);
        var match = bitsSame == nextPopulation;
        var message = '<h3>' + match + ': ' + bitsSame + ' bits overlap out of ' + nextPopulation + '.</h3>';
        var $dialog = $('#dialog');
        $dialog.html(message);
        $dialog.dialog({
            modal: true,
            width: '400px',
            buttons: {
                Ok: function() {
                    $( this ).dialog( "close" );
                }
            }
        });
    }

    function addNextSdr() {
        sdrStack.push(sdrNext);
        calculateUnion();
        drawSdrStack();
        drawUnionSdr();
        drawNextSdr(n, w);
    }

    function updateDisplayValues(sparsity) {
        $('#n-display').html(n);
        $('#w-display').html(w);
        $('#sparsity-display').html(sparsity.toFixed(2));
        $sSlider.slider('value', sparsity * 100);
    }

    function validate(testN, testW) {
        return testW < testN;
    }

    function drawSlider() {
        function slide(event, ui) {
            var value = ui.value;
            var myN = n;
            var myW = Math.floor(n * (value / 100));
            if (validate(myN, myW)) {
                drawNextSdr(myN, myW);
            } else {
                event.preventDefault();
            }
        }
        $sSlider.slider({
            min: 1, max: 50, value: 2, step: 0.1,
            slide: slide
        });
    }

    function addButtonClickHandler() {
        $('button').click(function() {
            var action = $(this).data('action');
            if (action == 'add') {
                addNextSdr();
            } else {
                matchNextSdr();
            }
        });
    }

    drawSlider();
    drawNextSdr(n, w);
    drawUnionSdr();
    addButtonClickHandler();

});