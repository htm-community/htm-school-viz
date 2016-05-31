window.HTM = {};

HTM.encoders = {};

HTM.encoders.scalar = {};

HTM.encoders.scalar.encode = function(n, w, minValue, maxValue, input) {
    var extentWidth = maxValue - minValue;
    // Distribute nBuckets points along the domain [minValue, maxValue],
    // including the endpoints. The resolution is the width of each band
    // between the points.
    var nBuckets = n - (w - 1);
    var nBands = nBuckets - 1;
    var bucketWidth_ = extentWidth / nBands;
    var i;
    var iBucket;
    var firstBit;
    var output = [];

    // Always clip input.
    if (input < minValue) {
        input = minValue;
    }
    if (input > maxValue ) {
        input = maxValue;
    }

    iBucket = Math.round((input - minValue) / bucketWidth_);
    firstBit = iBucket;

    _.times(n, function() {
        output.push(0);
    });

    for (i = 0; i < w; i++) {
        output[firstBit + i] = 1;
    }

    return output;
};