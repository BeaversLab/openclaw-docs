---
summary: "在 OpenClaw 中使用 Vydra 影像、影片和語音"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

# Vydra

內建的 Vydra 外掛程式新增了：

- 透過 `vydra/grok-imagine` 進行影像生成
- 透過 `vydra/veo3` 和 `vydra/kling` 進行影片生成
- 透過 Vydra 的 ElevenLabs 支援 TTS 路由進行語音合成

OpenClaw 對這三種功能都使用相同的 `VYDRA_API_KEY`。

<Warning>
使用 `https://www.vydra.ai/api/v1` 作為基礎 URL。

Vydra 的 apex 主機 (`https://vydra.ai/api/v1`) 目前會重新導向至 `www`。某些 HTTP 用戶端在該跨主機重新導向過程中會捨棄 `Authorization`，這會將有效的 API 金鑰變成誤導性的驗證失敗。隨附的外掛程式直接使用 `www` 基礎 URL 以避免此情況。

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
    從下方功能（影像、影片或語音）中選擇一或多項，並套用相應的設定。
  </Step>
</Steps>

## 功能

<AccordionGroup>
  <Accordion title="影像生成">
    預設影像模型：

    - `vydra/grok-imagine`

    將其設為預設影像提供者：

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

    目前隨附的支援僅限文生圖。Vydra 的託管編輯路由需要遠端影像 URL，而 OpenClaw 尚未在隨附的外掛程式中新增 Vydra 專用的上傳橋接器。

    <Note>
    參閱 [影像生成](/en/tools/image-generation) 以了解共享工具參數、提供者選擇和容錯移轉行為。
    </Note>

  </Accordion>

  <Accordion title="視訊生成">
    已註冊的視訊模型：

    - `vydra/veo3` 用於文字生成視訊
    - `vydra/kling` 用於圖片生成視訊

    將 Vydra 設定為預設的視訊提供者：

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

    - `vydra/veo3` 僅作為文字生成視訊模型內建。
    - `vydra/kling` 目前需要遠端圖片 URL 參照。本機檔案上傳會一開始就被拒絕。
    - Vydra 目前的 `kling` HTTP 路由在要求 `image_url` 還是 `video_url` 方面並不一致；內建的提供者會將相同的遠端圖片 URL 映射到這兩個欄位。
    - 內建的外掛保持保守態度，不會轉發未記錄的樣式控制參數，例如長寬比、解析度、浮水印或生成的音訊。

    <Note>
    參閱 [視訊生成](/en/tools/video-generation) 以了解共用工具參數、提供者選擇和失效轉移行為。
    </Note>

  </Accordion>

  <Accordion title="視訊即時測試">
    特定提供者的即時覆蓋範圍：

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    內建的 Vydra 即時檔案目前涵蓋：

    - `vydra/veo3` 文字生成視訊
    - `vydra/kling` 使用遠端圖片 URL 的圖片生成視訊

    必要時覆寫遠端圖片夾具：

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="語音合成">
    將 Vydra 設定為語音提供者：

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

    內建的外掛目前公開一個已知可用的預設語音，並傳回 MP3 音訊檔案。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="提供者目錄" href="/en/providers/index" icon="list">
    瀏覽所有可用的提供者。
  </Card>
  <Card title="圖片生成" href="/en/tools/image-generation" icon="image">
    共用的圖片工具參數與提供者選擇。
  </Card>
  <Card title="影片生成" href="/en/tools/video-generation" icon="video">
    共用的影片工具參數與提供者選擇。
  </Card>
  <Card title="設定參考" href="/en/gateway/configuration-reference#agent-defaults" icon="gear">
    Agent 預設值與模型設定。
  </Card>
</CardGroup>
