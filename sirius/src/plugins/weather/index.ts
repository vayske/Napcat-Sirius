import { NCWebsocket, Structs } from "node-napcat-ts";
import axios from "axios";
import schedule from "node-schedule";
import { db } from "../../utils/database.js";
import { parseCommand } from "../../utils/helper.js";
import { logger } from "../../utils/logger.js";
import { listenForSubscription, isSubscribed, getSubscribedGroups } from "../../utils/whitelist.js";

interface CityInfo {
  name: string;
  lat: number;      // 纬度
  lon: number;      // 经度
  country: string;
  timezone: string;
}

const PLUGIN_NAME = "weather";
const API_GEO = "https://geocoding-api.open-meteo.com/v1/search";
const API_FORECAST = "https://api.open-meteo.com/v1/forecast";
const TARGET_HOUR = 0;

function weather(napcat: NCWebsocket) {
  listenForSubscription(napcat, PLUGIN_NAME);
  schedule.scheduleJob("0 11 * * * *", async () => {
    // 传入 PLUGIN_NAME 以便去查找订阅名单
    await runHourlyCheck(napcat);
  });
  napcat.on("message.group", async (context) => {
    // 【权限门禁】如果群没订阅插件，直接忽略
    if (!await isSubscribed(PLUGIN_NAME, context.group_id)) return;

    const { command, arg } = parseCommand(context);
    if (!command) return;

    switch (command) {
      case "/订阅天气":
        await handleAdd(napcat, context.group_id, arg);
        break;
      case "/退订天气":
        await handleRemove(napcat, context.group_id, arg);
        break;
      case "/天气列表":
        await handleList(napcat, context.group_id);
        break;
      case "/天气预报":
        await handleQuery(napcat, context.group_id);
        break;
    }
  });
}

// Hanlders
async function handleAdd(napcat: NCWebsocket, group: number, cityName: string) {
  if (!cityName) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text("请输入城市名字， 例：/订阅天气 东京")]
    });
    return;
  }
  const city = await apiSearchCity(cityName);
  if (!city) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(`找不到城市：${cityName}。请尝试使用英文名`)]
    });
    return;
  }
  const success = await addCity(group, city);
  if (success) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(`已订阅${city.name}天气`)]
    });
  } else {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(`订阅${city.name}天气失败，数据库错误`)]
    });
  }
}

async function handleRemove(napcat: NCWebsocket, group: number, cityName: string) {
  if (!cityName) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text("请输入城市名字， 例：/退订天气 东京")]
    });
    return;
  }
  const success = await removeCity(group, cityName);
  if (success) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(`已退订${cityName}天气`)]
    });
  } else {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(`退订${cityName}天气失败，未找到该城市`)]
    });
  }
}

async function handleList(napcat: NCWebsocket, group: number) {
  const cities = await getSubscribedCities(group);
  if (cities.length === 0) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(`当前未订阅任何城市`)]
    });
    return;
  }
  const listStr = cities.map(c => `- ${c.name} (${c.country})`).join("\n");
  await napcat.send_group_msg({
    group_id: group,
    message: [Structs.text(`已订阅城市：\n${listStr}`)]
  });
}

async function handleQuery(napcat: NCWebsocket, group: number) {
  const cities = await getSubscribedCities(group);
  if (cities.length === 0) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(`请先使用 "/订阅天气 [城市名]"`)]
    });
    return;
  }

  const promises = cities.map(async (city) => {
    const weather = await apiGetWeather(city.lat, city.lon);
    return weather ? { city, weather } : null;
  });

  const results = await Promise.all(promises);

  let msg = "🌍 全球天气播报\n================\n";
  let count = 0;

  for (const item of results) {
    if (!item) continue;
    const { city, weather } = item;

    // index 0 今天， 1 明天
    const daily = weather.daily;
    const today = {
      code: daily.weather_code[0],
      min: daily.temperature_2m_min[0],
      max: daily.temperature_2m_max[0]
    };

    msg += `${city.name}: ${getWmoDesc(today.code)} ${today.min}~${today.max}°C\n`;

    // 如果明天有雨 (Code >= 50)，分析具体时间段
    if (today.code >= 50) {
      // 传入 "0" 代表分析明天的数据 (1是明天)
      const rainPeriods = analyzeRainPeriods(weather.hourly, 0);
      if (rainPeriods) {
        msg += `   ☔ 降水时段: ${rainPeriods}\n`;
      }
    }
    count++;
  }

  if (count === 0) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(`天气服务不可用`)]
    });
  } else {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text(msg.trim())]
    });
  }
}

// weather forecast APIs
async function apiSearchCity(city: string): Promise<CityInfo | null>  {
  try {
    const res: any = await axios.get(API_GEO, {
      params: {
        name: city,
        count: 1,
        language: "en",
        format: "json"
      }
    });

    if (res.data.results && res.data.results.length > 0) {
      const item = res.data.results[0];
      return {
        name: item.name,
        lat: item.latitude,
        lon: item.longitude,
        country: item.country,
        timezone: item.timezone
      };
    }
  } catch (e) {
    logger.error(`[${PLUGIN_NAME}]:\tGeo API Error: ${e}`);
  }
  return null;
}

async function apiGetWeather(lat: number, lon: number) {
  try {
    const res: any = await axios.get(API_FORECAST, {
      params: {
        latitude: lat,
        longitude: lon,
        daily: "weather_code,temperature_2m_max,temperature_2m_min",
        hourly: "weather_code",
        timezone: "auto",
        forecast_days: 2
      }
    });

    if (res.data.daily && res.data.hourly) {
      return {
        daily: res.data.daily,
        hourly: res.data.hourly
      };
    }
  } catch (e) {
    logger.error(`[${PLUGIN_NAME}]:\tForecast API Error: ${e}`);
  }
  return null;
}

function analyzeRainPeriods(hourlyData: any, dayIndex: number): string {
  const codes: number[] = hourlyData.weather_code;
  const times: string[] = hourlyData.time;

  // 每天 24 小时。明天的数据从 index 24 开始，到 47 结束。
  const startIdx = dayIndex * 24;
  const endIdx = startIdx + 24;

  let periods: string[] = [];
  let rainStart: string | null = null;
  let lastRainTime: string | null = null;

  for (let i = startIdx; i < endIdx; i++) {
    const code = codes[i];
    // ISO 时间字符串 "2023-10-27T14:00" -> 截取 "14:00"
    const timeStr = times[i].substring(11, 16);

    // Code >= 50 视为降水 (雨/雪/雾/雷暴)
    const isRaining = code >= 50;

    if (isRaining) {
      if (!rainStart) {
        rainStart = timeStr; // 记录开始时间
      }
      lastRainTime = timeStr; // 更新持续时间
    } else {
      // 雨停了，或者还没开始下
      if (rainStart && lastRainTime) {
        // 如果开始和结束时间一样，说明只下了一个小时
        if (rainStart === lastRainTime) {
          periods.push(rainStart);
        } else {
          periods.push(`${rainStart}-${lastRainTime}`);
        }
        rainStart = null;
        lastRainTime = null;
      }
    }
  }

  if (rainStart && lastRainTime) {
    if (rainStart === lastRainTime) {
      periods.push(rainStart);
    } else {
      periods.push(`${rainStart}-23:59`);
    }
  }

  return periods.join(", ");
}

// DB services
async function addCity(group: number, city: CityInfo) {
  try {
    const key = `${PLUGIN_NAME}:${group}`;
    logger.info(`[${PLUGIN_NAME}]:\t[${group}] 添加城市: ${city.name}`);
    await db.hSet(key, city.name, JSON.stringify(city));
    return true
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\t[${group}] 添加城市失败: ${error}`);
    return false;
  }
}

async function removeCity(group: number, cityName: string): Promise<boolean> {
  try {
    const key = `${PLUGIN_NAME}:${group}`;
    const removedCount = await db.hDel(key, cityName);
    if (removedCount > 0) {
      logger.info(`[${PLUGIN_NAME}]:\t[${group}] 移除城市: ${cityName}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\t[${group}] 移除城市失败: ${error}`);
    return false;
  }
}

async function getSubscribedCities(group: number): Promise<CityInfo[]> {
  try {
    const key = `${PLUGIN_NAME}:${group}`;
    const data = await db.hGetAll(key);
    if (!data) return [];
    return Object.values(data).map(jsonStr => JSON.parse(jsonStr));
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\t[${group}] 获取城市列表失败: ${error}`);
    return [];
  }
}

// other
function getWmoDesc(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "☃️";
  if (code <= 82) return "☔";
  if (code <= 86) return "❄️";
  if (code >= 95) return "⚡";
  return "未知";
}

async function runHourlyCheck(napcat: NCWebsocket) {
  logger.info(`[${PLUGIN_NAME}]:\t执行整点时区检查...`);

  const groups = await getSubscribedGroups(PLUGIN_NAME);

  for (const groupId of groups) {
    const cities = await getSubscribedCities(groupId);
    if (cities.length === 0) continue;

    const alerts: string[] = [];

    const targetCities = cities.filter(city => {
      return isLocalTimeHour(city.timezone, TARGET_HOUR);
    });
    logger.info(`[${PLUGIN_NAME}]:\t群[${groupId}] 有 ${targetCities.length} 个城市进入推送时间`);
    if (targetCities.length === 0) continue;

    const checkPromises = targetCities.map(async (city) => {
      const weather = await apiGetWeather(city.lat, city.lon);
      if (!weather) return;

      // weather.daily.weather_code[0] 代表今天
      const todayCode = weather.daily.weather_code[0];
      const todayMin = weather.daily.temperature_2m_min[0];
      const todayMax = weather.daily.temperature_2m_max[0];

      // 只有当下雨/雪/雷暴时才提醒 (Code >= 50)
      if (todayCode >= 0) {
        let msg = `☔ ${city.name}: ${getWmoDesc(todayCode)} (${todayMin}~${todayMax}°C)`;

        // 分析具体时间段 (传入 0 代表分析明天)
        const periods = analyzeRainPeriods(weather.hourly, 0);
        if (periods) {
          msg += `\n   ⌚ 时段: ${periods}`;
        }
        alerts.push(msg);
      }
    });

    await Promise.all(checkPromises);

    if (alerts.length > 0) {
      const report = `🕛 今日天气提醒\n================\n` + alerts.join("\n");
      await napcat.send_group_msg({
        group_id: groupId,
        message: [Structs.text(report)]
      });
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

function isLocalTimeHour(timezone: string, targetHour: number): boolean {
  try {
    // 使用 JS 原生 Intl API 获取该时区的当前小时
    // hour12: false 确保是 24 小时制 (0-23)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const hourString = formatter.format(new Date()); // 获取当前时间

    // 某些环境可能返回 "24" 表示 "0"，做个取模处理最稳
    const currentHour = parseInt(hourString) % 24;

    return currentHour === targetHour;
  } catch (e) {
    // 如果 timezone 字符串非法 (比如 Open-Meteo 返回了奇怪的时区)，默认不处理
    logger.error(`[${PLUGIN_NAME}]:\t时区解析错误 [${timezone}]: ${e}`);
    return false;
  }
}

export { PLUGIN_NAME, weather as initPlugin };
