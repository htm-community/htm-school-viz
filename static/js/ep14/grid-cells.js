$(function() {

    function translatePoint(x, y, degrees) {
        var radians = degrees * (Math.PI / 180);
        return {
            x: x * Math.cos(radians) - y * Math.sin(radians),
            y: y * Math.cos(radians) + x * Math.sin(radians)
        };
    }

    class Point {
        constructor(id, x, y, size, gridx, gridy) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.size = size;
            this.gridx = gridx;
            this.gridy = gridy;
        }
    }

    class GridCell {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }

    class GridCellModule {
        constructor(width, height, length, dotSize, orientation, r, g, b) {
            this.width = width; // dimensions, not pixels
            this.height = height; // dimensions, not pixels
            this.length = length; // pixels
            this.dotSize = dotSize; // pixels
            this.orientation = orientation; // degrees
            this.r = r; // red
            this.g = g; // green
            this.b = b; // blue
            this.a = 0.1; // alpha defaults to dim.
            this.cells = this.createGridCells();
        }

        get fillStyle() {
            return 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
        }

        getGridCellsByDistance(x, y) {
            var points = this.points;
            var mappedDistances = points.map(function(p, i) {
                return {index: i, distance: Math.hypot(p.x - x, p.y - y)};
            });
            mappedDistances.sort(function(a, b) {
                if (a.distance > b.distance) return 1;
                if (a.distance < b.distance) return -1;
                return 0;
            });
            return mappedDistances.map(function(mappedDistance) {
                return points[mappedDistance.index].gridCell;
            });
        }

        createGridCells() {
            let x = 0, y = 0;
            let id = 0;
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
            let x = -width, y = -height, gridx = 0, gridy = 0;
            let id = 0;
            let points = [];
            while (y <= height*2) {
                let row = [];
                gridx = 0;
                while (x <= width*2) {
                    let xmod = x;
                    let ymod = y;
                    // Odd rows shifted for isometric display
                    if (gridy % 2 > 0) { xmod += this.length / 2; }
                    // If orientation is not 0, translate
                    if (this.orientation != 0) {
                        let rotatedPoint = translatePoint(x, y, this.orientation);
                        xmod = rotatedPoint.x;
                        ymod = rotatedPoint.y;
                    }
                    let p = new Point(id++, xmod, ymod, this.dotSize, gridx, gridy)
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

        render(ctx, width, height) {
            var me = this;
            var activeGridCells = this.activeGridCells;
            this.points = this.createPoints(width, height);
            this.points.forEach(function(p, count) {
                let x = p.x, y = p.y, size = p.size;
                if (activeGridCells && activeGridCells.includes(p.gridCell)) {
                    me.a = 0.3;
                } else {
                    me.a = 0.1;
                }
                ctx.fillStyle = me.fillStyle;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, 2 * Math.PI, false);
                ctx.fill();
                // ctx.fillStyle = 'white';
                // ctx.fillText(count, x - size / 2, y + size / 2, size);
            });
        }

        intersect(x, y) {
            var cellsByDistance = this.getGridCellsByDistance(x, y);
            this.activeGridCells = cellsByDistance.slice(0, 1);
        }
    }

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }

    function draw() {
        let canvas = document.getElementById('world');
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let numModules = 5;
        let gridCellModules = [];

        for (let i of Array(numModules).keys()) {
            var width = 4;
            var height = 4;
            var scale = 20;
            var red = getRandomInt(0, 255);
            var green = getRandomInt(0, 255);
            var blue = getRandomInt(0, 255);
            var dotSize = 5;
            var orientation = getRandomInt(0, 30);
            let module = new GridCellModule(width, height, scale, dotSize, orientation, red, green, blue);
            module.render(ctx, canvas.width, canvas.height);
            gridCellModules.push(module);
        }

        function getMousePos(canvas, evt) {
          var rect = canvas.getBoundingClientRect();
          return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
          };
        }

        function intersectPoint(x, y) {
            gridCellModules.forEach(function(module) {
                module.intersect(x, y);
            });
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            gridCellModules.forEach(function(module) {
                module.render(ctx, canvas.width, canvas.height);
            });
        }

        canvas.addEventListener('mousemove', function(evt) {
          var mousePos = getMousePos(canvas, evt);
          intersectPoint(mousePos.x, mousePos.y);
        }, false);

        intersectPoint(100, 100);
    }

    window.onload = draw;

}());
