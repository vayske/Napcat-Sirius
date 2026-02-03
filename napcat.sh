fullpath=$(realpath $0)
filedir=$(dirname $fullpath)
export SIRIUS_DATA_DIR=$filedir/.data
export SIRIUS_SRC_DIR=$filedir/sirius
export NAPCAT_UID=$(id -u)
export NAPCAT_GID=$(id -g)

export NAPCAT_URL="https://github.com/NapNeko/NapCatQQ/releases/download/v4.10.47/NapCat.Shell.zip"
export QQ_URL="https://dldir1.qq.com/qqfile/qq/QQNT/94704804/linuxqq_3.2.23-44343_arm64.deb"

cd ${filedir}/docker

case "$1" in
  "build")
    docker compose build
    ;;
  "start")
    docker compose up -d
    ;;
  "stop")
    docker compose stop
    ;;
  "restart")
    docker compose restart $2
    ;;
  "remove")
    docker compose down
    ;;
  "uninstall")
    docker rmi napcat sirius
    ;;
  "log")
    docker compose logs -f $2
    ;;
  *)
    "$@"
    ;;
esac
