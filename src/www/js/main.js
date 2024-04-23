$(document).ready(function() {
    $('#submit').click(function() {
        // Check if input is empty
        if($('#genre').val().length === 0) {
            $('#band').text("Please enter something in the input box!");
        } else {
            $('#band').text("Finding band...");
        }

        // If not empty, send request to server!
        $.post("/",
        {
            genre: $('#genre').val(),
            limit: parseInt($('#limit').val()),
            offset: parseInt($('#offset').val()),
            findArtist: true,
        },
        function(data, status) {
            $('#band').text(data.band);
        });
    });

    $('#submitLimit').click(function() {
        $.post("/",
        {
            findArtist: false,
            limit: parseInt($('#limit').val()),
            offset: parseInt($('#offset').val())
        },
        function(data, status) {
            console.log();
        }
        );
    });

    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        $('#config').removeClass("config");
        $('#config').addClass("m-config");
        $('#config').appendTo('#main');
    }

});