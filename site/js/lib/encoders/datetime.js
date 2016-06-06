$(function() {

    function DateEncoder() {
        this.width = 0;
        this.description = [];
        this.name = name;

        //self.seasonEncoder = ScalarEncoder(w = w, minval=0, maxval=366,
        //    radius=radius, periodic=True,
        //    name="season", forced=forced)
        this.seasonEncoder = new HTM.encoders.PeriodicScalarEncoder(null, 20, 91.5, 0, 366);
        this.width += this.seasonEncoder.getWidth();

        //self.dayOfWeekEncoder = ScalarEncoder(w = w, minval=0, maxval=7,
        //    radius=radius, periodic=True,
        //    name="day of week", forced=forced)
        this.dayOfWeekEncoder = new HTM.encoders.PeriodicScalarEncoder(null, 1, 1, 0, 7);
        this.width += this.dayOfWeekEncoder.getWidth();

        //self.weekendEncoder = ScalarEncoder(w=weekend[0], minval=0, maxval=1,
        //    periodic=False, radius=weekend[1],
        //    name="weekend", forced=forced)
        this.weekendEncoder = new HTM.encoders.PeriodicScalarEncoder(null, 1, 1, 0, 2);
        this.width += this.weekendEncoder.getWidth();

        this.timeOfDayEncoder = new HTM.encoders.PeriodicScalarEncoder(null, 21, 9.49, 0, 24);
        this.width += this.timeOfDayEncoder.getWidth();
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