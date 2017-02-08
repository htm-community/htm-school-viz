$(function() {

    var scalarN = 400;
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    var spClient;

    var inputSize = scalarN
        + dateEncoder.timeOfDayEncoder.getWidth()
        + dateEncoder.weekendEncoder.getWidth();

    // SP params we are not allowing user to change
    var inputDimensions = [inputSize];
    var columnDimensions = [2048];
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var showPerms = false;
    var showLines = true;
    var showInput = false;

    var spData;
    var locked = false;
    var clickedColumnIndex;

    // Colors
    var inputToColumnConnectionColor = '#A14B5F';
    var colToInputLineColor = '#6762ff';
    var connectionCircleColor = '#1f04ff';

    var permChartWidth = 300;
    var permChartHeight = 300;

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

    function initSp(callback) {
        spClient = new HTM.SpatialPoolerClient(false);
        loading(true);
        spClient.initialize(spParams.getParams(), function(err, resp) {
            loading(false);
            if (callback) callback(err, resp.state);
        });
    }

    function drawSdr(sdr, $el, x, y, width, height, style) {
        var bits = sdr.length;
        var area = width * height;
        var squareArea = area / bits;
        var fullRectSize = Math.floor(Math.sqrt(squareArea));
        var rectSize = fullRectSize - 1;
        var rowLength = Math.floor(width / fullRectSize);
        var idPrefix = $el.attr('id');

        $el.html('');

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
            .style('fill', function(d) {
                return (showInput && d == 1 ? 'steelblue' : '');
            })
        ;
        if (style) {
            $el.attr('style', style);
        } else {
            $el.style('fill', 'white');
        }
    }

    function draw() {
        var potentialPools = spData.potentialPools;
        var connectedSynapses = spData.connectedSynapses;
        var permanences = spData.permanences;
        var $input = d3.select('#input');
        var $columns = d3.select('#columns');
        var $connections = d3.select('#connections');
        var $inputConnections = d3.select('#input-connections');
        var inputSdr = SDR.tools.getRandom(inputSize, inputSize / 3);
        var columnSdr = SDR.tools.getEmpty(potentialPools.length);
        var $ppDisplay = $('#potential-pool-display');
        var $connectedDisplay = $('#connected-display');
        var $connectionThresholdDisplay = $('#connection-threshold-display');
        var $permanenceDisplay = $('#permanence-display');
        var $overlapDisplay = $('#overlap-display');

        drawSdr(inputSdr, $input, 0, 0, 1000, 1000);
        drawSdr(columnSdr, $columns, 1040, 0, 1000, 1000);

        $connectionThresholdDisplay.html(spParams.getParams()['synPermConnected']);

        var columnRects = $columns.selectAll('rect');

        var updateInputSpaceColors = function(columnIndex) {
            var inputRects = $input.selectAll('rect');
            inputRects.attr('class', '');
            var pool = potentialPools[columnIndex];
            var perms = permanences[columnIndex];
            if (showPerms) {
                _.each(perms, function(permanence, i) {
                    var rect = $input.select('#input-' + i);
                    rect.style('fill', '#' + getGreenToRed((1.0 - permanence) * 100));
                });
                inputRects.each(function() {
                    var rect = this;
                    var index = parseInt(rect.getAttribute('index'));
                    if (pool.indexOf(index) == -1) {
                        rect.setAttribute('style', 'fill:white');
                    }
                });
            } else {
                _.each(pool, function(i) {
                    var rect = $input.select('#input-' + i);
                    rect.attr('class', 'pool');
                });
            }
            $ppDisplay.html(pool.length);
            $connectedDisplay.html(connectedSynapses[columnIndex].length);
        };

        function drawConnectionsToInputSpace(columnIndex, columnRect) {
            var synapses = connectedSynapses[columnIndex];
            var colRectSize = parseInt(columnRect.getAttribute('width'));
            var x1 = parseInt(columnRect.getAttribute('x')) + colRectSize / 2;
            var y1 = parseInt(columnRect.getAttribute('y')) + colRectSize / 2;
            $connections.html('');
            var overlapCount = 0;
            _.each(synapses, function(i) {
                var rect = $input.select('#input-' + i);
                var inputRectSize = parseInt(rect.attr('width'));
                var x2 = parseInt(rect.attr('x')) + inputRectSize / 2;
                var y2 = parseInt(rect.attr('y')) + inputRectSize / 2;
                var permanence = permanences[columnIndex][i];
                var lineColor = colToInputLineColor;
                var circleColor = connectionCircleColor;
                if (showInput) {
                    if (inputSdr[i] == 1) {
                        circleColor = 'limegreen';
                        overlapCount++;
                    } else {
                        circleColor = 'grey';
                    }
                }
                if (showPerms) {
                    lineColor = '#' + getGreenToRed((1.0 - permanence) * 100);
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
            if (showInput) {
                $overlapDisplay.html(overlapCount);
            }
        }

        columnRects.on('mousemove', function(noop, columnIndex) {
            if (locked) return;
            if (! showInput) {
                updateInputSpaceColors(columnIndex);
            } else {
                drawConnectionsToInputSpace(columnIndex, this);
            }
        });

        $columns.on('mouseout', function() {
            if (locked) return;
            if (! showInput) {
                $input.selectAll('rect')
                    .attr('class', '')
                    .attr('style', '')
                ;
            }
            $connections.html('');
        });

        columnRects.on('click', function(noop, columnIndex) {
            if (! showInput) {
                updateInputSpaceColors(columnIndex);
            }
            drawConnectionsToInputSpace(columnIndex, this);
            lockColumn(columnIndex);
        });

        var showInputToColumnConnections = function(inputIndex) {
            var columnsConnectedTo = [];
            _.each(connectedSynapses, function(connections, columnIndex) {
                if (connections.indexOf(inputIndex) > -1) {
                    columnsConnectedTo.push(columnIndex);
                }
            });
            $inputConnections.html('');
            _.each(columnsConnectedTo, function(i) {
                var rect = $columns.select('#columns-' + i);
                var colRectSize = parseInt(rect.attr('width'));
                var x2 = parseInt(rect.attr('x')) + colRectSize / 2;
                var y2 = parseInt(rect.attr('y')) + colRectSize / 2;
                $inputConnections.append('circle')
                    .attr('cx', x2)
                    .attr('cy', y2)
                    .attr('r', colRectSize / 3)
                    .attr('fill', inputToColumnConnectionColor)
                ;
            });
        };

        $input.selectAll('rect').on('mousemove', function() {
            var inputIndex = parseInt(this.getAttribute('index'));
            if (clickedColumnIndex != undefined) {
                var perm = permanences[clickedColumnIndex][inputIndex];
                $permanenceDisplay.html(perm);
                renderPermenanceGraphic(perm, spParams.getParams()['synPermConnected']);
            } else {
                showInputToColumnConnections(inputIndex);
            }
        });

        $input.selectAll('rect').on('click', function() {
            var inputIndex = parseInt(this.getAttribute('index'));
            showInputToColumnConnections(inputIndex);
        });

        $input.on('mouseout', function() {
            $inputConnections.html('');
        });
    }

    function lockColumn(index) {
        locked = true;
        clickedColumnIndex = index;
        d3.select('#columns')
            .select('#columns-' + clickedColumnIndex)
            .attr('class', 'clicked');
    }

    function unlockColumn() {
        locked = false;
        clickedColumnIndex = undefined;
        $('rect.clicked').attr('class', '');
        $('#permanence-threshold').html('');
    }

    function renderPermenanceGraphic(permanence, threshold) {
        var margin = {top: 20, right: 20, bottom: 0, left: 50},
            width = permChartWidth - margin.left - margin.right,
            height = permChartHeight - margin.top - margin.bottom;
        var y = d3.scale.linear()
            .domain([0.0, 1.0])
            .range([height, 0]);
        var yAxis = d3.svg.axis().scale(y).orient('left');
        var translatedThreshold = y(threshold);
        var color = getGreenToRed((1.0 - permanence) * 100);

        var svg = d3.select("#permanence-threshold")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        svg.html('');

        var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        g.attr('width', width);
        g.attr('height', height);

        g.append('g')
            .call(yAxis)
        ;

        // Permanence bar.
        g.append('g')
            .append('rect')
            .style('fill', '#' + color)
            .attr('x', 100)
            .attr('y', y(permanence))
            .attr('width', 50)
            .attr('height', y(0));

        // Threshold line.
        g.append('g')
            .append('line')
            .style('stroke', 'black')
            .style('stroke-width', '5')
            .attr('x1', 10)
            .attr('y1', translatedThreshold)
            .attr('x2', width - 10)
            .attr('y2', translatedThreshold)
        ;

    }

    function initUi() {
        var $showPerms = $('#show-perms').bootstrapSwitch({state: showPerms});
        $showPerms.on('switchChange.bootstrapSwitch', function(event, state) {
            showPerms = state;
            draw()
        });
        var $showLines = $('#show-lines').bootstrapSwitch({state: showLines});
        $showLines.on('switchChange.bootstrapSwitch', function(event, state) {
            showLines = state;
            draw()
        });
        var $showInput = $('#show-input').bootstrapSwitch({state: showInput});
        $showInput.on('switchChange.bootstrapSwitch', function(event, state) {
            showInput = state;
            draw()
        });
    }


    function paramChange() {
        initSp(function(err, r) {
            if (err) throw err;
            spData = r;
            draw()
        });
    }

    initUi();
    spParams.render(paramChange, paramChange);

    $(document).keyup(function(e) {
        if (e.keyCode === 27) {
            unlockColumn();
        }
    });

});
