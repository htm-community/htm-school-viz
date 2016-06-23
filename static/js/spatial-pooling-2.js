$(function() {

    var inputN = 400;
    var inputW = 21;
    var minInput = 20;
    var maxInput = 90;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        inputN, inputW, minInput, maxInput
    );

    var data, dataCursor;
    var dataMarker;
    var playing = false;

    var spClient;

    // SP params we are not allowing user to change
    var inputDimensions = [inputN * 3];
    var columnDimensions = [2048];
    // SP boolean params
    var globalInhibition = true;
    var wrapAround = true;
    // SP scalar params we'll turn into sliders for adjustment
    var spScalarParams = {
        potentialRadius: {
            val: 16,
            min: 0,
            max: 128,
            name: 'potential radius'
        },
        potentialPct: {
            val: 0.85,
            min: 0.0,
            max: 1.0,
            name: 'potential percent'
        },
        localAreaDensity: {
            val: -1.0,
            min: -1.0,
            max: 10.0,
            name: 'local area density'
        },
        numActiveColumnsPerInhArea: {
            val: 10.0,
            min: 0.0,
            max: 100.0,
            name: 'number of active columns per inhibition area'
        },
        stimulusThreshold: {
            val: 0,
            min: 0,
            max: 10,
            name: 'stimulus threshold'
        },
        synPermInactiveDec: {
            val: 0.008,
            min: 0.0,
            max: 1.0,
            name: 'synaptic permanence inactive decrement'
        },
        synPermActiveInc: {
            val: 0.05,
            min: 0.0,
            max: 1.0,
            name: 'synaptic permanence active increment'
        },
        synPermConnected: {
            val: 0.10,
            min: 0.0,
            max: 1.0,
            name: 'synaptic permanence connected'
        },
        minPctOverlapDutyCycle: {
            val: 0.001,
            min: 0.0,
            max: 1.0,
            name: 'minimum percent overlap duty cycle'
        },
        minPctActiveDutyCycle: {
            val: 0.001,
            min: 0.0,
            max: 1.0,
            name: 'minimum percent active duty cycle'
        },
        dutyCyclePeriod: {
            val: 1000,
            min: 0,
            max: 10000,
            name: 'duty cycle period'
        },
        maxBoost: {
            val: 1.0,
            min: 0.0,
            max: 10.0,
            name: 'max boost'
        }
    };

    var $spScalarParams = $('#sp-scalar-params');

    var $globalInhibitionSwitch = $('#globalInhibition').bootstrapSwitch({state: globalInhibition});
    var $wrapAroundSwitch = $('#wrapAround').bootstrapSwitch({state: wrapAround});

    var $sfDisplay = $('#sf-display');
    var $nyDisplay = $('#ny-display');
    var $auDisplay = $('#au-display');

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    // Handlebars templates
    var spScalarSliderTmpl = Handlebars.compile($('#sp-scalar-slider-tmpl').html());
    var spScalarParamsTmpl = Handlebars.compile($('#sp-scalar-params-tmpl').html());
    Handlebars.registerPartial('spScalarSliderTmpl', spScalarSliderTmpl);

    var transformDateIntoXValue;

    function loading(isLoading) {
        if (isLoading) {
            waitingForServer = true;
            $loading.show();
        } else {
            waitingForServer = false;
            $loading.hide();
        }
    }

    function calculateSliderStep(min, max, val) {
        var range = max - min;
        if (Number.isInteger(val)) {
            if (val >= 1000) {
                return 10;
            } else {
                return 1;
            }
        } else {
            if (range <= 1) {
                if (val < 0.01) {
                    return 0.001;
                } else {
                    return 0.01;
                }
            } else if (range < 10) {
                return 0.1;
            }
        }
    }

    function initSp(callback) {
        var spParams = {
            inputDimensions: inputDimensions,
            columnDimensions: columnDimensions,
            globalInhibition: globalInhibition,
            wrapAround: wrapAround
        };
        // Grab the user-controlled parameters from the interface object.
        _.each(spScalarParams, function(val, codeName) {
            spParams[codeName] = val.val;
        });
        spClient = new HTM.SpatialPoolerClient();
        loading(true);
        spClient.initialize(spParams, function() {
            loading(false);
            callback();
        });
    }

    function renderParams() {
        var data = {left: [], right: []};
        var count = 0;
        _.each(spScalarParams, function(val, codeName) {
            var viewObj = {
                id: codeName,
                name: val.name
            };
            if (count % 2 == 0) {
                data.left.push(viewObj);
            } else {
                data.right.push(viewObj);
            }
            count++;
        });
        $spScalarParams.html(spScalarParamsTmpl(data));
        // Render sliders and capture DOM elements associtated with these params
        // after rendering.
        _.each(spScalarParams, function(val, codeName) {
            var step = calculateSliderStep(val.min, val.max, val.val);
            val.sliderEl = $('#' + codeName);
            val.displayEl = $('#' + codeName + '-display');
            val.sliderEl.slider({
                value: val.val,
                min: val.min,
                max: val.max,
                step: step,
                change: function(event, ui) {
                    if (waitingForServer) {
                        console.log('Sorry, still waiting for server-side SP...');
                        event.preventDefault();
                    } else {
                        val.val = ui.value;
                        initSp(function() {
                            updateUi();
                        });
                    }
                },
                slide: function(event, ui) {
                    val.displayEl.html(ui.value);
                }
            });
        });
        $globalInhibitionSwitch.on('switchChange.bootstrapSwitch', function(event, state) {
            if (waitingForServer) {
                console.log('Sorry, still waiting for server-side SP...');
                event.preventDefault();
            } else {
                globalInhibition = state;
                initSp(function() {
                    updateUi();
                });
            }
        });
        $wrapAroundSwitch.on('switchChange.bootstrapSwitch', function(event, state) {
            if (waitingForServer) {
                console.log('Sorry, still waiting for server-side SP...');
                event.preventDefault();
            } else {
                wrapAround = state;
                initSp(function() {
                    updateUi();
                });
            }
        });
    }

    function updateUi() {
        _.each(spScalarParams, function(val, codeName) {
            val.displayEl.html(val.val);
        });
    }

    function runOnePointThroughSp(point, callback) {
        var sf = point['San Francisco'];
        var nyc = point['New York'];
        var austin = point['Austin'];
        var encoding = [];
        // Update UI display of current data point.
        $sfDisplay.html(sf);
        $nyDisplay.html(nyc);
        $auDisplay.html(austin);
        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(sf));
        encoding = encoding.concat(scalarEncoder.encode(nyc));
        encoding = encoding.concat(scalarEncoder.encode(austin));
        // Run encoding through SP.
        spClient.compute(encoding, function(spBits) {
            // Display encoding in UI.
            SDR.draw(encoding, 'encoding', {
                spartan: true,
                size: 30
            });
            // Display active columns in UI.
            SDR.draw(spBits.activeColumns, 'active-columns', {
                spartan: true,
                size: 30
            });
            callback();
        });
    }

    function drawInputChart(elId) {
        var margin = {top: 20, right: 20, bottom: 20, left: 20},
            width = 1000 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

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

        });

    }

    function stepThroughData(callback) {
        var point;
        var xVal;
        if (!playing || dataCursor == data.length - 1) {
            return callback();
        }
        point = data.shift();
        xVal = transformDateIntoXValue(point.date);

        dataMarker.attr("d", "M " + xVal + ",0 " + xVal + ",1000");

        runOnePointThroughSp(point, stepThroughData);
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

    initSp(function() {
        renderParams();
        drawInputChart('#input-chart');
        addDataControlHandlers();
        updateUi();
    });

});
