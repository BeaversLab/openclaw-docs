---
title: "Google (Gemini)"
summary: "Google Gemini 設定（API 金鑰 + OAuth、圖片生成、媒體理解、網路搜尋）"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Google 外掛程式透過 Google AI Studio 提供 Gemini 模型的存取權限，外加圖片生成、媒體理解（圖片/音訊/影片），以及透過 Gemini Grounding 進行的網路搜尋功能。

- 提供者：`google`
- 驗證：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API
- 替代提供者：`google-gemini-cli` (OAuth)

## 快速開始

1. 設定 API 金鑰：

```bash
openclaw onboard --auth-choice google-api-key
```

2. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "google/gemini-3.1-pro-preview" },
    },
  },
}
```

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice google-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## OAuth (Gemini CLI)

替代提供者 `google-gemini-cli` 使用 PKCE OAuth 而非 API 金鑰。這是一個非官方整合功能；部分使用者回報帳號受到限制。使用風險自負。

環境變數：

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

(或是 `GEMINI_CLI_*` 變體。)

## 功能

| 功能                 | 支援             |
| -------------------- | ---------------- |
| 聊天完成             | 是               |
| 圖片生成             | 是               |
| 圖片理解             | 是               |
| 音訊轉錄             | 是               |
| 影片理解             | 是               |
| 網路搜尋 (Grounding) | 是               |
| 思考/推理            | 是 (Gemini 3.1+) |

## 環境注意事項

如果 Gateway 以守護程序 (launchd/systemd) 執行，請確保 `GEMINI_API_KEY` 可供該程序存取（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
