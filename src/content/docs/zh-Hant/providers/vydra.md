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

<Warning>
使用 `https://www.vydra.ai/api/v1` 作為基礎 URL。

Vydra 的 apex 主機 (`https://vydra.ai/api/v1`) 目前會重新導向至 `www`。部分 HTTP 用戶端會在該跨主機重新導向時捨棄 `Authorization`，這會導致有效的 API 金鑰變成令人誤解的驗證失敗。隨附的外掛程式會直接使用 `www` 基礎 URL 以避免此情況。

</Warning>

## 設定

<Steps>
  <Step title="執行互動式入門引導">
    ```bash
    openclaw onboard --auth-choice vydra-api-key
    ```

    或直接設定環境變數：

    ```bash
    export VYDRA_API_KEY="vydra_live_..."
    ```

  </Step>
  <Step title="選擇預設功能">
    從下方選擇一或多項功能（影像、影片或語音）並套用相符的設定。
  </Step>
</Steps>

## 功能

<AccordionGroup>
  <Accordion title="影像生成">
    預設影像模型：

    - `vydra/grok-imagine`

    將其設定為預設影像提供者：

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

    目前隨附的支援僅限文字轉影像。Vydra 的託管編輯路由預期遠端影像 URL，而 OpenClaw 尚未在隨附的外掛程式中新增 Vydra 專用的上傳橋接器。

    <Note>
    請參閱 [影像生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="視訊生成">
    已註冊的視訊模型：

    - `vydra/veo3` 用於文字轉視訊
    - `vydra/kling` 用於圖片轉視訊

    將 Vydra 設定為預設視訊提供商：

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

    備註：

    - `vydra/veo3` 僅作為文字轉視訊提供。
    - `vydra/kling` 目前需要遠端圖片 URL 參考。本機檔案上傳會在一開始被拒絕。
    - Vydra 目前的 `kling` HTTP 路由在是否需要 `image_url` 或 `video_url` 方面一直不一致；隨附的提供者會將同一個遠端圖片 URL 對應到這兩個欄位。
    - 隨附的外掛保持保守，不會轉發未記錄的樣式控制項，例如長寬比、解析度、浮水印或生成的音訊。

    <Note>
    參閱[視訊生成](/zh-Hant/tools/video-generation)以了解共用工具參數、提供商選擇和故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="視訊即時測試">
    提供商特定的即時覆蓋範圍：

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    隨附的 Vydra 即時檔案現在涵蓋：

    - `vydra/veo3` 文字轉視訊
    - `vydra/kling` 使用遠端圖片 URL 的圖片轉視訊

    必要時覆寫遠端圖片夾具：

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="語音合成">
    將 Vydra 設定為語音提供商：

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

    隨附的外掛目前公開一個已知的良好預設語音，並傳回 MP3 音訊檔案。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="提供商目錄" href="/zh-Hant/providers/index" icon="list">
    瀏覽所有可用的提供商。
  </Card>
  <Card title="圖片生成" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖片工具參數與提供者選擇。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與提供者選擇。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設值與模型設定。
  </Card>
</CardGroup>
