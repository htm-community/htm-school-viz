$(function() {

    var POINT_SIZE = 6;

    function drawSdr(sdr, selector, color, pointSize) {
        var rowLength = Math.floor(Math.sqrt(sdr.length));
        var size = pointSize || POINT_SIZE;
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
            .attr("height", size)
            .style("fill", function(d) {
                if (d == 1) return color;
                return "white";
            });
    }

    window.SDR = {
        draw: function(sdr, elId, opts) {
            var title = opts.title || 'SDR';
            var color = opts.color || 'steelblue';
            var size = opts.size;
            var population = SDR.tools.population(sdr);
            var sparsity = SDR.tools.sparsity(sdr);
            var svg = $('<svg id="' + elId + '-svg">');
            var $container = $('#' + elId);

            // Clear out container.
            $container.html('');

            if (title) {
                $container.append('<h3>' + title + '</h3>');
            }
            $container.append('<p>Length: ' + sdr.length + '</p>');
            $container.append('<p>Population: ' + population + '</p>');
            $container.append('<p>Sparsity: ' + (sparsity * 100).toFixed(2) + '%</p>');
            $container.append(svg);

            drawSdr(sdr, '#' + elId + '-svg', color, size);

        },

        drawComparison: function(left, right, elId, opts) {
            var rowLength = Math.floor(Math.sqrt(left.length));
            var title = opts.title || 'Comparison';
            var leftColor = "orange";
            var rightColor = "green";
            var size = opts.size || POINT_SIZE;
            var svg = $('<svg id="' + elId + '-svg">');
            var $container = $('#' + elId);
            if (opts.colors) {
                leftColor = opts.colors.left;
                rightColor = opts.colors.right;
            }

            // Clear out container.
            $container.html('');

            if (title) {
                $container.append('<h3>' + title + '</h3>');
            }
            $container.append('<p style="color:red">overlap</p>');
            $container.append('<p style="color:' + leftColor + '">left bits</p>');
            $container.append('<p style="color:' + rightColor + '">right bits</p>');
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

        drawOverlap: function(left, right, selector, title) {
            var overlap = SDR.tools.overlap(left, right);
            this.draw(overlap, selector, title);

        },

        drawUnion: function(left, right, selector, title) {
            var union = SDR.tools.union(left, right);
            this.draw(union, selector, title);
        }
    };

});


