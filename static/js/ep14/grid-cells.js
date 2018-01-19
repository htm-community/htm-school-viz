$(function() {

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
            var width = 10;
            var height = 10;
            var scale = 20;
            var red = getRandomInt(0, 255);
            var green = getRandomInt(0, 255);
            var blue = getRandomInt(0, 255);
            var dotSize = 5;
            var orientation = getRandomInt(0, 60);
            let module = new window.HTM.utils.gridCells.GridCellModule(width, height, scale, dotSize, orientation, red, green, blue);
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

});
