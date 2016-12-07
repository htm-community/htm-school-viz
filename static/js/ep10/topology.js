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
        0: 0xFFFFFF, // white for inactive cells
        1: 0xFFFF00, // yellow for active cells
        2: 0xFF0000, // red for predictive cells
        3: 0xFFAC33, // orange for active & predictive cells
        4: 0x6699FF, // cyan for correctly predicted cells from last step
        5: 0x00FF00  // green for input bits
    };

    // The HtmCells objects that contains cell state.
    var inputCells, spColumns;
    // The Viz object.
    var cellviz;

    // Object keyed by SP type / column index / snapshot type. Contains an array
    // at this point with iteration data.
    var connectionCache = {};
    var selectedColumn = undefined;
    var lastShownConnections = [];
    var lastShownIteration = undefined;

    var spClient;

    var inputDimensions = undefined;
    var columnDimensions = undefined;
    var cellsPerColumn = 4;
    var lengthLargestSide = 32;
    var spParams;

    var paused = false;
    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;
    var showLines = false;

    var wrapAround = false;
    var restrictColumnDimensions = true;

    var spData;

    // Colors
    var colToInputLineColor = '#6762ff';
    var connectionCircleColor = '#1f04ff';


    var $colHistSlider = $('#column-history-slider');
    var $jumpPrevAc = $('#jumpto-prev-ac');
    var $jumpNextAc = $('#jumpto-next-ac');
    var $adcMin = $('#adc-min');
    var $adcMax = $('#adc-max');
    var $boostMin = $('#boost-min');
    var $boostMax = $('#boost-max');
    var $giflist;

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
        return rgbToHex(r, g, 0);
    }

    /* From http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb */
    function rgbToHex(r, g, b) {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function translate(x, min, max) {
        var range = max - min;
        return (x - min) / range;
    }

    function xyzTo1dIndex(cx, cy, cz, xMax, yMax) {
        return cz * xMax * yMax + cy * xMax + cx;
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
        // var dim = [inputDimensions[0], inputDimensions[1]];
        // if (restrictColumnDimensions && _.max(inputDimensions) > 32) {
        //     dim = [inputDimensions[0] / 2, inputDimensions[1] / 2];
        // }
        // return dim;
    }

    function loadGifJson(path, callback) {
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

    function renderSdrs(inputEncoding,
                        activeColumns,
                        inhibitionMasks,
                        potentialPools) {

        _.each(inputEncoding, function(bit, i) {
            var x, y, z;
            var pos = oneDimIndexToXyz(i, inputDimensions[0], inputDimensions[1]);
            var state = 0;
            if (bit == 1) state = 5;
            inputCells.update(pos.x, pos.y, pos.z, {color: state});
        });

        _.each(activeColumns, function(bit, i) {
            var x, y, z;
            var pos = oneDimIndexToXyz(i, columnDimensions[0], columnDimensions[1]);
            var state = 0;
            if (bit == 1) state = 1;
            _.times(cellsPerColumn, function(count) {
                spColumns.update(pos.x, pos.y, count, {color: state});
            });
        });

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
            getPotentialPools: true
        }, function(err, response) {
            if (err) throw err;
            framesSeen++;
            var activeColumns = response.activeColumns;
            $('#num-active-columns').html(SDR.tools.population(activeColumns));
            renderSdrs(
                encoding,
                activeColumns,
                response.inhibitionMasks,
                response.potentialPools
            );
            history.input.push(encoding);
            history.activeColumns.push(activeColumns);
            spData = response;
            if (mainCallback) mainCallback();
        });
    }

    function decideWhetherToSave() {
        var isTransient = getUrlParameter('transient') == 'true';
        if (isTransient) {
            save = false;
        }
    }

    function addDataControlHandlers() {
        $('.player button').click(function(evt) {
            var $btn = $(this);
            if (this.id == 'play') {
                if ($btn.hasClass('btn-success')) {
                    play();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-pause');
                } else {
                    pause();
                    $btn.find('span').attr('class', 'glyphicon glyphicon-play');
                }
                $btn.toggleClass('btn-success');
            } else if (this.id == 'next') {
                runCurrentFrame();
                paused = true;
            }
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
        spColumns.updateAll({color: 0}, {exclude: {color: 1}});
        inputCells.updateAll({color: 0}, {exclude: {color: 5}});
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
        spParams.setParam('maxBoost', 2);
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
        cellviz = new SpToInputVisualization(
            inputCells, spColumns, {
                colors: colors
            }
        );
        clearAllCells();
        cellviz.render({
            rotation: {
                // x: - 75 * Math.PI / 180,
                // y: 45 * Math.PI / 180,
                // z: 45 * Math.PI / 180
            },
            camera: {
                z: 45
            }
        });
    }

    function addClickHandling() {
        var $viz = $('#viz');

        function inputClicked(cellData) {

        }

        function updateColumn(index, value) {
            var xMax = columnDimensions[0];
            var x = Math.floor(index / xMax);
            var y = index - (x * xMax);
            _.times(cellsPerColumn, function(count) {
                spColumns.update(x, y, count, value, {exclude: {color: 1}});
            });
        }

        function spClicked(cellData) {
            var columnIndex = cellData.x * spColumns.getX() + cellData.y;
            var inhibitionMask  = spData.inhibitionMasks[columnIndex];
            var potentialPool  = spData.potentialPools[columnIndex];
            clearAllCells();
            _.each(inhibitionMask, function(maskIndex) {
                updateColumn(maskIndex, {color: 4});
            });
            updateColumn(columnIndex, {color: 2});
            _.each(potentialPool, function(poolIndex) {
                var xMax = inputCells.getY();
                var x = Math.floor(poolIndex / xMax);
                var y = poolIndex - (x * xMax);
                inputCells.update(x, y, 0, {color: 3}, {exclude: {color: 5}});
            });
            cellviz.redraw();
        }

        function cellClicked(cellData) {
            if (cellData.type == 'inputCells') inputClicked(cellData);
            else spClicked(cellData);
        }

        function onDocumentMouseDown( event ) {
            // the following line would stop any other event handler from firing
            // (such as the mouse's TrackballControls)
            // event.preventDefault();

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
        document.addEventListener( 'mousedown', onDocumentMouseDown, false );
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
        // var gui = new dat.GUI();
        // gui.add(text, 'message');
        // gui.add(text, 'speed', -5, 5);
        // gui.add(text, 'displayOutline');
        // gui.add(text, 'explode');
    }

    $('h1').remove();

    loading(true, true);
    loadGifJson(function() {
        initSp(function(err, r) {
            if (err) throw err;
            spData = r;
            addDataControlHandlers();
            setupCellViz();
            setupDatGui();
            addClickHandling();
            loading(false);
        });
    });


});
