$(function () {

// opacity
let off = 0.0
let dim = 0.1
let on = 0.75

let uniqueArray = (arrArg) => arrArg.filter((elem, pos, arr) => arr.indexOf(elem) == pos);

function translatePoint(pointX, pointY, originX, originY, degrees) {
    let angle = degrees * (Math.PI / 180);
    return {
        x: Math.cos(angle) * (pointX - originX) - Math.sin(angle) * (pointY - originY) + originX,
        y: Math.sin(angle) * (pointX - originX) + Math.cos(angle) * (pointY - originY) + originY
    };
}

class GridCell {
    constructor(x, y) {
        this.x = x
        this.y = y
        this.active = false
    }

    activate() {
        this.active = true
    }

    deactivate() {
        this.active = false
    }

    isActive() {
        return this.active
    }
}


class GridCellModule {
    constructor(id, cellCount, orientation) {
        this.id = id
        this.cellCount = cellCount
        this.setColor(100, 100, 255)
        this.orientation = orientation || 0
    }

    createPoints(origin, w, h, orientation) {
        throw new Error(
            'GridCellModule implementations must provide createPoints()'
        )
    }

    createGridCells() {
        throw new Error(
            'GridCellModule implementations must provide createGridCells()'
        )
    }

    intersect(x, y) {
        throw new Error(
            'GridCellModule implementations must provide intersect()'
        )
    }

    getCellCount() {
        return this.cellCount
    }

    setColor(r, g, b) {
        this.r = r
        this.g = g
        this.b = b
    }

    getColorString() {
        return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')'
    }

    getGridCellsByDistance(x, y, points) {
        let mappedDistances = points.map(function (p, i) {
            return {index: i, distance: Math.hypot(p.x - x, p.y - y)}
        })
        mappedDistances.sort(function (a, b) {
            if (a.distance > b.distance) return 1
            if (a.distance < b.distance) return -1
            return 0
        })
        return uniqueArray(mappedDistances.map(function (mappedDistance) {
            return points[mappedDistance.index].gridCell
        }))
    }

    clearActiveGridCells() {
        this.gridCells.forEach(function(cell) { cell.deactivate() });
    }

}

class SquareGridCellModule extends GridCellModule {
    constructor(id, xDim, yDim, orientation, spacing) {
        super(id, xDim * yDim, orientation)
        this.xDim = xDim
        this.yDim = yDim
        this.spacing = spacing
        this.gridCells = this.createGridCells()
    }

    createGridCells() {
        let cells = []
        for (let x = 0; x < this.xDim; x++) {
            for (let y = 0; y < this.yDim; y++) {
                cells.push(new GridCell(x, y))
            }
        }
        return cells
    }

    intersect(x, y) {
        let cellsByDistance = this.getGridCellsByDistance(x, y, this.points)
        let cellsToChoose = 1
        this.clearActiveGridCells()
        cellsByDistance.slice(0, cellsToChoose).forEach(function(gridCell) {
            gridCell.activate()
        })
    }


    _getGridCellAt(x, y) {
        for (let i = 0; i < this.gridCells.length; i++) {
            let cell = this.gridCells[i];
            if (cell.x == x && cell.y == y)
                return cell
        }
        debugger;
    }

    createPoints(origin, w, h) {
        // Start rendering points at the origin by rendering grid cell modules
        // over the entire space, leaving enough room for rotation.
        let startAt = {x: origin.x - w, y: origin.y - h},
            endAt = {x: origin.x + (2 * w), y: origin.y + (2 * h)}
        let x = startAt.x,
            y = startAt.y
        let gridx = 0,
            gridy = 0
        let pointId = 0
        let points = []
        while (y <= endAt.y) {
            gridx = 0
            while (x <= endAt.x) {
                // Rotate, using center as origin.
                let rotatedPoint = translatePoint(
                    x, y, origin.x, origin.y, this.orientation
                );
                let point = {
                    id: pointId++,
                    x: rotatedPoint.x,
                    y: rotatedPoint.y,
                    gridCell: this._getGridCellAt(gridx, gridy),
                    alpha: dim
                }
                // Only save points that are currently on the screen, within a
                // buffer defined by the grid spacing
                if (point.x >= origin.x - this.spacing &&
                    point.x <= origin.x + w + this.spacing &&
                    point.y >= origin.y - this.spacing &&
                    point.y <= origin.y + h + this.spacing) {
                    points.push(point)
                }
                x += this.spacing
                gridx++
                // This resets the grid cell module x dimension so it tiles.
                if (gridx > this.xDim - 1) gridx = 0
            }
            // Reset X to walk through the next row
            x = 0
            y += this.spacing
            gridy++
            // This resets the grid cell module y dimension so it tiles.
            if (gridy > this.yDim - 1) gridy = 0
        }
        return points
    }
}

window.HTM.utils.gridCells.SquareGridCellModule = SquareGridCellModule


})
