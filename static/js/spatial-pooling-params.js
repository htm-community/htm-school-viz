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
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var $loading = $('#loading');

    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    function loading(isLoading) {
        if (isLoading) {
            waitingForServer = true;
            $loading.show();
        } else {
            waitingForServer = false;
            $loading.hide();
        }
    }

    function renderInputGrid() {
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
        $('text').click(function() {
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
        spClient = new HTM.SpatialPoolerClient();
        loading(true);
        spClient.initialize(spParams.getParams(), function() {
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
            if (callback) callback();
        });
    }

    spParams.render(function() {
        initSp();
    }, function() {
        initSp(function() {
            renderInputGrid();
            addInputClickHander();
        });
    });

});
