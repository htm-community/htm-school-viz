$(function() {

    var DEFAULT_SPARSITY = 0.02;

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function flip(bit) {
        if (bit == 0) return 1;
        return 0;
    }

    function factorial(n) {
        var result = math.bignumber(1);
        for (var i = 1; i <= n; i++) {
            var bigI = math.bignumber(i);
            result = math.multiply(bigI, result);
        }
        return result;
    }

    function overflowSafeUniqueness(n, w) {
        var bigN = math.bignumber(n);
        var bigW = math.bignumber(w);

        var nf = factorial(bigN);
        var wf = factorial(bigW);
        var nwf = factorial(math.subtract(bigN, bigW));

        return math.number(math.divide(nf, math.multiply(wf, nwf)));

    }

    window.SDR.tools = {

        getRandom: function(size, sparsity) {
            var out = [];
            var randomIndex = undefined;

            if (sparsity == undefined) {
                sparsity = DEFAULT_SPARSITY;
            }
            // Fill array with zeros.
            while(out.length < size) {
                out.push(0);
            }
            // If not sparse enough, randomly flip 0 bits to 1.
            while (this.population(out) / size < sparsity) {
                // Make a random 0 bit into a 1.
                randomIndex = getRandomInt(0, size);
                if (out[randomIndex] == 0) {
                    out[randomIndex] = 1;
                }
            }

            return out;
        },

        getActiveBits: function(sdr) {
            var active = [];
            _.each(sdr, function(bit, i) {
                if (bit == 1) active.push(i);
            });
            return active;
        },

        getInactiveBits: function(sdr) {
            var inactive = [];
            _.each(sdr, function(bit, i) {
                if (bit == 0) inactive.push(i);
            });
            return inactive;
        },

        // Adds a percent noise by turning on X percent of the off bits and
        // turning off X percent of the on bits.
        addNoise: function(sdr, percentNoise) {
            var noisy = [];
            // The noiseLevel will be the number of total bits to flip.
            var noiseLevel = Math.floor(this.population(sdr) * percentNoise);
            var activeBits = this.getActiveBits(sdr);
            var inactiveBits = this.getInactiveBits(sdr);
            var toFlip = [];
            // Populate the indices of the bits we want to flip with noise.
            _.times(noiseLevel, function() {
                toFlip.push(
                    activeBits.splice(_.random(activeBits.length - 1), 1)[0]
                );
                toFlip.push(
                    inactiveBits.splice(_.random(inactiveBits.length - 1), 1)[0]
                );
            });
            // Flip them bits into a new array output.
            _.each(sdr, function(bit, i) {
                var newBit = bit;
                if (toFlip.indexOf(i) >= 0) {
                    newBit = flip(bit);
                }
                noisy.push(newBit);
            });
            return noisy;
        },

        population: function(sdr) {
            return _.reduce(sdr, function(sum, n) {
                return sum + n;
            }, 0);
        },

        sparsity: function(sdr) {
            var onBits = _.filter(sdr, function(bit) {
                return bit == 1;
            }).length;
            return onBits / sdr.length
        },

        overlap: function(left, right) {
            return _.map(left, function(leftBit, index) {
                var rightBit = right[index];
                if (leftBit == 1 && rightBit == 1) {
                    return 1;
                }
                return 0;
            });
        },

        union: function(left, right) {
            return _.map(left, function(leftBit, index) {
                var rightBit = right[index];
                if (leftBit == 1 || rightBit == 1) {
                    return 1;
                }
                return 0;
            });
        },

        getUniqueness: function(sdr) {
            return overflowSafeUniqueness(sdr.length, this.population(sdr));
        },

        getOverlapSet: function(sdr, b) {
            var n = sdr.length;
            var w = this.population(sdr);
            var term1 = overflowSafeUniqueness(n, w);
            var n2 = n - w;
            var w2 = w - b;
            var term2 = overflowSafeUniqueness(n2, w2);
            return term1 * term2;
        }

    };
});
