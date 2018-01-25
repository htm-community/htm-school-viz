$(function () {
    let GridCellModule = window.HTM.utils.gridCells.GridCellModule;
    let GridCellModuleRenderer = window.HTM.utils.gridCells.GridCellModuleRenderer;
    // opacity
    let off = 0.0;
    let dim = 0.1;
    let on = 0.75;

    let GlobalConfig = function() {
        this.lite = false;
    };
    let config = new GlobalConfig();

    //////////
    // UTILS

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }

    // END UTILS
    /////////////

    let gridCellModules = [];

    function prepareDom() {
        $('body').html('');
    }
    
    function setupDatGui(modules, renderer) {
        var gui = new dat.GUI();
        gui.add(config, 'lite').onChange(function(value) {
            config.lite = value;
            renderer.render(config.lite);
        });
        modules.forEach(function(module) {
            let folder = gui.addFolder('Module ' + module.id);
            // This is because of laziness.
            module.visible = true;
            folder.add(module, 'visible').onChange(function(value) {
                module.visible = value;
                renderer.render(config.lite);
            });
            folder.add(module, 'length', 10, 100).onChange(function(value) {
                module.length = value;
                renderer.render(config.lite);
            });
            folder.add(module, 'dotSize', 1, 100).onChange(function(value) {
                module.dotSize = value;
                renderer.render(config.lite);
            });
            folder.add(module, 'orientation', -45, 45).onChange(function(value) {
                module.orientation = value;
                renderer.render(config.lite);
            });
            folder.open();
        });
    }

    function run() {
        prepareDom();


        let numModules = 2;
        if (numModules > 5) config.lite = true;

        // Build out modules
        while (gridCellModules.length < numModules) {
            let id = gridCellModules.length;
            let gridWidth = getRandomInt(4, 12);
            let gridHeight = getRandomInt(4, 12);
            let gridLength = getRandomInt(30, 200);
            let dotSize = gridLength / 4;
            let orientation = getRandomInt(-45, 45);
            let r = getRandomInt(0, 155);
            let g = getRandomInt(0, 155);
            let b = getRandomInt(0, 155);
            let module = new GridCellModule(
                id, gridWidth, gridHeight, gridLength,
                dotSize, orientation, r, g, b
            );
            gridCellModules.push(module);
        }

        let renderer = new GridCellModuleRenderer(gridCellModules);

        renderer.prepareRender();
        renderer.render(config.lite);

        renderer.on('mousemove', function() {
            gridCellModules.forEach(function(module) {
                module.intersect(d3.event.pageX, d3.event.pageY);
                renderer.render(config.lite);
            });
        });

        setupDatGui(gridCellModules, renderer);

    }

    window.onload = run;
});
