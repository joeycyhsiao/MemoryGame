import os, sys

RAW_DIR    = '../result/exp'
PARSED_DIR = '../result/parsed/'



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

        fp.write(time+':\t\t||')
        if time in timeA:
            fp.write('     ||'+timeA[time]+' ||     ||     ||')
        if time in timeB:
            fp.write('     ||     ||'+timeB[time]+' ||     ||')
 
        if time in timeK:
            ev  = evK[time]
            usr = timeK[time]

            if usr in uidA:
                if ev == '0':
                    fp.write('<'+usr+'||     ||     ||     ||')
                else:
                    fp.write(usr+'>||     ||     ||     ||')

            if usr in uidB:
                if ev == '0':
                    fp.write('     ||     ||     ||'+usr+'>||')
                else:
                    fp.write('     ||     ||     ||<'+usr+'||')
        fp.write('\n')

        




    fp.close()


def getGameData(path, side):
    fp = open(path, 'r')
    grpID  = fp.readline()
    UIDs   = {}
    time   = {}

    totalN   = 0
    correctN = 0
    for line in fp.readlines():

        items = line.strip().split(',')
        totalN += 1
        if (items[0] == '1'):
            correctN += 1

    fp.close()
    return (totalN, correctN)


def parse(gameID, files):

    files = sorted(files) 
    ansA, correctA = getGameData(RAW_DIR+files[0], 'A')
    ansB, correctB = getGameData(RAW_DIR+files[1], 'B')

    corrRateA = float(correctA)/float(ansA)
    corrRateB = float(correctB)/float(ansB)

    print "%d, %d, %f, %d, %d, %f" %(ansA, correctA, corrRateA, ansB, correctB, corrRateB)

    #timeK, evK = getKickData(RAW_DIR+files[2])
 


    #writeRes(gameID, timeA, UID_A, timeB, UID_B, timeK, evK)



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

    RAW_DIR += sys.argv[1] + '/'
    print RAW_DIR
    main()



