$(function() {

    //function uncompressSdr(sdr) {
    //    var out = [];
    //    _.times(sdr.length, function() {
    //        out.push(0);
    //    });
    //    _.each(sdr.indices, function(index) {
    //        out[index] = 1;
    //    });
    //    return out;
    //}

    var host = '/_proxy';

    function SpHistoryClient(id) {
        this._id = id;
    }

    SpHistoryClient.prototype.getColumnHistory = function(columnIndex, callback) {
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

    window.HTM.SpHistoryClient = SpHistoryClient;
});
