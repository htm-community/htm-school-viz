$(function() {

    var gifPath = undefined;
    var gifData = undefined;
    var $loading = $('#loading');
    // Indicates we are still waiting for a response from the server SP.
    var waitingForServer = false;
    var $giflist;

    function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    }

    function loading(isLoading, isModal) {
        if (isModal == undefined) {
            isModal = true;
        }
        if (isLoading) {
            waitingForServer = true;
            if (! isModal) {
                $loading.addClass('little');
            }
            $loading.show();
        } else {
            waitingForServer = false;
            $loading.hide();
            $loading.removeClass('little');
        }
    }

    function loadGifList(callback) {
        $.getJSON("/_giflist", function(resp) {
            $giflist = $('#choose-gif');
            _.each(resp.gifs, function(gifData) {
                var path = gifData.path;
                var dimensions = gifData.dimensions;
                var name = path.split('/').pop().split('.').shift();
                var url = path.replace('data/gifData', 'img/gifs').replace('json', 'gif');
                var $li = $('<li>');
                var $btn = $('<button>');
                var $dim = $('<code>');
                $btn.html('<a href="topology.html?load=' + name + '"><img src="' + url + '"></a>');
                $btn.addClass('btn btn-default btn-primary');
                $dim.addClass('dim');
                $dim.html('(' + dimensions.join(' x ') + ')');
                $li.append($btn);
                $li.append($dim);
                $giflist.append($li);
            });
            if (callback) callback();
        });
    }

    loadGifList();

});
