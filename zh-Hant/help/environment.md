---
summary: "OpenClaw 從何處載入環境變數及其優先順序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "環境變數"
---

# 環境變數

OpenClaw 從多個來源載入環境變數。規則是**絕不覆蓋現有值**。

## 優先順序（由高至低）

1. **程序環境**（Gateway 程序從父 shell/daemon 繼承的既有環境）。
2. **目前工作目錄中的 `.env`**（dotenv 預設值；不覆蓋）。
3. `~/.openclaw/.env` 處的**全域 `.env`**（亦稱 `$OPENCLAW_STATE_DIR/.env`；不覆蓋）。
4. `~/.openclaw/openclaw.json` 中的**設定 `env` 區塊**（僅在缺失時套用）。
5. **選用登入 shell 匯入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），僅針對缺失的預期鍵值套用。

如果設定檔完全缺失，步驟 4 將會跳過；若已啟用，shell 匯入仍會執行。

## 設定 `env` 區塊

設定內聯環境變數的兩種等效方式（兩者皆不覆蓋）：

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

`env.shellEnv` 會執行您的登入 shell，並僅匯入**缺失**的預期鍵值：

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

## 執行時注入的環境變數

OpenClaw 也會將上下文標記注入到產生的子程序中：

- `OPENCLAW_SHELL=exec`：為透過 `exec` 工具執行的指令設定。
- `OPENCLAW_SHELL=acp`：為 ACP 執行時後端程序產生設定（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：當 `openclaw acp client` 產生 ACP 橋接程序時為其設定。
- `OPENCLAW_SHELL=tui-local`：為本機 TUI `!` shell 指令設定。

這些是執行時標記（非使用者必要設定）。可用於 shell/profile 邏輯中
以套用特定上下文的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機背景為淺色時，強制使用淺色 TUI 調色盤。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 調色盤。
- `COLORFGBG`：如果您的終端機匯出了該變數，OpenClaw 會使用背景顏色提示自動選擇 TUI 調色盤。

## 設定中的環境變數替換

您可以使用 `${VAR_NAME}` 語法直接在設定字串值中參照環境變數：

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

有關完整詳情，請參閱[設定：環境變數替換](/zh-Hant/gateway/configuration#env-var-substitution-in-config)。

## 密鑰參照與 `${ENV}` 字串

OpenClaw 支援兩種由環境變數驅動的模式：

- 設定值中的 `${VAR}` 字串替換。
- SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)，用於支援密鑰參照的欄位。

兩者都會在啟用時從進程環境變數中解析。SecretRef 的詳細資訊記錄在[密鑰管理](/zh-Hant/gateway/secrets)中。

## 路徑相關的環境變數

| 變數                   | 用途                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆蓋用於所有內部路徑解析的主目錄 (`~/.openclaw/`、代理程式目錄、工作階段、憑證)。當以專用服務使用者身分執行 OpenClaw 時很有用。 |
| `OPENCLAW_STATE_DIR`   | 覆蓋狀態目錄 (預設為 `~/.openclaw`)。                                                                                           |
| `OPENCLAW_CONFIG_PATH` | 覆蓋設定檔路徑 (預設為 `~/.openclaw/openclaw.json`)。                                                                           |

## 日誌記錄

| 變數                 | 用途                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_LOG_LEVEL` | 覆蓋檔案和控制台的日誌層級 (例如 `debug`、`trace`)。優先順序高於設定中的 `logging.level` 和 `logging.consoleLevel`。無效的值將被忽略並顯示警告。 |

### `OPENCLAW_HOME`

設定後，`OPENCLAW_HOME` 將取代系統主目錄 (`$HOME` / `os.homedir()`) 以進行所有內部路徑解析。這為無頭服務帳戶啟用了完整的檔案系統隔離。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**範例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` 也可以設定為波浪號路徑（例如 `~/svc`），它會在使用前透過 `$HOME` 進行擴展。

## 相關

- [Gateway 配置](/zh-Hant/gateway/configuration)
- [常見問題：環境變數與 .env 載入](/zh-Hant/help/faq#env-vars-and-env-loading)
- [模型概覽](/zh-Hant/concepts/models)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
