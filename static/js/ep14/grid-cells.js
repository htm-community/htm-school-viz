$(function () {
    let HexagonGridCellModule = window.HTM.gridCells.HexagonGridCellModule
    let GridCellModuleRenderer = window.HTM.gridCells.GridCellModuleRenderer

    const minSpacing = 50,
        maxSpacing = 60,
        minDim = 3,
        maxDim = 8,
        minOrientation = 0,
        maxOrientation = 90,
        minRgb = 0,
        maxRgb = 155

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

    function prepareDom() {
        $('body').html('');
    }

    function setupDatGui(modules, renderer) {
        let gui = new dat.GUI();
        let moduleFolders = [];

        gui.add(config, 'lite').onChange(function(value) {
            config.lite = value;
            renderer.render(config.lite);
        });

        function updateAllControllerDisplays() {
            moduleFolders.forEach(function(folder) {
                for (let i in folder.__controllers) {
                    folder.__controllers[i].updateDisplay();
                }
            });
        }

        modules.forEach(function(module, i) {
            let folder = gui.addFolder('Module ' + module.id)
            // This is because of laziness.
            module.visible = true;
            folder.add(module, 'visible').onChange(function(value) {
                module.visible = value;
                renderer.render(config.lite);
            });
            module.solo = false;
            folder.add(module, 'solo').onChange(function(value) {
                modules.forEach(function(m) {
                    m.visible = ! value;
                    m.solo = false;
                });
                module.solo = value;
                module.visible = true;
                renderer.render(config.lite);
                updateAllControllerDisplays();
            });
            folder.add(module, 'spacing', minSpacing, maxSpacing).onChange(function(value) {
                module.spacing = value;
                renderer.render(config.lite);
            });
            folder.add(module, 'orientation', minOrientation, maxOrientation).onChange(function(value) {
                module.orientation = value;
                renderer.render(config.lite);
            });
            folder.open();
            moduleFolders.push(folder);
        });
    }

    // END UTILS
    /////////////

    let gridCellModules = [];


    function run() {
        prepareDom();

        let numModules = 3;
        if (numModules > 5) config.lite = true;
        if (numModules == 1) {
            let module = new HexagonGridCellModule(0, 4, 3, 0, 60);
            gridCellModules.push(module);
        } else {
            while (gridCellModules.length < numModules) {
                let id = gridCellModules.length
                let xDim= getRandomInt(minDim, maxDim)
                let yDim = getRandomInt(minDim, maxDim)
                let spacing= getRandomInt(minSpacing, maxSpacing)
                let orientation = getRandomInt(minOrientation, maxOrientation)
                let r = getRandomInt(minRgb, maxRgb)
                let g = getRandomInt(minRgb, maxRgb)
                let b = getRandomInt(minRgb, maxRgb)
                let module = new HexagonGridCellModule(id, xDim, yDim, orientation, spacing)
                module.setColor(r, g, b)
                gridCellModules.push(module)
            }
        }

        let renderer = new GridCellModuleRenderer(gridCellModules)

        renderer.prepareRender();
        setupDatGui(gridCellModules, renderer)
        renderer.render(config.lite)

        if (renderer.worldPoints) {

            renderer.on('mousemove', function() {
                gridCellModules.forEach(function(module, i) {
                    module.intersect(d3.event.pageX, d3.event.pageY, renderer.worldPoints[i])
                    renderer.render(config.lite)
                });
            });
        }
    }

    window.onload = run;
});
