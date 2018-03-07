$(function () {

    let GridCell = window.HTM.gridCells.GridCell
    let GridCellModule = window.HTM.gridCells.GridCellModule

    function fillByHover(data, config) {
        if (config.highlightGridCell !== undefined) {
            if (config.highlightGridCell === data.gridCell.id && data.hover)
                return data.rgb
        } else {
            if (data.hover) return data.rgb
        }
        return 'none'
    }


    function fillWithFields(data, config) {
        let point = data
        if (config.highlightGridCell !== undefined) {
            if (config.highlightGridCell === data.gridCell.id) {
                if (! point.gridCell.isPadding && point.gridCell.isActive()) {
                    return data.rgb
                }
            }
            return 'none'
        }
        if (! point.gridCell.isPadding && point.gridCell.isActive()) {
            return data.rgb
        }
        return 'none'
    }

    class OneDimensionalGridCellModule extends GridCellModule {

        constructor(id, xDim, scale) {
            super(id)
            this.xDim = xDim
            this.scale = scale
            this.height = 50
            this.gridCells = this.createGridCells()
        }

        createGridCells() {
            let cells = []
            for (let x = 0; x < this.xDim; x++) {
                cells.push(new GridCell(cells.length, x, 0))
            }
            return cells
        }

        getEncoding() {
            let justGridCells = this.gridCells.filter((gc) => ! gc.isPadding );
            let out = []
            let weight = this.weight
            justGridCells.forEach((gc) => {
                let bit = gc.isActive() ? 1 : 0
                for (let x = 0; x < weight; x++) {
                    out.push(bit)
                }
            })
            return out
        }

        _getGridCellAt(x) {
            for (let i = 0; i < this.gridCells.length; i++) {
                let cell = this.gridCells[i];
                if (cell.x == x)
                    return cell
            }
            debugger;
        }

        createOverlayPoints() {
            let scale = this.scale
            let out = this.gridCells.map(function(gc, i) {
                let x = gc.x * scale;
                return {
                    id: i,
                    x: x,
                    y: 0,
                    gridCell: gc,
                    alpha: 0.1
                }
            });
            return out
        }

        createWorldPoints(origin, w, h) {
            // Start rendering points at the origin by rendering grid cell modules
            // over the entire space, leaving enough room for rotation.
            let startAt = 0,
                endAt = w
            let x = startAt
            let gridx = 0
            let pointId = 0
            let points = []
            while (x <= endAt) {
                let point = {
                    id: pointId++,
                    x: x,
                    y: h/2 - this.height,
                    gridCell: this._getGridCellAt(gridx),
                    alpha: 0.1
                }
                // Only save points that are currently on the screen, within a
                // buffer defined by the grid scale
                if (point.x >= origin.x - this.scale &&
                    point.x <= origin.x + w + this.scale) {
                    points.push(point)
                }
                x += this.scale
                gridx++
                // This resets the grid cell module x dimension so it tiles.
                if (gridx > this.xDim - 1) gridx = 0
            }
            return points
        }

        getShape() {
            return 'rect'
        }

        treatPoint(rects, texts, config) {
            rects.attr("class", "cell")
                .attr('x', function(data) {
                    return data.x
                })
                .attr('y', function(data) {
                    return data.y
                })
                .attr('width', this.scale)
                .attr('height', this.height)
                .attr('stroke', '#bbb')
                .attr('stroke-width', function(data) {
                    let out = config.stroke
                    if (config.lite) out = 0
                    if (data.gridCell.isPadding) out = 0
                    return out
                })
                .attr('fill', (data) => {
                    if (config.showFields) return fillWithFields(data, config)
                    else return fillByHover(data, config)
                })
                .attr('fill-opacity', config.fillOpacity || 0.75)

            texts.attr('x', function(d) {
                return d.x - 3
            })
                .attr('y', function(d) {
                    return d.y + 3
                })
                .attr('font-size', config.textSize)
                .attr('fill', 'white')
                .text(function(d) {
                    let gc = d.gridCell
                    if (! gc.isPadding && gc.isActive())
                        return d.gridCell.id
                })
        }
    }

    window.HTM.gridCells.OneDimensionalGridCellModule = OneDimensionalGridCellModule

})
