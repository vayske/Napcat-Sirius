# 简介 - Introduction

一个基于[Napcat](https://napneko.github.io/)的bot, 通过docker部署， 基本上所有安装流程都实现了自动化

项目包含三个部分:
  - `napcat`: 提供了聊天接口
  - `sirius`: 该项目的本体，以插件的形式开发各种功能
  - `db`: `redis` 数据库，提供给 `sirius` 用作各种配置的读写
---
This is a chat bot developed on top of [Napcat](https://napneko.github.io/). It can be deployed with docker and most of the deployment steps have been automated

There are three parts of this project:
  - `napcat`: Provides all group chat APIs
  - `sirius`: The main part of this project, new features are developed as plugin
  - `db`: A `redis` database that gets used by `sirius` for reading/writing any configs

# 使用方法 - How to use

## 部署
1. 编辑 `napcat.sh`, 将 `NAPCAT_URL` 和 `QQ_URL` 设为对应部署机器版本的安装包链接(只支持Linux，注意cpu架构)
2. 运行命令 `./napcat.sh start`，脚本将会完成docker镜像的构建和启动
3. 运行成功后会在项目的根目录创建一个 `.data` 目录，所有的配置文件将会保存在里面

## 配置
4. `Napcat WebUI` 的端口为6099，通过浏览器访问（例： `http://localhost:6099`）, `Napcat WebUI` 的登录 `token` 位于 `.data/napcat/webui.json`，可以自行修改
5. 扫码登录
6. - `Napcat WebUI` -> 网络配置 -> 新建 -> Websocket服务器
   - `host=0.0.0.0`
   - `port=3001`
   - `token=napcatToken`，可自行修改，但是要和 `sirius/src/index.ts` 里的 `accessToken` 匹配
   - 开启`上报自身消息`
   - 启用
   - 保存
7. 运行命令 `./napcat.sh docker compose stop sirius` 和 `./napcat.sh docker compose start sirius` 以重启 `sirius`
---
## Deployment
1. Edit `napcat.sh`, modify `NAPCAT_URL` and `QQ_URL` to your platform's url(only support linux, make sure you have the correct version for your cpu)
2. Run `./napcat.sh start`, this will start the buiding process and automatically run afterward
3. A directory named `.data` will be created, all project configs will be stored inside

## Configuration
4. The `Napcat WebUI` port is `6099`, it can be accessed from a browser(Ex. `http://localhost:6099`), The login `token` for `Napcat WebUI` is located in `.data/napcat/webui.json`, you may change its value if you want
5. Scan QR code to login
6. - `Napcat WebUI` -> 网络配置 -> 新建 -> Websocket服务器
   - `host=0.0.0.0`
   - `port=3001`
   - `token=napcatToken`, you may change this but it needs to match the `accessToken` inside `sirius/src/index.ts`
   - Toggle on `上报自身消息`
   - Toggle on `启用`
   - 保存
7. Run `./napcat.sh docker compose stop sirius` and `./napcat.sh docker compose start sirius` to reboot `sirius`

# napcat.sh

这是该项目的主控脚本，用来控制docker compose的构建，启动，暂停，卸载，日志监视
使用例：
- `./napcat.sh build`：构建所有镜像
- `./napcat.sh start`: 启动所有服务
- `./napcat.sh stop`: 暂停所有服务
- `./napcat.sh remove`: 卸载所有服务
- `./napcat.sh logs [napcat|sirius|db]`: 监视对应服务的日志
- `./napcat.sh <commands>`: 可以运行其他指令，主要用来微操docker，因为 `docker compose` 需要这个脚本提供的一些环境变量。使用例：`使用方法 - 配置 - 7.`

---

This is the main control script for the whole project, it can be used for building/starting/stoping/removing docker services, and it can also be used for logging a docker service
Example use case：
- `./napcat.sh build`：build all docker service
- `./napcat.sh start`: start all docker service
- `./napcat.sh stop`: stop all docker service
- `./napcat.sh remove`: remove all docker service
- `./napcat.sh logs [napcat|sirius|db]`: follow a service's log
- `./napcat.sh <commands>`: other commands will also get executed, this is mainly used for doing detailed control on docker service. Since `docker compose` requires some environment variables provided by this script. An example case is `How to use - Configuration - 7.`

