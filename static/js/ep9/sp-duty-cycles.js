$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    var playing = false;
    var noise = 0.0;
    var snapsToSave = [
        HTM.SpSnapshots.ACT_COL,
        HTM.SpSnapshots.PERMS
    ];
    var save = snapsToSave;

    var learningHistory = {
        inputEncoding: [],
        activeColumns: []
    };

    // Object keyed by SP type / column index / snapshot type. Contains an array
    // at this point with iteration data.
    var connectionCache = {
        learning: {}
    };
    var inputCache = [];
    var selectedColumn = undefined;
    var selectedColumnType = undefined;
    var lastShownConnections = [];
    var lastShownIteration = undefined;

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');

    var spClients = {
        learning: undefined
    };

    var inputDimensions = getInputDimension();
    var columnDimensions = [2048];
    var learningSpParams = new HTM.utils.sp.Params(
        '', inputDimensions, columnDimensions
    );

    var chartWidth = 1900;
    var chartHeight = 120;
    var learningChart = new HTM.utils.chart.InputChart(
        '#learning-chart', '/static/data/hotgym-short.csv',
        chartWidth, chartHeight
    );

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var $colHistSlider = $('#column-history-slider');
    var $jumpPrevAc = $('#jumpto-prev-ac');
    var $jumpNextAc = $('#jumpto-next-ac');

    // SP params we are not allowing user to change
    function getInputDimension() {
        var numBits = scalarN + dateEncoder.timeOfDayEncoder.getWidth();
        return [numBits];
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
        // This might be an interested view to show boosting in action.
        learningSpParams.setParam("maxBoost", 2);
        spClients.learning = new HTM.SpatialPoolerClient(save);
        inits.push(function(callback) {
            spClients.learning.initialize(learningSpParams.getParams(), callback);
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

    function renderColumnState(iteration) {
        var width = 1000,
            height = 1000;
        var inputEncoding = inputCache[iteration];
        var bits = inputEncoding.length;
        var area = width * height;
        var squareArea = area / bits;
        var fullRectSize = Math.floor(Math.sqrt(squareArea));
        var strokeWidth = 1;
        var rectSize = fullRectSize - strokeWidth;
        var rowLength = Math.floor(width / fullRectSize);
        var circleColor = '#6762ff';
        var columnHist = connectionCache[selectedColumnType][selectedColumn];
        var permanences = columnHist.permanences[iteration];
        var activeColumns = columnHist.activeColumns;
        var threshold = learningSpParams.getParams().synPermConnected;
        var connections = [];
        var newlyConnectedCount = 0;
        var disconnectedCount = 0;
        var annotatedConnections = [];
        var overlap = 0;
        var $selectedColumnDisplay = $('#selected-column-display');
        var $selectedColumnRect = $('#selected-column-rect');
        var $selectedColumnIter = $('#selected-column-iteration');
        var $selectedColumnOverlap = $('#selected-column-overlap');
        var $newlyConnectedCount = $('#new-connected');
        var $disconnectedCount = $('#disconnected');

        $selectedColumnDisplay.html(selectedColumn);
        $selectedColumnIter.html(iteration);
        var selectedColumnActive = activeColumns[iteration] == 1;

        if (selectedColumnActive) {
            $selectedColumnRect.addClass('on');
        } else {
            $selectedColumnRect.removeClass('on');
        }

        // Computes connections based on the permanences.
        _.each(permanences, function(perm, index) {
            if (perm >= threshold) {
                connections.push(index);
            }
        });

        // Calculate overlap of connections and input encoding bits
        _.each(connections, function(connectionIndex) {
            if (inputEncoding[connectionIndex] == 1) {
                overlap++;
            }
        });

        $selectedColumnOverlap.html(overlap);

        // This prevents the "new" and "gone" connections from displaying when
        // moving backwards in time, which is confusing on the UI.
        if (lastShownIteration && lastShownIteration > iteration) {
            lastShownConnections = [];
        }
        // Add info about new and gone connections.
        _.each(connections, function(con) {
            var isNew = lastShownConnections.length > 0
                && lastShownConnections.indexOf(con) == -1;
            annotatedConnections.push({
                index: con, isNew: isNew
            });
            if (isNew) newlyConnectedCount++;
        });
        _.each(lastShownConnections, function(con) {
            var isGone = connections.indexOf(con) == -1;
            if (isGone) {
                disconnectedCount++;
                annotatedConnections.push({
                    index: con, isGone: true
                });
            }
        });

        $newlyConnectedCount.html(newlyConnectedCount);
        $disconnectedCount.html(disconnectedCount);

        d3.select('#col-connections-svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .selectAll('rect')
            .data(inputEncoding)
            .enter()
            .append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('x', function (d, i) {
                var offset = i % rowLength;
                return offset * fullRectSize;
            })
            .attr('y', function (d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * fullRectSize;
            })
            .attr('index', function (d, i) {
                return i;
            })
            .attr('style', function (d, i) {
                var fill = ( d == 1 ? '#CCC' : 'white');
                return 'fill:' + fill + ';'
                    + 'stroke: #AAA;'
                    + 'stroke-width:' + strokeWidth + ';';
            })
        ;

        d3.select('#col-connections-svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .selectAll('circle')
            .data(annotatedConnections)
            .enter()
            .append('circle')
            .attr('r', rectSize / 3)
            .attr('cx', function (d) {
                var offset = d.index % rowLength;
                return offset * fullRectSize + rectSize / 2;
            })
            .attr('cy', function (d) {
                var offset = Math.floor(d.index / rowLength);
                return offset * fullRectSize + rectSize / 2;
            })
            .attr('index', function (d) {
                return d.index;
            })
            .attr('style', function(d) {
                var color = circleColor;
                var strokeColor = circleColor;
                var opacity = '1.0';
                if (d.isNew) {
                    color = 'cyan';
                } else if (d.isGone) {
                    strokeColor = 'red';
                    opacity = '0.0';
                }
                return 'fill:' + color + ';' +
                    'stroke:' + strokeColor + ';' +
                    'stroke-width:3;' +
                    'fill-opacity:' + opacity + ';';
            })
        ;

        // Adjust the jump to buttons to be disabled if can't navigate further
        if (iteration == 0 ||
            activeColumns.slice(0, iteration).indexOf(1) == -1) {
            $jumpPrevAc.attr('disabled', 'disabled');
        } else {
            $jumpPrevAc.removeAttr('disabled');
        }
        if (activeColumns.slice(iteration + 1).indexOf(1) == -1) {
            $jumpNextAc.attr('disabled', 'disabled');
        } else {
            $jumpNextAc.removeAttr('disabled');
        }

        lastShownConnections = connections;
        lastShownIteration = iteration;
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
        var circleColor = '#6762ff';

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
                .attr('r', rectSize / 6)
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
                    var strokeColor = circleColor;
                    var opacity = '1.0';
                    if (d == 0) {
                        opacity = '0.0';
                        strokeColor = 'rgba(0,0,0,0.0)';
                    }
                    return 'fill:' + color + ';' +
                        'stroke:' + strokeColor + ';' +
                        'stroke-width:3;' +
                        'fill-opacity:' + opacity + ';';
                })
            ;

        }
    }

    function renderSdrs(inputEncoding,
                        activeDutyCycles,
                        learningAc) {

        var dim = 800;
        var $input = d3.select('#input-encoding');
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
            }, learningAc
        );
        var $learning = d3.select('#learning-columns');
        drawSdr(
            learningAc, $learning,
            1700, 0, dim, dim, 'orange'
        );

        function drawConnectionsToInputSpace(columnIndex, type) {
            var spClient = spClients[type];
            var $connections = d3.select('#connections');
            selectedColumn = columnIndex;
            selectedColumnType = type;

            // Resets any cached connections remaining from previous displays.
            lastShownConnections = [];
            function renderConnections() {
                $connections.html('');
                renderColumnState(0);
                createColumnSlider();
                $('#column-history').modal({show: true});
            }

            if (connectionCache[type][columnIndex] != undefined) {
                renderConnections();
            } else {
                loading(true);
                spClient.getColumnHistory(columnIndex, function(err, history) {
                    connectionCache[type][columnIndex] = history;
                    renderConnections(0);
                    loading(false);
                });
            }

        }

        $learning.selectAll('rect').on('click', function(noop, columnIndex) {
            drawConnectionsToInputSpace(columnIndex, 'learning');
        });
        $activeDutyCycles.selectAll('rect').on('click', function(noop, columnIndex) {
            drawConnectionsToInputSpace(columnIndex, 'learning');
        });
    }

    function runOnePointThroughSp(mainCallback) {
        var chart = learningChart;
        var cursor = chart.dataCursor;
        var data = chart.data;
        var point = data[cursor];
        var date = moment(point.date);
        var power = parseFloat(point['consumption']);
        var encoding = [];
        var noisyEncoding = [];
        var computes = {};

        // Update UI display of current data point.
        $powerDisplay.html(power);
        $todDisplay.html(date.format('h A'));

        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));

        noisyEncoding = SDR.tools.addNoise(encoding, noise);

        inputCache.push(noisyEncoding);

        _.each(spClients, function(client, name) {
            computes[name] = function(callback) {
                spClients[name].compute(noisyEncoding, {
                    learn: (name == 'learning'),
                    getActiveDutyCycles: true,
                    getBoostFactors: true
                }, callback)
            };
        });

        async.parallel(computes, function(error, response) {
            if (error) throw error;

            var learningAc = response.learning.activeColumns;
            var activeDutyCycles = response.learning.activeDutyCycles;

            var learningAcOverlaps = _.map(learningHistory.activeColumns, function(hist) {
                return SDR.tools.getOverlapScore(learningAc, hist);
            });

            learningChart.renderOverlapHistory(date, learningAcOverlaps, data);

            renderSdrs(noisyEncoding, activeDutyCycles, learningAc);

            learningHistory.inputEncoding[cursor] = encoding;
            learningHistory.activeColumns[cursor] = learningAc;
            if (mainCallback) mainCallback();
        });
    }

    function stepThroughData(callback) {
        if (!playing || learningChart.dataCursor == learningChart.data.length - 1) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(stepThroughData);
        learningChart.dataCursor++;
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
                learningChart.dataCursor++;
            }
        });
    }

    function createColumnSlider() {
        $colHistSlider.slider({
            min: 0,
            max: learningChart.dataCursor - 1,
            value: 0,
            step: 1,
            slide: function(event, ui) {
                renderColumnState(ui.value);
            }
        });
    }

    function decideWhetherToSave() {
        var isTransient = getUrlParameter('transient') == 'true';
        if (isTransient) {
            save = false;
        }
    }

    function createNoiseSlider() {
        var $noiseSlider = $('#noise-slider');
        var $noiseDisplay = $('#noise-display');
        $noiseDisplay.html(noise);
        $noiseSlider.slider({
            min: 0.0,
            max: 1.0,
            value: noise,
            step: 0.01,
            slide: function(event, ui) {
                noise = ui.value;
                $noiseDisplay.html(noise);
            }
        });
    }

    function addColumnHistoryJumpButtonHandlers() {
        $('#ac-jump').click(function(event) {
            var id = event.target.getAttribute('id');
            var columnHist = connectionCache[selectedColumnType][selectedColumn];
            var activeColumns = columnHist.activeColumns;
            var jumpTo = undefined;
            var historySlice = undefined;
            if (id == 'jumpto-prev-ac') {
                historySlice = activeColumns.slice(0, lastShownIteration);
                jumpTo = historySlice.lastIndexOf(1);

            } else {
                historySlice = activeColumns.slice(lastShownIteration + 1);
                jumpTo = lastShownIteration + historySlice.indexOf(1) + 1;
            }
            $colHistSlider.slider('value', jumpTo);
            if (activeColumns[jumpTo] != 1) {
                throw new Error("why you jumping there bro?");
            }
            renderColumnState(jumpTo);
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

    createNoiseSlider();
    addColumnHistoryJumpButtonHandlers();
    decideWhetherToSave();

    initSp(function() {
        learningChart.render(function() {
            learningChart.render(function() {
                addDataControlHandlers();
                runOnePointThroughSp();
                learningChart.dataCursor++;
            });
        });
    });

});
