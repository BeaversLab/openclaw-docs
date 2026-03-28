---
title: "Google (Gemini)"
summary: "Google Gemini 設定（API 金鑰 + OAuth、圖像生成、媒體理解、網路搜尋）"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Google 外掛程式透過 Google AI Studio 提供 Gemini 模型的存取權，以及圖像生成、媒體理解（圖像/音訊/視訊），以及透過 Gemini Grounding 進行的網路搜尋。

- 供應商： `google`
- 驗證： `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API
- 替代供應商： `google-gemini-cli` (OAuth)

## 快速入門

1. 設定 API 金鑰：

```exec
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

```exec
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice google-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## OAuth (Gemini CLI)

備用提供者 `google-gemini-cli` 使用 PKCE OAuth 而非 API 金鑰。這是一個非官方整合；部分使用者回報帳號受限。使用風險自負。

環境變數：

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

（或 `GEMINI_CLI_*` 變體。）

## 功能

| 功能      | 支援             |
| --------- | ---------------- |
| 聊天補全  | 是               |
| 圖片生成  | 是               |
| 圖片理解  | 是               |
| 音訊轉錄  | 是               |
| 影片理解  | 是               |
| 網路搜尋  | 是               |
| 思考/推理 | 是 (Gemini 3.1+) |

## 環境備註

如果 Gateway 以 daemon (launchd/systemd) 形式執行，請確保 `GEMINI_API_KEY` 對該程序可用（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
