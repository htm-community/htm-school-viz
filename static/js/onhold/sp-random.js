$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    // SDR Viz params
    var vizWidth = 1400;
    var vizHeight = 800;

    var data, dataCursor;
    var dataMarker;
    var inputEncoding;
    var activeColumns;
    var overlaps;

    var getConnectedSynapses = false;
    var getPotentialPools = false;

    var playing = false;

    var spClient;
    var inputN = 400;

    // SP params we are not allowing user to change
    var inputDimensions = [inputN];
    var columnDimensions = [2048];
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var spViz;

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var transformDateIntoXValue;

    function loading(isLoading, isModal) {
        if (isModal == undefined) {
            isModal = true;
        }
        if (isLoading) {
            waitingForServer = true;
            if (! isModal) {
                $loading.addClass('little');
            }
            $loading.show();
        } else {
            waitingForServer = false;
            $loading.hide();
            $loading.removeClass('little');
        }
    }

    function initSp(callback) {
        loading(true);
        spClient.initialize(spParams.getParams(), function() {
            if (inputEncoding) {
                runOnePointThroughSp(null, true);
            } else {
                loading(false);
            }
            if (callback) callback();
        });
    }

    function runOnePointThroughSp(callback, preventAdvance) {
        inputEncoding = SDR.tools.getRandom(inputN, inputN / 10);

        // Run encoding through SP.
        loading(true, false);
        spClient.compute(inputEncoding, {
            getConnectedSynapses: getConnectedSynapses,
            getPotentialPools: getPotentialPools
        }, function(spBits) {
            activeColumns = spBits.activeColumns;
            overlaps = spBits.overlaps;
            spViz.render(
                inputEncoding,
                activeColumns,
                overlaps,
                spBits.connectedSynapses,
                spBits.potentialPools,
                vizWidth, vizHeight
            );
            if (preventAdvance == undefined || ! preventAdvance) {
                dataCursor++;
            }
            loading(false);
            if (callback) callback();
        });
    }

    function stepThroughData(callback) {
        if (!playing) {
            if (callback) callback();
            return;
        }
        runOnePointThroughSp(stepThroughData);
    }

    function addDataControlHandlers() {
        $('.player button').click(function(evt) {
            var $btn = $(this);
            if (this.id == 'play') {
                if ($btn.hasClass('btn-success')) {
                    pause();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-play');
                } else {
                    play();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-pause');
                }
                $btn.toggleClass('btn-success');
            } else if (this.id == 'stop') {
                stop();
            } else if (this.id == 'next') {
                runOnePointThroughSp();
            } else if (this.id == 'prev') {
                dataCursor--;
                runOnePointThroughSp(null, true);
            }
        });
    }

    function play() {
        playing = true;
        stepThroughData(function (err) {
            if (err) throw err;
        });
    }

    function pause() {
        playing = false;
    }

    function stop() {
        var $play = $('#play');
        playing = false;
        $play.find('span').attr('class', 'glyphicon glyphicon-play');
        $play.removeClass('btn-success');
        $('#input-chart').html('');
        drawInputChart('#input-chart');
    }

    spClient = new HTM.SpatialPoolerClient();
    spViz = new HTM.utils.sp.SPViz(
        spClient._id, '#sp-viz', spParams
    );

    spViz.onViewOptionChange(function(returnConnectedSynapses, returnPotentialPools) {
        getConnectedSynapses = returnConnectedSynapses;
        getPotentialPools = returnPotentialPools;
        runOnePointThroughSp(null, true);
    });

    spParams.render(function() {
        initSp(function() {
            addDataControlHandlers();
            runOnePointThroughSp();
        });
    }, function() {
        initSp();
    });

});
