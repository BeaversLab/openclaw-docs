---
summary: "OpenClaw 從何處載入環境變數及其優先順序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "環境變數"
---

# 環境變數

OpenClaw 從多個來源獲取環境變數。規則是 **絕不覆蓋現有值**。

## 優先順序（從高到低）

1. **進程環境**（Gateway 進程從父 shell/daemon 繼承的內容）。
2. **目前工作目錄中的 `.env`**（dotenv 預設；不覆蓋）。
3. 位於 `~/.openclaw/.env` 的 **全域 `.env`**（也稱作 `$OPENCLAW_STATE_DIR/.env`；不覆蓋）。
4. `~/.openclaw/openclaw.json` 中的 **Config `env` 區塊**（僅在缺失時應用）。
5. **選用性的 login-shell 匯入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），僅套用於遺漏的預期鍵值。

如果完全缺少組態檔，則會跳過步驟 4；若已啟用，shell 匯入仍會執行。

## 組態 `env` 區塊

設定內聯環境變數的兩種等效方式（兩者均不覆蓋）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

## Shell 環境變數匯入

`env.shellEnv` 會執行您的 login shell 並僅匯入**遺漏**的預期鍵值：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

環境變數等效項：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 組態中的環境變數替換

您可以使用 `${VAR_NAME}` 語法直接在組態字串值中參照環境變數：

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

參閱 [Configuration: Env var substitution](/zh-Hant/gateway/configuration#env-var-substitution-in-config) 以了解完整細節。

## 相關主題

- [Gateway configuration](/zh-Hant/gateway/configuration)
- [常見問題：環境變數與 .env 載入](/zh-Hant/help/faq#env-vars-and-env-loading)
- [模型總覽](/zh-Hant/concepts/models)
