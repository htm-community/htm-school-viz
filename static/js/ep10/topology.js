$(function() {

    var gifData = undefined;
    var currentFrame = 0;
    var framesSeen = 0;

    var save = [
        HTM.SpSnapshots.ACT_COL,
        HTM.SpSnapshots.POT_POOLS,
        HTM.SpSnapshots.INH_MASKS,
        HTM.SpSnapshots.CON_SYN
    ];
    var history = {
        input: [],
        activeColumns: []
    };

    var colors = {
        inactive: 0xFFFFFF, // white for inactive cells
        active: 0xFFFF00, // yellow for active cells
        selected: 0xFF0000, // red for predictive cells
        field: 0xFFAC33, // orange for active & predictive cells
        neighbors: 0x6699FF, // cyan for correctly predicted cells from last step
        input: 0x00FF00, // green for input bits
        inputInField: 0x80D61A, // orange-green for input bits in potential pool
        activeInNeighbors: 0xB3CC80 // yellow-blue for active in neighborhood
    };

    // The HtmCells objects that contains cell state.
    var inputCells, spColumns;
    // The Viz object.
    var cellviz;

    var selectedColumn = undefined;

    var spClient;

    var inputDimensions = undefined;
    var columnDimensions = undefined;
    var cellsPerColumn = 4;
    var spParams;

    var paused = true;
    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var wrapAround = false;
    var restrictColumnDimensions = true;

    var spData;

    function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    }

    function loading(isLoading, isModal) {
        if (isModal == undefined) {
            isModal = true;
        }
        if (isLoading) {
            waitingForServer = true;
            if (! isModal) {
                $loading.addClass('little');
            }
            $loading.show();
        } else {
            waitingForServer = false;
            $loading.hide();
            $loading.removeClass('little');
        }
    }

    /* From http://stackoverflow.com/questions/7128675/from-green-to-red-color-depend-on-percentage */
    function getGreenToRed(percent){
        var r, g;
        percent = 100 - percent;
        r = percent < 50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
        g = percent > 50 ? 255 : Math.floor((percent*2)*255/100);
        return new THREE.Color(r, g, 0);
    }

    function translate(x, min, max) {
        var range = max - min;
        return (x - min) / range;
    }

    function xyzToOneDimIndex(x, y, z, xMax, yMax, zMax) {
        // var result = ((y+1) * (z+1) * (x+1)) + ((y+1) * (z+1)) + x+1;
        // var result = (x+1) * (y+0) + z;
        // var result = (((x.length * x) * y.length) * z) + () + ();
        var result = (x * yMax * zMax) + (y * zMax) + z;
        console.log('%s, %s, %s : %s', x, y, z, result);
        return result;
    }

    function oneDimIndexToXyz(i, xMax, yMax) {
        var out = {};
        var a = xMax * yMax;
        out.z = Math.floor(i / a);
        var b = i - a * out.z;
        out.y = Math.floor(b / xMax);
        out.x = b % xMax;
        return out;
    }

    // SP params we are not allowing user to change
    function getInputDimension() {
        //var numBits = gifData.dimensions[0] * gifData.dimensions[1];
        //console.log("Total length of input encoding: %s", numBits);
        return [gifData.dimensions[0], gifData.dimensions[1]];
    }

    function getColumnDimensions() {
        return [24, 24];
        //  var dim = [inputDimensions[0], inputDimensions[1]];
        //  if (restrictColumnDimensions && _.max(inputDimensions) > 32) {
        //      dim = [inputDimensions[0] / 2, inputDimensions[1] / 2];
        //  }
        //  return dim;
    }

    function updateCellRepresentations() {
        var inputEncoding = spData.inputEncoding;
        var activeColumns = spData.activeColumns;
        var activeDutyCycles = spData.activeDutyCycles;
        var potentialPools  = spData.potentialPools;
        var inhibitionMasks  = spData.inhibitionMasks;
        var minAdc, maxAdc;
        var cx, cy, cz, cellIndex;
        var maxX, maxY, maxZ;
        var color = undefined;

        maxX = inputCells.getX();
        maxY = inputCells.getY();
        maxZ = inputCells.getZ();
        for (cx = 0; cx < maxX; cx++) {
            for (cy = 0; cy < maxY; cy++) {
                for (cz = 0; cz < maxZ; cz++) {
                    color = colors.inactive;
                    cellIndex = xyzToOneDimIndex(cx, cy, cz, maxX, maxY, maxZ);
                    if (spData.inputEncoding[cellIndex] == 1) {
                        color = colors.input;
                    }
                    inputCells.update(cx, cy, cz, {color: color});
                }
            }
        }

        maxX = spColumns.getX();
        maxY = spColumns.getY();
        maxZ = spColumns.getZ();
        for (cx = 0; cx < maxX; cx++) {
            for (cy = 0; cy < maxY; cy++) {
                for (cz = 0; cz < maxZ; cz++) {
                    // color = colors.inactive;
                    // cellIndex = xyzToOneDimIndex(cx, cy, cz);
                    // if (spData.activeColumns[cellIndex].indexOf(cellIndex)) {
                    //     colors.input;
                    // }
                }
            }
        }

        // var columnIndex = cellData.x * spColumns.getX() + cellData.y;
        // var inhibitionMask  = spData.inhibitionMasks[columnIndex];
        // var potentialPool  = spData.potentialPools[columnIndex];
        // _.each(inhibitionMask, function(maskIndex) {
        //     updateColumn(maskIndex, colors.neighbors, colors.activeInNeighbors);
        // });
        // updateColumn(columnIndex, colors.selected);
        // _.each(potentialPool, function(poolIndex) {
        //     var xMax = inputCells.getY();
        //     var x = Math.floor(poolIndex / xMax);
        //     var y = poolIndex - (x * xMax);
        //     // inputCells.update(x, y, 0, {color: colors.field}, {exclude: {color: colors.input}});
        //     inputCells.peekUpdate(x, y, 0, function(value, update) {
        //         if (value.color == colors.input) {
        //             update({color: colors.inputInField});
        //         } else {
        //             update({color: colors.field});
        //         }
        //     });
        // });

        // _.each(inputEncoding, function(bit, i) {
        //     var pos = oneDimIndexToXyz(i, inputDimensions[0], inputDimensions[1]);
        //     var color = colors.inactive;
        //     if (bit == 1) {
        //         color = colors.input;
        //         if (selectedColumn != undefined && potentialPools[selectedColumn].indexOf(i) > -1) {
        //             color = colors.inputInField;
        //         }
        //     } else if (selectedColumn != undefined && potentialPools[selectedColumn].indexOf(i) > -1) {
        //         color = colors.field;
        //     }
        //     inputCells.update(pos.x, pos.y, pos.z, {color: color});
        // });
        //
        // if (activeDutyCycles) {
        //     minAdc = _.min(activeDutyCycles);
        //     maxAdc = _.max(activeDutyCycles);
        // }
        // _.each(activeColumns, function(bit, i) {
        //     var pos = oneDimIndexToXyz(i, columnDimensions[0], columnDimensions[1]);
        //     var color = colors.inactive;
        //     var translatedAdc;
        //     if (bit == 1) color = colors.active;
        //     if (selectedColumn && inhibitionMasks[selectedColumn].indexOf(i) > -1) {
        //         if (color == colors.active) color = colors.activeInNeighbors;
        //         else color = colors.neighbors;
        //     }
        //     if (spData.activeDutyCycles) {
        //         translatedAdc = translate(spData.activeDutyCycles[i], minAdc, maxAdc);
        //         color = getGreenToRed(translatedAdc);
        //         console.log('%s ==> %s', translatedAdc, color.getHex());
        //     }
        //     _.times(cellsPerColumn, function(count) {
        //         spColumns.update(pos.x, pos.y, count, {color: color});
        //     });
        // });

        cellviz.redraw();
    }

    function sendSpData(data, mainCallback) {
        var encoding = data;
        if (SDR.tools.population(data) > data.length *.9) {
            encoding = SDR.tools.invert(data);
        }
        spClient.compute(encoding, {
            learn: true,
            getInhibitionMasks: true,
            getPotentialPools: true,
            //getActiveDutyCycles: true
        }, function(err, response) {
            if (err) throw err;
            var activeColumns = response.activeColumns;
            spData = response;
            spData.inputEncoding = encoding;
            framesSeen++;
            $('#num-active-columns').html(SDR.tools.population(activeColumns));
            updateCellRepresentations();
            history.input.push(encoding);
            history.activeColumns.push(activeColumns);
            if (mainCallback) mainCallback();
        });
    }

    function nextFrame() {
        currentFrame++;
        if (currentFrame == gifData.dimensions[2]) {
            currentFrame = 0;
        }
    }

    function runCurrentFrame() {
        sendSpData(gifData.data[currentFrame], function() {
            if (! paused) {
                runCurrentFrame();
            }
        });
        // After running, loop back if necessary.
        nextFrame()
    }

    function play() {
        paused = false;
        if (currentFrame == undefined) {
            currentFrame = 0;
        }
        runCurrentFrame()
    }

    function pause() {
        paused = true;
    }

    function clearAllCells() {
        spColumns.updateAll({color: colors.inactive});
        inputCells.updateAll({color: colors.inactive});
    }

    function initSp(mainCallback) {
        loading(true);
        // This might be an interested view to show boosting in action.
        //learnSpParams.setParam("maxBoost", 2);
        spClient = new HTM.SpatialPoolerClient(save);

        // Custom stuff for topology
        spParams.setParam('globalInhibition', false);
        spParams.setParam('potentialRadius', Math.floor(inputDimensions[0] / 4));
        spParams.setParam('localAreaDensity', 0.1);
        spParams.setParam('numActiveColumnsPerInhArea', 1);
        spParams.setParam('wrapAround', wrapAround);
        spParams.setParam('maxBoost', 10);
        //spParams.setParam('stimulusThreshold', 10.0);

        spClient.initialize(spParams.getParams(), function(err, resp) {
            loading(false);
            if (mainCallback) mainCallback(err, resp);
        });
    }

    function setupCellViz() {
        var inputDimensions = getInputDimension();
        inputCells = new HtmCells(inputDimensions[0], inputDimensions[1], 1);
        spColumns = new HtmCells(columnDimensions[0], columnDimensions[1], cellsPerColumn);
        cellviz = new SpToInputVisualization(inputCells, spColumns);
        clearAllCells();
        cellviz.render();
    }

    function addClickHandling() {

        function inputClicked(cellData) {

        }

        function updateColumn(index, color, collisionColor) {
            var xMax = columnDimensions[0];
            var x = Math.floor(index / xMax);
            var y = index - (x * xMax);
            _.times(cellsPerColumn, function(count) {
                spColumns.peekUpdate(x, y, count, function(value, update) {
                    if (collisionColor && value.color != colors.inactive) {
                        update({color: collisionColor});
                    } else {
                        update({color: color});
                    }
                });
            });
        }

        function spClicked(cellData) {
            selectedColumn = cellData.x * spColumns.getX() + cellData.y;
            updateCellRepresentations();
        }

        function cellClicked(cellData) {
            if (cellData.type == 'inputCells') inputClicked(cellData);
            else spClicked(cellData);
        }

        function onDocumentMouseDown( event ) {
            event.preventDefault();

            // update the mouse variable
            var x = ( event.clientX / cellviz.renderer.domElement.clientWidth ) * 2 - 1;
            var y = - ( event.clientY / cellviz.renderer.domElement.clientHeight ) * 2 + 1;

            // find intersections
            // create a Ray with origin at the mouse position
            //   and direction into the scene (camera direction)
            var vector = new THREE.Vector3( x, y, 1 );
            vector.unproject(cellviz.camera);
            var ray = new THREE.Raycaster( cellviz.camera.position, vector.sub( cellviz.camera.position ).normalize() );
            // create an array containing all objects in the scene with which the ray intersects
            var intersects = ray.intersectObjects(cellviz.getTargets());

            // if there is one (or more) intersections
            if ( intersects.length > 0 ) {
                cellClicked(intersects[0].object._cellData);
            }
        }
        $('canvas').click(onDocumentMouseDown);
    }

    function loadGifJson(callback) {
        var path = '/static/data/gifData/' + getUrlParameter('load') + '.json';
        $.getJSON(path, function(data) {
            gifData = data;
            inputDimensions = getInputDimension();
            columnDimensions = getColumnDimensions();
            spParams = new HTM.utils.sp.Params(
                'sp-params', inputDimensions, columnDimensions
            );
            callback();
        });
    }

    function setupDatGui() {
        var params = {
            run: false,
            spacing: 1.4,
            layerSpacing: 15
        };
        var gui = new dat.GUI();
        gui.add(params, 'layerSpacing').min(-10).max(100).onChange(function(layerSpacing) {
            cellviz.layerSpacing = layerSpacing;
            cellviz.redraw();
        });
        gui.add(params, 'spacing').min(1.1).max(10).onChange(function(spacing) {
            cellviz.spacing = spacing;
            cellviz.redraw();
        });
        gui.add(params, 'run').onChange(function(run) {
            cellviz.run = run;
            if (paused) play();
            else pause();
        });
    }


    $('h1').remove();

    loading(true, true);
    loadGifJson(function() {
        initSp(function(err, r) {
            if (err) throw err;
            spData = r;
            spData.inputEncoding = gifData.data[currentFrame];
            setupCellViz();
            addClickHandling();
            setupDatGui();
            loading(false);
        });
    });

});
