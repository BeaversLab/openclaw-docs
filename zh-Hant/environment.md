---
summary: "OpenClaw 從何處載入環境變數及其優先順序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "環境變數"
---

# 環境變數

OpenClaw 會從多個來源拉取環境變數。規則是**永不覆蓋現有值**。

## 優先順序 (從高到低)

1. **程序環境** (Gateway 程序從父 shell/daemon 繼承的環境)。
2. **目前工作目錄中的 `.env`** (dotenv 預設值；不會覆蓋)。
3. 位於 `~/.openclaw/.env` 的**全域 `.env`** (又稱 `$OPENCLAW_STATE_DIR/.env`；不會覆蓋)。
4. `~/.openclaw/openclaw.json` 中的**設定 `env` 區塊** (僅在缺失時套用)。
5. **選用的 login-shell 匯入** (`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`)，僅針對缺失的預期鍵值套用。

如果設定檔完全缺失，步驟 4 將會被跳過；若已啟用，shell 匯入仍會執行。

## 設定 `env` 區塊

設定內嵌環境變數的兩種等效方式 (均不覆蓋)：

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

## Shell 環境匯入

`env.shellEnv` 會執行您的 login shell 並僅匯入**缺失的**預期鍵值：

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

對應的環境變數：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 設定檔中的環境變數替換

您可以使用 `${VAR_NAME}` 語法在設定檔的字串值中直接引用環境變數：

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

詳見 [Configuration: Env var substitution](/zh-Hant/gateway/configuration#env-var-substitution-in-config)。

## 相關

- [Gateway configuration](/zh-Hant/gateway/configuration)
- [FAQ: env vars and .env loading](/zh-Hant/help/faq#env-vars-and-env-loading)
- [Models overview](/zh-Hant/concepts/models)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
