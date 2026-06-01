---
summary: "在 OpenClaw 中設定 PixVerse 視訊生成"
title: "PixVerse"
read_when:
  - You want to use PixVerse video generation in OpenClaw
  - You need the PixVerse API key/env setup
  - You want to make PixVerse the default video provider
---

OpenClaw 提供 `pixverse` 作為託管 PixVerse 視訊生成的官方外部外掛。該外掛針對 `videoGenerationProviders` 合約註冊了 `pixverse` 提供者。

| 屬性          | 值                                                     |
| ------------- | ------------------------------------------------------ |
| 提供者 ID     | `pixverse`                                             |
| 外掛套件      | `@openclaw/pixverse-provider`                          |
| 驗證環境變數  | `PIXVERSE_API_KEY`                                     |
| 入門旗標      | `--auth-choice pixverse-api-key`                       |
| 直接 CLI 旗標 | `--pixverse-api-key <key>`                             |
| API           | PixVerse Platform API v2 (`video_id` 提交加上結果輪詢) |
| 預設模型      | `pixverse/v6`                                          |
| 預設 API 區域 | 國際                                                   |

## 開始使用

<Steps>
  <Step title="安裝外掛">
    ```bash
    openclaw plugins install @openclaw/pixverse-provider
    openclaw gateway restart
    ```
  </Step>
  <Step title="設定 API 金鑰">
    ```bash
    openclaw onboard --auth-choice pixverse-api-key
    ```

    精靈會在將 `region` 和
    `baseUrl` 寫入提供者設定之前，詢問是要使用國際端點
    (`https://app-api.pixverse.ai/openapi/v2`) 還是 CN 端點
    (`https://app-api.pixverseai.cn/openapi/v2`)。

  </Step>
  <Step title="將 PixVerse 設為預設視訊提供者">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "pixverse/v6"
    ```
  </Step>
  <Step title="生成視訊">
    要求代理生成視訊。PixVerse 將會自動被使用。
  </Step>
</Steps>

## 支援的模式和模型

該提供者透過 OpenClaw 的共享視訊工具公開 PixVerse 生成模型。

| 模式         | 模型              | 參考輸入           |
| ------------ | ----------------- | ------------------ |
| 文字生成視訊 | `v6` (預設), `c1` | 無                 |
| 圖片生成視訊 | `v6` (預設), `c1` | 1 張本機或遠端圖片 |

本機圖片參照會在圖生影片請求之前上傳到 PixVerse。遠端圖片 URL 會透過 PixVerse 圖片上傳端點作為 `image_url` 傳遞。

| 選項       | 支援的數值                                                             |
| ---------- | ---------------------------------------------------------------------- |
| 持續時間   | 1-15 秒                                                                |
| 解析度     | `360P`、`540P`、`720P`、`1080P`                                        |
| 長寬比     | 文字生影片的 `16:9`、`4:3`、`1:1`、`3:4`、`9:16`、`2:3`、`3:2`、`21:9` |
| 生成的音訊 | `audio: true`                                                          |

<Note>PixVerse 圖片範本生成尚未透過 `image_generate` 公開。該 API 是由範本 ID 驅動，而 OpenClaw 的共享圖片生成合約目前沒有 PixVerse 專用的類型選項包。</Note>

## 提供者選項

影片提供者接受這些可選的提供者特定金鑰：

| 選項                                 | 類型   | 效果                       |
| ------------------------------------ | ------ | -------------------------- |
| `seed`                               | number | 支援時使用的確定性種子     |
| `negativePrompt` / `negative_prompt` | string | 負面提示詞                 |
| `quality`                            | string | PixVerse 品質，例如 `720p` |
| `motionMode` / `motion_mode`         | string | 圖生影片動態模式           |
| `cameraMovement` / `camera_movement` | string | PixVerse 鏡頭移動預設      |
| `templateId` / `template_id`         | number | 啟用的 PixVerse 範本 ID    |

## 組態

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "pixverse/v6",
      },
    },
  },
}
```

## 進階組態

<AccordionGroup>
  <Accordion title="API region">
    OpenClaw 預設使用國際版 PixVerse API。當您的金鑰屬於特定的 PixVerse 平台區域時，請手動設定 `models.providers.pixverse.region`
    ，或是在設定精靈中使用 `openclaw onboard --auth-choice pixverse-api-key` 來選擇一個：

    | Region value    | PixVerse API base URL                         |
    | --------------- | --------------------------------------------- |
    | `international` | `https://app-api.pixverse.ai/openapi/v2`      |
    | `cn`            | `https://app-api.pixverseai.cn/openapi/v2`    |

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            region: "cn", // "international" or "cn"
            baseUrl: "https://app-api.pixverseai.cn/openapi/v2",
            models: [],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Custom base URL">
    僅在透過受信任的相容 Proxy 路由時才設定 `models.providers.pixverse.baseUrl`。
    `baseUrl` 的優先順序高於 `region`。

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            baseUrl: "https://app-api.pixverse.ai/openapi/v2",
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Task polling">
    PixVerse 會從生成請求中傳回一個 `video_id`。OpenClaw 會輪詢
    `/openapi/v2/video/result/{video_id}` 直到任務成功、失敗
    或逾時為止。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用工具參數、提供者選擇以及非同步行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設設定，包括視訊生成模型。
  </Card>
</CardGroup>
