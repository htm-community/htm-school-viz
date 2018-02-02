$(function () {

let uniqueArray = (arrArg) => arrArg.filter((elem, pos, arr) => arr.indexOf(elem) == pos);

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
        this.visible = true
    }

    static translatePoint(pointX, pointY, originX, originY, degrees) {
        let angle = degrees * (Math.PI / 180);
        return {
            x: Math.cos(angle) * (pointX - originX)
                - Math.sin(angle) * (pointY - originY) + originX,
            y: Math.sin(angle) * (pointX - originX)
                + Math.cos(angle) * (pointY - originY) + originY
        }
    }

    static getRandomInt(minin, maxin) {
        let min = Math.ceil(minin);
        let max = Math.floor(maxin);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    createOverlayPoints() {
        throw new Error(
            'GridCellModule implementations must provide createOverlayPoints()'
        )
    }

    createWorldPoints(origin, w, h, orientation) {
        throw new Error(
            'GridCellModule implementations must provide createWorldPoints()'
        )
    }

    createGridCells() {
        throw new Error(
            'GridCellModule implementations must provide createGridCells()'
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

    intersect(x, y, points) {
        let cellsByDistance = this.getGridCellsByDistance(x, y, points)
        let cellsToChoose = 1
        this.clearActiveGridCells()
        cellsByDistance.slice(0, cellsToChoose).forEach(function(gridCell) {
            if (! gridCell.isPadding) gridCell.activate()
        })
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

window.HTM.gridCells = {
    GridCell: GridCell,
    GridCellModule: GridCellModule
}

})
