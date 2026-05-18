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

請參閱 [Secrets Management](/zh-Hant/gateway/secrets) 與
[SecretRef credential surface](/zh-Hant/reference/secretref-credential-surface) 以了解
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

這些是執行時期標記（非必需的使用者設定）。它們可用於 shell/profile 邏輯中，以套用特定情境的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機具有淺色背景時，強制使用淺色 TUI 色板。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 色板。
- `COLORFGBG`：如果您的終端機匯出此變數，OpenClaw 將使用背景顏色提示來自動選擇 TUI 色板。

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

詳情請參閱 [Configuration: Env var substitution](/zh-Hant/gateway/configuration-reference#env-var-substitution)。

## Secret 參照與 `${ENV}` 字串

OpenClaw 支援兩種由環境變數驅動的模式：

- 設定值中的 `${VAR}` 字串替換。
- 用於支援 secret 參照欄位的 SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)。

兩者皆會在啟動時從程序環境變數解析。SecretRef 的詳細資訊記載於 [Secrets Management](/zh-Hant/gateway/secrets)。
設定 `env` 區塊本身不會解析 SecretRef 或 `file:...` 簡寫值。

## 路徑相關環境變數

| 變數                     | 用途                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆寫用於所有內部路徑解析的家目錄 (`~/.openclaw/`、代理程式目錄、工作階段、憑證)。當將 OpenClaw 作為專用服務使用者執行時很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆寫狀態目錄 (預設為 `~/.openclaw`)。                                                                                           |
| `OPENCLAW_CONFIG_PATH`   | 覆寫設定檔路徑 (預設為 `~/.openclaw/openclaw.json`)。                                                                           |
| `OPENCLAW_INCLUDE_ROOTS` | 目錄路徑清單，其中 `$include` 指令可解析設定目錄外的檔案 (預設：無 — `$include` 僅限於設定目錄)。支援波號 (tilde) 展開。        |

## 記錄

| 變數                             | 用途                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 覆寫檔案與主控台的日誌層級（例如 `debug`、`trace`）。優先順序高於設定中的 `logging.level` 與 `logging.consoleLevel`。無效值將被忽略並顯示警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在 `info` 層級輸出針對性的模型請求/回應時間診斷資訊，而無需啟用全域除錯日誌。                                                                   |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | 模型載荷診斷：`summary`、`tools` 或 `full-redacted`。`full-redacted` 會被截斷與遮蔽，但仍可能包含提示/訊息文字。                                |
| `OPENCLAW_DEBUG_SSE`             | 串流診斷：`events` 用於首次/完成時間，`peek` 則包含前五個經過遮蔽的 SSE 事件。                                                                  |
| `OPENCLAW_DEBUG_CODE_MODE`       | 程式碼模式的模型層級診斷，包括提供者工具隱藏與僅限 exec/wait 執行強制。                                                                         |

### `OPENCLAW_HOME`

設定後，`OPENCLAW_HOME` 將取代系統的家目錄（`$HOME` / `os.homedir()`）用於所有內部路徑解析。這為無介面服務帳號啟用完整的檔案系統隔離。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**範例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可設為波狀路徑（例如 `~/svc`），使用前會透過 `$HOME` 進行展開。

## nvm 使用者：web_fetch TLS 失敗

若 Node.js 是透過 **nvm**（而非系統套件管理員）安裝，內建的 `fetch()` 會使用 nvm 捆綁的 CA 存儲，可能缺少現代根 CA（例如 Let's Encrypt 的 ISRG Root X1/X2、DigiCert Global Root G2 等）。這會導致 `web_fetch` 在大多數 HTTPS 網站上失敗並回報 `"fetch failed"`。

在 Linux 上，OpenClaw 會自動偵測 nvm 並在實際啟動環境中套用修正：

- `openclaw gateway install` 會將 `NODE_EXTRA_CA_CERTS` 寫入 systemd 服務環境
- `openclaw` CLI 進入點會在 Node 啟動前設定 `NODE_EXTRA_CA_CERTS` 並重新執行自己

**手動修正（適用於舊版本或直接啟動 `node ...`）：**

在啟動 OpenClaw 之前匯出變數：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

請勿僅依賴將此變數寫入 `~/.openclaw/.env`；Node 會在
程序啟動時讀取 `NODE_EXTRA_CA_CERTS`。

## 舊版環境變數

OpenClaw 僅讀取 `OPENCLAW_*` 環境變數。來自早期版本的舊版
`CLAWDBOT_*` 和 `MOLTBOT_*` 前綴會被
靜默忽略。

如果在啟動時仍於 Gateway 程序上設定任何這些變數，OpenClaw 會發出
單一 Node 棄用警告 (`OPENCLAW_LEGACY_ENV_VARS`)，列出
偵測到的前綴和總數。請將每個數值重新命名，以
`OPENCLAW_` 取代舊版前綴（例如 `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`）；舊名稱將不會生效。

## 相關

- [Gateway 配置](/zh-Hant/gateway/configuration)
- [常見問題：環境變數與 .env 載入](/zh-Hant/help/faq#env-vars-and-env-loading)
- [模型概覽](/zh-Hant/concepts/models)
