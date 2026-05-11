---
summary: "Groq 設定（驗證 + 模型選擇）"
title: "Groq"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

[Groq](https://groq.com) 使用自訂 LPU 硬體，在開源模型（Llama、Gemma、Mistral 等）上提供超快的推論速度。OpenClaw 透過其與 OpenAI 相容的 API 連接到 Groq。

| 屬性   | 值             |
| ------ | -------------- |
| 提供者 | `groq`         |
| 驗證   | `GROQ_API_KEY` |
| API    | OpenAI 相容    |

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

## 內建目錄

Groq 的模型目錄經常變更。執行 `openclaw models list | grep groq` 以查看目前可用的模型，或查看
[console.groq.com/docs/models](https://console.groq.com/docs/models)。

| 模型                        | 備註                     |
| --------------------------- | ------------------------ |
| **Llama 3.3 70B Versatile** | 通用、大語境             |
| **Llama 3.1 8B Instant**    | 快速、輕量               |
| **Gemma 2 9B**              | 緊湊、高效               |
| **Mixtral 8x7B**            | MoE 架構、強大的推理能力 |

<Tip>使用 `openclaw models list --provider groq` 以取得您帳戶上可用模型的最新清單。</Tip>

## 推理模型

OpenClaw 將其共用的 `/think` 層級對應到 Groq 特定模型的 `reasoning_effort` 值。對於 `qwen/qwen3-32b`，停用的思考會發送 `none`，而啟用的思考會發送 `default`。對於 Groq GPT-OSS 推理模型，OpenClaw 會發送 `low`、`medium` 或 `high`；停用的思考會省略 `reasoning_effort`，因為這些模型不支援停用的值。

## 音訊轉錄

Groq 也提供快速的基於 Whisper 的音訊轉錄。當配置為媒體理解提供者時，OpenClaw 使用 Groq 的 `whisper-large-v3-turbo` 模型透過共享的 `tools.media.audio` 介面轉錄語音訊息。

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
    | 共享配置路徑 | `tools.media.audio` |
    | 預設基礎 URL   | `https://api.groq.com/openai/v1` |
    | 預設模型      | `whisper-large-v3-turbo` |
    | API 端點       | 相容 OpenAI 的 `/audio/transcriptions` |
  </Accordion>

  <Accordion title="環境注意事項">
    如果 Gateway 以常駐程式 (launchd/systemd) 執行，請確保 `GROQ_API_KEY` 對該程序可用 (例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`)。

    <Warning>
    僅在您的互動式 shell 中設定的金鑰，對常駐程式管理的 gateway 程序是不可見的。請使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以確保持續可用性。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="配置參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的配置架構，包含提供者和音訊設定。
  </Card>
  <Card title="Groq Console" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Groq 儀表板、API 文件和價格。
  </Card>
  <Card title="Groq 模型列表" href="https://console.groq.com/docs/models" icon="list">
    官方 Groq 模型目錄。
  </Card>
</CardGroup>
