/**
 * @author Ian Danforth <iandanforth@gmail.com>
 */

/*********************************/
// TODO - Find a better place for these



// This function is anonymous and immediately executed in order to 
// keep all values declared within the function scoped only within the 
// function, which prevents global namespace pollution.
(function() {

    // JAVASCRIPT MOD BUG FIX
    Number.prototype.mod = function(n) {
      return ((this%n)+n)%n;
    };

    // http://www.codinghorror.com/blog/2007/12/the-danger-of-naivete.html
    function shuffle(arr) {
            var i, temp, j, len = arr.length;
            for (i = 0; i < len; i++) {
                    j = ~~(Math.random() * (i + 1));
                    temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
            }
            return arr;
    }

    function arrayMean(arr) {
        // Returns the sum of an array of numbers
        var sum = 0;
        for(var i = 0; i < arr.length; i++){
            sum += arr[i];
        }
        
        return sum / arr.length;
    }

    function arrayProduct(arr) {
        //Returns the product of the values in an array
        var prod = 1;
        for (var i = 0; i < arr.length; i += 1) {
            prod *= arr[i];
        }
        return prod;
    }

    function arrayCumProduct(arr) {
        // Returns the cumulative product of the values in an array
        var result = [];
        for (var i = 0; i < arr.length; i += 1) {
            result.push(arrayProduct(arr.slice(0, i + 1)));
        }
        return result;
    }

    function defaultFor(arg, val) {
        return typeof arg !== 'undefined' ? arg : val;
    }

    function nDto1D(mat, dimCount) {
        // Returns a 1 dimensional array extracted from mat based on dimCount
        // Within a dimension all arrays must be of equal length.
        var oneDArray = [];
        var i, j, k;
        if (dimCount == 1) {
            oneDArray = mat;
        } else if (dimCount == 2) {
            for (i = 0; i < mat.length; i++) {
                for (j = 0; j < mat[0].length; j++) {
                    oneDArray.push(mat[i][j]);
                }
            }
        } else if (dimCount == 3) {
            for (i = 0; i < mat.length; i++) {
                for (j = 0; j < mat[0].length; j++) {
                    for (k = 0; k < mat[0][0].length; k++) {
                        oneDArray.push(mat[i][j][k]);
                    }
                }
            }
        } else {
          throw "Input Error: Inputs must have 1, 2 or 3 dimensions.";
        }
        
        return oneDArray;
    }

    function comparator( a, b ) {
        // Sorts an array by its second element. The first element must be
        // the original element index to provide stable sorting.
        
        if (a[1] == b[1]) {
            return a[0] - b[0];
        }
        
        return a[1] - b[1];
    }

    function comparatorReversed( a, b ) {
        // Reverse sorts an array by its second element. The first element must be
        // the original element index to provide stable sorting.
        if (a[1] == b[1]) {
            return a[0] - b[0];
        }
        
        return b[1] - a[1];
    }


    function cartesianProductOf() {
        // From http://cwestblog.com/2011/05/02/cartesian-product-of-multiple-arrays/
        return Array.prototype.reduce.call(arguments, function(a, b) {
            var ret = [];
            a.forEach(function(a) {
                b.forEach(function(b) {
                    ret.push(a.concat([b]));
                });
            });
            return ret;
        }, [[]]);
    }

    /*********************************/

    function SpatialPooler(inputDimensions,
                      columnDimensions,
                      potentialRadius,
                      potentialPct,
                      globalInhibition,
                      localAreaDensity,
                      numActiveColumnsPerInhArea,
                      stimulusThreshold,
                      synPermInactiveDec,
                      synPermActiveInc,
                      synPermConnected,
                      minPctOverlapDutyCycle,
                      minPctActiveDutyCycle,
                      dutyCyclePeriod,
                      maxBoost,
                      seed,
                      spVerbosity,
                      addNoise,
                      wrapPotentialPools,
                      initConnectedPct) {
        /*************************************************************
        Parameters:
        ----------------------------
        inputDimensions:      A number, list or numpy array representing the 
                              dimensions of the input vector. Format is [height, 
                              width, depth, ...], where each value represents the 
                              size of the dimension. For a topology of one dimesion 
                              with 100 inputs use 100, or [100]. For a two 
                              dimensional topology of 10x5 use [10,5]. 
        columnDimensions:     A number, list or numpy array representing the 
                              dimensions of the columns in the region. Format is 
                              [height, width, depth, ...], where each value 
                              represents the size of the dimension. For a topology 
                              of one dimesion with 2000 columns use 2000, or 
                              [2000]. For a three dimensional topology of 32x64x16 
                              use [32, 64, 16]. 
        potentialRadius:      This parameter deteremines the extent of the input 
                              that each column can potentially be connected to. 
                              This can be thought of as the input bits that
                              are visible to each column, or a 'receptiveField' of 
                              the field of vision. A large enough value will result 
                              in the 'global coverage', meaning that each column 
                              can potentially be connected to every input bit. This 
                              parameter defines a square (or hyper square) area: a 
                              column will have a max square potential pool with 
                              sides of length 2 * potentialRadius + 1. 
        potentialPct:         The percent of the inputs, within a column's
                              potential radius, that a column can be connected to. 
                              If set to 1, the column will be connected to every 
                              input within its potential radius. This parameter is 
                              used to give each column a unique potential pool when 
                              a large potentialRadius causes overlap between the 
                              columns. At initialization time we choose 
                              ((2*potentialRadius + 1)^(# inputDimensions) * 
                              potentialPct) input bits to comprise the column's
                              potential pool.
        globalInhibition:     If true, then during inhibition phase the winning 
                              columns are selected as the most active columns from 
                              the region as a whole. Otherwise, the winning columns 
                              are selected with resepct to their local 
                              neighborhoods. using global inhibition boosts 
                              performance x60.
        localAreaDensity:     The desired density of active columns within a local
                              inhibition area (the size of which is set by the
                              internally calculated inhibitionRadius, which is in
                              turn determined from the average size of the 
                              connected potential pools of all columns). The 
                              inhibition logic will insure that at most N columns 
                              remain ON within a local inhibition area, where N = 
                              localAreaDensity * (total number of columns in 
                              inhibition area).
        numActivePerInhArea:  An alternate way to control the density of the active
                              columns. If numActivePerInhArea is specified then
                              localAreaDensity must less than 0, and vice versa. 
                              When using numActivePerInhArea, the inhibition logic 
                              will insure that at most 'numActivePerInhArea' 
                              columns remain ON within a local inhibition area (the 
                              size of which is set by the internally calculated
                              inhibitionRadius, which is in turn determined from 
                              the average size of the connected receptive fields of 
                              all columns). When using this method, as columns 
                              learn and grow their effective receptive fields, the
                              inhibitionRadius will grow, and hence the net density
                              of the active columns will *decrease*. This is in
                              contrast to the localAreaDensity method, which keeps
                              the density of active columns the same regardless of
                              the size of their receptive fields.
        stimulusThreshold:    This is a number specifying the minimum number of
                              synapses that must be on in order for a columns to
                              turn ON. The purpose of this is to prevent noise 
                              input from activating columns. Specified as a percent 
                              of a fully grown synapse.
        synPermInactiveDec:   The amount by which an inactive synapse is 
                              decremented in each round. Specified as a percent of 
                              a fully grown synapse.
        synPermActiveInc:     The amount by which an active synapse is incremented 
                              in each round. Specified as a percent of a
                              fully grown synapse.
        synPermActiveSharedDec: *UNUSED/EXPERIMENTAL* The amount by which to
                              decrease the permanence of an active synapse which is
                              connected to another column that is active at the same
                              time. Specified as a percent of a fully grown synapse.
        synPermOrphanDec:     The amount by which to decrease the permanence of an 
                              active synapse on a column which has high overlap 
                              with the input, but was inhibited (an "orphan" 
                              column).
        synPermConnected:     The default connected threshold. Any synapse whose
                              permanence value is above the connected threshold is
                              a "connected synapse", meaning it can contribute to
                              the cell's firing.
        minPctOvlerapDutyCycle: A number between 0 and 1.0, used to set a floor on
                              how often a column should have at least
                              stimulusThreshold active inputs. Periodically, each
                              column looks at the overlap duty cycle of
                              all other column within its inhibition radius and 
                              sets its own internal minimal acceptable duty cycle 
                              to: minPctDutyCycleBeforeInh * max(other columns' 
                              duty cycles).
                              On each iteration, any column whose overlap duty 
                              cycle falls below this computed value will  get
                              all of its permanence values boosted up by
                              synPermActiveInc. Raising all permanences in response
                              to a sub-par duty cycle before  inhibition allows a
                              cell to search for new inputs when either its
                              previously learned inputs are no longer ever active,
                              or when the vast majority of them have been 
                              "hijacked" by other columns.
        minPctActiveDutyCycle: A number between 0 and 1.0, used to set a floor on
                              how often a column should be activate.
                              Periodically, each column looks at the activity duty 
                              cycle of all other columns within its inhibition 
                              radius and sets its own internal minimal acceptable 
                              duty cycle to:
                                minPctDutyCycleAfterInh *
                                max(other columns' duty cycles).
                              On each iteration, any column whose duty cycle after
                              inhibition falls below this computed value will get
                              its internal boost factor increased.
        dutyCyclePeriod:      The period used to calculate duty cycles. Higher
                              values make it take longer to respond to changes in
                              boost or synPerConnectedCell. Shorter values make it
                              more unstable and likely to oscillate.
        maxBoost:             The maximum overlap boost factor. Each column's
                              overlap gets multiplied by a boost factor
                              before it gets considered for inhibition.
                              The actual boost factor for a column is number 
                              between 1.0 and maxBoost. A boost factor of 1.0 is 
                              used if the duty cycle is >= minOverlapDutyCycle, 
                              maxBoost is used if the duty cycle is 0, and any duty 
                              cycle in between is linearly extrapolated from these 
                              2 endpoints.
        seed:                 Seed for our own pseudo-random number generator.
        spVerbosity:          spVerbosity level: 0, 1, 2, or 3
        addNoise:             If we should add noise to column activiations to break
                              ties. With this on you can never have *no* activity
                              which may or may not be desirable.
        wrapPotentialPools:   Determines if a column's connections can wrap around
                              to the other side of the input vector. This would be
                              unrealistic in terms of a topology, but is useful for
                              problems without topology.
        initConnectedPct:     The percentage of synapses in a column's potentialPool
                              which will start off with permanences above
                              synPermConnected, i.e. be connected.
                              
        *******************************************************************/
        
        var me = this;
        var i;

        this._seed = defaultFor(seed, -1);
        Math.seedrandom(this._seed);

        this._inputDimensions = defaultFor(inputDimensions, [ 32, 32 ] );
        this._columnDimensions = defaultFor(columnDimensions, [ 64, 64 ] );
        this._numInputs = arrayProduct(this._inputDimensions);
        this._numColumns = arrayProduct(this._columnDimensions);
        
        // Check input is valid
        console.assert(this._numInputs > 0,
                       "Number of inputs must be greater than 0");    
        console.assert(this._numColumns > 0,
                       "Number of columns must be greater than 0");
            
        // Save arguments
        this._potentialRadius = defaultFor(potentialRadius, this._numInputs);
        this._potentialPct = defaultFor(potentialPct, 0.5);
        this._globalInhibition = defaultFor(globalInhibition, false);
        this._localAreaDensity = defaultFor(localAreaDensity, -1.0);
        this._numActiveColumnsPerInhArea = defaultFor(numActiveColumnsPerInhArea,
                                                      10.0);
        this._stimulusThreshold = defaultFor(stimulusThreshold, 0);
        this._synPermInactiveDec = defaultFor(synPermInactiveDec, 0.01);
        this._synPermActiveInc = defaultFor(synPermActiveInc, 0.1);
        this._synPermConnected = defaultFor(synPermConnected, 0.10);
        this._synPermBelowStimulusInc = this._synPermConnected / 10;
        this._minPctOverlapDutyCycles = defaultFor(minPctOverlapDutyCycle, 0.001);
        this._minPctActiveDutyCycles = defaultFor(minPctActiveDutyCycle, 0.1);
        this._dutyCyclePeriod = defaultFor(dutyCyclePeriod, 1000);
        this._maxBoost = defaultFor(maxBoost, 10.0);
        this._spVerbosity = defaultFor(spVerbosity, 0);
        // NOTE: The below parameters are divergences from the py/cpp impl.
        this._addNoise = defaultFor(addNoise, true);    
        this._wrapPotentialPools = defaultFor(wrapPotentialPools, true);
        this._initConnectedPct = defaultFor(initConnectedPct, 0.5);
        
        // More input checking
        console.assert((this._numActiveColumnsPerInhArea > 0 ||
                        (this._localAreaDensity > 0 &&
                         this._localAreaDensity <= .5)));

        // Extra parameter settings
        this._synPermMin = 0.0;
        this._synPermMax = 1.0;
        this._synPermTrimThreshold = this._synPermActiveInc / 2.0;
        console.assert(this._synPermTrimThreshold < this._synPermConnected,
               "Bad paramaters passed. synPermTrimThreshold must be less " +
               "than half of synPermConnected" );
        this._updatePeriod = 50;

        // Internal state
        this._version = 1.0;
        this._iterationNum = 0;
        this._iterationLearnNum = 0;
        
        // Input Dimensions Component Counts
        // Build an array that helps us map 1D input indices back to ND originals
        this._inputDimCompCounts = this._calcDimensionComponentCounts(
                                                            this._inputDimensions);
        this._columnDimCompCounts = this._calcDimensionComponentCounts(
                                                            this._columnDimensions);
        //console.log("Dimension counts: ");
        //console.log(this._columnDimCompCounts);

        // Store the set of all inputs that are within each column's potential pool.
        // 'potentialPools' is a matrix, whose rows represent cortical columns, and 
        // whose columns represent the input bits. if potentialPools[i][j] == 1,
        // then input bit 'j' is in column 'i's potential pool. A column can only be 
        // connected to inputs in its potential pool. The indices refer to a 
        // falttenned version of both the inputs and columns. Namely, irrespective 
        // of the topology of the inputs and columns, they are treated as being a 
        // one dimensional array. Since a column is typically connected to only a 
        // subset of the inputs, many of the entries in the matrix are 0. Therefore 
        // the the potentialPool matrix is stored using the SparseBinaryMatrix 
        // class, to reduce memory footprint and compuation time of algorithms that 
        // require iterating over the data strcuture.
        
        //TODO find out if fixed array size is needed
        this._potentialPools = [];

        // Initialize the permanences for each column. Similar to the 
        // 'this._potentialPools', the permances are stored in a matrix whose rows
        // represent the cortial columns, and whose columns represent the input 
        // bits. if this._permanences[i][j] = 0.2, then the synapse connecting 
        // cortical column 'i' to input bit 'j'  has a permanence of 0.2.
        
        this._permanences = [];

        // NOTE: This is a divergence. In cpp/py this would be a binary array where
        // each connected index is 1. Here instead we are storing the indices only.
        // While this information is readily available from the 'this._permanence'
        // matrix, it is stored separately for efficiency purposes.
        
        this._connectedSynapses = [];
        for (i = 0; i < this._numColumns; i++) {
          this._connectedSynapses.push([]);
        }

        // Stores the number of connected synapses for each column. This is simply
        // a count of 'this._connectedSynapses'. Again, while this information is
        // readily available from 'this._connectedSynapses', it is stored separately
        // for efficiency purposes.
        
        this._connectedCounts = [];
        for (i = 0; i < this._numColumns; i++) {
          this._connectedCounts.push(0.0);
        }

        // Initialize the set of permanence values for each column. Ensure that 
        // each column is connected to enough input bits to allow it to be 
        // activated.
        
        for (i = 0; i < this._numColumns; i++) {
          var potential = me._mapPotential( i, this._wrapPotentialPools );
          //console.log("Potential pool");
          //console.log(potential);
          this._potentialPools.push(potential);
          perm = this._initPermanence(potential, this._initConnectedPct);
          //console.log("Initial perms");
          //console.log(perm);
          this._updatePermanencesForColumn(perm, i, raisePerm = true);
        }

        this._overlapDutyCycles = [];
        this._activeDutyCycles = [];
        this._minOverlapDutyCycles = [];
        this._minActiveDutyCycles = [];
        this._boostFactors = [];
        for (i = 0; i < this._numColumns; i++) {
            this._overlapDutyCycles.push(0.0);
            this._activeDutyCycles.push(1e-5);
            this._minOverlapDutyCycles.push(1e-6);
            this._minActiveDutyCycles.push(1e-6);
            this._boostFactors.push(1.0);
        }

        // The inhibition radius determines the size of a column's local 
        // neighborhood. A cortical column must overcome the overlap 
        // score of columns in his neighborhood in order to become active. This 
        // radius is updated every learning round. It grows and shrinks with the 
        // average number of connected synapses per column.
        this._inhibitionRadius = 0;
        this._updateInhibitionRadius();
        //console.log("In init. Inhibition radius:");
        //console.log(this._inhibitionRadius);
    }

    SpatialPooler.prototype.compute = function(inputVector, learn, activeArray){
        /*
        This is the primary public method of the SpatialPooler class. This 
        function takes a input vector and outputs the indices of the active columns 
        along with the anomaly score for the that input. If 'learn' is set to True,
        this method also updates the permanences of the columns.

        Parameters:
        ----------------------------
        inputVector:    a numpy array of 0's and 1's that comprises the input to 
                        the spatial pooler. The array will be treated as a one
                        dimensional array, therefore the dimensions of the array
                        do not have to match the exact dimensions specified in the 
                        class constructor. In fact, even a list would suffice. 
                        The number of input bits in the vector must, however, 
                        match the number of bits specified by the call to the 
                        constructor. Therefore there must be a '0' or '1' in the
                        array for every input bit.
        learn:          a boolean value indicating whether learning should be 
                        performed. Learning entails updating the  permanence 
                        values of the synapses, and hence modifying the 'state' 
                        of the model. setting learning to 'off' might be useful
                        for indicating separate training vs. testing sets. 
        activeArray:    an array whose size is equal to the number of columns. 
                        Before the function returns this array will be populated 
                        with 1's at the indices of the active columns, and 0's 
                        everywhere else.
        */

        var i;
        var oneDInputVector;

        if (typeof inputVector === 'undefined' || typeof activeArray === 'undefined') {
          return;
        }

        learn = typeof learn !== 'undefined' ? learn : true;

        // Convert to 1D array
        oneDInputVector = nDto1D(inputVector, this._inputDimensions.length);
        //console.log("1D version of input: ");
        //console.log(oneDInputVector);
        
        // Make sure our input is as defined during init
        if (oneDInputVector.length != this._numInputs) {
            console.assert(false, "Input does not match specified input dimensions");
            return;
        }
        
        this._updateBookeepingVars(learn);
        
        var overlaps = this._calculateOverlap(oneDInputVector);
        
        // Store this as an accessible property
        this.overlaps = overlaps;
        
        var overlapsPct = this._calculateOverlapPct(this.overlaps);
        //console.log("Connected counts for each column: ");
        //console.log(this._connectedCounts);
        //console.log("Percent of that count that overlaps the input:");
        //console.log(overlapsPct);
        
        // Apply boosting when learning is on
        var boostedOverlaps = [];
        if ( learn === true ) {
            for (i = 0; i < this.overlaps.length; i++) {
                boostedOverlaps.push(this.overlaps[i] * this._boostFactors[i]);
            }
        } else {
          boostedOverlaps = this.overlaps;
        }
        
        // Store this as an accessible property
        this.boostedOverlaps = boostedOverlaps;
        
        //if (this._numColumns == 10) {
        //    console.log("Boosted overlaps: ");
        //    console.log(this.boostedOverlaps);
        //}

        var activeColumns = this._inhibitColumns(this.boostedOverlaps,
                                                 this._addNoise);
        
        //if (this._numColumns == 5) {
        //    console.log("Active Columns after inhibition");
        //    console.log(activeColumns);
        //}

        if ( learn === true) {
            this._adaptSynapses(oneDInputVector, activeColumns);
            this._updateDutyCycles(overlaps, activeColumns);
            // NOTE: This is a divergence. We do not bump up weak columns.
            //
            // Arbitrarily increasing the perms for columns that haven't been
            // active is bizzare and un-biological. In the case where a column
            // has a potential pool drawn from the entire input this *sort of*
            // looks like the neuron growing new dendrites into more active
            // areas, but with topology this makes little sense.
            
            //this._bumpUpWeakColumns();
            
            this._updateBoostFactors();
            if ( this._isUpdateRound() ) {
                this._updateInhibitionRadius();
                // Note: This is a divergence. We do not bother with min duty cycles
                // as they are used in bumpUpWeakColumns and the original non-local
                // implementation of boosting, which is not used here.
                //this._updateMinDutyCycles()
            }
        } else {
            activeColumns = this._stripNeverLearned(activeColumns);
        }
        
        //if (this._numColumns) {
        //    console.log("Active Columns after adaptSynapses");
        //    console.log(activeColumns);
        //}

        // Clear out the active array so we can refill it
        for (i = 0; i < activeArray.length; i++) {
            activeArray[i] = 0;
        }
        
        // Set new values
        for (i = 0; i < activeColumns.length; i++) {
            activeArray[activeColumns[i]] = this.boostedOverlaps[activeColumns[i]];
        }
        
        //if (this._numColumns == 10) {
        //    console.log("Final Active array");
        //    console.log(activeArray);
        //}

    };


    SpatialPooler.prototype._stripNeverLearned = function(activeColumns){
        var learned = [];
        for (var i = 0; i < activeColumns.length; i++) {
            // If an active column has zero duty cycle, omit it.
            if (this._activeDutyCycles[activeColumns[i]] > 0) {
                learned.push(activeColumns[i]);
            }
        }
        return learned
    };

        
    SpatialPooler.prototype._updateMinDutyCycles = function(){
        console.log("Not implemented.")
    };
        
    SpatialPooler.prototype._updateMinDutyCyclesGlobal = function(){
        console.log("Not implemented.")
    };
        
    SpatialPooler.prototype._updateDutyCycles = function(overlaps, activeColumns){
        /*
        Updates the duty cycles for each column.
        
        The OVERLAP duty cycle is a moving average of the number of inputs which
        overlapped with each column. (The overlap score)
        
        The ACTIVITY duty cycle is a moving average of the frequency of activation
        for each column.

        Parameters:
        ----------------------------
        overlaps:       an array containing the overlap score for each column.
        activeColumns:  An array containing the indices of the active columns, 
                        the sprase set of columns which survived inhibition.
        */

        var i;
        // Create a couple of holding arrays
        var overlapArray = [];
        var activeArray = [];

        for (i = 0; i < this._numColumns; i++) {
            overlapArray.push(0.0);
            activeArray.push(0.0);
        }
        
        //console.log("Overlaps in update duty cycles");
        //console.log(overlaps);
        
        // If a column overlapped anything set its corresponding index to 1
        for (i = 0; i < overlaps.length; i++) {
            if (overlaps[i] > 0) {
                overlapArray[i] = 1;
            }
        }
        
        if (activeColumns.length > 0) {
            //console.log("Active columns in update duty cycles");
            //console.log(activeColumns);
            for (i = 0; i < activeColumns.length; i++) {
                activeArray[activeColumns[i]] = 1;
            }
        }
        
        //console.log("Active array in update duty cycles");
        //console.log(activeArray);
        
        var period = this._dutyCyclePeriod;
        //console.log(period);
        if (period > this._iterationNum){
            period = this._iterationNum;
        }
        
        this._overlapDutyCycles = this._updateDutyCyclesHelper(
                                                            this._overlapDutyCycles,
                                                            overlapArray, 
                                                            period);
        
        //console.log("Overlap Duty Cycles in _updateDutyCycles");
        //console.log(this._overlapDutyCycles);
        
        this._activeDutyCycles = this._updateDutyCyclesHelper(
                                                            this._activeDutyCycles,
                                                            activeArray,
                                                            period
                                                          );
        
        //console.log("Active Duty Cycles in _updateDutyCycles");
        //console.log(this._activeDutyCycles);
    };
        
    SpatialPooler.prototype._updateInhibitionRadius = function(){
        /*
        Update the inhibition radius. The inhibition radius is a measure of the
        square (or hypersquare) of columns that each a column is "conencted to"
        on average. Since columns are are not connected to each other directly, we 
        determine this quantity by first figuring out how many *inputs* a column is 
        connected to, and then multiplying it by the total number of columns that 
        exist for each input. For multiple dimensions the aforementioned 
        calculations are averaged over all dimensions of inputs and columns. This 
        value is meaningless if global inhibition is enabled.
        */
        if (this._globalInhibition) {
            // Math.max can't handle arrays directly, use .apply() to explode
            this._inhibitionRadius = Math.max.apply(null, this._columnDimensions);
        } else {
          var avgConnectedSpansForColumns = [];
          for (var i = 0; i < this._numColumns; i++) {
            avgConnectedSpansForColumns.push(this._avgConnectedSpanForColumnND(i));
          }
          var avgConnectedSpan = arrayMean(avgConnectedSpansForColumns);
          //console.log("Average Connected Span");
          //console.log(avgConnectedSpan);
          var columnsPerInput = this._avgColumnsPerInput();
          //console.log("Columns per input:");
          //console.log(columnsPerInput);
          var diameter = avgConnectedSpan * columnsPerInput;
          //console.log("Diameter: ");
          //console.log(diameter);
          var radius = (diameter - 1) / 2.0;
          //console.log("Radius: ")
          //console.log(radius);
          radius = Math.max(1.0, radius);
          //console.log(radius);
          this._inhibitionRadius = Math.round(radius);
          //console.log("INHIBITION RADIUS")
          //console.log(this._inhibitionRadius);
        }
    };
        
    SpatialPooler.prototype._avgColumnsPerInput = function(){
        /*
        The average number of columns per input, taking into account the topology 
        of the inputs and columns. This value is used to calculate the inhibition 
        radius. This function supports an arbitrary number of dimensions. If the 
        number of column dimensions does not match the number of input dimensions, 
        we treat the missing, or phantom dimensions as 'ones'.
        */
        //TODO: extend to support different number of dimensions for inputs and 
        // columns

        var i;
        // Does our input or column space have more dimensions?
        var numDim = Math.max(this._columnDimensions.length,
                              this._inputDimensions.length);
        
        // Create two arrays of length numDim
        
        // Set up an array of ones
        var colDim = [];
        for (i = 0; i < numDim; i++) {
            colDim.push(1);
        }
        for (i = 0; i < this._columnDimensions.length; i++) {
            colDim[i] = this._columnDimensions[i];
        }
        
        // Set up another array of ones
        var inputDim = [];
        for (i = 0; i < numDim; i++) {
            inputDim.push(1);
        }
        
        for (i = 0; i < this._inputDimensions.length; i++) {
            inputDim[i] = this._inputDimensions[i];
        }

        //console.log(numDim);
        //console.log(colDim);
        //console.log(inputDim);
        
        var columnsPerInput = [];
        for (i = 0; i < colDim.length; i++) {
            columnsPerInput.push(colDim[i] / inputDim[i]);
        }
        
        var avgColsPerInput = arrayMean(columnsPerInput);
        //console.log("Average Cols Per Input");
        //console.log(avgColsPerInput);
        
        return avgColsPerInput;
    };
        
    SpatialPooler.prototype._avgConnectedSpanForColumn1D = function(){
            console.log("Not implemented.")
    };
        
    SpatialPooler.prototype._avgConnectedSpanForColumn2D = function(){
            console.log("Not implemented.")
    };
        
    SpatialPooler.prototype._avgConnectedSpanForColumnND = function(index){
        /*
        The range of connectedSynapses per column, averaged for each dimension. 
        This value is used to calculate the inhibition radius. This variation of 
        the function supports arbitrary column dimensions.
        
        NOTE: This is a divergence from the cpp/py implementation. Here we
        use pre-calculated dimension component counts (a.k.a. "bounds"). Back
        porting this is https://github.com/numenta/nupic/issues/699

        Parameters:
        ----------------------------
        index:          The index identifying a column in the permanence, potential 
                        and connectivity matrices.
        */
        
        //console.log("Dimension components avgConnectedSpan")
        //console.log(this._inputDimCompCounts);
        var i;
        var minCoord, maxCoord;
        var connected = this._connectedSynapses[index];
        var avgSpan;

        if (connected.length == 0) {
            return 0;
        }
        //console.log("Connected synapses for this column: (avgConnectedSpan)");
        //console.log(connected)

        // Initially set max and min coords below and above the range of possible
        // coords in the input.
        maxCoord = [];
        minCoord = [];
        for (i = 0; i < this._inputDimensions.length; i++) {
            maxCoord.push(-1);
            minCoord.push(Math.max.apply(null, this._inputDimensions));
        }
        
        //console.log("MAX COORD and MIN COORD");
        //console.log(maxCoord);
        //console.log(minCoord);
        
        // Find the max and min coords of connected synapses
        for (i = 0; i < connected.length; i++) {
            var ind = connected[i];
            var coords = this._indexToCoords(ind,
                                             this._inputDimensions,
                                             this._inputDimCompCounts);
            //console.log("Index and reconstructed coordinates: ")
            //console.log(ind);
            //console.log(coords);
            for (var j = 0; j < this._inputDimensions.length; j++) {
                maxCoord[j] = Math.max(coords[j], maxCoord[j]);
                minCoord[j] = Math.min(coords[j], minCoord[j]);
            }
        }

        //console.log("MAX COORD and MIN COORD after iterations");
        //console.log(maxCoord);
        //console.log(minCoord);
        
        // Get the average distance across dimensions
        var coordRange = 0;
        for (i = 0; i < this._inputDimensions.length; i++) {
            coordRange += (maxCoord[i] - minCoord[i]) + 1;
        }
        
        //console.log("COORD RANGE");
        //console.log(coordRange);
        
        avgSpan = coordRange / this._inputDimensions.length;
        //console.log("Avg span");
        //console.log(avgSpan);
        return avgSpan;  
    };

    SpatialPooler.prototype._calcDimensionComponentCounts = function(dimensions) {
        /*
        Returns a list of the counts of elements in each dimension.
        For example a 3 x 2 x 4 input would have 6 elements per plane, 3 elements
        per column, and 1 element per row in that column. So this method
        would return the array [6, 3, 1]. This is used as part of calculating
        overlap and inhibition radii.
        
        NOTE: This is a divergence from the cpp/py implementations which call
        this "bounds."
        */
        // Get all but the last one
        var truncatedDims = dimensions.slice(0,-1);
        // Append that to the array [1]
        var extendedDims = [1].concat(truncatedDims);
        // Calculate an array of cumulative products for that array
        var dimComponentCounts = arrayCumProduct(extendedDims);
        
        return dimComponentCounts;
    };

    SpatialPooler.prototype._indexToCoords = function(inputIndex,
                                                      dims,
                                                      dimCompCounts) {
        /*
        Returns an array of length dims corresponding to the
        coordinate in input space for the given inputIndex in 1D space
        */
        var coords = [];
        
        for (var i = 0; i < dims.length; i++) {
            var dimComp = dimCompCounts[i];
            var divStep = Math.floor(inputIndex / dimComp);
            var coord = Math.floor(inputIndex / dimComp) % dims[i];
            coords.push(coord);
        }
        return coords;
    };

    SpatialPooler.prototype._coordsToIndex = function(coords,
                                                      dims,
                                                      dimCompCounts) {
        /*
        Returns the index in a 1D array corresponding to the coordinates given in
        this._inputDimensions.
        */
        var index = 0;
        var i;
        for (i = 0; i < dims.length; i++) {
            index += coords[i] * dimCompCounts[i];
        }
        return index
    };

    SpatialPooler.prototype._adaptSynapses = function(inputVector, activeColumns){
        /*
        The primary method in charge of learning. Adapts the permanence values of 
        the synapses based on the input vector, and the chosen columns after 
        inhibition round. Permanence values are increased for synapses overlapping 
        input bits that are turned on, and decreased for synapses overlapping 
        inputs bits that are turned off.

        Parameters:
        ----------------------------
        inputVector:    a numpy array of 0's and 1's thata comprises the input to 
                        the spatial pooler. There exists an entry in the array 
                        for every input bit.
        activeColumns:  an array containing the indices of the columns that 
                        survived inhibition.
        */
        
        //console.log("Input vector:");
        //console.log(inputVector);
        
        var inputIndices = [];
        var i, j;
        for (i = 0; i < inputVector.length; i++) {
            if (inputVector[i] > 0) {
                inputIndices.push(i);
            }
        }
        
        //console.log("Active input indices: ")
        //console.log(inputIndices);
        
        var permChanges = [];
        for (i = 0; i < this._numInputs; i++) {
            permChanges.push(-1 * this._synPermInactiveDec);
        }
        for (i = 0; i < inputIndices.length; i++) {
            permChanges[inputIndices[i]] = this._synPermActiveInc;
        }

        //console.log("Perm Changes");
        //console.log(permChanges);
        for (i = 0; i < activeColumns.length; i++) {
            var activeColIndex = activeColumns[i];
            //console.log("Active Col:");
            //console.log(activeColIndex);
            var perm = this._permanences[activeColIndex];
            //console.log("Perms before updating:");
            //console.log(perm);
            var maskPotential = [];
            var activeColPotPool = this._potentialPools[activeColIndex];
            //console.log("Active Column Potential Pool");
            //console.log(activeColPotPool);
            for (j = 0; j < activeColPotPool.length; j++) {
                if (activeColPotPool[j] > 0) {
                    maskPotential.push(j);
                }
            }
            for (j = 0; j < maskPotential.length; j++) {
                perm[maskPotential[j]] += permChanges[maskPotential[j]];
            }
            //console.log("Perms after updating:");
            //console.log(perm)
            //console.log("Index")
            //console.log(i)
            this._updatePermanencesForColumn(perm, activeColIndex);
        }
    };
        
    SpatialPooler.prototype._bumpUpWeakColumns = function(){
            console.log("Not implemented.")
    };

    SpatialPooler.prototype._raisePermanenceToThreshold = function(perm, mask){
        /*
        This method ensures that each column has enough connections to input bits
        to allow it to become active. Since a column must have at least 
        'this._stimulusThreshold' overlaps in order to be considered during the 
        inhibition phase, columns without such minimal number of connections, even
        if all the input bits they are connected to turn on, have no chance of 
        obtaining the minimum threshold. For such columns, the permanence values
        are increased until the minimum number of connections are formed.


        Parameters:
        ----------------------------
        perm:           An array of permanence values for a column. The array is 
                        "dense", i.e. it contains an entry for each input bit, even
                        if the permanence value is 0.
        mask:           the indices of the columns whose permanences need to be 
                        raised. (The potential pool)
        */

        var i;
        var counter = 0;

        // TODO - Figure out if this should go within the while loop
        // Clip perms
        for (i = 0; i < perm.length; i++) {
            // Raise numbers below min to min
            if (perm[i] < this._synPermMin) {
                perm[i] = this._synPermMin;
            // Lower perms above max back down to max
            } else if (perm[i] > this._synPermMax) {
                perm[i] = this._synPermMax;
            }
        }
        
        while (true) {
          
            if (counter > 40) {
                throw new Error("Possible infinite loop! Attempting to raise enough " +
                "permanences to meet _stimulusThreshold failed.");
            }
          
            // See if we have enough connected synapses
            var conIndices = [];
            for (i = 0; i < perm.length; i++) {
                if (perm[i] >= this._synPermConnected) {
                    conIndices.push(i);
                }
            }
            //console.log(conIndices);
            var numConnected = conIndices.length;
            if (numConnected >= this._stimulusThreshold) {
                //console.log("Good to go!");
                return
            } else {
                // If not then bump them all up a bit
                for (i = 0; i < mask.length; i++) {
                  perm[mask[i]] += this._synPermBelowStimulusInc;
                }
                
                counter++;
            }
        }
    };
      
    SpatialPooler.prototype._updatePermanencesForColumn = function(perm,
                                                                   index,
                                                                   raisePerm){
        /*
        This method updates the permanence matrix with a column's new permanence
        values. The column is identified by its index, which reflects the row in
        the matrix, and the permanence is given in 'dense' form, i.e. a full 
        arrray containing all the zeros as well as the non-zero values. It is in 
        charge of implementing 'clipping' - ensuring that the permanence values are
        always between 0 and 1 - and 'trimming' - enforcing sparsity by zeroing out
        all permanence values below '_synPermTrimThreshold'. It also maintains
        the consistency between 'self._permanences' (the matrix storeing the 
        permanence values), 'self._connectedSynapses', (the matrix storing the bits
        each column is connected to), and 'self._connectedCounts' (an array storing
        the number of input bits each column is connected to). Every method wishing 
        to modify the permanence matrix should do so through this method.

        Parameters:
        ----------------------------
        perm:           An array of permanence values for a column. The array is 
                        "dense", i.e. it contains an entry for each input bit, even
                        if the permanence value is 0.
        index:          The index identifying a column in the permanence, potential 
                        and connectivity matrices
        raisePerm:      a boolean value indicating whether the permanence values 
                        should be raised until a minimum number of synapses are in 
                        a connected state. Should be set to 'false' when a direct 
                        assignment is required.
        */

        var i;
        raisePerm = defaultFor(raisePerm, true);
        // Get a list of indices where potential pool is not 0
        var maskPotential = [];
        for (i = 0; i < this._potentialPools[index].length; i++) {
            if (this._potentialPools[index][i] > 0) {
                maskPotential.push(i);
            }
        }
        
        if (raisePerm == true) {
            if (index == 0) {
              //console.log("Mask Potential:");
              //console.log(maskPotential);
            }
            this._raisePermanenceToThreshold(perm, maskPotential);
        }
        
        // Remove perms below threshold and clip those above
        for (i = 0; i < perm.length; i++) {
            // This will also raise numbers below 0 to 0.
            if (perm[i] < this._synPermTrimThreshold) {
                perm[i] = 0;
            // Lower perms above max back down to max
            } else if (perm[i] > this._synPermMax) {
                perm[i] = this._synPermMax;
            }
        }
          
        var newConnected = [];
        for (i = 0; i < perm.length; i++) {
            if (perm[i] >= this._synPermConnected) {
                newConnected.push(i);
            }
        }
        //console.log("Connected synapses for this column (in update): ");
        //console.log(newConnected);
        
        //if (this._numColumns == 10 && index == 0) {
        //  console.log("Old Connected:");
        //  console.log(this._connectedSynapses[index]);
        //  console.log("New Connected:");
        //  console.log(newConnected);
        //};
        
        this._permanences[index] = perm;
        this._connectedSynapses[index] = newConnected;
        this._connectedCounts[index] = newConnected.length;
    };
        
    SpatialPooler.prototype._initPermConnected = function(){
        /*
        Returns a randomly generated permanence value for a synapse that is
        initialized in a connected state
        */
        return this._synPermConnected +
                ((Math.random() * this._synPermActiveInc) / 4.0);
    };

    SpatialPooler.prototype._initPermNotConnected = function(){
        /*
        Returns a randomly generated permanence value for a synapse that is
        initialized in a non-connected state
        */
        return this._synPermConnected * Math.random();
    };
        
    SpatialPooler.prototype._initPermanence = function(potential, connectedPct){
        /*
        Initializes the permanences of a column. The method
        returns a 1-D array the size of the input, where each entry in the
        array represents the initial permanence value between the input bit
        at the particular index in the array, and the column represented by
        the 'index' parameter.

        Parameters:
        ----------------------------
        potential:      A numpy array specifying the potential pool of the column.
                        Permanence values will only be generated for input bits 
                        corresponding to indices for which the mask value is 1.
        connectedPct:   A value between 0 or 1 specifying the percent of the input 
                        bits that will start off in a connected state.

        */
        
        // NOTE: This is a divergence from the cpp/py implementation
        // Here we use logic similar to selecting a pct of the potential pool
        // rather than letting a random percentage averaging around connectedPct
        // be connected.

        var i;
        // Create an array where all perms are, by default, zero
        var permanences = [];
        for (i = 0; i < this._numInputs; i++) {
            permanences.push(0.0);
        }
        
        // Find the indices of potential that are non-zero
        var potentialIndices = [];
        for (i = 0; i < this._numInputs; i++) {
            if (potential[i] >= 1.0) {
                potentialIndices.push(i);
            }
        }
        
        // Shuffle those indices and then set connectedPct of them to connected.
        potentialIndices = shuffle(potentialIndices);
        var sampleSize = Math.round(connectedPct * potentialIndices.length);
        for (i = 0; i < potentialIndices.length; i++) {
            if (i < sampleSize) {
                permanences[potentialIndices[i]] = this._initPermConnected();
            } else {
                permanences[potentialIndices[i]] = this._initPermNotConnected();
            }
        }
            
        return permanences
    };

    SpatialPooler.prototype._mapPotential = function(index, wrapAround){
        /*
        Maps a column to its input bits. This method encapsultes the topology of 
        the region. It takes the index of the column as an argument and determines 
        what are the indices of the input vector that are located within the 
        column's potential pool. The return value is a list containing the indices 
        of the input bits. The current implementation of the base class only 
        supports a 1 dimensional topology of columns with a 1 dimensional topology 
        of inputs. To extend this class to support 2-D topology you will need to 
        override this method. Examples of the expected output of this method:
        * If the potentialRadius is greater than or equal to the entire input 
          space, (global visibility), then this method returns an array filled with 
          all the indices
        * If the topology is one dimensional, and the potentialRadius is 5, this 
          method will return an array containing 11 consecutive values centered on 
          the index of the column (wrapping around if necessary).
        * If the topology is two dimensional, and the potentialRadius is 5, the
          method should return an array containing 25 '1's, where the exact indices
          are to be determined by the mapping from 1-D index to 2-D position.
        
        NOTE:   If the number of columns and the potentialRadius is small and the
                input large, you can end up with input bits not being covered by
                any column connections. i.e. The columns are not evenly distributed
                over the input, the are added left to right and may not cover the
                full width. To correct for this if numColumns < numInputs we
                move the indexes of the columns over a bit.

        Parameters:
        ----------------------------
        index:          The index identifying a column in the permanence, potential 
                        and connectivity matrices.
        wrapAround:     A boolean value indicating that boundaries should be 
                        region boundaries ignored.
        */

        var i;
        var indices = [];
        var diameter = 2 * (this._potentialRadius) + 1;
        var xShift, yShift;
        var coordInColSpace, colXNum, colYNum, coords;
        var minCoords = [];
        var shflIndices, sampleSize;
        var mask = [];

        // If we are doing 2D topology
        if (this._inputDimensions.length == 2) {
            
            //console.log("2D INPUT")
            
            // If we have less columns than inputs ...
            if (this._numColumns < this._numInputs) {
                
                //console.log(this._columnDimensions);
                
                // Calculate how to ~ evenly distribute our columns in input space
                xShift = (this._inputDimensions[0] - this._columnDimensions[0]) / (1 + this._columnDimensions[0]);
                //console.log("Avg xShift: " + xShift);
                yShift = (this._inputDimensions[1] - this._columnDimensions[1]) / (1 + this._columnDimensions[1]);
                //console.log("Avg yShift: " + yShift);
                
                // Calculate our column coordinates in column space
                coordInColSpace = this._indexToCoords(index,
                                                    this._columnDimensions,
                                                    this._columnDimCompCounts);
                
                //console.log("Index:");
                //console.log(index);
                //console.log("Coordinates in column space");
                //console.log(coordInColSpace);
                
                // Apply the shift in column space
                colXNum = coordInColSpace[0] + 1;
                xShift = Math.floor(colXNum * xShift);
                colYNum = coordInColSpace[1] + 1;
                yShift = Math.floor(colYNum * yShift);
                coordInColSpace[0] += xShift;
                coordInColSpace[1] += yShift;
                
                // Shift back to input space
                index = this._coordsToIndex(coordInColSpace,
                                            this._inputDimensions,
                                            this._inputDimCompCounts);
            }
            
            coords = this._indexToCoords(index,
                                         this._inputDimensions,
                                         this._inputDimCompCounts);
            
            // Create a square area to make it easy
            // Use pythagorean theorem to find the area of a square with diagonal of
            // len diameter.
            var arrayLen = Math.pow(diameter, 2);
            
            // Find the top right corner of the area
            for (i = 0; i < this._inputDimensions.length; i++) {
                minCoords.push(coords[i] - this._potentialRadius);
            }
            
            // Iterate through all the indices in the area, wrapping if neccessary
            for (i = 0; i < diameter; i++) {
                for (var j = 0; j < diameter; j++) {
                    x = (minCoords[0] + j);
                    y = (minCoords[1] + i);
                    if (wrapAround === true) {
                        x = x.mod(this._inputDimensions[0]);
                        y = y.mod(this._inputDimensions[1]);
                    } else {
                        if (y < 0 || y > this._inputDimensions[1] - 1) {
                            continue;
                        }
                        if (x < 0 || x > this._inputDimensions[0] - 1) {
                            continue;
                        }
                    }
                    var areaCoords = [x, y];
                    indices.push(this._coordsToIndex(areaCoords,
                                                     this._inputDimensions,
                                                     this._inputDimCompCounts));
                }
            }
            
        } else {
            
            //console.log("ONE D INPUT");
            // Handle the case where we only have a few columns to cover the input
            // NOTE: This is a divergence from the cpp/py implementation
            //if (this._numColumns < this._numInputs) {
            //    var shift = (this._numInputs - this._numColumns) / (1 + this._numColumns);
            //    var colNum = index + 1;
            //    var shift = Math.floor(colNum * shift);
            //    console.log("Shift needed: ");
            //    console.log(shift);
            //    index += shift;
            //};
            
            // Fill it with the first indices i.e. 0, 1, 2, 3 etc.
            //console.log("Diameter")
            //console.log(diameter);
            for (i = 0; i < diameter; i++) {
                indices.push(i);
            }
            //console.log("Indices");
            //console.log(indices);
            // Shift over so index 0 of that array is the value of the column index
            // e.g. Column index 1000 - 1000, 1001, 1002 etc.
            for (i = 0; i < diameter; i++) {
                indices[i] += index;
            }
            
            //console.log("Moved indices");
            //console.log(indices);
            // Shift back so the column index is centered
            for (i = 0; i < diameter; i++) {
                indices[i] -= this._potentialRadius;
            }
            // We may want column receptive fields to wrap
            if (wrapAround === true) {
                for (i = 0; i < diameter; i++) {
                  indices[i] = indices[i].mod(this._numInputs);
                }
            } else {
                // Otherwise remove indices that are outside the range of the input
                var cleanedIndices = [];
                for (i = 0; i < diameter; i++) {
                  if (indices[i] >= 0 && indices[i] < this._numInputs) {
                    cleanedIndices.push(indices[i]);
                  }
                }
                indices = cleanedIndices;
            }
        }
        // Remove duplicate indices
        indices = new Set(indices).array();
        //console.log(indices);
        
        // Select a subset of the receptive field to serve as the potential pool
        // Because we are seeding the random number generator these selections
        // will be the same across runs.
        for (i = 0; i < this._numInputs; i++) {
            mask.push(0);
        }
        // Shuffle our indices and then take the first n
        shflIndices = shuffle(indices);
        sampleSize = Math.round(this._potentialPct * indices.length);
        for (i = 0; i < sampleSize; i++) {
            mask[shflIndices[i]] = 1;
        }
        
        return mask
    };
        
    SpatialPooler.prototype._updateDutyCyclesHelper = function(dutyCycles,
                                                               newInput,
                                                               period) {
        /*
        Updates a duty cycle estimate with a new value. This is a helper
        function that is used to update several duty cycle variables, such as:
        overlapDutyCucle, activeDutyCycle, minPctDutyCycleBeforeInh,
        minPctDutyCycleAfterInh, etc. returns the updated duty cycle. Duty cycles
        are updated according to the following formula:

                      (period - 1)*dutyCycle + newValue
          dutyCycle := ----------------------------------
                                  period

        Parameters:
        ----------------------------
        dutyCycles:     An array containing one or more duty cycle values that need
                        to be updated
        newInput:       An array of new values used to update the duty cycle
        period:         The period of the duty cycle      
        */
        console.assert(period >= 1);
        var i;
        var newDutyCycles = [];
        for (i = 0; i < dutyCycles.length; i++) {
            newDutyCycles[i] = (dutyCycles[i] * (period - 1.0) + newInput[i]) / period;
        }
        
        return newDutyCycles
    };
        
    SpatialPooler.prototype._updateBoostFactors = function(){
        /*
        Update the boost factors for all columns. The boost factors are used to 
        increase the overlap of inactive columns to improve their chances of
        becoming active and thus encourage participation of more columns in the
        learning process. This is a line defined as: y = mx + b boost =
        (1-maxBoost)/minDuty * dutyCycle + maxFiringBoost. Intuitively this means
        that columns that have been active enough have a boost factor of 1, meaning
        their overlap is not boosted.
        
        NOTE: This is a divergence. In the cpp/py implementation this rule is
        *not local.* Each column somehow knows about the activity of all other
        columns regardless of closeness. Here we correct this so each column only
        worries about its own history. This implements one facet of neural
        adaptation.
        
        Columns whose active duty cycle drops too much are boosted depending on how
        infrequently they have been active. The more infrequent, the more they are
        boosted. The exact boost factor is linearly interpolated between the points
        (dutyCycle:0, boost:maxFiringBoost) and (dutyCycle:minDuty, boost:1.0). 

        b                ^
        o    maxBoost _  |
        o                |\
        s                | \
        t          1  _  |  \ _ _ _ _ _ _ _
        F                |   
        a                +--------------------> 
        c                    |
        t             minActiveDutyCycle
        o            
        r            
                         activeDutyCycle
                
        */
        
        var minActiveDutyCycle = 0.05;
        var boost, m, x, b;
        for (var i = 0; i < this._numColumns; i++) {
            // Don't boost if we're above the min duty cycle;
            if (this._activeDutyCycles[i] > minActiveDutyCycle) {
                boost = 1;
            } else {
                // Slope
                m = (1 - this._maxBoost) / minActiveDutyCycle;
                x = this._activeDutyCycles[i];
                // Y Intercept
                b = this._maxBoost;
                boost =  m * x + b;
            }
            this._boostFactors[i] = boost;
        }
        
        //console.log("Boost factors in update boost factors");
        //console.log(this._boostFactors);
    };
        
    SpatialPooler.prototype._updateBookeepingVars = function(learn) {
        /*
        Updates counter instance variables each round.

        Parameters:
        ----------------------------
        learn:          a boolean value indicating whether learning should be 
                        performed. Learning entails updating the  permanence 
                        values of the synapses, and hence modifying the 'state' 
                        of the model. setting learning to 'off' might be useful
                        for indicating separate training vs. testing sets. 
        */
        this._iterationNum++;
        if ( learn === true ) {
          this._iterationLearnNum++;
        }
    };
        
    SpatialPooler.prototype._calculateOverlap = function(inputVector) {
        /*
        This function determines each column's overlap with the current input 
        vector. The overlap of a column is the number of synapses for that column
        that are connected (permance value is greater than '_synPermConnected') 
        to input bits which are turned on. Overlap values that are lower than
        the 'stimulusThreshold' are ignored. The implementation takes advantage of 
        the SpraseBinaryMatrix class to perform this calculation efficiently.

        Parameters:
        ----------------------------
        inputVector:    an array that comprises the input to the spatial pooler.
        */
        var i, j;
        var overlaps = [];
        var inVal;
        for (i = 0; i < this._numColumns; i++) {
            // Look up the connected synapses for each column. These values
            // correspond to indices in the input.
            //if (this._numColumns == 5 && this._iterationLearnNum > 1000) {
            //    console.log("Input: ");
            //    console.log(inputVector);
            //    console.log("Column " + i + ":");
            //    console.log(this._connectedSynapses[i]);
            //}
            var overlap = 0;
            for (j = 0; j < this._connectedSynapses[i].length; j++){
                //console.log("Is input bit " +
                //            this._connectedSynapses[i][j] + " on?");
                // Add up the input values to get the overlap
                // NOTE: This is a divergence from the cpp/python code as it
                // supports scalar inputs between 0.0 and 1.0
                inVal = inputVector[this._connectedSynapses[i][j]];
                //if (inVal < 0 || inVal > 1) {
                //    throw "Input Error: Values in the input vector must be " +
                //    "between 0.0 and 1.0";
                //};
                overlap += inVal;
            }
            overlaps.push(overlap);
        }
        
        //if (this._numColumns == 5) {
        //    console.log("Overlaps before thresholding:")
        //    console.log(overlaps);
        //}
        // Zero out columns that didn't meet _stimulusThreshold
        for (i = 0; i < overlaps.length; i++) {
            if (overlaps[i] < this._stimulusThreshold) {
                overlaps[i] = 0;
            }
        }
        
        //if (this._numColumns == 5 && this._iterationLearnNum > 1000) {
        //    console.log("Overlaps after thresholding:")
        //    console.log(overlaps);
        //}
        
        return overlaps;
    };
        
    SpatialPooler.prototype._calculateOverlapPct = function(overlaps){
        var i;
        var overlapPercents = [];
        for (i = 0; i < overlaps.length; i++) {
            overlapPercents.push(overlaps[i] / this._connectedCounts[i]);
        }
        return overlapPercents;
    };
      
    SpatialPooler.prototype._inhibitColumns = function(overlaps, addNoise){
        /*
        Performs inhibition. This method calculates the necessary values needed to
        actually perform inhibition and then delegates the task of picking the 
        active columns to helper functions.

        Parameters:
        ----------------------------
        overlaps:       an array containing the overlap score for each  column. 
                        The overlap score for a column is defined as the number 
                        of synapses in a "connected state" (connected synapses) 
                        that are connected to input bits which are turned on.
        addNoise:       A boolean value which controls whether or not we add
                        extra noise to overlap scores prior to determining winners.
                        NOTE: This is a divergence from the cpp/py implementation.
        */

        // Determine how many columns should be selected in the inhibition phase.
        // This can be specified by either setting the 'numActiveColumnsPerInhArea'
        // parameter of the 'localAreaDensity' parameter when initializing the class

        //console.log("Overlaps (in inhibitColumns)");
        //console.log(overlaps);
        var i;
        var density, inhibitionArea;
        var overlapsCopy = overlaps.slice();
        if (this._localAreaDensity > 0) {
            density = this._localAreaDensity;
        } else {
            //console.log(this._inhibitionRadius);
            inhibitionArea = Math.pow( (2 * this._inhibitionRadius + 1),
                                          this._columnDimensions.length);
            //console.log(inhibitionArea);
            inhibitionArea = Math.min(this._numColumns, inhibitionArea);
            //console.log(inhibitionArea);
            //console.log(this._numActiveColumnsPerInhArea);
            density = this._numActiveColumnsPerInhArea / inhibitionArea;
            //console.log(density);
            density = Math.min(density, 0.5);
            //console.log(density);
        }

        // Add a little bit of random noise to the scores to help break ties.
        if (addNoise === true) {
            for (i = 0; i < overlapsCopy.length; i++) {
                overlapsCopy[i] += Math.random() * 0.1;
            }
        }
        
        if (this._globalInhibition ||
            this._inhibitionRadius > Math.max.apply(null,
                                                    this._columnDimensions)) {
            return this._inhibitColumnsGlobal(overlapsCopy, density);
        } else {
            return this._inhibitColumnsLocal(overlapsCopy, density);
        }
    };
        
    SpatialPooler.prototype._inhibitColumnsGlobal = function(overlaps, density){
        /*
        Perform global inhibition. Performing global inhibition entails picking the 
        top 'numActive' columns with the highest overlap score in the entire 
        region. At most, density percent of the columns are allowed to be active.

        Parameters:
        ----------------------------
        overlaps:       an array containing the overlap score for each column. 
                        The overlap score for a column is defined as the number 
                        of synapses in a "connected state" (connected synapses) 
                        that are connected to input bits which are turned on.
        density:        The fraction of columns to survive inhibition.
        */
        
        // Calculate num active total
        var i, j;
        var wSorted;
        var numActive = Math.round(density * this._numColumns);
        var activeColumns = [];
        for (i = 0; i < this._numColumns; i++) {
            activeColumns.push(0.0);
        }
        
        //console.log("Overlaps:");
        //console.log(overlaps);
        //console.log("Density:");
        //console.log(density); 
        // We want to retain the index for later use
        var winners = [];
        for (j = 0; j < overlaps.length; j++) {
          winners.push([j, overlaps[j]]);
        }
        //console.log("Winners:")
        //console.log(winners);
        
        wSorted = winners.slice().sort(comparatorReversed);
        //console.log("Winners sorted:")
        //console.log(wSorted);

        // Get the top numActive columns
        var finalWinners = wSorted.slice(0, numActive);
        //console.log("Final Winners");
        //console.log(finalWinners);
        var winningIndices = [];
        for (i = 0; i < finalWinners.length; i++) {
            winningIndices.push(finalWinners[i][0]);
        }
        return winningIndices
    };
        
    SpatialPooler.prototype._inhibitColumnsLocal = function(overlaps, density){
        /*
        Performs local inhibition. Local inhibition is performed on a column by 
        column basis. Each column observes the overlaps of its neighbors and is 
        selected if its overlap score is within the top 'numActive' in its local 
        neighborhood. At most, density percent of the columns in a local
        neighborhood are allowed to be active.

        Parameters:
        ----------------------------
        overlaps:       An array containing the overlap score for each column. 
                        The overlap score for a column is defined as the number 
                        of synapses in a "connected state" (connected synapses) 
                        that are connected to input bits which are turned on.
        density:        The fraction of columns to survive inhibition. This
                        value is only an intended target. Since the surviving
                        columns are picked in a local fashion, the exact fraction 
                        of survining columns is likely to vary.
        */
        
        //console.log("Overlaps (in inhibitColumnsLocal)");
        //console.log(overlaps);

        var i, j;
        // Create a holding array for the active column indices
        var winningColumns = [];
        
        // Calculate a small value to add to the winning column overlap scores
        var addToWinners = Math.max.apply(null, overlaps) / 1000.0;
        // Loop over each column
        for (i = 0; i < this._numColumns; i++) {
            // Get a list of columns this column can inhibit
            var maskNeighbors = this._getNeighborsND( i,
                                                     this._columnDimensions,
                                                     this._inhibitionRadius);
            // Get the overlap scores for those columns
            var overlapSlice = [];
            for (j = 0; j < maskNeighbors.length; j++) {
                overlapSlice.push(overlaps[maskNeighbors[j]]);
            }
            //console.log("Overlap slice: ");
            //console.log(overlapSlice);
            // Decide how many should be active in this area
            // NOTE: This is a divergence from the cpp/py. Here we just use
            // this._numActiveColumnsPerInhArea rather than calculating it
            // var numActive = Math.round(.5 + (density * (maskNeighbors.length + 1)))
            var numActive = this._numActiveColumnsPerInhArea;
            //console.log("Num active in this area should be: ");
            //console.log(numActive);
            var numBigger = 0;
            for (j = 0; j < overlapSlice.length; j++) {
                //console.log("Comparisons: ");
                //console.log("Slice: " + overlapSlice[j] + " Col Overlap: " + overlaps[i]);
                if (overlapSlice[j] >= overlaps[i]) {
                    numBigger++;
                }
            }
            if (numBigger < numActive) {
                //console.log("WINNER!");
                winningColumns.push(i);
            }
            
        }
        
        return winningColumns
    };
        
    SpatialPooler.prototype._getNeighbors1D = function(){
        console.log("Not implemented.");
    };
        
    SpatialPooler.prototype._getNeighbors2D = function(){
        console.log("Not implemented.");
    };
        
    SpatialPooler.prototype._getNeighborsND = function(columnIndex,
                                                       dimensions,
                                                       radius,
                                                       wrapAround){
        /*
        Similar to _getNeighbors1D and _getNeighbors2D, this function Returns a 
        list of indices corresponding to the neighbors of a given column. Since the 
        permanence values are stored in such a way that information about toplogy 
        is lost. This method allows for reconstructing the toplogy of the inputs, 
        which are flattened to one array. Given a column's index, its neighbors are 
        defined as those columns that are 'radius' indices away from it in each 
        dimension. The method returns a list of the flat indices of these columns. 
        Parameters:
        ----------------------------
        columnIndex:    The index identifying a column in the permanence, potential 
                        and connectivity matrices.
        dimensions:     An array containg a dimensions for the column space. A 2x3
                        grid will be represented by [2,3].
        radius:         Indicates how far away from a given column are other 
                        columns to be considered its neighbors. In the previous 2x3
                        example, each column with coordinates:
                        [2+/-radius, 3+/-radius] is considered a neighbor.
        wrapAround:     A boolean value indicating whether to consider columns at 
                        the border of a dimensions to be adjacent to columns at the 
                        other end of the dimension. For example, if the columns are
                        layed out in one deimnsion, columns 1 and 10 will be 
                        considered adjacent if wrapAround is set to true:
                        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        */

        var i, j;
        var curRange;
        var val;

        wrapAround = defaultFor(wrapAround, false);
        console.assert(dimensions.length > 0);
        
        var columnCoords = this._indexToCoords(columnIndex,
                                               this._columnDimensions,
                                               this._columnDimCompCounts);
        //console.log("==============================");
        //console.log("Column Index");
        //console.log(columnIndex);
        //console.log("Column Coords");
        //console.log(columnCoords);
        //console.log("Radius in getNeighborsND ");
        //console.log(radius);
        var rangeND = [];
        for (i = 0; i < this._columnDimensions.length; i++) {
            curRange = [];
            if (wrapAround == true) {
                console.log("Wrapping!");
                for (j = columnCoords[i] - radius; j < columnCoords[i] + radius + 1; j++){
                    val = j % this._columnDimensions[i];
                    curRange.push(val);
                }
            } else {
                //console.log("No wrap!");
                for (j = columnCoords[i] - radius; j < columnCoords[i] + radius + 1; j++){
                    //console.log(j);
                    if (j >= 0 && j < this._columnDimensions[i]) {
                        curRange.push(j);
                    }
                }
            }
            //console.log("Adding new range");
            //console.log(curRange);
            //console.log("------------");
            rangeND.push(curRange);
            
        }
        
        var carProd = cartesianProductOf.apply(null, rangeND);
        
        //console.log(carProd);
        var neighbors = [];
        for (i = 0; i < carProd.length; i++) {
            //console.log(carProd[i]);
            //console.log(this._columnDimCompCounts);
            var ind = this._coordsToIndex(carProd[i],
                                          this._columnDimensions,
                                          this._columnDimCompCounts);
            //console.log(ind);
            neighbors.push(ind);
        }
        
        // Remove duplicates and this column's index
        neighbors = new Set(neighbors).remove(columnIndex).array();
        //console.log("Neighbors: ");
        //console.log(neighbors);
        return neighbors;
        
    };
        
    SpatialPooler.prototype._isUpdateRound = function(){
        /*
        Returns true if the enough rounds have passed to warrant updates
        */
        return (this._iterationNum % this._updatePeriod) == 0

    };
        
    SpatialPooler.prototype._seed = function(){
        console.log("Not implemented.");
    };

    SpatialPooler.prototype.constructor = SpatialPooler;

    // Export the SpatialPooler into the global namespace. 
    window.SpatialPooler = SpatialPooler;

}());
