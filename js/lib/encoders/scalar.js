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

    HTM.encoders.ScalarEncoder = ScalarEncoder;

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
