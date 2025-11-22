import axios from "axios";
import { SendMessageSegment, Structs } from "node-napcat-ts";
import { logger } from "../../../utils/logger.js";

const PLUGIN_NAME = "linkPreview.twitter";
const API_BASE = "https://api.x.com/1.1";
const GRAPHQL_API_BASE = "https://x.com/i/api/graphql";
const GRAPHQL_ENDPOINT = "2ICDjqPd81tulZcYrtpTuQ/TweetResultByRestId"
const AUTH = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const BASE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?(?:status\/(\d+))?(?:\/hashtag\/[a-zA-Z0-9_]+)?/;
let guestToken = "";
let lastFetch: number;

async function previewTweet(url: string) {
  const preview: SendMessageSegment[] = [];
  const result = url.match(BASE_REGEX);
  if (!result) return preview;
  const tweetId = result[1];
  logger.info(`[${PLUGIN_NAME}] Found tweetId [${tweetId}], fetching api...`);
  const data: any = await fetchData(tweetId);
  if (!data) return preview;
  const tweetResult = data["data"]["tweetResult"]["result"];
  const nickname = tweetResult["core"]["user_results"]["result"]["legacy"]["name"];
  const screenName = tweetResult["core"]["user_results"]["result"]["legacy"]["screen_name"];
  const fulltext = tweetResult["legacy"]["full_text"];
  const media = tweetResult["legacy"]["entities"]["media"];
  preview.push(Structs.text(`${nickname}\n`));
  preview.push(Structs.text(`@${screenName}\n`));
  preview.push(Structs.text(fulltext));
  media.forEach((m: any) => {
    if (m["type"] === "photo") {
      preview.push(Structs.image(m["media_url_https"]))
    }
  });
  return preview;
}

// internal methods
async function fetchData(twid: string) {
  let header = setBaseHeader();
  const query = buildGraphQLQuery(twid);
  header = {
    ...header,
    "x-guest-token": await fetchGuestToken(),
  }
  const response = await axios.get<Object>(
    `${GRAPHQL_API_BASE}/${GRAPHQL_ENDPOINT}`,
    {
      params: query,
      headers: header
    }
  )
  return response.status == 200 ? response.data : null;
}

async function fetchGuestToken() {
  const currentTime = performance.now();
  if (!lastFetch || currentTime - lastFetch > 300000) {
    const response = await axios.post<{ guest_token: string }>(
      `${API_BASE}/guest/activate.json`,
      "",
      {
        headers: setBaseHeader()
      }
    );
    lastFetch = currentTime;
    guestToken = response.status === 200 ? response.data.guest_token : "";
  }
  return guestToken;
}

function setBaseHeader(): Object {
  const bearerToken = AUTH;
  return {
    "Authorization": `Bearer ${bearerToken}`,
  };
}

function buildGraphQLQuery(media_id: string) {
  return {
    "variables": JSON.stringify({
      "tweetId": media_id,
      "withCommunity": false,
      "includePromotedContent": false,
      "withVoice": false,
    }),
    "features": JSON.stringify({
      "creator_subscriptions_tweet_preview_api_enabled": true,
      "tweetypie_unmention_optimization_enabled": true,
      "responsive_web_edit_tweet_api_enabled": true,
      "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
      "view_counts_everywhere_api_enabled": true,
      "longform_notetweets_consumption_enabled": true,
      "responsive_web_twitter_article_tweet_consumption_enabled": false,
      "tweet_awards_web_tipping_enabled": false,
      "freedom_of_speech_not_reach_fetch_enabled": true,
      "standardized_nudges_misinfo": true,
      "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": true,
      "longform_notetweets_rich_text_read_enabled": true,
      "longform_notetweets_inline_media_enabled": true,
      "responsive_web_graphql_exclude_directive_enabled": true,
      "verified_phone_label_enabled": false,
      "responsive_web_media_download_video_enabled": false,
      "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
      "responsive_web_graphql_timeline_navigation_enabled": true,
      "responsive_web_enhance_cards_enabled": false,
    }),
    "fieldToggles": JSON.stringify({
      "withArticleRichContentState": false,
    }),
  }
}

export { previewTweet };
