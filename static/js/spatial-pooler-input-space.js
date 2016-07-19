$(function() {

    var scalarN = 400;
    var inputW = 27;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var rdse = new HTM.encoders.RDSE(2, scalarN, inputW);
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');
    var $uniquenessDisplay = $('#uniqueness-display');

    var chartWidth = 1800;
    var chartHeight = 260;

    var inputChart = new HTM.utils.chart.InputChart(
        '#input-chart', '/static/data/hotgym-short.csv',
        chartWidth, chartHeight
    );

    var point;
    var useRdse = false;
    var $useRdse = $('#use-rdse').bootstrapSwitch({state: useRdse});

    function updateUi() {
        var date = moment(point.date);
        var power = point.consumption;
        var day = date.day();
        var isWeekend = (day == 6) || (day == 0);    // 6 = Saturday, 0 = Sunday
        $powerDisplay.html(power);
        $todDisplay.html(date.format('h A'));
        $weekendDisplay.html(isWeekend ? 'yes' : 'no');
    }

    function encode() {
        // Encode data point into SDR.
        var power = point.consumption;
        var date = moment(point.date);
        var encoding = [];
        var powerEncoder = scalarEncoder;
        if (useRdse) {
            powerEncoder = rdse;
        }
        encoding = encoding.concat(powerEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        encoding = encoding.concat(dateEncoder.encodeWeekend(date));
        SDR.draw(encoding, 'sdr', {spartan: true, size: 56});

        var uniqueness = SDR.tools.getUniqueness(encoding);
        if (Number.isNaN(uniqueness)) {
            uniqueness = 'NaN';
        } else if (! isFinite(uniqueness)) {
            uniqueness = '&infin;';
        } else {
            uniqueness = Math.round(uniqueness);
        }
        $uniquenessDisplay.html(uniqueness);

    }

    $useRdse.on('switchChange.bootstrapSwitch', function(event, state) {
        useRdse = state;
        encode();
    });


    inputChart.render(function() {
        inputChart.onMouseMove(function(p) {
            point = p;
            updateUi();
            encode();
        });
    });


});
