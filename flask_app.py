import flask

from flask import Flask
from flask import request

from werkzeug.datastructures import ImmutableMultiDict

import io, shutil, time, sys, os, re
import csv

app = Flask(__name__)

PLAYERS = []
PAIRS   = []
WAITING = []
AGREE   = {}
ORDERS  = {}
LAST_ANSWER = {}
CORRECT_N = {}
TOTAL_N = 8


@app.route('/', methods=['GET', 'POST'])
def index():
    if   request.method == 'GET':    #- to load the page -#
        usrID = newUsr()
        PLAYERS.append(usrID)
        resp  = flask.make_response(flask.render_template('index.html'))
        resp.set_cookie('username', str(usrID))
        return resp

    elif request.method == 'POST':   
        usrID = getUsr(request) 
        if   'init'    in request.form:    #- for init() -#
            return flask.jsonify( paired = addUsr(usrID) )
        elif 'waiting' in request.form:    #- for recvAgree() -#
            print 'WAITING: ' + usrID 
            paired = getEnemy(usrID)
            return flask.jsonify( paired = paired )


@app.route('/shuffle', methods=['GET', 'POST'])
def shuffle():
    global ORDERS
    if   request.method == 'GET': #- for recvOrder() -#

        print 'shuffle GET' + getUsr(request)
        enemyID = getEnemy(getUsr(request))
        print ORDERS
        print getUsr(request), enemyID
        if    enemyID in ORDERS:
            return flask.jsonify( order = ORDERS[enemyID], success=1 )
        else:
            return flask.jsonify( success=0 )

    elif request.method == 'POST':    #- for sendOrder() -#
        print 'shuffle POST' + getUsr(request)
        ORDERS[getUsr(request)] = request.form.getlist('order')
        return flask.make_response()


@app.route('/answer', methods=['GET', 'POST'])
def answer():
    global LAST_ANSWER, TOTAL_N, CORRECT_N
    usrID   = getUsr(request)
    enemyID = getEnemy(usrID)
    if   request.method == 'GET':    #- for recvAns() -#

        print 'answer GET' + usrID
        print LAST_ANSWER
        if    enemyID in LAST_ANSWER:
            img0 = LAST_ANSWER[enemyID]['img0']
            box0 = LAST_ANSWER[enemyID]['box0']
            img1 = LAST_ANSWER[enemyID]['img1']
            box1 = LAST_ANSWER[enemyID]['box1']
            del LAST_ANSWER[enemyID]

            if gameOver(usrID, enemyID):
                return flask.jsonify( img0=img0, box0=box0, img1=img1, box1=box1, success=1, end=1 )
            else:
                return flask.jsonify( img0=img0, box0=box0, img1=img1, box1=box1, success=1, end=0 ) 
        else:
            return flask.jsonify( img0="",   box0="",   img1="",   box1="",   success=0, end=0 )

    elif request.method == 'POST':    #- for sendAns() -#

        print 'answer POST' + usrID
        ans = {} 
        ans['img0'] = request.form.get('img0')
        ans['box0'] = request.form.get('box0')
        ans['img1'] = request.form.get('img1')
        ans['box1'] = request.form.get('box1')
        LAST_ANSWER[usrID] = ans
        print ans

        CORRECT_N[usrID] = request.form.get('correctN')
        
        if gameOver(usrID, enemyID): 
            return flask.jsonify( end='1' )
        else:
            return flask.jsonify( end='0')



def gameOver(usrID, enemyID):
    if ( usrID not in CORRECT_N ) or (enemyID not in CORRECT_N):
        print 'no no'
        return False

    print CORRECT_N
    if  ( int(CORRECT_N[usrID]) + int(CORRECT_N[enemyID]) == TOTAL_N ):
        print 'Game Over'
    else:
        print str(CORRECT_N[usrID]) + ':' + str(CORRECT_N[enemyID])

    return ( int(CORRECT_N[usrID]) + int(CORRECT_N[enemyID]) == TOTAL_N )
 


def addUsr(usrID):
    global WAITING, PAIRS, PLAYERS
    if len(WAITING) is 1:
        print 'PAIRED: ' + str(WAITING[0]) + ' & ' + str( usrID )
        PAIRS.append([WAITING[0], usrID])
        enemyID = WAITING[0]
        WAITING = [] 
        return enemyID
    else:
        WAITING = [usrID]
        return -1


def getUsr(req):
    return req.cookies.get('username')


def newUsr():
    fp = None
    if not os.path.exists("participants.txt"):
        fp = open("participants.txt", "w")
        val = 1
    else: 
        fp = open("participants.txt", "r+")
        val = int(fp.readline())+1
        fp.seek(0)
    fp.write(str(val))
    fp.close()
    return val


def getPair(usrID):
    for pair in PAIRS:
        if usrID in pair:
            return pair
    return -1


def getEnemy(usrID):
    pair = getPair(usrID)
    if   pair == -1:
        return -1
    elif pair[0] != usrID:
        return pair[0]
    else:
        return pair[1]


if __name__ == "__main__":
    port = sys.argv[1]
    app.run(debug=True, host="209.129.244.8", port=int(port), threaded=True )


