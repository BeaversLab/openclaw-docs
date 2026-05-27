---
summary: "OpenClaw 載入環境變數的位置以及優先順序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "環境變數"
---

OpenClaw 從多個來源提取環境變數。規則是**永不覆蓋現有值**。

## 優先順序（從高到低）

1. **行程環境**（Gateway 行程從父 shell/daemon 繼承的現有環境）。
2. **目前工作目錄中的 `.env`**（dotenv 預設值；不會覆蓋）。
3. `~/.openclaw/.env` 的 **全域 `.env`**（亦稱 `$OPENCLAW_STATE_DIR/.env`；不會覆蓋）。
4. `~/.openclaw/openclaw.json` 中的 **Config `env` 區塊**（僅在缺少時套用）。
5. **選用性 login-shell 匯入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），僅針對缺少的預期金鑰套用。

在使用預設狀態目錄的 Ubuntu 全新安裝中，OpenClaw 在全域 `.env` 之後，也會將 `~/.config/openclaw/gateway.env` 視為相容性後備方案。如果這兩個檔案都存在且不一致，OpenClaw 會保留 `~/.openclaw/.env` 並列印警告。

如果完全缺少設定檔，將跳過步驟 4；如果已啟用，shell 匯入仍會執行。

## Config `env` 區塊

兩種設定內聯環境變數的等效方式（兩者均不覆蓋）：

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

Config `env` 區塊僅接受字面字串值。它不會展開
`file:...` 值；例如 `XAI_API_KEY: "file:secrets/xai-api-key.txt"`
會以該精確字串形式傳遞給提供者。

對於檔案支援的提供者金鑰，請在支援的憑證欄位上使用 SecretRef：

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

請參閱 [機密管理](/zh-Hant/gateway/secrets) 以及
[SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface) 以了解
支援的欄位。

## Shell env 匯入

`env.shellEnv` 會執行您的 login shell 並僅匯入 **缺少** 的預期金鑰：

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

## 執行時注入的環境變數

OpenClaw 也會將上下文標記注入到衍生的子程序中：

- `OPENCLAW_SHELL=exec`：為透過 `exec` 工具執行的指令設定。
- `OPENCLAW_SHELL=acp`：為 ACP 執行時後端程序衍生程序設定（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：當 `openclaw acp client` 衍生 ACP bridge 程序時為其設定。
- `OPENCLAW_SHELL=tui-local`：為本機 TUI `!` shell 指令設定。
- `OPENCLAW_CLI=1`：為由 CLI 進入點產生的子行程設定。

這些是執行時期標記（而非必需的使用者設定）。它們可用於 shell/profile 邏輯中
以套用特定情境的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機具有淺色背景時，強制使用淺色 TUI 調色盤。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 調色盤。
- `COLORFGBG`：如果您的終端機匯出此變數，OpenClaw 將使用背景顏色提示自動選擇 TUI 調色盤。

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

請參閱 [設定：環境變數替換](/zh-Hant/gateway/configuration-reference#env-var-substitution) 以了解完整細節。

## Secret 參照與 `${ENV}` 字串

OpenClaw 支援兩種由環境驅動的模式：

- 設定值中的 `${VAR}` 字串替換。
- SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)，用於支援 secret 參照的欄位。

兩者皆會在啟用時從行程環境中解析。SecretRef 的詳細資訊記載於 [機密管理](/zh-Hant/gateway/secrets)。
設定 `env` 區塊本身不會解析 SecretRef 或 `file:...`
簡寫值。

## 路徑相關環境變數

| 變數                     | 用途                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆寫用於內部 OpenClaw 路徑預設值的主目錄 (`~/.openclaw/`、代理程式目錄、作業階段、憑證、安裝程式導入以及預設的 dev checkout)。當將 OpenClaw 作為專用服務使用者執行時很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆寫狀態目錄 (預設為 `~/.openclaw`)。                                                                                                                                        |
| `OPENCLAW_CONFIG_PATH`   | 覆寫設定檔路徑 (預設為 `~/.openclaw/openclaw.json`)。                                                                                                                        |
| `OPENCLAW_INCLUDE_ROOTS` | 目錄路徑清單，指定 `$include` 指令可在設定目錄之外解析檔案的位置（預設值：無 — `$include` 僅限於設定目錄內）。支援波浪號展開。                                               |

## 日誌記錄

| 變數                             | 用途                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 覆寫檔案與主控台的日誌層級（例如 `debug`、`trace`）。優先順序高於設定中的 `logging.level` 與 `logging.consoleLevel`。無效值將被忽略並顯示警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在 `info` 層級輸出針對模型請求/回應的計時診斷資訊，無需啟用全域除錯日誌。                                                                       |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | 模型載荷診斷：`summary`、`tools` 或 `full-redacted`。`full-redacted` 會進行截斷與遮罩，但可能包含提示/訊息文字。                                |
| `OPENCLAW_DEBUG_SSE`             | 串流診斷：`events` 用於首個/完成計時，`peek` 則包含前五個經遮罩處理的 SSE 事件。                                                                |
| `OPENCLAW_DEBUG_CODE_MODE`       | 程式碼模式的模型層級診斷，包括提供者工具隱藏以及僅執行/等待強制執行。                                                                           |

### `OPENCLAW_HOME`

設定後，`OPENCLAW_HOME` 將取代系統主目錄（`$HOME` / `os.homedir()`），作為 OpenClaw 內部路徑的預設值。這包含預設狀態目錄、設定路徑、代理程式目錄、憑證、安裝程式導入工作區，以及 `openclaw update --channel dev` 使用的預設開發副本。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Android 上的 Termux `PREFIX` 主目錄備案 > `os.homedir()`

**範例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可設為波浪號路徑（例如 `~/svc`），將在使用前透過相同的 OS 主目錄備援鏈進行展開。

明確的路徑變數，例如 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_GIT_DIR`，仍然具有優先權。OS 帳戶任務，例如 shell 啟動檔案偵測、套件管理員設定和主機 `~` 擴展，可能仍然會使用真實的系統 home。

## nvm 使用者：web_fetch TLS 失敗

如果 Node.js 是透過 **nvm** (而非系統套件管理員) 安裝，內建的 `fetch()` 會使用
nvm 隨附的 CA 存儲，該存儲可能缺少現代化的根 CA (例如 Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等)。這會導致 `web_fetch` 在大多數 HTTPS 網站上因 `"fetch failed"` 而失敗。

在 Linux 上，OpenClaw 會自動偵測 nvm 並在實際的啟動環境中套用修正：

- `openclaw gateway install` 會將 `NODE_EXTRA_CA_CERTS` 寫入 systemd 服務環境
- `openclaw` CLI 進入點會在 Node 啟動前設定 `NODE_EXTRA_CA_CERTS` 並重新執行自身

**手動修正 (針對舊版本或直接啟動 `node ...` 的情況)：**

在啟動 OpenClaw 之前匯出該變數：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要依賴僅將此變數寫入 `~/.openclaw/.env`；Node 會在
程式啟動時讀取 `NODE_EXTRA_CA_CERTS`。

## 舊版環境變數

OpenClaw 僅讀取 `OPENCLAW_*` 環境變數。來自早期版本的舊版
`CLAWDBOT_*` 和 `MOLTBOT_*` 前綴會被
無聲忽略。

如果在啟動時 Gateway 程序上仍然設定了任何這些變數，OpenClaw 會發出
單一個 Node 棄用警告 (`OPENCLAW_LEGACY_ENV_VARS`)，列出
偵測到的前綴和總數。請以 `OPENCLAW_` 取代舊版前綴來重新命名每個值
(例如 `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`)；舊名稱將不會生效。

## 相關

- [Gateway 設定](/zh-Hant/gateway/configuration)
- [常見問題：環境變數與 .env 載入](/zh-Hant/help/faq#env-vars-and-env-loading)
- [模型概覽](/zh-Hant/concepts/models)
