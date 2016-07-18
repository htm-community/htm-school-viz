$(function() {

    var scalarN = 400;
    var inputW = 21;
    var minInput = 0;
    var maxInput = 55;
    var scalarEncoder = new HTM.encoders.ScalarEncoder(
        scalarN, inputW, minInput, maxInput
    );
    var dateEncoder = new HTM.encoders.DateEncoder(51);

    var $powerDisplay = $('#power-display');
    var $todDisplay = $('#tod-display');
    var $weekendDisplay = $('#weekend-display');
    var $uniquenessDisplay = $('#uniqueness-display');

    var chartWidth = 1800;
    var chartHeight = 300;

    var inputChart = new HTM.utils.chart.InputChart(
        '#input-chart', '/static/data/hotgym-short.csv',
        chartWidth, chartHeight
    );

    function encode(point) {
        // Encode data point into SDR.
        var power = point.consumption;
        var date = moment(point.date);
        var encoding = [];
        encoding = encoding.concat(scalarEncoder.encode(power));
        encoding = encoding.concat(dateEncoder.encodeTimeOfDay(date));
        encoding = encoding.concat(dateEncoder.encodeWeekend(date));
        SDR.draw(encoding, 'sdr', {spartan: true, size: 60});

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

    inputChart.render(function() {
        inputChart.onMouseMove(function(point) {
            var date = moment(point.date);
            var power = point.consumption;
            var day = date.day();
            var isWeekend = (day == 6) || (day == 0);    // 6 = Saturday, 0 = Sunday
            $powerDisplay.html(power);
            $todDisplay.html(date.format('h A'));
            $weekendDisplay.html(isWeekend ? 'yes' : 'no');
            encode(point);
        });
    });


});
