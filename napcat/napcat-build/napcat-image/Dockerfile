FROM napcat-base:1.0

ARG QQ_URL=https://dldir1.qq.com/qqfile/qq/QQNT/ec800879/linuxqq_3.2.20-40990_arm64.deb
ARG NAPCAT_URL=https://github.com/NapNeko/NapCatQQ/releases/download/v4.9.70/NapCat.Shell.zip

RUN useradd --no-log-init -d /app napcat

WORKDIR /app

COPY entrypoint.sh /app/

RUN curl -L NAPCAT_URL > NapCat.Shell.zip

RUN curl -o linuxqq.deb ${QQ_URL} && \
    dpkg -i --force-depends linuxqq.deb && rm linuxqq.deb

RUN chmod +x entrypoint.sh && \
    echo "(async () => {await import('file:///app/napcat/napcat.mjs');})();" > /opt/QQ/resources/app/loadNapCat.js && \
    sed -i 's|"main": "[^"]*"|"main": "./loadNapCat.js"|' /opt/QQ/resources/app/package.json

VOLUME /app/napcat/config
VOLUME /app/.config/QQ

ENTRYPOINT ["bash", "entrypoint.sh"]
