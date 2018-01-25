$(function () {

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

    function setupDatGui(modules, $world) {
        var gui = new dat.GUI();
        gui.add(config, 'lite').onChange(function(value) {
            config.lite = value;
            modules.forEach(function(m) {
                m.renderPoints($world, config.lite);
            });
        });
        modules.forEach(function(module) {
            let folder = gui.addFolder('Module ' + module.id);
            folder.add(module, 'length', 10, 100).onChange(function(value) {
                module.length = value;
                module.renderPoints($world, config.lite);
            });
            folder.add(module, 'dotSize', 1, 100).onChange(function(value) {
                module.dotSize = value;
                module.renderPoints($world, config.lite);
            });
            folder.add(module, 'orientation', -45, 45).onChange(function(value) {
                module.orientation = value;
                module.renderPoints($world, config.lite);
            });
            folder.open();
        });
    }

    function run() {
        prepareDom();

        d3.select('body')
            .append('svg')
            .attr('id', 'world')
            .attr('width', window.innerWidth)
            .attr('height', window.innerHeight);

        let $world = d3.select('#world');

        let numModules = 10;
        if (numModules > 5) config.lite = true;

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
            let module = new window.HTM.utils.gridCells.GridCellModule(
                id, gridWidth, gridHeight, gridLength,
                dotSize, orientation, r, g, b
            );
            gridCellModules.push(module);

            module.renderPoints(d3.select('#world'));

            $world.on('mousemove', function() {
                gridCellModules.forEach(function(module) {
                    d3.selectAll('g').attr("visibility", "visible");
                    module.intersect(d3.event.pageX, d3.event.pageY);
                    module.renderPoints($world, config.lite);
                });
            });

        }

        setupDatGui(gridCellModules, $world);

    }

    window.onload = run;
});
