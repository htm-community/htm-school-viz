$(function () {

    var n = 2048;
    var sparsity = 0.02;
    var w = Math.floor(n * sparsity);
    var theta = Math.floor(w * .9);
    var noise = 0.33;

    var sdr = SDR.tools.getRandom(n, Math.floor(n * sparsity));
    var noisySdr = SDR.tools.addNoise(sdr, noise);

    var $match = $('#match');
    var $noiseSlider = $('#noise-slider');
    var $thetaSlider = $('#theta-slider');
    var leftColor = "orange";
    var rightColor = "green";
    var size = 40;


    function sdrsMatch() {
        return SDR.tools.population(SDR.tools.overlap(sdr, noisySdr)) >= theta;
    }

    function updateDisplayValues() {
        var overlapSet = SDR.tools.getOverlapSet(sdr, theta, w);
        var falsePositiveChance = overlapSet / SDR.tools.getUniqueness(sdr);
        $('#false-positive-display').html(falsePositiveChance);
        $('#sparsity-display').html();
        $('#noise-display').html(noise);
        $('#theta-display').html(theta);
        if (sdrsMatch()) {
            $match.html('MATCH').removeClass('bg-danger').addClass('bg-success');
        } else {
            $match.html('NOPE').removeClass('bg-success').addClass('bg-danger');
        }
    }

    function drawSliders() {
        function slide(event, ui) {
            var source = event.target.id;
            if (source == 'noise-slider') {
                noise = ui.value / 100;
                noisySdr = SDR.tools.addNoise(sdr, noise);
                drawSdrs();
            } else {
                theta = ui.value;
            }
            updateDisplayValues();
        }

        $noiseSlider.slider({
            min: 1,
            max: 100,
            value: 2,
            step: 1,
            slide: slide
        });
        $thetaSlider.slider({
            min: 1,
            max: w,
            value: theta,
            step: 1,
            slide: slide
        });
    }

    function drawSdrs() {
        SDR.draw(noisySdr, 'right', {
            title: 'With ' + Math.round(noise * 100) + '% noise',
            color: rightColor,
            size: size
        });
        SDR.drawComparison(sdr, noisySdr, 'compare', {
            title: 'Comparison',
            colors: {left: leftColor, right: rightColor},
            size: size
        });
    }

    drawSliders();

    SDR.draw(sdr, 'left', {
        title: 'Original',
        color: leftColor,
        size: size
    });

    drawSdrs();

    updateDisplayValues();

    $("#card").flip({
        autoSize: true,
        forceWidth: true,
        forceHeight: true
    }).on('flip:done', function() {
        $('.false-pos').show();
    });

});