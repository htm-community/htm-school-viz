$(function () {

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

    function renderGridCellModuleOverlays() {
        let overlayContainer = d3.select("body").append('div').attr('id', 'module-overlays');
        gridCellModules.forEach(function(module, i) {
            let overlay = overlayContainer.append('div').attr('id', 'module-overlay-' + i);
            let $svg = overlay.append('svg').attr('class', 'tile');
            module.renderD3GridCellModuleTile($svg);
        });
    }

    function run() {
        prepareDom();

        d3.select('body')
            .append("div")
            .classed("svg-container", true) //container class to make it responsive
            .append("svg")
            .attr('id', 'world')
            //responsive SVG needs these 2 attributes and no width and height attr
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 600 400")
            //class to make it responsive
            .classed("svg-content-responsive", true);

        let $world = d3.select('#world');

        let numModules = 4;

        while (gridCellModules.length < numModules) {
            let id = gridCellModules.length;
            let gridWidth = getRandomInt(3, 6);
            let gridHeight = gridWidth; // getRandomInt(3, 6);
            let gridLength = getRandomInt(10, 100);
            let dotSize = gridLength / 4;
            let orientation = getRandomInt(0, 30);
            let r = getRandomInt(0, 155);
            let g = getRandomInt(0, 155);
            let b = getRandomInt(0, 155);
            let module = new window.HTM.utils.gridCells.GridCellModule(
                id, gridWidth, gridHeight, gridLength, dotSize, orientation, r, g, b
            );
            gridCellModules.push(module);
            module.renderD3World($world, true);
        }

        renderGridCellModuleOverlays();
    }

    window.onload = run;
});
