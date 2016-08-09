$(function() {

    var host = '/_proxy';

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

    function SpatialPoolerClient(save) {
        this._id = undefined;
        if (save != undefined) {
            this.save = save;
        } else {
            this.save = undefined;
        }
    }

    SpatialPoolerClient.prototype.initialize = function(params, opts, callback) {
        var me = this;
        var url = host + '/_sp/';

        if (typeof(opts) == 'function') {
            callback = opts;
            opts = {};
        }
        if (this.save != undefined) {
            opts.save = this.save.join(',');
        }
        url += '?' + $.param(opts);

        this.params = params;
        $.ajax({
            type: 'POST',
            url: url,
            data: JSON.stringify(params),
            success: function(response) {
                me._id = response.meta.id;
                callback(null, response);
            },
            dataType: 'JSON'
        });
    };

    SpatialPoolerClient.prototype.compute = function(encoding, opts, callback) {
        var url = host + '/_sp/';

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
                callback(null, response);
            },
            dataType: 'JSON'
        });
    };

    SpatialPoolerClient.prototype.getColumnHistory = function(columnIndex, callback) {
        var url = host + '/_sp/' + this._id + '/history/' + columnIndex;

        $.ajax({
            type: 'GET',
            url: url,
            success: function(response) {
                console.log(response);
                callback(response);
            },
            dataType: 'JSON'
        });
    };


    var SpSnapshots = {
        INPUT: 'input',
        ACT_COL: 'activeColumns',
        POT_POOLS: 'potentialPools',
        CON_SYN: 'connectedSynapses',
        PERMS: 'permanences',
        OVERLAPS: 'overlaps',
        ACT_DC: 'activeDutyCycles',
        OVP_DC: 'overlapDutyCycles'
    };

    window.HTM.SpatialPoolerClient = SpatialPoolerClient;
    window.HTM.SpSnapshots = SpSnapshots;
});
