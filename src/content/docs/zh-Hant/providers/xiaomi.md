---
summary: "在 OpenClaw 中使用 Xiaomi MiMo 模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 包含一個內建的 `xiaomi` 外掛程式，針對同一個 `XIAOMI_API_KEY` 註冊了相容 OpenAI 的聊天供應商以及語音 (TTS) 供應商。

| 屬性            | 值                                   |
| --------------- | ------------------------------------ |
| 供應商 ID       | `xiaomi`                             |
| 外掛程式        | 內建，`enabledByDefault: true`       |
| Auth 環境變數   | `XIAOMI_API_KEY`                     |
| Onboarding 標誌 | `--auth-choice xiaomi-api-key`       |
| Direct CLI 標誌 | `--xiaomi-api-key <key>`             |
| 合約            | 聊天完成 + `speechProviders`         |
| API             | 相容 OpenAI (`openai-completions`)   |
| Base URL        | `https://api.xiaomimimo.com/v1`      |
| 預設模型        | `xiaomi/mimo-v2-flash`               |
| TTS 預設        | `mimo-v2.5-tts`，語音 `mimo_default` |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">
    在 [Xiaomi MiMo console](https://platform.xiaomimimo.com/#/console/api-keys) 中建立 API 金鑰。
  </Step>
  <Step title="執行 onboarding">
    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    或直接傳遞金鑰：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider xiaomi
    ```
  </Step>
</Steps>

## 內建目錄

| 模型參照               | 輸入       | Context   | 最大輸出 | 推理 | 備註          |
| ---------------------- | ---------- | --------- | -------- | ---- | ------------- |
| `xiaomi/mimo-v2-flash` | 文字       | 262,144   | 8,192    | 否   | 預設模型      |
| `xiaomi/mimo-v2-pro`   | 文字       | 1,048,576 | 32,000   | 是   | Large context |
| `xiaomi/mimo-v2-omni`  | 文字、影像 | 262,144   | 32,000   | 是   | 多模態        |

<Tip>預設的模型參照為 `xiaomi/mimo-v2-flash`。當設定了 `XIAOMI_API_KEY` 或存在驗證設定檔時，供應商會自動注入。</Tip>

## 文字轉語音

內建的 `xiaomi` 外掛程式也將 Xiaomi MiMo 註冊為 `messages.tts` 的語音供應商。它呼叫 Xiaomi 的聊天完成 TTS 合約，將文字作為 `assistant` 訊息，並將可選的風格指引作為 `user` 訊息。

| 屬性   | 數值                                        |
| ------ | ------------------------------------------- |
| TTS ID | `xiaomi` (`mimo` 別名)                      |
| 認證   | `XIAOMI_API_KEY`                            |
| API    | 使用 `audio` 的 `POST /v1/chat/completions` |
| 預設   | `mimo-v2.5-tts`，語音 `mimo_default`        |
| 輸出   | 預設為 MP3；配置時則為 WAV                  |

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

支援的內建語音包含 `mimo_default`、`default_zh`、`default_en`、
`Mia`、`Chloe`、`Milo` 和 `Dean`。`mimo-v2-tts` 適用於舊版 MiMo
TTS 帳戶；預設使用目前的 MiMo-V2.5 TTS 模型。對於飛書和 Telegram 等語音訊息目標，OpenClaw 會在交付前使用 `ffmpeg` 將小米輸出轉碼為 48kHz
Opus。

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
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Auto-injection behavior">
    當您的環境中設定了 `XIAOMI_API_KEY` 或存在認證設定檔時，`xiaomi` 提供者會自動注入。除非您想要覆寫模型中繼資料或基礎 URL，否則不需要手動配置該提供者。
  </Accordion>

  <Accordion title="Model details">
    - **mimo-v2-flash** — 輕量且快速，非常適合一般文字任務。不支援推理。
    - **mimo-v2-pro** — 支援推理，並具備 1M token 的上下文視窗，適合長文件工作負載。
    - **mimo-v2-omni** — 支援推理的多模態模型，可接受文字和圖片輸入。

    <Note>
    所有模型都使用 `xiaomi/` 前綴 (例如 `xiaomi/mimo-v2-pro`)。
    </Note>

  </Accordion>

  <Accordion title="疑難排解">
    - 如果模型未出現，請確認 `XIAOMI_API_KEY` 已設定且有效。
    - 當 Gateway 以守護程序執行時，請確保該程序可存取金鑰（例如在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

    <Warning>
    僅在互動式 Shell 中設定的金鑰對守護程序管理的 Gateway 程序不可見。請使用 `~/.openclaw/.env` 或 `env.shellEnv` 設定以確保持續可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 組態參考。
  </Card>
  <Card title="Xiaomi MiMo 主控台" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Xiaomi MiMo 儀表板和 API 金鑰管理。
  </Card>
</CardGroup>
