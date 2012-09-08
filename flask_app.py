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
    print 'Answer'
    print request.form

    if   'half'   in request.form:    #- only for display card, do nothing more -#
        print 'Has HALF ANS'
        grp.setAns( request.form.get('img'), request.form.get('box') )
        return flask.make_response() 

    elif 'giveup' in request.form:
        return flask.make_response()

    elif 'full'   in request.form:    #- one player finish the turn -#
        usr.listenAns()
        grp.delAns() 
        grp.setAns( request.form.get('img0'), request.form.get('box0') ) 
        grp.setAns( request.form.get('img1'), request.form.get('box1') )
        grp.setMoveN( int(request.form.get('moveN') ) )
        grp.setCorrectN( int(request.form.get('correctN') ) )
        return flask.jsonify( end=int(game.isOver()) )



@app.route('/wait', methods=['GET'])
def wait():    #- used by recvAns() from teammate and enemies -#

    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )
 
    (ctrlUID, ctrlGID) = game.getCtrl()

    if ctrlUID == -1 or ctrlGID == -1:
        return flask.make_response()

    ctrlGrp = mg.getGrp(ctrlGID)
    (imgs, boxes) = ctrlGrp.getAns()

    if   ctrlGrp.isGiveUp():
        print 'Know Give Up'
        return flask.make_response()

    elif ctrlGrp.isHalfAns():    #- just for display imgs -#
        print 'Know HALF ANS'
        return flask.jsonify( half=1, img=imgs[0], box=boxes[0], countdown=game.getCountdown() )

    elif ctrlGrp.isFullAns():    #- ctrler finished ans -#
        print 'Know Full Ans'
        usr.listenAns()
        return flask.jsonify( full=1, know=0, img0=imgs[0], box0=boxes[0], img1=imgs[1], box1=boxes[1] )

    else:                        #- no move -#
        return flask.jsonify( countdown=game.getCountdown() )



@app.route('/know', methods=['GET'])
def know():
 
    global count 
    (usr, grp, game) = mg.getObjs( request.cookies.get('usrID') )
   
    if game.allKnowAns():
     
        print 'All Know'
        curCtrlGrp  = mg.getGrp( game.getCtrl()[1] )
        nextCtrlGrp = mg.getGrp( curCtrlGrp.getEnemyGID())
        nextCtrler  = grp.getUsrs()[0]

        count += 1
        if count == 4:
            game.reset()
            game.setCtrl(nextCtrler.getUsrID(), nextCtrlGrp.getGrpID() )
            count = 0

        if usr.getGrpID() == nextCtrlGrp.getGrpID():
            return flask.jsonify(allknow=1, ctrl=1)
        else:
            return flask.jsonify(allknow=1, ctrl=0)

    else:
        print 'Know Nothing'
        return flask.make_response()



@app.route('/countdown', methods=['POST'])
def countdown():
    usr  = mg.getUsr( request.cookies.get('usrID') )
    game = mg.getGame( usr.getGameID() )
    game.setCountDown( request.form.get('countdown') ) 
    print 'Set Countdown'    
    print request.form.get('countdown')
    return flask.make_response()









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


