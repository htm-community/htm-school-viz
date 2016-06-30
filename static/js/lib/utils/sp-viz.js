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

    function loadTemplates(callback) {
        if (! spVizTmpl) {
            $.get('/static/tmpl/sp-viz.hbs', function(tmpl) {
                spVizTmpl = Handlebars.compile(tmpl);
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

    function getPercentDistanceCrossed(min, value, max) {
        var range = max - min;
        var adjustedValue = value - min;
        return adjustedValue / range;
    }

    function SPViz(name, el, spParams) {
        var me = this;
        this.name = name;
        this.$el = $('#' + el);
        this.heatmap = false;
        this.getConnectedSynapses = false;
        this.getPotentialPools = false;
        this.spParams = spParams;
        this.cumulativeOverlaps = [];
        _.times(this.spParams.getParams().columnDimensions[0], function() {
            me.cumulativeOverlaps.push(0);
        });
        this._createdAt = moment();
        this._iterations = 0;
        //this._initStorage();
    }

    SPViz.prototype.render = function(inputEncoding,
                                      activeColumns,
                                      overlaps,
                                      connectedSynapses,
                                      potentialPools) {
        var me = this;
        me.inputEncoding = inputEncoding;
        me.activeColumns = activeColumns;
        me.overlaps = overlaps;
        me.connectedSynapses = connectedSynapses || [];
        me.potentialPools = potentialPools || [];
        me.potentialRadius = me.spParams.getParams().potentialRadius.val;

        me.cumulativeOverlaps = addArrays(me.cumulativeOverlaps, me.overlaps);

        loadCss();
        loadTemplates(function() {
            me.$el.html(spVizTmpl());
            me.$inputEncoding = me.$el.find('#input-encoding');
            me.$activeColumns = me.$el.find('#active-columns');
            me.$comulativeOverlaps = me.$el.find('#cumulative-overlaps');
            me.$overlapDisplay = me.$el.find('#overlap-display');
            me.$overlaDistribution = me.$el.find('#overlap-distribution');
            me._iterations++;
            me._rawRender();
            //me._save();
        });
    };

    SPViz.prototype._rawRender = function(connectedSynapses) {
        if (connectedSynapses) me.connectedSynapses = connectedSynapses;
        this._drawSdrs();
        this._addViewOptionHandlers();
        this._addSdrInteractionHandlers();
    };

    SPViz.prototype._drawSdrs = function() {
        var me = this;
        var inputEncoding = this.inputEncoding;
        var activeColumns = this.activeColumns;
        var overlaps = this.overlaps;
        var maxOverlap = _.max(overlaps);

        var maxCumulativeOverlap = _.max(me.cumulativeOverlaps);
        var minCumulativeOverlap = _.min(me.cumulativeOverlaps);

        var gutterSize = 20;
        var rectSize = 14;
        var rectWithStrokeSize = rectSize + 1;
        var startX = gutterSize;
        var startY = gutterSize;

        var encodingRowLength = Math.floor(Math.sqrt(inputEncoding.length));
        var columnsRowLength = Math.floor(Math.sqrt(activeColumns.length));

        var $inputEncoding = this.$inputEncoding;
        var $activeColumns = this.$activeColumns;
        var $cumulativeOverlaps = this.$comulativeOverlaps;
        var $overlapDistribution = this.$overlaDistribution;

        // First let's set the main SVG width and height.
        var width = gutterSize
            + rectWithStrokeSize * encodingRowLength
            + gutterSize * 2
            + rectWithStrokeSize * columnsRowLength
            + gutterSize * 2
            + rectWithStrokeSize * columnsRowLength
            + gutterSize;
        var height = gutterSize
            + rectWithStrokeSize * (columnsRowLength + 1)
            + gutterSize;
        me.$el.find('#visualization')
            .attr('width', width)
            .attr('height', height);


        $inputEncoding.html('');

        d3.select('#input-encoding')
            .selectAll('rect')
            .data(inputEncoding)
            .enter()
            .append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('x', function(d, i) {
                var offset = i % encodingRowLength;
                return offset * rectWithStrokeSize + startX;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / encodingRowLength);
                return offset * rectWithStrokeSize + startY;
            })
            .attr('index', function(d, i) { return i; })
            .attr('fill', function(d) {
                return ( d == 1 ? 'steelblue' : 'white')
            })
        ;

        startX = startX + rectWithStrokeSize * encodingRowLength + gutterSize*2;

        $activeColumns.html('');
        d3.select('#active-columns')
            .selectAll('rect')
            .data(activeColumns)
            .enter()
            .append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('x', function(d, i) {
                var offset = i % columnsRowLength;
                return offset * rectWithStrokeSize + startX;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / columnsRowLength);
                return offset * rectWithStrokeSize + startY;
            })
            .attr('index', function(d, i) { return i; })
            .attr('style', function(d, i) {
                var percent;
                var stroke = '#CACACA';
                var strokeWidth = 1;
                var fill = 'white';
                if (d == 1) {
                    fill = 'steelblue';
                }
                if (me.heatmap) {
                    percent = overlaps[i] / maxOverlap;
                    percent = Math.min(1.0, percent);
                    fill = '#' + getGreenToRed(percent * 100);
                    if (d == 1) {
                        stroke = 'black';
                        strokeWidth = 2;
                    }
                }
                return 'stroke:' + stroke + ';'
                     + 'fill:' + fill + ';'
                     + 'stroke-width:' + strokeWidth + ';';
            })
        ;

        startX = startX + rectWithStrokeSize * columnsRowLength + gutterSize*2;

        $overlapDistribution.html('');
        me._drawOverlapHistogram('#histogram', me.overlaps);
        me._drawOverlapHistogram('#overall-histogram', _.map(me.cumulativeOverlaps, function(d) {
            return d / me._iterations;
        }));

        $cumulativeOverlaps.html('');
        d3.select('#cumulative-overlaps')
            .selectAll('rect')
            .data(me.cumulativeOverlaps)
            .enter()
            .append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('x', function(d, i) {
                var offset = i % columnsRowLength;
                return offset * rectWithStrokeSize + startX;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / columnsRowLength);
                return offset * rectWithStrokeSize + startY;
            })
            .attr('index', function(d, i) { return i; })
            .attr('style', function(d, i) {
                var stroke = '#CACACA';
                var strokeWidth = 1;
                var avgOverlap = d / me._iterations;
                var percent = avgOverlap / maxOverlap;
                var fill = '#' + getGreenToRed(percent * 100);
                if (activeColumns[i] == 1) {
                    stroke = 'black';
                    strokeWidth = 2;
                }
                return 'stroke:' + stroke + ';'
                    + 'fill:' + fill + ';'
                    + 'stroke-width:' + strokeWidth + ';';
            })
        ;


    };

    SPViz.prototype._drawOverlapHistogram = function(selector, overlaps) {
        // Generate a log-normal distribution with a median of 30 minutes.
        var values = overlaps;
        var minOverlap = _.min(overlaps);
        var maxOverlap = _.max(overlaps);
        var buckets = 40;

        // Formatters for counts and times (converting numbers to Dates).
        var formatCount = d3.format(",.0f");

        var margin = {top: 10, right: 30, bottom: 30, left: 30},
            width = 960 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        var x = d3.scale.linear()
            .domain([minOverlap, maxOverlap])
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

        var svg = d3.select(selector)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var bar = svg.selectAll(".bar")
            .data(data)
            .enter().append("g")
            .attr("class", "bar")
            .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

        bar.append("rect")
            .attr("x", 1)
            .attr("style", function(d, i) {
                var overlap = d.x;
                var percent = getPercentDistanceCrossed(minOverlap, overlap, maxOverlap);
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

    SPViz.prototype._addSdrInteractionHandlers = function() {
        var me = this;
        var connectedSynapses = this.connectedSynapses;
        var potentialPools = this.potentialPools;
        var $inputEncoding = this.$inputEncoding;
        var $activeColumns = this.$activeColumns;

        $activeColumns.on('mousemove', function(evt) {
            var bitIndex = parseInt(evt.target.getAttribute('index'));
            $inputEncoding.find('rect').attr('class', '');
            if (me.getPotentialPools) {
                var pools = potentialPools[bitIndex];
                _.each(pools, function(i) {
                    $inputEncoding.find('[index="' + i + '"]').attr('class', 'pool');
                });
            }
            if (me.getConnectedSynapses) {
                var connections = connectedSynapses[bitIndex];
                _.each(connections, function(i) {
                    $inputEncoding.find('[index="' + i + '"]').attr('class', 'connected');
                });
            }
            me.$overlapDisplay.html(me.overlaps[bitIndex]);
        });
        $activeColumns.on('mouseout', function() {
            $inputEncoding.find('rect').attr('class', '');
        });
    };

    SPViz.prototype._addViewOptionHandlers = function() {
        var me = this;
        this.$el.find('#heatmap').bootstrapSwitch({
            size: 'small',
            state: me.heatmap
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.heatmap = state;
            me._drawSdrs();
        });
        this.$el.find('#connected').bootstrapSwitch({
            size: 'small',
            state: me.getConnectedSynapses
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.getConnectedSynapses = state;
            if (me.__onViewOptionChange) {
                me.__onViewOptionChange(me.getConnectedSynapses, me.getPotentialPools);
            }
        });
        this.$el.find('#potential').bootstrapSwitch({
            size: 'small',
            state: me.getPotentialPools
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.getPotentialPools = state;
            if (me.__onViewOptionChange) {
                me.__onViewOptionChange(me.getConnectedSynapses, me.getPotentialPools);
            }
        });
    };

    SPViz.prototype.onViewOptionChange = function(func) {
        this.__onViewOptionChange = func;
    };

    SPViz.prototype._getStorageId = function() {
        return this.name + ' | ' + this._createdAt.format();
    };


    SPViz.prototype._initStorage = function() {
        var id = this._getStorageId();
        var batches = localStorage.getItem('batches');
        if (! batches) {
            batches = [];
        } else {
            batches = JSON.parse(batches);
        }
        batches.push({
            id: id,
            name: this.name,
            created: this._createdAt.format(),
            iterations: 0
        });
        this._batches = batches;
        localStorage.setItem('batches', JSON.stringify(batches));
    };

    SPViz.prototype._save = function() {
        var id = this._getStorageId();
        var payload = {
            overlaps: this.overlaps
        };
        var batch = _.find(this._batches, function(b) {
            return b.id == id;
        });
        localStorage[id + ':' + batch.iterations++] = JSON.stringify(payload);
        localStorage.batches = JSON.stringify(this._batches);
    };

    window.HTM.utils.sp.SPViz = SPViz;

});