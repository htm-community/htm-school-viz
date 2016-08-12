$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    var playing = false;

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');

    var getConnectedSynapses;
    var getPotentialPools;

    var spClient;

    // SP params we are not allowing user to change
    var inputDimensions = [
        scalarN
        + dateEncoder.timeOfDayEncoder.getWidth()
        + dateEncoder.weekendEncoder.getWidth()
    ];
    var columnDimensions = [2048];
    var spParams = new HTM.utils.sp.Params(
        'sp-params', inputDimensions, columnDimensions
    );

    var chartWidth = 2000;
    var chartHeight = 300;

    var spViz;

    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

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
        spClient = new HTM.SpatialPoolerClient();
        loading(true);
        spClient.initialize(spParams.getParams(), function() {
            var inputChart = new HTM.utils.chart.InputChart(
                '#input-chart', '/static/data/hotgym-short.csv',
                chartWidth, chartHeight
            );

            spViz = new HTM.utils.sp.SPViz(
                spClient._id, '#sp-viz', spParams, inputChart, false
            );

            spViz.loadData(function(error) {
                loading(false);
                if (callback) callback(error);
            });
        });
    }

    function runOnePointThroughSp(callback) {
        var cursor = spViz.getCursor();
        var data = spViz.getData();
        var point = data[cursor];
        var date = moment(point.date);
        var power = parseFloat(point['consumption']);
        var encoding = [];
        var day = date.day();
        var isWeekend = (day == 6) || (day == 0);    // 6 = Saturday, 0 = Sunday

        // Update UI display of current data point.
        $powerDisplay.html(power);
        $todDisplay.html(date.format('h A'));
        $weekendDisplay.html(isWeekend ? 'yes' : 'no');

        // Encode data point into SDR.
        encoding = encoding.concat(scalarEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        encoding = encoding.concat(dateEncoder.encodeWeekend(date));

        // Run encoding through SP.
        spClient.compute(encoding, {
            getConnectedSynapses: getConnectedSynapses,
            getPotentialPools: getPotentialPools
        }, function(spBits) {
            spViz.render(
                encoding,
                spBits.activeColumns,
                spBits.overlaps,
                spBits.connectedSynapses,
                spBits.potentialPools
            );
            loading(false);
            if (callback) callback();
        });
    }

    function stepThroughData(callback) {
        if (! playing || spViz.isFinished()) {
            if (callback) callback();
            return;
        }
        spViz.next();
        runOnePointThroughSp(stepThroughData);
    }

    function addDataControlHandlers() {
        $('.player button').click(function() {
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
            } else if (this.id == 'next') {
                spViz.next();
            }
            runOnePointThroughSp();
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

    spParams.render(function() {
        initSp(function() {
            spViz.onViewOptionChange(function(returnConnectedSynapses, returnPotentialPools) {
                getConnectedSynapses = returnConnectedSynapses;
                getPotentialPools = returnPotentialPools;
                runOnePointThroughSp();
            });

            addDataControlHandlers();
            runOnePointThroughSp();
        });
    }, function() {
        initSp();
    });

});
