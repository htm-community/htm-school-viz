$(function() {

    var $wrapAroundDisplay = $('#wrap-around-display');
    var $globalInhibition;
    var $globalInhibitionDisplay = $('#global-inhibition-display');

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
            val: -1.0,
            min: -1.0,
            max: 10.0,
            name: 'local area density'
        },
        numActiveColumnsPerInhArea: {
            val: 10.0,
            min: 0.0,
            max: 100.0,
            name: 'number of active columns per inhibition area'
        },
        stimulusThreshold: {
            val: 0,
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
        minPctActiveDutyCycle: {
            val: 0.001,
            min: 0.0,
            max: 1.0,
            name: 'minimum percent active duty cycle'
        },
        dutyCyclePeriod: {
            val: 1000,
            min: 0,
            max: 10000,
            name: 'duty cycle period'
        },
        maxBoost: {
            val: 1.0,
            min: 0.0,
            max: 10.0,
            name: 'max boost'
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

    function loadTemplates(callback) {
        $.get('/static/tmpl/sp-params.hbs', function(tmpl) {
            spParamTmpl = Handlebars.compile(tmpl);
            if (callback) callback();
        });
    }

    function SPParams(el, inputDimensions, columnDimensions) {
        this.el = el;
        this.scalarParams = {};
        this.params = _.merge(this.scalarParams, spScalarParams);
        this.params.globalInhibition = {val: true};
        this.params.wrapAround = {val: true};
        this.params.inputDimensions = {val: inputDimensions};
        this.params.columnDimensions = {val: columnDimensions};
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

    SPParams.prototype.render = function(valuesChanged, renderDone) {
        var me = this;
        var data = {sides: [[],[]]};
        var count = 0;

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
            // Render sliders and capture DOM elements associtated with these params
            // after rendering.
            _.each(spScalarParams, function(val, codeName) {
                var step = calculateSliderStep(val.min, val.max, val.val);
                val.sliderEl = $('#' + codeName);
                val.displayEl = $('#' + codeName + '-display');
                val.sliderEl.slider({
                    value: val.val,
                    min: val.min,
                    max: val.max,
                    step: step,
                    change: function(event, ui) {
                        if (waitingForServer) {
                            console.log('Sorry, still waiting for server-side SP...');
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
            });
            var $globalInhibitionSwitch = $('#globalInhibition').bootstrapSwitch({state: globalInhibition});
            var $wrapAroundSwitch = $('#wrapAround').bootstrapSwitch({state: wrapAround});
            $globalInhibitionSwitch.on('switchChange.bootstrapSwitch', function(event, state) {
                me.params.globalInhibition = state;
                me._updateUi();
                valuesChanged();
            });
            $wrapAroundSwitch.on('switchChange.bootstrapSwitch', function(event, state) {
                me.params.wrapAround = state;
                me._updateUi();
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