# !/bin/bash
# Curler
# Xtranghero
# VERSION 1.0
# 2018-01-13

# curler per shift 6:30 & 18:30

PATH=$PATH:/c/xampp/mysql/bin
DATE2EXTRACT=`date -d "yesterday" +%Y-%m-%d` 
HOST="localhost"
USER="root"
PASS="2qhls34r"
DB="dbauth"
CHECKSERVER=$(wget --server-response http://localhost:5000/ -O /c/sandbox/cycletime-automailer/public/zlog/reslog.txt 2>&1 | grep -c 'HTTP/1.1 200 OK')
POSTUSER=$(mysql -h$HOST -u $USER -p$PASS $DB -s<<<"SELECT user FROM tbl_cloud_details;")
POSTPASS=$(mysql -h$HOST -u $USER -p$PASS $DB -s<<<"SELECT pass FROM tbl_cloud_details;")



connectionRefused(){ # nodejs reviver
    echo "Initialize node reviver..."
    rm ../temp/curlerIsRunning.txt

    # rinse
    start ./nodereviver.sh

    # and
    sleep 10

    # repeat
    sh ./curler.sh

    exit
}

# if db isn't accessible, start xampp mysql
if [ ! $POSTUSER ]; then
    echo "Initializing XAMPP control panel..."

    start /c/xampp/xampp-control.exe #mysql reviver

    sleep 5

    # gogo
    if [ -e "../temp/curlerIsRunning.txt" ]; then
        echo "curler is already running..."
        sleep 2
        exit
    else
        touch ../temp/curlerIsRunning.txt

        if [ $CHECKSERVER != 1 ]; then
            echo "http://localhost:5000/ is offline"
            rm ../temp/curlerIsRunning.txt
            
            # 
            connectionRefused
                
        else
            echo "server is running..."
            curl -d "user=$POSTUSER&password=$POSTPASS&date2extract=$DATE2EXTRACT&transaction=cycletime" --max-time 300 http://localhost:5000/api/rawct
            
            start ../vba/mailer.xlsm

            rm ../temp/curlerIsRunning.txt
        fi
        
    fi

elif [ $POSTUSER ]; then 

    
    # gogo
    if [ -e "../temp/curlerIsRunning.txt" ]; then
        echo "curler is already running..."
        sleep 2
        exit
    else
        touch ../temp/curlerIsRunning.txt

        if [ $CHECKSERVER != 1 ]; then
            echo "http://localhost:5000/ is offline"
            rm ../temp/curlerIsRunning.txt
            
            # 
            connectionRefused
                
        else
            echo "server is running..."
            curl -d "user=$POSTUSER&password=$POSTPASS&date2extract=$DATE2EXTRACT&transaction=cycletime" --max-time 300 http://localhost:5000/api/rawct
           
            start ../vba/mailer.xlsm
            
            rm ../temp/curlerIsRunning.txt

        fi
        
    fi

fi


$(mysql -u $USER -p$PASS -e 'SHOW PROCESSLIST' | grep dbauth | awk {'print "kill "$1";"'}| mysql -u $USER -p$PASS) # kill all existing connections @ dbauth db
sleep 5
exit