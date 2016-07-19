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

    var spData;
    var locked = false;
    var clickedColumnIndex;

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
        spClient = new HTM.SpatialPoolerClient();
        loading(true);
        spClient.initialize(spParams.getParams(), {
            detailed: true
        }, function(resp) {
            loading(false);
            if (callback) callback(resp);
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
        var inputSdr = SDR.tools.getEmpty(inputSize);
        var columnSdr = SDR.tools.getEmpty(permanences.length);
        var $ppDisplay = $('#potential-pool-display');
        var $connectedDisplay = $('#connected-display');
        var $connectionThresholdDisplay = $('#connection-threshold-display');
        var $permanenceDisplay = $('#permanence-display');

        drawSdr(columnSdr, $columns, 1040, 0, 1000, 1000);
        drawSdr(inputSdr, $input, 0, 0, 1000, 1000);

        $connectionThresholdDisplay.html(spParams.getParams()['synPermConnected']);

        var columnRects = $columns.selectAll('rect');

        var updateInputSpace = function(columnIndex) {
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

        columnRects.on('mousemove', function(noop, columnIndex) {
            if (locked) return;
            updateInputSpace(columnIndex);
        });

        $columns.on('mouseout', function() {
            if (locked) return;
            $input.selectAll('rect')
                .attr('class', '')
                .attr('style', '')
            ;
            $connections.html('');
        });

        columnRects.on('click', function(noop, columnIndex) {
            var synapses = connectedSynapses[columnIndex];
            var colRectSize = parseInt(this.getAttribute('width'));
            var x1 = parseInt(this.getAttribute('x')) + colRectSize / 2;
            var y1 = parseInt(this.getAttribute('y')) + colRectSize / 2;
            updateInputSpace(columnIndex);
            $connections.html('');
            $columns.select('#columns-' + columnIndex).attr('class', 'clicked');
            _.each(synapses, function(i) {
                var rect = $input.select('#input-' + i);
                var inputRectSize = parseInt(rect.attr('width'));
                var x2 = parseInt(rect.attr('x')) + inputRectSize / 2;
                var y2 = parseInt(rect.attr('y')) + inputRectSize / 2;
                var permanence = permanences[columnIndex][i];
                var lineColor = '#6762ff';
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
                ;
            });
            lockColumn(columnIndex);
        });

        $input.selectAll('rect').on('mousemove', function() {
            var inputIndex = parseInt(this.getAttribute('index'));
            var perm = permanences[clickedColumnIndex][inputIndex];
            $permanenceDisplay.html(perm);
            renderPermenanceGraphic(perm, spParams.getParams()['synPermConnected']);
        });
    }

    function lockColumn(index) {
        if (locked) {
            unlockColumn();
        } else {
            locked = true;
            clickedColumnIndex = index;
        }
    }

    function unlockColumn() {
        locked = false;
        $('rect.clicked').attr('class', '');
    }

    function renderPermenanceGraphic(permanence, threshold) {
        var margin = {top: 20, right: 20, bottom: 0, left: 50},
            width = 300 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;
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
    }


    function paramChange() {
        initSp(function(r) {
            spData = r;
            draw()
        });
    }

    initUi();
    spParams.render(paramChange, paramChange);

});
