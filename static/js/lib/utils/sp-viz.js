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

    function SPViz(el) {
        this.$el = $('#' + el);
        this.heatmap = false;
        this.getConnectedSynapses = false;
    }

    SPViz.prototype.render = function(inputEncoding,
                                      activeColumns,
                                      overlaps,
                                      connectedSynapses,
                                      potentialRadius) {
        var me = this;
        me.inputEncoding = inputEncoding;
        me.activeColumns = activeColumns;
        me.overlaps = overlaps;
        me.connectedSynapses = connectedSynapses;
        me.potentialRadius = potentialRadius;
        loadTemplates(function() {
            me.$el.html(spVizTmpl());
            me.$inputEncoding = me.$el.find('#input-encoding');
            me.$activeColumns = me.$el.find('#active-columns');
            me._drawSdrs();
            me._addViewOptionHandlers();
            me._addSdrInteractionHandlers();
        });
    };

    SPViz.prototype._drawSdrs = function() {
        var me = this;
        var inputEncoding = this.inputEncoding;
        var activeColumns = this.activeColumns;
        var overlaps = this.overlaps;
        var potentialRadius = this.potentialRadius;

        var rectSize = 14;
        var rowLength = Math.floor(Math.sqrt(inputEncoding.length));
        var startX = 20;
        var startY = 20;
        var $inputEncoding = this.$inputEncoding;
        var $activeColumns = this.$activeColumns;

        $inputEncoding.html('');

        d3.select('#input-encoding')
            .selectAll('rect')
            .data(inputEncoding)
            .enter()
            .append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('x', function(d, i) {
                var offset = i % rowLength;
                return offset * rectSize + startX;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * rectSize + startY;
            })
            .attr('index', function(d, i) { return i; })
            .attr('fill', function(d) {
                return ( d == 1 ? 'steelblue' : 'white')
            })
        ;

        rowLength = Math.floor(Math.sqrt(activeColumns.length));
        startX = 540;

        $activeColumns.html('');
        d3.select('#active-columns')
            .selectAll('rect')
            .data(activeColumns)
            .enter()
            .append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('x', function(d, i) {
                var offset = i % rowLength;
                return offset * rectSize + startX;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * rectSize + startY;
            })
            .attr('index', function(d, i) { return i; })
            .attr('fill', function(d, i) {
                var overlap;
                var percentOverlap;
                var color = ( d == 1 ? 'steelblue' : 'white');
                if (me.heatmap) {
                    if (d == 1) { return 'red'; }
                    overlap = overlaps[i];
                    percentOverlap = overlap / potentialRadius * 100;
                    color = '#' + getGreenToRed(percentOverlap);
                }
                return color;
            })
        ;
    };

    SPViz.prototype._addSdrInteractionHandlers = function() {
        var me = this;
        var connectedSynapses = this.connectedSynapses;
        var $inputEncoding = this.$inputEncoding;
        var $activeColumns = this.$activeColumns;

        $activeColumns.on('mousemove', function(evt) {
            if (me.getConnectedSynapses) {
                var bitIndex = evt.target.getAttribute('index');
                var connections = connectedSynapses[parseInt(bitIndex)];
                $inputEncoding.find('rect').attr('class', '');
                _.each(connections, function(i) {
                    $inputEncoding.find('[index="' + i + '"]').attr('class', 'connected');
                });
            }
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
            if (me.__onConnectedSynapseChange) {
                me.__onConnectedSynapseChange(state);
            }
        });
    };

    SPViz.prototype.onConnectedSynapseChange = function(func) {
        this.__onConnectedSynapseChange = func;
    };

    window.HTM.utils.sp.SPViz = SPViz;

});