$(function() {

    function InputChart(elId, csv, w, h) {
        this.elId = elId;
        this.csv = csv;
        this.data = undefined;
        this.dataCursor = undefined;
        this.dataMarker = undefined;
        this.ecMarkers = undefined;
        this.acMarkers = undefined;
        this.transformDateIntoXValue = undefined;
        this.yTransform = undefined;
        this.margin = {top: 20, right: 20, bottom: 20, left: 20};
        this.width = w - this.margin.left - this.margin.right;
        this.height = h - this.margin.top - this.margin.bottom;

    }

    InputChart.prototype.loadData = function(callback) {
        var me = this;
        var parseDate = d3.time.format("%m/%d/%y %H:%M").parse;
        if (! me.data) {
            d3.csv(me.csv, function (error, data) {
                if (error) return callback(error);
                data.forEach(function (d) {
                    d.date = parseDate(d.date);
                });
                me.data = data;
                me.dataCursor = 0;
                callback();
            });
        } else {
            callback();
        }
    };

    InputChart.prototype.render = function(callback) {
        var me = this;
        var elId = this.elId;
        var width = this.width;
        var height = this.height;
        var margin = this.margin;

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

        var svg = this._lazyCreateSVG()
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var data = this.data;

        me.loadData(function(error) {
            if (error) throw error;

            color.domain(d3.keys(data[0]).filter(function (key) {
                return key !== "date";
            }));

            var gyms = color.domain().map(function (name) {
                return {
                    name: name,
                    values: data.map(function (d) {
                        return {date: d.date, consumption: +d[name]};
                    })
                };
            });

            me.transformDateIntoXValue.domain(d3.extent(data, function (d) {
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

    InputChart.prototype.updateChartMarkers = function(date, encoding, activeColumns, closeAc, closeEc) {
        var me = this;
        var acMarkers = this.acMarkers;
        var ecMarkers = this.ecMarkers;
        var xVal = me.transformDateIntoXValue(date);

        me.dataMarker.attr("d", "M " + xVal + ",0 " + xVal + ",1000");

        acMarkers.html('');
        acMarkers.selectAll('circle')
            .data(_.map(closeAc, function(d) { return d.data; }))
            .enter()
            .append('circle')
            .attr('r', 6)
            .attr('cx', function(d) {
                return me.transformDateIntoXValue(d.date);
            })
            .attr('cy', function(d) {
                return me.yTransform(d.consumption);
            })
            .style('fill', 'orange');

        ecMarkers.html('');
        ecMarkers.selectAll('circle')
            .data(_.map(closeEc, function(d) { return d.data; }))
            .enter()
            .append('circle')
            .attr('r', 8)
            .attr('cx', function(d) {
                return me.transformDateIntoXValue(d.date);
            })
            .attr('cy', function(d) {
                return me.yTransform(d.consumption);
            })
            .style('fill', 'green');
    };

    InputChart.prototype._lazyCreateSVG = function() {
        if (! this.svg) {
            this.svg = d3.select(this.elId).append("svg")
        } else {
            this.svg.html('');
        }
        return this.svg;
    };

    window.HTM.utils.chart = {
        InputChart: InputChart
    };
});