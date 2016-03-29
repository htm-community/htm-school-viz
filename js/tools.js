$(function() {

    var DEFAULT_SPARSITY = 0.02;

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function flip(bit) {
        if (bit == 0) return 1;
        return 0;
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

        addNoise: function(sdr, percentNoise) {
            var noisy = [];
            var noiseLevel = Math.floor(this.population(sdr) * percentNoise);
            //var numMissBits = this.population(sdr) * noiseLevel;
            var activeBits = this.getActiveBits(sdr);
            var inactiveBits = this.getInactiveBits(sdr);
            var toFlip = [];
            _.times(noiseLevel, function() {
                toFlip.push(
                    activeBits.splice(_.random(activeBits.length - 1), 1)[0]
                );
                toFlip.push(
                    inactiveBits.splice(_.random(inactiveBits.length - 1), 1)[0]
                );
            });
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
        }

    };
});

