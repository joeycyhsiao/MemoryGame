var box_open = "";
var img_open = "";

var flip  = 0;
var recvAnsID;
var recvKnowID;
var flipMsgID;

var moveTime    = 0;
var correctTime = 0;

var gameStartTime = 0;
var turnStartTime = 0;
var turnLen   = [0, 0];

var turnState = -1;

CTRL = 1;
WAIT = 2;
KNOW = 3;
END  = 4;

function randomFromTo(from, to)
{
    return Math.floor(Math.random() * (to - from + 1) + from);
}

function shuffle() 
{
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


function syncCards(order) 
{
    var child = $("#boxcard div:first-child");

    for (i = 0 ; i < order.length ; i++){
        $("#"+child.attr("id")+" img").attr("src", order[i]);
        child = child.next();
    }
}



$(document).ready(function() 
{
    var gameState = 0;
    var recvOrderID;

    $("img").hide();
    $("#boxcard div").click(openCard);
    window.onbeforeunload = unloadPage;

    init();

    function init() 
    {
        $.ajax({
            type: "POST",
            data: {init: '1'},
            success: function (resp) {
                if (resp.gameID == -1)
                    recvOrderID = setInterval(sendWait, 1000);  /*- no enough user waiting on server -*/
                else {
                    /*- there is already another user waiting on server -*/

                    order = shuffle();
                    sendOrder(order);  /*- send card order to server -*/ 
                    flipMsgID = setInterval( function () {
                        flipMsg("Ready");
                    }, 1000);

                    setTimeout( function() {
                        gameStartTime = new Date();
                        window.clearInterval(flipMsgID);
                        $("#waiting").html('Take Control!');
                        turnState = CTRL;
                        setTimeout(clearWaitMsg, 3000);
                        recvAnsID  = setInterval(recvAns, 1000); 
                        recvKnowID = setInterval(recvKnow, 1000); 
                        setInterval(updateTime, 1000);  
                    }, 5000);
                }
            }
        });
    }



    function sendWait () 
    {
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
        $.ajax({
            url:  "/shuffle",
            type: "GET",
            success: function(resp) {

                syncCards(resp.order);    /*- sync card order with ctrler order -*/
                window.clearInterval(recvOrderID); 
                flipMsgID = setInterval( function () {
                    flipMsg("Ready");
                }, 1000);

                setTimeout(function () {

                    gameStartTime = new Date();
                    window.clearInterval(flipMsgID);
                    $('#game').html('Game ID: ' + resp.gameID);

                    if   (resp.isEnemy == 1) turnState = WAIT;
                    else {
                        $("#waiting").html('Take Control!');
                        turnState = CTRL;
                        setTimeout(clearWaitMsg, 3000);
                    }

                    recvAnsID  = setInterval(recvAns, 1000); 
                    recvKnowID = setInterval(recvKnow, 1000); 
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
            success: function(resp) {
                if (resp.full == 1)
                    updateMove(0, resp.moveN, resp.correctN);
            }
        });  
    }



    function sendFullAns(img0, img1, box0, box1, turnLen0, turnLen1, startTime)
    {
        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data:{
                full:1, img0:img0, img1:img1, box0:box0, box1:box1, 
                turnLen0:turnLen0, turnLen1:turnLen1, startTime:startTime
            },
            success: function(resp) {   
                updateMove(0, resp.moveN, resp.correctN);
                turnState = KNOW;
                if (resp.end == 1){
					turnState = END;
					recvEnd();
				}
            }
        });  
    }
  


    function recvAns()
    {
        if      ( turnState == KNOW ) return;
        else if ( turnState == WAIT ) flipMsg("Waiting for Opponents");
 
        $.ajax({
            url:  "/wait",
            type: "GET",
            success: function(resp) {
                if (resp.giveup == 1) {

                    if (box_open != ''){
                        $("#" + box_open + " img").delay(1000).fadeOut(1000);
                        box_open = '';
                        img_open = '';
                    }

                    updateMove(resp.isEnemy, resp.moveN, -1);
                    turnState = KNOW;
                }
                else if (resp.full == 1) {

                    checkAns(resp.img0, resp.box0, resp.img1, resp.box1, 0);
                    updateMove(resp.isEnemy, resp.moveN, resp.correctN);
                    turnState = KNOW;
                    if (resp.end == 1){
						turnState = END;
						recvEnd();
					}
                }
                else {
                    $("#timer").html('Countdown: ' + resp.countdown + ' seconds'); 
                    if (resp.half == 1){
                        $("#" + resp.box + " img").fadeIn(1000);
                        box_open = resp.box;
                        img_open = resp.img;
                    }
                }
            } 
        }); 
    }

  
    function recvKnow()
    {
        if (turnState != KNOW) return;

        $.ajax({
            url:  "/know",
            type: "GET",
            success: function(resp) {
                if (resp.allknow == 1) {
                    if   (resp.ctrl == 1)  /*- assigned as ctrler -*/{
						turnState = CTRL;
						$("#waiting").html('Take Control!');
                        setTimeout(clearWaitMsg, 4000);  
					}
                    else 
                        turnState = WAIT;
                }
            }
        });
    }



    function recvEnd()
    {
        $.ajax({
            url:  "/end",
            type: "POST",
            data: {moveTime:moveTime, correctTime:correctTime},
            success:function(resp){
                $('#waiting').removeClass('disappear');
                $('#timer').html('Countdown: -- seconds');
                window.clearInterval(recvAnsID);
                window.clearInterval(recvKnowID); 
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
		turnState = CTRL;
        $("#waiting").html('');
        $("#waiting").addClass('disappear');
        turnTime = [0, 0];
        turnStartTime = new Date();
    }



    function updateTime()
    {
        if ( turnState != CTRL || turnStartTime == 0 ) return;    

        var curTime = new Date();
        countdown = Math.floor(30 - (curTime.getTime() - turnStartTime.getTime())/1000);
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
        recordTime(0, 1);
        
        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data: {
                giveup:1, turnLen:turnLen, 
			    startTime:getTimeFromBegin(turnStartTime)
            },
			success: function(resp){
                updateMove(0, resp.moveN, -1);
                turnState = KNOW;
			}
        }); 

        if (box_open != ""){    /*- give up after opening one card -*/
            $("#" + box_open + " img").delay(1000).fadeOut(1000);
            box_open = "";
            img_open = "";
        } 
    }



    function openCard() 
    {
        if ( turnState != CTRL || !$("#waiting").hasClass('disappear') ) return;    

        var box_cur = $(this).attr("id");

        if ($("#" + box_cur + " img").is(":hidden")) {

            $("#boxcard div").unbind("click", openCard);
            $("#" + box_cur + " img").fadeIn(1000);

            if (img_open == "") {
                recordTime(0, 0);    /*- record timing of fliping 1st card -*/

                box_open = box_cur;
                img_open = $("#" + box_open + " img").attr("src");
                sendHalfAns(img_open, box_open);

                setTimeout(function() {
                    $("#boxcard div").bind("click", openCard)
                }, 300);
            } 
            else {
                recordTime(1, 0);    /*- record timing of fliping 2nd card -*/

                var img_cur = $("#" + box_cur + " img").attr("src");
                checkAns(img_open, box_open, img_cur, box_cur, 1);
 
                $('#waiting').removeClass('disappear');  
            }
        }
    }


    function checkAns(img0, box0, img1, box1, sendFull)
    {
        if (img0 != img1) {    /*- wrong answer -*/

            setTimeout(function() {

                if (turnState == CTRL) {  

                    if (sendFull == 1)
                        sendFullAns(img0, img1, box0, box1, turnLen[0], turnLen[1],
                                    getTimeFromBegin(turnStartTime) ); 
                    
                    $('#waiting').removeClass('disappear');
                }
                else showBoxes(box0, box1);

                hideBoxes(box0, box1);
            }, 400);

        } 
        else {                /*- right answer -*/

            if (sendFull == 1 && turnState == CTRL){   
                sendFullAns(img0, img1, box0, box1, turnLen[0], turnLen[1],
                            getTimeFromBegin(turnStartTime) );
            }
            else showBoxes(box0, box1);

            coverBoxes(box0, box1);
        } 
 
        box_open = "";
        img_open = "";

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
    }



    function coverBoxes(box0, box1)
    {
        $("#" + box0 + " img").addClass('opacity');
        $("#" + box1 + " img").addClass('opacity');
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

   

    function updateMove(isEnemy, moveN, correctN)
    {
        if (isEnemy == 1) 
            $("#move_e").html("Opponent Move: " + moveN);
        else              
            $("#move_p").html("Player Move: "   + moveN);

        if (correctN != -1) {
            if (isEnemy == 1) 
                $("#correct_e").html("Opponent Score: " + correctN);
            else              
                $("#correct_p").html("Player Score: "   + correctN);
        }
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



