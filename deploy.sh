#!/usr/bin/expect -f
set timeout 30
spawn ssh -o StrictHostKeyChecking=no root@139.180.131.21
expect "password:"
send "6Yp!5##Cd58s?inZ\r"
expect "# "
send "cd /var/www/pricing-tool && git pull && echo 'DEPLOY_OK'\r"
expect "DEPLOY_OK"
expect "# "
send "exit\r"
expect eof
