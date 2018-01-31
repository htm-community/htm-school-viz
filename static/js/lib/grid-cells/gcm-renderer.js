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

        renderModuleOverlays(svgs) {
            this.modules.forEach(function(m, i) {
                let svg = d3.select(svgs.nodes()[i])
                let rgb = m.getColorString()
                let modulePoints = m.createOverlayPoints()

            });
        }

        _treatVoronoiCell(module, paths, points, rgb, lite) {
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
                    if (d.gridCell.isActive()) return rgb;
                    return 'none';
                })
                .attr('fill-opacity', function(d) {
                    if (!d) return;
                    let a = 0.2;
                    if (d.gridCell.isActive()) {
                        a = .75;
                    }
                    return a;
                });
        }

        renderVoronoi(groups, lite) {
            let me = this;
            let origin = {x: 0, y: 0}
            let width = this.width;
            let height = this.height;
            let voronoi = d3.voronoi();
            voronoi.extent([[origin.x, origin.x], [width, height]])

            this.modules.forEach(function(m, i) {
                if (! m.visible) return;
                let g = d3.select(groups.nodes()[i]);
                let rgb = m.getColorString()
                m.points = m.createWorldPoints(origin, width, height);
                let positions = m.points.map(function(p) {
                    return [p.x, p.y];
                });
                let diagram = voronoi(positions);

                let polygons = diagram.polygons();

                // Attach gridcell info to each datum.
                m.points.forEach(function(p, i) {
                    if (polygons[i]) polygons[i].gridCell = p.gridCell;
                });

                // Update
                let paths = g.selectAll('path').data(polygons);
                let cells = g.selectAll('circle').data(m.points);
                me._treatVoronoiCell(m, paths, cells, rgb, lite);

                // Enter
                let newPaths = paths.enter().append('path');
                let newCells = cells.enter().append('circle');
                me._treatVoronoiCell(m, newPaths, newCells, rgb, lite);

                // Exit
                paths.exit().remove();
                cells.exit().remove();

                console.log('module %s has %s points', m.id, m.points.length)
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

            this.renderVoronoi(d3.selectAll('g.module-group'), lite);
            this.renderModuleOverlays(d3.selectAll('#module-overlay svg'))
        }
    }

    window.HTM.gridCells.GridCellModuleRenderer = GridCellModuleRenderer
});
