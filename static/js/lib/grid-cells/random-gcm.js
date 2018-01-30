$(function () {

    let GridCell = window.HTM.gridCells.GridCell
    let GridCellModule = window.HTM.gridCells.GridCellModule

    class RandomGridCellModule extends GridCellModule {
        constructor(id, cellCount) {
            super(id, cellCount, 0)
            this.spacing = 5000
            this.gridCells = this.createGridCells()
        }

        createGridCells() {
            let cells = []
            while (cells.length < this.cellCount) {
                cells.push(new GridCell(0, 0))
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

        get type() {
            return 'random'
        }

        createPoints(origin, w, h) {
            if (this.points) return this.points
            let points = []
            let pointCount = w * h / this.spacing
            for (let i = 0; i < pointCount; i++) {
                let x = GridCellModule.getRandomInt(origin.x, origin.x + w)
                let y = GridCellModule.getRandomInt(origin.y, origin.y + h)
                points.push({
                    id: points.length,
                    x: x,
                    y: y,
                    gridCell: this.gridCells[GridCellModule.getRandomInt(0, this.gridCells.length)],
                    alpha: 0.1
                })
            }
            return points
        }
    }

    window.HTM.gridCells.RandomGridCellModule = RandomGridCellModule

})
