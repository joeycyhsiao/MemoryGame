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
    start = [ int(line.strip().split(',')[4]) for line in fp.readlines() ]

    fp.seek(0)
    grpID = fp.readline() 
    time1 = [ int(line.strip().split(',')[5]) for line in fp.readlines() ]
    


    fp.seek(0)
    grpID = fp.readline() 
    time2 = [ int(line.strip().split(',')[6]) for line in fp.readlines() ]

    diff1 = [ time - start[i] if time-start[i] > 0 else 30000 for i, time in enumerate(time1) ]
    diff2 = [ time - start[i] if time-start[i] > 0 else 30000 for i, time in enumerate(time2) ]


    for i, time1_i in enumerate(time1):
        if time1[i] > time2[i]:    #- wrong time order, due to sync of server -#
            tmp      = time2[i]
            time2[i] = time1[i]
            time1[i] = tmp 


    fp.close()
    return (diff1, diff2)



def parse(gameID, files):

    files = sorted(files) 
    diffA1, diffA2 = getGameData(RAW_DIR+files[0], 'A')
    diffB1, diffB2 = getGameData(RAW_DIR+files[1], 'B')

    sType = files[2].replace('.txt', '')[-1]
    print sType

    return (diffA1, diffB1, diffA2, diffB2)





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
            (diffA1, diffB1, diffA2, diffB2) = parse(gameID, gameFiles)
 
            for v in diffA1: 
                print '%d,' %v,
            for v in diffB1: 
                print '%d,' %v,
            print '\n'
    
            for v in diffA2: 
                print '%d,' %v,
            for v in diffB2: 
                print '%d,' %v,
            print '\n'
    
    

if __name__ == '__main__':
    print 'Time'
    RAW_DIR += sys.argv[1] + '/'
    main()



