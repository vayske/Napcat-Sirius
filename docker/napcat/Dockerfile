FROM ubuntu:22.04 AS napcat-base

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


FROM napcat-base AS napcat

ARG NAPCAT_URL
ARG QQ_URL

RUN useradd --no-log-init -d /app napcat

WORKDIR /app

COPY entrypoint.sh /app/

RUN curl -L ${NAPCAT_URL} > NapCat.Shell.zip

RUN curl -o linuxqq.deb ${QQ_URL} && \
    dpkg -i --force-depends linuxqq.deb && rm linuxqq.deb

RUN chmod +x entrypoint.sh && \
    echo "(async () => {await import('file:///app/napcat/napcat.mjs');})();" > /opt/QQ/resources/app/loadNapCat.js && \
    sed -i 's|"main": "[^"]*"|"main": "./loadNapCat.js"|' /opt/QQ/resources/app/package.json

VOLUME /app/napcat/config
VOLUME /app/.config/QQ

ENTRYPOINT ["bash", "entrypoint.sh"]
