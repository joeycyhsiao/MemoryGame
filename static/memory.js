var boxopened = "";
var imgopened = "";

var flip  = 0;
var recvAnsID;
var flipMsgID;

var moveN       = 0;
var correctN    = 0;
var moveTime    = 0;
var correctTime = 0;

var turnStartTime = 0;
var first = -1;

function randomFromTo(from, to){
    return Math.floor(Math.random() * (to - from + 1) + from);
}

function shuffle() {

    var children = $("#boxcard").children();
    var child = $("#boxcard div:first-child");

    var array_img = new Array();
    var order = new Array();

    for (i=0; i<children.length; i++) {
        array_img[i] = $("#"+child.attr("id")+" img").attr("src");
        child = child.next();
    }

    var child = $("#boxcard div:first-child");

    for (z=0; z<children.length ; z++){
        randIndex = randomFromTo(0, array_img.length - 1);
        
        order.push(array_img[randIndex]); 
        // set new image
        $("#"+child.attr("id")+" img").attr("src", array_img[randIndex]);
        array_img.splice(randIndex, 1);

        child = child.next();
    }

    return order;
}


function syncCards(order) {

    var child = $("#boxcard div:first-child");

    for (i = 0 ; i < order.length ; i++){
        $("#"+child.attr("id")+" img").attr("src", order[i]);
        child = child.next();
    }
}



$(document).ready(function() {

    var gameState = 0;
    var recvOrderID;

    $("img").hide();
    $("#boxcard div").click(openCard);
    //$('#start').button().click(gameStart);
    window.onbeforeunload = unloadPage;

    init();

    function init() {
        $.ajax({
            type: "POST",
            data: {init: '1'},
            success: function (resp) {
                if      (resp.paired == -1){
                    /* <-- no user waiting on server --> */
                    recvOrderID = setInterval(sendWait, 1000);
                    //first = 1;
                }
                else {
                    /* <-- there is already another user waiting on server --> */
                    order = shuffle();
                    sendOrder(order);  /* <-- send card order to server --> */ 
                    //$("#waiting").html("Press Start");
                    //first = 0;
                    flipMsgID = setInterval( function () {
		        flipMsg("Ready?");
                        usrID = $.cookie('username');
                        $('#game').html('Game ID: ' + usrID);
                    }, 1000);

                    setTimeout( function() {
                        window.clearInterval(flipMsgID);
                        recvAnsID = setInterval(recvAns, 1000); 
                        setInterval(updateTime, 1000);  
                    }, 5000);
                }
            }
        });
    }

   
    function unloadPage() {
        $.ajax({
            url:'/unload',
            type: "GET",
            async: false,
        });
    }

//    function gameStart(){
//        $("#waiting").html('Your Turn!');
//        setTimeout(clearWaitMsg, 3000);
//        recvAnsID = setInterval(recvAns, 1000); 
//        setInterval(updateTime, 1000);  
//     }

    function flipMsg(msg) {
         flip = 1-flip;
         if   (flip == 0)
             $('#waiting').html(msg);
         else
             $('#waiting').html("");
    }


    function sendWait () {

         flipMsg("Waiting for Opponent's Join...");
         $.ajax({
            type: "POST",
            data: {waiting: '1'},
            success: function (resp) {
                if (resp.paired != -1) recvOrder();                  
            }
        });     
    }


    function sendOrder(order){
        $.ajax({
            url:  "/shuffle",
            type: "POST",
            traditional: true,
            data: {order: order},
        });   
    }


    function recvOrder(order){
        $.ajax({
            url:  "/shuffle",
            type: "GET",
            success: function(resp) {
               if (resp.success == 1){
                   syncCards(resp.order);
                   window.clearInterval(recvOrderID); 
                   //$("#waiting").html("Please Press Start Button"); 
                    flipMsgID = setInterval( function () {
		        flipMsg("Ready?");
                    }, 1000);

                   setTimeout(function (){
		       window.clearInterval(flipMsgID);
                       $("#waiting").html('Your Turn!');
                       setTimeout(clearWaitMsg, 3000);
                       recvAnsID = setInterval(recvAns, 1000); 
                       setInterval(updateTime, 1000);   
                       $('#game').html('Game ID: ' + resp.gameID);
                   }, 5000);
               }
            }
        });   
    }


    function sendAns(img0, box0, img1, box1){
        $.ajax({
            url:  "/answer",
            type: "POST",
            data: {img0:img0, box0:box0, img1:img1, box1:box1, moveN:moveN, correctN:correctN},
            success: function(resp) {   
                if (resp.end == 1){
                    recvEnd();
                }
            }
        });  
    }
  

    function recvAns(){

        if ( $("#waiting").hasClass('disappear') || $("#waiting").text() == 'Your Turn!' ) return ;    /* <-- player's turn, don't receive ans --> */

        flipMsg("Waiting for Opponent's Move...");

        $.ajax({
            url:  "/answer",
            type: "GET",
            success: function(resp) {
                //if (resp.img0 != "" && resp.box0 != "" && resp.img1 != "" && resp.box1 != "") {
                if (resp.success == 1){
                    checkAns(resp.img0, resp.box0, resp.img1, resp.box1, 0);

                    if (resp.end == 1)
                        recvEnd();
                    else 
                        setTimeout(clearWaitMsg, 4000); 
                }
                else if (resp.giveup == 1)
                   clearWaitMsg(); 

               $('#move_o').html("Opponent Move: " + resp.moveN_o);          
               $('#correct_o').html("Opponent Score: " + resp.correctN_o);  
            } 
        });  
    }

  
    function recvEnd(){
        $('#dbg').html('Ending'); 
        $.ajax({
            url:  "/end",
            type: "POST",
            data: {moveN:moveN, moveTime:moveTime, correctN:correctN, correctTime:correctTime},
            success:function(resp){
                $('#waiting').removeClass('disappear');
                $('#timer').removeClass('Countdown: -- seconds');
                window.clearInterval(recvAnsID); 
                if      (resp.result == 1)
         	    $('#waiting').html("YOU WIN!");
                else if (resp.result == -1)
                    $('#waiting').html("YOU LOSE...");
                else  
                    $('#waiting').html("DRAW!");
            }
        });
    }

 
    function clearWaitMsg(){
        $("#waiting").html('');
        $("#waiting").addClass('disappear');
        turnStartTime = new Date();
    }


    function updateTime(){

        if ( !$("#waiting").hasClass('disappear') ) return;    /* <-- enemy's turn --> */

        var curTime = new Date();
        var countdown = Math.ceil(30 - (curTime.getTime() - turnStartTime.getTime())/1000);
        $("#timer").html('Countdown: ' + countdown + ' seconds'); 

        if (countdown <= 0) giveUpTurn();
    }


    function giveUpTurn(){
        moveN++;
        $('#move_p').html("Playse Move: " + moveN);
        $("#waiting").removeClass('disappear');
        $("#timer").html('Countdown: -- seconds'); 
        $.ajax({
            url:  "/answer",
            type: "POST",
            data: {giveup:1, moveN:moveN},
        });  
    }



    function openCard() {

        if ( !$("#waiting").hasClass('disappear') ) return;    /* <-- enemy's turn --> */

        id = $(this).attr("id");

        if ($("#"+id+" img").is(":hidden")) {
            $("#boxcard div").unbind("click", openCard);

            //$("#"+id+" img").slideDown('fast');
            $("#"+id+" img").fadeIn(1000);

            if (imgopened == "") {
                boxopened = id;
                imgopened = $("#"+id+" img").attr("src");
                setTimeout(function() {
                    $("#boxcard div").bind("click", openCard)
                }, 300);
            } 
            else {
                moveN++;
                imgcurrent = $("#"+id+" img").attr("src");
                checkAns(imgopened, boxopened, imgcurrent, id, 1);

                $('#waiting').removeClass('disappear');  
                $('#move_p').html("Player Move: " + moveN);  
                $("#correct_p").html("Player Score: " + correctN); 
            }
        }
    }


    function checkAns(img0, box0, img1, box1, player){

        if (img0 != img1) {    
            /* <-- wrong answer --> */

            setTimeout(function() {

                if (player == 1){   /* <-- player's turn --> */
                    sendAns(img0, box0, img1, box1);
                    $('#waiting').removeClass('disappear');
                    $("#timer").html('Countdown: -- seconds'); 
		}
                else {             /* <-- enemy's turn --> */
//                    $("#" + box0 + " img").slideDown(1000);
//                    $("#" + box1 + " img").slideDown(1000);
                    $("#" + box0 + " img").fadeIn(1000);
                    $("#" + box1 + " img").fadeIn(1000);
                }

                //$("#" + box0 + " img").delay(1000).slideUp(1000);
                //$("#" + box1 + " img").delay(1000).slideUp(1000);

                $("#" + box0 + " img").delay(1000).fadeOut(1000);
                $("#" + box1 + " img").delay(1000).fadeOut(1000);

                boxopened = "";
                imgopened = "";

            }, 400);

            if (player == 0){
                setTimeout(function() {
                    $("#waiting").html('Your Turn!'); 
                }, 600);
            }
        } 
        else {
            /* <-- right answer --> */

            if (player == 1){    /* <-- player's turn --> */
                correctN++;
                sendAns(img0, box0, img1, box1);
                $('#correct_p').html('Player Score: ' + correctN);
                $("#timer").html('Countdown: -- seconds'); 
            }
            else {             /* <-- enemy's turn --> */

                //$("#" + box0 + " img").slideDown(1000);
                //$("#" + box1 + " img").slideDown(1000);
                $("#" + box0 + " img").fadeIn(1000);
                $("#" + box1 + " img").fadeIn(1000);
 
                $("#waiting").html('Your Turn!'); 
            }

            $("#" + box0 + " img").addClass("opacity");
            $("#" + box1 + " img").addClass("opacity");
            boxopened = "";
            imgopened = "";
        } 
 
        setTimeout(function() {
            $("#boxcard div").bind("click", openCard);
        }, 400);
    }



});   


