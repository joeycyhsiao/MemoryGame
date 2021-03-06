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
    grpID = fp.readline() 
    turnN = len([ int(line.strip().split(',')[5]) for line in fp.readlines() ])

    return turnN

    '''
    err = 0
    prevM1 = None
    prevM2 = None
    for i, m1 in enumerate(mover1):
        m2 = mover2[i]

        if i == 0:
            prevM1 = m1
            prevM2 = m2
            err += int(m1 == m2)
            continue

        if (prevM1 == '-1' or prevM2 == '-1'):
            pass
        elif prevM1 != m2 or prevM2 != m1:
            err +=1

        prevM1 = m1
        prevM2 = m2
      
    #print str(len(mover1)) + ',',
    #print str(err) + ',',
    #print str(float(err)/len(mover1)),
    '''
    #return (1,0)

    #return (totalN, correctN)


def parse(gameID, files):

    files = sorted(files) 
    turnNA = getGameData(RAW_DIR+files[0], 'A')
    turnNB = getGameData(RAW_DIR+files[1], 'B')

    sType = files[2].replace('.txt', '')[-1]


    print sType, turnNA, turnNB




    #corrRateA = float(correctA)/float(ansA)
    #corrRateB = float(correctB)/float(ansB)

    #print "%d, %d, %f, %d, %d, %f" %(ansA, correctA, corrRateA, ansB, correctB, corrRateB)

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
 
        #for v in diffA1: 
        #    print '%d,' %v,
        #for v in diffB1: 
        #    print '%d,' %v,
        #print '\n'



if __name__ == '__main__':

    print 'Turn N'
    RAW_DIR += sys.argv[1] + '/'

    main()



