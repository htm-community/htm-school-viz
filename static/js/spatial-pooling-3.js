$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    var data, dataCursor;
    var dataMarker;
    var acMarkers;
    var ecMarkers;

    var playing = false;

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');

    var getConnectedSynapses = true;
    var getPotentialPools;

    var spClient;

    // SP params we are not allowing user to change
    var inputDimensions = [
        scalarN
        + dateEncoder.timeOfDayEncoder.getWidth()
        + dateEncoder.weekendEncoder.getWidth()
    ];
    var columnDimensions = [2048];
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var spViz = new HTM.utils.sp.SPViz(
        'Hotgym', 'sp-viz', spParams, false
    );

    var chartWidth = 2000;
    var chartHeight = 300;

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var transformDateIntoXValue;
    var yTransform;

    function loading(isLoading, isModal) {
        if (isModal == undefined) {
            isModal = true;
        }
        if (isLoading) {
            waitingForServer = true;
            if (! isModal) {
                $loading.addClass('little');
            }
            $loading.show();
        } else {
            waitingForServer = false;
            $loading.hide();
            $loading.removeClass('little');
        }
    }

    function initSp(callback) {
        spClient = new HTM.SpatialPoolerClient();
        loading(true);
        spClient.initialize(spParams.getParams(), function() {
            loading(false);
            if (callback) callback();
        });
    }

    function drawInputChart(elId, w, h, callback) {
        var margin = {top: 20, right: 20, bottom: 20, left: 20},
            width = w - margin.left - margin.right,
            height = h - margin.top - margin.bottom;

        var parseDate = d3.time.format("%m/%d/%y %H:%M").parse;

        transformDateIntoXValue = d3.time.scale()
            .range([0, width]);

        var y = d3.scale.linear()
            .range([height, 0]);

        var color = d3.scale.category10();

        var xAxis = d3.svg.axis()
            .scale(transformDateIntoXValue)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        var line = d3.svg.line()
            .interpolate("basis")
            .x(function (d) {
                return transformDateIntoXValue(d.date);
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

            transformDateIntoXValue.domain(d3.extent(tempData, function (d) {
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

            data = tempData.slice();
            dataCursor = 0;

            dataMarker = svg.append("g")
                .attr("class", "marker")
                .append("path")
                .style("stroke", "red")
                .style("stroke-width", 2);

            ecMarkers = svg.append('g');
            acMarkers = svg.append('g');

            yTransform = y;

            if (callback) callback();

        });

    }

    function runOnePointThroughSp(cursor, callback) {
        if (! cursor) cursor = dataCursor;
        var point = data[cursor];
        var date = moment(point.date);
        var power = parseFloat(point['consumption']);
        var encoding = [];
        var xVal = transformDateIntoXValue(date);
        var day = date.day();
        var isWeekend = (day == 6) || (day == 0);    // 6 = Saturday, 0 = Sunday

        dataMarker.attr("d", "M " + xVal + ",0 " + xVal + ",1000");

        // Update UI display of current data point.
        $powerDisplay.html(power);
        $todDisplay.html(date.format('h A'));
        $weekendDisplay.html(isWeekend ? 'yes' : 'no');

        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        encoding = encoding.concat(dateEncoder.encodeWeekend(date));

        // Run encoding through SP.
        spClient.compute(encoding, {
            getConnectedSynapses: getConnectedSynapses,
            getPotentialPools: getPotentialPools
        }, function(spBits) {
            spViz.render(
                encoding,
                spBits.activeColumns,
                spBits.overlaps,
                spBits.connectedSynapses,
                spBits.potentialPools
            );
            loading(false);
            if (callback) callback();
        });
    }

    function stepThroughData(callback) {
        if (!playing || dataCursor == data.length - 1) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(dataCursor++, stepThroughData);
    }

    function addDataControlHandlers() {
        $('.player button').click(function(evt) {
            var $btn = $(this);
            if (this.id == 'play') {
                if ($btn.hasClass('btn-success')) {
                    pause();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-play');
                } else {
                    play();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-pause');
                }
                $btn.toggleClass('btn-success');
            } else if (this.id == 'stop') {
                stop();
            } else if (this.id == 'next') {
                runOnePointThroughSp(dataCursor++);
            } else if (this.id == 'prev') {
                runOnePointThroughSp(dataCursor--);
            }
        });
    }

    function play() {
        playing = true;
        stepThroughData(function (err) {
            if (err) throw err;
        });
    }

    function pause() {
        playing = false;
    }

    function stop() {
        var $play = $('#play');
        playing = false;
        $play.find('span').attr('class', 'glyphicon glyphicon-play');
        $play.removeClass('btn-success');
        $('#input-chart').html('');
        drawInputChart('#input-chart');
    }

    spViz.onViewOptionChange(function(returnConnectedSynapses, returnPotentialPools) {
        getConnectedSynapses = returnConnectedSynapses;
        getPotentialPools = returnPotentialPools;
        runOnePointThroughSp();
    });

    spParams.render(function() {
        initSp(function() {
            drawInputChart('#input-chart', chartWidth, chartHeight, function() {
                addDataControlHandlers();
                runOnePointThroughSp();
            });
        });
    }, function() {
        initSp();
    });

});
