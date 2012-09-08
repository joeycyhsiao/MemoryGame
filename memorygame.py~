import io, sys, os, re

GAMES   = {}
GROUPS  = {}
PLAYERS = {}

WAITING = []
TOTAL_N = 3

class Game():

    def __init__(self, gameID, grp0, grp1):
        self.gameID = gameID
        self.grps  = [grp0, grp1]
        self.ready = False
        self.order = ''
        self.reset()

    def reset(self):
        self.ctrlUID = -1
        self.ctrlGID = -1
        self.grps[0].reset()
        self.grps[1].reset()
        self.countdown = 0
        self.changed = 0   #- state changed usr -#

    def getCtrl(self):
        return (self.ctrlUID, self.ctrlGID) 
    def getGameID(self):
        return self.gameID
    def getOrder(self):
        return self.order
    def getCountdown(self):
        return self.countdown

    def setCtrl(self, ctrlUID, ctrlGID):
        self.ctrlUID = ctrlUID
        self.ctrlGID = ctrlGID
    def setOrder(self, order):
        self.order = order
        self.ready = True
    def setCountDown(self, countdown):
        self.countdown = countdown

    def isReady(self):
        return self.ready
    def isOver(self):
        print 'IS OVER?'
        print '%d:%d\n' %( self.grps[0].getCorrectN(), self.grps[1].getCorrectN() )
        return ( self.grps[0].getCorrectN() + self.grps[1].getCorrectN() >= TOTAL_N )

    def allKnowAns(self):
        for grp in self.grps:
            for usr in grp.getUsrs():
                if not( usr.knowAns() ):
                    return False
        return True

    def usrChangeState(self):
        self.changed += 1
    def allChanged(self):
        return (self.changed == 4) 
    def getChangedN(self):
        return self.changed

    def getResult(self, grpID):
        grp      = getGrp( grpID )
        enemyGrp = getGrp( grp.getEnemyGID() )

        if   grp.getCorrectN() > enemyGrp.getCorrectN():
            return  1
        elif grp.getCorrectN() < enemyGrp.getCorrectN():
            return -1
        else:
            return  0



class Group():

    def __init__(self, grpID, usr0, usr1):
        self.grpID = grpID
        self.usrs  = [usr0, usr1]
        self.moveN    = 0
        self.correctN = 0
        self.reset()

    def reset(self):
        self.giveup = False
        self.startTimes = []
        self.turnTimes  = []
        self.imgs  = []
        self.boxes = []
        self.usrs[0].reset()
        self.usrs[1].reset()

    def getGrpID(self):
        return self.grpID
    def getGameID(self):
        return self.gameID
    def getEnemyGID(self): 
        return self.enemyGID
    def getCorrectN(self):
        return self.correctN
    def getMoveN(self):
        return self.moveN
    def getStartTime(self):
        return self.startTime
    def getTurnTime(self):
        return self.times
    def getUsrs(self):
        return self.usrs

    def setGameID(self, gameID):
        self.gameID = gameID
    def setEnemyGID(self, enemyGID):
        self.enemyGID = enemyGID
    def setCorrectN(self, correctN):
        self.correctN = correctN
    def setMoveN(self, moveN):
        self.moveN = moveN

    def increaseMoveN(self):
        self.moveN += 1
    def increaseCorrectN(self):
        self.correctN += 1

    def delAns(self):
        self.imgs  = []
        self.boxes = [] 
    def getAns(self):
        return (self.imgs, self.boxes)
    def setAns(self, img, box):
        self.imgs.append(img)
        self.boxes.append(box)

    def addStartTime(self, startTime):
        self.startTimes.append(startTime)
    def addTurnTime(self, turnTime):
        self.turnTimes.append(turnTime)

    def giveUpTurn(self):
        self.giveup = True

    def isGiveUp(self):
        return self.giveup
    def isHalfAns(self):
        return ( len(self.imgs) == 1 and len(self.imgs) == len(self.boxes) )
    def isFullAns(self):
        return ( len(self.imgs) == 2 and len(self.imgs) == len(self.boxes) )



class Player():

    def __init__(self, usrID):
        self.usrID  = usrID
        self.gameID = -1
        self.grpID  = -1
        self.reset()

    def reset(self):
        self.know  = False

    def getUsrID(self):
        return self.usrID
    def getGameID(self):
        return self.gameID
    def getGrpID(self):
        return self.grpID

    def setGameID(self, gameID):
        self.gameID = gameID
    def setGrpID(self, grpID):
        self.grpID = grpID

    def listenAns(self):
       self.know = True
    def knowAns(self):
       return self.know

    def isEnemyWith(self, another):
        return (self.grpID != another.getGrpID())



def addUsr(usr):
    global WAITING
    waitingN = len(WAITING)
    if   waitingN == 3:
        game = createGame(WAITING[0], WAITING[1], WAITING[2], usr)
        game.setCtrl( int(usr.getUsrID()), int(usr.getGrpID()) )
        WAITING  = []
        return game.getGameID()
    elif waitingN <= 2: 
        WAITING.append(usr)
        return -1



def createGame(usr0, usr1, usr2, usr3):
    global GAMES

    #- use known usrIDs as gameID and grpID -#
    gameID = usr0.getUsrID()    
    grpID0 = usr0.getUsrID()
    grpID1 = usr2.getUsrID()

    grp0 = createGrp(gameID, grpID0, usr0, usr1)
    grp1 = createGrp(gameID, grpID1, usr2, usr3)  
    grp0.setEnemyGID(grpID1)
    grp1.setEnemyGID(grpID0)

    GAMES[gameID] = Game(gameID, grp0, grp1)
    print 'GAMES: ',
    print  GAMES
    return GAMES[gameID]



def createGrp(gameID, grpID, usr0, usr1):
    global GROUPS

    usr0.setGameID(gameID)
    usr1.setGameID(gameID)
    usr0.setGrpID(grpID)
    usr1.setGrpID(grpID)

    GROUPS[grpID] = Group(grpID, usr0, usr1)
    print 'GROUPS: ',
    print  GROUPS
    return GROUPS[grpID]



def createUsr():
    global PLAYERS

    fp = None
    if not os.path.exists("participants.txt"):
        fp = open("participants.txt", "w")
        usrID = 1
    else: 
        fp = open("participants.txt", "r+")
        usrID = int(fp.readline())+1
        fp.seek(0)
    fp.write(str(usrID))
    fp.close()

    PLAYERS[usrID] = Player(usrID)
    print 'PLAYERS: ' + str(usrID)
    print  PLAYERS
    return PLAYERS[usrID]



def getObjs(usrID):
    usr  = getUsr( usrID )
    grp  = getGrp( usr.getGrpID() )
    game = getGame( usr.getGameID() )
    return (usr, grp, game)



def getUsr(usrID):
    if int(usrID) in PLAYERS:
        return PLAYERS[int(usrID)]
    return -1



def getGrp(grpID):
    if int(grpID) in GROUPS:
        return GROUPS[int(grpID)]
    return -1



def getGame(gameID):
    if int(gameID) in GAMES:
        return GAMES[int(gameID)]
    return -1



def rmWaiting(usrID):
    global WAITING
    WAITING = [i for i in WAITING if i != usrID ]



