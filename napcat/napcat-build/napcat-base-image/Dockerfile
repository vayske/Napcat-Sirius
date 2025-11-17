FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=US/Pacific

RUN apt-get update && apt-get install -y \
    libnss3 \
    libnotify4 \
    libsecret-1-0 \
    libgbm1 \
    xvfb \
    libasound2 \
    fonts-wqy-zenhei \
    gnutls-bin \
    libglib2.0-dev \
    libdbus-1-3 \
    libgtk-3-0 \
    libxss1 \
    libxtst6 \
    libatspi2.0-0 \
    libx11-xcb1 \
    ffmpeg \
    unzip \
    dbus-user-session \
    curl \
    jq \
    gosu \
    tzdata

RUN echo "${TZ}" > /etc/timezone
RUN ln -sf /usr/share/zoneinfo/${TZ} /etc/localtime
RUN apt autoremove -y && apt clean
RUN rm -rf /var/lib/apt/lists/*  /tmp/*  /var/tmp/*
