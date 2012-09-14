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
    window.onbeforeunload = unloadPage;
    $('#restart').button().button('disable');
    $('#close').button().button('enable');
    $('#close').bind('click', function(){
		closeAllCard(1);
	});

    init();

    function init() 
    {
        $.ajax({
            url:  '/supervise',
            type: "POST",
            data: {init: '1'},
            success: function (resp) {
                if (resp.gameID == -1)
                    recvOrderID = setInterval(sendWait, 1000);  /*- no enough user waiting on server -*/
            }
        });
    }



    function sendWait () 
    {
         flipMsg("Waiting for Other Players' Join");
         $.ajax({
            url: '/supervise',
            type: "POST",
            data: {waiting: '1'},
            success: function (resp) {
                if (resp.gameID != -1) recvOrder();                  
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

                setTimeout(function () {
                    recvAnsID    = setInterval(recvAns, 1000); 
                }, 5000);
            }
        });   
    }



    function recvAns()
    { 
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

                    updateMove(resp.side, resp.moveN, -1);
                }
                else if (resp.full == 1) {

                    checkAns(resp.img0, resp.box0, resp.img1, resp.box1, 0);
                    updateMove(resp.side, resp.moveN, resp.correctN);
                    if (resp.end == 1)
                        recvEnd();
                }
                else  {
                    $('#waiting').html('Group ' + resp.side + ' Turn');
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

  

    function recvEnd()
    {
        $.ajax({
            url:  "/end",
            type: "POST",
            success:function(resp){
                $('#waiting').removeClass('END');
                window.clearInterval(recvAnsID);
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



    function checkAns(img0, box0, img1, box1, sendFull)
    {
        if ( !isPairImg(img0, img1) ) {    

            setTimeout(function() {
                showBoxes(box0, box1);
                hideBoxes(box0, box1);
            }, 400);
        } 
        else {                
            showBoxes(box0, box1);
            coverBoxes(box0, box1);
        } 
 
        box_open = "";
        img_open = "";
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

   

    function updateMove(side, moveN, correctN)
    {
        $("#move_" + side).html("Move: " + moveN);
        if (correctN != -1)
             $("#correct_" + side).html("Score: " + correctN);
    }



    function dbgStr(string) 
    { $('#dbg').html(string); }


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


    function restart()
	{
		updateMove('A', 0, 0);
		updateMove('B', 0, 0);
        $.ajax({
            url:  '/restart',
            type: 'POST',
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



});   



