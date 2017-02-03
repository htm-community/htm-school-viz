$(function() {

    // Handlebars templates
    var spParamTmpl;

    // SP scalar params we'll turn into sliders for adjustment
    var spScalarParams = {
        potentialRadius: {
            val: 16,
            min: 0,
            max: 128,
            name: 'potential radius'
        },
        potentialPct: {
            val: 0.85,
            min: 0.0,
            max: 1.0,
            name: 'potential percent'
        },
        localAreaDensity: {
            val: 0,
            min: 0,
            max: 1.0,
            name: 'local area density'
        },
        numActiveColumnsPerInhArea: {
            val: 40.0,
            min: 0.0,
            max: 100.0,
            name: 'number of active columns per inhibition area'
        },
        stimulusThreshold: {
            val: 1,
            min: 0,
            max: 10,
            name: 'stimulus threshold'
        },
        synPermInactiveDec: {
            val: 0.008,
            min: 0.0,
            max: 1.0,
            name: 'synaptic permanence inactive decrement'
        },
        synPermActiveInc: {
            val: 0.05,
            min: 0.0,
            max: 1.0,
            name: 'synaptic permanence active increment'
        },
        synPermConnected: {
            val: 0.10,
            min: 0.0,
            max: 1.0,
            name: 'synaptic permanence connected'
        },
        minPctOverlapDutyCycle: {
            val: 0.001,
            min: 0.0,
            max: 1.0,
            name: 'minimum percent overlap duty cycle'
        },
        dutyCyclePeriod: {
            val: 1000,
            min: 0,
            max: 1000,
            name: 'duty cycle period'
        },
        boostStrength: {
            val: 1,
            min: 0,
            max: 100,
            name: 'boost strength'
        }
    };

    function calculateSliderStep(min, max, val) {
        var range = max - min;
        if (Number.isInteger(val)) {
            if (val >= 1000) {
                return 10;
            } else {
                return 1;
            }
        } else {
            if (range <= 1) {
                if (val < 0.01) {
                    return 0.001;
                } else {
                    return 0.01;
                }
            } else if (range < 10) {
                return 0.1;
            }
        }
    }

    function loadCss() {
        $('head').append('<link rel="stylesheet" href="/static/css/lib/sp-params.css">');
    }

    function loadTemplates(callback) {
        $.get('/static/tmpl/sp-params.hbs', function(tmpl) {
            spParamTmpl = Handlebars.compile(tmpl);
            if (callback) callback();
        });
    }

    function SPParams(el, inputDimensions, columnDimensions) {
        this.el = el;
        this.params = _.merge({}, spScalarParams);
        _.each(this.params, function(p) {
            p.type = 'scalar';
        });
        this.params.globalInhibition = {val: true};
        this.params.wrapAround = {val: true};
        this.params.inputDimensions = {val: inputDimensions};
        this.params.columnDimensions = {val: columnDimensions};
        // The potentialRadius max is determined by the input space.
        this.params.potentialRadius.max = _.reduce(inputDimensions, function(a, b) {
            return a * b;
        }, 1);
        this.params.potentialRadius.val = this.params.potentialRadius.max;
        // This sets sparsity of SP to 2%.
        this.params.numActiveColumnsPerInhArea.max = _.multiply(columnDimensions);
        this.params.numActiveColumnsPerInhArea.val
            = Math.floor(this.params.numActiveColumnsPerInhArea.max * 0.02);
    }

    SPParams.prototype._updateUi = function() {
        _.each(this.params, function(val) {
            if (val.displayEl) {
                val.displayEl.html(val.val);
            }
        });
    };

    SPParams.prototype.getParams = function() {
        var out = {};
        _.each(this.params, function(val, key) {
            out[key] = val.val;
        });
        return out;
    };

    SPParams.prototype.setParam = function(key, value) {
        if (this.params[key] == undefined) {
            throw Error("Missing SP Param '" + key + "'");
        }
        this.params[key].val = value;
    };

    SPParams.prototype.render = function(renderDone, valuesChanged) {
        var me = this;
        var data = {sides: [[],[]]};
        var count = 0;

        loadCss();

        loadTemplates(function() {
            _.each(spScalarParams, function(val, codeName) {
                var viewObj = {
                    id: codeName,
                    name: val.name
                };
                data.sides[count % 2].push(viewObj);
                count++;
            });
            $('#' + me.el).html(spParamTmpl(data));
            // Render sliders and capture DOM elements associated with these params
            // after rendering.
            _.each(me.params, function(val, codeName) {
                var step;
                if (val.type && val.type == 'scalar') {
                    step = calculateSliderStep(val.min, val.max, val.val);
                    val.sliderEl = $('#' + codeName);
                    val.displayEl = $('#' + codeName + '-display');
                    val.sliderEl.slider({
                        value: val.val,
                        min: val.min,
                        max: val.max,
                        step: step,
                        change: function(event, ui) {
                            if (val.val == ui.value) {
                                event.preventDefault();
                            } else {
                                val.val = ui.value;
                                me._updateUi();
                            }
                        },
                        slide: function(event, ui) {
                            val.displayEl.html(ui.value);
                        }
                    });
                }
            });
            var $globalInhibitionSwitch = $('#globalInhibition').bootstrapSwitch({state: globalInhibition});
            var $wrapAroundSwitch = $('#wrapAround').bootstrapSwitch({state: wrapAround});
            $globalInhibitionSwitch.on('switchChange.bootstrapSwitch', function(event, state) {
                me.params.globalInhibition.val = state;
                me._updateUi();
            });
            $wrapAroundSwitch.on('switchChange.bootstrapSwitch', function(event, state) {
                me.params.wrapAround.val = state;
                me._updateUi();
            });
            me._updateUi();
            $('#' + me.el + ' #update-params').click(function() {
                valuesChanged();
            });
            if (renderDone) renderDone();
        });
    };


    window.HTM.utils = {
        sp: {
            Params: SPParams
        }
    };

});
