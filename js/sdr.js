$(function() {

    var POINT_SIZE = 6;
    var propsTmpl = Handlebars.compile($('#props-tmpl').html());

    function drawSdr(sdr, selector, color, pointSize, line, stretch, staticSize) {
        var rowLength = Math.floor(Math.sqrt(sdr.length));
        var size = pointSize || POINT_SIZE;
        var heightMultiplyer = stretch ? stretch : 1;
        if (line) {
            rowLength = sdr.length;
        } else if (! staticSize && size > size * 15 / rowLength) {
          size = size * 15 / rowLength;
        }
        return d3.select(selector)
            .selectAll("rect")
            .data(sdr)
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
                var offset = i % rowLength;
                return offset * size;
            })
            .attr("y", function(d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * size;
            })
            .attr("width", size)
            .attr("height", size * heightMultiplyer)
            .style("fill", function(d) {
                if (d == 1) return color;
                return "white";
            });
    }

    window.SDR = {
        draw: function(sdr, elId, opts) {
            if (! opts) opts = {};
            var title = opts.title || 'SDR';
            var color = opts.color || 'steelblue';
            var size = opts.size;
            var line = opts.line;
            var staticSize = opts.staticSize;
            var spartan = opts.spartan;
            var stretch = opts.stretch;
            var population = SDR.tools.population(sdr);
            var sparsity = SDR.tools.sparsity(sdr);
            var svg = $('<svg id="' + elId + '-svg">');
            var $container = $('#' + elId);

            // Clear out container.
            $container.html('');

            if (! spartan) {
                $container.append(propsTmpl({
                    title: title,
                    props: [{
                        label: 'n', data: sdr.length
                    }, {
                        label: 'w', data: population
                    }, {
                        label: 'sparsity', data: sparsity.toFixed(2)
                    }]
                }));
            }

            $container.append(svg);

            drawSdr(sdr, '#' + elId + '-svg', color,
                size, line, stretch, staticSize);

        },

        drawComparison: function(left, right, elId, opts) {
            var rowLength = Math.floor(Math.sqrt(left.length));
            var title = opts.title || 'Comparison';
            var leftColor = "orange";
            var rightColor = "green";
            var size = opts.size || POINT_SIZE;
            var svg = $('<svg id="' + elId + '-svg">');
            var $container = $('#' + elId);
            var overlapScore = SDR.tools.population(SDR.tools.overlap(left, right));
            if (size > size * 15 / rowLength) {
                size = size * 15 / rowLength;
            }

            if (opts.colors) {
                leftColor = opts.colors.left;
                rightColor = opts.colors.right;
            }

            // Clear out container.
            $container.html('');

            $container.append(propsTmpl({
                title: title,
                props: [{
                    label: 'overlap score',
                    data: overlapScore,
                    rowStyle: 'color:red'
                }, {
                    label: 'left bits',
                    rowStyle: 'color:' + leftColor
                }, {
                    label: 'right bits',
                    rowStyle: 'color:' + rightColor
                }]
            }));


            $container.append(svg);

            d3.select('#' + elId + '-svg')
                .selectAll("rect")
                .data(d3.range(0, left.length))
                .enter()
                .append("rect")
                .attr("x", function(i) {
                    var offset = i % rowLength;
                    return offset * size;
                })
                .attr("y", function(i) {
                    var offset = Math.floor(i / rowLength);
                    return offset * size;
                })
                .attr("width", size)
                .attr("height", size)
                .style("fill", function(i) {
                    var leftBit = left[i];
                    var rightBit = right[i];
                    if (leftBit == 1 && rightBit == 1) {
                        return "red";
                    } else if (leftBit == 1 && rightBit == 0) {
                        return leftColor;
                    } else if (leftBit == 0 && rightBit == 1) {
                        return rightColor;
                    }
                    return "white";
                });
        },

        drawOverlap: function(left, right, selector, opts) {
            var overlap = SDR.tools.overlap(left, right);
            this.draw(overlap, selector, opts);

        },

        drawUnion: function(left, right, selector, opts) {
            var union = SDR.tools.union(left, right);
            this.draw(union, selector, opts);
        }
    };

});
