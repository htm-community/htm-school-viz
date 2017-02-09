$(function() {

    var gifData = undefined;
    var currentFrame = 0;
    var framesSeen = 0;

    var history = {
        input: [],
        activeColumns: []
    };

    var colors = {
        inactive: new THREE.Color('#FFFEEE'),
        active: new THREE.Color('#FFF000'),
        selected: new THREE.Color('red'),
        field: new THREE.Color('orange'),
        neighbors: new THREE.Color('#1E90FF'),
        input: new THREE.Color('green'),
        emptyInput: new THREE.Color('#F0FCEF')
    };

    // The HtmCells objects that contains cell state.
    var inputCells, spColumns;
    // The Viz object.
    var cellviz;

    var selectedCell = undefined;

    var spClient;

    var inputDimensions = undefined;
    var columnDimensions = undefined;
    var cellsPerColumn = 4;
    var spParams;
    var useTopology = true;

    var paused = true;
    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;

    var wrapAround = false;
    var restrictColumnDimensions = true;
    var showActiveDutyCycles = false;
    var showOverlapDutyCycles = false;
    var showNeighborhoods = false;

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

    function averageRGB(c1, c2) {
        return c1.clone().lerp(c2, 0.5);
    }

    function translate(x, min, max) {
        var range = max - min;
        return (x - min) / range;
    }

    function xyzToOneDimIndex(x, y, z, xMax, yMax, zMax) {
        var result = (z * xMax * yMax) + (y * xMax) + x;
        // console.log('%s, %s, %s : %s', x, y, z, result);
        return result;
    }

    function cellXyToColumnIndex(x, y, xMax) {
        return y * xMax + x;
    }

    // SP params we are not allowing user to change
    function getInputDimension() {
        return [gifData.dimensions[0], gifData.dimensions[1]];
    }

    function getColumnDimensions() {
        var dim = [inputDimensions[0], inputDimensions[1]];
        if (restrictColumnDimensions && _.max(inputDimensions) >= 32) {
            dim = [Math.floor(inputDimensions[0] / 2.5), Math.floor(inputDimensions[1] / 2.5)];
        }
        return dim;
    }

    function transform1dTo2d(i, dimension) {
        var x = Math.floor(i / dimension);
        var y = i % dimension;
        return [x, y];
    }

    function flip2dIndexList(arr, dimensions) {
        return _.map(arr, function(targetIndex) {
            var lastDimension = dimensions[1];
            var newDimension = dimensions[0];
            var coords = transform1dTo2d(targetIndex, lastDimension);
            //console.log('Flipped %s into a 2d array, from %s to %s', targetIndex, lastDimension, newDimension);
            // Swap the coords.
            var out = cellXyToColumnIndex(coords[0], coords[1], newDimension);
            //console.log('\tFlipping ==> %s, %s into %s', coords[0], coords[1], out);
            return out;
        });
    }

    function updateCellRepresentations() {
        var inputEncoding = spData.inputEncoding;
        var activeColumns = spData.activeColumns;
        var activeDutyCycles = spData.activeDutyCycles;
        var overlapDutyCycles = spData.overlapDutyCycles;
        var potentialPools  = spData.potentialPools;
        var receptiveField;
        var inhibitionMasks  = spData.inhibitionMasks;
        var neighbors;
        var dutyCycle, minDutyCycle, maxDutyCycle, percent;
        var cx, cy, cz;
        var thisCellIndex, thisColumnIndex;
        var xMax, yMax, zMax;
        var color = undefined;

        var activeColumnIndices = SDR.tools.getActiveBits(activeColumns);
        //var activeColumnIndices = flip2dIndexList(activeColumnIndices, columnDimensions);

        xMax = inputCells.getX();
        yMax = inputCells.getY();
        zMax = inputCells.getZ();
        for (cx = 0; cx < xMax; cx++) {
            for (cy = 0; cy < yMax; cy++) {
                for (cz = 0; cz < zMax; cz++) {
                    color = colors.emptyInput;
                    thisCellIndex = xyzToOneDimIndex(cx, cy, cz, xMax, yMax, zMax);
                    thisColumnIndex = cellXyToColumnIndex(cx, cy, xMax);
                    if (inputEncoding[thisCellIndex] == 1) {
                        color = colors.input;
                    }
                    if (selectedCell !== undefined) {
                        receptiveField = potentialPools[selectedCell.columnIndex];
                        //receptiveField = flip2dIndexList(receptiveField , columnDimensions);
                        if (selectedCell != undefined && receptiveField.indexOf(thisColumnIndex) > -1) {
                            if (color == colors.input) {
                                color = averageRGB(color, colors.field);
                            } else {
                                color = colors.field;
                            }
                        }
                    }
                    inputCells.update(cx, cy, cz, {color: color});
                }
            }
        }

        xMax = spColumns.getX();
        yMax = spColumns.getY();
        zMax = spColumns.getZ();
        for (cx = 0; cx < xMax; cx++) {
            for (cy = 0; cy < yMax; cy++) {
                for (cz = 0; cz < zMax; cz++) {
                    color = colors.inactive;
                    thisCellIndex = xyzToOneDimIndex(cx, cy, cz, xMax, yMax, zMax);
                    thisColumnIndex = cellXyToColumnIndex(cx, cy, xMax);

                    if (spData.activeDutyCycles !== undefined) {
                        if (selectedCell !== undefined) {
                            neighbors = inhibitionMasks[selectedCell.columnIndex];
                            if (selectedCell.columnIndex == thisColumnIndex) {
                                color = colors.selected;
                            } else if (showNeighborhoods && selectedCell != undefined && neighbors.indexOf(thisColumnIndex) > -1) {
                                dutyCycle = activeDutyCycles[thisColumnIndex];
                                minDutyCycle = _.min(activeDutyCycles);
                                maxDutyCycle = _.max(activeDutyCycles);
                                percent = translate(dutyCycle, minDutyCycle, maxDutyCycle) * 100;
                                color = getGreenToRed(percent);
                                if (activeColumnIndices.indexOf(thisColumnIndex) > -1) {
                                    color = color.lerp(new THREE.Color('#FFFFFF'), 0.75);
                                }
                            }
                        } else {
                            dutyCycle = activeDutyCycles[thisColumnIndex];
                            minDutyCycle = _.min(activeDutyCycles);
                            maxDutyCycle = _.max(activeDutyCycles);
                            percent = translate(dutyCycle, minDutyCycle, maxDutyCycle) * 100;
                            color = getGreenToRed(percent);
                            if (activeColumnIndices.indexOf(thisColumnIndex) > -1) {
                                color = color.lerp(new THREE.Color('#FFFFFF'), 0.75);
                            }
                        }
                    } else if (spData.overlapDutyCycles !== undefined) {
                        if (selectedCell !== undefined) {
                            neighbors = inhibitionMasks[selectedCell.columnIndex];
                            if (selectedCell.columnIndex == thisColumnIndex) {
                                color = colors.selected;
                            } else if (showNeighborhoods && selectedCell != undefined && neighbors.indexOf(thisColumnIndex) > -1) {
                                dutyCycle = overlapDutyCycles[thisColumnIndex];
                                minDutyCycle = _.min(overlapDutyCycles);
                                maxDutyCycle = _.max(overlapDutyCycles);
                                percent = translate(dutyCycle, minDutyCycle, maxDutyCycle) * 100;
                                color = getGreenToRed(percent);
                                if (activeColumnIndices.indexOf(thisColumnIndex) > -1) {
                                    color = color.lerp(new THREE.Color('#FFFFFF'), 0.75);
                                }
                            }
                        } else {
                            dutyCycle = overlapDutyCycles[thisColumnIndex];
                            minDutyCycle = _.min(overlapDutyCycles);
                            maxDutyCycle = _.max(overlapDutyCycles);
                            percent = translate(dutyCycle, minDutyCycle, maxDutyCycle) * 100;
                            color = getGreenToRed(percent);
                            if (activeColumnIndices.indexOf(thisColumnIndex) > -1) {
                                color = color.lerp(new THREE.Color('#FFFFFF'), 0.75);
                            }

                        }
                    } else {
                        if (activeColumnIndices.indexOf(thisColumnIndex) > -1) {
                            color = colors.active;
                        }
                        if (selectedCell !== undefined) {
                            neighbors = inhibitionMasks[selectedCell.columnIndex];
                            //neighbors = flip2dIndexList(neighbors, columnDimensions);
                            if (selectedCell.columnIndex == thisColumnIndex) {
                                color = colors.selected;
                            } else if (showNeighborhoods && neighbors.indexOf(thisColumnIndex) > -1) {
                                if (color == colors.active) {
                                    color = averageRGB(color, colors.neighbors);
                                } else {
                                    color = colors.neighbors;
                                }
                            }
                        }
                    }
                    spColumns.update(cx, cy, cz, {color: color});
                }
            }
        }

        cellviz.redraw();
    }

    function sendSpData(data, mainCallback) {
        var encoding = data;
        // var computeConfig;
        // computeConfig = {
        //     learn: true,
        //     getInhibitionMasks: true,
        //     getPotentialPools: true
        // };
        var requestedStates = [
            HTM.SpSnapshots.ACT_COL,
            HTM.SpSnapshots.POT_POOLS,
            HTM.SpSnapshots.INH_MASKS,
            HTM.SpSnapshots.CON_SYN
        ];
        if (showActiveDutyCycles) {
            requestedStates.push(HTM.SpSnapshots.ACT_DC);
        }
        if (showOverlapDutyCycles) {
            requestedStates.push(HTM.SpSnapshots.OVP_DC);
        }
        if (SDR.tools.population(data) > data.length *.9) {
            encoding = SDR.tools.invert(data);
        }
        spClient.compute(encoding, true, requestedStates, function(err, response) {
            if (err) throw err;
            var state = response.state;
            var activeColumns = state.activeColumns;
            spData = state;
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
        inputCells.updateAll({color: colors.emptyInput});
    }

    function initSp(mainCallback) {
        loading(true);
        spClient = new HTM.SpatialPoolerClient(false);

        spClient.initialize(spParams.getParams(), function(err, resp) {
            loading(false);
            if (mainCallback) mainCallback(err, resp);
        });
    }

    function configureTopology() {
        var potentialRadius = inputDimensions[0];
        if (useTopology) {
            potentialRadius = Math.floor(inputDimensions[0] / 4);
        }
        spParams.setParam('globalInhibition', ! useTopology);
        spParams.setParam('potentialRadius', potentialRadius);

        spParams.setParam('localAreaDensity', 0.1);
        spParams.setParam('numActiveColumnsPerInhArea', 1);
        spParams.setParam('wrapAround', wrapAround);
        spParams.setParam('boostStrength', 10);
        //spParams.setParam('stimulusThreshold', 10.0);
    }

    function setupCellViz() {
        var inputDimensions = getInputDimension();
        inputCells = new HtmCells(inputDimensions[0], inputDimensions[1], 1);
        spColumns = new HtmCells(columnDimensions[0], columnDimensions[1], cellsPerColumn);
        cellviz = new SpToInputVisualization(inputCells, spColumns);
        cellviz.layerSpacing = 60;
        clearAllCells();
        cellviz.render();
    }

    // function resetVisualizationLocation() {
    //     cellviz.controls.moveVector.x = 0;
    //     cellviz.controls.moveVector.y = 0;
    //     cellviz.controls.moveVector.z = 0;
    //     cellviz.redraw();
    //     // cellviz.controls.object.translateX(0);
    //     // cellviz.controls.object.translateY(0);
    //     // cellviz.controls.object.translateZ(0);
    //     // updateCellRepresentations();
    // }

    function addClickHandling() {

        function inputClicked(cellData) {

        }

        function spClicked(cellData) {
            cellData.cellIndex = xyzToOneDimIndex(
                cellData.x, cellData.y, cellData.z,
                columnDimensions[0], columnDimensions[1], cellsPerColumn
            );
            cellData.columnIndex = cellXyToColumnIndex(cellData.x, cellData.y, columnDimensions[0]);
            selectedCell = cellData;
            console.log("clicked: %s, %s, %s == column %s", cellData.x, cellData.y, cellData.z, cellData.columnIndex);
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
        var next;
        var params = {
            // 'reset view': resetVisualizationLocation,
            topology: useTopology,
            run: false,
            spacing: 1.4,
            layerSpacing: cellviz.layerSpacing,
            next: runCurrentFrame,
            'show ADCs': showActiveDutyCycles,
            'show neighbors': showNeighborhoods,
            'show ODCs': showOverlapDutyCycles
        };
        var gui = new dat.GUI();
        // gui.add(params, 'reset view');
        gui.add(params, 'layerSpacing').min(-10).max(160).onChange(function(layerSpacing) {
            cellviz.layerSpacing = layerSpacing;
            cellviz.redraw();
        });
        // gui.add(params, 'spacing').min(1.1).max(10).onChange(function(spacing) {
        //     cellviz.spacing = spacing;
        //     cellviz.redraw();
        // });
        gui.add(params, 'show ADCs').onChange(function(showAdc) {
            if (showOverlapDutyCycles && showAdc) showOverlapDutyCycles = 0;
            showActiveDutyCycles = showAdc;
            params['show ODCs'] = showOverlapDutyCycles;
            updateCellRepresentations();
        }).listen();
        gui.add(params, 'show neighbors').onChange(function(showNeighbors) {
            showNeighborhoods = showNeighbors;
            updateCellRepresentations();
        }).listen();
        // gui.add(params, 'show ODCs').onChange(function(showOdc) {
        //     if (showActiveDutyCycles && showOdc) showActiveDutyCycles = 0;
        //     showOverlapDutyCycles = showOdc;
        //     params['show ADCs'] = showActiveDutyCycles;
        //     updateCellRepresentations();
        // }).listen();
        gui.add(params, 'topology').onChange(function(choice) {
            useTopology = choice;
            configureTopology();
            clearAllCells();
            loading(true);
            initSp(function(err, r) {
                if (err) throw err;
                pause();
                params.run = false;
                spData = r.state;
                spData.inputEncoding = gifData.data[currentFrame];
                // setupCellViz();
                // addClickHandling();
                // setupDatGui();
                loading(false);
            });

        });
        gui.add(params, 'run').onChange(function(run) {
            params.run = run;
            if (paused) play();
            else pause();
        }).listen();
        gui.add(params, 'next');
    }

    $('h1').remove();

    window.addEventListener( 'keyup', function(event) {
        if (event.keyCode == 27) {
            selectedCell = undefined;
            updateCellRepresentations();
        }
    }, false );

    loading(true, true);
    loadGifJson(function() {
        configureTopology();
        initSp(function(err, r) {
            if (err) throw err;
            spData = r.state;
            spData.inputEncoding = gifData.data[currentFrame];
            setupCellViz();
            addClickHandling();
            setupDatGui();
            loading(false);
        });
    });

});
