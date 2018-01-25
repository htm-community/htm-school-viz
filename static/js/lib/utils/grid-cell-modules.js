$(function () {

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
        constructor(id, x, y, gridCell, size) {
            this.id = id;
            this.x = x;
            this.y = y;
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

        createPoints(width, height) {
            let x = 0, y = 0, gridx = 0, gridy = 0;
            let id = 0;
            let points = [];
            while (y <= height) {
                gridx = 0;
                while (x <= width) {
                    let xmod = x;
                    let ymod = y;
                    let originx = width / 2;
                    let originy = height / 2;
                    // offset by 1/2 width
                    // Odd rows shifted for isometric display
                    if (gridy % 2 > 0) {
                        xmod += this.length / 2;
                    }
                    // Rotate, using center as origin.
                    let rotatedPoint = translatePoint(
                        xmod, ymod, originx, originy, this.orientation
                    );
                    xmod = rotatedPoint.x;
                    ymod = rotatedPoint.y;
                    let p = new Point(
                        id++, xmod, ymod, this.gridCells[gridy][gridx], this.dotSize
                    );
                    points.push(p);
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

        renderPoints($svg, lite) {
            let me = this;
            this.points = this.createPoints($svg.attr('width'), $svg.attr('height'), true);
            let moduleGroup = $svg.select("g#module-" + this.id);
            if (moduleGroup.empty()) {
                moduleGroup = $svg.append("g").attr("id", "module-" + this.id);
            }
            moduleGroup.text('');
            let dots = moduleGroup.selectAll("circle")
                .data(this.points);
            dots.enter().append("circle")
                .attr("cx", function(p) { return p.x; })
                .attr("cy", function(p) { return p.y; })
                .attr("r", function (p) { return p.size; })
                .style("fill", function(p) {
                    let alpha = p.alpha;
                    if (lite) alpha = off;
                    if (p.gridCell.isActive()) {
                        alpha = on;
                    }
                    return 'rgba(' + me.r + ',' + me.g + ',' + me.b + ',' + alpha + ')';
                });
            return dots;
        }

        renderModuleBoundaries($svg) {
            let w = $svg.attr('width');
            let h = $svg.attr('height');
            let moduleGroup = $svg.select("g#module-border-" + this.id);
            if (moduleGroup.empty()) {
                moduleGroup = $svg.append("g").attr("id", "module-" + this.id);
            }

        }

        intersect(x, y) {
            console.log("Intersecting module at %s, %s", x, y);
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

    window.HTM.utils.gridCells = {
        Point: Point,
        GridCell: GridCell,
        GridCellModule: GridCellModule
    };
});
