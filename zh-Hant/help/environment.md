---
summary: "OpenClaw 從何處載入環境變數及其優先順序"
read_when:
  - 您需要知道載入了哪些環境變數，以及載入的順序
  - 您正在偵錯閘道中遺失的 API 金鑰
  - 您正在記錄提供者驗證或部署環境
title: "環境變數"
---

# 環境變數

OpenClaw 從多個來源提取環境變數。規則是**永不覆蓋現有值**。

## 優先順序 (最高 → 最低)

1. **程序環境**（閘道程序從父 shell/daemon 繼承的現有環境）。
2. **當前工作目錄中的 `.env`**（dotenv 預設值；不覆蓋）。
3. `~/.openclaw/.env` 處的**全域 `.env`**（又名 `$OPENCLAW_STATE_DIR/.env`；不覆蓋）。
4. `~/.openclaw/openclaw.json` 中的**設定 `env` 區塊**（僅在缺失時套用）。
5. **選用登入 shell 匯入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），僅針對缺失的預期金鑰套用。

如果設定檔完全缺失，將跳過步驟 4；若已啟用，shell 匯入仍會執行。

## 設定 `env` 區塊

設定內聯環境變數的兩種等效方式（皆不會覆蓋）：

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

`env.shellEnv` 會執行您的登入 shell，並僅匯入**缺失的**預期金鑰：

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

OpenClaw 也會將上下文標記注入到衍生的子程序中：

- `OPENCLAW_SHELL=exec`：為透過 `exec` 工具執行的指令設定。
- `OPENCLAW_SHELL=acp`：為 ACP 執行時後端程序衍生程序設定（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：為 `openclaw acp client` 衍生 ACP 橋接程序時設定。
- `OPENCLAW_SHELL=tui-local`：為本機 TUI `!` shell 指令設定。

這些是執行時標記（非必需的使用者設定）。它們可用於 shell/profile 邏輯
以套用特定於上下文的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機為淺色背景時，強制使用淺色 TUI 色調盤。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 色調盤。
- `COLORFGBG`：如果您的終端機匯出了此變數，OpenClaw 將使用背景顏色提示自動挑選 TUI 色調盤。

## 設定檔中的環境變數替換

您可以使用 `${VAR_NAME}` 語法直接在設定檔字串值中參照環境變數：

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

完整詳情請參閱 [Configuration: Env var substitution](/zh-Hant/gateway/configuration#env-var-substitution-in-config)。

## Secret 參照與 `${ENV}` 字串的比較

OpenClaw 支援兩種由環境變數驅動的模式：

- 設定檔值中的 `${VAR}` 字串替換。
- 用於支援 secret 參照之欄位的 SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)。

兩者皆會在啟用時從程式環境變數中解析。SecretRef 的詳情記載於 [Secrets Management](/zh-Hant/gateway/secrets)。

## 路徑相關的環境變數

| 變數               | 用途                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆寫用於所有內部路徑解析的家目錄 (`~/.openclaw/`、代理程式目錄、工作階段、憑證)。當將 OpenClaw 作為專用服務使用者執行時很有用。 |
| `OPENCLAW_STATE_DIR`   | 覆寫狀態目錄 (預設為 `~/.openclaw`)。                                                                                                                            |
| `OPENCLAW_CONFIG_PATH` | 覆寫設定檔路徑 (預設為 `~/.openclaw/openclaw.json`)。                                                                                                             |

## 日誌記錄

| 變數             | 用途                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆寫檔案與主控台的日誌層級 (例如 `debug`、`trace`)。優先順序高於設定檔中的 `logging.level` 和 `logging.consoleLevel`。無效的值將被忽略並顯示警告。 |

### `OPENCLAW_HOME`

設定後，`OPENCLAW_HOME` 將取代系統家目錄 (`$HOME` / `os.homedir()`) 用於所有內部路徑解析。這能為無頭服務帳戶啟用完整的檔案系統隔離。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**範例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` 也可以設定為波浪號路徑（例如 `~/svc`），該路徑會在使用前透過 `$HOME` 進行擴展。

## 相關

- [Gateway 配置](/zh-Hant/gateway/configuration)
- [常見問題：環境變數與 .env 載入](/zh-Hant/help/faq#env-vars-and-env-loading)
- [模型概覽](/zh-Hant/concepts/models)

import en from "/components/footer/en.mdx";

<en />
