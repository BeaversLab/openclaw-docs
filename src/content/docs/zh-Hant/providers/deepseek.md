---
summary: "DeepSeek 設定（驗證 + 模型選擇）"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) 提供了強大的 AI 模型與相容 OpenAI 的 API。

- 提供商： `deepseek`
- 驗證： `DEEPSEEK_API_KEY`
- API：相容 OpenAI

## 快速開始

設定 API 金鑰（建議：為 Gateway 儲存它）：

```bash
openclaw onboard --auth-choice deepseek-api-key
```

這將會提示您輸入 API 金鑰，並將 `deepseek/deepseek-chat` 設定為預設模型。

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice deepseek-api-key \
  --deepseek-api-key "$DEEPSEEK_API_KEY" \
  --skip-health \
  --accept-risk
```

## 環境變數說明

如果 Gateway 作為守護程序運行，請確保 `DEEPSEEK_API_KEY`
可供該程序使用（例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`）。

## 可用模型

| 模型 ID             | 名稱                     | 類型 | Context |
| ------------------- | ------------------------ | ---- | ------- |
| `deepseek-chat`     | DeepSeek Chat (V3.2)     | 通用 | 128K    |
| `deepseek-reasoner` | DeepSeek Reasoner (V3.2) | 推理 | 128K    |

- **deepseek-chat** 對應於非思考模式的 DeepSeek-V3.2。
- **deepseek-reasoner** 對應於思考模式下具備思維鏈推理能力的 DeepSeek-V3.2。

在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 取得您的 API 金鑰。
