$(function() {

    var inputN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 100;
    var inputRange = maxInput - minInput;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        inputN, inputW, minInput, maxInput - 1
    );

    // The number the user clicked last.
    var inputValue;
    var inputEncoding;

    var inputRectSize = 40;
    var inputGridWidth = Math.floor(Math.sqrt(inputRange));

    var spClient;

    // SP params we are not allowing user to change
    var inputDimensions = [inputN];
    var columnDimensions = [2048];
    var seed = -1;
    // SP boolean params
    var globalInhibition = true;
    var wrapAround = true
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

    var $inputGrid = $('#input-grid');

    var $wrapAround;
    var $wrapAroundDisplay = $('#wrap-around-display');
    var $globalInhibition;
    var $globalInhibitionDisplay = $('#global-inhibition-display');
    var $spScalarParams = $('#sp-scalar-params');

    var $globalInhibitionSwitch = $('#globalInhibition').bootstrapSwitch({state: globalInhibition});
    var $wrapAroundSwitch = $('#wrapAround').bootstrapSwitch({state: wrapAround});

    var $loading = $('#loading');

    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    // Handlebars templates
    var spScalarSliderTmpl = Handlebars.compile($('#sp-scalar-slider-tmpl').html());
    var spScalarParamsTmpl = Handlebars.compile($('#sp-scalar-params-tmpl').html());
    Handlebars.registerPartial('spScalarSliderTmpl', spScalarSliderTmpl);

    function loading(isLoading) {
        if (isLoading) {
            waitingForServer = true;
            $loading.show();
        } else {
            waitingForServer = false;
            $loading.hide();
        }
    }

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

    function renderInputGrid() {
        var i;
        var gridHtml = '';
        d3.select('#input-grid')
            .selectAll('text')
            .data(_.range(minInput, maxInput))
            .enter()
            .append('text')
            .attr('x', function(d, i) {
                var offset = i % inputGridWidth;
                return offset * inputRectSize;
            })
            .attr('y', function(d, i) {
                var offset = Math.floor(i / inputGridWidth);
                return offset * inputRectSize + inputRectSize;
            })
            .attr('id', function(d, i) { return 'text-' + i; })
            .attr('index', function(d, i) { return i; })
            .attr('width', inputRectSize)
            .attr('height', inputRectSize)
            .html(function(d, i) {
                return i;
            });
    }

    function addInputClickHander() {
        $('text').click(function(evt) {
            inputValue = parseInt($(this).html());
            inputEncoding = scalarEncoder.encode(inputValue);
            spClient.compute(inputEncoding, function(spBits) {
                SDR.draw(inputEncoding, 'input-encoding', {
                    spartan: true,
                    size: 30
                });
                SDR.draw(spBits.activeColumns, 'active-columns', {
                    spartan: true,
                    size: 30
                });
            });
        });
    }

    function initSp(callback) {
        var spParams = {
            inputDimensions: inputDimensions,
            columnDimensions: columnDimensions,
            globalInhibition: globalInhibition,
            wrapAround: wrapAround
        };
        // Grab the user-controlled parameters from the interface object.
        _.each(spScalarParams, function(val, codeName) {
            spParams[codeName] = val.val;
        });
        spClient = new HTM.SpatialPoolerClient();
        loading(true);
        spClient.initialize(spParams, function() {
            if (inputEncoding) {
                spClient.compute(inputEncoding, function(spBits) {
                    loading(false);
                    SDR.draw(spBits.activeColumns, 'active-columns', {
                        spartan: true,
                        size: 30
                    });
                });
            } else {
                loading(false);
            }
            callback();
        });
    }

    function renderParams() {
        var data = {left: [], right: []};
        var count = 0;
        _.each(spScalarParams, function(val, codeName) {
            var viewObj = {
                id: codeName,
                name: val.name
            };
            if (count % 2 == 0) {
                data.left.push(viewObj);
            } else {
                data.right.push(viewObj);
            }
            count++;
        });
        $spScalarParams.html(spScalarParamsTmpl(data));
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
                        initSp(function() {
                            updateUi();
                        });
                    }
                },
                slide: function(event, ui) {
                    val.displayEl.html(ui.value);
                }
            });
        });
        $('#globalInhibition').on('switchChange.bootstrapSwitch', function(event, state) {
            if (waitingForServer) {
                console.log('Sorry, still waiting for server-side SP...');
                event.preventDefault();
            } else {
                globalInhibition = state;
                initSp(function() {
                    updateUi();
                });
            }
        });
        $('#wrapAround').on('switchChange.bootstrapSwitch', function(event, state) {
            if (waitingForServer) {
                console.log('Sorry, still waiting for server-side SP...');
                event.preventDefault();
            } else {
                wrapAround = state;
                initSp(function() {
                    updateUi();
                });
            }
        });
    }

    function updateUi() {
        _.each(spScalarParams, function(val, codeName) {
            val.displayEl.html(val.val);
        });
    }

    initSp(function() {
        renderParams();
        renderInputGrid();
        addInputClickHander();
        updateUi();
    });

});
