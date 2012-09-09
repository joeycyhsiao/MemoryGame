import flask

from flask import Flask
from flask import request

import memorygame as mg

import io, shutil, time, sys, os, re
import csv

app = Flask(__name__)


count = 0

@app.route('/', methods=['GET', 'POST'])
def index():

    if   request.method == 'GET':    #- load the page -#
        usr  = mg.createUsr()
        resp = flask.make_response(flask.render_template('index.html'))
        resp.set_cookie('usrID', usr.getUsrID() )
        return resp

    elif request.method == 'POST':   
        usr = mg.getUsr( request.cookies.get('usrID') ) 
        if   'init'    in request.form:        #- for init(), return -1: waiting, else: game starting -#
            return flask.jsonify( gameID = mg.addUsr(usr) )
        elif 'waiting' in request.form:        #- for sendWait() -#
            return flask.jsonify( gameID = usr.getGameID() )



@app.route('/shuffle', methods=['GET', 'POST'])
def shuffle():

    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )

    if   request.method == 'GET':     #- for recvOrder() -#
        if  game != -1 and game.isReady() :
            ctrler = mg.getUsr( game.getCtrl()[0] )
            return flask.jsonify( order=game.getOrder(), gameID=game.getGameID(), 
                                  isEnemy=int(usr.isEnemyWith(ctrler)) )
        else:
            return flask.jsonify( gameID=-1 )

    elif request.method == 'POST':    #- for sendOrder(), the usr is ctrler of 1st turn -#
        game.setOrder( request.form.getlist('order') )
        return flask.jsonify( gameID=game.getGameID() )



@app.route('/answer', methods=['POST'])
def answer():    #- used by only ctrler -#

    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    UID = usr.getUsrID()

    if   'half'   in request.form:   
        grp.setAns( request.form.get('img'), request.form.get('box') )

        if grp.isHalfAns():
            grp.setTurnTimes( request.form.get('startTime'), 0, UID )
            grp.setTurnTimes( request.form.get('turnTime'),  1, UID )
            return flask.make_response() 

        elif grp.isFullAns(): 

            grp.setTurnTimes( request.form.get('turnTime'),  2, UID)
            (imgs, boxes) = grp.getAns()
            grp.addMove( (imgs[0] == imgs[1]) )
            
            print 'Send HALF to FULL'
            print grp.getTurnTimes()
            grp.finTurn()
            usr.listenAns()
            return flask.jsonify( full=1, moveN=grp.getMoveN(), correctN=grp.getCorrectN(), end=int(game.isOver()) )
   
        else:
            return flask.make_response() 

    elif 'giveup' in request.form:
        grp.giveUpTurn()
        if grp.getTurnTimes()[0] == -1:
            grp.setTurnTimes( request.form.get('startTime'), 0, UID)
        grp.addMove('')

        print 'Give up'
        print grp.getTurnTimes()
        grp.finTurn()
        usr.listenAns()
        return flask.jsonify( moveN=grp.getMoveN() )

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

        print 'Send FULL'
        print grp.getTurnTimes()
        grp.finTurn()
        usr.listenAns()
        return flask.jsonify( moveN=grp.getMoveN(), correctN=grp.getCorrectN(), end=int(game.isOver()) )



@app.route('/wait', methods=['GET'])
def wait():    #- used by recvAns() from teammate and enemies -#

    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )
 
    (ctrlUID, ctrlGID) = game.getCtrl()
    if ctrlUID == -1 or ctrlGID == -1:
        return flask.make_response()

    ctrlGrp       = mg.getGrp(ctrlGID)
    (imgs, boxes) = ctrlGrp.getAns()
    moveN         = ctrlGrp.getMoveN()
    correctN      = ctrlGrp.getCorrectN()

    isEnemy = int( usr.isEnemyWith( mg.getUsr(ctrlUID) ) )

    if   ctrlGrp.isGiveUp():
        usr.listenAns()
        if len(boxes) > 0:
            return flask.jsonify( giveup=1, img=imgs[0], box=boxes[0], moveN=moveN, isEnemy=isEnemy )
        else:
            return flask.jsonify( giveup=1, img='', box='', moveN=moveN, isEnemy=isEnemy )

    elif ctrlGrp.isHalfAns():    #- just for display imgs -#
        return flask.jsonify( half=1, img=imgs[0], box=boxes[0], countdown=game.getCountdown() )

    elif ctrlGrp.isFullAns():    #- ctrler finished ans -#
        usr.listenAns()
        return flask.jsonify( full=1, img0=imgs[0], box0=boxes[0], img1=imgs[1], box1=boxes[1], 
                              moveN=moveN, correctN=correctN, isEnemy=isEnemy, end=game.isOver() )

    else:                        #- no move -#
        return flask.jsonify( countdown=game.getCountdown() )



@app.route('/know', methods=['GET'])
def know():
 
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
   
    if game.allKnowAns():
     
        print 'All Know'
        curCtrlGrp  = mg.getGrp( game.getCtrl()[1] )
        nextCtrlGrp = mg.getGrp( curCtrlGrp.getEnemyGID() )

        print 'ChangedN: ', 
        print game.getChangedN()
        game.usrChangeState()
        if game.allChanged():
           game.reset()
           nextCtrler  = nextCtrlGrp.getUsrs()[0]
           game.setCtrl( nextCtrler.getUsrID(), nextCtrlGrp.getGrpID() )

        if usr.getGrpID() == nextCtrlGrp.getGrpID():
            return flask.jsonify(allknow=1, ctrl=1)
        else:
            return flask.jsonify(allknow=1, ctrl=0)

    else:
        print 'Know Nothing'
        return flask.make_response()



@app.route('/countdown', methods=['POST'])
def countdown():
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    if usr.getUsrID() == game.getCtrl()[0]:
        game.setCountDown( request.form.get('countdown') ) 
    return flask.make_response()



@app.route('/end', methods=['POST'])
def end():
    print 'END'
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
    game.writeRes()
    return flask.jsonify( result=game.getResult( grp.getGrpID() ) )



@app.route('/unload', methods=['GET'])
def unload():
    mg.rmWaiting( int(request.cookies.get('usrID') ) )
    return flask.make_response()



@app.route('/ctrl', methods=['GET', 'POST'])
def ctrl():

    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )

    if request.method == 'POST':    #- for sendCtrl() -#
        game.reset()
        game.setCtrl( usr.getUsrID(), usr.getGrpID() )

    return flask.jsonify( ctrl=game.getCtrl()[0] )



if __name__ == "__main__":
    port = sys.argv[1]
    app.run(debug=True, host="209.129.244.8", port=int(port), threaded=True )


