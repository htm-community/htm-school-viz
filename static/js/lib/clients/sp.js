$(function() {

    function SpatialPoolerClient() {}

    SpatialPoolerClient.prototype.initialize = function(params, callback) {
        var me = this;
        var url = '/_sp/';
        this.params = params;
        $.ajax({
            type: 'POST',
            url: url,
            data: JSON.stringify(params),
            success: function(response) {
                me._id = response.id;
                callback(response);
            },
            dataType: 'JSON'
        });
    };

    SpatialPoolerClient.prototype.compute = function(encoding, opts, callback) {
        var url = '/_sp/';

        if (typeof(opts) == 'function') {
            callback = opts;
            opts = {};
        }
        opts = _.merge(opts, {id: this._id});
        url += '?' + $.param(opts);

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
