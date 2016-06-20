$(function() {

    var INITIAL_BUCKETS = 1000;

    /*
     Translated from https://github.com/rhyolight/nupic/blob/17a2320b7e23f28de63522fb3c41af639c499639/src/nupic/encoders/random_distributed_scalar.py
     */
    function RDSE(resolution, n, w) {
        this.resolution = resolution;
        this.n = n;
        this.w = w;
        this._maxOverlap = 2;
        this.minIndex = undefined;
        this.maxIndex = undefined;
        this._offset = undefined;
        this._initializeBucketMap(INITIAL_BUCKETS, this._offset);
    }

    RDSE.prototype._initializeBucketMap = function(maxBuckets, offset) {
        var me = this;
        this._maxBuckets = maxBuckets;
        this.minIndex = this._maxBuckets / 2;
        this.maxIndex = this._maxBuckets / 2;
        this._offset = offset;
        this.bucketMap = {};

        this.bucketMap[this.minIndex] = function(n) {
            var i = 0;
            var r = [];
            for (; i < me.n; i++) {
                r.push(i);
            }
            return _.shuffle(r);
        }().splice(0, this.w);

        this.numTries = 0;
    };

    RDSE.prototype._countOverlapIndices = function(i, j) {
        //Return the overlap between bucket indices i and j
        if (this.bucketMap[i] !== undefined && this.bucketMap[j] !== undefined) {
            return this._countOverlap(this.bucketMap[i], this.bucketMap[j]);
        } else {
            throw Error("Either i or j don't exist");
        }
    };

    RDSE.prototype._overlapOK = function(i, j, opts) {
        //Return True if the given overlap between bucket indices i and j are
        //acceptable. If overlap is not specified, calculate it from the bucketMap
        var overlap = opts.overlap;
        if (overlap == undefined) {
            overlap = this._countOverlapIndices(i, j);
        }
        if (Math.abs(i - j) < this.w) {
            return (overlap == (this.w - Math.abs(i - j)));
        } else {
            return (overlap <= this._maxOverlap);
        }

    };

    RDSE.prototype.getBucketIndices = function(x) {
        var bucketIdx;

        if (this._offset == undefined) {
            this._offset = x;
        }

        bucketIdx = this._maxBuckets / 2 + parseInt(Math.round((x - this._offset) / this.resolution));

        console.log('value: %s, bucket: %s', x, bucketIdx);

        if (bucketIdx < 0) {
            console.log('reached min buckets');
            bucketIdx = 0;
        } else if (bucketIdx >= this._maxBuckets) {
            console.log('reached max buckets');
            bucketIdx = this._maxBuckets - 1;
        }
        return [bucketIdx];
    };

    RDSE.prototype._countOverlap = function(rep1, rep2) {
        return SDR.tools.getOverlapScore(rep1, rep2);
    };

    RDSE.prototype._newRepresentationOK = function(newRep, newIndex) {
        var newRepBinary = [];
        var midIdx = this._maxBuckets / 2;
        var runningOverlap;
        var me = this;
        var returnFalse = false;

        //Return True if this new candidate representation satisfies all our overlap
        //rules. Since we know that neighboring representations differ by at most
        //one bit, we compute running overlaps.
        if (newRep.length != this.w) {
            return false;
        }
        if (newIndex < this.minIndex - 1 || newIndex > this.maxIndex + 1) {
            throw Error('newIndex must be within one of existing indices');
        }

        // A binary representation of newRep. We will use this to test containment
        _.times(this.n, function() {
            newRepBinary.push(false);
        });
        newRepBinary[newRep] = true;
        // Start by checking the overlap at minIndex
        runningOverlap = this._countOverlap(this.bucketMap[this.minIndex], newRep);
        if (! this._overlapOK(this.minIndex, newIndex, {overlap: runningOverlap})) {
            return false;
        }

        // Compute running overlaps all the way to the midpoint
        _.each(_.range(this.minIndex + 1, midIdx + 1), function(i) {
            // This is the bit that is going to change
            var newBit = (i - 1) % me.w;
            // Update our running overlap
            if (newRepBinary[me.bucketMap[i - 1][newBit]]) {
                runningOverlap--;
            }
            if (newRepBinary[me.bucketMap[i][newBit]]) {
                runningOverlap++;
            }
            // Verify our rules
            if (! me._overlapOK(i, newIndex, {overlap: runningOverlap})) {
                returnFalse = true;
            }
        });
        if (returnFalse) return false;

        // At this point, runningOverlap contains the overlap for midIdx
        // Compute running overlaps all the way to maxIndex
        _.each(_.range(midIdx + 1, this.maxIndex + 1), function(i) {
            // This is the bit that is going to change
            var newBit = i % me.w;
            // Update our running overlap
            if (newRepBinary[me.bucketMap[i - 1][newBit]]) {
                runningOverlap--;
            }
            if (newRepBinary[me.bucketMap[i][newBit]]) {
                runningOverlap++;
            }
            // Verify our rules
            if (! me._overlapOK(i, newIndex, {overlap: runningOverlap})) {
                returnFalse = true;
            }
        });
        return ! returnFalse;
    };

    RDSE.prototype._newRepresentation = function(index, newIndex) {
        var newRepresentation = this.bucketMap[index].slice();
        var ri = newIndex % this.w;
        var newBit = _.random(this.n);
        newRepresentation[ri] = newBit;
        while ((this.bucketMap[index].indexOf(newBit) > -1)
        || this._newRepresentationOK(newRepresentation, newIndex)) {
            this.numTries++;
            newBit = _.random(this.n);
            newRepresentation[ri] = newBit;
        }
        return newRepresentation;
    };

    RDSE.prototype._createBucket = function(index) {
        //Create the given bucket index. Recursively create as many in-between
        //bucket indices as necessary.
        if (index < this.minIndex) {
            if (index == this.minIndex - 1) {
                // Create a new representation that has exactly w-1 overlapping bits
                // as the min representation
                this.bucketMap[index] = this._newRepresentation(this.minIndex, index);
                this.minIndex = index;
            } else {
                // Recursively create all the indices above and then this index
                this._createBucket(index + 1);
                this._createBucket(index);
            }
        } else {
            if (index == this.maxIndex + 1) {
                // Create a new representation that has exactly w-1 overlapping bits
                // as the max representation
                this.bucketMap[index] = this._newRepresentation(this.maxIndex, index);
                this.maxIndex = index;
            } else {
                // Recursively create all the indices below and then this index
                this._createBucket(index - 1);
                this._createBucket(index);
            }
        }
    };

    RDSE.prototype.mapBucketIndexToNonZeroBits = function(index) {
        if (index < 0) {
            index = 0;
        }

        if (index >= this._maxBuckets) {
            index = this._maxBuckets - 1;
        }

        if (_.keys(this.bucketMap).indexOf(index.toString()) == -1) {
            this._createBucket(index);
        }
        return this.bucketMap[index];
    };

    RDSE.prototype.encode = function(x) {
        //# Get the bucket index to use
        var bucketIdx = this.getBucketIndices(x)[0];
        var output = [];

        //# None is returned for missing value in which case we return all 0's.
        _.times(this.n, function() {
            output.push(0);
        });

        if (bucketIdx !== undefined) {
            _.each(this.mapBucketIndexToNonZeroBits(bucketIdx), function(i) {
                output[i] = 1;
            });
        }
        return output;
    };

    HTM.encoders.RDSE = RDSE;

});