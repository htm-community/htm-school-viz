$(function() {

    /* From http://stackoverflow.com/questions/7128675/from-green-to-red-color-depend-on-percentage */
    function getGreenToRed(percent){
        var r, g;
        percent = 100 - percent;
        r = percent < 50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
        g = percent > 50 ? 255 : Math.floor((percent*2)*255/100);
        return rgbToHex(r, g, 0);
    }

    /* From http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb */
    function rgbToHex(r, g, b) {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function getPercentDistanceCrossed(min, value, max) {
        var range = max - min;
        var adjustedValue = value - min;
        if (range == 0) return 0;
        return adjustedValue / range;
    }


    function InputChart(selector, csv, w, h) {
        this.selector = selector;
        this.csv = csv;
        this.data = undefined;
        this.dataCursor = undefined;
        this.dataMarker = undefined;
        this.ecMarkers = undefined;
        this.acMarkers = undefined;
        this.overlapMarkers = undefined;
        this.transformDateIntoXValue = undefined;
        this.yTransform = undefined;
        this.width = w;
        this.height = h;

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
        var width = this.width;
        var height = this.height;

        this.svg = undefined;
        $(this.selector).html('');
        this.dataCursor = 0;

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
            .attr("width", width)
            .attr("height", height + 20)
            .append("g")
            ;


        me.loadData(function(error) {
            var data = me.data;
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
            me.overlapMarkers = svg.append('g');

            me.yTransform = y;

            if (callback) callback();
        });

    };

    InputChart.prototype.updateChartMarkers = function(date, closeAc, closeEc) {
        var me = this;
        var acMarkers = this.acMarkers;
        var ecMarkers = this.ecMarkers;
        var xVal = me.transformDateIntoXValue(date);

        me.dataMarker.attr("d", "M " + xVal + ",0 " + xVal + ",1000");

        if (closeAc) {
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
        }

        if (closeEc) {
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
        }
    };

    InputChart.prototype.renderOverlapHistory = function(date, overlaps, data) {
        var me = this;
        var overlapMarkers = this.overlapMarkers;
        var xVal = me.transformDateIntoXValue(date);
        var min = _.min(overlaps);
        var max = _.max(overlaps);

        me.dataMarker.attr("d", "M " + xVal + ",0 " + xVal + ",1000");

        overlapMarkers.html('');
        overlapMarkers.selectAll('circle')
            .data(overlaps)
            .enter()
            .append('circle')
            .attr('r', 4)
            .attr('cx', function(d, i) {
                return me.transformDateIntoXValue(data[i].date);
            })
            .attr('cy', function(d, i) {
                return me.yTransform(data[i].consumption);
            })
            .style('fill', function(d) {
                var perc = getPercentDistanceCrossed(min, d, max);
                var color = getGreenToRed((1.0 - perc) * 100);
                return '#' + color;
            });
    };

    InputChart.prototype.onMouseMove = function(fn) {
        var me = this;
        var data = this.data;
        var bisectDate = d3.bisector(function(d) { return d.date; }).left;
        var x = this.transformDateIntoXValue;
        this.svg.on('mousemove', function() {
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(data, x0, 1),
                d0 = data[i - 1],
                d1 = data[i],
                d = x0 - d0.date > d1.date - x0 ? d1 : d0;
            var xVal = me.transformDateIntoXValue(d.date);
            me.dataMarker.attr("d", "M " + xVal + ",0 " + xVal + ",1000");
            fn(d);
        });
    };

    InputChart.prototype._lazyCreateSVG = function() {
        if (! this.svg) {
            this.svg = d3.select(this.selector).append("svg")
        } else {
            this.svg.html('');
        }
        return this.svg;
    };

    window.HTM.utils.chart = {
        InputChart: InputChart
    };
});