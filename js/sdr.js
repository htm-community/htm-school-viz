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

        drawOffset: function(left, right, selector, title) {
            var offset = SDR.tools.offset(left, right);
            var rowLength = Math.floor(Math.sqrt(offset.length));
            var rects = d3.select(selector)
                .selectAll("rect")
                .data(offset)
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

            var population = SDR.tools.population(offset);
            var sparsity = SDR.tools.sparsity(offset);

            if (title) {
                $(selector).before('<h3>' + title + '</h3>');
            }
            $(selector).before('<p>Length: ' + offset.length + '</p>');
            $(selector).before('<p>Population: ' + population + '</p>');
            $(selector).before('<p>Sparsity: ' + sparsity + '</p>');

        }
    };

});


