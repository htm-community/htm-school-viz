$(function () {

    class GridCellModuleRenderer {
        constructor(modules) {
            this.modules = modules;
        }

        on(eventName, handler) {
            d3.select('#world').on(eventName, handler);
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
            });
        }

        _treatVoronoiCell(paths, points, rgb, lite) {
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
                .attr('stroke', '#d6d6d6')
                .attr('stroke-width', function() {
                    if (! lite) return 0.5
                    else return 0
                })
                .attr('fill', function(d) {
                    if (!d) return;
                    if (d.gridCell.isActive && d.gridCell.isActive()) return rgb;
                    return 'none';
                })
                .attr('fill-opacity', function(d) {
                    if (!d) return;
                    let a = 0.2;
                    if (d.gridCell.isActive && d.gridCell.isActive()) {
                        a = .75;
                    }
                    return a;
                });
            points.attr('cx', function(p) { return p.x })
                .attr('cy', function(p) { return p.y })
                .attr('r', function(p) {
                    if (! lite && p.gridCell && p.gridCell.isActive) {
                        return 3
                    }
                    return 0
                })
        }

        _renderVoronoiToElement(polygons, module, points, $target, lite) {
            let rgb = module.getColorString()

            // Attach gridcell info to each polygon because lazy
            points.forEach(function(p, i) {
                if (polygons[i]) polygons[i].gridCell = p.gridCell;
            });

            // Update
            let paths = $target.selectAll('path').data(polygons);
            let cells = $target.selectAll('circle').data(points);
            this._treatVoronoiCell(paths, cells, rgb, lite);

            // Enter
            let newPaths = paths.enter().append('path');
            let newCells = cells.enter().append('circle');
            this._treatVoronoiCell(newPaths, newCells, rgb, lite);

            // Exit
            paths.exit().remove();
            cells.exit().remove();

            console.log('module %s has %s points', module.id, points.length)

        }

        renderModuleOverlays(svgs, lite) {
            let me = this
            this.overlayPoints = []
            this.modules.forEach(function(m, i) {
                let points = m.createOverlayPoints()
                let spacing = m.spacing
                me.overlayPoints.push(points)
                let svg = d3.select(svgs.nodes()[i])
                let positions = points.map(function(p) {
                    return [p.x, p.y];
                });
                let width = Math.max(...positions.map(function(p) { return p[0] }))
                let height = Math.max(...positions.map(function(p) { return p[1] }))
                svg.attr('width', width)
                   .attr('height', height)
                let voronoi = d3.voronoi()
                voronoi.extent([
                    [0, 0],
                    [width, height]
                ])
                me._renderVoronoiToElement(voronoi(positions).polygons(), m, points, svg, lite)
            });
        }

        renderWorld(groups, lite) {
            let me = this;
            this.worldPoints = []
            let origin = {x: 0, y: 0}
            let width = this.width;
            let height = this.height;
            let voronoi = d3.voronoi();
            voronoi.extent([[origin.x, origin.x], [width, height]])

            this.modules.forEach(function(m, i) {
                if (! m.visible) {
                    me.worldPoints.push([])
                    return
                }
                let g = d3.select(groups.nodes()[i]);
                let points = m.createWorldPoints(origin, width, height);
                me.worldPoints.push(points)
                let positions = points.map(function(p) {
                    return [p.x, p.y];
                });
                me._renderVoronoiToElement(voronoi(positions).polygons(), m, points, g, lite)
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

            this.renderWorld(d3.selectAll('g.module-group'), lite);
            this.renderModuleOverlays(d3.selectAll('#module-overlays svg'), false)
        }
    }

    window.HTM.gridCells.GridCellModuleRenderer = GridCellModuleRenderer
});
