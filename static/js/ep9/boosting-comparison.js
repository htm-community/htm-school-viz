$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 1769;
    var maxInput = 29985;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(41);

    var playing = false;
    var save = false;

    var boostOffHistory = {
        inputEncoding: [],
        activeColumns: []
    };
    var boostOnHistory = {
        activeColumns: []
    };

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');
    var $boostOffMin = $('#off-min');
    var $boostOffMax = $('#off-max');
    var $boostOnMin = $('#on-min');
    var $boostOnMax = $('#on-max');

    var spClients = {
        boostOff: undefined,
        boostOn: undefined
    };

    var requestedStates = [
        HTM.SpSnapshots.ACT_COL,
        HTM.SpSnapshots.ACT_DC
    ];

    var inputDimensions = getInputDimension();
    var columnDimensions = [2048];
    var boostOffParams = new HTM.utils.sp.Params(
        '', inputDimensions, columnDimensions
    );
    var boostOnParams = new HTM.utils.sp.Params(
        '', inputDimensions, columnDimensions
    );

    var chartWidth = 1900;
    var chartHeight = 120;
    var boostOffChart = new HTM.utils.chart.InputChart(
        '#boostOff-chart', '/static/data/nyc_taxi_treated.csv',
        chartWidth, chartHeight
    );
    var boostOnChart = new HTM.utils.chart.InputChart(
        '#boostOn-chart', '/static/data/nyc_taxi_treated.csv',
        chartWidth, chartHeight
    );

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

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

    // SP params we are not allowing user to change
    function getInputDimension() {
        var numBits = scalarN
            + dateEncoder.timeOfDayEncoder.getWidth()
            + dateEncoder.weekendEncoder.getWidth();
        return [numBits];
    }


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

    function initSp(mainCallback) {
        var inits = [];
        loading(true);
        boostOffParams.setParam("boostStrength", 1);
        boostOnParams.setParam("boostStrength", 5);
        spClients.boostOff = new HTM.SpatialPoolerClient(false);
        spClients.boostOn = new HTM.SpatialPoolerClient(save);
        inits.push(function(callback) {
            spClients.boostOff.initialize(boostOffParams.getParams(), callback);
        });
        inits.push(function(callback) {
            spClients.boostOn.initialize(boostOnParams.getParams(), callback);
        });
        async.parallel(inits, function(err) {
            if (err) throw err;
            loading(false);
            if (mainCallback) mainCallback();
        });
    }

    function translate(x, min, max) {
        var range = max - min;
        return (x - min) / range;
    }

    function drawSdr(sdr, $el, x, y, width, height, style, circles) {
        var bits = sdr.length;
        var area = width * height;
        var squareArea = area / bits;
        var fullRectSize = Math.floor(Math.sqrt(squareArea));
        var rectSize = fullRectSize - 1;
        var rowLength = Math.floor(width / fullRectSize);
        var idPrefix = $el.attr('id');
        var onColor = 'steelblue';
        var circleColor = '#fff';
        var circleStrokeColor = '#000';

        $el.html('');

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

        $el
            .selectAll('rect')
            .data(sdr)
            .enter()
            .append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('x', function(d, i) {
                var offset = i % rowLength;
                return offset * fullRectSize + x;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * fullRectSize + y;
            })
            .attr('index', function(d, i) { return i; })
            .attr('id', function(d, i) { return idPrefix + '-' + i; })
            .attr('style', styleFunction)
        ;

        if (circles) {
            $el
                .selectAll('circle')
                .data(circles)
                .enter()
                .append('circle')
                .attr('r', rectSize / 3)
                .attr('cx', function (d, i) {
                    var offset = i % rowLength;
                    var left = offset * fullRectSize + x;
                    return left + fullRectSize / 2 - 1; // -1 for the border
                })
                .attr('cy', function (d, i) {
                    var offset = Math.floor(i / rowLength);
                    var top = offset * fullRectSize + y;
                    return top + fullRectSize / 2 - 1; // -1 for the border
                })
                .attr('index', function (d, i) {
                    return i;
                })
                .attr('style', function(d, i) {
                    var color = circleColor;
                    var strokeColor = circleStrokeColor;
                    var opacity = '1.0';
                    if (d == 0) {
                        opacity = '0.0';
                        strokeColor = 'rgba(0,0,0,0.0)';
                    }
                    return 'fill:' + color + ';' +
                        'stroke:' + strokeColor + ';' +
                        'stroke-width:1;' +
                        'fill-opacity:' + opacity + ';';
                })
            ;

        }
    }

    function renderSdrs(inputEncoding,
                        boostOff,
                        boostOn) {
        var boostOffAc = boostOff.activeColumns;
        var boostOnAc = boostOn.activeColumns;
        var boostOffDutyCycles = boostOff.activeDutyCycles;
        var boostOnDutyCycles = boostOn.activeDutyCycles;

        var dim = 800;
        var $input = d3.select('#input-encoding');
        drawSdr(
            inputEncoding, $input,
            0, 0, dim, dim, 'green'
        );

        var $boostOff = d3.select('#boostOff-columns');
        var boostOffMinAdc = _.min(boostOffDutyCycles);
        var boostOffMaxAdc = _.max(boostOffDutyCycles);
        var normalizedBoostOffAdcs = _.map(boostOffDutyCycles, function(value) {
            return translate(value, boostOffMinAdc, boostOffMaxAdc);
        });
        drawSdr(
            normalizedBoostOffAdcs, $boostOff, 840, 0, dim, dim,
            function(d, i) {
                return 'fill: #' + getGreenToRed(d * 100);
            }, boostOffAc
        );

        $boostOffMin.html(boostOffMinAdc.toFixed(2));
        $boostOffMax.html(boostOffMaxAdc.toFixed(2));

        var $boostOn = d3.select('#boostOn-columns');
        var boostOnMinAdc = _.min(boostOnDutyCycles);
        var boostOnMaxAdc = _.max(boostOnDutyCycles);
        var normalizedBoostOnAdcs = _.map(boostOnDutyCycles, function(value) {
            return translate(value, boostOnMinAdc, boostOnMaxAdc);
        });
        drawSdr(
            normalizedBoostOnAdcs, $boostOn, 1700, 0, dim, dim,
            function(d, i) {
                return 'fill: #' + getGreenToRed(d * 100);
            }, boostOnAc
        );

        $boostOnMin.html(boostOnMinAdc.toFixed(2));
        $boostOnMax.html(boostOnMaxAdc.toFixed(2));

    }

    function runOnePointThroughSp(mainCallback) {
        var chart = boostOffChart;
        var cursor = chart.dataCursor;
        var data = chart.data;
        var point = data[cursor];
        var date = moment(point.date);
        var day = date.day();
        var isWeekend = (day == 6) || (day == 0);    // 6 = Saturday, 0 = Sunday
        var power = parseFloat(point['consumption']);
        var encoding = [];
        var computes = {};

        // Update UI display of current data point.
        $powerDisplay.html(power);
        $todDisplay.html(date.format('h A'));
        $weekendDisplay.html(isWeekend ? 'yes' : 'no');

        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        encoding = encoding.concat(dateEncoder.encodeWeekend(date));

        _.each(spClients, function(client, name) {
            computes[name] = function(callback) {
                spClients[name].compute(
                    encoding, true, requestedStates, callback
                );
            };
        });

        async.parallel(computes, function(error, response) {
            if (error) throw error;
            var boostOffAc = response.boostOff.state.activeColumns;
            var boostOnAc = response.boostOn.state.activeColumns;

            var boostOffAcOverlaps = _.map(boostOffHistory.activeColumns, function(hist) {
                return SDR.tools.getOverlapScore(boostOffAc, hist);
            });
            var boostOnAcOverlaps = _.map(boostOnHistory.activeColumns, function(hist) {
                return SDR.tools.getOverlapScore(boostOnAc, hist);
            });

            boostOffChart.renderOverlapHistory(date, boostOffAcOverlaps, data);
            boostOnChart.renderOverlapHistory(date, boostOnAcOverlaps, data);

            renderSdrs(
                encoding,
                response.boostOff.state,
                response.boostOn.state
            );

            boostOffHistory.inputEncoding[cursor] = encoding;
            boostOffHistory.activeColumns[cursor] = boostOffAc;
            boostOnHistory.activeColumns[cursor] = boostOnAc;
            if (mainCallback) mainCallback();
        });
    }

    function stepThroughData(callback) {
        if (!playing || boostOffChart.dataCursor == boostOffChart.data.length - 1) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(stepThroughData);
        boostOffChart.dataCursor++;
        boostOnChart.dataCursor++;
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
            } else if (this.id == 'next') {
                runOnePointThroughSp();
                boostOffChart.dataCursor++;
                boostOnChart.dataCursor++;
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

    initSp(function() {
        boostOffChart.render(function() {
            boostOnChart.render(function() {
                addDataControlHandlers();
                runOnePointThroughSp();
                boostOffChart.dataCursor++;
                boostOnChart.dataCursor++;
            });
        });
    });

});
