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
        }
    };

});


