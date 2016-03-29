$(function() {

    var DEFAULT_SPARSITY = 0.02;

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
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

