$(function () {
    var n = 1024;
    var w = 8;
    var theta = 2;
    var sample = 0.5;
    var wy = w;

    var x = SDR.tools.getRandom(n, w);
    var xprime = SDR.tools.subsample(x, sample);
    var y = SDR.tools.getRandom(n, wy);

    var $nSlider = $('#n-slider');
    var $nDisplay = $('.n-display');
    var $wSlider = $('#w-slider');
    var $wDisplay = $('.w-display');
    var $sampleSlider = $('#sample-slider');
    var $sampleDisplay = $('.sample-display');
    var $thetaSlider = $('#theta-slider');
    var $thetaDisplay = $('.theta-display');
    var $wySlider = $('#wy-slider');
    var $wyDisplay = $('.wy-display');
    var $fpDisplay = $('#false-positive-display');
    var $match = $('#match');

    var leftColor = "orange";
    var rightColor = "green";
    var size = 30;

    function sdrsMatch(left, right) {
        return SDR.tools.isMatch(left, right, theta);
    }

    function updateDisplayValues() {
        var falsePosProbability;
        var wxPrime = SDR.tools.population(xprime);
        if (theta > wxPrime) {
            theta = wxPrime;
        }
        $nDisplay.html(n);
        $wDisplay.html(w);
        $sampleDisplay.html(sample);
        $thetaDisplay.html(theta);
        $wyDisplay.html(wy);
        // sliders
        $wSlider.slider('value', w);
        $wySlider.slider('value', wy);
        $thetaSlider.slider('value', theta);
        $sampleSlider.slider('value', sample);
        $nSlider.slider('value', n);

        $wSlider.slider('option', 'max', n);
        $thetaSlider.slider('option', 'max', wxPrime);
        $wySlider.slider('option', 'max', n);
        $wySlider.slider('option', 'min', wxPrime);

        falsePosProbability =
            SDR.tools.calculateFalsePositiveProbability(n, wxPrime, wy, theta);
        if (! isNaN(falsePosProbability)) {
            falsePosProbability = falsePosProbability.toPrecision(5);
        }
        $fpDisplay.html(falsePosProbability);

        if (sdrsMatch(xprime, y)) {
            $match.html('MATCH').removeClass('bg-danger').addClass('bg-success');
        } else {
            $match.html('NOPE').removeClass('bg-success').addClass('bg-danger');
        }
    }

    function validatePotentialValues(myN, myW, myWy, wxPrime) {
        return myW <= myN && wxPrime <= myWy;
    }

    function drawSliders() {
        function slide(event, ui) {
            var source = event.target.id;
            var myN = n;
            var myW = w;
            var myWy = wy;
            var mySample = sample;
            var wxPrime = SDR.tools.population(xprime);

            if (source == 'sample-slider') {
                mySample = ui.value;
            } else if (source == 'theta-slider') {
                theta = ui.value;
            } else if (source == 'wy-slider') {
                myWy = ui.value;
            } else if (source == 'n-slider') {
                myN = ui.value;
            } else if (source == 'w-slider') {
                myW = ui.value;
            }

            if (myWy < wxPrime) {
                myWy = wxPrime;
            }

            if (validatePotentialValues(myN, myW, myWy, wxPrime)) {
                drawSdrs(myN, myW, mySample, myWy);
                updateDisplayValues();
            } else {
                event.preventDefault();
            }
        }

        $nSlider.slider({
            min: 256,
            max: 2048,
            value: n,
            step: 1,
            slide: slide
        });
        $wSlider.slider({
            min: 1,
            max: n,
            value: w,
            step: 1,
            slide: slide
        });
        $sampleSlider.slider({
            min: 0.0,
            max: 1.0,
            value: sample,
            step: 0.01,
            slide: slide
        });
        $thetaSlider.slider({
            min: 0,
            max: SDR.tools.population(xprime),
            value: theta,
            step: 1,
            slide: slide
        });
        $wySlider.slider({
            min: 0,
            max: n,
            value: wy,
            step: 1,
            slide: slide
        });
    }

    function drawSdrs(myN, myW, mySample, myWy, force) {
        var drawX = false;
        var drawXPrime = false;
        var drawY = false;

        if (myN !== n || myW !== w) {
            n = myN;
            w = myW;
            drawX = true;
            drawXPrime = true;
            drawY = true;
        }

        if (mySample !== sample) {
            sample = mySample;
            drawXPrime = true;
        }

        if (myWy !== wy) {
            wy = myWy;
            drawY = true;
        }

        if (force || drawX) {
            x = SDR.tools.getRandom(n, w);
            SDR.draw(x, 'sdr-x', {
                title: 'Original SDR x',
                size: size
            });
        }

        if (force || drawXPrime) {
            xprime = SDR.tools.subsample(x, sample);
            SDR.draw(xprime, 'sdr-xprime', {
                title: 'x\' (subsampled)',
                size: size
            });
        }

        if (force || drawY) {
            y = SDR.tools.getRandom(n, wy);
            SDR.draw(y, 'sdr-y', {
                title: 'y (random)',
                size: size
            });
        }

        SDR.drawComparison(xprime, y, 'sdr-comparison', {
            title: 'x\' compared to y',
            colors: {left: leftColor, right: rightColor},
            size: size
        });

    }

    function example1() {
        drawSdrs(1024, 8, 0.5, 8);
        theta = 2;
        updateDisplayValues();
    }

    function example2() {
        drawSdrs(1024, 20, 0.5, 20);
        theta = 5;
        updateDisplayValues();
    }

    function example3() {
        drawSdrs(2048, 40, 0.5, 40);
        theta = 10;
        updateDisplayValues();
    }

    $('button').click(function() {
        if (this.id == 'ex1') {
            example1();
        } else if (this.id == 'ex2') {
            example2();
        } else if (this.id == 'ex3') {
            example3();
        } else if (this.id == 'next') {
            y = SDR.tools.getRandom(n, wy);
            SDR.draw(y, 'sdr-y', {
                title: 'y (random)',
                color: rightColor,
                size: size
            });
            SDR.drawComparison(xprime, y, 'sdr-comparison', {
                title: 'x\' compared to y',
                colors: {left: leftColor, right: rightColor},
                size: size
            });
            updateDisplayValues();
        }
    });

    drawSliders();
    drawSdrs(n, w, sample, wy, true);
    updateDisplayValues();

});