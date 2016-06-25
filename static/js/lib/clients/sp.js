$(function() {

    function SpatialPoolerClient() {}

    SpatialPoolerClient.prototype.initialize = function(params, callback) {
        var url = '/_sp/';
        this.params = params;
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

    SpatialPoolerClient.prototype.compute = function(encoding, callback) {
        var url = '/_sp/';
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
