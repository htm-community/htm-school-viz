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
        var result = new Big(1);
        var bigI, i;
        for (i = 1; i <= n; i++) {
            bigI = new Big(i);
            result = bigI.times(result);
        }
        return result;
    }

    function overflowSafeUniqueness(n, w) {
        var bigN = new Big(n);
        var bigW = new Big(w);

        var nf = factorial(bigN);
        var wf = factorial(bigW);
        var nwf = factorial(bigN.minus(bigW));

        return nf.div(wf.times(nwf));
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

        setW: function(sdr, w) {
            var pop = this.population(sdr);
            while (pop !== w) {
                if (pop < w) {
                    sdr[_.sample(this.getInactiveBits(sdr))] = 1;
                    pop++;
                } else {
                    sdr[_.sample(this.getActiveBits(sdr))] = 0;
                    pop--;
                }
            }
            return sdr;
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
            return this._getUniqueness(sdr.length, this.population(sdr));
        },

        _getUniqueness: function(n, w) {
            return overflowSafeUniqueness(n, w);
        },

        getOverlapSet: function(sdr, b, w) {
            var n = sdr.length;
            var wx = this.population(sdr);
            return this._getOverlapSet(n, wx, b, w);
        },

        _getOverlapSet: function(n, wx, b, w) {
            var term1 = this._getUniqueness(wx, b);
            var n2 = n - wx;
            var w2 = w - b;
            var term2 = this._getUniqueness(n2, w2);
            return term1.times(term2);
        },

        getExactMatchProbability: function(sdr) {
            return new Big(1) / this.getUniqueness(sdr);
        },

        subsample: function(sdr, percentToSample) {
            var onBits = [];
            var sampledOnBits = [];
            var percent = 1.0 - percentToSample;
            var bitsToRemove = Math.floor(percent * this.population(sdr));
            var randomBit;

            _.each(sdr, function(bit, index) {
                if (bit == 1) onBits.push(index);
            });

            while (bitsToRemove > 0) {
                randomBit = _.sample(onBits);
                sampledOnBits.push(randomBit);
                onBits.splice(onBits.indexOf(randomBit), 1);
                bitsToRemove--;
            }

            return _.map(sdr, function(bit, index) {
                var out = bit;
                if (bit == 1 && sampledOnBits.indexOf(index) > -1) {
                    out = 0;
                }
                return out;
            });
        }

    };
});
