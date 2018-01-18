# !/bin/bash
# Revive server
# Xtranghero
# VERSION 1.0
# 2018-01-13

cd /c/sandbox/cycletime-automailer;
echo "reviving node..."
pm2 start app.js --name "dev_cycletime"
done