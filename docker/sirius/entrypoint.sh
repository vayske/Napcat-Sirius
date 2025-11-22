source $NVM_DIR/nvm.sh

cd ${SIRIUS_SRC_DIR}
npm install
cd ${SIRIUS_SRC_DIR}/src
npx tsx index.ts
