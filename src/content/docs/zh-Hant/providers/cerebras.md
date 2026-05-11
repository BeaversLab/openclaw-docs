---
summary: "Cerebras 設定（驗證 + 模型選擇）"
title: "Cerebras"
read_when:
  - You want to use Cerebras with OpenClaw
  - You need the Cerebras API key env var or CLI auth choice
---

[Cerebras](https://www.cerebras.ai) 提供高速的 OpenAI 相容推論。

| 屬性     | 值                           |
| -------- | ---------------------------- |
| 提供者   | `cerebras`                   |
| 驗證     | `CEREBRAS_API_KEY`           |
| API      | OpenAI 相容                  |
| 基底 URL | `https://api.cerebras.ai/v1` |

## 快速開始

<Steps>
  <Step title="取得 API 金鑰">在 [Cerebras Cloud Console](https://cloud.cerebras.ai) 中建立 API 金鑰。</Step>
  <Step title="執行引導程序">```bash openclaw onboard --auth-choice cerebras-api-key ```</Step>
  <Step title="驗證模型是否可用">```bash openclaw models list --provider cerebras ```</Step>
</Steps>

### 非互動式設定

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## 內建目錄

OpenClaw 針對公開的 OpenAI 相容端點提供了靜態的 Cerebras 目錄：

| 模型參考                                  | 名稱                 | 備註                   |
| ----------------------------------------- | -------------------- | ---------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | 預設模型；預覽推理模型 |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | 生產推理模型           |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | 預覽非推理模型         |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | 生產速度優先模型       |

<Warning>Cerebras 將 `zai-glm-4.7` 和 `qwen-3-235b-a22b-instruct-2507` 標記為預覽模型，且 `llama3.1-8b` / `qwen-3-235b-a22b-instruct-2507` 已記錄將於 2026 年 5 月 27 日淘汰。在依賴它們進行生產環境之前，請查看 Cerebras 的 supported-models 頁面。</Warning>

## 手動設定

隨附的外掛通常意味著您只需要 API 金鑰。當您想要覆寫模型元資料時，請使用明確的
`models.providers.cerebras` 設定：

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "cerebras/zai-glm-4.7" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "Z.ai GLM 4.7" },
          { id: "gpt-oss-120b", name: "GPT OSS 120B" },
        ],
      },
    },
  },
}
```

<Note>如果 Gateway 作為守護程序運行，請確保 `CEREBRAS_API_KEY` 可用於該程序，例如在 `~/.openclaw/.env` 中或透過 `env.shellEnv`。</Note>
