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
        inactive: new THREE.Color('white'),
        active: new THREE.Color('yellow'),
        selected: new THREE.Color('red'),
        field: new THREE.Color('orange'),
        neighbors: new THREE.Color('blue'),
        input: new THREE.Color('green'),
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

    function averageRGB(c1, c2) {
        return c1.clone().lerp(c2, 0.5);
        // return new THREE.Color(
        //     (c1.r + c2.r / 2) * 255,
        //     (c1.g + c2.g / 2) * 255,
        //     (c1.b + c2.b / 2) * 255
        // );
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

    function cellXyToColumnIndex(x, y, yMax) {
        return y * yMax + x;
    }

    // function oneDimIndexToXyz(i, xMax, yMax, zMax) {
    //     var out = {};
    //     var a = xMax * yMax;
    //     out.z = Math.floor(i / a);
    //     var b = i - a * out.z;
    //     out.y = Math.floor(b / xMax);
    //     out.x = b % xMax;
    //     return out;
    // }

    // SP params we are not allowing user to change
    function getInputDimension() {
        //var numBits = gifData.dimensions[0] * gifData.dimensions[1];
        //console.log("Total length of input encoding: %s", numBits);
        return [gifData.dimensions[0], gifData.dimensions[1]];
    }

    function getColumnDimensions() {
        return [12, 12];
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
        var cx, cy, cz, cc;
        var cellIndex, columnIndex;
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
                        if (selectedCell && potentialPools[selectedCell.columnIndex].indexOf(cellIndex) > -1) {
                            color = averageRGB(colors.input, colors.field);
                        }
                    } else if (selectedCell && potentialPools[selectedCell.columnIndex].indexOf(cellIndex) > -1) {
                        color = colors.field;
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
                    color = colors.inactive;
                    cellIndex = xyzToOneDimIndex(cx, cy, cz, maxX, maxY, maxZ);
                    columnIndex = cellXyToColumnIndex(cx, cy, maxY);
                    if (selectedCell && selectedCell.x == cx && selectedCell.y == cy) {
                        color = colors.selected;
                    } else if (spData.activeColumns[columnIndex] == 1) {
                        color = colors.active;
                        if (selectedCell && inhibitionMasks[selectedCell.columnIndex].indexOf(cellIndex) > -1) {
                            color = averageRGB(colors.active, colors.neighbors);
                        }
                    } else {
                        if (selectedCell && inhibitionMasks[selectedCell.columnIndex].indexOf(columnIndex) > -1) {
                            color = colors.neighbors;
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
            cellData.cellIndex = xyzToOneDimIndex(
                cellData.x, cellData.y, cellData.z,
                columnDimensions[0], columnDimensions[1], cellsPerColumn
            );
            cellData.columnIndex = cellXyToColumnIndex(cellData.x, cellData.y, columnDimensions[1]);
            selectedCell = cellData;
            // console.log("clicked: %s, %s, %s == column %s", cellData.x, cellData.y, cellData.z, cellData.columnIndex);
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

    window.addEventListener( 'keyup', function(event) {
        if (event.keyCode == 27) {
            selectedCell = undefined;
            updateCellRepresentations();
        }
    }, false );

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
