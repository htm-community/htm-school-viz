$(function() {

    function DateEncoder() {
        this.width = 0;
        this.description = [];
        this.name = name;

        this.seasonEncoder = new HTM.encoders.PeriodicScalarEncoder(366, 92, 0, 366);
        this.width += 366;

        this.dayOfWeekEncoder = new HTM.encoders.PeriodicScalarEncoder(7, 1, 0, 7);
        this.width += 7;

        this.weekendEncoder = new HTM.encoders.PeriodicScalarEncoder(2, 1, 0, 2);
        this.width += 2;

        this.timeOfDayEncoder = new HTM.encoders.PeriodicScalarEncoder(24, 4, 0, 24);
        this.width += 24;
    }

    DateEncoder.prototype.encodeSeason= function(input) {
        return this.seasonEncoder.encode(input.dayOfYear());
    };

    DateEncoder.prototype.encodeDayOfWeek = function(input) {
        return this.dayOfWeekEncoder.encode(input.day());
    };

    DateEncoder.prototype.encodeWeekend= function(input) {
        var isWeekend = [0,6].indexOf(input.day()) > -1 ? 1 : 0;
        return this.weekendEncoder.encode(isWeekend);
    };

    DateEncoder.prototype.encodeTimeOfDay= function(input) {
        return this.timeOfDayEncoder.encode(input.hour());
    };


    DateEncoder.prototype.encode = function(input) {
        var season = this.encodeSeason(input);
        var dayVal = this.encodeDayOfWeek(input);
        var weekendVal = this.encodeWeekend(input);
        var timeVal = this.encodeTimeOfDay(input);
        return season.concat(dayVal).concat(weekendVal).concat(timeVal);
    };

    HTM.encoders.DateEncoder = DateEncoder;

});