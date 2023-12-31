FROM ubuntu:18.04

# set sources
RUN sed -i s@/archive.ubuntu.com/@/mirrors.aliyun.com/@g /etc/apt/sources.list
RUN apt-get clean
RUN apt-get update -yq

# set time zone (current is Shanghai, China)
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get install -yq tzdata --fix-missing
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN dpkg-reconfigure -f noninteractive tzdata

# install basic environment
# if there is too much installation at one time, there will be a chance of failure
RUN apt-get install -yq git
RUN apt-get install -yq xvfb
RUN apt-get install -yq x11vnc
RUN apt-get install -yq lsof
RUN apt-get install -yq socat
RUN apt-get install -yq curl

# installation dependence
RUN apt-get install -yq wget
RUN apt-get install -yq locales
RUN apt-get install -yq libx11-xcb1
RUN apt-get install -yq libxrandr2
RUN apt-get install -yq libasound2
RUN apt-get install -yq libpangocairo-1.0-0
RUN apt-get install -yq libatk1.0-0
RUN apt-get install -yq libatk-bridge2.0-0
RUN apt-get install -yq libgtk-3-0
RUN apt-get install -yq libnss3
RUN apt-get install -yq libxss1

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get update -yq

# install chrome()
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add
RUN sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
RUN apt-get update
RUN apt-get install -yq google-chrome-stable

# set UTF-8 and Lang (current Lang is zh_CN)
RUN apt-get install -yq ttf-wqy-microhei ttf-wqy-zenhei
RUN locale-gen zh_CN.UTF-8 \
  && dpkg-reconfigure locales
RUN locale-gen zh_CN.UTF-8
ENV LANG zh_CN.UTF-8
ENV LANGUAGE zh_CN:zh
ENV LC_ALL zh_CN.UTF-8


RUN apt-get install -yq nodejs
# RUN apt-get install -yq npm

RUN apt-get install -yq curl
RUN apt-get install -yq ffmpeg

WORKDIR /app
RUN mkdir output
COPY package.json package.json
RUN npm i
COPY . .
RUN chmod +x *.sh
ENTRYPOINT ["/app/entrypoint.sh"]