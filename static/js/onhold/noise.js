$(function() {

    var n = Math.pow(2, 12);
    var sparsity = 0.02;
    var leftColor = "orange";
    var rightColor = "green";

    // Example 2
    var percentNoise = 0.1;
    var leftsdr = SDR.tools.getRandom(n,  Math.floor(n * sparsity));
    var rightsdr = SDR.tools.addNoise(leftsdr, percentNoise);

    SDR.draw(leftsdr, 'ex2-left', {
        title: 'Original',
        color: leftColor,
        staticSize: true
    });
    SDR.draw(rightsdr, 'ex2-right', {
        title: 'With ' + (percentNoise * 100) + '% noise',
        color: rightColor,
        staticSize: true
    });
    SDR.drawComparison(leftsdr, rightsdr, 'ex2-compare', {
        title: 'Comparison', colors: {left: leftColor, right: rightColor}
    });
    SDR.drawOverlap(leftsdr, rightsdr, 'ex2-overlap', {title: 'Overlap'});
    SDR.drawUnion(leftsdr, rightsdr, 'ex2-union', {title: 'Union'});

    $('form button').click(function(evt) {
        evt.preventDefault();
        var percentNoise = $('#noise').val();
        var leftsdr = SDR.tools.getRandom(n,  Math.floor(n * sparsity));
        var rightsdr = SDR.tools.addNoise(leftsdr, percentNoise);

        SDR.draw(leftsdr, 'ex2-left', {
            title: 'Original',
            color: leftColor,
            staticSize: true
        });
        SDR.draw(rightsdr, 'ex2-right', {
            title: 'With ' + (percentNoise * 100) + '% noise',
            color: rightColor,
            staticSize: true
        });
        SDR.drawComparison(leftsdr, rightsdr, 'ex2-compare', {
            title: 'Comparison',
            colors: {left: leftColor, right: rightColor}
        });
        SDR.drawOverlap(leftsdr, rightsdr, 'ex2-overlap', {title: 'Overlap'});
        SDR.drawUnion(leftsdr, rightsdr, 'ex2-union', {title: 'Union'});
    });


});