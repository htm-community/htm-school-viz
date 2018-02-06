$(function() {

    var gifPath = undefined;
    var gifData = undefined;
    var currentFrame = 0;
    var framesSeen = 0;

    var save = [
        HTM.SpSnapshots.ACT_COL,
        HTM.SpSnapshots.POT_POOLS,
        HTM.SpSnapshots.INH_MASKS,
        HTM.SpSnapshots.CON_SYN
    ];
    var history = {
        input: [],
        activeColumns: []
    };

    // Object keyed by SP type / column index / snapshot type. Contains an array
    // at this point with iteration data.
    var connectionCache = {};
    var selectedColumn = undefined;
    var lastShownConnections = [];
    var lastShownIteration = undefined;

    var spClient;

    var inputDimensions = undefined;
    var columnDimensions = undefined;
    var spParams = undefined;

    var paused = false;
    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;
    var showLines = false;

    var wrapAround = false;
    var restrictColumnDimensions = true;

    var spData;

    // Colors
    var colToInputLineColor = '#6762ff';
    var connectionCircleColor = '#1f04ff';


    var $colHistSlider = $('#column-history-slider');
    var $jumpPrevAc = $('#jumpto-prev-ac');
    var $jumpNextAc = $('#jumpto-next-ac');
    var $adcMin = $('#adc-min');
    var $adcMax = $('#adc-max');
    var $boostMin = $('#boost-min');
    var $boostMax = $('#boost-max');

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

    function translate(x, min, max) {
        var range = max - min;
        return (x - min) / range;
    }

    function renderColumnState(iteration) {
        var width = 1000,
            height = 1000;
        var inputEncoding = history.input[iteration];
        var bitsWide = gifData.dimensions[0];
        var bitsTall = gifData.dimensions[1];
        //var biggestDim = Math.max(bitsWide, bitsTall);
        //var area = width * height;
        //var squareArea = area / biggestDim;
        var fullRectSize = Math.floor(Math.max(width, height) / Math.max(bitsWide, bitsTall));
        var strokeWidth = 1;
        var rectSize = fullRectSize - strokeWidth;
        var rowLength = bitsWide;
        var circleColor = '#6762ff';
        var columnHist = connectionCache[selectedColumn];
        var perms = columnHist.permanences[iteration];
        var activeColumns = columnHist.activeColumns;
        var threshold = spParams.getParams().synPermConnected;
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
        _.each(perms, function(perm, index) {
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

    function drawSdr(sdr, $el, x, y, width, height, style, rowLength, circles) {
        var bits = sdr.length;
        var area = width * height;
        var squareArea = area / bits;
        var fullRectSize = Math.floor(Math.sqrt(squareArea));
        var rectSize = fullRectSize - 1;
        var rowLength = rowLength || Math.floor(width / fullRectSize);
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

    // SP params we are not allowing user to change
    function getInputDimension() {
        //var numBits = gifData.dimensions[0] * gifData.dimensions[1];
        //console.log("Total length of input encoding: %s", numBits);
        return [gifData.dimensions[0], gifData.dimensions[1]];
    }

    function getColumnDimensions() {
        var dim = [inputDimensions[0], inputDimensions[1]];
        if (restrictColumnDimensions && _.max(inputDimensions) > 32) {
            dim = [inputDimensions[0] / 2, inputDimensions[1] / 2];
        }
        return dim;
    }

    function loadGifJson(path, callback) {
        $.getJSON(path, function(data) {
            gifData = data;
            inputDimensions = getInputDimension();
            columnDimensions = getColumnDimensions();
            spParams = new HTM.utils.sp.Params(
                '', inputDimensions, columnDimensions
            );
            callback();
        });
    }

    function renderSdrs(inputEncoding,
                        activeColumns,
                        activeDutyCycles,
                        boostFactors) {
        var potentialPools = spData.potentialPools;
        var connectedSynapses = spData.connectedSynapses;
        var $input = d3.select('#input-encoding');
        var $connections = d3.select('#connections');
        var $potentialPool = d3.select('#potential-pool-overlay');
        var $columns = d3.select('#active-columns');
        var dim = 800;

        drawSdr(
            inputEncoding, $input,
            0, 0, dim, dim, 'green', inputDimensions[0]
        );

        var $activeDutyCycles = $columns;
        var minActiveDutyCycle = _.min(activeDutyCycles);
        var maxActiveDutyCycle = _.max(activeDutyCycles);
        var normalizedActiveDutyCycles = _.map(activeDutyCycles, function(value) {
            return translate(value, minActiveDutyCycle, maxActiveDutyCycle);
        });
        drawSdr(
            normalizedActiveDutyCycles, $activeDutyCycles,
            820, 0, dim, dim, function(d, i) {
                return 'fill: #' + getGreenToRed(d * 100);
            }, columnDimensions[0], activeColumns
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
            }, columnDimensions[0], activeColumns
        );

        $boostMin.html(minBoostFactor.toFixed(2));
        $boostMax.html(maxBoostFactor.toFixed(2));

        var columnRects = $columns.selectAll('rect');

        var overlayPotentialPools = function(columnIndex) {
            var potentialPool = potentialPools[columnIndex];
            drawSdr(inputEncoding, $potentialPool, 0, 0, dim, dim, function(d, i) {
                var inPool = (potentialPool.indexOf(i) > -1);
                var color = '#000';
                var opacity = '0.1';
                if (d == 1) {
                    opacity = '0.5';
                }
                if (inPool) {
                    opacity = '0.0'
                }
                return 'fill:' + color + ';fill-opacity:' + opacity;
            }, inputDimensions[0]);

        };

        function drawConnectionsToInputSpace(columnIndex, columnRect) {
            var synapses = connectedSynapses[columnIndex];
            var colRectSize = parseInt(columnRect.getAttribute('width'));
            var x1 = parseInt(columnRect.getAttribute('x')) + colRectSize / 2;
            var y1 = parseInt(columnRect.getAttribute('y')) + colRectSize / 2;
            $connections.html('');
            var overlapCount = 0;
            _.each(synapses, function(i) {
                var rect = $input.select('#input-encoding-' + i);
                var inputRectSize = parseInt(rect.attr('width'));
                var x2 = parseInt(rect.attr('x')) + inputRectSize / 2;
                var y2 = parseInt(rect.attr('y')) + inputRectSize / 2;
                var lineColor = colToInputLineColor;
                var circleColor = connectionCircleColor;
                if (inputEncoding[i] == 1) {
                    circleColor = 'limegreen';
                    overlapCount++;
                } else {
                    circleColor = 'grey';
                }
                if (showLines) {
                    $connections.append('line')
                        .style('stroke', lineColor)
                        .attr('x1', x1)
                        .attr('y1', y1)
                        .attr('x2', x2)
                        .attr('y2', y2)
                    ;
                }
                $connections.append('circle')
                    .attr('cx', x2)
                    .attr('cy', y2)
                    .attr('r', inputRectSize / 3)
                    .style('fill', circleColor)
                ;
            });
        }

        function showColumnHistory(columnIndex) {
            var $connections = d3.select('#connections');
            selectedColumn = columnIndex;

            // Resets any cached connections remaining from previous displays.
            lastShownConnections = [];
            function renderConnections() {
                $connections.html('');
                renderColumnState(0);
                createColumnSlider();
                $('#column-history').modal({show: true});
            }

            if (connectionCache[columnIndex] != undefined) {
                renderConnections();
            } else {
                loading(true);
                spClient.getColumnHistory(columnIndex, function(err, history) {
                    connectionCache[columnIndex] = history;
                    renderConnections(0);
                    loading(false);
                });
            }

        }

        columnRects.on('click', function(noop, columnIndex) {
            showColumnHistory(columnIndex);
        });

        columnRects.on('mousemove', function(noop, columnIndex) {
            overlayPotentialPools(columnIndex);
            drawConnectionsToInputSpace(columnIndex, this);
        });

        $columns.on('mouseout', function() {
            $potentialPool.html('');
            $connections.html('');
        });

    }

    function sendSpData(data, mainCallback) {
        var encoding = data;
        if (SDR.tools.population(data) > data.length *.9) {
            encoding = SDR.tools.invert(data);
        }
        spClient.compute(encoding, {
            learn: true,
            getActiveDutyCycles: true,
            getBoostFactors: true
        }, function(err, response) {
            if (err) throw err;
            framesSeen++;
            var activeColumns = response.activeColumns;
            $('#num-active-columns').html(SDR.tools.population(activeColumns));
            renderSdrs(
                encoding,
                activeColumns,
                response.activeDutyCycles,
                response.boostFactors
            );
            history.input.push(encoding);
            history.activeColumns.push(activeColumns);
            if (mainCallback) mainCallback();
        });
    }

    function addColumnHistoryJumpButtonHandlers() {
        $('#ac-jump').click(function(event) {
            var id = event.target.getAttribute('id');
            var columnHist = connectionCache[selectedColumn];
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
            console.log('jumping from %s to %s', lastShownIteration, jumpTo);
            $colHistSlider.slider('value', jumpTo);
            if (activeColumns[jumpTo] != 1) {
                throw new Error("why you jumping there bro?");
            }
            renderColumnState(jumpTo);
        });
    }

    function createColumnSlider() {
        $colHistSlider.slider({
            min: 0,
            max: framesSeen - 1,
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

    function addDataControlHandlers() {
        $('.player button').click(function(evt) {
            var $btn = $(this);
            if (this.id == 'play') {
                if ($btn.hasClass('btn-success')) {
                    play();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-pause');
                } else {
                    pause();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-play');
                }
                $btn.toggleClass('btn-success');
            } else if (this.id == 'next') {
                runCurrentFrame();
                paused = true;
            }
        });
    }

    function nextFrame() {
        currentFrame++;
        if (currentFrame == gifData.dimensions[2]) {
            currentFrame = 0;
        }
    }

    function runCurrentFrame() {
        sendSpData(gifData.data[currentFrame], function() {
            if (! paused) {
                runCurrentFrame();
            }
        });
        // After running, loop back if necessary.
        nextFrame()
    }

    function play() {
        paused = false;
        if (currentFrame == undefined) {
            currentFrame = 0;
        }
        runCurrentFrame()
    }

    function pause() {
        paused = true;
    }

    function initSp(mainCallback) {
        loading(true);
        // This might be an interested view to show boosting in action.
        //learnSpParams.setParam("maxBoost", 2);
        spClient = new HTM.SpatialPoolerClient(save);

        // Custom stuff for topology
        spParams.setParam('globalInhibition', false);
        spParams.setParam('potentialRadius', Math.floor(inputDimensions[0] / 4));
        spParams.setParam('localAreaDensity', 0.1);
        spParams.setParam('numActiveColumnsPerInhArea', 1);
        spParams.setParam('wrapAround', wrapAround);
        spParams.setParam('maxBoost', 2);
        //spParams.setParam('stimulusThreshold', 10.0);

        spClient.initialize(spParams.getParams(), function(err, resp) {
            loading(false);
            if (mainCallback) mainCallback(err, resp);
        });
    }

    function loadGifList() {
        $.getJSON("/_giflist", function(resp) {
            var $giflist = $('#choose-gif');
            _.each(resp.gifs, function(gifData) {
                var path = gifData.path;
                var dimensions = gifData.dimensions;
                var name = path.split('/').pop().split('.').shift();
                var $li = $('<li>');
                var $btn = $('<button>');
                var $dim = $('<code>');
                $btn.html(name);
                $btn.addClass('btn btn-default btn-primary');
                $btn.data('gif', path);
                $dim.addClass('dim');
                $dim.html('(' + dimensions.join(' x ') + ')');
                $li.append($btn);
                $li.append($dim);
                $giflist.append($li);
                $btn.click(function() {
                    var chosen = $(this).data('gif');
                    gifPath = chosen;
                    $giflist.remove();
                    gifChosen();
                });
            });
        });
    }

    function gifChosen() {
        loadGifJson(gifPath, function() {
            initSp(function(err, r) {
                if (err) throw err;
                spData = r;
                addDataControlHandlers();
            });
        });
    }

    addColumnHistoryJumpButtonHandlers();
    decideWhetherToSave();

    loadGifList();

});
