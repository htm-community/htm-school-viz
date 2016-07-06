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

    var learn = true;
    var playing = false;

    var history = {
        inputEncoding: [],
        activeColumns: [],
        overlaps: []
    };

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');

    var spClient;

    var noise = 0.0;

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

    function getClosestSdrIndices(target, sdrs, count) {
        if (! count) count = 10;
        var overlaps = _.map(sdrs, function(sdr, i) {
            return {
                overlap: SDR.tools.getOverlapScore(target, sdr),
                index: i
            };
        });
        var sortedOverlaps = _.sortBy(overlaps, function(o) {
            return o.overlap;
        }).reverse();
        return _.map(sortedOverlaps, function(o) { return o.index; }).slice(0, count);
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

    function getUnionFromPreviousIndices(indices, sdrs) {
        var zeros = [];
        if (! sdrs.length) {
            return zeros;
        }
        _.times(sdrs[0].length, function() { zeros.push(0); });
        return _.reduce(_.map(indices, function(i) {
            return sdrs[i];
        }), function(a, b) {
            return SDR.tools.union(a, b);
        }, zeros);
    }

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
        return adjustedValue / range;
    }

    function drawSdrOverlapHeatmap(id, sdr, overlaps, w, h) {
        var dataMin = _.min(overlaps);
        var dataMax = _.max(overlaps);

        drawSdr(id, sdr, w, h, function(d, i) {
            var percent;
            var stroke = '#CACACA';
            var strokeWidth = 1;
            percent = getPercentDistanceCrossed(dataMin, overlaps[i], dataMax);
            var fill = '#' + getGreenToRed(percent * 100);
            if (d == 1) {
                stroke = 'black';
            }
            return 'stroke:' + stroke + ';'
                + 'fill:' + fill + ';'
                + 'stroke-width:' + strokeWidth + ';';
        });
    }

    function drawSdrComparison(id, left, right, w, h) {
        var leftColor = 'orange';
        var rightColor = 'green';
        drawSdr(id, left, w, h, function(d, i) {
            var strokeWidth = 1;
            var fill = 'white';
            var leftBit = d;
            var rightBit = right[i];
            if (leftBit == 1 && rightBit == 1) {
                fill = 'red';
            } else if (leftBit == 1 && rightBit == 0) {
                fill = leftColor;
            } else if (leftBit == 0 && rightBit == 1) {
                fill = rightColor;
            }
            return 'fill:' + fill + ';'
                + 'stroke-width:' + strokeWidth + ';';
        });
    }

    function drawSdr(id, sdr, w, h, style) {
        var margin = {top: 20, right: 20, bottom: 20, left: 20},
            width = w - margin.left - margin.right,
            height = h - margin.top - margin.bottom,
            rowLength = Math.floor(Math.sqrt(sdr.length)),
            fullRectSize = Math.floor(width / rowLength),
            rectSize = fullRectSize - 1,
            onColor = 'steelblue'
            ;

        $('#' + id).html('');

        var svg = d3.select('#' + id).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            ;

        var styleFunction = function(d, i) {
            var fill = 'white';
            if (d == 1) {
                fill = onColor;
            }
            return 'fill:' + fill;
        };

        if (style) {
            if (typeof(style) == 'string') {
                onColor = style;
            } else if (typeof(style) == 'function') {
                styleFunction = style;
            } else {
                throw new Error('style must be function or string');
            }
        }

        svg.selectAll('rect')
            .data(sdr)
            .enter()
            .append('rect')
            .attr('x', function(d, i) {
                var offset = i % rowLength;
                return offset * fullRectSize;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * fullRectSize;
            })
            .attr('index', function(d, i) { return i; })
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('style', styleFunction)
        ;
    }

    function drawActiveColumns(id, activeColumns, overlaps, w, h) {
        if (overlaps) {
            drawSdrOverlapHeatmap(id, activeColumns, overlaps, w, h);
        } else {
            drawSdr(id, activeColumns, w, h);
        }
    }

    function renderSdrs(inputEncoding,
                        activeColumns
    ) {

        var dim = 800;

        drawSdr(
            'input-encoding', inputEncoding, dim, dim, 'green'
        );

        drawSdr(
            'active-columns', activeColumns, dim, dim, 'orange'
        );

    }

    function runOnePointThroughSp(cursor, callback) {
        if (! cursor) cursor = dataCursor;
        var point = data[cursor];
        var date = moment(point.date);
        var power = parseFloat(point['consumption']);
        var encoding = [];
        var xVal = transformDateIntoXValue(date);
        //var lastInputEncoding = history.inputEncoding[cursor];
        //var lastActiveColumns = history.activeColumns[cursor];
        //var lastOverlaps = history.overlaps[cursor];
        var day = date.day();
        var isWeekend = (day == 6) || (day == 0);    // 6 = Saturday, 0 = Sunday

        console.log('Running point %s', cursor);

        dataMarker.attr("d", "M " + xVal + ",0 " + xVal + ",1000");

        // Update UI display of current data point.
        $powerDisplay.html(power);
        $todDisplay.html(date.format('h A'));
        $weekendDisplay.html(isWeekend ? 'yes' : 'no');


        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        encoding = encoding.concat(dateEncoder.encodeWeekend(date));

        //if (! learn) {
        //    encoding = SDR.tools.addNoise(encoding, noise);
        //}

        // Run encoding through SP.
        spClient.compute(encoding, {
            learn: learn
        }, function(spBits) {
            var activeColumns = spBits.activeColumns;
            var overlaps = spBits.overlaps;

            var closeAc = _.map(getClosestSdrIndices(
                activeColumns, history.activeColumns, Math.floor(dataCursor * 0.1)
            ), function(inputIndex) {
                return {
                    index: inputIndex,
                    data: data[inputIndex]
                };
            });
            acMarkers.html('');
            acMarkers.selectAll('circle')
                .data(_.map(closeAc, function(d) { return d.data; }))
                .enter()
                .append('circle')
                .attr('r', 6)
                .attr('cx', function(d) {
                    return transformDateIntoXValue(d.date);
                })
                .attr('cy', function(d) {
                    return yTransform(d.consumption);
                })
                .style('fill', 'orange');

            var closeEc = _.map(getClosestSdrIndices(
                encoding, history.inputEncoding, Math.floor(dataCursor * 0.05)
            ), function(inputIndex) {
                return {
                    index: inputIndex,
                    data: data[inputIndex]
                };
            });
            ecMarkers.html('');
            ecMarkers.selectAll('circle')
                .data(_.map(closeEc, function(d) { return d.data; }))
                .enter()
                .append('circle')
                .attr('r', 8)
                .attr('cx', function(d) {
                    return transformDateIntoXValue(d.date);
                })
                .attr('cy', function(d) {
                    return yTransform(d.consumption);
                })
                .style('fill', 'green');

            renderSdrs(
                encoding,
                activeColumns
            );

            history.inputEncoding[cursor] = encoding;
            history.activeColumns[cursor] = activeColumns;
            history.overlaps[cursor] = overlaps;
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
        //$('#learn').bootstrapSwitch({
        //    size: 'small',
        //    state: learn
        //}).on('switchChange.bootstrapSwitch', function(event, state) {
        //    learn = state;
        //});

    }

    //function addSlider() {
    //    var $noiseDisplay = $('#noise-display');
    //    $('#noise').slider({
    //        min: 0.0,
    //        max: 1.0,
    //        value: noise,
    //        step: 0.05,
    //        change: function(evt, ui) {
    //            noise = ui.value;
    //            $noiseDisplay.html(noise);
    //        },
    //        slide: function(evt, ui) {
    //            $noiseDisplay.html(ui.value);
    //        }
    //    });
    //    $noiseDisplay.html(noise);
    //}

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
        drawInputChart('#input-chart', chartWidth, chartHeight);
        dataCursor = 0;
        runOnePointThroughSp();
    }

    spParams.render(function() {
        initSp(function() {
            drawInputChart('#input-chart', chartWidth, chartHeight, function() {
                //addSlider();
                addDataControlHandlers();
                runOnePointThroughSp();
            });
        });
    }, function() {
        initSp();
    });

});
