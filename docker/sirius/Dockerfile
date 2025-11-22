FROM ubuntu:22.04

ARG NODE_VERSION=24
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=US/Pacific
ENV SIRIUS_HOME=/app
ENV SIRIUS_SRC_DIR=/app/sirius


RUN apt update && apt install curl -y

# install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION"

# install sirius
WORKDIR ${SIRIUS_HOME}

COPY entrypoint.sh .

RUN chmod +x entrypoint.sh
RUN mkdir -p ${SIRIUS_SRC_DIR}

VOLUME ${SIRIUS_SRC_DIR}

ENTRYPOINT ["bash", "entrypoint.sh"]
