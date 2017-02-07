$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(41);

    var playing = false;
    var requestedStates = [
        HTM.SpSnapshots.ACT_COL,
        HTM.SpSnapshots.CON_SYN,
        HTM.SpSnapshots.BST_FCTRS,
        HTM.SpSnapshots.ACT_DC
    ];

    var learningHistory = {
        inputEncoding: [],
        activeColumns: []
    };
    var inputCache = [];
    var connectedSynapses = undefined;
    var potentialPools = undefined;
    var inhibitionMasks = undefined;
    var boostFactors = undefined;

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');
    var $adcMin = $('#adc-min');
    var $adcMax = $('#adc-max');
    var $boostMin = $('#boost-min');
    var $boostMax = $('#boost-max');

    var spClients = {
        learning: undefined
    };

    var inputDimensions = getInputDimension();
    var columnDimensions = [2048];
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var chartWidth = 1900;
    var chartHeight = 120;
    var inputChart = new HTM.utils.chart.InputChart(
        '#boost-on-chart', '/static/data/hotgym-short.csv',
        chartWidth, chartHeight
    );

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var $connections = d3.select('#connections');
    var $potentialPool = d3.select('#potential-pool');
    // Colors
    var connectionCircleColor = '#1f04ff';

    // SP params we are not allowing user to change
    function getInputDimension() {
        var numBits = scalarN
            + dateEncoder.timeOfDayEncoder.getWidth()
            + dateEncoder.weekendEncoder.getWidth();
        return [numBits];
    }

    function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
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
        spClients.learning = new HTM.SpatialPoolerClient(false);
        inits.push(function(callback) {
            spClients.learning.initialize(spParams.getParams(), callback);
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

    function columnHighlighted(columnIndex) {
        var synapses = connectedSynapses[columnIndex];
        var pools = potentialPools[columnIndex];
        var boostFactor = boostFactors[columnIndex];
        var $input = d3.select('#input');
        var $overlapDisplay = $('#overlap-display');
        var $boostedOverlapDisplay = $('#boosted-overlap-display');
        var inputSdr = inputCache[inputCache.length - 1];

        // render the input space in the context of this column

        // Draw circles for connections.
        $connections.html('');
        var overlapCount = 0;
        _.each(synapses, function(i) {
            var rect = $input.select('#input-' + i);
            var inputRectSize = parseInt(rect.attr('width'));
            var x2 = parseInt(rect.attr('x')) + inputRectSize / 2;
            var y2 = parseInt(rect.attr('y')) + inputRectSize / 2;
            var circleColor = connectionCircleColor;
            if (inputSdr[i] == 1) {
                circleColor = 'limegreen';
                overlapCount++;
            } else {
                circleColor = 'grey';
            }
            $connections.append('circle')
                .attr('cx', x2)
                .attr('cy', y2)
                .attr('r', inputRectSize / 3)
                .style('fill', circleColor)
            ;
        });

        // Draw an semi-transparent mask over cells in the input space outside
        // the potential pool for this column.
        drawSdr(inputSdr, $potentialPool, 0, 0, 800, 800, function(d, i) {
            var inPool = (pools.indexOf(i) > -1);
            var color = '#FFF';
            var opacity = '0.35';
            if (inPool) {
                opacity = '0.0'
            }
            if (d == 0) {
                color = '#AAA';
            }
            return 'fill:' + color + ';fill-opacity:' + opacity;
        });


        $overlapDisplay.html(overlapCount);
        $boostedOverlapDisplay.html((overlapCount * boostFactor).toFixed(2));
        // Highlight this column in the AC SDR.
        var $activeColumns = $('#active-duty-cycles');
        $activeColumns.find('.highlighted').attr('class', '');
        $('#active-duty-cycles-' + columnIndex).attr('class', 'highlighted');

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
                .attr('id', function(d, i) {
                    return 'circle-' + i;
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
                        activeColumns,
                        activeDutyCycles,
                        boostFactors) {
        var dim = 800;
        var $input = d3.select('#input');
        drawSdr(
            inputEncoding, $input,
            0, 0, dim, dim, 'green'
        );
        var $activeDutyCycles = d3.select('#active-duty-cycles');
        var minActiveDutyCycle = _.min(activeDutyCycles);
        var maxActiveDutyCycle = _.max(activeDutyCycles);
        var normalizedActiveDutyCycles = _.map(activeDutyCycles, function(value) {
            return translate(value, minActiveDutyCycle, maxActiveDutyCycle);
        });
        drawSdr(
            normalizedActiveDutyCycles, $activeDutyCycles, 840, 0, dim, dim,
            function(d, i) {
                return 'fill: #' + getGreenToRed(d * 100);
            }, activeColumns
        );

        $adcMin.html(minActiveDutyCycle.toFixed(2));
        $adcMax.html(maxActiveDutyCycle.toFixed(2));

        var $boostFactors = d3.select('#boost-factors');
        var minBoostFactor = _.min(boostFactors);
        var maxBoostFactor = _.max(boostFactors);
        var normalizedBoostFactors = boostFactors;
        if (minBoostFactor != maxBoostFactor) {
            normalizedBoostFactors = _.map(boostFactors, function(value) {
                return translate(value, minBoostFactor, maxBoostFactor);
            });
        }
        drawSdr(
            normalizedBoostFactors, $boostFactors, 1700, 0, dim, dim,
            function(d, i) {
                return 'fill: #' + getGreenToRed(d * 100);
            }, activeColumns
        );

        $boostMin.html(minBoostFactor.toFixed(2));
        $boostMax.html(maxBoostFactor.toFixed(2));

        var $adcRects = $activeDutyCycles.selectAll('rect');
        $adcRects.on('mouseover', function(noop, columnIndex) {
            columnHighlighted(columnIndex);
        });
        $activeDutyCycles.selectAll('circle').on('mouseover', function(noop, columnIndex) {
            columnHighlighted(columnIndex);
        });

        $activeDutyCycles.on('mouseout', function() {
            $connections.html('');
            $potentialPool.html('');
        });

    }

    function runOnePointThroughSp(mainCallback) {
        var chart = inputChart;
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

        inputCache.push(encoding);

        _.each(spClients, function(client, name) {
            computes[name] = function(callback) {
                var learn = (name == 'learning');
                // We only fetch pools and masks once.
                var states = requestedStates.slice()
                if (potentialPools == undefined) {
                    states.push(HTM.SpSnapshots.POT_POOLS);
                    states.push(HTM.SpSnapshots.INH_MASKS);
                }
                spClients[name].compute(encoding, learn, states, callback);
            };
        });

        async.parallel(computes, function(error, response) {
            if (error) throw error;
            var state = response.learning.state;
            var learningAc = state.activeColumns;
            var activeDutyCycles = state.activeDutyCycles;
            boostFactors = state.boostFactors;
            connectedSynapses = state.connectedSynapses;
            potentialPools = state.potentialPools;
            inhibitionMasks = state.inhibitionMasks;

            var learningAcOverlaps = _.map(learningHistory.activeColumns, function(hist) {
                return SDR.tools.getOverlapScore(learningAc, hist);
            });

            inputChart.renderOverlapHistory(date, learningAcOverlaps, data);

            renderSdrs(encoding, learningAc, activeDutyCycles, boostFactors);

            learningHistory.inputEncoding[cursor] = encoding;
            learningHistory.activeColumns[cursor] = learningAc;
            if (mainCallback) mainCallback();
        });
    }

    function stepThroughData(callback) {
        if (!playing || inputChart.dataCursor == inputChart.data.length - 1) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(stepThroughData);
        inputChart.dataCursor++;
    }

    function addDataControlHandlers() {
        $('.player button').click(function() {
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
                inputChart.dataCursor++;
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

    function addBoostFactorButtonHandler() {
        $('.show-boost-factors').on('click', function() {
            $('#boost-factors').show();
        });
    }

    function setup() {
        initSp(function() {
            learningHistory = {
                inputEncoding: [],
                activeColumns: []
            };
            inputChart.render(function() {
                runOnePointThroughSp();
                inputChart.dataCursor++;
            });
        });
    }

    addDataControlHandlers();
    addBoostFactorButtonHandler();

    spParams.render(function() {
        setup();
    }, function() {
        setup();
    });

});
