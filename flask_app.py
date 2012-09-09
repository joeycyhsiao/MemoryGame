import flask

from flask import Flask
from flask import request
from flask import jsonify
from flask import make_response

import memorygame as mg

import io, shutil, time, sys, os, re
import csv

app = Flask(__name__)


count = 0

@app.route('/', methods=['GET', 'POST'])
def index():

    if   request.method == 'GET':    #- load the page -#
        usr  = mg.createUsr()
        resp = make_response(flask.render_template('index.html'))
        resp.set_cookie('usrID', usr.getUsrID() )
        return resp

    elif request.method == 'POST':   
        usr = mg.getUsr( request.cookies.get('usrID') ) 
        if   'init'    in request.form:        #- for init(), return -1: waiting, else: game starting -#
            return jsonify( gameID = mg.addUsr(usr) )
        elif 'waiting' in request.form:        #- for sendWait() -#
            return jsonify( gameID = usr.getGameID() )



@app.route('/shuffle', methods=['GET', 'POST'])
def shuffle():

    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )

    if   request.method == 'GET':     #- for recvOrder() -#
        if  game != -1 and game.isReady() :
            ctrler = mg.getUsr( game.getCtrl()[0] )
            return jsonify( order=game.getOrder(), gameID=game.getGameID(), 
                                  isEnemy=int(usr.isEnemyWith(ctrler)) )
        else:
            return jsonify( gameID=-1 )

    elif request.method == 'POST':    #- for sendOrder(), the usr is ctrler of 1st turn -#
        game.setOrder( request.form.getlist('order') )
        return jsonify( gameID=game.getGameID() )



@app.route('/answer', methods=['POST'])
def answer():    #- used by only ctrler -#

    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    UID = usr.getUsrID()

    if   'half'   in request.form:   
        grp.setAns( request.form.get('img'), request.form.get('box') )

        if   grp.isHalfAns():
            grp.setTurnTimes( request.form.get('startTime'), 0, UID )
            grp.setTurnTimes( request.form.get('turnTime'),  1, UID )
            print 'SEND HALF ANS %d' %(UID)
            return make_response() 

        elif grp.isFullAns():     #- both two people answer and become a pair -*/
            grp.setTurnTimes( request.form.get('turnTime'),  2, UID)
            (imgs, boxes) = grp.getAns()
            grp.addMove( (imgs[0] == imgs[1]) ) 
            grp.finTurn()
            return jsonify( full=1, moveN=grp.getMoveN(), correctN=grp.getCorrectN(), end=int(game.isOver()) )
   
        else:
            return make_response() 

    elif 'giveup' in request.form:
        grp.giveUpTurn()
        if grp.getTurnTimes()[0] == -1:
            grp.setTurnTimes( request.form.get('startTime'), 0, UID)
        grp.addMove('')

        print 'SEND GIVE UP %d' %(UID)
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
        grp.addMove( (imgs[0] == imgs[1]) )

        grp.finTurn()
        return jsonify( moveN=grp.getMoveN(), correctN=grp.getCorrectN(), end=int(game.isOver()) )



@app.route('/wait', methods=['GET'])
def wait():    #- used by recvAns() from teammate and enemies -#

    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )
    UID  = int(usr.getUsrID())

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
        print 'RECV GIVE UP %d %d' %(half, UID)
        if not isEnemy:
            img = ''
            box = ''
        return jsonify( giveup=1, half=half, img=img, box=box, moveN=moveN, isEnemy=isEnemy )

    elif ctrlGrp.isHalfAns():    #- just for display imgs -#
        print 'RECV HALF ANS %d' %(UID)
        return jsonify( giveup=0, half=half, img=img, box=box, countdown=game.getCountdown() )

    elif ctrlGrp.isFullAns():    #- ctrler finished ans -#
        return jsonify( full=1, img0=imgs[0], box0=boxes[0], img1=imgs[1], box1=boxes[1], 
                        moveN=moveN, correctN=correctN, isEnemy=isEnemy, end=game.isOver() )
    else:                        #- no move -#
        return jsonify( countdown=game.getCountdown(), UID=int(usr.getUsrID()) )



@app.route('/know', methods=['GET'])
def know():
 
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
   
    if game.allKnow():  
        print 'ALL KNOW'
        curCtrlGrp  = mg.getGrp( game.getCtrl()[1] )
        nextCtrlGrp = mg.getGrp( curCtrlGrp.getEnemyGID() )

        game.usrChangeState()
        if game.allChanged():
           print 'ALL CHANGED'
           game.reset()
           nextCtrler  = nextCtrlGrp.getUsrs()[0]
           game.setCtrl( nextCtrler.getUsrID(), nextCtrlGrp.getGrpID() )

        if usr.getGrpID() == nextCtrlGrp.getGrpID():
            return jsonify(allknow=1, ctrl=1)
        else:
            return jsonify(allknow=1, ctrl=0)
    else:
        print 'ONE KNOW'
        usr.setKnow()
        return make_response()



@app.route('/countdown', methods=['POST'])
def countdown():
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    if usr.getUsrID() == game.getCtrl()[0]:
        game.setCountDown( request.form.get('countdown') ) 
    return make_response()



@app.route('/end', methods=['POST'])
def end():
    print 'END'
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    game.writeRes()
    return jsonify( result=game.getResult( grp.getGrpID() ) )



@app.route('/unload', methods=['GET'])
def unload():
    mg.rmWaiting( int(request.cookies.get('usrID') ) )
    return make_response()



@app.route('/ctrl', methods=['GET', 'POST'])
def ctrl():

    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )

    if request.method == 'POST':    #- for sendCtrl() -#
        game.reset()
        game.setCtrl( usr.getUsrID(), usr.getGrpID() )

    return jsonify( ctrl=game.getCtrl()[0] )



if __name__ == "__main__":
    port = sys.argv[1]
    app.run(debug=True, host="209.129.244.8", port=int(port), threaded=True )


