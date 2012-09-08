var box_open = "";
var img_open = "";

var flip  = 0;
var recvAnsID;
var recvKnowID;
var flipMsgID;

var moveN       = 0;
var correctN    = 0;
var moveTime    = 0;
var correctTime = 0;

var gameStartTime = 0;
var turnStartTime = 0;
var turnLen   = [0, 0];

var turnState = -1;


CTRL = 1;
WAIT = 2;
KNOW = 3;

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
                    turnState = CTRL;

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
                        recvAnsID  = setInterval(recvAns, 1000); 
                        recvKnowID = setInterval(recvKnow, 1000); 
                        //setInterval(updateTime, 1000);  
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
        //$("#ctrl").button().bind('click', sendCtrl).button('disable');
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
        //$("#ctrl").button().bind('click', sendCtrl).button('disable');
        $.ajax({
            url:  "/shuffle",
            type: "GET",
            success: function(resp) {
                gameStartTime = new Date();

				if (resp.isEnemy == 1)
					turnState = WAIT;
				else 
					turnState = CTRL;

                syncCards(resp.order);    /*- sync card order with ctrler order -*/
                window.clearInterval(recvOrderID); 
                flipMsgID = setInterval( function () {
	                flipMsg("Ready");
                }, 1000);

                setTimeout(function () {
 		            window.clearInterval(flipMsgID);
                    $('#game').html('Game ID: ' + resp.gameID);

					if(turnState == CTRL){
						$("#waiting").html('Take Control!');
						setTimeout(clearWaitMsg, 3000);
					}

                    recvAnsID = setInterval(recvAns, 1000); 
                    recvKnowID = setInterval(recvKnow, 1000); 
                    //setInterval(updateTime, 1000);   
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
        $('#dbg').html('send HALF ANS'); 
        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data:{ half:1, img:img, box:box},
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
                moveN:moveN, correctN:correctN, turnLen0:turnLen0, turnLen1:turnLen1, startTime:startTime
            },
            success: function(resp) {   
                if (resp.end == 1) recvEnd();
            }
        });  

		turnState = KNOW;
		$("#dbg").html("KNOW");
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
                    if (resp.box != ""){
                        $("#" + resp.box + " img").fadeIn(1000);
                        $("#" + resp.box + " img").delay(1000).fadeOut(1000);
                    }
					turnState = KNOW;
					$("#dbg").html("KNOW");
                }
                else if (resp.full == 1) {

                    checkAns(resp.img0, resp.box0, resp.img1, resp.box1);
                    turnState = KNOW;
					$("#dbg").html("KNOW");
                    if (resp.end == 1)
                        recvEnd();
                }
                else {
                    $("#timer").html('Countdown: ' + resp.countdown + ' seconds'); 
                    if (resp.half == 1)
                        $("#" + resp.box + " img").fadeIn(1000);
                }
            } 
        });  
    }

  
    function recvKnow()
	{
		$('#dbg').button('recvKnow: ' + turnState);
		if (turnState != KNOW) return;

        $.ajax({
            url:  "/know",
            type: "GET",
            success: function(resp) {

				$('#dbg').html('out of all know'); 
                if (resp.allknow == 1) {
					$('#dbg').html('in of all know')
			
                    if   (resp.ctrl == 1) {
					    turnState = CTRL;
						$('#dbg').html('to be ctrl');
                        setTimeout(clearWaitMsg, 4000);  
					}
                    else{  
						turnState = WAIT;
						$('#dbg').html('to be wait')
					}
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
        if ( turnState != CTRL  ) return;    

        var curTime = new Date();
        countdown = Math.ceil(30 - (curTime.getTime() - turnStartTime.getTime())/1000);
        $("#timer").html('Countdown: ' + countdown + ' seconds'); 
        //sendCountdown(countdown);

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
        if ( turnState != CTRL ) return;    

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
                var img_cur = $("#" + box_cur + " img").attr("src");
                checkAns(img_open, box_open, img_cur, box_cur);
 
                moveN++;
                $('#waiting').removeClass('disappear');  
                $('#move_p').html("Player Move: " + moveN);  
                $("#correct_p").html("Player Score: " + correctN); 
            }
        }
    }


    function checkAns(img0, box0, img1, box1)
    {
        if (img0 != img1) {    /*- wrong answer -*/

            setTimeout(function() {

                if (turnState == CTRL) {  
                    sendFullAns(img0, img1, box0, box1, turnLen[0], turnLen[1],
                                getTimeFromBegin(turnStartTime) ); 
                    $('#waiting').removeClass('disappear');
                    $("#timer").html('Countdown: -- seconds'); 
		        }
                else 
                    showBoxes(box0, box1);
                hideBoxes(box0, box1);
            }, 400);
        } 
        else {                /*- right answer -*/

            if (turnState == CTRL){   
                correctN++;
                sendFullAns(img0, img1, box0, box1, turnLen[0], turnLen[1],
                            getTimeFromBegin(turnStartTime) );
                $('#correct_p').html('Player Score: ' + correctN);
                $("#timer").html('Countdown: -- seconds'); 
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



//    function sendCtrl()
//    {
//        $.ajax({
//            url:'/ctrl',
//            type:'POST',
//            success: function (resp) {
//                if (resp.ctrl != -1) {
//                    $('#ctrl').button('disable');
//                    window.clearInterval(recvCtrlID);
//                    turnState = IN_CTRL;
//                    //dbgTurnState();
//                }
//            }
//        });
//    }
//
//   
//   
//    function recvCtrl()
//    {
//        $.ajax({
//            url:'/ctrl',
//            type:'GET',
//            success: function(resp){
//                if (resp.ctrl != -1) {    /*- somebody  has taken the turn -*/
//                    $('#ctrl').button('disable');
//                    window.clearInterval(recvCtrlID); 
//
//                    if      (turnState == WAIT_MATE_CTRL)
//                        turnState = WAIT_MATE_ANS;
//                    else if (turnState == WAIT_ENEMY_CTRL)
//                        turnState = WAIT_ENEMY_ANS;
//
//                }
//            }
//        });
//    }


 
    function getTimeFromBegin(time)
    {
         return time.getTime() - gameStartTime.getTime();
    }


    function dbgTurnState()
    {
        $('#dbg').html(turnState); 
    }
});   



