import os, sys

RAW_DIR    = '../result/'
PARSED_DIR = '../result/parsed/'



def getEffect(expType, part):
    effect = {'00':'0', '01':'1', '10':'1', '11':'0', 
              '20':'0', '21':'2', '30':'2', '31':'0'}    
    params = str(expType) + str(part)
    return effect[params]



def isAnswered(line):
    return not(line[1] == '-1')



def isCorrect(line):
    return (line[0] == line[1])



def parse(fpath):

    ansN        = 0
    ansTime     = 0.0
    correctN    = 0
    correctTime = 0.0
    lineN       = 0

    fp = open(fpath, 'r')
    for line in fp.readlines():
        lineN += 1
        if lineN >= 9 or line[0] == 'A' or line[0] == 'C':
            continue  
        data = line.strip().split(',')   

        if isAnswered(data):
            ansN    += 1
            ansTime += float(data[4])
            if isCorrect(data):
                correctN    += 1
                correctTime += float(data[4])
 
    #- avoid divided by 0 exception -#
    if   ansN == 0:   
        return (0, 0.0, 0, 0.0)
    elif correctN == 0:
        return (ansN, ansTime/ansN, 0, 0.0)
    else:
        return (ansN, ansTime/ansN, correctN, correctTime/correctN)



def main():

    files = os.listdir(RAW_DIR) 

    for fnameA in sorted(files):

        if not os.path.isfile(RAW_DIR + fnameA) or 'grpA.txt' not in fnameA:
            continue 
        
        gameID = fnameA.replace('_grpA.txt', '')
        fnameB = gameID + '_grpB.txt'
 
        fpA    = open(RAW_DIR + fnameA, 'r')
        fpB    = open(RAW_DIR + fnameB, 'r')
        outFS  = open(PARSED_DIR + gameID + '.txt', 'w')

        print fnameA
        print fnameB
        print PARSED_DIR + gameID + '.txt'

        fpA.close()
        fpB.close()
        outFS.close()



if __name__ == '__main__':
    main()


