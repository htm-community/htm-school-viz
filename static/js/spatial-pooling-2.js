$(function() {

    var inputN = 400;
    var inputW = 21;
    var minInput = 20;
    var maxInput = 90;
    var inputRange = maxInput - minInput;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        inputN, inputW, minInput, maxInput
    );

    // The number the user clicked last.
    var inputValue;
    var inputEncoding;

    var inputRectSize = 40;
    var inputGridWidth = Math.floor(Math.sqrt(inputRange));

    var spClient;

    // SP params we are not allowing user to change
    var inputDimensions = [inputN * 3];
    var columnDimensions = [2048];
    var seed = -1;
    // SP boolean params
    var globalInhibition = true;
    var wrapAround = true
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

    var $wrapAround;
    var $wrapAroundDisplay = $('#wrap-around-display');
    var $globalInhibition;
    var $globalInhibitionDisplay = $('#global-inhibition-display');
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
            if (inputEncoding) {
                spClient.compute(inputEncoding, function(spBits) {
                    loading(false);
                    SDR.draw(spBits.activeColumns, 'active-columns', {
                        spartan: true,
                        size: 30
                    });
                });
            } else {
                loading(false);
            }
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
        $('#globalInhibition').on('switchChange.bootstrapSwitch', function(event, state) {
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
        $('#wrapAround').on('switchChange.bootstrapSwitch', function(event, state) {
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
        console.log('processing point:');
        console.log(point);
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
        // Display encoding in UI.
        SDR.draw(encoding, 'encoding', {
            spartan: true,
            size: 30
        });
        // Run encoding through SP.
        spClient.compute(encoding, function(spBits) {
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

        var parseDate = d3.time.format("%Y%m%d").parse,
            bisectDate = d3.bisector(function(d) { return d.date; }).left;

        var x = d3.time.scale()
            .range([0, width]);

        var y = d3.scale.linear()
            .range([height, 0]);

        var color = d3.scale.category10();

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        var line = d3.svg.line()
            .interpolate("basis")
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.temperature); });

        var svg = d3.select(elId).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        d3.tsv("/static/data/temps.tsv", function(error, data) {
          if (error) throw error;

          color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));

          data.forEach(function(d) {
            d.date = parseDate(d.date);
          });

          var cities = color.domain().map(function(name) {
            return {
              name: name,
              values: data.map(function(d) {
                return {date: d.date, temperature: +d[name]};
              })
            };
          });

          x.domain(d3.extent(data, function(d) { return d.date; }));

          y.domain([
            d3.min(cities, function(c) { return d3.min(c.values, function(v) { return v.temperature; }); }),
            d3.max(cities, function(c) { return d3.max(c.values, function(v) { return v.temperature; }); })
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
              .attr("d", function(d) { return line(d.values); })
              .style("stroke", function(d) { return color(d.name); });

          city.append("text")
              .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
              .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.temperature) + ")"; })
              .attr("x", 3)
              .attr("dy", ".35em")
              .text(function(d) { return d.name; });

          var focus = svg.append("g")
              .attr("class", "focus")
              .style("display", "none");

          focus.append("circle")
              .attr("r", 4.5);

          focus.append("text")
              .attr("x", 9)
              .attr("dy", ".35em");

          svg.append("rect")
              .attr("class", "overlay")
              .attr("width", width)
              .attr("height", height);


          var dataCopy = data.slice();

          function processRest(callback) {
              var point;
              if (dataCopy.length == 0) return callback();
              point = dataCopy.shift();
              runOnePointThroughSp(point, function(error) {
                  if (error) return callback(error);
                  setTimeout(function() {
                      processRest(callback);
                  }, 500);
              });
          }

          processRest(function(err) {
              if (err) throw err;
              console.log('Done processing.');
          });

        //       .on("mouseover", function() { focus.style("display", null); })
        //       .on("mouseout", function() { focus.style("display", "none"); })
        //       .on("mousemove", mousemove);
          //
        //   function mousemove() {
        //       var x0 = x.invert(d3.mouse(this)[0]),
        //           i = bisectDate(data, x0, 1),
        //           d0 = data[i - 1],
        //           d1 = data[i],
        //           d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        //       focus.attr("transform", "translate(" + x(d.date) + "," + y(d.Austin) + ")");
        //   }

        });

    }

    initSp(function() {
        renderParams();
        drawInputChart('#input-chart');
        updateUi();
    });

});
