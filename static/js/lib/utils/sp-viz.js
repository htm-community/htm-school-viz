$(function() {

    // Defaults.
    var DEFAULT_WIDTH = 1200;
    var DEFAULT_HEIGHT = 690;

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

    function SPViz(el, spParams) {
        this.$el = $('#' + el);
        this.heatmap = false;
        this.getConnectedSynapses = false;
        this.getPotentialPools = false;
        this.spParams = spParams;
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
        me.connectedSynapses = connectedSynapses;
        me.potentialPools = potentialPools;
        me.potentialRadius = me.spParams.getParams().potentialRadius.val;


        loadCss();
        loadTemplates(function() {
            me.$el.html(spVizTmpl());
            me.$inputEncoding = me.$el.find('#input-encoding');
            me.$activeColumns = me.$el.find('#active-columns');
            me.$overlapDisplay = me.$el.find('#overlap-display');
            me._rawRender();
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

        var gutterSize = 20;

        var rectSize = 14;
        var rectWithStrokeSize = rectSize + 1;
        var encodingRowLength = Math.floor(Math.sqrt(inputEncoding.length));
        var columnsRowLength = Math.floor(Math.sqrt(activeColumns.length));
        var startX = gutterSize;
        var startY = gutterSize;
        var $inputEncoding = this.$inputEncoding;
        var $activeColumns = this.$activeColumns;

        // First let's set the main SVG width and height.
        var width = gutterSize
            + rectWithStrokeSize * encodingRowLength
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

    window.HTM.utils.sp.SPViz = SPViz;

});