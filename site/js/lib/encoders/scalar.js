// Load this encoder first.

window.HTM = {};
HTM.encoders = {};

$(function() {

    function ScalarEncoder(n, w, minValue, maxValue) {
        var extentWidth = maxValue - minValue;
        // Distribute nBuckets points along the domain [minValue, maxValue],
        // including the endpoints. The resolution is the width of each band
        // between the points.
        var nBuckets = n - (w - 1);
        var nBands = nBuckets - 1;
        this.n = n;
        this.w = w;
        this.bucketWidth = extentWidth / nBands;
        this.minValue = minValue;
        this.maxValue = maxValue;
    }

    ScalarEncoder.prototype.encode = function(input) {
        var i;
        var iBucket;
        var firstBit;
        var output = [];
        var minValue = this.minValue;
        var maxValue = this.maxValue;

        // Always clip input.
        if (input < minValue) {
            input = minValue;
        }
        if (input > maxValue ) {
            input = maxValue;
        }

        iBucket = Math.round((input - minValue) / this.bucketWidth);
        firstBit = iBucket;

        _.times(this.n, function() {
            output.push(0);
        });

        for (i = 0; i < this.w; i++) {
            output[firstBit + i] = 1;
        }

        return output;
    };

    function PeriodicScalarEncoder(n, w, minValue, maxValue) {
        var extentWidth = maxValue - minValue;
        // Distribute nBuckets points along the domain [minValue, maxValue],
        // including the endpoints. The resolution is the width of each band
        // between the points.
        var nBuckets = n;
        this.n = n;
        this.w = w;
        this.bucketWidth = extentWidth / nBuckets;
        this.minValue = minValue;
        this.maxValue = maxValue;
    }

    PeriodicScalarEncoder.prototype.encode = function(input) {
        var output = [];
        var i, index;
        var iBucket = Math.floor((input - this.minValue) / this.bucketWidth);
        var middleBit = iBucket;
        var reach = (this.w - 1) / 2.0;
        var left = Math.floor(reach);
        var right = Math.ceil(reach);

        if (input < this.minValue || input >= this.maxValue) {
            throw Error('Input out of bounds: ' + input);
        }

        _.times(this.n, function() {
            output.push(0);
        });

        output[middleBit] = 1;

        for (i = 1; i <= left; i++) {
            index = middleBit - 1;
            if (index < 0) {
                index = index + this.n;
            }
            if (index > this.n) {
                throw Error('out of bounds');
            }
            output[index] = 1;
        }
        for (i = 1; i <= right; i++) {
            if ((middleBit + i) % this.n > this.n) {
                throw Error('out of bounds');
            }
            output[(middleBit + i) % this.n] = 1;
        }
        return output;

    };

    HTM.encoders.ScalarEncoder = ScalarEncoder;
    HTM.encoders.PeriodicScalarEncoder = PeriodicScalarEncoder;

});

//HTM.encoders.scalar = function(n, w, minValue, maxValue, input) {
//    var extentWidth = maxValue - minValue;
//    // Distribute nBuckets points along the domain [minValue, maxValue],
//    // including the endpoints. The resolution is the width of each band
//    // between the points.
//    var nBuckets = n - (w - 1);
//    var nBands = nBuckets - 1;
//    var bucketWidth = extentWidth / nBands;
//    var i;
//    var iBucket;
//    var firstBit;
//    var output = [];
//
//    // Always clip input.
//    if (input < minValue) {
//        input = minValue;
//    }
//    if (input > maxValue ) {
//        input = maxValue;
//    }
//
//    iBucket = Math.round((input - minValue) / bucketWidth);
//    firstBit = iBucket;
//
//    _.times(n, function() {
//        output.push(0);
//    });
//
//    for (i = 0; i < w; i++) {
//        output[firstBit + i] = 1;
//    }
//
//    return output;
//};
