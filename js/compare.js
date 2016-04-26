$(function() {

    var n = 1024;
    var sparsity = 0.1;
    var size = 38;
    var leftColor = 'orange';
    var rightColor = 'green';

    var leftsdr = SDR.tools.getRandom(n,  Math.floor(n * sparsity));
    var rightsdr = SDR.tools.getRandom(n,  Math.floor(n * sparsity));

    var type = 'overlap';

    if (window.location.href.indexOf('#') > 0) {
        type = window.location.href.split('#').pop();
    }

    SDR.draw(leftsdr, 'left', {
        title: 'Left', color: leftColor, size: size
    });
    SDR.draw(rightsdr, 'right', {
        title: 'Right', color: rightColor, size: size
    });

    // I'm sorry, I'm getting creative.
    var artists = {
        compare: function() {
            SDR.drawComparison(leftsdr, rightsdr, 'compare', {
                title: 'Comparison',
                colors: {left: leftColor, right: rightColor},
                size: size
            });
        },
        overlap: function() {
            SDR.drawOverlap(leftsdr, rightsdr, 'compare', {
                title: 'Overlap',
                size: size
            });
        },
        union: function() {
            SDR.drawUnion(leftsdr, rightsdr, 'compare', {
                title: 'Union',
                size: size
            });
        }
    };

    function drawCompareSdr() {
        console.log(type);
        artists[type]();
    }

    function updateUI() {
        $('button').each(function() {
            var $btn = $(this);
            if ($btn.data('type') == type) {
                $btn.addClass('active');
            } else {
                $btn.removeClass('active');
            }
        });
    }

    function addButtonClickHandlers() {
        $('button').click(function() {
            type = $(this).data('type');
            drawCompareSdr();
            updateUI();
        });
    }

    drawCompareSdr();
    updateUI();
    addButtonClickHandlers();

});