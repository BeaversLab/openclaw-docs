---
summary: "DeepSeek 設定（驗證 + 模型選擇）"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) 提供具有 OpenAI 相容 API 的強大 AI 模型。

- 提供商： `deepseek`
- 驗證： `DEEPSEEK_API_KEY`
- API：相容 OpenAI
- Base URL: `https://api.deepseek.com`

## 快速入門

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

## 環境注意事項

如果 Gateway 以 daemon (launchd/systemd) 執行，請確保 `DEEPSEEK_API_KEY`
對該程序可用（例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`）。

## 內建目錄

| 模型參考                     | 名稱              | 輸入 | 內容    | 最大輸出 | 備註                                   |
| ---------------------------- | ----------------- | ---- | ------- | -------- | -------------------------------------- |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | 文字 | 131,072 | 8,192    | 預設模型；DeepSeek V3.2 非思維層級介面 |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | 文字 | 131,072 | 65,536   | 啟用推理的 V3.2 介面                   |

這兩個打包的模型目前在來源中都宣稱支援串流使用相容性。

在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 取得您的 API 金鑰。
