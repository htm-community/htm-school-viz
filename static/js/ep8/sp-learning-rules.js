$(function() {

    var scalarN = 400;
    var inputW = 27;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
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
    var maxActiveColumns = undefined;

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var showInput = true;

    var spState;
    var locked = false;
    var clickedColumnIndex;
    var rankedColumns = [];

    var $connections = d3.select('#connections');
    var $potentialPool = d3.select('#potential-pool');

    // Colors
    var connectionCircleColor = '#1f04ff';

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
            if (callback) callback(err, resp);
        });
    }

    function getInputSdr() {
        var encoding = [];
        var date = moment();
        encoding = encoding.concat(scalarEncoder.encode(20.4));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        encoding = encoding.concat(dateEncoder.encodeWeekend(date));
        return encoding;
    }

    function renderColumnCompetition(allColumns) {
        // Operate on a local slice of columns.
        var columns = allColumns.slice();
        var $container = $('#column-winners');
        var max = _.max(_.map(columns, function(col) {
            return col.overlap;
        }));
        $container.html('');
        _.each(columns, function(col, i) {
            var overlap = col.overlap;
            var percent = overlap / max * 100;
            var clazz = 'progress';
            if (i < maxActiveColumns) {
                clazz += ' match';
            }
            var html = '<div class="' + clazz + '" data-column="' + col.index + '">' +
                    '<div class="progress-bar" role="progressbar" ' +
                        'style="width: ' + percent + '%;">' + overlap
                    + '</div>'
                + '</div>';
            $container.append(html);
        });
        // Highlight column on mouseover competition
        $container.find('.progress').on('mouseover', function() {
            if (locked) return;
            var index = $(this).data('column');
            columnHighlighted(index);
        });
        $container.find('.progress').click(function() {
            var index = $(this).data('column');
            lockColumn(index);
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
        var styleFn = undefined;

        if (style != undefined) {
            styleFn = style;
        } else {
            styleFn = function(d, i) {
                return 'fill:' + (d == 1 ? 'steelblue' : '');
            };
        }
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
            .attr('style', styleFn)
        ;
    }

    function columnHighlighted(columnIndex) {
        var synapses = spState.connectedSynapses[columnIndex];
        var potentialPool = spState.potentialPools[columnIndex];
        var $input = d3.select('#input');
        var $overlapDisplay = $('#overlap-display');
        var inputSdr = getInputSdr();

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
        drawSdr(inputSdr, $potentialPool, 0, 0, 1000, 1000, function(d, i) {
            var inPool = (potentialPool.indexOf(i) > -1);
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
        // Highlight this column in the AC SDR.
        var $activeColumns = $('#columns');
        $activeColumns.find('.highlighted').attr('class', '');
        $('#columns-' + columnIndex).attr('class', 'highlighted');

        // Highlight this column in the stack rank.
        var $columnWinners = $('#column-winners');
        $columnWinners.find('.highlighted').removeClass('highlighted');
        $columnWinners.find('[data-column=' + columnIndex + ']').addClass('highlighted');
    }

    function draw() {
        var $input = d3.select('#input');
        var $columns = d3.select('#columns');
        var $connections = d3.select('#connections');
        var inputSdr = getInputSdr();
        var columnSdr = SDR.tools.getEmpty(spState.permanences.length);

        // Stack rank each column based on overlap of connections with input
        // space.
        _.each(spState.connectedSynapses, function(synapses, index) {
            var overlapCount = 0;
            _.each(synapses, function(i) {
                if (inputSdr[i] == 1) {
                    overlapCount++;
                }
            });
            rankedColumns.push({
                index: index,
                overlap: overlapCount
            });
        });
        rankedColumns = _.sortBy(rankedColumns, function(it) {
            return it.overlap;
        }).reverse();

        drawSdr(inputSdr, $input, 0, 0, 1000, 1000);
        drawSdr(columnSdr, $columns, 1040, 0, 1000, 1000, function(d, i) {
            var fill = 'white';
            var rank = _.findIndex(rankedColumns, function(col) {
                return col.index == i;
            });
            if (rank <= maxActiveColumns) {
                fill = 'green';
            }
            return 'fill:' + fill;
        });

        var columnRects = $columns.selectAll('rect');

        renderColumnCompetition(rankedColumns);

        columnRects.on('mousemove', function(noop, columnIndex) {
            if (locked) return;
            columnHighlighted(columnIndex);
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
            columnHighlighted(columnIndex);
            lockColumn(columnIndex);
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

    function paramChange() {
        maxActiveColumns = spParams.getParams()["numActiveColumnsPerInhArea"];
        initSp(function(err, r) {
            if (err) throw err;
            spState = r.state;
            draw()
        });
    }

    spParams.render(paramChange, paramChange);

    $(document).keyup(function(e) {
        if (e.keyCode === 27) {
            unlockColumn();
        }
    });

});
