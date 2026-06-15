---
summary: "使用 OpenClaw 的 Xiaomi MiMo 隨用隨付和 Token 方案模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need Xiaomi MiMo auth or Token Plan setup
title: "Xiaomi MiMo"
---

小米 MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 包含一個內建的小米插件，並預設了兩個文本提供商配置：

- `xiaomi` 用於隨用隨付金鑰 (`sk-...`)
- `xiaomi-token-plan` 用於 Token 方案金鑰 (`tp-...`)，並附帶區域端點預設

同一個插件也註冊了 `xiaomi` 語音 (TTS) 提供者。

| 屬性          | 數值                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 提供商 ID     | `xiaomi` (隨用隨付)、`xiaomi-token-plan` (Token 方案)                                                                                              |
| 插件          | 內建、`enabledByDefault: true`                                                                                                                     |
| 驗證環境變數  | `XIAOMI_API_KEY`、`XIAOMI_TOKEN_PLAN_API_KEY`                                                                                                      |
| 上線旗標      | `--auth-choice xiaomi-api-key`、`--auth-choice xiaomi-token-plan-cn`、`--auth-choice xiaomi-token-plan-sgp`、`--auth-choice xiaomi-token-plan-ams` |
| 直接 CLI 旗標 | `--xiaomi-api-key <key>`、`--xiaomi-token-plan-api-key <key>`                                                                                      |
| 合約          | 聊天完成 + `speechProviders`                                                                                                                       |
| API           | OpenAI 相容 (`openai-completions`)                                                                                                                 |
| 基礎 URL      | 隨用隨付：`https://api.xiaomimimo.com/v1`；Token 方案預設：`token-plan-{cn,sgp,ams}...`                                                            |
| 預設模型      | `xiaomi/mimo-v2-flash`、`xiaomi-token-plan/mimo-v2.5-pro`                                                                                          |
| TTS 預設      | `mimo-v2.5-tts`、語音 `mimo_default`；語音設計模型 `mimo-v2.5-tts-voicedesign`                                                                     |

## 開始使用

<Steps>
  <Step title="取得正確的金鑰">
    在 [Xiaomi MiMo console](https://platform.xiaomimimo.com/#/console/api-keys) 中建立隨用隨付金鑰，或是開啟您的 Token 方案訂閱頁面並複製區域 OpenAI 相容基礎 URL 以及對應的 `tp-...` 金鑰。
  </Step>

  <Step title="執行入門">
    隨用隨付：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    Token 方案：

    ```bash
    openclaw onboard --auth-choice xiaomi-token-plan-sgp
    ```

    或者直接傳入金鑰：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    openclaw onboard --auth-choice xiaomi-token-plan-sgp --xiaomi-token-plan-api-key "$XIAOMI_TOKEN_PLAN_API_KEY"
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider xiaomi
    openclaw models list --provider xiaomi-token-plan
    ```
  </Step>
</Steps>

## Pay-as-you-go 目錄

| 模型參考               | 輸入       | 上下文    | 最大輸出 | 推理 | 備註       |
| ---------------------- | ---------- | --------- | -------- | ---- | ---------- |
| `xiaomi/mimo-v2-flash` | 文字       | 262,144   | 8,192    | 否   | 預設模型   |
| `xiaomi/mimo-v2-pro`   | 文字       | 1,048,576 | 32,000   | 是   | 大型上下文 |
| `xiaomi/mimo-v2-omni`  | 文字、圖片 | 262,144   | 32,000   | 是   | 多模態     |

<Tip>預設模型參照為 `xiaomi/mimo-v2-flash`。當設定 `XIAOMI_API_KEY` 或存在驗證設定檔時，提供者會自動注入。</Tip>

## Token 方案目錄

選擇與小米訂閱介面顯示的區域基礎 URL 相符的 Token 方案驗證選項：

- `xiaomi-token-plan-cn` -> `https://token-plan-cn.xiaomimimo.com/v1`
- `xiaomi-token-plan-sgp` -> `https://token-plan-sgp.xiaomimimo.com/v1`
- `xiaomi-token-plan-ams` -> `https://token-plan-ams.xiaomimimo.com/v1`

| 模型參考                          | 輸入       | 上下文    | 最大輸出 | 推理 | 備註     |
| --------------------------------- | ---------- | --------- | -------- | ---- | -------- |
| `xiaomi-token-plan/mimo-v2.5-pro` | 文字       | 1,048,576 | 32,000   | 是   | 預設模型 |
| `xiaomi-token-plan/mimo-v2.5`     | 文字、圖片 | 1,048,576 | 32,000   | 是   | 多模態   |

<Tip>Token Plan 入站流程會驗證金鑰格式，並在將 `tp-...` 金鑰輸入到 pay-as-you-go 路徑，或將 `sk-...` 金鑰輸入到 Token Plan 路徑時發出警告。</Tip>

## 文字轉語音

內建的 `xiaomi` 外掛也會將 Xiaomi MiMo 註冊為 `messages.tts` 的語音提供者。它會呼叫小米的 chat-completions TTS 合約，將文字作為 `assistant` 訊息，並將可選的樣式指引作為 `user` 訊息。

| 屬性   | 值                                       |
| ------ | ---------------------------------------- |
| TTS ID | `xiaomi` (`mimo` 別名)                   |
| 驗證   | `XIAOMI_API_KEY`                         |
| API    | `POST /v1/chat/completions` 搭配 `audio` |
| 預設   | `mimo-v2.5-tts`，語音 `mimo_default`     |
| 輸出   | 預設為 MP3；設定後為 WAV                 |

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "xiaomi_api_key",
          model: "mimo-v2.5-tts",
          speakerVoice: "mimo_default",
          format: "mp3",
          style: "Bright, natural, conversational tone.",
        },
      },
    },
  },
}
```

支援的內建語音包括 `mimo_default`、`default_zh`、`default_en`、
`Mia`、`Chloe`、`Milo` 和 `Dean`。預設語音模型使用 `audio.voice`，因此
OpenClaw 會為 `mimo-v2.5-tts` 和 `mimo-v2-tts` 發送 `speakerVoice`。

Xiaomi 的 voicedesign 模型 `mimo-v2.5-tts-voicedesign` 會根據自然語言樣式提示生成語音，
而不是使用預設的語音 ID。使用所需的語音描述來設定 `style`；OpenClaw 會將其作為 `user`
訊息發送，將口語文字作為 `assistant` 訊息發送，並對此模型省略
`audio.voice`。

```json5
{
  messages: {
    tts: {
      provider: "xiaomi",
      providers: {
        xiaomi: {
          model: "mimo-v2.5-tts-voicedesign",
          format: "wav",
          style: "Warm, natural female voice with clear pronunciation.",
        },
      },
    },
  },
}
```

對於飛書和 Telegram 等語音訊息目標，OpenClaw 會在交付前將小米輸出轉碼為 48kHz Opus 格式並使用 `ffmpeg`。

## 配置範例

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

定價和相容性標誌來自內置插件清單，因此配置範例省略了 `cost` 和 `compat`，以避免與執行時行為不一致。

Token 方案：

```json5
{
  env: { XIAOMI_TOKEN_PLAN_API_KEY: "tp-your-key" },
  agents: { defaults: { model: { primary: "xiaomi-token-plan/mimo-v2.5-pro" } } },
  models: {
    mode: "merge",
    providers: {
      "xiaomi-token-plan": {
        baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_TOKEN_PLAN_API_KEY",
        models: [
          {
            id: "mimo-v2.5-pro",
            name: "Xiaomi MiMo V2.5 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2.5",
            name: "Xiaomi MiMo V2.5",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

定價來自內置清單（Token 方案模型包含分層緩存讀取定價），因此配置範例省略了 `cost`。

<AccordionGroup>
  <Accordion title="自動注入行為">
    當環境中設定了 `XIAOMI_API_KEY` 或存在驗證設定檔時，`xiaomi` 提供者會自動注入。`xiaomi-token-plan` 需要區域基礎 URL，因此支援的路徑是內置的 Token 方案入門選擇或明確的 `models.providers.xiaomi-token-plan` 配置區塊。
  </Accordion>

  <Accordion title="模型詳情">
    - **mimo-v2-flash** — 輕量且快速，適合通用文字任務。不支援推理。
    - **mimo-v2-pro** — 支援推理，具有 1M token 語境視窗，適合長文件工作負載。
    - **mimo-v2-omni** — 支援推理的多模態模型，接受文字和圖像輸入。
    - **mimo-v2.5-pro** — Token 方案預設，採用小米當前的 V2.5 推理堆疊。
    - **mimo-v2.5** — Token 方案多模態 V2.5 路由。

    <Note>
    隨用隨付模型使用 `xiaomi/` 前綴。Token 方案模型使用 `xiaomi-token-plan/` 前綴。
    </Note>

  </Accordion>

  <Accordion title="疑難排解">
    - 如果未顯示模型，請確認相關的金鑰環境變數或驗證設定檔存在且有效。
    - 對於 Token 方案，請確認選擇的上架區域與訂閱頁面的基礎 URL 相符，且金鑰以 `tp-` 開頭。
    - 當 Gateway 以守護程式執行時，請確保該程序可以存取金鑰（例如在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

    <Warning>
    僅在互動式 Shell 中設定的金鑰對由守護程式管理的 Gateway 程序是不可見的。請使用 `~/.openclaw/.env` 或 `env.shellEnv` 設定以確保持續可用性。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供商、模型參照和容錯移轉行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 設定參考。
  </Card>
  <Card title="Xiaomi MiMo 主控台" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Xiaomi MiMo 儀表板和 API 金鑰管理。
  </Card>
</CardGroup>
