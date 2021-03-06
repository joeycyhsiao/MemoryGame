import os, sys

RAW_DIR    = '../result/exp'
PARSED_DIR = '../result/parsed/'



def insertBL(prevTime, time):

    prevSec = int(prevTime/1000)
    sec     = int(time/1000)







def writeRes(gameID, timeA, uidA, timeB, uidB, timeK, evK):
 
    fp = open(PARSED_DIR + 'res' + gameID + '.txt', 'w')
 
    fp.write('Group A:' + uidA.keys()[0] + ',' + uidA.keys()[1] + '\n')
    fp.write('Group B:' + uidB.keys()[0] + ',' + uidB.keys()[1] + '\n')

    times = []
    keysA = [ int(k) for k in timeA.keys() ]
    keysB = [ int(k) for k in timeB.keys() ]
    keysK = [ int(k) for k in timeK.keys() ]
    times.extend(keysA)
    times.extend(keysB)
    times.extend(keysK)

    sortTimes = sorted(times)

    prevTime = 0
    for time in sortTimes:
        if time == 0:
            continue

        time = str(time)
        insertBL(prevTime, int(time))

        fp.write(time+':\t\t|')
        if time in timeA:
            fp.write('     |'+timeA[time]+' |     |     |')
        if time in timeB:
            fp.write('     |     |'+timeB[time]+' |     |')
 
        if time in timeK:
            ev  = evK[time]
            usr = timeK[time]

            if usr in uidA:
                if ev == '0':
                    fp.write('<'+usr+'|     |     |     |')
                else:
                    fp.write(usr+'>|     |     |     |')

            if usr in uidB:
                if ev == '0':
                    fp.write('     |     |     |'+usr+'>|')
                else:
                    fp.write('     |     |     |<'+usr+'|')
        fp.write('\n')

        




    fp.close()


def getGameData(path, side):
    fp = open(path, 'r')
    grpID  = fp.readline()
    UIDs   = {}
    time   = {}

    for line in fp.readlines():
        items = line.strip().split(',')

        ev             = items[0]  #- turn result -#
        if ev == '-1':
            ev = '0'

        time[items[4]] = side+':'+ev+' '        #- turn start time -#
        time[items[5]] = items[2]
        time[items[6]] = items[3]
        UIDs[items[2]] = True
        UIDs[items[3]] = True

    fp.close()
    return (time, UIDs)


def getKickData(path):
    fp = open(path, 'r')
    times  = {}
    UIDs   = {}
    events = {}

    for i in range(0, 6):
        items = fp.readline().strip().split(':')
        if len(items) > 2:
            name  = items[0]
            usrID = items[2]
            UIDs[name] = usrID

    for line in fp.readlines():
        (time, name, ev) = line.strip().split(':')
        times[time]  = UIDs[name]
        events[time] = ev

    fp.close()

    return (times, events)



def parse(gameID, files):

    files = sorted(files) 
    timeA, UID_A = getGameData(RAW_DIR+files[0], 'A')
    timeB, UID_B = getGameData(RAW_DIR+files[1], 'B')
    timeK, evK = getKickData(RAW_DIR+files[2])
  
    writeRes(gameID, timeA, UID_A, timeB, UID_B, timeK, evK)



def main():

    files = os.listdir(RAW_DIR) 
    gameIDs = []

    for fnameA in sorted(files): 
        if not os.path.isfile(RAW_DIR + fnameA) or not 'grpA' in fnameA:
            continue 
        gameID = fnameA.replace('game', '').replace('_grpA.txt', '')
        gameIDs.append(gameID)

    for gameID in gameIDs:
        gameFiles = []

        for fname in files:
            if gameID not in fname or '~' in fname:
                continue
            gameFiles.append(fname)

        if len(gameFiles) == 3:
            parse(gameID, gameFiles)




if __name__ == '__main__':

    print 'Visualize'
    RAW_DIR += sys.argv[1] + '/'

    main()



