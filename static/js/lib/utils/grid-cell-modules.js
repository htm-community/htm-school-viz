$(function () {

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }


    // opacity
    let off = 0.0;
    let dim = 0.1;
    let on = 0.75;

    function includesGridCell(cells, gridCell) {
        let out = false;
        if (cells.length == 0) return out;
        for (let i = 0; i < cells.length; i++) {
            let c = cells[i];
            if (c.x == gridCell.x && c.y) {
                out = true;
                break;
            }
        }
        return out;
    }

    let uniqueArray = (arrArg) => arrArg.filter((elem, pos, arr) => arr.indexOf(elem) == pos);

    function translatePoint(pointX, pointY, originX, originY, degrees) {
        let angle = degrees * (Math.PI / 180);
        return {
            x: Math.cos(angle) * (pointX - originX) - Math.sin(angle) * (pointY - originY) + originX,
            y: Math.sin(angle) * (pointX - originX) + Math.cos(angle) * (pointY - originY) + originY
        };
    }

    class Point {
        constructor(id, x, y, r, g, b, gridCell, size) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.r = r; // red
            this.g = g; // green
            this.b = b; // blue
            this.gridCell = gridCell;
            this.size = size;
            this.alpha = dim;
        }

    }

    class GridCell {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.active = false;
        }

        activate() {
            this.active = true;
        }

        deactivate() {
            this.active = false;
        }

        isActive() {
            return this.active;
        }
    }

    class GridCellModule {
        constructor(id, width, height, length, dotSize, orientation, r, g, b) {
            this.id = id;
            this.width = width; // dimensions, not pixels
            this.height = height; // dimensions, not pixels
            this.length = length; // pixels
            this.dotSize = dotSize; // pixels
            this.orientation = orientation; // degrees
            this.r = r; // red
            this.g = g; // green
            this.b = b; // blue
            this.sensitivity = 1;
            this.gridCells = this.createGridCells();
            this.clearActiveGridCells();
        }

        getGridCellsByDistance(x, y) {
            let points = this.points;
            let mappedDistances = points.map(function (p, i) {
                return {index: i, distance: Math.hypot(p.x - x, p.y - y)};
            });
            mappedDistances.sort(function (a, b) {
                if (a.distance > b.distance) return 1;
                if (a.distance < b.distance) return -1;
                return 0;
            });
            return uniqueArray(mappedDistances.map(function (mappedDistance) {
                return points[mappedDistance.index].gridCell;
            }));
        }

        createGridCells() {
            let x = 0, y = 0;
            let cells = [];
            while (y < this.height) {
                let row = [];
                x = 0;
                while (x < this.width) {
                    row.push(new GridCell(x, y));
                    x++;
                }
                cells.push(row);
                y++;
            }
            return cells;
        }

        createPoints(scale) {
            let height = this.gridCells.length * this.length;
            let width = this.gridCells[0].length * this.length;
            d3.select('#world').attr('width', width * scale).attr('height', height * scale);
            return this.createPointsBounded(width, height).map(function(point) {
                point.x *= scale;
                point.y *= scale;
                return point;
            });
        }

        createPointsBounded(width, height) {
            let x = 0, y = 0, gridx = 0, gridy = 0;
            let id = 0;
            let points = [];
            let buffer = 1.0;
            function pointOffScreen(p) {
                return (p.x < 0 || p.x > width || p.y < 0 || p.y > height);
            }
            // Add buffer so we fill in all the edges
            x = x - width*buffer;
            y = y - height*buffer;
            width += width*buffer;
            height += height*buffer;
            while (y <= height) {
                gridx = 0;
                while (x <= width) {
                    let xmod = x;
                    let ymod = y;
                    let originx = width / 2;
                    let originy = height / 2;

                    xmod += y / 2;
                    // ymod = y - (this.length - Math.sin(60 * (Math.PI / 180)));
                    ymod = y - (y * 0.1);

                    // Rotate, using center as origin.
                    let rotatedPoint = translatePoint(
                        xmod, ymod, originx, originy, this.orientation
                    );
                    xmod = rotatedPoint.x;
                    ymod = rotatedPoint.y;
                    let p = new Point(
                        id++, xmod, ymod, this.r, this.g, this.b,
                        this.gridCells[gridy][gridx], this.dotSize
                    );
                    if (! pointOffScreen(p)) points.push(p);
                    x += this.length;
                    gridx++;
                    if (gridx > this.width - 1) gridx = 0;
                }
                x = 0;
                y += this.length;
                gridy++;
                if (gridy > this.height - 1) gridy = 0;
            }
            return points;
        }

        intersect(x, y) {
            let cellsByDistance = this.getGridCellsByDistance(x, y);
            let cellsToChoose = this.width * this.height * (this.sensitivity / 100);
            if (cellsToChoose < 1) cellsToChoose = 1;
            this.clearActiveGridCells();
            cellsByDistance.slice(0, cellsToChoose).forEach(function(gridCell) {
                gridCell.activate();
            });
        }

        clearActiveGridCells() {
            let cells = this.gridCells;
            for (let x = 0; x < cells.length; x++) {
                for (let y = 0; y < cells[x].length; y++) {
                    cells[x][y].deactivate();
                }
            }
        }
    }

    class GridCellModuleRenderer {
        constructor(modules) {
            this.modules = modules;
        }

        on(eventName, handler) {
            d3.select('#world').on(eventName, handler);
        }

        prepareRender() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.$world = d3.select('body')
                .append('svg')
                .attr('id', 'world')
                .attr('width', this.width)
                .attr('height', this.height);
        }

        renderVoronoi(groups) {
            let width = this.width;
            let height = this.height;
            let voronoi = d3.voronoi();
            voronoi.size([width, height]);

            function treatVoronoiCell(module, paths, points, rgb) {
                paths.attr("class", "cell")
                    .attr("d", function(d, i) {
                        if (!d) return;
                        let first = d[0];
                        let cmd = 'M ' + first[0] + ' ' + first[1] + ' ';
                        for (let j = 1; j < d.length; j++) {
                            cmd += 'L ' + d[j][0] + ' ' + d[j][1] + ' ';
                        }
                        cmd += 'L ' + first[0] + ' ' + first[1] + ' ';
                        return cmd;
                    })
                    .attr('stroke', 'grey')
                    .attr('fill', function(d) {
                        if (!d) return;
                        if (d.gridCell.isActive()) return rgb;
                        return 'none';
                    })
                    .attr('stroke-width', 0.5)
                    .attr('fill-opacity', function(d) {
                        if (!d) return;
                        let a = 0.2;
                        if (d.gridCell.isActive()) {
                            a = .75;
                        }
                        return a;
                    });
                    // .on("mouseover", function(d, i) {
                    //     d3.select("#footer span").text(d.name);
                    //     d3.select("#footer .hint").text(d.city + ", " + d.state);
                    // });
                points.attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; })
                    .attr("r", 2);
            }

            this.modules.forEach(function(m, i) {
                let g = d3.select(groups.nodes()[i]);
                let rgb = 'rgb(' + m.r + ',' + m.g + ',' + m.b + ')';
                // m.points = m.createPoints(10);
                m.points = m.createPointsBounded(width, height);
                let positions = m.points.map(function(p) {
                    return [p.x, p.y];
                });
                let diagram = voronoi(positions);

                let polygons = diagram.polygons();
                let triangles = diagram.triangles();

                // Attach gridcell info to each datum.
                m.points.forEach(function(p, i) {
                    if (polygons[i]) polygons[i].gridCell = p.gridCell;
                    // triangles[i].gridCell = p.gridCell;
                });

                // Update
                let paths = g.selectAll('path').data(polygons);
                let cells = g.selectAll('circle').data(m.points);
                treatVoronoiCell(m, paths, cells, rgb);

                // Enter
                let newPaths = paths.enter().append('path');
                let newCells = cells.enter().append('circle');
                treatVoronoiCell(m, newPaths, newCells, rgb);

                // Exit
                paths.exit().remove();
                cells.exit().remove();
            });

        }

        renderHexDots(groups, lite) {
            let width = this.width;
            let height = this.height;

            function treatCircles(circles) {
                circles
                    .attr('cx', function(p) { return p.x; })
                    .attr('cy', function(p) { return p.y; })
                    .attr('r', function (p) { return p.size; })
                    .style('fill', function(p) {
                        let alpha = p.alpha;
                        if (lite) alpha = off;
                        if (p.gridCell.isActive()) {
                            alpha = on;
                        }
                        return 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha + ')';
                    });
            }

            this.modules.forEach(function(m, i) {
                let group = d3.select(groups.nodes()[i]);
                m.points = m.createPointsBounded(width, height);

                // Update
                let circles = group.selectAll('circle').data(m.points);
                treatCircles(circles);

                // Enter
                let coming = circles.enter().append('circle');
                treatCircles(coming);

                // Exit
                circles.exit().remove();
            });
        }

        render(lite) {
            function treatGroups(groups) {
                groups.attr('id', function(m) {
                        return 'module-' + m.id;
                    })
                    .attr('visibility', function(m) {
                        if (m.visible) return 'visible';
                        return 'hidden';
                    })
                    .attr('class', 'module-group');
            }

            // Update
            let groups = this.$world.selectAll('g').data(this.modules);
            treatGroups(groups);

            // Enter
            let coming = groups.enter().append('g');
            treatGroups(coming);

            // Exit
            groups.exit().remove();

            // this.renderHexDots(groups, lite);
            this.renderVoronoi(d3.selectAll('g.module-group'));
        }
    }

    window.HTM.utils.gridCells = {
        Point: Point,
        GridCell: GridCell,
        GridCellModule: GridCellModule,
        GridCellModuleRenderer: GridCellModuleRenderer
    };
});
