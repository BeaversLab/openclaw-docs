---
summary: "Groq 設定（驗證 + 模型選擇 + Whisper 轉錄）"
title: "Groq"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
  - You are configuring Whisper audio transcription on Groq
---

[Groq](https://groq.com) 使用自訂 LPU 硬體，在開放權重模型（Llama、Gemma、Kimi、Qwen、GPT OSS 等）上提供超快速的推論。OpenClaw 包含一個內建的 Groq 外掛，可註冊相容於 OpenAI 的聊天提供者與音訊媒體理解提供者。

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

OpenClaw 隨附一個由清單支援的 Groq 目錄，其中包含推理與非推理項目。執行 `openclaw models list --provider groq` 以查看您安裝版本的內建項目，或查看 [console.groq.com/docs/models](https://console.groq.com/docs/models) 以取得 Groq 的正式清單。

| 模型參照                                             | 名稱                          | 推理 | 輸入        | 內容    |
| ---------------------------------------------------- | ----------------------------- | ---- | ----------- | ------- |
| `groq/llama-3.3-70b-versatile`                       | Llama 3.3 70B Versatile       | 否   | 文字        | 131,072 |
| `groq/llama-3.1-8b-instant`                          | Llama 3.1 8B Instant          | 否   | 文字        | 131,072 |
| `groq/meta-llama/llama-4-maverick-17b-128e-instruct` | Llama 4 Maverick 17B          | 否   | 文字 + 圖片 | 131,072 |
| `groq/meta-llama/llama-4-scout-17b-16e-instruct`     | Llama 4 Scout 17B             | 否   | 文字 + 圖片 | 131,072 |
| `groq/llama3-70b-8192`                               | Llama 3 70B                   | 否   | 文字        | 8,192   |
| `groq/llama3-8b-8192`                                | Llama 3 8B                    | 否   | 文字        | 8,192   |
| `groq/gemma2-9b-it`                                  | Gemma 2 9B                    | 否   | 文字        | 8,192   |
| `groq/mistral-saba-24b`                              | Mistral Saba 24B              | 否   | 文字        | 32,768  |
| `groq/moonshotai/kimi-k2-instruct`                   | Kimi K2 Instruct              | 否   | 文字        | 131,072 |
| `groq/moonshotai/kimi-k2-instruct-0905`              | Kimi K2 Instruct 0905         | no   | text        | 262,144 |
| `groq/openai/gpt-oss-120b`                           | GPT OSS 120B                  | yes  | text        | 131,072 |
| `groq/openai/gpt-oss-20b`                            | GPT OSS 20B                   | yes  | text        | 131,072 |
| `groq/openai/gpt-oss-safeguard-20b`                  | Safety GPT OSS 20B            | yes  | text        | 131,072 |
| `groq/qwen-qwq-32b`                                  | Qwen QwQ 32B                  | yes  | text        | 131,072 |
| `groq/qwen/qwen3-32b`                                | Qwen3 32B                     | yes  | text        | 131,072 |
| `groq/deepseek-r1-distill-llama-70b`                 | DeepSeek R1 Distill Llama 70B | yes  | text        | 131,072 |
| `groq/groq/compound`                                 | Compound                      | yes  | text        | 131,072 |
| `groq/groq/compound-mini`                            | Compound Mini                 | yes  | text        | 131,072 |

<Tip>The catalog evolves with each OpenClaw release. `openclaw models list --provider groq` shows the rows known to your installed version; cross-check with [console.groq.com/docs/models](https://console.groq.com/docs/models) for newly-added or deprecated models.</Tip>

## Reasoning models

OpenClaw maps its shared `/think` levels to Groq's model-specific `reasoning_effort` values:

- For `qwen/qwen3-32b`, disabled thinking sends `none` and enabled thinking sends `default`.
- For Groq GPT OSS reasoning models (`openai/gpt-oss-*`), OpenClaw sends `low`, `medium`, or `high` based on `/think` level. Disabled thinking omits `reasoning_effort` because those models do not support a disabled value.
- DeepSeek R1 Distill, Qwen QwQ, and Compound use Groq's native reasoning surface; `/think` controls visibility but the model always reasons.

See [Thinking modes](/zh-Hant/tools/thinking) for the shared `/think` levels and how OpenClaw translates them per provider.

## Audio transcription

Groq's bundled plugin also registers an **audio media-understanding provider** so voice messages can be transcribed through the shared `tools.media.audio` surface.

| Property           | Value                                 |
| ------------------ | ------------------------------------- |
| Shared config path | `tools.media.audio`                   |
| Default base URL   | `https://api.groq.com/openai/v1`      |
| Default model      | `whisper-large-v3-turbo`              |
| Auto priority      | 20                                    |
| API 端點           | OpenAI 相容的 `/audio/transcriptions` |

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
  <Accordion title="Daemon 的環境可用性">
    如果 Gateway 作為受管服務（launchd、systemd、Docker）運行，`GROQ_API_KEY` 必須對該程序可見——而不僅僅是對您的互動式 shell 可見。

    <Warning>
      僅存在於 `~/.profile` 中的金鑰對 launchd 或 systemd daemon 沒有幫助，除非該環境也被匯入到那裡。請在 `~/.openclaw/.env` 中設定金鑰，或透過 `env.shellEnv` 設定，以使 gateway 程序可以讀取它。
    </Warning>

  </Accordion>

  <Accordion title="自訂 Groq 模型 ID">
    OpenClaw 在執行時接受任何 Groq 模型 ID。請使用 Groq 顯示的確切 ID，並加上 `groq/` 前綴。內建的目錄涵蓋了常見情況；未列入目錄的 ID 會回退到預設的 OpenAI 相容範本。

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

## 相關

<CardGroup cols={2}>
  <Card title="模型提供者" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="思考模式" href="/zh-Hant/tools/thinking" icon="brain">
    推理努力程度與提供者策略的互動。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的組態架構，包括提供者和音訊設定。
  </Card>
  <Card title="Groq Console" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Groq 儀表板、API 文件和價格。
  </Card>
</CardGroup>
