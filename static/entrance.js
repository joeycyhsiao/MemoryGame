$(document).ready(function() 
{
    window.onbeforeunload = unloadPage;

    init();

    function init()
    {
        $.ajax({
            type:'POST',
            data:{init:1},
            success: function(resp){

                if (resp.usrID == -1)
                    $('#usrID').html('ERROR');
                else{
                    //$('#usrID').html('Your ID is <b>' + resp.usrID + '</b>');
                    $("#side0").button().bind('click', choose);
                    $("#side1").button().bind('click', choose);

                    $("#start").button().bind('click', start).button('disable');

                    updateSpace(resp.space0, resp.space1);
                    setInterval(polling, 500);
                }
            }
        });
    }



    function choose()
    {
        var buttonID = $(this).attr("id");
        side = buttonID[buttonID.length - 1];

        $.ajax({
            type:'POST',
            data:{choose:1, side:side},
            success: function(resp){
                updateSpace(resp.space0, resp.space1);
                updateSide(side);
            }
        });
    }


    function polling()
    {
        $.ajax({
            type:'POST',
            data:{polling:1},
            success: function(resp){
                updateSpace(resp.space0, resp.space1);
            }
        });
    }



    function start()
    { 
        window.location = "game";
        //$.ajax({
        //    url:'/unload',
        //    type:'POST',
        //    data:{start:1},
        //});
    }



    function updateSpace(space0, space1)
    {
        $("#space0").html("Space: " + space0);
        $("#space1").html("Space: " + space1);

        if (space0 <= 0) $("#side0").button('disable');
        else             $("#side0").button('enable');

        if (space1 <= 0) $("#side1").button('disable');
        else             $("#side1").button('enable');

        if (space0 == 0 && space1 == 0)
            $("#start").button('enable');
    }


    
    function updateSide(side)
    {
        if      (side == 0)
            $("#side").html("Your are in group A");
        else if (side == 1)
            $("#side").html("Your are in group B");
        else 
            $("#side").html("Your are not in any group"); 
    }



    function unloadPage() 
    {
        $.ajax({
            url:'/unload',
            type: "GET",
            async: false,
        });
    }











});
