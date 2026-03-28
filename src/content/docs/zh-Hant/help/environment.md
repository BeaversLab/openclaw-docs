---
summary: "OpenClaw 從何處載入環境變數及其優先順序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "環境變數"
---

# 環境變數

OpenClaw 從多個來源提取環境變數。規則是**永不覆蓋現有值**。

## 優先順序（從高到低）

1. **程序環境**（Gateway 程序從父 shell/daemon 繼承的內容）。
2. **目前工作目錄中的 `.env`**（dotenv 預設；不覆蓋）。
3. 位於 `~/.openclaw/.env` 的**全域 `.env`**（又稱 `$OPENCLAW_STATE_DIR/.env`；不覆蓋）。
4. `~/.openclaw/openclaw.json` 中的**設定 `env` 區塊**（僅在缺失時套用）。
5. **可選登入 shell 匯入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），僅套用於遺失的預期鍵值。

如果設定檔完全遺失，步驟 4 將被跳過；若已啟用，shell 匯入仍會執行。

## 設定檔 `env` 區塊

設定行內環境變數的兩種等效方式（皆不會覆蓋現有值）：

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

`env.shellEnv` 會執行您的登入 shell 並僅匯入**遺失**的預期鍵值：

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

等效的環境變數：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 執行時注入的環境變數

OpenClaw 也會將上下文標記注入到衍生的子行程中：

- `OPENCLAW_SHELL=exec`：為透過 `exec` 工具執行的指令設定。
- `OPENCLAW_SHELL=acp`：為 ACP 執行時後端行程衍生設定（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：當 `openclaw acp client` 產生 ACP bridge 處理程序時設定。
- `OPENCLAW_SHELL=tui-local`：為本機 TUI `!` shell 指令設定。

這些是執行時期標記（非必要的使用者設定）。它們可用於 shell/profile 邏輯中
以套用特定內容的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機具有淺色背景時，強制使用淺色 TUI 色盤。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 色盤。
- `COLORFGBG`：如果您的終端機匯出此變數，OpenClaw 將使用背景色彩提示自動選擇 TUI 色盤。

## 設定中的環境變數替換

您可以使用 `${VAR_NAME}` 語法在設定字串值中直接引用環境變數：

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

請參閱 [Configuration: Env var substitution](/zh-Hant/gateway/configuration-reference#env-var-substitution) 以取得完整詳細資訊。

## Secret refs vs `${ENV}` strings

OpenClaw 支援兩種環境驅動的模式：

- 設定值中的 `${VAR}` 字串替換。
- SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)，用於支援秘密參照的欄位。

兩者都在啟動時從程序環境變數解析。SecretRef 的細節記錄在 [Secrets Management](/zh-Hant/gateway/secrets) 中。

## Path-related env vars

| 變數                   | 用途                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆寫用於所有內部路徑解析的主目錄 (`~/.openclaw/`、代理目錄、工作階段、憑證)。當將 OpenClaw 作為專用服務使用者執行時很有用。 |
| `OPENCLAW_STATE_DIR`   | 覆寫狀態目錄 (預設 `~/.openclaw`)。                                                                                         |
| `OPENCLAW_CONFIG_PATH` | 覆寫設定檔路徑（預設值為 `~/.openclaw/openclaw.json`）。                                                                    |

## 日誌記錄

| 變數                 | 用途                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆寫檔案和控制台的日誌級別（例如 `debug`、`trace`）。優先順序高於設定中的 `logging.level` 和 `logging.consoleLevel`。無效值會被忽略並顯示警告。 |

### `OPENCLAW_HOME`

設定後，`OPENCLAW_HOME` 會取代系統主目錄（`$HOME` / `os.homedir()`）用於所有內部路徑解析。這能為無頭服務帳戶提供完整的檔案系統隔離。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**範例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` 也可以設定為波浪號路徑（例如 `~/svc`），該路徑會在使用前透過 `$HOME` 展開。

## 相關

- [Gateway configuration](/zh-Hant/gateway/configuration)
- [FAQ: env vars and .env loading](/zh-Hant/help/faq#env-vars-and-env-loading)
- [Models overview](/zh-Hant/concepts/models)
