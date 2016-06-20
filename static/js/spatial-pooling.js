$(function() {

    var inputN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 100;
    var inputRange = maxInput - minInput;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        inputN, inputW, minInput, maxInput - 1
    );

    var inputRectSize = 40;
    var inputGridWidth = Math.floor(Math.sqrt(inputRange));

    var spParams = {
        inputDimensions: [inputN],
        columnDimensions: [2048],
        potentialRadius: 16,
        potentialPct: 0.85,
        globalInhibition: false,
        localAreaDensity: -1.0,
        numActiveColumnsPerInhArea: 10.0,
        stimulusThreshold: 0,
        synPermInactiveDec: 0.008,
        synPermActiveInc: 0.05,
        synPermConnected: 0.10,
        minPctOverlapDutyCycle: 0.001,
        minPctActiveDutyCycle: 0.001,
        dutyCyclePeriod: 1000,
        maxBoost: 1.0,
        seed: -1,
        wrapAround: true
    };

    var spClient;

    var $inputGrid = $('#input-grid');

    function runSp(encoding, callback) {
        spClient.compute(encoding, callback);
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
            var value = parseInt($(this).html());
            var encoding = scalarEncoder.encode(value);
            SDR.draw(encoding, 'input-encoding', {
                spartan: true,
                size: 30
            });
            runSp(encoding, function(spBits) {
                SDR.draw(spBits.activeColumns, 'active-columns', {
                    size: 30
                });
            });
        });
    }

    function initSp(callback) {
        spClient = new HTM.SpatialPoolerClient();
        spClient.initialize(spParams, callback);
    }

    initSp(function() {
        renderInputGrid();
        addInputClickHander();
    });

});
