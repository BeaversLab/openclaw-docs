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

## 優先順序（最高 → 最低）

1. **程序環境**（Gateway 程序從父 shell/daemon 繼承的內容）。
2. **目前工作目錄中的 `.env`**（dotenv 預設值；不覆蓋）。
3. **位於 `~/.openclaw/.env` 的全域 `.env`**（亦稱 `$OPENCLAW_STATE_DIR/.env`；不覆蓋）。
4. **`~/.openclaw/openclaw.json` 中的 Config `env` 區塊**（僅在缺失時套用）。
5. **選用登入 shell 匯入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），僅對缺失的預期鍵套用。

在使用預設狀態目錄的全新 Ubuntu 安裝中，OpenClaw 還會在全域 `.env` 之後將 `~/.config/openclaw/gateway.env` 作為相容性後備。如果這兩個檔案都存在但不一致，OpenClaw 將保留 `~/.openclaw/.env` 並列印警告。

如果設定檔完全缺失，則跳過步驟 4；如果已啟用，Shell 匯入仍會執行。

## 設定 `env` 區塊

設定內聯環境變數的兩種等效方式（均不覆蓋）：

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

`env.shellEnv` 會執行您的登入 Shell 並僅匯入**缺失的**預期金鑰：

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

OpenClaw 也會將上下文標記注入到產生的子進程中：

- `OPENCLAW_SHELL=exec`：為透過 `exec` 工具執行的指令設定。
- `OPENCLAW_SHELL=acp`：為 ACP 執行時後端進程產生設定（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：當 `openclaw acp client` 產生 ACP 橋接進程時為其設定。
- `OPENCLAW_SHELL=tui-local`：為本地 TUI `!` Shell 指令設定。

這些是執行時標記（非必需的使用者設定）。它們可用於 Shell/設定檔邏輯中以套用特定於上下文的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機具有淺色背景時，強制使用淺色 TUI 調色盤。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 調色盤。
- `COLORFGBG`：如果您的終端機匯出了此變數，OpenClaw 將使用背景顏色提示自動選擇 TUI 調色盤。

## 設定檔中的環境變數替換

您可以使用 `${VAR_NAME}` 語法直接在設定檔字串值中引用環境變數：

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

有關完整詳情，請參閱 [Configuration: Env var substitution](/zh-Hant/gateway/configuration-reference#env-var-substitution)。

## Secret 參考與 `${ENV}` 字串

OpenClaw 支援兩種由環境變數驅動的模式：

- 設定值中的 `${VAR}` 字串替換。
- 用於支援 Secret 參考之欄位的 SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)。

兩者都在啟動時從進程環境變數解析。SecretRef 的詳細文件記錄在[機密管理](/zh-Hant/gateway/secrets)中。

## 路徑相關環境變數

| 變數                   | 用途                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆蓋用於所有內部路徑解析的主目錄（`~/.openclaw/`、代理目錄、工作階段、憑證）。在將 OpenClaw 作為專用服務使用者運行時很有用。 |
| `OPENCLAW_STATE_DIR`   | 覆蓋狀態目錄（預設 `~/.openclaw`）。                                                                                         |
| `OPENCLAW_CONFIG_PATH` | 覆蓋配置檔案路徑（預設 `~/.openclaw/openclaw.json`）。                                                                       |

## 日誌記錄

| 變數                 | 用途                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆蓋檔案和控制台的日誌級別（例如 `debug`、`trace`）。優先順序高於配置中的 `logging.level` 和 `logging.consoleLevel`。無效的值將被忽略並顯示警告。 |

### `OPENCLAW_HOME`

設定後，`OPENCLAW_HOME` 會取代系統主目錄（`$HOME` / `os.homedir()`）用於所有內部路徑解析。這為無頭服務帳戶啟用了完整的檔案系統隔離。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**範例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以設定為波浪號路徑（例如 `~/svc`），該路徑會在使用前使用 `$HOME` 進行擴展。

## nvm 使用者：web_fetch TLS 失敗

如果 Node.js 是透過 **nvm**（而非系統套件管理器）安裝的，則內建的 `fetch()` 會使用
nvm 捆綁的 CA 存儲，這可能缺少現代根 CA（用於 Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等）。這會導致 `web_fetch` 在大多數 HTTPS 站點上失敗並顯示 `"fetch failed"`。

在 Linux 上，OpenClaw 會自動偵測 nvm 並在實際的啟動環境中套用修補程式：

- `openclaw gateway install` 將 `NODE_EXTRA_CA_CERTS` 寫入 systemd 服務環境
- `openclaw` CLI 進入點會在 Node 啟動前設定 `NODE_EXTRA_CA_CERTS` 並重新執行自己

**手動修正（適用於舊版本或直接 `node ...` 啟動）：**

在啟動 OpenClaw 之前匯出該變數：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要僅依賴將該變數寫入 `~/.openclaw/.env`；Node 會在程序啟動時
讀取 `NODE_EXTRA_CA_CERTS`。

## 相關

- [Gateway configuration](/zh-Hant/gateway/configuration)
- [FAQ: env vars and .env loading](/zh-Hant/help/faq#env-vars-and-env-loading)
- [Models overview](/zh-Hant/concepts/models)
