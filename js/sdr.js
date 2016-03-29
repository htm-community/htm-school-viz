$(function() {

    var POINT_SIZE = 6;

    function drawSdr(sdr, selector) {
        var rowLength = Math.floor(Math.sqrt(sdr.length));
        return d3.select(selector)
            .selectAll("rect")
            .data(sdr)
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
                var offset = i % rowLength;
                return offset * POINT_SIZE;
            })
            .attr("y", function(d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * POINT_SIZE;
            })
            .attr("width", POINT_SIZE)
            .attr("height", POINT_SIZE)
            .style("fill", function(d) {
                if (d == 1) return "steelblue";
                return "white";
            });
    }

    window.SDR = {
        draw: function(sdr, selector, title) {

            var population = SDR.tools.population(sdr);
            var sparsity = SDR.tools.sparsity(sdr);

            drawSdr(sdr, selector);

            if (title) {
                $(selector).before('<h3>' + title + '</h3>');
            }
            $(selector).before('<p>Length: ' + sdr.length + '</p>');
            $(selector).before('<p>Population: ' + population + '</p>');
            $(selector).before('<p>Sparsity: ' + sparsity + '</p>');
        },

        drawOverlap: function(left, right, selector, title) {
            var overlap = SDR.tools.overlap(left, right);
            this.draw(overlap, selector, title);

        },

        drawUnion: function(left, right, selector, title) {
            var union = SDR.tools.union(left, right);
            this.draw(union, selector, title);
        },

        drawComparison: function(left, right, selector, title) {
            var rowLength = Math.floor(Math.sqrt(left.length));
            d3.select(selector)
                .selectAll("rect")
                .data(d3.range(0, left.length))
                .enter()
                .append("rect")
                .attr("x", function(i) {
                    var offset = i % rowLength;
                    return offset * POINT_SIZE;
                })
                .attr("y", function(i) {
                    var offset = Math.floor(i / rowLength);
                    return offset * POINT_SIZE;
                })
                .attr("width", POINT_SIZE)
                .attr("height", POINT_SIZE)
                .style("fill", function(i) {
                    var leftBit = left[i];
                    var rightBit = right[i];
                    if (leftBit == 1 && rightBit == 1) {
                        return "red";
                    } else if (leftBit == 1 && rightBit == 0) {
                        return "orange";
                    } else if (leftBit == 0 && rightBit == 1) {
                        return "green";
                    }
                    return "white";
                });

            if (title) {
                $(selector).before('<h3>' + title + '</h3>');
            }
            $(selector).before('<p>RED: overlap</p>');
            $(selector).before('<p>Orange: left bits</p>');
            $(selector).before('<p>Green: right bits</p>');
        }
    };

});


