---
summary: "Groq 設定（驗證 + 模型選擇 + Whisper 轉錄）"
title: "Groq"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
  - You are configuring Whisper audio transcription on Groq
---

[Groq](https://groq.com) 使用自訂 LPU 硬體，在開放權重模型（Llama、Gemma、Kimi、Qwen、GPT OSS 等）上提供超快推理。OpenClaw 包含一個捆綁的 Groq 插件，可註冊 OpenAI 相容的聊天提供者和音訊媒體理解提供者。

| 屬性             | 值                                   |
| ---------------- | ------------------------------------ |
| 提供者 ID        | `groq`                               |
| 外掛             | 內建，`enabledByDefault: true`       |
| 驗證環境變數     | `GROQ_API_KEY`                       |
| 上架旗標         | `--auth-choice groq-api-key`         |
| API              | 相容於 OpenAI (`openai-completions`) |
| 基礎網址         | `https://api.groq.com/openai/v1`     |
| 音訊轉錄         | `whisper-large-v3-turbo` (預設)      |
| 建議的聊天預設值 | `groq/llama-3.3-70b-versatile`       |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">
    在 [console.groq.com/keys](https://console.groq.com/keys) 建立 API 金鑰。
  </Step>
  <Step title="設定 API 金鑰">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice groq-api-key
```

```bash Env only
export GROQ_API_KEY=gsk_...
```

    </CodeGroup>

  </Step>
  <Step title="Set a default model">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/llama-3.3-70b-versatile" },
        },
      },
    }
    ```
  </Step>
  <Step title="Verify the catalog is reachable">
    ```bash
    openclaw models list --provider groq
    ```
  </Step>
</Steps>

### 設定檔範例

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 內建目錄

OpenClaw 附帶一個由資訊清單支援的 Groq 目錄，其中包含推理與非推理項目。執行 `openclaw models list --provider groq` 以查看您安裝版本的捆綁列，或查看 [console.groq.com/docs/models](https://console.groq.com/docs/models) 以取得 Groq 的權威清單。

| 模型參照                                         | 名稱                    | 推理 | 輸入        | 內容    |
| ------------------------------------------------ | ----------------------- | ---- | ----------- | ------- |
| `groq/llama-3.3-70b-versatile`                   | Llama 3.3 70B Versatile | 否   | 文字        | 131,072 |
| `groq/llama-3.1-8b-instant`                      | Llama 3.1 8B Instant    | 否   | 文字        | 131,072 |
| `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Llama 4 Scout 17B       | 否   | 文字 + 圖片 | 131,072 |
| `groq/openai/gpt-oss-120b`                       | GPT OSS 120B            | yes  | text        | 131,072 |
| `groq/openai/gpt-oss-20b`                        | GPT OSS 20B             | yes  | 文字        | 131,072 |
| `groq/openai/gpt-oss-safeguard-20b`              | Safety GPT OSS 20B      | yes  | 文字        | 131,072 |
| `groq/qwen/qwen3-32b`                            | Qwen3 32B               | yes  | 文字        | 131,072 |
| `groq/groq/compound`                             | Compound                | yes  | 文字        | 131,072 |
| `groq/groq/compound-mini`                        | Compound Mini           | yes  | 文字        | 131,072 |

<Tip>目錄會隨每個 OpenClaw 版本演進。`openclaw models list --provider groq` 會顯示您安裝版本已知的列；請交叉比對 [console.groq.com/docs/models](https://console.groq.com/docs/models) 以查看新增或已棄用的模型。</Tip>

## 推理模型

OpenClaw 將其共用的 `/think` 層級對應至 Groq 特定模型的 `reasoning_effort` 值：

- 對於 `qwen/qwen3-32b`，停用思考會發送 `none`，啟用思考會發送 `default`。
- 對於 Groq GPT OSS 推理模型（`openai/gpt-oss-*`），OpenClaw 會根據 `/think` 層級發送 `low`、`medium` 或 `high`。停用思考時會省略 `reasoning_effort`，因為這些模型不支援停用值。
- DeepSeek R1 Distill、Qwen QwQ 和 Compound 使用 Groq 的原生推理介面；`/think` 控制可見性，但模型總是會進行推理。

參閱 [Thinking modes](/zh-Hant/tools/thinking) 以了解共用的 `/think` 層級，以及 OpenClaw 如何依各供應商進行轉譯。

## 音訊轉錄

Groq 的內建外掛程式也會註冊一個 **音訊媒體理解供應商 (audio media-understanding provider)**，以便透過共用的 `tools.media.audio` 介面轉錄語音訊息。

| 屬性         | 值                                     |
| ------------ | -------------------------------------- |
| 共用設定路徑 | `tools.media.audio`                    |
| 預設基礎 URL | `https://api.groq.com/openai/v1`       |
| 預設模型     | `whisper-large-v3-turbo`               |
| 自動優先順序 | 20                                     |
| API 端點     | 相容 OpenAI 的 `/audio/transcriptions` |

若要將 Groq 設為預設的音訊後端：

```json5
{
  tools: {
    media: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Daemon 的環境變數可用性">
    如果 Gateway 是作為受管理服務 (launchd、systemd、Docker) 執行，`GROQ_API_KEY` 必須對該程序可見 — 而不只是對您的互動式 shell 可見。

    <Warning>
      僅在互動式 shell 中匯出的金鑰，除非該環境也被匯入，否則對 launchd 或 systemd daemon 沒有幫助。在 `~/.openclaw/.env` 中設定金鑰，或透過 `env.shellEnv` 設定，以讓 gateway 程序可以讀取。
    </Warning>

  </Accordion>

  <Accordion title="自訂 Groq 模型 ID">
    OpenClaw 在執行時接受任何 Groq 模型 ID。使用 Groq 顯示的確切 ID，並加上 `groq/` 前綴。內建的目錄涵蓋常見情況；未列在目錄中的 ID 會套用預設的相容 OpenAI 範本。

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/<your-model-id>" },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 相關主題

<CardGroup cols={2}>
  <Card title="模型供應商" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="思考模式" href="/zh-Hant/tools/thinking" icon="brain">
    推理努力層級與供應商政策互動。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    包含提供者和音訊設定的完整組態架構。
  </Card>
  <Card title="Groq Console" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Groq 儀表板、API 文件和定價。
  </Card>
</CardGroup>
