import io, sys, os, re


GAMES   = {}
GROUPS  = {}
PLAYERS = {}

WAITING = [ [-1, -1], [-1, -1] ]
JOIN    = []
TOTAL_N = 8
SUPERVISOR = None

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
        return (self.grps[0].getCorrectN() >= (TOTAL_N+1)/2 ) or \
               (self.grps[1].getCorrectN() >= (TOTAL_N+1)/2 )

    def allKnow(self):
        retVal = True
        for grp in self.grps:
            for usr in grp.getUsrs():
                if not( usr.isKnow() ):
                    retVal = False
                    break
        if (retVal):
            ctrlGrp = getGrp( self.ctrlGID )
            ctrlGrp.delAns()
        return retVal

    def usrChangeState(self):
        self.changed += 1
    def allChanged(self):
        return (self.changed == 4) or (self.changed == 0)
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

    def writeRes(self):

        for grp in self.grps:

            fp = open('./result/game' + str(self.gameID) + '_grp' + str(grp.getSide()) + '.txt', 'w') 
            fp.write( str(grp.getGrpID()) + '\n' )
            
            moves = grp.getMoves()
            times = grp.getTimes()
            movers = grp.getMovers()

            for i, move in enumerate(moves):
                fp.write(str(move) + ',')
                turnMovers = movers[i]
                turnTimes = times[i]
                for turnMover in turnMovers:
                    fp.write( str(turnMover) + ',' )
                for turnTime  in turnTimes:
                    fp.write( str(turnTime)  + ',' )
                fp.write('\n')
            fp.close()



class Group():

    def __init__(self, grpID, side, usr0, usr1):
        self.grpID  = grpID
        self.usrs   = [usr0, usr1]
        self.times  = []
        self.moves  = []
        self.movers = []
        self.side   = side
        self.reset()

    def reset(self):
        self.giveup    = False
        self.imgs      = []
        self.boxes     = []
        self.resetTurnTimes()
        self.usrs[0].reset()
        self.usrs[1].reset()

    def getGrpID(self):
        return self.grpID
    def getGameID(self):
        return self.gameID
    def getEnemyGID(self): 
        return self.enemyGID

    def getUsrs(self):
        return self.usrs

    def setGameID(self, gameID):
        self.gameID = gameID
    def setEnemyGID(self, enemyGID):
        self.enemyGID = enemyGID


    def delAns(self):
        self.imgs  = []
        self.boxes = [] 
    def getAns(self):
        return (self.imgs, self.boxes)
    def setAns(self, img, box):
        self.imgs.append(img)
        self.boxes.append(box)

    def resetTurnTimes(self):
        self.turnTimes = [-1, -1, -1]
        self.turnMover = [-1, -1, -1]
    def setTurnTimes(self, time, ind, uid):
        self.turnTimes[ind] = int(time)
        self.turnMover[ind] = int(uid)

    def getTurnTimes(self):
        return self.turnTimes
    def getTurnMover(self):
        return self.turnMover

    def getTimes(self):
        return self.times
    def getMovers(self):
        return self.movers

    def getSide(self):
        return self.side

    def addMove(self, img0, img1):
        
        if img0 == '' and img1 == '':
            self.moves.append(0)  
            return

        if  img0[:-6] == img1[:-6]:
            self.moves.append(1)
        else:                    #- wrong -#
            self.moves.append(-1)

    def getMoves(self):
        return self.moves
    def getMoveN(self):
        return len(self.moves)
    def getCorrectN(self):
        return len( [i for i in self.moves if i == 1] )

    def finTurn(self):
        self.times.append(self.turnTimes)
        self.movers.append(self.turnMover)
        self.resetTurnTimes()

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
    def getSide(self):
        return self.side

    def setGameID(self, gameID):
        self.gameID = gameID
    def setGrpID(self, grpID):
        self.grpID = grpID
    def setSide(self, side):
        self.side = side

    def setKnow(self):
       self.know = True
    def isKnow(self):
       return self.know

    def isEnemyWith(self, another):
        return (self.grpID != another.getGrpID())



def joinUsr(UID):
    global WAITING, JOIN

    usr = getUsr(UID)
    if ( inWaiting(UID) ) and (UID not in JOIN):
        JOIN.append( int(UID) ) 

    if not allJoin():
        return -1;
    else:
        game = createGame(WAITING)
        game.setCtrl( int(usr.getUsrID()), int(usr.getGrpID()) )
        WAITING = [[-1, -1], [-1, -1]]
        JOIN = []
        return game.getGameID()



def createGame(wait):
    global GAMES, SUPERVISOR

    gameID = getIDFromTxt('games')
    grpID0 = getIDFromTxt('groups')
    grpID1 = getIDFromTxt('groups')

    grp0 = createGrp(gameID, grpID0, 'A', getUsr(wait[0][0]), getUsr(wait[0][1]) )
    grp1 = createGrp(gameID, grpID1, 'B', getUsr(wait[1][0]), getUsr(wait[1][1]) )
    grp0.setEnemyGID(grpID1)
    grp1.setEnemyGID(grpID0)

    if (SUPERVISOR is not None):
        SUPERVISOR.setGameID(gameID)

    GAMES[gameID] = Game(gameID, grp0, grp1)
    print 'GAMES: ',
    print  GAMES
    return GAMES[gameID]



def createGrp(gameID, grpID, side, usr0, usr1):
    global GROUPS

    usr0.setGameID(gameID)
    usr1.setGameID(gameID)
    usr0.setGrpID(grpID)
    usr1.setGrpID(grpID)
    usr0.setSide(side)
    usr1.setSide(side)

    GROUPS[grpID] = Group(grpID, side, usr0, usr1)
    print 'GROUPS: ',
    print  GROUPS
    return GROUPS[grpID]



def createUsr():
    global PLAYERS
    usrID = getIDFromTxt('usrs')
    PLAYERS[usrID] = Player(usrID)
    print 'PLAYERS: '
    print  PLAYERS
    return PLAYERS[usrID]



def createSupevisor():
    global PLAYERS, SUPERVISOR, GAMES
    PLAYERS[0] = Player(0)
    SUPERVISOR = PLAYERS[0]
    SUPERVISOR.setGrpID(0)
    SUPERVISOR.setSide('S') 
    return PLAYERS[0]



def getIDFromTxt(kind):
    fp = open(kind+".txt", "r+")
    ID = int(fp.readline())+1
    fp.seek(0)
    fp.write( str(ID) )
    fp.close()
    return ID



def getObjs(usrID):
    usr  = getUsr( usrID )
    grp  = getGrp( usr.getGrpID() )
    game = getGame( usr.getGameID() )
    return (usr, grp, game)



def getUsr(usrID):
    if int(usrID) in PLAYERS:
        return PLAYERS[int(usrID)]
    return -1


def getSupervisor():
    global SUPERVISOR
    return SUPERVISOR



def isSupervisor(usr):
    return ( usr.getUsrID() == 0 )



def getGrp(grpID):
    if int(grpID) in GROUPS:
        return GROUPS[int(grpID)]
    return -1



def getGame(gameID):
    if int(gameID) in GAMES:
        return GAMES[int(gameID)]
    return -1



def delWaiting(usrID):
    global WAITING
    for i in range(0, 2):
        for j in range(0, 2):
            if WAITING[i][j] == usrID:
                WAITING[i][j] = -1
                break



def takeSpace(usrID, side):
    global WAITING


    for i in range(0, 2):
        for j in range(0, 2):
            if i == side:
                if WAITING[i][j] == -1 and WAITING[i][1-j] != int(usrID):
                    WAITING[i][j] = int(usrID)
            if i != side:
                if WAITING[i][j] == int(usrID):
                    WAITING[i][j] = -1
   
    print 'take space'
    print WAITING

    return getSpaceN()



def getSpaceN():
    global WAITING
    space = [0, 0]
    space[0] = len( [ i for i in WAITING[0] if i == -1] )
    space[1] = len( [ i for i in WAITING[1] if i == -1] )
    return space



def inWaiting(usrID):
    return ( len( [ WAITING[i][j] for i in range(0, 2)
                                      for j in range(0, 2)
                                          if WAITING[i][j] == int(usrID) ] ) == 1)


def allJoin():
    count = 0
    for i in range(0,2):
        for j in range(0,2):
            if WAITING[i][j] in JOIN:
                count +=1 
    return (count == 4)



def killGame( usrID ):
    global GAMES, GROUPS

    usr = getUsr( usrID )

    grpID  = usr.getGrpID()
    if getGrp(grpID) != -1:
        del GROUPS[grpID] 

    gameID = usr.getGameID()
    if getGame(gameID) != -1:
        del GAMES[gameID]

    usr.setGrpID(-1)
    usr.setGameID(-1)


