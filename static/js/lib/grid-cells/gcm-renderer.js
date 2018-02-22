$(function () {

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

    class GridCellModuleRenderer {
        constructor(modules) {
            this.modules = modules;
        }

        onWorld(eventName, handler) {
            d3.select('#world').on(eventName, handler);
        }

        onOverlay(eventName, handler) {
            d3.selectAll('#module-overlays svg').on(eventName, handler);
        }

        prepareRender() {
            let me = this;
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.$world = d3.select('body')
                .append('svg')
                .attr('id', 'world')
                .attr('width', this.width)
                .attr('height', this.height);
            this.$gcmPanel = d3.select('body')
                .append('ul')
                .attr('id', 'module-overlays')
            this.modules.forEach(function(module, i) {
                me.$gcmPanel
                    .append('li')
                    .append('svg')
                    .attr('id', 'module-overlay-' + i)
                    .attr('style', () => {
                        let display = 'display:'
                        if (module.visible) display += 'block'
                        else display += 'none'
                        return display
                    })
            });
            d3.select('body').append('div').attr('id', 'encoding')
        }

        render(config, intersectX, intersectY) {
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

            this.renderFromWorld(config, intersectX, intersectY)
            if (config.sdr)
                this.renderSdr()

            // Update module overlay visibility
            this.modules.forEach((m) => {
                let svg= d3.select('#module-overlay-' + m.id)
                let display = 'display:'
                if (m.visible) display += 'inline'
                else display += 'none'
                svg.attr('style', display)
            })
        }

        renderFromWorld(config, mouseX, mouseY) {
            throw new Error(
                'GridCellModuleRenderer implementations must provide renderFromWorld()'
            )
        }

        renderFromOverlay(moduleIndex, config, mouseX, mouseY) {
            throw new Error(
                'GridCellModuleRenderer implementations must provide renderFromOverlay()'
            )
        }

        renderSdr() {
            let encoding = []
            this.modules.forEach(function(m) {
                encoding = encoding.concat(m.getEncoding())
            })
            SDR.draw(encoding, 'encoding', {
                spartan: true,
                size: 30
            });
        }
    }

    class CircleGridCellModuleRenderer extends GridCellModuleRenderer {

        renderFromWorld(config, mouseX, mouseY) {
            if (config.screenLock) return
            let me = this
            let groups = d3.selectAll('g.module-group');
            this._renderWorldCells(groups, config, mouseX, mouseY);
            let configCopy = Object.assign({}, config)
            configCopy.showFields = true
            this.modules.forEach(function(module, i) {
                let svgs = d3.selectAll('#module-overlays svg');
                me._renderModuleOverlayCells(svgs, i, configCopy)
            })
            if (config.sdr)
                this.renderSdr()
        }

        renderFromOverlay(moduleIndex, config, mouseX, mouseY) {
            if (config.screenLock) return
            let me = this
            let configCopy = Object.assign({}, config)
            configCopy.showFields = true
            this.modules.forEach(function(module, i) {
                let x = undefined, y = undefined
                if (i == moduleIndex) {
                    x = mouseX
                    y = mouseY
                } else {
                    module.clearActiveGridCells()
                }
                let svgs = d3.selectAll('#module-overlays svg');
                me._renderModuleOverlayCells(svgs, moduleIndex, configCopy, x, y)
            })
            let groups = d3.selectAll('g.module-group');
            this._renderWorldCells(groups, configCopy, fillWithFields);
            if (config.sdr)
                this.renderSdr()
        }

        _renderModuleOverlayCells(svgs, moduleIndex, config, mouseX, mouseY) {
            let me = this
            this.overlayPoints = []
            let m = this.modules[moduleIndex]
            let scale = m.scale
            let origin = {x: scale*3, y: scale*3}
            let voronoi = d3.voronoi()

            let points = m.createOverlayPoints(origin)
            if (mouseX !== undefined && mouseY !== undefined) {
                m.intersectOverlay(mouseX, mouseY, points)
            }
            me.overlayPoints.push(points)

            let svg = d3.select(svgs.nodes()[moduleIndex])
            let width = Math.max(...points.map(function(p) { return p.x }))
            let height = Math.max(...points.map(function(p) { return p.y }))
            svg.attr('width', width)
                .attr('height', height)

            voronoi.extent([
                [0, 0],
                [width, height]
            ])

            let rgb = m.getColorString()
            let data = points.map((p) => {
                p.rgb = rgb
                return p
            })
            // We always want to show the strokes on module overlays.
            let configCopy = Object.assign({}, config)
            configCopy.lite = false
            me._renderCircleToElement(m, data, svg, configCopy)
        }

        _renderWorldCells(groups, config, mouseX, mouseY) {
            let me = this;
            this.worldPoints = []
            let origin = {x: 0, y: 0}
            let width = this.width;
            let height = this.height;
            let voronoi = d3.voronoi();
            voronoi.extent([[origin.x, origin.x], [width, height]])
            let configCopy = Object.assign({}, config)
            configCopy.stroke = 1
            this.modules.forEach(function(m, i) {
                if (! m.visible) {
                    me.worldPoints.push([])
                    return
                }

                let g = d3.select(groups.nodes()[i]);
                let points = m.createWorldPoints(origin, width, height);

                if (mouseX !== undefined && mouseY !== undefined) {
                    // If x/y are here, it means cursor is over the world so we
                    // need to intersect it.
                    m.intersectWorld(mouseX, mouseY, points)
                }

                me.worldPoints.push(points)

                let rgb = m.getColorString()
                let data = me.worldPoints[i].map((p) => {
                    p.rgb = rgb
                    return p
                })
                me._renderCircleToElement(m, data, g, configCopy)
            });
        }

        _renderCircleToElement(module, data, $target, config) {
            let textData = data
            if (! config.showNumbers) textData = []
            // Update
            let circles = $target.selectAll('circle').data(data)
            let texts = $target.selectAll('text').data(textData)
            this._treatCircle(module, circles, texts, config)

            // Enter
            let newCircs = circles.enter().append('circle')
            let newTexts = texts.enter().append('text')
            this._treatCircle(module, newCircs, newTexts, config)

            // Exit
            circles.exit().remove()
            texts.exit().remove()
        }

        _treatCircle(module, circles, texts, config) {

            circles.attr("class", "cell")
                .attr('cx', function(data) {
                    return data.x
                })
                .attr('cy', function(data) {
                    return data.y
                })
                .attr('r', module.scale / 2)
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
                .attr('fill-opacity', 0.75)

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

    window.HTM.gridCells.GridCellModuleRenderer = CircleGridCellModuleRenderer
});
