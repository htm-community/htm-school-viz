$(function() {

    var POINT_SIZE = 6;
    var propsTmpl = Handlebars.compile($('#props-tmpl').html());

    window.SDR = {
        draw: function(sdr, elId, opts) {
            if (! opts) opts = {};
            var title = opts.title || 'SDR';
            var color = opts.color || 'steelblue';
            var size = (opts.size || POINT_SIZE);
            var line = opts.line;
            var staticSize = opts.staticSize;
            var spartan = opts.spartan || false;
            var stretch = opts.stretch;
            var population = SDR.tools.population(sdr);
            var sparsity = SDR.tools.sparsity(sdr);
            var $container = $('#' + elId);
            var rowLength = Math.floor(Math.sqrt(sdr.length));
            var heightMultiplyer = stretch ? stretch : 1;
            var width = undefined;
            var height = undefined;
            var cssClass = opts.cssClass || '';
            var maxWidth = opts.maxWidth;
            var slide = false;
            var $svg;
            var svgId = elId + '-svg';
            var svgMarkup = undefined;
            var svgDisplay = '';

            if (opts.slide) {
                slide = true;
            }
            if (line) {
                rowLength = sdr.length;
            } else if (! staticSize && size > size * 15 / rowLength) {
                size = size * 15 / rowLength;
            }

            // Decrease size of boxes if maxWidth is set and we are overflowing it.
            if (maxWidth && size * sdr.length > maxWidth) {
                size = Math.floor(maxWidth / sdr.length);
            }

            width = rowLength * size;
            height = Math.floor(sdr.length / rowLength) * size;

            if (slide) {
                svgDisplay = 'display="none"';
            }

            svgMarkup = '<svg id="' + svgId
                + '" width="' + width
                + '" height="' + (size * heightMultiplyer)
                + '" class="' + cssClass + '" '
                + svgDisplay + '>';

            $svg = $(svgMarkup);

            // Clear out container.
            $container.html('');

            if (spartan === false) {
                $container.append(propsTmpl({
                    title: title,
                    props: [{
                        label: 'n', data: sdr.length
                    }, {
                        label: 'w', data: population
                    }, {
                        label: 'sparsity', data: sparsity.toFixed(3)
                    }]
                }));
            } else if (spartan == 'min') {
                $container.append(propsTmpl({
                    props: [{
                        label: 'n', data: sdr.length
                    }, {
                        label: 'w', data: population
                    }]
                }));
            }

            $container.append($svg);
            $container.css({
                height: (size * heightMultiplyer * (sdr.length / rowLength)) + 'px'
            });

            d3.select('#' + svgId)
                .selectAll('rect')
                .data(sdr)
                .enter()
                .append('rect')
                .attr('x', function(d, i) {
                    var offset = i % rowLength;
                    return offset * size;
                })
                .attr('y', function(d, i) {
                    var offset = Math.floor(i / rowLength);
                    return offset * size;
                })
                .attr('index', function(d, i) { return i; })
                .attr('width', size)
                .attr('height', size * heightMultiplyer - 1)
                .attr('class', function(d) {
                    if (d == 1) return 'on';
                    return 'off';
                });
            if (slide) $svg.slideDown(100);
        },

        drawComparison: function(left, right, elId, opts) {
            if (! opts) opts = {};
            var rowLength = Math.floor(Math.sqrt(left.length));
            var title = opts.title || 'Comparison';
            var leftColor = "orange";
            var rightColor = "green";
            var size = opts.size || POINT_SIZE;
            var line = opts.line;
            var staticSize = opts.staticSize;
            var svg = $('<svg id="' + elId + '-svg">');
            var $container = $('#' + elId);
            var overlapScore = SDR.tools.population(SDR.tools.overlap(left, right));

            if (line) {
                rowLength = left.length;
            } else if (! staticSize && size > size * 15 / rowLength) {
                if (size > size * 15 / rowLength) {
                    size = size * 15 / rowLength;
                }
            }

            if (opts.colors) {
                leftColor = opts.colors.left;
                rightColor = opts.colors.right;
            }

            // Clear out container.
            $container.html('');

            if (! opts.spartan) {
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
            } else if (opts.spartan == 'min') {
                $container.append(propsTmpl({
                    props: [{
                        label: 'overlap score',
                        data: overlapScore,
                        rowStyle: 'color:red'
                    }]
                }));

            }


            $container.append(svg);

            d3.select('#' + elId + '-svg')
                .selectAll('rect')
                .data(d3.range(0, left.length))
                .enter()
                .append('rect')
                .attr('x', function(i) {
                    var offset = i % rowLength;
                    return offset * size;
                })
                .attr('y', function(i) {
                    var offset = Math.floor(i / rowLength);
                    return offset * size;
                })
                .attr('width', size)
                .attr('height', size)
                .style('fill', function(i) {
                    var leftBit = left[i];
                    var rightBit = right[i];
                    if (leftBit == 1 && rightBit == 1) {
                        return 'red';
                    } else if (leftBit == 1 && rightBit == 0) {
                        return leftColor;
                    } else if (leftBit == 0 && rightBit == 1) {
                        return rightColor;
                    }
                    return 'white';
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
