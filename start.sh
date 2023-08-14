docker build . -t convert:$1
docker run -itd --rm -v /root/convert-demo/output:/app/output convert:$1