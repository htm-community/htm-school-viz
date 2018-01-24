$(function () {

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
        constructor(id, x, y, size) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.size = size;
        }
    }

    class GridCell {
        constructor(x, y) {
            this.x = x;
            this.y = y;
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
            this.a = 0.1; // alpha defaults to dim.
            this.sensitivity = 1;
            this.cells = this.createGridCells();
            this.clearActiveGridCells();
        }

        get fillStyle() {
            return 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
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
            let offsetX = 0;
            let offsetY = 0;
            while (y <= height) {
                gridx = 0;
                while (x <= width) {
                    let xmod = x;
                    let ymod = y;
                    let originx = 0; // width / 2;
                    let originy = 0; // height / 2;
                    // offset by 1/2 width
                    // Odd rows shifted for isometric display
                    if (gridy % 2 > 0) {
                        xmod += this.length / 2;
                    }
                    // Rotate, using center as origin.
                    let rotatedPoint = translatePoint(xmod, ymod, originx, originy, this.orientation);
                    xmod = rotatedPoint.x;
                    ymod = rotatedPoint.y;
                    let p = new Point(id++, xmod, ymod, this.dotSize, gridx, gridy);
                    p.gridCell = this.cells[gridy][gridx];
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

        _renderPoints(pnts, el) {
            let me = this;
            let activeGridCells = me.activeGridCells;
            let dots = el.selectAll("circle")
                .data(pnts).enter()
                .append("circle");
            let dotAttributes = dots.attr("cx", function(p) { return p.x; })
                .attr("cy", function(p) { return p.y; })
                .attr("r", function (p) { return p.size; })
                .style("fill", function(p) {
                    if (activeGridCells && activeGridCells.includes(p.gridCell)) {
                        debugger;
                    } else {
                        return me.fillStyle;
                    }
                });
            return dots;
        }

        renderD3World($world, showInactiveCells) {
            let me = this;
            let activeGridCells = me.activeGridCells;
            me.points = me.createPoints($world[0][0].clientWidth, $world[0][0].clientHeight, true);
            me.points.forEach(function (p) {
                if (activeGridCells && activeGridCells.includes(p.gridCell)) {
                    me.a = 1.0;
                } else {
                    if (showInactiveCells) me.a = 0.2;
                    else me.a = 0.0;
                }
            });
            let moduleGroup = $world.append("g").attr("id", me.id);

            let dots = me._renderPoints(this.points, moduleGroup);

            dots.on('mousemove', function() {
                me.intersect(d3.event.pageX, d3.event.pageY);
                dots.data(me.points).enter();
            });
        }

        renderD3GridCellModuleTile($tile) {
            let me = this;
            let pixelWidth = this.width * this.length;
            let pixelHeight = this.height * this.length;
            $tile.attr('width', pixelWidth).attr('height', pixelHeight);

            let activeGridCells = this.activeGridCells;

            this.gridCellPoints = this.createPoints(pixelWidth, pixelHeight);

            this._renderPoints(this.gridCellPoints, $tile);
        }

        intersect(x, y) {
            console.log("Intersecting module at %s, %s", x, y);
            let cellsByDistance = this.getGridCellsByDistance(x, y);
            let cellsToChoose = this.width * this.height * (this.sensitivity / 100);
            if (cellsToChoose < 1) cellsToChoose = 1;
            this.activeGridCells = cellsByDistance.slice(0, cellsToChoose);
            console.log(this.activeGridCells[0])
        }

        clearActiveGridCells() {
            this.activeGridCells = [];
        }
    }

    window.HTM.utils.gridCells = {
        Point: Point,
        GridCell: GridCell,
        GridCellModule: GridCellModule
    };
});
