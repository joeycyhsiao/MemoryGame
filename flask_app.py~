import flask

from flask import Flask
from flask import request
from flask import jsonify
from flask import make_response
from flask import redirect

import memorygame as mg

import urllib, urllib2
import io, shutil, time, sys, os, re
import csv

app = Flask(__name__)

READY   = False
OVER    = False
IPs     = {}
GAME_ID = -1

@app.route('/', methods=['GET', 'POST'])
def index():

    if   request.method == 'GET':    #- load the page -#
        resp = make_response(flask.render_template('index.html'))

        if  (request.cookies.get('usrID') is None) or \
            (mg.getUsr( request.cookies.get('usrID') ) == -1 ):  #- either client or server is new, create new usr -#
            usr = mg.createUsr()
            resp.set_cookie('usrID', usr.getUsrID() )
           
        return resp

    elif request.method == 'POST':   
        usr = mg.getUsr( request.cookies.get('usrID') )
        if    usr == -1:
            return jsonify( usrID=-1 ) 

        elif  ('init' in request.form) or ('polling' in request.form) :  
            space = mg.getSpaceN()
            return jsonify( usrID=usr.getUsrID(), space0=space[0], space1=space[1] )

        elif 'choose' in request.form:        #- for sendWait() -#
            IPs[usr.getUsrID()] = request.remote_addr
            side = request.form.get('side')
            space = mg.takeSpace( usr.getUsrID(), int(side) )
            return jsonify( side=side, space0=space[0], space1=space[1] )
      


@app.route('/game', methods=['GET', 'POST'])
def game():

    if   request.method == 'GET':    #- load the page -#
        #print 'GET game'
        return make_response( flask.render_template('game.html') )

    elif request.method == 'POST':   
        usr = mg.getUsr( request.cookies.get('usrID') ) 
        if   'init'    in request.form:        #- for init(). if gameID == -1: waiting; else: game starting; -#
            #print 'POST game init %d' %(usr.getUsrID())
            return jsonify( gameID = mg.joinUsr( usr.getUsrID() ) )
        elif 'waiting' in request.form:        #- for sendWait() -#
            #print 'POST game waiting %d' %(usr.getUsrID())
            return jsonify( gameID = usr.getGameID() )



@app.route('/shuffle', methods=['GET', 'POST'])
def shuffle():
    global GAME_ID, READY
    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )
    GAME_ID = game.getGameID()

    if   request.method == 'GET':     #- for recvOrder() -#
        if  ( game == -1 ) or ( not game.isReady() ):
            #print 'GET shuffle %d' %(usr.getUsrID())
            return jsonify( gameID=-1 )
        else:
            ctrler = mg.getUsr( game.getCtrl()[0] )
            return jsonify( order=game.getOrder(), gameID=game.getGameID(), 
                            isEnemy=int(usr.isEnemyWith(ctrler)), side=usr.getSide() )

    elif request.method == 'POST':    #- for sendOrder(), the usr is ctrler of 1st turn -#
        #print 'POST shuffle %d' %(usr.getUsrID())
        READY = True
        game.setOrder( request.form.getlist('order') )
        return jsonify( gameID=game.getGameID(), side=usr.getSide() )



@app.route('/answer', methods=['POST'])
def answer():    #- used by only ctrler -#

    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    UID = usr.getUsrID()
    #print 'POST answer %d' %(usr.getUsrID())
    if   'half'   in request.form:   
        grp.setAns( request.form.get('img'), request.form.get('box') )

        if   grp.isHalfAns():
            grp.setTurnTimes( request.form.get('startTime'), 0, UID )
            grp.setTurnTimes( request.form.get('turnTime'),  1, UID )
            return make_response() 

        elif grp.isFullAns():     #- both two people answer and become a pair -*/
            grp.setTurnTimes( request.form.get('turnTime'),  2, UID)
            (imgs, boxes) = grp.getAns()
            grp.addMove( imgs[0], imgs[1] ) 
            grp.finTurn()
            return jsonify( full=1, moveN=grp.getMoveN(), correctN=grp.getCorrectN(), end=int(game.isOver()) )
   
        else:
            return make_response() 

    elif 'giveup' in request.form:
        grp.giveUpTurn()
        if grp.getTurnTimes()[0] == -1:
            grp.setTurnTimes( request.form.get('startTime'), 0, UID)
        grp.addMove('', '')
        grp.finTurn()
        return jsonify( moveN=grp.getMoveN() )

    elif 'full'   in request.form:    #- one player finish the turn -#
        imgs = [request.form.get('img0'), request.form.get('img1') ]

        grp.delAns() 
        grp.setAns( imgs[0], request.form.get('box0') ) 
        grp.setAns( imgs[1], request.form.get('box1') )

        grp.resetTurnTimes()
        grp.setTurnTimes( request.form.get('startTime'), 0, UID )
        grp.setTurnTimes( request.form.get('turnTime0'), 1, UID )
        grp.setTurnTimes( request.form.get('turnTime1'), 2, UID )
        grp.addMove( imgs[0], imgs[1] )

        grp.finTurn()
        return jsonify( moveN=grp.getMoveN(), correctN=grp.getCorrectN(), end=int(game.isOver()) )



@app.route('/wait', methods=['GET'])
def wait():    #- used by recvAns() from teammate and enemies -#

    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )
    UID  = int(usr.getUsrID())
    #print 'GET wait %d' %(usr.getUsrID())

    (ctrlUID, ctrlGID) = game.getCtrl()
    if not(game.allChanged) or ctrlUID == -1 or ctrlGID == -1:
        return make_response()

    ctrlGrp       = mg.getGrp(ctrlGID)
    (imgs, boxes) = ctrlGrp.getAns()

    isEnemy = int( usr.isEnemyWith( mg.getUsr(ctrlUID) ) )

    img = ''
    box = ''
    half = 0
    if len(boxes) > 0:
        img  = imgs[0]
        box  = boxes[0]
        half = 1

    moveN    = ctrlGrp.getMoveN()
    correctN = ctrlGrp.getCorrectN()

    if   ctrlGrp.isGiveUp():
        if not isEnemy:
            img = ''
            box = ''
        return jsonify( giveup=1, half=half, img=img, box=box, moveN=moveN, isEnemy=isEnemy )

    elif ctrlGrp.isHalfAns():    #- just for display imgs -#
        return jsonify( giveup=0, half=half, img=img, box=box, countdown=game.getCountdown() )

    elif ctrlGrp.isFullAns():    #- ctrler finished ans -#
        return jsonify( full=1, img0=imgs[0], box0=boxes[0], img1=imgs[1], box1=boxes[1], 
                        moveN=moveN, correctN=correctN, isEnemy=isEnemy, end=game.isOver() )
    else:                        #- no move -#
        return jsonify( countdown=game.getCountdown(), UID=int(usr.getUsrID()) )



@app.route('/know', methods=['GET'])
def know():
 
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    #print 'GET know %d' %(usr.getUsrID())  
    if game.allKnow():  
        curCtrlGrp  = mg.getGrp( game.getCtrl()[1] )
        nextCtrlGrp = mg.getGrp( curCtrlGrp.getEnemyGID() )

        game.usrChangeState()
        if game.allChanged():
           game.reset()
           nextCtrler  = nextCtrlGrp.getUsrs()[0]
           game.setCtrl( nextCtrler.getUsrID(), nextCtrlGrp.getGrpID() )

        if usr.getGrpID() == nextCtrlGrp.getGrpID():
            return jsonify(allknow=1, ctrl=1)
        else:
            return jsonify(allknow=1, ctrl=0)
    else:
        usr.setKnow()
        return make_response()



@app.route('/countdown', methods=['POST'])
def countdown():
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )

    #print 'POST countdown %d' %(usr.getUsrID())
    if usr.getUsrID() == game.getCtrl()[0]:
        game.setCountDown( request.form.get('countdown') ) 
    return make_response()



@app.route('/end', methods=['POST'])
def end():
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    #print 'POST end %d' %(usr.getUsrID())
    game.writeRes()
    return jsonify( result=game.getResult( grp.getGrpID() ) )



@app.route('/unload', methods=['POST'])
def unload():
    mg.delWaiting( int(request.cookies.get('usrID') ) )
    return make_response()



@app.route('/restart', methods=['POST'])
def restart():
    usrID = request.cookies.get('usrID')
    mg.killGame( usrID )

    #print 'POST RESTART %d' %(int(usrID))
    side_char = request.form.get('side')
    side = 0            #- if side_char == 'A': side = 0 -#
    if side_char == 'B':
        side = 1

    mg.takeSpace( usrID, side )
    return jsonify(success=1)



@app.route('/sound', methods=['POST'])
def sound():
    global OVER, READY
    if  int(request.form.get('act')) == 0:
        OVER  = True
        READY = False
    else:
        OVER = False
    return make_response()



@app.route('/ready', methods=['GET'])
def ready():
    print 'READY ' + str(READY)
    return jsonify(ready=READY)



@app.route('/over', methods=['GET'])
def over():
    print 'OVER ' + str(OVER)
    return jsonify(over=OVER, IPs=IPs, gameID=GAME_ID)



if __name__ == "__main__":
    port = sys.argv[1]
    app.run(debug=True, host="209.129.244.8", port=int(port), threaded=True )



