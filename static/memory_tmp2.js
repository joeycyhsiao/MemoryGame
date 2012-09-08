var box_open = "";
var img_open = "";

var flip  = 0;
var recvAnsID;
var flipMsgID;
var recvCtrlID;

var moveN       = 0;
var correctN    = 0;
var moveTime    = 0;
var correctTime = 0;

var gameStartTime = 0;
var turnStartTime = 0;
var turnLen   = [0, 0];

var turnState = -1;

IN_CTRL          = 1;
WAIT_MATE_ANS    = 2;
WAIT_ENEMY_ANS   = 3;
WAIT_MATE_CTRL   = 4;
WAIT_ENEMY_CTRL  = 5;
WAIT_OTHERS_KNOW = 6;

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
    window.onbeforeunload = unloadPage;

    init();

    function init() {
        $.ajax({
            type: "POST",
            data: {init: '1'},
            success: function (resp) {
                if (resp.gameID == -1)
                    recvOrderID = setInterval(sendWait, 1000);  /*- no enough user waiting on server -*/
                else {
                    /*- there is already another user waiting on server -*/
                    turnState = IN_CTRL;
                    //dbgTurnState();

                    order = shuffle();
                    sendOrder(order);  /*- send card order to server -*/ 
                    flipMsgID = setInterval( function () {
		        flipMsg("Ready");
                    }, 1000);

                    setTimeout( function() {
                        gameStartTime = new Date();
                        window.clearInterval(flipMsgID);
                        $("#waiting").html('Take Control!');
                        setTimeout(clearWaitMsg, 3000);
                        recvAnsID = setInterval(recvAns, 1000); 
                        setInterval(updateTime, 1000);  
                    }, 5000);
                }
            }
        });
    }



    function sendWait () {
         flipMsg("Waiting for Other Players' Join");
         $.ajax({
            type: "POST",
            data: {waiting: '1'},
            success: function (resp) {
                if (resp.gameID != -1) recvOrder();                  
            }
        });     
    }



    /*- send shuffled card order to server -*/
    function sendOrder(order)
    {
        $("#ctrl").button().bind('click', sendCtrl).button('disable');
        $.ajax({
            url:  "/shuffle",
            type: "POST",
            traditional: true,    /*- make the array send as an array -*/
            data: {order: order},
            success:function(resp) {
                if (resp.gameID != -1) 
                    $('#game').html('Game ID: ' + resp.gameID);
            } 
        });   
    }


    /*- recv shuffled card order to server -*/   
    function recvOrder(order)
    {
        $("#ctrl").button().bind('click', sendCtrl).button('disable');
        $.ajax({
            url:  "/shuffle",
            type: "GET",
            success: function(resp) {

                gameStartTime = new Date();
                if (resp.isEnemy == 1)
                    turnState = WAIT_ENEMY_ANS;
                else{
                    turnState = WAIT_MATE_ANS;
                    turnStartTime = new Date();
                }

                //dbgTurnState();

                syncCards(resp.order);    /*- sync card order with ctrler order -*/
                window.clearInterval(recvOrderID); 
                flipMsgID = setInterval( function () {
	            flipMsg("Ready");
                }, 1000);

                setTimeout(function () {
		    window.clearInterval(flipMsgID);
                    $('#game').html('Game ID: ' + resp.gameID);
                    recvAnsID = setInterval(recvAns, 1000); 
                    setInterval(updateTime, 1000);   
                }, 5000);
            }
        });   
    }



    function sendCountdown(countdown)
    {
        $.ajax({
            url:  "/countdown",
            type: "POST",
            data:{ countdown:countdown },
        });  
    }



    function sendHalfAns(img, box)
    {
        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data:{ half:1, img:img, box:box},
        });  
    }



    function sendFullAns(img0, img1, box0, box1, turnLen0, turnLen1, startTime)
    {
        $('#ctrl').button('disable');
        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data:{
                full:1, img0:img0, img1:img1, box0:box0, box1:box1, 
                moveN:moveN, correctN:correctN, turnLen0:turnLen0, turnLen1:turnLen1, startTime:startTime
            },
            success: function(resp) {   
                if (resp.end == 1) recvEnd();
            }
        });  
    }
  


    function recvAns()
    {
        if      ( turnState == IN_CTRL 
                  turnState == WAIT_MATE_CTRL || turnState == WAIT_ENEMY_CTRL ) return;
        else if ( turnState == WAIT_ENEMY_ANS ) flipMsg("Waiting for Opponents");
        else if ( turnState == WAIT_MATE_ANS  ) flipMsg("Waiting for Teammate");
 
        $.ajax({
            url:  "/wait",
            type: "GET",
            success: function(resp) {

                if (resp.allknow == 1){

                    recvCtrlID = setInterval(recvCtrl, 500); 
                    if      (turnState == WAIT_ENEMY_ANS) {
                        $("#ctrl").button('enable'); 
                        turnState = WAIT_MATE_CTRL;
                    }
                    else if ( turnState == WAIT_MATE_ANS ||
                              turnState == WAIT_OTHERS_KNOW ) {
                        $("#ctrl").button('disable'); 
                        turnState = WAIT_ENEMY_CTRL;
                    }

                    //dbgTurnState(); 
                }
                else if (resp.know)    
                    return;

                if (turnState == WAIT_OTHERS_KNOW) /*- original ctrler, no need to know ans -*/
                    return;
                else if (resp.giveup == 1) {
                    if (resp.box != ""){
                        $("#" + resp.box + " img").fadeIn(1000);
                        $("#" + resp.box + " img").delay(1000).fadeOut(1000);
                    }
                }
                else if (resp.full == 1) {
                    checkAns(resp.img0, resp.box0, resp.img1, resp.box1);
                    if (resp.end == 1)
                        recvEnd();
                    else 
                        setTimeout(clearWaitMsg, 4000);  
                }
                else {
                    $("#timer").html('Countdown: ' + resp.countdown + ' seconds'); 
                    if (resp.half == 1)
                        $("#" + resp.box + " img").fadeIn(1000);
                }
            } 
        });  
    }

  
    function recvEnd()
    {
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



    /*- clear wait msg, used before one take ctrl -*/ 
    function clearWaitMsg()
    {
        $("#waiting").html('');
        $("#waiting").addClass('disappear');
        turnTime = [0, 0];
        turnStartTime = new Date();
    }


    function updateTime()
    {
        if ( turnState != IN_CTRL  ) return;    

        var curTime = new Date();
        countdown = Math.ceil(30 - (curTime.getTime() - turnStartTime.getTime())/1000);
        $("#timer").html('Countdown: ' + countdown + ' seconds'); 
        sendCountdown(countdown);

        if (countdown <= 0) 
            giveUpTurn(img_open, box_open);
    }


    function recordTime(number, giveup)
    {
        if      (giveup == 1 && turnLen[0] == 0)    /*- give up before any fliping -*/
            turnLen = ['-----', '-----'];
        else if (giveup == 1 && turnLen[0] != 0)    /*- give up after fliping one card -*/
            turnLen[1] = '-----';
        else { 
            var curTime = new Date();
            duration = curTime.getTime() - turnStartTime.getTime();
            turnLen[number] = duration;
        }
    }


    function giveUpTurn(img, box)
    {
        if ( turnState != IN_CTRL || turnState != WAIT_MATE_CTRL ) return;

        recordTime(0, 1);
        turnState = WAIT_OTHERS_KNOW;
        //dbgTurnState();

        moveN++;
        $('#move_p').html("Playse Move: " + moveN);
        $("#waiting").removeClass('disappear');
        $("#timer").html('Countdown: -- seconds'); 
        $("#ctrl").button('disable');
      
        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data: {
                giveup:1, img:img, box:box, moveN:moveN, 
                turnLen:turnLen, startTime:getTimeFromBegin(turnStartTime)
            },
        }); 

        if (box_open != ""){    /*- give up after opening one card -*/
            $("#" + box_open + " img").delay(1000).fadeOut(1000);
            box_open = "";
            img_open = "";
        } 
    }



    function openCard() 
    {
        if ( turnState != IN_CTRL ) return;    

        var box_cur = $(this).attr("id");

        if ($("#" + box_cur + " img").is(":hidden")) {

            $("#boxcard div").unbind("click", openCard);
            $("#" + box_cur + " img").fadeIn(1000);

            if (img_open == "") {
                recordTime(0, 0);    /*- record timing of fliping 1st card -*/

                box_open = box_cur;
                img_open = $("#" + box_open + " img").attr("src");
                
                setTimeout(function() {
                    $("#boxcard div").bind("click", openCard)
                }, 300);

                sendHalfAns(img_open, box_open);
            } 
            else {
                recordTime(1, 0);    /*- record timing of fliping 2nd card -*/
                $("#dbg").html("go checkAns");
                var img_cur = $("#" + box_cur + " img").attr("src");
                checkAns(img_open, box_open, img_cur, box_cur);
 
                moveN++;
               // dbgTurnState();
                $('#waiting').removeClass('disappear');  
                $('#move_p').html("Player Move: " + moveN);  
                $("#correct_p").html("Player Score: " + correctN); 
            }
        }
    }


    function checkAns(img0, box0, img1, box1)
    {
        $("#dbg").html("in checkAns");
        if (img0 != img1) {    /*- wrong answer -*/

            $("#dbg").html('out of setTimeout' + turnState);

            setTimeout(function() {

                $("#dbg").html('out of if' + turnState);

                if (turnState == IN_CTRL){  
 
                    $("#dbg").html("go sendFullAns");
                    sendFullAns(img0, img1, box0, box1, turnLen[0], turnLen[1],
                                getTimeFromBegin(turnStartTime) );
 
                    $('#waiting').removeClass('disappear');
                    $("#timer").html('Countdown: -- seconds'); 
                    turnState = WAIT_OTHERS_KNOW;
		}
                else 
                    showBoxes(box0, box1);
                hideBoxes(box0, box1);
            }, 400);
        } 
        else {                /*- right answer -*/

            if (turnState == IN_CTRL){   
                correctN++;
                sendFullAns(img0, img1, box0, box1, turnLen[0], turnLen[1],
                            getTimeFromBegin(turnStartTime) );
                $('#correct_p').html('Player Score: ' + correctN);
                $("#timer").html('Countdown: -- seconds'); 

                turnState = WAIT_OTHERS_KNOW;
            }
            else
               showBoxes(box0, box1);
            hideBoxes(box0, box1);
        } 
 
        setTimeout(function() {
            $("#boxcard div").bind("click", openCard);
        }, 400);
    }



    function showBoxes(box0, box1)
    {
        $("#" + box0 + " img").fadeIn(1000);
        $("#" + box1 + " img").fadeIn(1000);
    }



    function hideBoxes(box0, box1)
    {
        $("#" + box0 + " img").delay(1000).fadeOut(1000);
        $("#" + box1 + " img").delay(1000).fadeOut(1000);
        box_open = "";
        img_open = "";
    }



    function unloadPage() 
    {
        $.ajax({
            url:'/unload',
            type: "GET",
            async: false,
        });
    }



    function flipMsg(msg) 
    {
         flip++;
         if      (flip >= 3) flip = 0; 

         if      (flip % 3 == 0) $('#waiting').html(msg + '.');
         else if (flip % 3 == 1) $('#waiting').html(msg + '..');
         else                    $('#waiting').html(msg + '...');
    }



    function sendCtrl()
    {
        $.ajax({
            url:'/ctrl',
            type:'POST',
            success: function (resp) {
                if (resp.ctrl != -1) {
                    $('#ctrl').button('disable');
                    window.clearInterval(recvCtrlID);
                    turnState = IN_CTRL;
                    //dbgTurnState();
                }
            }
        });
    }

   
   
    function recvCtrl()
    {
        $.ajax({
            url:'/ctrl',
            type:'GET',
            success: function(resp){
                if (resp.ctrl != -1) {    /*- somebody  has taken the turn -*/
                    $('#ctrl').button('disable');
                    window.clearInterval(recvCtrlID); 

                    if      (turnState == WAIT_MATE_CTRL)
                        turnState = WAIT_MATE_ANS;
                    else if (turnState == WAIT_ENEMY_CTRL)
                        turnState = WAIT_ENEMY_ANS;

                    //dbgTurnState();
                }
            }
        });
    }


 
    function getTimeFromBegin(time)
    {
         return time.getTime() - gameStartTime.getTime();
    }


    function dbgTurnState()
    {
        $('#dbg').html(turnState); 
    }
});   



