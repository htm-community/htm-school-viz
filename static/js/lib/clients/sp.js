$(function() {

    function SpatialPoolerClient() {}

    SpatialPoolerClient.prototype.initialize = function(params, callback) {
        var url = '/_sp/';
        this.params = params;
        // First validate the params. If globalInhibition is on, remove the
        // potentialRadius parameter.
        if (params.globalInhibition) {
            delete params.potentialRadius;
        }
        $.ajax({
            type: 'POST',
            url: url,
            data: JSON.stringify(params),
            success: function(response) {
                console.log(response);
                callback(response);
            },
            dataType: 'JSON'
        });
    };

    SpatialPoolerClient.prototype.compute = function(encoding, opts, callback) {
        var url = '/_sp/';

        if (typeof(opts) == 'function') {
            callback = opts;
        } else {
            url += '?' + $.param(opts);
        }

        $.ajax({
            type: 'PUT',
            url: url,
            data: encoding.join(','),
            success: function(response) {
                callback(response);
            },
            dataType: 'JSON'
        });
    };

    window.HTM.SpatialPoolerClient = SpatialPoolerClient;
});
