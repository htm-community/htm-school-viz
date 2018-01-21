$(function () {

    let worldCanvas = document.getElementById('world');
    let worldCtx = worldCanvas.getContext('2d');
    let $showInactive = $('#show-inactive').bootstrapSwitch({state: false});
    let $showRotation = $('#show-rotation').bootstrapSwitch({state: false});
    let gridCellModules = [];
    let showInactiveCells = false;
    let showRotation = true;
    let $gridCellModuleContainer = $('#grid-cell-module-canvas-container');
    let $nSlider = $('#n-slider');
    let cellSensitivity = 2;
    let selectedGridCellModuleIndex;

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }

    function drawGridCellModuleCanvas(module, count) {
        let width = module.width * module.length + module.length / 2;
        let height = module.height * module.length;
        // console.log("Converting module w/h/l %s/%s/%s to pixels %s , %s", module.width, module.height, module.length, width, height);
        let $module = $gridCellModuleContainer.find('#module-' + count);
        if ($module.length == 0) {
            $module = $('<canvas id="module-' + count + '" width="'
                + (width - module.length) + '" height="' + (height - module.length) + '"></canvas>');
            $module.appendTo($gridCellModuleContainer);
        }
        let modCanvas = document.getElementById('module-' + count);
        let modCtx = modCanvas.getContext('2d');
        let rotateString = 'rotate(0deg)';
        if (showRotation) {
            rotateString = 'rotate(' + module.orientation + 'deg)';
        }
        $(modCanvas).css({
            '-moz-transform': rotateString,
            '-webkit-transform': rotateString,
            '-o-transform': rotateString,
            '-ms-transform': rotateString,
            'transform': rotateString
        });
        modCanvas.addEventListener('mousemove', function (evt) {
            let mousePos = getMousePos(modCanvas, evt);
            console.log('over module %s at %s,%s', count, mousePos.x, mousePos.y);
            intersectModule(count, mousePos.x, mousePos.y);
        }, false);
        module.render(modCtx, modCanvas.width, modCanvas.height, true, true);
    }

    function draw() {
        worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
        let numModules = 4;
        gridCellModules = [];

        for (let i of Array(numModules).keys()) {
            let width = getRandomInt(3, 8);
            let height = getRandomInt(3, 8);
            let scale = getRandomInt(10, 60);
            let red = getRandomInt(0, 255);
            let green = getRandomInt(0, 255);
            let blue = getRandomInt(0, 255);
            let dotSize = scale / 4;
            let orientation = getRandomInt(0, 60);
            let module = new window.HTM.utils.gridCells.GridCellModule(
                width, height, scale, dotSize, orientation, red, green, blue
            );
            gridCellModules.push(module);
        }

        // gridCellModules.push(new window.HTM.utils.gridCells.GridCellModule(
        //   6, 4, 20, 5, 10, getRandomInt(0, 255), getRandomInt(0, 255), getRandomInt(0, 255)
        // ));

        for (let i = 0; i < gridCellModules.length; i++) {
            let module = gridCellModules[i];
            module.render(worldCtx, worldCanvas.width, worldCanvas.height, showInactiveCells);
            drawGridCellModuleCanvas(module, i);
        }
    }

    function intersectModule(moduleId, x, y) {
        worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
        gridCellModules.forEach(function (module, i) {
            module.sensitivity = cellSensitivity;
            let moduleCanvas = document.getElementById('module-' + i);
            let moduleCtx = moduleCanvas.getContext('2d');
            moduleCtx.clearRect(0, 0, moduleCanvas.width, moduleCanvas.height);
            //drawGridCellModuleCanvas(module, i);
            //module.render(moduleCtx, moduleCanvas.width, moduleCanvas.height, true, true);
            //module.render(ctx, worldCanvas.width, worldCanvas.height, showInactiveCells);
        });

    }

    function redraw() {
        worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
        gridCellModules.forEach(function (module, i) {
            module.sensitivity = cellSensitivity;
            let moduleCanvas = document.getElementById('module-' + i);
            let moduleCtx = moduleCanvas.getContext('2d');
            moduleCtx.clearRect(0, 0, moduleCanvas.width, moduleCanvas.height);
            drawGridCellModuleCanvas(module, i);
            module.render(moduleCtx, moduleCanvas.width, moduleCanvas.height, true, true);
            module.render(worldCtx, worldCanvas.width, worldCanvas.height, showInactiveCells);
        });
    }

    function getMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    function intersectPoint(x, y) {
        gridCellModules.forEach(function (module) {
            module.intersect(x, y);
        });
        redraw();
    }

    worldCanvas.addEventListener('mousemove', function (evt) {
        var mousePos = getMousePos(worldCanvas, evt);
        selectedGridCellModuleIndex = undefined;
        intersectPoint(mousePos.x, mousePos.y);
        evt.stopPropagation();
        evt.preventDefault();
    }, false);

    $showInactive.on('switchChange.bootstrapSwitch', function (evt, state) {
        showInactiveCells = !showInactiveCells;
    });

    $showRotation.on('switchChange.bootstrapSwitch', function (evt, state) {
        showRotation = !showRotation;
    });

    $nSlider.slider({
        min: 1, max: 100, value: 1, step: 1,
        slide: function (evt, ui) {
            cellSensitivity = ui.value;
            $('.n-display').html(cellSensitivity);
        }
    });

    $('.n-display').html(cellSensitivity);

    window.onload = draw;

});
