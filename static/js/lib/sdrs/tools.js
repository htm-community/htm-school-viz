$(function() {

    var DEFAULT_SPARSITY = 0.02;

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function flip(bit) {
        if (bit == 0) return 1;
        return 0;
    }

    function overflowSafeUniqueness(n, w) {
        var bigN = math.bignumber(n);
        var bigW = math.bignumber(w);

        var nf = math.factorial(bigN);
        var wf = math.factorial(bigW);
        var nwf = math.factorial(math.subtract(bigN, bigW));

        return math.divide(nf, math.multiply(wf, nwf));
    }

    window.SDR.tools = {

        getRandom: function(n, w) {
            var out = [];
            var randomIndex = undefined;
            var sparsity = undefined;

            if (w == undefined) {
                w = n * DEFAULT_SPARSITY;
            }

            sparsity = w / n;

            // Fill array with zeros.
            while(out.length < n) {
                out.push(0);
            }
            // If not sparse enough, randomly flip 0 bits to 1.
            while (this.population(out) / n < sparsity) {
                // Make a random 0 bit into a 1.
                randomIndex = getRandomInt(0, n);
                if (out[randomIndex] == 0) {
                    out[randomIndex] = 1;
                }
            }

            return out;
        },

        getEmpty: function(n) {
            var out = [];
            _.times(n, function() {
                out.push(0);
            });
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

        addBitNoise: function(sdr, noisyBits) {
            var noisy = [];
            var activeBits = this.getActiveBits(sdr);
            var inactiveBits = this.getInactiveBits(sdr);
            var toFlip = [];
            // Populate the indices of the bits we want to flip with noise.
            _.times(noisyBits, function() {
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

        // Flips every bit.
        invert: function(sdr) {
            return _.map(sdr, function(bit) {
                if (bit == 0) return 1;
                return 0;
            });
        },

        // Adds a percent noise by turning on X percent of the off bits and
        // turning off X percent of the on bits.
        addNoise: function(sdr, percentNoise) {
            // The noiseLevel will be the number of total bits to flip.
            var noiseLevel = Math.floor(this.population(sdr) * percentNoise);
            return this.addBitNoise(sdr, noiseLevel);
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
            return math.multiply(term1, term2);
        },

        getExactMatchProbability: function(sdr) {
            return math.bignumber(1) / this.getUniqueness(sdr);
        },

        getOverlapScore: function(left, right) {
            return this.population(this.overlap(left, right));
        },

        getMatchingBitIndices: function(left, right) {
            var bits = [];
            _.each(left, function(leftBit, i) {
                if (leftBit && right[i]) bits.push(i);
            });
            return bits;
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
        },

        calculateFalsePositiveProbability: function(n, leftW, rightW, theta) {
            var overlapSet = this._getOverlapSet(n, leftW, theta, rightW);
            var rightUniqueness, falsePosProbability;
            if (isFinite(overlapSet)) {
                rightUniqueness = this._getUniqueness(n, rightW);
                falsePosProbability = overlapSet.div(rightUniqueness);
            } else {
                falsePosProbability = NaN;
            }
            return falsePosProbability;
        },

        isMatch: function(left, right, theta) {
            return this.population(this.overlap(left, right)) >= theta;
        }

    };
});
