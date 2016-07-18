$(function() {

    function uncompressSdr(sdr) {
        var out = [];
        _.times(sdr.length, function() {
            out.push(0);
        });
        _.each(sdr.indices, function(index) {
            out[index] = 1;
        });
        return out;
    }

    function SpatialPoolerClient() {}

    SpatialPoolerClient.prototype.initialize = function(params, opts, callback) {
        var me = this;
        var url = '/_sp/';

        if (typeof(opts) == 'function') {
            callback = opts;
            opts = {};
        }
        url += '?' + $.param(opts);

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
                response.activeColumns = uncompressSdr(response.activeColumns);
                callback(response);
            },
            dataType: 'JSON'
        });
    };

    window.HTM.SpatialPoolerClient = SpatialPoolerClient;
});
