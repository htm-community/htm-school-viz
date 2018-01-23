$(function () {

    let worldCanvas = document.getElementById('world');
    let worldCtx = worldCanvas.getContext('2d');
    let gridCellModules = [];
    let $gridCellModuleContainer = $('#grid-cell-module-canvas-container');
    let $nSlider = $('#n-slider');
    let cellSensitivity = 2;
    let selectedGridCellModuleIndex;
    let gridCellModuleParamTemplate;

    function loadTemplates(callback) {
        $.get('/static/tmpl/grid-cell-module-params.hbs', function(tmpl) {
            gridCellModuleParamTemplate = Handlebars.compile(tmpl);
            if (callback) callback();
        });
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }

    function drawGridCellModuleCanvas(module, id) {
        let width = module.width * module.length + module.length / 2;
        let height = module.height * module.length;
        let longest = Math.max(width, height);
        $('body').append(gridCellModuleParamTemplate({
            id: id, size: module.dotSize,
            width: longest, height: longest, length: module.length,
            orientation: module.orientation
        }));
        let $rotationSlider = $('#rotation-slider-' + id);
        $rotationSlider.slider({
            min: 0, max: 90, value: module.orientation, step: 1,
            slide: function (evt, ui) {
                module.orientation = ui.value;
                $('#rotation-value-' + id).html(module.orientation);
                redraw();
            }
        });
        let $lengthSlider = $('#length-slider-' + id);
        $lengthSlider.slider({
            min: 0, max: 200, value: module.length, step: 1,
            slide: function (evt, ui) {
                module.length= ui.value;
                $('#length-value-' + id).html(module.length);
                redraw();
            }
        });
        let $sizeSlider = $('#size-slider-' + id);
        $sizeSlider.slider({
            min: 0, max: 100, value: module.dotSize, step: 1,
            slide: function (evt, ui) {
                module.dotSize = ui.value;
                $('#size-value-' + id).html(module.dotSize);
                redraw();
            }
        });
        let modCanvas = document.getElementById('module-canvas-' + id);
        let $modCanvas = $(modCanvas);
        let modCtx = modCanvas.getContext('2d');

        /**************************************************
         * This is the Grid Cell Module mouseover handler.
         **************************************************/
        if (! module.listening) {
            $modCanvas.on('mousemove', function (evt) {
                let mousePos = getMousePos(modCanvas, evt);
                selectedGridCellModuleIndex = id;
                intersectModule(id, mousePos.x, mousePos.y);
            });
            module.listening = true;
        }
        module.renderGridCellModule(modCtx, modCanvas.width, modCanvas.height, true);
    }

    function intersectModule(moduleId, x, y) {
        gridCellModules.forEach(function(module, i) {
            if (i == moduleId) module.intersect(x, y);
            else module.clearActiveGridCells();
        });
        redraw();
    }

    function draw() {
        worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
        let numModules = 10;
        gridCellModules = [];

        //for (let i of Array(numModules).keys()) {
        //    let darkness = 200;
        //    let width = getRandomInt(3, 8);
        //    let height = width;
        //    if (height%2==1) height++;
        //    let scale = getRandomInt(10, 80);
        //    let red = getRandomInt(0, darkness);
        //    let green = getRandomInt(0, darkness);
        //    let blue = getRandomInt(0, darkness);
        //    let dotSize = scale / 4;
        //    let orientation = getRandomInt(0, 90);
        //    let module = new window.HTM.utils.gridCells.GridCellModule(
        //        width, height, scale, dotSize, orientation, red, green, blue
        //    );
        //    gridCellModules.push(module);
        //}

        gridCellModules.push(new window.HTM.utils.gridCells.GridCellModule(
            4, 4, 50, 10, 0, 255, 0, 0
        ));

        //gridCellModules.push(new window.HTM.utils.gridCells.GridCellModule(
        //    6, 6, 20, 10, 30, 50, 100, 255
        //));

        //gridCellModules.push(new window.HTM.utils.gridCells.GridCellModule(
        //    4, 4, 70, 10, 0, 0, 0, 255
        //));

        for (let i = 0; i < gridCellModules.length; i++) {
            let module = gridCellModules[i];
            module.renderWorld(worldCtx, worldCanvas.width, worldCanvas.height);
            drawGridCellModuleCanvas(module, i);
        }
    }

    function redraw() {
        worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
        gridCellModules.forEach(function (module, i) {
            module.sensitivity = cellSensitivity;
            let moduleCanvas = document.getElementById('module-canvas-' + i);
            let moduleCtx = moduleCanvas.getContext('2d');
            let showInactive = selectedGridCellModuleIndex == i;
            moduleCtx.clearRect(0, 0, moduleCanvas.width, moduleCanvas.height);
            module.renderWorld(worldCtx, worldCanvas.width, worldCanvas.height, showInactive);
            module.renderGridCellModule(moduleCtx, moduleCanvas.width, moduleCanvas.height, true);

            //if (selectedGridCellModuleIndex == undefined) {
            //} else {
            //
            //}
        });
    }

    function getMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    /**************************************************
     * This is the WORLD mouseover handler.
     **************************************************/
    worldCanvas.addEventListener('mousemove', function (evt) {
        var mousePos = getMousePos(worldCanvas, evt);
        selectedGridCellModuleIndex = undefined;
        gridCellModules.forEach(function (module) {
            module.intersect(mousePos.x, mousePos.y);
        });
        redraw();
    }, false);

    $nSlider.slider({
        min: 1, max: 100, value: 1, step: 1,
        slide: function (evt, ui) {
            cellSensitivity = ui.value;
            $('.n-display').html(cellSensitivity);
        }
    });

    $('.n-display').html(cellSensitivity);

    window.onload = function() {
        loadTemplates(function() {
            draw();
        });
    };

});
