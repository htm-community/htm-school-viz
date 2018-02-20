$(function () {
    let HexagonGridCellModule = window.HTM.gridCells.HexagonGridCellModule
    let GridCellModuleRenderer = window.HTM.gridCells.GridCellModuleRenderer

    const minScale = 20,
        maxScale = 80,
        minOrientation = 0,
        maxOrientation = 45

    let GlobalConfig = function() {
        this.lite = true
        this.sdr = false
        this.showFields = true
        this.screenLock = false
        this.showNumbers = false
        this.stroke = 3
    };
    let config = new GlobalConfig();

    // Global mouse location stuff
    let mouseGridSpacing = 100
    let mouseX = 5
    let mouseY = 5
    let mouseDirection = 0
    let mouseCoords

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
            createMouseGrid()
        });

        gui.add(config, 'sdr').onChange(function(value) {
            config.sdr = value;
            d3.select('#encoding svg').remove()
            renderer.render(config);
            createMouseGrid()
        });

        gui.add(config, 'showFields').onChange(function(value) {
            config.showFields = value;
            d3.select('#encoding svg').remove()
            renderer.render(config);
            createMouseGrid()
        });

        gui.add(config, 'showNumbers').onChange(function(value) {
            config.showNumbers = value;
            d3.select('#encoding svg').remove()
            renderer.render(config);
            createMouseGrid()
        });

        modules.forEach(function(module, i) {
            let folder = gui.addFolder('Module ' + module.id)
            folder.add(module, 'visible').onChange(function(value) {
                module.visible = value;
                renderer.render(config);
                createMouseGrid()
            });
            folder.add(module, 'weight', 1, 5).onChange(function(value) {
                module.weight = value;
                renderer.render(config);
                createMouseGrid()
            }).step(1);
            folder.add(module, 'scale', minScale, maxScale).onChange(function(value) {
                module.scale = value;
                renderer.render(config);
                createMouseGrid()
            });
            folder.add(module, 'activeCells', 1, 10).onChange(function(value) {
                module.activeCells = value;
                renderer.render(config);
                createMouseGrid()
            }).step(1);
            folder.add(module, 'orientation', minOrientation, maxOrientation).onChange(function(value) {
                module.orientation = value;
                renderer.render(config);
                createMouseGrid()
            });
            // folder.open();
            moduleFolders.push(folder);
        });
    }

    function renderMouse($parent, gridX, gridY, direction) {
        let mouseWidth = 65
        let rotation = direction
        let mouseLong = 192
        let mouseShort = 65

        function findMouseCenter() {
            let x, y
            if (direction === 0) {
                x = mouseShort / 2
                y = mouseLong / 3
            } else if (direction === 90) {
                x = - mouseLong / 3
                y = mouseShort / 2
            } else if (direction === 180) {
                x = - mouseShort / 2
                y = - mouseLong / 3
            } else if (direction === 270) {
                x = mouseLong / 3
                y = - mouseShort / 2
            }
            return {x:x, y:y}
        }

        function renderMouse(m) {
            let center = findMouseCenter()
            let x = mouseGridSpacing * gridX - center.x;
            let y = mouseGridSpacing * gridY - center.y;
            m.attr('xlink:href', '/static/img/mouse.png')
            m.attr('x', (d) => {
                return x
            })
            .attr('y', (d) => {
                return y
            })
            .attr('width', mouseWidth)
            .attr('transform', (d) => {
                return 'rotate(' + d.direction + ','
                    + x + ','
                    + y + ')'
            })
            return {
                x: mouseGridSpacing * gridX,
                y: mouseGridSpacing * gridY
            }
        }

        let mouse = $parent.selectAll('image')
            .data([{x: gridX, y: gridY, direction: rotation}])
        let mouseCoords = renderMouse(mouse)

        let newMouse = mouse.enter().append('image')
            .attr('id', 'mouse-image')
        renderMouse(newMouse)
        mouse.exit().remove()
        return mouseCoords
    }

    function createMouseGrid() {
        let $world = d3.select('#world');
        let $grid = $world
            .append('g')
            .attr('id', 'mouse-grid')
        let spacing = mouseGridSpacing
        let x = 0
        while (x < window.innerWidth) {
            $grid.append('line')
                .attr('x1', x)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', window.innerHeight)
                .attr("stroke-width", 2)
                .attr("stroke", "grey")
            x += spacing
        }
        let y = 0
        while (y < window.innerHeight) {
            $grid.append('line')
                .attr('x1', 0)
                .attr('y1', y)
                .attr('x2', window.innerWidth)
                .attr('y2', y)
                .attr("stroke-width", 2)
                .attr("stroke", "grey")
            y += spacing
        }
        mouseCoords = renderMouse($world, mouseX, mouseY, mouseDirection)
    }

    // END UTILS
    /////////////

    let gridCellModules = [];

    function run() {
        prepareDom();

        let numModules = 5
        let count = 0

        while (count < numModules) {
            let orientation = getRandomInt(0, 30)
            let scale = getRandomInt(40, 50)
            let module = new HexagonGridCellModule(count, 4, 4, orientation, scale)
            module.setColor(getRandomInt(100, 255), getRandomInt(100, 255), getRandomInt(100, 255))
            module.activeCells = 1
            module.weight = 1
            module.visible = true
            gridCellModules.push(module)
            count++
        }

        let renderer = new GridCellModuleRenderer(gridCellModules)

        renderer.prepareRender();
        setupDatGui(gridCellModules, renderer)

        createMouseGrid()
        renderer.render(config, mouseCoords.x, mouseCoords.y)

        $(document).keyup(function(e) {
            let code = e.keyCode;
            if (code === 32) {
                toggleScreenLock();
                return
            }
            if (code === 37) {
                // lf arrow
                mouseDirection -= 90
            }
            if (code === 39) {
                // rt arrow
                mouseDirection += 90
            }
            if (mouseDirection >= 360) mouseDirection -= 360
            if (mouseDirection < 0) mouseDirection += 360
            if (code === 38) {
                // up arrow
                if (mouseDirection === 0) {
                    mouseY--
                } else if (mouseDirection === 90) {
                    mouseX++
                } else if (mouseDirection === 180) {
                    mouseY++
                } else {
                    mouseX--
                }
            }

            mouseCoords = renderMouse(d3.select('#world'), mouseX, mouseY, mouseDirection)

            renderer.renderFromWorld(config, mouseCoords.x, mouseCoords.y)

            e.preventDefault()
            e.stopPropagation()
        });
    }



    window.onload = run;

    // add listener to disable scroll
    window.addEventListener('scroll', () => {
        window.scrollTo( 0, 0 );
    });
});
