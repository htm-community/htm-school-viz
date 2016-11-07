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

    var save = [
        HTM.SpSnapshots.ACT_COL,
        HTM.SpSnapshots.PERMS
    ];
    save = false;

    var leftHistory = {
        inputEncoding: [],
        activeColumns: []
    };
    var rightHistory = {
        activeColumns: []
    };

    // Object keyed by SP type / column index / snapshot type. Contains an array
    // at this point with iteration data.
    var connectionCache = {
        left: {},
        right: {}
    };
    var inputCache = [];
    var selectedColumn = undefined;
    var selectedColumnType = undefined;

    var encodeWeekends = shouldEncodeWeekends();
    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');

    var spClients = {
        left: undefined,
        right: undefined
    };

    var inputDimensions = getInputDimension();
    var columnDimensions = [2048];
    var leftSpParams = new HTM.utils.sp.Params(
        '', inputDimensions, columnDimensions
    );
    var rightSpParams = new HTM.utils.sp.Params(
        '', inputDimensions, columnDimensions
    );

    // EXPERIMENTS WITH DIFFERENT PARAMS
    rightSpParams.setParam('stimulusThreshold', 27);
    //rightSpParams.setParam("maxBoost", 2);
    //leftSpParams.setParam("maxBoost", 10);

    var chartWidth = 1900;
    var chartHeight = 120;
    var leftChart = new HTM.utils.chart.InputChart(
        '#left-chart', '/static/data/hotgym-short.csv',
        chartWidth, chartHeight
    );
    var rightChart = new HTM.utils.chart.InputChart(
        '#right-chart', '/static/data/hotgym-short.csv',
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
        var bits = scalarN + dateEncoder.timeOfDayEncoder.getWidth();
        if (encodeWeekends) {
            bits += dateEncoder.weekendEncoder.getWidth()
        }
        return [bits];
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

    function shouldEncodeWeekends() {
        return getUrlParameter('weekends') == 'true';
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
        spClients.left = new HTM.SpatialPoolerClient(save);
        spClients.right = new HTM.SpatialPoolerClient(save);
        inits.push(function(callback) {
            spClients.left.initialize(leftSpParams.getParams(), callback);
        });
        inits.push(function(callback) {
            spClients.right.initialize(rightSpParams.getParams(), callback);
        });
        async.parallel(inits, function(err) {
            if (err) throw err;
            loading(false);
            if (mainCallback) mainCallback();
        });
    }

    function renderColumnConnections(iteration) {
        var width = 1000,
            height = 1000;
        var inputEncoding = inputCache[iteration];
        var bits = inputEncoding.length;
        var area = width * height;
        var squareArea = area / bits;
        var fullRectSize = Math.floor(Math.sqrt(squareArea));
        var rectSize = fullRectSize - 1;
        var rowLength = Math.floor(width / fullRectSize);
        var circleColor = '#6762ff';
        var columnHist = connectionCache[selectedColumnType][selectedColumn];
        var permanences = columnHist.permanences[iteration];
        var activeColumns = columnHist.activeColumns;
        var threshold = leftSpParams.getParams().synPermConnected;
        var connections = [];
        var $selectedColumnDisplay = $('#selected-column-display');
        var $selectedColumnRect = $('#selected-column-rect');
        var $selectedColumnIter = $('#selected-column-iteration');

        $selectedColumnDisplay.html(selectedColumn);
        $selectedColumnIter.html(iteration);
        var selectedColumnActive = activeColumns[iteration] == 1;

        if (selectedColumnActive) {
            $selectedColumnRect.addClass('on');
        } else {
            $selectedColumnRect.removeClass('on');
        }

        _.each(permanences, function(perm, index) {
            if (perm >= threshold) {
                connections.push(index);
            }
        });

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
                var permanence = permanences[i] * 100;
                var stroke = '#' + getGreenToRed(100 - permanence);
                var strokeWidth = 1;
                return 'stroke:' + stroke + ';'
                    + 'fill:' + fill + ';'
                    + 'stroke-width:' + strokeWidth + ';';
            })
        ;
        d3.select('#col-connections-svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .selectAll('circle')
            .data(connections)
            .enter()
            .append('circle')
            .attr('r', rectSize / 3)
            .attr('cx', function (d) {
                var offset = d % rowLength;
                return offset * fullRectSize + rectSize / 2;
            })
            .attr('cy', function (d) {
                var offset = Math.floor(d / rowLength);
                return offset * fullRectSize + rectSize / 2;
            })
            .attr('index', function (d, i) {
                return d;
            })
            .attr('style', 'fill:' + circleColor + ';stroke:' + circleColor)
        ;

    }

    function drawSdr(sdr, $el, x, y, width, height, style) {
        var bits = sdr.length;
        var area = width * height;
        var squareArea = area / bits;
        var fullRectSize = Math.floor(Math.sqrt(squareArea));
        var rectSize = fullRectSize - 1;
        var rowLength = Math.floor(width / fullRectSize);
        var idPrefix = $el.attr('id');
        var onColor = 'steelblue';

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
    }

    function renderSdrs(inputEncoding,
                        leftAc,
                        rightAc,
                        iteration) {

        var dim = 800;
        var $input = d3.select('#input-encoding');
        drawSdr(
            inputEncoding, $input,
            0, 0, dim, dim, 'green'
        );
        var $left = d3.select('#left-columns');
        drawSdr(
            leftAc, $left,
            840, 0, dim, dim, 'orange'
        );
        var $right = d3.select('#right-columns');
        drawSdr(
            rightAc, $right,
            1700, 0, dim, dim, 'orange'
        );

        function drawConnectionsToInputSpace(columnIndex, type, rect) {
            var spClient = spClients[type];
            var $connections = d3.select('#connections');
            selectedColumn = columnIndex;
            selectedColumnType = type;

            function renderConnections() {
                $connections.html('');
                renderColumnConnections(iteration);
                createColumnSlider();
                $('#column-history').modal({show: true});
            }

            if (connectionCache[type][columnIndex] != undefined) {
                renderConnections();
            } else {
                loading(true);
                spClient.getColumnHistory(columnIndex, function(err, history) {
                    connectionCache[type][columnIndex] = history;
                    renderConnections(iteration);
                    loading(false);
                });
            }

        }

        $right.selectAll('rect').on('click', function(noop, columnIndex) {
            drawConnectionsToInputSpace(columnIndex, 'right', this);
        });
    }

    function runOnePointThroughSp(mainCallback) {
        var chart = leftChart;
        var cursor = chart.dataCursor;
        var data = chart.data;
        var point = data[cursor];
        var date = moment(point.date);
        var power = parseFloat(point['consumption']);
        var encoding = [];
        var noisyEncoding = [];
        var day = date.day();
        var isWeekend = (day == 6) || (day == 0);    // 6 = Saturday, 0 = Sunday
        var computes = {};

        // Update UI display of current data point.
        $powerDisplay.html(power);
        $todDisplay.html(date.format('h A'));
        if (encodeWeekends) {
            $weekendDisplay.html(isWeekend ? 'yes' : 'no');
        }

        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        if (encodeWeekends) {
            encoding = encoding.concat(dateEncoder.encodeWeekend(date));
        }

        noisyEncoding = SDR.tools.addNoise(encoding, noise);

        inputCache.push(noisyEncoding);

        _.each(spClients, function(client, name) {
            computes[name] = function(callback) {
                spClients[name].compute(noisyEncoding, {
                    learn: true
                }, callback)
            };
        });

        async.parallel(computes, function(error, response) {
            if (error) throw error;

            var leftAc = response.left.activeColumns;
            var rightAc = response.right.activeColumns;

            var leftAcOverlaps = _.map(leftHistory.activeColumns, function(hist) {
                return SDR.tools.getOverlapScore(leftAc, hist);
            });
            var rightAcOverlaps = _.map(rightHistory.activeColumns, function(hist) {
                return SDR.tools.getOverlapScore(rightAc, hist);
            });

            leftChart.renderOverlapHistory(date, leftAcOverlaps, data);
            rightChart.renderOverlapHistory(date, rightAcOverlaps, data);

            renderSdrs(
                noisyEncoding,
                leftAc,
                rightAc,
                cursor
            );

            leftHistory.inputEncoding[cursor] = encoding;
            leftHistory.activeColumns[cursor] = leftAc;
            rightHistory.activeColumns[cursor] = rightAc;
            if (mainCallback) mainCallback();
        });
    }

    function stepThroughData(callback) {
        if (!playing || leftChart.dataCursor == leftChart.data.length - 1) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(stepThroughData);
        leftChart.dataCursor++;
        rightChart.dataCursor++;
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
                leftChart.dataCursor++;
                rightChart.dataCursor++;
            }
        });
    }

    function createColumnSlider() {
        var $colHistSlider = $('#column-history-slider');
        $colHistSlider.slider({
            min: 0,
            max: leftChart.dataCursor - 1,
            value: leftChart.dataCursor - 1,
            step: 1,
            slide: function(event, ui) {
                renderColumnConnections(ui.value);
            }
        });
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

    initSp(function() {
        leftChart.render(function() {
            rightChart.render(function() {
                addDataControlHandlers();
                runOnePointThroughSp();
                leftChart.dataCursor++;
                rightChart.dataCursor++;
            });
        });
    });

});
