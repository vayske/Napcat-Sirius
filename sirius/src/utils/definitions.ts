interface PluginWhiteList {
  [plugin: string]: number[]
}

interface SiriusConfig {
  host: string,
  port: number,
  accessToken: string
  pluginWhiteList: PluginWhiteList
}

export { PluginWhiteList, SiriusConfig };
