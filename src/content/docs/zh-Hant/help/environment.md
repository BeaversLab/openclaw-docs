---
summary: "OpenClaw 載入環境變數的位置以及優先順序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "環境變數"
---

OpenClaw 從多個來源提取環境變數。規則是**永不覆蓋現有值**。
Workspace `.env` 檔案是較低信任度的來源：在套用優先順序之前，OpenClaw 會忽略來自 workspace `.env` 的提供者憑證和受保護的執行時控制項。

## 優先順序（從高到低）

1. **行程環境**（Gateway 行程從父 shell/daemon 繼承的現有環境）。
2. **目前工作目錄中的 `.env`**（dotenv 預設值；不覆蓋；提供者憑證和受保護的執行時控制項會被忽略）。
3. `~/.openclaw/.env` 處的**全域 `.env`**（也稱為 `$OPENCLAW_STATE_DIR/.env`；建議用於提供者 API 金鑰；不覆蓋）。
4. `~/.openclaw/openclaw.json` 中的 **Config `env` 區塊**（僅在缺失時套用）。
5. **選用性的 login-shell 匯入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），僅針對缺失的預期金鑰套用。

在使用預設狀態目錄的 Ubuntu 全新安裝上，OpenClaw 在全域 `.env` 之後，也會將 `~/.config/openclaw/gateway.env` 視為相容性備援方案。如果兩個檔案都存在且內容不一致，OpenClaw 將保留 `~/.openclaw/.env` 並列印警告。

如果完全缺少設定檔，將跳過步驟 4；如果已啟用，shell 匯入仍會執行。

## 提供者憑證與 workspace `.env`

請勿僅將提供者 API 金鑰保留在 workspace `.env` 中。OpenClaw 會忽略來自 workspace `.env` 檔案的提供者憑證環境變數，包括常見金鑰，例如 `GEMINI_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`、`PERPLEXITY_API_KEY`、`BRAVE_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY` 和 `FIRECRAWL_API_KEY`。

請使用以下其中一個信任來源儲存提供者憑證：

- Gateway 程序環境，例如 shell、launchd/systemd unit、容器 secret 或 CI secret。
- 位於 `~/.openclaw/.env` 或 `$OPENCLAW_STATE_DIR/.env` 的全域執行時 dotenv 檔案。
- `~/.openclaw/openclaw.json` 中的 config `env` 區塊。
- 當啟用 `env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1` 時，可選的登入 shell 匯入。

如果您之前僅在工作區 `.env` 中儲存了提供者金鑰，請將其移至上述其中一個受信任來源。工作區 `.env` 仍然可以提供非憑證、端點重新導向、主機覆寫或 `OPENCLAW_*` 執行時控制的普通專案變數。

請參閱 [Workspace `.env` files](/zh-Hant/gateway/security#workspace-env-files) 以了解安全性理由。

## Config `env` 區塊

設定內聯環境變數的兩種等效方式（兩者皆不覆寫）：

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

Config `env` 區塊僅接受字面字串值。它不會擴展
`file:...` 值；例如，`XAI_API_KEY: "file:secrets/xai-api-key.txt"`
會原封不動地作為該字串傳遞給提供者。

對於基於檔案的提供者金鑰，請在支援的憑證欄位上使用 SecretRef：

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

請參閱 [Secrets Management](/zh-Hant/gateway/secrets) 和
[SecretRef credential surface](/zh-Hant/reference/secretref-credential-surface) 以了解
支援的欄位。

## Shell 環境匯入

`env.shellEnv` 會執行您的登入 shell 並僅匯入**缺失的**預期金鑰：

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
- `OPENCLAW_SHELL=acp-client`：當 `openclaw acp client` 產生 ACP bridge 程序時為其設定。
- `OPENCLAW_SHELL=tui-local`：為本機 TUI `!` shell 指令設定。
- `OPENCLAW_CLI=1`：為由 CLI 進入點產生的子程序設定。

這些是執行時標記（非必需的使用者設定）。它們可用於 shell/profile 邏輯中
以套用特定於上下文的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機具有淺色背景時，強制使用淺色 TUI 調色板。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 調色板。
- `COLORFGBG`：如果您的終端機匯出了此變數，OpenClaw 將使用背景顏色提示自動選擇 TUI 調色板。

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

有關詳細資訊，請參閱[設定：環境變數替換](/zh-Hant/gateway/configuration-reference#env-var-substitution)。

## Secret 參照與 `${ENV}` 字串

OpenClaw 支援兩種由環境變數驅動的模式：

- 設定檔值中的 `${VAR}` 字串替換。
- SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)，用於支援 secret 參照的欄位。

兩者皆會在啟動時從程序環境變數中解析。SecretRef 的詳細資訊記錄於 [Secret 管理](/zh-Hant/gateway/secrets) 中。
設定檔 `env` 區塊本身不會解析 SecretRef 或 `file:...`
簡寫值。

## 路徑相關環境變數

| 變數                     | 用途                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆寫用於內部 OpenClaw 路徑預設值的主目錄 (`~/.openclaw/`、代理程式目錄、工作階段、憑證、安裝程式上架以及預設的 dev checkout)。當以專用服務使用者身分執行 OpenClaw 時很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆寫狀態目錄 (預設為 `~/.openclaw`)。                                                                                                                                        |
| `OPENCLAW_CONFIG_PATH`   | 覆寫設定檔路徑 (預設為 `~/.openclaw/openclaw.json`)。                                                                                                                        |
| `OPENCLAW_INCLUDE_ROOTS` | 目錄路徑清單，其中 `$include` 指令可解析設定目錄之外的檔案 (預設：無 — `$include` 僅限於設定目錄)。支援波浪號展開。                                                          |

## 記錄

| 變數                             | 用途                                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 覆寫檔案和主控台的記錄層級 (例如 `debug`、`trace`)。優先順序高於設定檔中的 `logging.level` 和 `logging.consoleLevel`。無效的值將被忽略並顯示警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在不啟用全域偵錯日誌的情況下，發出特定層級的模型請求/回應時間診斷資訊。                                                                            |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | 模型載荷診斷：`summary`、`tools` 或 `full-redacted`。`full-redacted` 會被截斷和編輯，但可能包含提示詞/訊息文字。                                   |
| `OPENCLAW_DEBUG_SSE`             | 串流診斷：`events` 用於首次/完成時間，`peek` 用於包含前五個經編輯的 SSE 事件。                                                                     |
| `OPENCLAW_DEBUG_CODE_MODE`       | 程式碼模式模型層級診斷，包括提供者工具隱藏以及僅執行/僅等待強制執行。                                                                              |

### `OPENCLAW_HOME`

設定後，`OPENCLAW_HOME` 將取代系統主目錄（`$HOME` / `os.homedir()`）作為內部 OpenClaw 路徑預設值。這包括預設狀態目錄、設定路徑、代理程式目錄、憑證、安裝程式入門工作區，以及 `openclaw update --channel dev` 使用的預設開發检出。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Android 上的 Termux `PREFIX` home 後備 > `os.homedir()`

**範例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以設定為波浪號路徑（例如 `~/svc`），在使用前會使用相同的 OS home 後備鏈進行展開。

明確的路徑變數（例如 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_GIT_DIR`）仍然具有優先權。OS 帳戶任務（例如 Shell 啟動檔案偵測、套件管理器設定和主機 `~` 展開）可能仍會使用真實的系統主目錄。

## nvm 使用者：web_fetch TLS 失敗

如果 Node.js 是透過 **nvm**（而非系統套件管理員）安裝的，內建的 `fetch()` 會使用
nvm 捆綁的 CA 儲存庫，這可能缺少現代的根 CA（例如 Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等）。這會導致 `web_fetch` 在大多數 HTTPS 網站上因 `"fetch failed"` 而失敗。

在 Linux 上，OpenClaw 會自動偵測 nvm 並在實際的啟動環境中套用修復程式：

- `openclaw gateway install` 會將 `NODE_EXTRA_CA_CERTS` 寫入 systemd 服務環境中
- `openclaw` CLI 進入點會在 Node 啟動前設定 `NODE_EXTRA_CA_CERTS` 並重新執行自身

**手動修復（針對舊版本或直接 `node ...` 啟動）：**

在啟動 OpenClaw 之前匯出該變數：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要僅依賴寫入 `~/.openclaw/.env` 來設定此變數；Node 會在
程序啟動時讀取 `NODE_EXTRA_CA_CERTS`。

## 舊版環境變數

OpenClaw 僅讀取 `OPENCLAW_*` 環境變數。來自早期版本的舊版
`CLAWDBOT_*` 和 `MOLTBOT_*` 前綴會被
無聲忽略。

如果在啟動時 Gateway 程序上仍有設定任何這些變數，OpenClaw 會發出
單一 Node 棄用警告 (`OPENCLAW_LEGACY_ENV_VARS`)，列出
偵測到的前綴和總數。請透過將舊版前綴替換為 `OPENCLAW_` 來重新命名每個值
（例如 `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`）；舊名稱將不會生效。

## 相關

- [Gateway 設定](/zh-Hant/gateway/configuration)
- [常見問題：環境變數與 .env 載入](/zh-Hant/help/faq#env-vars-and-env-loading)
- [模型總覽](/zh-Hant/concepts/models)
