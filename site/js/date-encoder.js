$(function () {

    var date = moment();
    var encoder = new HTM.encoders.DateEncoder();
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

    var $datePicker = $('#datetimepicker1').datetimepicker({
        defaultDate: date,
        keepOpen: true,
        showTodayButton: true
    });
    var $compareSwitch = $('#compare').bootstrapSwitch({state: false});


    function encodeDate(d) {
        lastSeasonEncoding = seasonEncoding;
        lastDowEncoding = dowEncoding;
        lastWeekendEncoding = weekendEncoding;
        lastTodEncoding = todEncoding;
        lastEncoding = encoding;
        seasonEncoding = encoder.encodeSeason(d);
        dowEncoding = encoder.encodeDayOfWeek(d);
        weekendEncoding = encoder.encodeWeekend(d);
        todEncoding = encoder.encodeTimeOfDay(d);
        encoding = encoder.encode(d);

        if (lastEncoding && compare) {
            SDR.drawComparison(lastSeasonEncoding, seasonEncoding, 'season-sdr', {
                spartan: true,
                size: 40
            });
            SDR.drawComparison(lastDowEncoding, dowEncoding, 'dow-sdr', {
                spartan: true,
                size: 40
            });
            SDR.drawComparison(lastWeekendEncoding, weekendEncoding, 'weekend-sdr', {
                spartan: true,
                size: 40
            });
            SDR.drawComparison(lastTodEncoding, todEncoding, 'tod-sdr', {
                spartan: true,
                size: 40
            });
            SDR.drawComparison(lastEncoding, encoding, 'encoding', {
                spartan: true,
                size: 40
            });
        } else {
            SDR.draw(seasonEncoding, 'season-sdr', {
                spartan: true,
                size: 40
            });
            SDR.draw(dowEncoding, 'dow-sdr', {
                spartan: true,
                size: 40
            });
            SDR.draw(weekendEncoding, 'weekend-sdr', {
                spartan: true,
                size: 40
            });
            SDR.draw(todEncoding, 'tod-sdr', {
                spartan: true,
                size: 40
            });
            SDR.draw(encoding, 'encoding', {
                spartan: true,
                size: 40
            });
        }
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
    }

    function initUi() {
        addHandlers();
        updateUi();
    }

    initUi();

});
