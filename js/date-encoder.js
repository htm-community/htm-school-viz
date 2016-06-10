$(function () {

    var date = moment();
    var encoder = undefined;
    var seasonEncoding = undefined;
    var lastSeasonEncoding = undefined;
    var dowEncoding = undefined;
    var lastDowEncoding = undefined;
    var weekendEncoding = undefined;
    var lastWeekendEncoding = undefined;
    var todEncoding = undefined;
    var lastTodEncoding = undefined;
    var encoding = undefined;
    var lastEncoding = undefined;
    var compare = false;
    var rectSize = 20;
    var bigRectSize = 30;
    var bucketWidth = 21;
    var dowBucketWidth = bucketWidth;
    var weekendBucketWidth = bucketWidth;
    var todBucketWidth = bucketWidth;
    var seasonBucketWidth = bucketWidth;

    var $widthSlider = undefined;
    var $dowSlider = undefined;
    var $weekendSlider = undefined;
    var $todSlider = undefined;
    var $seasonSlider = undefined;
    var $datePicker = undefined;
    var $compareSwitch = undefined;

    var $widthDisplayValue = $('#width-display-value');


    function encodeDate(d) {
        lastSeasonEncoding = seasonEncoding;
        lastDowEncoding = dowEncoding;
        lastWeekendEncoding = weekendEncoding;
        lastTodEncoding = todEncoding;
        lastEncoding = encoding;
        encoder = new HTM.encoders.DateEncoder(bucketWidth);
        seasonEncoding = encoder.encodeSeason(d, seasonBucketWidth);
        dowEncoding = encoder.encodeDayOfWeek(d, dowBucketWidth);
        weekendEncoding = encoder.encodeWeekend(d, weekendBucketWidth);
        todEncoding = encoder.encodeTimeOfDay(d, todBucketWidth);
        encoding = encoder.encode(d);

        if (lastEncoding && compare) {
            SDR.drawComparison(lastSeasonEncoding, seasonEncoding, 'season-sdr', {
                spartan: true,
                size: rectSize
            });
            SDR.drawComparison(lastDowEncoding, dowEncoding, 'dow-sdr', {
                spartan: true,
                size: rectSize
            });
            SDR.drawComparison(lastWeekendEncoding, weekendEncoding, 'weekend-sdr', {
                spartan: true,
                size: rectSize
            });
            SDR.drawComparison(lastTodEncoding, todEncoding, 'tod-sdr', {
                spartan: true,
                size: rectSize
            });
            SDR.drawComparison(lastEncoding, encoding, 'encoding', {
                spartan: true,
                size: bigRectSize
            });
        } else {
            SDR.draw(seasonEncoding, 'season-sdr', {
                spartan: true,
                size: rectSize
            });
            SDR.draw(dowEncoding, 'dow-sdr', {
                spartan: true,
                size: rectSize
            });
            SDR.draw(weekendEncoding, 'weekend-sdr', {
                spartan: true,
                size: rectSize
            });
            SDR.draw(todEncoding, 'tod-sdr', {
                spartan: true,
                size: rectSize
            });
            SDR.draw(encoding, 'encoding', {
                spartan: true,
                size: bigRectSize
            });
        }
    }

    function acceptOnlyOdds(val, event) {
        var isOdd = val % 2 == 0;
        if (isOdd) {
            event.stopPropagation();
            event.preventDefault();
        }
        return isOdd;
    }

    function initComponents() {
        $datePicker = $('#datetimepicker1').datetimepicker({
            defaultDate: date,
            keepOpen: true,
            showTodayButton: true
        });
        $compareSwitch = $('#compare').bootstrapSwitch({state: false});
        $widthSlider = $('#width-slider').slider({
            min: 0,
            max: 100,
            value: bucketWidth,
            slide: function(event, ui) {
                if (acceptOnlyOdds(ui.value, event)) return;
                bucketWidth = ui.value;
                dowBucketWidth = bucketWidth;
                weekendBucketWidth = bucketWidth;
                todBucketWidth = bucketWidth;
                seasonBucketWidth = bucketWidth;
                updateUi();
            }
        });
        $dowSlider = $('#dow-slider').slider({
            min: 0,
            max: 100,
            value: dowBucketWidth,
            slide: function(event, ui) {
                if (acceptOnlyOdds(ui.value, event)) return;
                dowBucketWidth = ui.value;
                updateUi();
            }
        });
        $weekendSlider = $('#weekend-slider').slider({
            min: 0,
            max: 100,
            value: weekendBucketWidth,
            slide: function(event, ui) {
                if (acceptOnlyOdds(ui.value, event)) return;
                weekendBucketWidth = ui.value;
                updateUi();
            }
        });
        $todSlider = $('#tod-slider').slider({
            min: 0,
            max: 100,
            value: todBucketWidth,
            slide: function(event, ui) {
                if (acceptOnlyOdds(ui.value, event)) return;
                todBucketWidth = ui.value;
                updateUi();
            }
        });
        $seasonSlider = $('#season-slider').slider({
            min: 0,
            max: 100,
            value: seasonBucketWidth,
            slide: function(event, ui) {
                if (acceptOnlyOdds(ui.value, event)) return;
                seasonBucketWidth = ui.value;
                updateUi();
            }
        });
    }

    function addHandlers() {
        $datePicker.on('dp.change', function(e) {
            date = e.date;
            updateUi();
        });
        $compareSwitch.on('switchChange.bootstrapSwitch', function(evt, state) {
            compare = state;
            updateUi();
        });
    }

    function updateUi() {
        encodeDate(date);
        $widthDisplayValue.html(bucketWidth);
    }

    function initUi() {
        initComponents();
        addHandlers();
        updateUi();
    }

    initUi();

});
