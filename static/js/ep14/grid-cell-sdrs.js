$(function () {
    let HexagonGridCellModule = window.HTM.gridCells.HexagonGridCellModule
    let GridCellModuleRenderer = window.HTM.gridCells.GridCellModuleRenderer

    const minScale = 40,
        maxScale = 300,
        minOrientation = 0,
        maxOrientation = 45

    let GlobalConfig = function() {
        this.lite = true
        this.sdr = true
        this.showFields = true
        this.fillOpacity = 0.5
        this.screenLock = false
        this.showNumbers = false
        this.stroke = 3
        this.textSize = 16
        this.sdrSize = 20
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

        gui.add(config, 'lite').onChange(function(value) {
            config.lite = value;
            renderer.render(config);
        });

        gui.add(config, 'sdr').onChange(function(value) {
            config.sdr = value;
            renderer.render(config);
        });

        gui.add(config, 'showFields').onChange(function(value) {
            config.showFields = value;
            renderer.render(config);
        });

        gui.add(config, 'showNumbers').onChange(function(value) {
            config.showNumbers = value;
            renderer.render(config);
        });

        modules.forEach(function(module, i) {
            let folder = gui.addFolder('Module ' + module.id)
            folder.add(module, 'visible').onChange(function(value) {
                module.visible = value;
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
            moduleFolders.push(folder);
        });
        gui.close()
    }

    function injectGridCellModuleSet(numModules, maxScale) {
        let count = 0
        let scale = maxScale
        let cellsPerRow = 10
        let activeCells = 4

        while (count < numModules) {
            let orientation = getRandomInt(0, 60)
            let module = new HexagonGridCellModule(
              gridCellModules.length, cellsPerRow, cellsPerRow, orientation, scale
            )
            module.setColor(
              getRandomInt(0, 255),
              getRandomInt(0, 255),
              getRandomInt(0, 255)
            )
            module.activeCells = activeCells
            module.weight = 1
            module.visible = true
            gridCellModules.push(module)
            scale = scale / 1.4
            count++
        }
    }

    // END UTILS
    /////////////

    let gridCellModules = [];


    function run() {
        prepareDom();

        injectGridCellModuleSet(8, maxScale)

        let renderer = new GridCellModuleRenderer(gridCellModules)

        renderer.prepareRender();
        setupDatGui(gridCellModules, renderer)

        renderer.render(config)

        if (renderer.worldPoints) {

            renderer.onWorld('mousemove', function() {
                renderer.renderFromWorld(config, d3.event.pageX, d3.event.pageY)
            });

            renderer.onWorld('click', function() {
                renderer.saveLocationEncoding(d3.event.pageX, d3.event.pageY, renderer.encoding)
            })
        }
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
