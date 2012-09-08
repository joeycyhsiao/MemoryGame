import flask

from flask import Flask
from flask import request

import memorygame as mg

import io, shutil, time, sys, os, re
import csv

app = Flask(__name__)



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

    if   'half'   in request.form:    #- only for display card, do nothing more -#
        print 'Has Half Ans'
        grp.setAns( request.form.get('img'), request.form.get('box') )
        return flask.make_response() 

    elif 'giveup' in request.form:
        print 'Has Give up'
        grp.setAns( request.form.get('img'), request.form.get('box') )
        grp.setMoveN( request.form.get('moveN') )
        grp.giveUp()
        return flask.make_response()

    elif 'full'   in request.form:    #- one player finish the turn -#
        print 'Has Full Ans'
        grp.delAns() 
        grp.setAns( request.form.get('img0'), request.form.get('box0') ) 
        grp.setAns( request.form.get('img1'), request.form.get('box1') )
        grp.setMoveN( int(request.form.get('moveN') ) )
        grp.setCorrectN( int(request.form.get('correctN') ) )

        usr.listenAns()

        print 'moveN, correctN' 
        print request.form.get('moveN'), request.form.get('correctN')
        return flask.jsonify( end=int(game.isOver()) )



@app.route('/countdown', methods=['POST'])
def countdown():
    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )
    game.setCountDown( request.form.get('countdown') ) 
    print 'Set Countdown'    
    print request.form.get('countdown')
    return flask.make_response()



@app.route('/wait', methods=['GET'])
def wait():    #- used by recvAns() from teammate and enemies -#

    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )
 
    (ctrlUID, ctrlGID) = game.getCtrl()

    if ctrlUID == -1 or ctrlGID == -1:
        return flask.make_response()

    ctrler  = mg.getUsr(ctrlUID)
    ctrlGrp = mg.getGrp(ctrlGID)
    (imgs, boxes) = ctrlGrp.getAns()

    isEnemy = usr.isEnemyWith(ctrler)

    if   ctrlGrp.isGiveUp():
        print 'Know Give Up'

        usr.listenAns()
        if game.allKnowAns():    #- reset for next turn -#
            game.reset()

        if ctrlGrp.isHalfAns():  #- ctrler runs out of time with 1 card open -#
            return flask.jsonify( giveup=1, img=imgs[0], box=boxes[0], isEnemy=isEnemy )
        else:                    #- ctrler runs out of time with 0 card open -#
            return flask.jsonify( giveup=1, img='', box='', isEnemy=isEnemy )

    elif ctrlGrp.isHalfAns():    #- just for display imgs -#
        print 'Know Half Ans'
        print game.getCountdown()
        return flask.jsonify( half=1, img=imgs[0], box=boxes[0], countdown=game.getCountdown() )

    elif ctrlGrp.isFullAns():    #- ctrler finished ans -#
        print 'Know Full Ans'

        if  game.allKnowAns():    #- all player know answer, so reset for next turn -#
            return flask.jsonify( full=1, allknow=1, isEnemy=isEnemy, end=game.isOver() )
        elif usr.knowAns():
            return flask.jsonify( full=1, know=1 )
        else:
            usr.listenAns()         
            return flask.jsonify( full=1, know=0, img0=imgs[0], box0=boxes[0], img1=imgs[1], box1=boxes[1] )

    else:
        print 'No Move'
        print game.getCountdown()
        return flask.jsonify( countdown=game.getCountdown() )



@app.route('/end', methods=['POST'])
def end():
    pass 



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



def writeRes(usrID):
    enemyID = getEnemy(usrID)
    fp = open('./result/'+usrID+'_'+enemyID+'.txt', 'w')

    fp.write(str(usrID) + ':' + str(enemyID) + '\n')
    fp.write(str(CORRECT_N[usrID]) + ':' + str(CORRECT_N[enemyID]) + '\n')
    for i, turnTime in enumerate(TURN_TIME[usrID]):
        fp.write(str(TURN_START_TIME[usrID][i]) + ',')
        for time in turnTime:
            fp.write(str(time) + ',')
        fp.write('\n')
    fp.close()



if __name__ == "__main__":
    port = sys.argv[1]
    app.run(debug=True, host="209.129.244.8", port=int(port), threaded=True )


