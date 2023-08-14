#!/bin/bash

# open virtual desktop
xvfb-run --listen-tcp --server-num=76 --server-arg="-screen 0 1280x960x24" --auth-file=/tmp/Xauthority node convert.js

code=$?
echo "exit code ${code}"
# xvfb-run startup takes some time, waiting for a while
# sleep 5s

# # forward chrome remote debugging protocol port
# socat tcp-listen:9223,fork tcp:localhost:9222 &

# # start VNC service
# if [[ $START_VNC == "yes" ]]; then
#   x11vnc -display :76 -passwd $VNC_PASSWORD -forever -autoport 5920 &
# fi;

# # get nodejs process pid
# NODE_PID=$(ps -ef|grep node | awk 'NR==1,$NF=" "{print $2}')

# # forward SIGINT/SIGKILL/SIGTERM to nodejs process
# trap 'kill -n 15 ${NODE_PID}' 2 9 15

# # waiting nodejs exit
# while [[ -e /proc/${NODE_PID} ]]; do sleep 1; done

trap 'curl --max-time 2 -s -f -XPOST http://127.0.0.1:15000/quitquitquit' EXIT
# while ! curl -s -f http://127.0.0.1:15020/healthz/ready; do sleep 1; done
# sleep 2
exit $code