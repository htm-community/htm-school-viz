$(function() {

    var POINT_SIZE = 6;

    window.SDR = {
        draw: function(sdr, selector, title) {

            var rowLength = Math.floor(Math.sqrt(sdr.length));
            var rects = d3.select(selector)
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

            var population = SDR.tools.population(sdr);
            var sparsity = SDR.tools.sparsity(sdr);

            if (title) {
                $(selector).before('<h3>' + title + '</h3>');
            }
            $(selector).before('<p>Length: ' + sdr.length + '</p>');
            $(selector).before('<p>Population: ' + population + '</p>');
            $(selector).before('<p>Sparsity: ' + sparsity + '</p>');
        },

        drawOverlap: function(left, right, selector, title) {
            var overlap = SDR.tools.offset(left, right);
            var rowLength = Math.floor(Math.sqrt(overlap.length));
            var rects = d3.select(selector)
                .selectAll("rect")
                .data(overlap)
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

            var population = SDR.tools.population(overlap);
            var sparsity = SDR.tools.sparsity(overlap);

            if (title) {
                $(selector).before('<h3>' + title + '</h3>');
            }
            $(selector).before('<p>Length: ' + overlap.length + '</p>');
            $(selector).before('<p>Population: ' + population + '</p>');
            $(selector).before('<p>Sparsity: ' + sparsity + '</p>');

        },

        drawUnion: function(left, right, selector, title) {
            var union = SDR.tools.union(left, right);
            var rowLength = Math.floor(Math.sqrt(union.length));
            var rects = d3.select(selector)
                .selectAll("rect")
                .data(union)
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

            var population = SDR.tools.population(union);
            var sparsity = SDR.tools.sparsity(union);

            if (title) {
                $(selector).before('<h3>' + title + '</h3>');
            }
            $(selector).before('<p>Length: ' + union.length + '</p>');
            $(selector).before('<p>Population: ' + population + '</p>');
            $(selector).before('<p>Sparsity: ' + sparsity + '</p>');

        }
    };

});


