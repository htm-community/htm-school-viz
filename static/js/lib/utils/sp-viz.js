$(function() {

    // Handlebars template
    var spVizTmpl;

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

    function loadTemplates($el, callback) {
        if (! spVizTmpl) {
            $.get('/static/tmpl/sp-viz.hbs', function(tmpl) {
                spVizTmpl = Handlebars.compile(tmpl);
                $el.html(spVizTmpl());
                if (callback) callback();
            });
        } else {
            if (callback) callback();
        }
    }

    function loadCss() {
        $('head').append('<link rel="stylesheet" href="/static/css/lib/sp-viz.css">');
    }

    function addArrays(a, b) {
        return _.map(a, function(aval, i) {
            return aval + b[i];
        });
    }

    function SPViz(id, spVizSelector, spParams, inputChart, save) {
        var me = this;
        if (! save) {
            save = false;
            localStorage.clear();
        }
        this.chart = inputChart;
        this.$el = $(spVizSelector);
        this.heatmap = false;
        this.histogram = false;
        this.trace = false;
        this.synapses = false;
        this.getConnectedSynapses = false;
        this.getPotentialPools = false;
        this.spParams = spParams;
        this.cumulativeOverlaps = [];
        _.times(this.spParams.getParams().columnDimensions[0], function() {
            me.cumulativeOverlaps.push(0);
        });
        this.save = save;
        this.history = {
            inputEncoding: [],
            activeColumns: [],
            overlaps: [],
            connections: []
        };
        this.spHistory = new HTM.SpHistoryClient(id);
        if (save) this._initStorage();
    }

    SPViz.prototype.loadData = function(callback) {
        this.chart.loadData(callback);
    };

    SPViz.prototype.render = function(inputEncoding,
                                      activeColumns,
                                      overlaps,
                                      connectedSynapses,
                                      potentialPools) {
        var me = this;
        var history = this.history;
        var chart = me.chart;
        var cursor;
        me.inputEncoding = inputEncoding;
        me.activeColumns = activeColumns;
        me.overlaps = overlaps;
        me.connectedSynapses = connectedSynapses || [];
        me.potentialPools = potentialPools || [];
        me.potentialRadius = me.spParams.getParams().potentialRadius.val;

        me.cumulativeOverlaps = addArrays(me.cumulativeOverlaps, me.overlaps);

        function renderEverythingBesidesTheChart() {
            me.$overlapDisplay = me.$el.find('#overlap-display');
            me._rawRender();
            history.inputEncoding[cursor] = inputEncoding;
            history.activeColumns[cursor] = activeColumns;
            history.overlaps[cursor] = overlaps;
            if (me.save) me._save();
        }

        loadCss();
        loadTemplates(me.$el, function() {
            if (chart) {
                cursor = chart.dataCursor;
                var data = chart.data;
                var date = data[cursor].date;
                var closeAc, closeEc;

                if (me.trace) {
                    closeAc = _.map(getClosestSdrIndices(
                        activeColumns, history.activeColumns, Math.floor(cursor * 0.1)
                    ), function(inputIndex) {
                        return {
                            index: inputIndex,
                            data: data[inputIndex]
                        };
                    });
                    closeEc = _.map(getClosestSdrIndices(
                        inputEncoding, history.inputEncoding, Math.floor(cursor * 0.1)
                    ), function(inputIndex) {
                        return {
                            index: inputIndex,
                            data: data[inputIndex]
                        };
                    });
                }
                chart.render(function() {
                    chart.updateChartMarkers(date, closeAc, closeEc);
                    renderEverythingBesidesTheChart();
                });
            } else {
                renderEverythingBesidesTheChart();
            }
        });
    };

    SPViz.prototype.getData = function() {
        return this.chart.data;
    };

    SPViz.prototype.getCursor = function() {
        return this.chart.dataCursor;
    };

    SPViz.prototype.isFinished = function() {
        return this.chart.dataCursor == this.chart.data.length - 1;
    };

    SPViz.prototype.next = function() {
        this.chart.dataCursor++;
    };

    SPViz.prototype.prev = function() {
        this.chart.dataCursor--;
    };

    SPViz.prototype.reset = function() {
        this.chart.dataCursor = 0;
    };


    SPViz.prototype._rawRender = function(connectedSynapses) {
        if (connectedSynapses) me.connectedSynapses = connectedSynapses;
        this._svg = d3.select('#visualization');
        this._drawSdrs();
        this._addViewOptionHandlers();
        this._renderSlider();
    };

    SPViz.prototype._renderHistogram = function(values,
                                                id,
                                                buckets,
                                                startX,
                                                startY,
                                                width,
                                                height) {
        // Generate a log-normal distribution with a median of 30 minutes.
        var minVal = _.min(values);
        var maxVal = _.max(values);

        // Formatters for counts and times (converting numbers to Dates).
        var formatCount = d3.format(",.0f");

        var x = d3.scale.linear()
            .domain([minVal, maxVal])
            .range([0, width]);

        // Generate a histogram using twenty uniformly-spaced bins.
        var data = d3.layout.histogram()
            .bins(x.ticks(buckets))
        (values);

        var y = d3.scale.linear()
            .domain([0, d3.max(data, function(d) { return d.y; })])
            .range([height, 0]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        var svg = this._svg
            .append("g")
            .attr('transform', 'translate(' + startX + ' ' + startY + ')');

        var bar = svg.selectAll(".bar")
            .data(data)
            .enter().append("g")
            .attr("class", "bar")
            .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

        bar.append("rect")
            .attr("x", 1)
            .attr("style", function(d, i) {
                var overlap = d.x;
                var percent = getPercentDistanceCrossed(minVal, overlap, maxVal);
                return 'fill:#' + getGreenToRed(percent * 100) + ';';
            })
            .attr("width", width / buckets)
            .attr("height", function(d) { return height - y(d.y); });

        bar.append("text")
            .attr("dy", ".75em")
            .attr("y", 6)
            .attr("x", width / buckets / 2)
            .attr("text-anchor", "middle")
            .text(function(d) { return formatCount(d.y); });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
    };

    SPViz.prototype._renderSDR = function(sdr, id, x, y, width, height, style) {
        var bits = sdr.length;
        var area = width * height;
        var squareArea = area / bits;
        var fullRectSize = Math.floor(Math.sqrt(squareArea));
        var rectSize = fullRectSize - 1;
        var rowLength = Math.floor(width / fullRectSize);

        this._svg
            .append('g')
            .attr('id', id)
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
            .attr('style', style)
        ;
    };

    SPViz.prototype._renderEncoding = function(sdr, id, x, y, width, height) {
        this._renderSDR(sdr, id, x, y, width, height,
            function(d) {
                var fill = ( d == 1 ? 'steelblue' : 'white');
                return 'fill:' + fill;
            });
    };

    SPViz.prototype._renderHeatmap = function(sdr, data, id, x, y, width, height) {
        var me = this;
        var dataMin = _.min(data);
        var dataMax = _.max(data);
        this._renderSDR(sdr, id, x, y, width, height,
            function(d, i) {
                var percent;
                var stroke = '#CACACA';
                var strokeWidth = 1;
                var fill = 'white';
                if (d == 1) {
                    fill = 'steelblue';
                }
                if (me.heatmap) {
                    percent = getPercentDistanceCrossed(dataMin, data[i], dataMax);
                    fill = '#' + getGreenToRed(percent * 100);
                    if (d == 1) {
                        stroke = 'black';
                        strokeWidth = 2;
                    }
                }
                return 'stroke:' + stroke + ';'
                    + 'fill:' + fill + ';'
                    + 'stroke-width:' + strokeWidth + ';';
            });
    };

    SPViz.prototype._drawSdrs = function() {
        var me = this;
        var inputEncoding = this.inputEncoding;
        var activeColumns = this.activeColumns;
        var overlaps = this.overlaps;

        var connectionCounts = [];

        var gutterSize = 20;
        var startX = gutterSize;
        var startY = gutterSize;

        var columnsRowLength = Math.floor(Math.sqrt(activeColumns.length));

        var width = gutterSize * 2;
        var height = gutterSize * 2;

        var encodingWidth = 400;
        var encodingHeight = 300;

        // Remove any dangling event handlers from previous drawings.
        _.each(['input-encoding', 'active-columns', 'connected-synapses'], function (elid) {
            var $el = $(me._svg).find('#' + elid);
            if ($el) {
                $el.off();
            }
        });

        this._svg.html('');

        me._renderEncoding(
            inputEncoding, 'input-encoding',
            startX, startY, encodingWidth, encodingHeight
        );

        width += encodingWidth;
        startX += encodingWidth + gutterSize;

        var spWidth = 700;
        var spHeight = 200;

        if (! me.histogram) {
            spHeight = 700;
        }

        me._renderHeatmap(
            activeColumns, overlaps, 'active-columns',
            startX, startY, spWidth, spHeight
        );

        width += spWidth + gutterSize;
        startY += spHeight + gutterSize;

        var overlapHistWidth = 700;
        var overlapHistHeight = 100;

        if (me.histogram) {
            me._renderHistogram(
                overlaps, 'overlaps', columnsRowLength,
                startX, startY,
                overlapHistWidth, overlapHistHeight
            );
        }

        startX += spWidth + gutterSize;
        startY = gutterSize;

        height += Math.max(encodingHeight, spHeight + gutterSize + overlapHistHeight);

        if (me.getConnectedSynapses) {

            connectionCounts = _.map(me.connectedSynapses, function(d) {
                return d.length;
            });
            me._renderHeatmap(
                activeColumns, connectionCounts, 'connected-synapses',
                startX, startY, spWidth, spHeight
            );
            startY += spHeight + gutterSize;

            width += gutterSize + spWidth;

            if (me.histogram) {
                me._renderHistogram(
                    connectionCounts, 'connected-histogram', columnsRowLength,
                    startX, startY,
                    overlapHistWidth, overlapHistHeight
                );
            }

            startX = gutterSize;
            startY = gutterSize *3 + spHeight + overlapHistHeight;

            if (me.synapses) {
                var canvasWidth = me.spParams.getParams().columnDimensions[0];
                var canvasHeight = me.spParams.getParams().inputDimensions[0];

                var canvas=(function createCanvas(container_id) {
                    var xhtmlNS = "http://www.w3.org/1999/xhtml",
                        svgNS = 'http://www.w3.org/2000/svg';
                    var f = document.createElementNS(svgNS,"foreignObject");
                    f.x.baseVal.value = startX;
                    f.y.baseVal.value = startY;
                    f.width.baseVal.value = canvasWidth;
                    f.height.baseVal.value = canvasHeight;
                    var c = document.createElementNS(xhtmlNS,"canvas");
                    c.width = canvasWidth;
                    c.height = canvasHeight;
                    var pNode=document.getElementById(container_id);
                    var foObj = pNode.appendChild(f);
                    return foObj.appendChild(c);
                }("visualization"));
                width = canvasWidth + gutterSize * 2;
                height += canvasHeight + gutterSize * 2;
                me._renderSynapseMap(canvas, me.connectedSynapses);
            }
        }

        me._svg
            .attr('width', width)
            .attr('height', height);

        me._addSdrInteractionHandlers();

    };

    SPViz.prototype._renderSynapseMap = function(canvas, synapses) {
        var me = this;
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;
        var ctx = canvas.getContext('2d');
        var canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

        // That's how you define the value of a pixel //
        function drawPixel (x, y, r, g, b, a) {
            var index = (x + y * canvasWidth) * 4;
            canvasData.data[index + 0] = r;
            canvasData.data[index + 1] = g;
            canvasData.data[index + 2] = b;
            canvasData.data[index + 3] = a;
        }

        // That's how you update the canvas, so that your //
        // modification are taken in consideration //
        function updateCanvas() {
            ctx.putImageData(canvasData, 0, 0);
        }

        _.each(synapses, function(colConnections, myX) {
            var r = 60, g = 60, b = 60;
            _.each(colConnections, function(myY) {
                if (me.inputEncoding[myY]) {
                    r = 255;
                } else {
                    r = 0;
                }
                drawPixel(myX, myY, r, g, b, 255);
            });
        });

        updateCanvas();

    };

    SPViz.prototype._addSdrInteractionHandlers = function() {
        var me = this;
        this._svg = this.$el.find('#visualization');
        var connectedSynapses = this.connectedSynapses;
        var potentialPools = this.potentialPools;
        var $inputEncoding = this._svg.find('#input-encoding');
        var $activeColumns = this._svg.find('#active-columns');
        var $connections = this._svg.find('#connected-synapses');

        var highlightEncodingBits = function (evt) {
            var bitIndex = parseInt(evt.target.getAttribute('index'));
            $inputEncoding.find('rect').attr('class', '');
            if (me.getPotentialPools) {
                var pools = potentialPools[bitIndex];
                _.each(pools, function (i) {
                    $inputEncoding.find('[index="' + i + '"]').attr('class', 'pool');
                });
            }
            if (me.getConnectedSynapses) {
                var connections = connectedSynapses[bitIndex];
                _.each(connections, function (i) {
                    $inputEncoding.find('[index="' + i + '"]').attr('class', 'connected');
                });
            }
            me.$overlapDisplay.html(me.overlaps[bitIndex]);
        };

        var unhighlightEncoding = function () {
            $inputEncoding.find('rect').attr('class', '');
        };

        var showColumnHistory = function(evt) {
            var bitIndex = parseInt(evt.target.getAttribute('index'));
            me._popupColumnHistory(bitIndex);
        };

        $activeColumns.on('mousemove', highlightEncodingBits);
        $activeColumns.on('mouseout', unhighlightEncoding);
        $activeColumns.on('click', showColumnHistory);
        $connections.on('mousemove', highlightEncodingBits);
        $connections.on('mouseout', unhighlightEncoding);
    };

    SPViz.prototype._renderSlider = function() {
        var me = this;
        if (! this.chart) return;
        this.$el.find('#column-history-slider').slider({
            min: 0,
            max: this.chart.dataCursor,
            value: this.chart.dataCursor,
            step: 1,
            slide: function(event, ui) {
                me._renderColumnConnectionSdr(ui.value);
            }
        });
    };

    SPViz.prototype._addViewOptionHandlers = function() {
        var me = this;
        var $el = this.$el;
        if (me._viewHandled) {
            return;
        }
        $el.find('#heatmap').bootstrapSwitch({
            size: 'small',
            state: me.heatmap
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.heatmap = state;
            me._svg = d3.select('#visualization');
            me._drawSdrs();
        });
        $el.find('#histogram').bootstrapSwitch({
            size: 'small',
            state: me.histogram
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.histogram = state;
            me._svg = d3.select('#visualization');
            me._drawSdrs();
        });
        $el.find('#trace').bootstrapSwitch({
            size: 'small',
            state: me.trace
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.trace = state;
            me._svg = d3.select('#visualization');
            me._drawSdrs();
        });
        $el.find('#synapses').bootstrapSwitch({
            size: 'small',
            state: me.synapses
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.synapses = state;
            me._svg = d3.select('#visualization');
            me._drawSdrs();
        });
        $el.find('#connected').bootstrapSwitch({
            size: 'small',
            state: me.getConnectedSynapses
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.getConnectedSynapses = state;
            if (me.__onViewOptionChange) {
                me.__onViewOptionChange(me.getConnectedSynapses, me.getPotentialPools);
            }
        });
        $el.find('#potential').bootstrapSwitch({
            size: 'small',
            state: me.getPotentialPools
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.getPotentialPools = state;
            if (me.__onViewOptionChange) {
                me.__onViewOptionChange(me.getConnectedSynapses, me.getPotentialPools);
            }
        });
        me._viewHandled = true;
    };

    SPViz.prototype._renderColumnConnectionSdr = function(cursor) {
        var width = 400,
            height = 400;
        var sdr = this.history.inputEncoding[cursor];
        var bits = sdr.length;
        var area = width * height;
        var squareArea = area / bits;
        var fullRectSize = Math.floor(Math.sqrt(squareArea));
        var rectSize = fullRectSize - 1;
        var rowLength = Math.floor(width / fullRectSize);
        var connections = this._connections;
        var permanences = this._permanences;
        var potentialPools = this.potentialPools;
        var circleColor = '#6762ff';

        d3.select('#col-connections-svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .selectAll('rect')
            .data(sdr)
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
                //var potentialPool = potentialPools[i];
                var fill = ( d == 1 ? '#CCC' : 'white');
                var permanence = permanences[cursor][i] * 100;
                var stroke = '#' + getGreenToRed(100 - permanence);
                var strokeWidth = 1;
                //if (potentialPool.indexOf(i) == -1) {
                //    stroke = 'white';
                //}
                console.log('%s : connection to input index %s is %s', stroke, i, permanence);
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
            .data(connections[cursor])
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
    };

    SPViz.prototype._popupColumnHistory = function(index) {
        var me = this;
        var cursor = this.getCursor();
        this.spHistory.getColumnHistory(index, function(history) {
            me._connections = history.connections;
            me._permanences = history.permanences;
            me._renderColumnConnectionSdr(cursor);
            me.$el.find('#column-history').modal({show: true});
        });
    };

    SPViz.prototype.onViewOptionChange = function(func) {
        this.__onViewOptionChange = func;
    };

    SPViz.prototype._initStorage = function() {
        localStorage.setItem('sp', JSON.stringify({}));
    };

    SPViz.prototype._save = function() {
        var store = JSON.parse(localStorage.getItem('sp'));
        if (! store.connectedSynapses) store.connectedSynapses = [];
        store.connectedSynapses.push(this.connectedSynapses);
        localStorage.setItem('sp', JSON.stringify(store));
    };

    window.HTM.utils.sp.SPViz = SPViz;

});