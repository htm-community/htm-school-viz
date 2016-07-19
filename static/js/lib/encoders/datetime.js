$(function() {

    var DEFAULT_BUCKET_WIDTH = 21;

    function DateEncoder(width) {
        this.description = [];
        this.name = name;
        this.bucketWidth = width || DEFAULT_BUCKET_WIDTH;

        this.seasonEncoder = new HTM.encoders.PeriodicScalarEncoder(null, this.bucketWidth, 91.5, 0, 366);
        this.dayOfWeekEncoder = new HTM.encoders.PeriodicScalarEncoder(null, this.bucketWidth, 1, 0, 7);
        this.weekendEncoder = new HTM.encoders.PeriodicScalarEncoder(null, this.bucketWidth, 1, 0, 2);
        this.timeOfDayEncoder = new HTM.encoders.PeriodicScalarEncoder(null, this.bucketWidth, 9.49, 0, 24);
    }

    DateEncoder.prototype.getWidth = function() {
        return this.seasonEncoder.getWidth()
            + this.dayOfWeekEncoder.getWidth()
            + this.weekendEncoder.getWidth()
            + this.timeOfDayEncoder.getWidth();
    };

    DateEncoder.prototype.encodeSeason= function(input, bucketWidth) {
        if (bucketWidth && bucketWidth != this.bucketWidth) {
            this.seasonEncoder = new HTM.encoders.PeriodicScalarEncoder(null, bucketWidth, 91.5, 0, 366);
        }
        return this.seasonEncoder.encode(input.dayOfYear());
    };

    DateEncoder.prototype.encodeDayOfWeek = function(input, bucketWidth) {
        if (bucketWidth && bucketWidth != this.bucketWidth) {
            this.dayOfWeekEncoder = new HTM.encoders.PeriodicScalarEncoder(null, bucketWidth, 1, 0, 6);
        }
        return this.dayOfWeekEncoder.encode(input.day());
    };

    DateEncoder.prototype.encodeWeekend= function(input, bucketWidth) {
        if (bucketWidth && bucketWidth != this.bucketWidth) {
            this.weekendEncoder = new HTM.encoders.PeriodicScalarEncoder(null, bucketWidth, 1, 0, 1);
        }
        var isWeekend = [0,6].indexOf(input.day()) > -1 ? 1 : 0;
        return this.weekendEncoder.encode(isWeekend);
    };

    DateEncoder.prototype.encodeTimeOfDay= function(input, bucketWidth) {
        if (bucketWidth && bucketWidth != this.bucketWidth) {
            this.timeOfDayEncoder = new HTM.encoders.PeriodicScalarEncoder(null, bucketWidth, 9.49, 0, 23);
        }
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