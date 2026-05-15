---
summary: "在 OpenClaw 中使用 Vydra 影像、影片和語音"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

隨附的 Vydra 外掛程式新增了：

- 透過 `vydra/grok-imagine` 進行影像生成
- 透過 `vydra/veo3` 和 `vydra/kling` 進行影片生成
- 透過 Vydra 的 ElevenLabs 支援 TTS 路由進行語音合成

OpenClaw 針對這三種功能皆使用相同的 `VYDRA_API_KEY`。

| 屬性          | 值                                                                        |
| ------------- | ------------------------------------------------------------------------- |
| 供應商 ID     | `vydra`                                                                   |
| 外掛程式      | 內建，`enabledByDefault: true`                                            |
| 驗證環境變數  | `VYDRA_API_KEY`                                                           |
| 引導標誌      | `--auth-choice vydra-api-key`                                             |
| 直接 CLI 標誌 | `--vydra-api-key <key>`                                                   |
| 合約          | `imageGenerationProviders`、`videoGenerationProviders`、`speechProviders` |
| 基礎 URL      | `https://www.vydra.ai/api/v1`（使用 `www` 主機）                          |

<Warning>使用 `https://www.vydra.ai/api/v1` 作為基礎 URL。Vydra 的頂層主機（`https://vydra.ai/api/v1`）目前重新導向至 `www`。部分 HTTP 用戶端會在該跨主機重新導向時捨棄 `Authorization`，這會將有效的 API 金鑰變成誤導性的驗證失敗。內建的外掛程式直接使用 `www` 基礎 URL 以避免該問題。</Warning>

## 設定

<Steps>
  <Step title="執行互動式引導">
    ```bash
    openclaw onboard --auth-choice vydra-api-key
    ```

    或直接設定環境變數：

    ```bash
    export VYDRA_API_KEY="vydra_live_..."
    ```

  </Step>
  <Step title="選擇預設功能">
    從下列功能（影像、視訊或語音）中選擇一或多項，並套用相符的設定。
  </Step>
</Steps>

## 功能

<AccordionGroup>
  <Accordion title="影像生成">
    預設影像模型：

    - `vydra/grok-imagine`

    將其設定為預設影像供應商：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "vydra/grok-imagine",
          },
        },
      },
    }
    ```

    目前內建的支援僅限文生圖。Vydra 的託管編輯路由需要遠端影像 URL，而 OpenClaw 尚未在內建外掛程式中新增 Vydra 專用的上傳橋接器。

    <Note>
    請參閱 [影像生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、供應商選擇和故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="影片生成">
    已註冊的影片模型：

    - `vydra/veo3` 用於文字生成影片
    - `vydra/kling` 用於圖片生成影片

    將 Vydra 設為預設影片提供者：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "vydra/veo3",
          },
        },
      },
    }
    ```

    註事：

    - `vydra/veo3` 僅內建為文字生成影片。
    - `vydra/kling` 目前需要遠端圖片 URL 參照。本機檔案上傳會在一開始就被拒絕。
    - Vydra 目前的 `kling` HTTP 路由在需要 `image_url` 還是 `video_url` 方面始終不一致；內建的提供者會將同一個遠端圖片 URL 對應到這兩個欄位。
    - 內建的外掛保持保守，不會轉發未記載的風格控制選項，例如長寬比、解析度、浮水印或生成的音訊。

    <Note>
    請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="影片即時測試">
    特定提供者的即時覆蓋範圍：

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    內建的 Vydra 即時檔案現在涵蓋：

    - `vydra/veo3` 文字生成影片
    - `vydra/kling` 使用遠端圖片 URL 的圖片生成影片

    在需要時覆寫遠端圖片 fixture：

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="語音合成">
    將 Vydra 設為語音提供者：

    ```json5
    {
      messages: {
        tts: {
          provider: "vydra",
          providers: {
            vydra: {
              apiKey: "${VYDRA_API_KEY}",
              voiceId: "21m00Tcm4TlvDq8ikWAM",
            },
          },
        },
      },
    }
    ```

    預設值：

    - 模型：`elevenlabs/tts`
    - 語音 ID：`21m00Tcm4TlvDq8ikWAM`

    內建的外掛目前公開一個已知良好的預設語音，並傳回 MP3 音訊檔案。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="提供者目錄" href="/zh-Hant/providers/index" icon="list">
    瀏覽所有可用的提供者。
  </Card>
  <Card title="圖片生成" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖片工具參數與供應商選擇。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與供應商選擇。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設值與模型設定。
  </Card>
</CardGroup>
