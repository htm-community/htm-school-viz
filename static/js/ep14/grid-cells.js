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
            let $tile = overlay.append('svg').attr('class', 'tile');
            module.setTile($tile);
            module.renderD3GridCellModuleTile();
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

        //let points = [];
        //let max = 1000;
        //
        //function addRandomPoint() {
        //    points.push(
        //        {
        //            x: getRandomInt(0, max), y: getRandomInt(0, max), color: 'black'
        //        }
        //    );
        //}
        //
        //while (points.length < 10) addRandomPoint();
        //
        //function renderStuff() {
        //    let dots = d3.select('#world').selectAll("circle")
        //        .data(points);
        //    dots.enter()
        //        .append("circle")
        //        .attr("cx", function(p) { return p.x; })
        //        .attr("cy", function(p) { return p.y; })
        //        .attr('r', 20)
        //        .attr("fill", function(p) {
        //            console.log('filling ' + p.color);
        //            return p.color;
        //        });
        //    dots.exit();
        //}
        //
        //d3.select('#world').selectAll("circle").on('mousemove', function() {
        //    points[0].color = 'red';
        //    console.log('Updating data');
        //    renderStuff();
        //});
        //
        //renderStuff();

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
            module.setWorld($world);
            module.renderD3World(true);

            $world.on('mousemove', function() {
                gridCellModules.forEach(function(module) {
                    module.intersect(d3.event.pageX, d3.event.pageY);
                    module.renderD3World(true);
                });
            });

        }

        renderGridCellModuleOverlays();
    }

    window.onload = run;
});
