$(function () {
    let HexagonGridCellModule = window.HTM.gridCells.HexagonGridCellModule
    let GridCellModuleRenderer = window.HTM.gridCells.GridCellModuleRenderer

    const minScale = 20,
        maxScale = 100,
        minOrientation = 0,
        maxOrientation = 45

    let GlobalConfig = function() {
        this.lite = false
        this.sdr = false
        this.showFields = false
        this.screenLock = false
        this.showNumbers = false
        this.stroke = 0
        this.textSize = 24
        this.highlightGridCell = 0
    };
    let config = new GlobalConfig();

    //////////
    // UTILS

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }

    function toggleScreenLock() {
        config.screenLock = ! config.screenLock
    }

    function prepareDom() {
        $('body').html('');
    }

    function setupDatGui(modules, renderer) {
        let gui = new dat.GUI();
        let moduleFolders = [];

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
                renderer.render(config);
            });
            folder.add(module, 'weight', 1, 5).onChange(function(value) {
                module.weight = value;
                renderer.render(config);
            }).step(1);
            folder.add(module, 'scale', minScale, maxScale).onChange(function(value) {
                module.scale = value;
                renderer.render(config);
            });
            folder.add(module, 'activeCells', 1, 10).onChange(function(value) {
                module.activeCells = value;
                renderer.render(config);
            }).step(1);
            folder.add(module, 'orientation', minOrientation, maxOrientation).onChange(function(value) {
                module.orientation = value;
                renderer.render(config);
            });
            // folder.open();
            moduleFolders.push(folder);
        });
    }

    // END UTILS
    /////////////

    let gridCellModules = [];


    function run() {
        prepareDom();

        let module = new HexagonGridCellModule(0, 4, 4, 0, 80)
        module.setColor(100, 100, 255)
        module.activeCells = 2
        module.weight = 1
        gridCellModules.push(module)

        let renderer = new GridCellModuleRenderer(gridCellModules)

        renderer.prepareRender();
        setupDatGui(gridCellModules, renderer)

        renderer.render(config)

        let overlaySize = 150
        let overlay = d3.select('#module-overlay-0')
        if (renderer.worldPoints) {

            renderer.onWorld('mousemove', function() {
                renderer.renderFromWorld(config, d3.event.pageX, d3.event.pageY)
                overlay.attr('height', overlaySize)
                overlay.attr('width', overlaySize)
            });

            renderer.onOverlay('mousemove', function(_, i) {
                renderer.renderFromOverlay(i, config, d3.event.offsetX, d3.event.offsetY)
                let overlay = d3.select('#module-overlay-0')
                overlay.attr('height', overlaySize)
                overlay.attr('width', overlaySize)
            })
        }

        overlay.attr('height', overlaySize)
        overlay.attr('width', overlaySize)

    }

    $(document).keyup(function(e) {
        if (e.keyCode === 32) {
            toggleScreenLock();
        }
    });

    window.onload = run;

    // add listener to disable scroll
    window.addEventListener('scroll', () => {
        window.scrollTo( 0, 0 );
    });

});
