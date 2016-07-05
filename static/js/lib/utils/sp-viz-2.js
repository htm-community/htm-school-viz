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
            $.get('/static/tmpl/sp-viz-2.hbs', function(tmpl) {
                spVizTmpl = Handlebars.compile(tmpl);
                if (callback) callback();
            });
        } else {
            if (callback) callback();
        }
    }

    function loadCss() {
        $('head').append('<link rel="stylesheet" href="/static/css/lib/sp-viz-2.css">');
    }

    function getPercentDistanceCrossed(min, value, max) {
        var range = max - min;
        var adjustedValue = value - min;
        return adjustedValue / range;
    }

    function SPViz(name, el, spParams) {
        this.name = name;
        this.$el = $('#' + el);
        this.heatmap = false;
        this.learn = true;
        this.spParams = spParams;
    }

    SPViz.prototype.render = function(inputEncoding,
                                      activeColumns,
                                      overlaps, 
                                      lastInputEncoding, 
                                      lastActiveColumns) {
        var me = this;
        me.overlaps = overlaps;

        loadCss();
        loadTemplates(function() {
            me.$el.html(spVizTmpl());
            me.$overlapDisplay = me.$el.find('#overlap-display');
            me._rawRender(inputEncoding,
                          activeColumns,
                          overlaps,
                          lastInputEncoding,
                          lastActiveColumns);
        });
    };

    SPViz.prototype._rawRender = function(inputEncoding,
                                          activeColumns,
                                          overlaps,
                                          lastInputEncoding,
                                          lastActiveColumns) {
        this._svg = d3.select('#visualization');
        this._drawSdrs(inputEncoding,
                       activeColumns,
                       overlaps,
                       lastInputEncoding,
                       lastActiveColumns);
        //this._addSdrInteractionHandlers();
        this._addViewOptionHandlers();
    };

    SPViz.prototype._renderSDR = function(sdr, id, x, y, width, height, style) {
        var bits = sdr.length;
        var root = Math.sqrt(bits);
        var rowLength = Math.floor(root) * 2;
        var rectWithStrokeWidth = Math.floor(width / rowLength);
        var rectWithStrokeHeight = rectWithStrokeWidth;
        var rectHeight = rectWithStrokeHeight - 1;
        var rectWidth = rectWithStrokeWidth - 1;

        this._svg
            .append('g')
            .attr('id', id)
            .selectAll('rect')
            .data(sdr)
            .enter()
            .append('rect')
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('x', function(d, i) {
                var offset = i % rowLength;
                return offset * rectWithStrokeWidth + x;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / rowLength);
                return offset * rectWithStrokeHeight + y;
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
        var dataMin;
        var dataMax;
        if (data) {
            dataMin = _.min(data);
            dataMax = _.max(data);
        }
        this._renderSDR(sdr, id, x, y, width, height,
            function(d, i) {
                var percent;
                var stroke = '#CACACA';
                var strokeWidth = 1;
                var fill = 'white';
                if (d == 1) {
                    fill = 'steelblue';
                }
                if (data && me.heatmap) {
                    percent = getPercentDistanceCrossed(dataMin, data[i], dataMax);
                    fill = '#' + getGreenToRed(percent * 100);
                    if (d == 1) {
                        stroke = 'black';
                        //strokeWidth = 2;
                    }
                }
                return 'stroke:' + stroke + ';'
                    + 'fill:' + fill + ';'
                    + 'stroke-width:' + strokeWidth + ';';
            });
    };

    SPViz.prototype._drawSdrs = function(inputEncoding,
                                         activeColumns,
                                         overlaps,
                                         lastInputEncoding,
                                         lastActiveColumns) {
        var me = this;

        var gutterSize = 20;
        var startX = gutterSize;
        var startY = gutterSize;

        var columnsRowLength = Math.floor(Math.sqrt(activeColumns.length));

        var width = gutterSize * 2;
        var height = gutterSize * 2;

        var encodingWidth = 400;
        var encodingHeight = 300;
        var totalEncodingHeight = encodingHeight;

        me._renderEncoding(
            inputEncoding, 'input-encoding',
            startX, startY, encodingWidth, encodingHeight
        );

        if (lastInputEncoding) {
            startY = gutterSize + encodingHeight;
            me._renderEncoding(
                lastInputEncoding, 'last-encoding',
                startX, startY, encodingWidth, encodingHeight
            );
            totalEncodingHeight += encodingHeight + gutterSize;
            startY = gutterSize;
        }

        width += encodingWidth;
        startX += encodingWidth + gutterSize;

        var spWidth = 700;
        var spHeight = 200;

        me._renderHeatmap(
            activeColumns, overlaps, 'active-columns',
            startX, startY, spWidth, spHeight
        );

        if (lastActiveColumns) {
            startY = gutterSize + spHeight;
            me._renderHeatmap(
                lastActiveColumns, null, 'last-columns',
                startX, startY, spWidth, spHeight
            )
        }

        width += spWidth + gutterSize;
        height += Math.max(totalEncodingHeight, spHeight);

        me._svg
            .attr('width', width)
            .attr('height', height);

    };

    SPViz.prototype._addViewOptionHandlers = function() {
        var me = this;
        this.$el.find('#heatmap').bootstrapSwitch({
            size: 'small',
            state: me.heatmap
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.heatmap = state;
            me._svg = d3.select('#visualization');
            me._drawSdrs();
        });
        this.$el.find('#learn').bootstrapSwitch({
            size: 'small',
            state: me.learn
        }).on('switchChange.bootstrapSwitch', function(event, state) {
            me.learn = state;
            if (me.__onViewOptionChange) {
                me.__onViewOptionChange(me.learn);
            }
        });
    };

    SPViz.prototype.onViewOptionChange = function(func) {
        this.__onViewOptionChange = func;
    };

    window.HTM.utils.sp.SPViz2 = SPViz;

});