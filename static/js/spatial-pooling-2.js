$(function() {

    var inputN = 400;
    var inputW = 21;
    var minInput = 20;
    var maxInput = 90;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        inputN, inputW, minInput, maxInput
    );

    // SDR Viz params
    var vizWidth = 1400;
    var vizHeight = 800;

    var data, dataCursor;
    var dataMarker;
    var inputEncoding;
    var activeColumns;
    var overlaps;

    var getConnectedSynapses = false;
    var getPotentialPools = false;

    var playing = false;

    var spClient;

    // SP params we are not allowing user to change
    var inputDimensions = [inputN * 3];
    var columnDimensions = [2048];
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var spViz = new HTM.utils.sp.SPViz(
        'City Temps', 'sp-viz', spParams
    );

    var $sfDisplay = $('#sf-display');
    var $nyDisplay = $('#ny-display');
    var $auDisplay = $('#au-display');

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var transformDateIntoXValue;

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
            if (inputEncoding) {
                runOnePointThroughSp(null, true);
            } else {
                loading(false);
            }
            if (callback) callback();
        });
    }

    function drawInputChart(elId, callback) {
        var margin = {top: 20, right: 20, bottom: 20, left: 20},
            width = 1400 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

        var parseDate = d3.time.format("%Y%m%d").parse;

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
                return y(d.temperature);
            });

        var svg = d3.select(elId).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        d3.tsv("/static/data/temps.tsv", function (error, tempData) {
            if (error) throw error;

            color.domain(d3.keys(tempData[0]).filter(function (key) {
                return key !== "date";
            }));

            tempData.forEach(function (d) {
                d.date = parseDate(d.date);
            });

            var cities = color.domain().map(function (name) {
                return {
                    name: name,
                    values: tempData.map(function (d) {
                        return {date: d.date, temperature: +d[name]};
                    })
                };
            });

            transformDateIntoXValue.domain(d3.extent(tempData, function (d) {
                return d.date;
            }));

            y.domain([
                d3.min(cities, function (c) {
                    return d3.min(c.values, function (v) {
                        return v.temperature;
                    });
                }),
                d3.max(cities, function (c) {
                    return d3.max(c.values, function (v) {
                        return v.temperature;
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
                .text("Temperature (ºF)");

            var city = svg.selectAll(".city")
                .data(cities)
                .enter().append("g")
                .attr("class", "city");

            city.append("path")
                .attr("class", "line")
                .attr("d", function (d) {
                    return line(d.values);
                })
                .style("stroke", function (d) {
                    return color(d.name);
                });

            city.append("text")
                .datum(function (d) {
                    return {name: d.name, value: d.values[d.values.length - 1]};
                })
                .attr("transform", function (d) {
                    return "translate(" + transformDateIntoXValue(d.value.date) + "," + y(d.value.temperature) + ")";
                })
                .attr("x", 3)
                .attr("dy", ".35em")
                .text(function (d) {
                    return d.name;
                });

            data = tempData.slice();
            dataCursor = 0;

            dataMarker = svg.append("g")
                .attr("class", "marker")
                .append("path")
                .style("stroke", "red")
                .style("stroke-width", 4);

            if (callback) callback();

        });

    }

    function runOnePointThroughSp(callback, preventAdvance) {
        var point = data[dataCursor];
        var sf = point['San Francisco'];
        var nyc = point['New York'];
        var austin = point['Austin'];
        var encoding = [];
        var xVal = transformDateIntoXValue(point.date);

        dataMarker.attr("d", "M " + xVal + ",0 " + xVal + ",1000");

        // Update UI display of current data point.
        $sfDisplay.html(sf);
        $nyDisplay.html(nyc);
        $auDisplay.html(austin);
        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(sf));
        encoding = encoding.concat(scalarEncoder.encode(nyc));
        encoding = encoding.concat(scalarEncoder.encode(austin));
        inputEncoding = encoding;
        // Run encoding through SP.
        loading(true, false);
        spClient.compute(encoding, {
            getConnectedSynapses: getConnectedSynapses,
            getPotentialPools: getPotentialPools
        }, function(spBits) {
            activeColumns = spBits.activeColumns;
            overlaps = spBits.overlaps;
            spViz.render(
                inputEncoding,
                activeColumns,
                overlaps,
                spBits.connectedSynapses,
                spBits.potentialPools,
                vizWidth, vizHeight
            );
            if (preventAdvance == undefined || ! preventAdvance) {
                dataCursor++;
            }
            loading(false);
            if (callback) callback();
        });
    }

    function stepThroughData(callback) {
        if (!playing || dataCursor == data.length - 1) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(stepThroughData);
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
            } else if (this.id='next') {
                runOnePointThroughSp();
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
        runOnePointThroughSp(null, true);
    });

    spParams.render(function() {
        initSp(function() {
            drawInputChart('#input-chart', function() {
                addDataControlHandlers();
                runOnePointThroughSp();
            });
        });
    }, function() {
        initSp();
    });

});
