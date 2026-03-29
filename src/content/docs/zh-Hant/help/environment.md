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

如果完全缺少設定檔，則跳過步驟 4；若已啟用，shell 匯入仍會執行。

## Config `env` 區塊

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

`env.shellEnv` 會執行您的登入 shell 並僅匯入**缺失的**預期鍵：

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

對等的環境變數：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 執行時注入的環境變數

OpenClaw 也會將內容標記注入到產生的子程序中：

- `OPENCLAW_SHELL=exec`：為透過 `exec` 工具執行的指令設定。
- `OPENCLAW_SHELL=acp`：為 ACP 執行時後端程序產生設定（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：當 `openclaw acp client` 產生 ACP 橋接程序時為其設定。
- `OPENCLAW_SHELL=tui-local`：為本機 TUI `!` shell 指令設定。

這些是執行時標記（非必填的使用者設定）。它們可用於 shell/profile 邏輯中
以套用特定於內容的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機背景為淺色時，強制使用淺色 TUI 調色盤。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 調色盤。
- `COLORFGBG`：如果您的終端機匯出了它，OpenClaw 會使用背景色提示來自動選擇 TUI 調色盤。

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

有關完整詳情，請參閱 [Configuration: Env var substitution](/en/gateway/configuration-reference#env-var-substitution)。

## Secret 參照與 `${ENV}` 字串

OpenClaw 支援兩種由環境變數驅動的模式：

- 設定值中的 `${VAR}` 字串替換。
- 用於支援秘密參照之欄位的 SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)。

兩者都會在啟用時從程序環境變數中解析。SecretRef 的詳細資料記載於 [Secrets Management](/en/gateway/secrets)。

## 路徑相關環境變數

| 變數                   | 用途                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆寫用於所有內部路徑解析的 home 目錄 (`~/.openclaw/`、agent 目錄、sessions、憑證)。當將 OpenClaw 作為專用服務使用者執行時很有用。 |
| `OPENCLAW_STATE_DIR`   | 覆寫狀態目錄 (預設 `~/.openclaw`)。                                                                                               |
| `OPENCLAW_CONFIG_PATH` | 覆寫設定檔路徑 (預設 `~/.openclaw/openclaw.json`)。                                                                               |

## 日誌記錄

| 變數                 | 用途                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆寫檔案和控制台的日誌層級 (例如 `debug`、`trace`)。優先順序高於設定中的 `logging.level` 和 `logging.consoleLevel`。無效值將被忽略並顯示警告。 |

### `OPENCLAW_HOME`

設定後，`OPENCLAW_HOME` 會取代系統 home 目錄 (`$HOME` / `os.homedir()`) 用於所有內部路徑解析。這可為無頭服務帳戶提供完整的檔案系統隔離。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**範例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` 也可以設定為波浪號路徑（例如 `~/svc`），該路徑會在使用前透過 `$HOME` 進行展開。

## nvm 使用者：web_fetch TLS 失敗

如果 Node.js 是透過 **nvm** 安裝的（而非系統套件管理員），內建的 `fetch()` 會使用
nvm 捆綁的 CA 存儲，這可能會缺少現代根 CA（Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等）。這會導致 `web_fetch` 在大多數 HTTPS 網站上因 `"fetch failed"` 而失敗。

在 Linux 上，OpenClaw 會自動偵測 nvm 並在實際的啟動環境中套用修復程式：

- `openclaw gateway install` 會將 `NODE_EXTRA_CA_CERTS` 寫入 systemd 服務環境
- `openclaw` CLI 進入點會在 Node 啟動前設定 `NODE_EXTRA_CA_CERTS` 並重新執行自身

**手動修復（適用於舊版本或直接啟動 `node ...`）：**

在啟動 OpenClaw 之前匯出該變數：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要僅依賴寫入 `~/.openclaw/.env` 來設定此變數；Node 會在
程序啟動時讀取 `NODE_EXTRA_CA_CERTS`。

## 相關

- [Gateway configuration](/en/gateway/configuration)
- [FAQ: env vars and .env loading](/en/help/faq#env-vars-and-env-loading)
- [Models overview](/en/concepts/models)
