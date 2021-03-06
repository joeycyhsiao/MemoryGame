var box_open = "";
var img_open = "";

var flip  = 0;
var recvAnsID;
var recvKnowID;
var flipMsgID;
var updateTimeID;

var moveTime    = 0;
var correctTime = 0;

var gameStartTime = 0;
var turnStartTime = 0;
var turnTime = [0, 0];

var mateGiveup = 0;

var prevTurnState = -1;
var turnState = -1;

var side;
var restart = 0;


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
    $('#restart').button().button('disable');

    init();

    function init() 
    {
        $.ajax({
            url:  '/game',
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

					startSound(1);

                    setTimeout( function() {
                        gameStartTime = new Date();
                        window.clearInterval(flipMsgID);
                        $("#waiting").html('Take Control!');
                        turnStartTime = 0;
                        updateState(CTRL);
                        setTimeout(clearWaitMsg, 3000);
                        recvAnsID    = setInterval(recvAns, 1000); 
                        recvKnowID   = setInterval(recvKnow, 1000); 
                        updateTimeID = setInterval(updateTime, 1000); 
						$('#restart').button('disable'); 
                    }, 5000);
                }
            }
        });
    }



    function sendWait () 
    {
         flipMsg("Waiting for Other Players' Join");
         $.ajax({
            url: '/game',
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
                if (resp.gameID != -1){ 
                    $('#game').html('Game ID: ' + resp.gameID);
                    $("#side_txt").html("Group: " + resp.side);
                    side = resp.side;
                }
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

                startSound(1);

                setTimeout(function () {

                    gameStartTime = new Date();
                    window.clearInterval(flipMsgID);
                    $('#game').html('Game ID: ' + resp.gameID);
                    $("#side_txt").html("Group: " + resp.side);
                    side = resp.side;

                    if   (resp.isEnemy == 1) 
                        updateState(WAIT);
                    else {
                        $("#waiting").html('Take Control!');
                        turnStartTime = 0;
                        updateState(CTRL);
                        setTimeout(clearWaitMsg, 3000);
                    }

                    recvAnsID    = setInterval(recvAns, 1000); 
                    recvKnowID   = setInterval(recvKnow, 1000); 
                    updateTimeID = setInterval(updateTime, 1000);   
					$('#restart').button();
					$('#restart').button('disable');

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
        startTime = getTimeFromBegin(turnStartTime);

        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data:{ half:1, img:img, box:box, turnTime:turnTime[0], startTime:startTime},
            success: function(resp) {
                if (resp.full == 1)
                    updateMove(0, resp.moveN, resp.correctN);
            }
        });  
    }



    function sendFullAns(img0, img1, box0, box1)
    {
        startTime = getTimeFromBegin(turnStartTime);

        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data:{
                full:1, img0:img0, img1:img1, box0:box0, box1:box1, 
                turnTime0:turnTime[0], turnTime1:turnTime[1], startTime:startTime
            },
            success: function(resp) {   
                updateMove(0, resp.moveN, resp.correctN);
                updateState(KNOW);
                if (resp.end == 1){
                    updateState(END);
                    recvEnd();
                }
            }
        });  
    }
  


    function recvAns()
    {
		//openAllCard();

        if      ( prevTurnState == KNOW ){
            updateState(turnState);
            return;
        }
        else if ( turnState == KNOW || turnState == END ) return;
        else if ( turnState == WAIT ){

            if ( $("#waiting").hasClass('disappear') )
                $("#waiting").removeClass('disappear');
            flipMsg("Waiting for Opponents");
        }
 
        $.ajax({
            url:  "/wait",
            type: "GET",
            success: function(resp) {
                if (resp.giveup == 1) {

                    if (box_open != ''){
                        $("#" + box_open + " img").delay(1700).fadeOut(300);
                        box_open = '';
                        img_open = '';
                    }

                    if (resp.isEnemy == 0) 
                        mateGiveup = 1;

                    updateMove(resp.isEnemy, resp.moveN, -1);
                    updateState(KNOW);
                }
                else if (resp.full == 1) {

                    checkAns(resp.img0, resp.box0, resp.img1, resp.box1, 0);
                    updateMove(resp.isEnemy, resp.moveN, resp.correctN);
                    updateState(KNOW);
                    if (resp.end == 1){
                        updateState(END);
                        recvEnd();
                    }
                }
                else  {
                    $("#timer").html('Countdown: ' + resp.countdown + ' seconds'); 
                    if ( resp.half == 1 ) {
                        $("#" + resp.box + " img").fadeIn(300);
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

                    closeAllCard(0);

                    if   (resp.ctrl == 1) { /*- assigned as ctrler -*/
                        turnStartTime = 0;
                        updateState(CTRL);
                        $("#waiting").html('Take Control!');
                        setTimeout(clearWaitMsg, 3000);  
                    }
                    else
                        setTimeout(updateState(WAIT), 1000);
                }
            }
        });
    }



    function recvEnd()
    {
        $.ajax({
            url:  "/end",
            type: "POST",
            success:function(resp){
                $('#waiting').removeClass('disappear');

                window.clearInterval(recvAnsID);
                window.clearInterval(recvKnowID); 
				window.clearInterval(flipMsgID);
				window.clearInterval(updateTimeID);

                startSound(0);

                if      (resp.result == 1)
                    $('#waiting').html("YOU WIN!");
                else if (resp.result == -1)
                    $('#waiting').html("YOU LOSE...");
                else  
                    $('#waiting').html("DRAW!")
        		box_open = '';
        		img_open = '';		
				$("#restart").button().bind('click', restart).button('enable');
            }
        });
    }



    /*- clear wait msg, used before one take ctrl -*/ 
    function clearWaitMsg()
    {
        mateGiveup = 0;
        turnStartTime = new Date();
        $("#waiting").html('');
        $("#waiting").addClass('disappear');
        turnTime = [0, 0];
    }



    function updateTime()
    {
        /*- 
         *  there are many turnStartTime = 0 to prevent come into this function, 
         *  and giveup before turnStartTime renewed
        -*/
        if ( turnState != CTRL || !$("#waiting").hasClass('disappear') || turnStartTime == 0 ) 
			return;    

        var curTime = new Date();
        countdown = Math.floor(30 - (curTime.getTime() - turnStartTime.getTime())/1000);
        sendCountdown(countdown);

        if (mateGiveup == 0 && countdown <= 0) 
			giveUpTurn();
    }



    function recordTime(n, giveup)
    {
        if      (giveup == 1 && turnTime[0] == 0)    /*- give up before any fliping -*/
            turnTime = ['-----', '-----'];
        else if (giveup == 1 && turnTime[0] != 0)    /*- give up after fliping one card -*/
            turnTime[1] = '-----';
        else 
            turnTime[n] = getTimeFromBegin( new Date() );
    }



    function giveUpTurn()
    {
        recordTime(0, 1);
        startTime = getTimeFromBegin(turnStartTime);
        $.ajax({
            url:  "/answer",
            type: "POST",
            traditional: true,
            data: {
                giveup:1, startTime:startTime
            },
            success: function(resp){
                updateMove(0, resp.moveN, -1);
                updateState(KNOW);

                if (box_open != ""){    /*- give up after opening one card -*/
                    $("#" + box_open + " img").delay(1700).fadeOut(300);
                    box_open = "";
                   img_open = "";
                }
            }
        }); 
    }



    function openCard() 
    {
        if ( (prevTurnState != CTRL && turnState != CTRL ) || 
             !($("#waiting").hasClass('disappear')) ||  turnStartTime == 0) return;    

        var box_cur = $(this).attr("id");

        if ($("#" + box_cur + " img").is(":hidden")) {

            $("#boxcard div").unbind("click", openCard);
            $("#" + box_cur + " img").fadeIn(300);

            if (img_open == "" && box_open == "") {
                recordTime(0, 0);    /*- record timing of fliping 1st card -*/

                box_open = box_cur;
                img_open = $("#" + box_open + " img").attr("src");
                sendHalfAns( img_open, box_open );

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
        if ( !isPairImg(img0, img1) ) {    /*- wrong answer -*/

            setTimeout(function() {

                if (turnState == CTRL) {  

                    if (sendFull == 1)
                        sendFullAns(img0, img1, box0, box1); 
                    
                    $('#waiting').removeClass('disappear');
                }
                else showBoxes(box0, box1);

                hideBoxes(box0, box1);
            }, 400);

        } 
        else {                /*- right answer -*/

            if (sendFull == 1 && turnState == CTRL)   
                sendFullAns(img0, img1, box0, box1);
            else 
                showBoxes(box0, box1);

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
        $("#" + box0 + " img").fadeIn(300);
        $("#" + box1 + " img").fadeIn(300);
    }



    function hideBoxes(box0, box1)
    {
        $("#" + box0 + " img").delay(1700).fadeOut(300);
        $("#" + box1 + " img").delay(1700).fadeOut(300);
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
    { return time.getTime() - gameStartTime.getTime(); }



    function dbgStr(string) 
    { $('#dbg').html(string); }


    function updateState(val)
    {
        prevTurnState = turnState;
        turnState = val;
    }


    function isPairImg(img0, img1)
	{
		var ind0 = img0.indexOf('_');
		var ind1 = img1.indexOf('_');

        imgName0 = img0.substring(0, ind0); 
        imgName1 = img1.substring(0, ind1); 

		return (imgName0 == imgName1) && (img0 != img1); 
	}
 
    function closeAllCard(timing)
    {
        for (var i = 1 ; i <= 16 ; i++) {
            var box = 'card'+i;

            if ( timing == 0 && $("#" + box + " img").hasClass('opacity') )
                continue;

            if ( !$("#" + box + " img").is(":hidden") ){
                $("#" + box + " img").fadeOut(300);
                $("#" + box + " img").removeClass('opacity');
			}
        }
    }


    function openAllCard()
    {
        for (var i = 1 ; i <= 16 ; i++) {
            var box = 'card'+i;
            if ( $("#" + box + " img").is(":hidden") )
                $("#" + box + " img").fadeIn(1);
        }
    }


    function restart()
	{
        turnState = -1;
		restart = 1;
		updateMove(0, 0, 0);
		updateMove(1, 0, 0);
        $.ajax({
            url:  '/restart',
            type: 'POST',
            data: {side:side},
            success:function (resp){
                if (resp.success == 1){

                    closeAllCard(1);

                    for (var i = 1; i < 10; i++)
                        window.clearInterval(i);
			        
                    $("#restart").button('disable');
                    $("#waiting").html("Reconnecting..."); 

					setTimeout( init, 2000 );
                }
            }
        });
    }



    function startSound(act)
    {
        $.ajax({
			url:"/sound",
            type:"POST",
			data:{act:act},
        });
    }


});   



