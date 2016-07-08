$(function() {

    function InputChart(elId) {
        this.elId = elId;
        this.data = undefined;
        this.dataCursor = undefined;
        this.dataMarker = undefined;
        this.ecMarkers = undefined;
        this.acMarkers = undefined;
        this.transformDateIntoXValue = undefined;
        this.yTransform = undefined;
    }

    InputChart.prototype.render = function(w, h, callback) {
        var me = this;
        var elId = this.elId;
        var margin = {top: 20, right: 20, bottom: 20, left: 20},
            width = w - margin.left - margin.right,
            height = h - margin.top - margin.bottom;

        var parseDate = d3.time.format("%m/%d/%y %H:%M").parse;

        this.transformDateIntoXValue = d3.time.scale()
            .range([0, width]);

        var y = d3.scale.linear()
            .range([height, 0]);

        var color = d3.scale.category10();

        var xAxis = d3.svg.axis()
            .scale(me.transformDateIntoXValue)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        var line = d3.svg.line()
            .interpolate("basis")
            .x(function (d) {
                return me.transformDateIntoXValue(d.date);
            })
            .y(function (d) {
                return y(d.consumption);
            });

        var svg = d3.select(elId).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        d3.csv("/static/data/hotgym-short.csv", function (error, tempData) {
            if (error) throw error;

            color.domain(d3.keys(tempData[0]).filter(function (key) {
                return key !== "date";
            }));

            tempData.forEach(function (d) {
                d.date = parseDate(d.date);
            });

            var gyms = color.domain().map(function (name) {
                return {
                    name: name,
                    values: tempData.map(function (d) {
                        return {date: d.date, consumption: +d[name]};
                    })
                };
            });

            me.transformDateIntoXValue.domain(d3.extent(tempData, function (d) {
                return d.date;
            }));

            y.domain([
                d3.min(gyms, function (c) {
                    return d3.min(c.values, function (v) {
                        return v.consumption;
                    });
                }),
                d3.max(gyms, function (c) {
                    return d3.max(c.values, function (v) {
                        return v.consumption;
                    });
                })
            ]);

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Energy Consumption (kW)");

            var gym = svg.selectAll(".gym")
                .data(gyms)
                .enter().append("g")
                .attr("class", "gym");

            gym.append("path")
                .attr("class", "line")
                .attr("d", function (d) {
                    return line(d.values);
                })
                .style("stroke-width", 2)
                .style("stroke", function (d) {
                    return color(d.name);
                });

            me.data = tempData.slice();
            me.dataCursor = 0;

            me.dataMarker = svg.append("g")
                .attr("class", "marker")
                .append("path")
                .style("stroke", "red")
                .style("stroke-width", 2);

            me.ecMarkers = svg.append('g');
            me.acMarkers = svg.append('g');

            me.yTransform = y;

            if (callback) callback();

        });
    };

    window.HTM.utils.chart = {
        InputChart: InputChart
    };
});