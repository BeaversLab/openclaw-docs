---
summary: "OpenClaw 從何處載入環境變數及其優先順序"
read_when:
  - 您需要知道載入了哪些 env vars，以及以何種順序載入
  - 您正在對 Gateway 中遺失的 API 金鑰進行除錯
  - 您正在記錄提供者驗證或部署環境
title: "環境變數"
---

# 環境變數

OpenClaw 會從多個來源提取環境變數。規則是**絕不覆蓋現有值**。

## 優先順序（從高到低）

1. **程序環境**（Gateway 程序目前已從父 shell/daemon 獲得的內容）。
2. **目前工作目錄中的 `.env`**（dotenv 預設；不覆蓋）。
3. 位於 `~/.openclaw/.env` 的 **全域 `.env`**（又名 `$OPENCLAW_STATE_DIR/.env`；不覆蓋）。
4. `~/.openclaw/openclaw.json` 中的 **Config `env` block**（僅在缺失時套用）。
5. **選用的 login-shell 匯入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），僅針對遺失的預期鍵值套用。

如果設定檔完全缺失，則跳過步驟 4；若已啟用，shell 匯入仍會執行。

## Config `env` block

設定內聯 env vars 的兩種等效方式（皆不覆蓋）：

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

## Shell env 匯入

`env.shellEnv` 會執行您的 login shell 並僅匯入**遺失的**預期鍵值：

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

Env var 等效項目：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Config 中的 Env var 替換

您可以使用 `${VAR_NAME}` 語法直接在設定字串值中參照 env vars：

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

詳情請參閱 [Configuration: Env var substitution](/zh-Hant/gateway/configuration#env-var-substitution-in-config)。

## 相關

- [Gateway configuration](/zh-Hant/gateway/configuration)
- [FAQ: env vars and .env loading](/zh-Hant/help/faq#env-vars-and-env-loading)
- [Models overview](/zh-Hant/concepts/models)

import en from "/components/footer/en.mdx";

<en />
