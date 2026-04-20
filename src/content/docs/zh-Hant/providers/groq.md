---
title: "Groq"
summary: "Groq 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Groq

[Groq](https://groq.com) 使用自訂 LPU 硬體在開源模型（Llama、Gemma、Mistral 等）上提供超快的推論。OpenClaw 通過其相容 OpenAI 的 API 連接到 Groq。

| 屬性   | 值             |
| ------ | -------------- |
| 供應商 | `groq`         |
| 驗證   | `GROQ_API_KEY` |
| API    | 相容 OpenAI    |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">
    在 [console.groq.com/keys](https://console.groq.com/keys) 建立 API 金鑰。
  </Step>
  <Step title="設定 API 金鑰">
    ```bash
    export GROQ_API_KEY="gsk_..."
    ```
  </Step>
  <Step title="設定預設模型">
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

## 可用模型

Groq 的模型目錄變動頻繁。執行 `openclaw models list | grep groq`
以查看目前可用的模型，或查看
[console.groq.com/docs/models](https://console.groq.com/docs/models)。

| 模型                        | 備註                   |
| --------------------------- | ---------------------- |
| **Llama 3.3 70B Versatile** | 通用，大型上下文       |
| **Llama 3.1 8B Instant**    | 快速，輕量             |
| **Gemma 2 9B**              | 緊湊，高效             |
| **Mixtral 8x7B**            | MoE 架構，強大推理能力 |

<Tip>使用 `openclaw models list --provider groq` 取得您帳戶上可用模型的最新清單。</Tip>

## 音訊轉錄

Groq 也提供快速的基於 Whisper 的音訊轉錄。當配置為媒體理解供應商時，OpenClaw 使用 Groq 的 `whisper-large-v3-turbo`
模型透過共用的 `tools.media.audio`
介面轉錄語音訊息。

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
  <Accordion title="音訊轉錄詳細資訊">
    | 屬性 | 值 |
    |----------|-------|
    | 共用設定路徑 | `tools.media.audio` |
    | 預設基礎 URL   | `https://api.groq.com/openai/v1` |
    | 預設模型      | `whisper-large-v3-turbo` |
    | API 端點       | 相容 OpenAI `/audio/transcriptions` |
  </Accordion>

  <Accordion title="環境備註">
    如果 Gateway 以守護程序（launchd/systemd）形式執行，請確保 `GROQ_API_KEY` 對該程序可用（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

    <Warning>
    僅在您的互動式 shell 中設定的金鑰對守護程序管理的 gateway 程序是不可見的。請使用 `~/.openclaw/.env` 或 `env.shellEnv` 設定以確保持續可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="設定參考" href="/en/gateway/configuration-reference" icon="gear">
    完整的設定架構，包括供應商和音訊設定。
  </Card>
  <Card title="Groq Console" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Groq 儀表板、API 文件和定價。
  </Card>
  <Card title="Groq 模型列表" href="https://console.groq.com/docs/models" icon="list">
    官方 Groq 模型型錄。
  </Card>
</CardGroup>
