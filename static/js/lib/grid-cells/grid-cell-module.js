$(function () {

let uniqueArray = (arrArg) => arrArg.filter((elem, pos, arr) => arr.indexOf(elem) == pos);

class GridCell {
    constructor(id, x, y) {
        this.id = id
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

    constructor(id, orientation) {
        this.id = id
        this.setColor(100, 100, 255)
        this.orientation = orientation || 0
        this.visible = true
        this.activeCells = 1
        this.weight = 1
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

    getEncoding() {
        throw new Error(
            'GridCellModule implementations must provide getEncoding()'
        )
    }

    setColor(r, g, b) {
        this.r = r
        this.g = g
        this.b = b
    }

    getColorString() {
        return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')'
    }

    intersectWorld(x, y, points) {
        // We want to take the mouse position on the world and do two things:
        // 1. mark the closest point(s) in each GCM world where the cursor is
        //    intersecting the world
        // 2. activate grid cells in each GCM globally that correspond to these
        //    points
        let closestPoints = this.getClosestPointsByDistance(x, y, points, this.activeCells)
        this.clearActiveGridCells()
        points.forEach(function(p) { p.hover = false })
        closestPoints.forEach(function(p) {
            p.hover = true
            p.gridCell.activate()
        })
    }

    intersectOverlay(x, y, points) {
        // We want to take the mouse position over the GCM overlay and do
        // these things:
        // 1. turn off all grid cells across all modules
        this.clearActiveGridCells()
        // 2. turn on grid cells within this module corresponding to x,y
        let gridCells = this.getGridCellsByDistance(x, y, points, this.activeCells)
        gridCells.forEach(function(cell) { cell.activate() })
    }

    getClosestPointsByDistance(x, y, points, count) {
        let mappedDistances = points.map(function (p, i) {
            return {index: i, distance: Math.hypot(p.x - x, p.y - y)}
        })
        mappedDistances.sort(function (a, b) {
            if (a.distance > b.distance) return 1
            if (a.distance < b.distance) return -1
            return 0
        })
        let unique = uniqueArray(mappedDistances).slice(0, count)
        return unique.map(function(point) {
            return points[point.index]
        })
    }

    getPointsByDistance(x, y, points) {
        let mappedDistances = points.map(function (p, i) {
            return {index: i, distance: Math.hypot(p.x - x, p.y - y)}
        })
        mappedDistances.sort(function (a, b) {
            if (a.distance > b.distance) return 1
            if (a.distance < b.distance) return -1
            return 0
        })
        return uniqueArray(mappedDistances)
    }

    getGridCellsByDistance(x, y, points, count) {
        let pointsByDistance = this.getPointsByDistance(x, y, points)
        let noPadding = pointsByDistance.filter(function(point) {
            let p = points[point.index]
            return p.gridCell && ! p.gridCell.isPadding
        })
        return noPadding.map(function (mappedDistance) {
            return points[mappedDistance.index].gridCell
        }).slice(0, count)
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
