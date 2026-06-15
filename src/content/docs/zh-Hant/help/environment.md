---
summary: "OpenClaw 從何處載入環境變數及其優先順序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "環境變數"
---

OpenClaw 從多個來源載入環境變數。其規則是**永不覆蓋現有值**。
Workspace `.env` 檔案屬於較低信任度的來源：在套用優先順序之前，OpenClaw 會忽略 workspace `.env` 中的提供者憑證和受保護的執行時期控制項。

## 優先順序 (最高 → 最低)

1. **程序環境** (Gateway 程序從父 shell/daemon 繼承的現有環境)。
2. **當前工作目錄中的 `.env`** (dotenv 預設；不會覆蓋；提供者憑證和受保護的執行時期控制項會被忽略)。
3. `~/.openclaw/.env` 處的 **全域 `.env`** (又稱 `$OPENCLAW_STATE_DIR/.env`；建議用於存放提供者 API 金鑰；不會覆蓋)。
4. `~/.openclaw/openclaw.json` 中的 **Config `env` 區塊** (僅在缺失時套用)。
5. **選用性的登入 shell 匯入** (`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`)，僅針對缺失的預期金鑰套用。

在使用預設狀態目錄的全新 Ubuntu 安裝上，OpenClaw 還會在全域 `.env` 之後，將 `~/.config/openclaw/gateway.env` 視為相容性後備方案。如果兩個檔案都存在且內容不一致，OpenClaw 將保留 `~/.openclaw/.env` 並列印警告。

如果設定檔完全缺失，步驟 4 將會被跳過；若啟用了 shell 匯入，該功能仍會執行。

## 提供者憑證與 workspace `.env`

請勿僅將提供者 API 金鑰保存在工作區 `.env` 中。OpenClaw 會忽略工作區 `.env` 檔案中的提供者憑證環境變數，包括常見金鑰，例如 `GEMINI_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`、`PERPLEXITY_API_KEY`、`BRAVE_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY` 和 `FIRECRAWL_API_KEY`。

請使用下列其中一個信任的來源存放提供者憑證：

- Gateway 程序環境，例如 shell、launchd/systemd unit、容器 secret 或 CI secret。
- 位於 `~/.openclaw/.env` 或 `$OPENCLAW_STATE_DIR/.env` 的全域執行時期 dotenv 檔案。
- `~/.openclaw/openclaw.json` 中的 config `env` 區塊。
- 當啟用 `env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1` 時，選用性的 login-shell 匯入。

如果您先前僅在工作區 `.env` 中存放提供者金鑰，請將它們移至上述其中一個信任來源。工作區 `.env` 仍可提供一般的專案變數，這些變數不是憑證、端點重新導向、主機覆寫或 `OPENCLAW_*` 執行時期控制項。

請參閱 [工作區 `.env` 檔案](/zh-Hant/gateway/security#workspace-env-files) 以了解安全性理由。

## Config `env` 區塊

設定內聯環境變數的兩種等效方式（兩者皆不會覆寫）：

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
`file:...` 值；例如，`XAI_API_KEY: "file:secrets/xai-api-key.txt"`
會以該確切字串傳遞給提供者。

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

請參閱 [Secrets 管理](/zh-Hant/gateway/secrets) 和
[SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface) 以了解
支援的欄位。

## Shell 環境匯入

`env.shellEnv` 會執行您的登入 shell 並僅匯入**缺失的**預期鍵值：

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

## 執行 shell 快照

在非 Windows Gateway 主機上，bash 和 zsh `exec` 指令預設會使用啟動快照。
在 Gateway 程序環境中設定 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` 即可停用此路徑。
數值 `false`、`no` 和 `off` 也會停用它。單次呼叫的 `exec.env` 數值無法切換
快照或重新導向快照快取。

## 執行階段注入的環境變數

OpenClaw 也會將上下文標記注入到產生的子程序中：

- `OPENCLAW_SHELL=exec`：為透過 `exec` 工具執行的指令設定。
- `OPENCLAW_SHELL=acp`：為 ACP 執行階段後端程序產生設定（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：為 `openclaw acp client` 產生 ACP 橋接程序時設定。
- `OPENCLAW_SHELL=tui-local`：為本機 TUI `!` shell 指令設定。
- `OPENCLAW_CLI=1`：為由 CLI 進入點產生的子程序設定。

這些是執行階段標記（而非必需的使用者設定）。它們可用於 shell/profile 邏輯中
以套用特定於上下文的規則。

## UI 環境變數

- `OPENCLAW_THEME=light`：當您的終端機具有淺色背景時，強制使用淺色 TUI 色盤。
- `OPENCLAW_THEME=dark`：強制使用深色 TUI 色盤。
- `COLORFGBG`：如果您的終端機匯出此變數，OpenClaw 將使用背景顏色提示自動選擇 TUI 色盤。

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

請參閱 [Configuration: Env var substitution](/zh-Hant/gateway/configuration-reference#env-var-substitution) 以了解完整詳情。

## Secret 參考 vs `${ENV}` 字串

OpenClaw 支援兩種由環境驅動的模式：

- 設定值中的 `${VAR}` 字串替換。
- SecretRef 物件 (`{ source: "env", provider: "default", id: "VAR" }`)，用於支援 secret 參考的欄位。

兩者皆在啟動時從程序環境變數解析。SecretRef 的詳細文件請參閱[秘密管理](/zh-Hant/gateway/secrets)。
config `env` 區塊本身不會解析 SecretRef 或 `file:...`
簡寫值。

## 路徑相關環境變數

| 變數                     | 用途                                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆寫用於內部 OpenClaw 路徑預設值（`~/.openclaw/`、代理目錄、工作階段、憑證、安裝程式上架，以及預設的開發簽出）的 home 目錄。當將 OpenClaw 作為專用服務使用者執行時很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆寫狀態目錄（預設 `~/.openclaw`）。                                                                                                                                       |
| `OPENCLAW_CONFIG_PATH`   | 覆寫設定檔路徑（預設 `~/.openclaw/openclaw.json`）。                                                                                                                       |
| `OPENCLAW_INCLUDE_ROOTS` | 指令可解析設定目錄以外檔案的目錄路徑清單（預設：無 — `$include``$include` 僅限於設定目錄）。支援波浪號展開。                                                               |

## 紀錄

| 變數                             | 用途                                                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 覆寫檔案與主控台的紀錄層級（例如 `debug`、`trace`）。優先順序高於設定中的 `logging.level` 和 `logging.consoleLevel`。無效的數值將會被忽略並顯示警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在 `info` 層級輸出針對模型請求/回應的時序診斷資訊，而無需啟用全域除錯紀錄。                                                                           |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | Model payload diagnostics: `summary`, `tools`, or `full-redacted`. `full-redacted` is capped and redacted but may include prompt/message text.        |
| `OPENCLAW_DEBUG_SSE`             | Streaming diagnostics: `events` for first/done timing, `peek` to include the first five redacted SSE events.                                          |
| `OPENCLAW_DEBUG_CODE_MODE`       | Code-mode model-surface diagnostics, including provider-tool hiding and exec/wait-only enforcement.                                                   |

### `OPENCLAW_HOME`

設定時，`OPENCLAW_HOME` 會取代內部 OpenClaw 路徑預設值的系統 home 目錄 (`$HOME` / `os.homedir()`)。這包括預設狀態目錄、設定路徑、代理程式目錄、憑證、安裝程式 onboarding 工作區，以及 `openclaw update --channel dev` 使用的預設 dev checkout。

**優先順序：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Android 上的 Termux `PREFIX` home 後備 > `os.homedir()`

**範例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以設定為波浪號路徑 (例如 `~/svc`)，它會在使用前透過相同的 OS home 後備鏈進行擴充。

明確的路徑變數，如 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_GIT_DIR` 仍然具有優先權。OS 帳號任務，例如 shell 啟動檔案偵測、套件管理員設定，以及主機 `~` 擴充可能仍會使用實際的系統 home。

## nvm 使用者：web_fetch TLS 失敗

如果 Node.js 是透過 **nvm** (而非系統套件管理員) 安裝，內建的 `fetch()` 會使用
nvm 捆綁的 CA 存儲，這可能缺少現代的根 CA (Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等)。這會導致 `web_fetch` 在大多數 HTTPS 網站上因 `"fetch failed"` 而失敗。

在 Linux 上，OpenClaw 會自動偵測 nvm 並在實際的啟動環境中套用修正：

- `openclaw gateway install` 會將 `NODE_EXTRA_CA_CERTS` 寫入 systemd 服務環境
- `openclaw` CLI 進入點會在 Node 啟動前設定 `NODE_EXTRA_CA_CERTS` 並重新執行自身

**手動修正 (適用於舊版本或直接 `node ...` 啟動)：**

在啟動 OpenClaw 之前匯出變數：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要依賴僅將此變數寫入 `~/.openclaw/.env`；Node 會在程序啟動時讀取
`NODE_EXTRA_CA_CERTS`。

## 舊版環境變數

OpenClaw 僅讀取 `OPENCLAW_*` 環境變數。來自早期版本的舊版
`CLAWDBOT_*` 和 `MOLTBOT_*` 前綴會被靜默
忽略。

如果在啟動時 Gateway 程序上仍然設定了任何這些變數，OpenClaw 會發出
單一 Node 棄用警告 (`OPENCLAW_LEGACY_ENV_VARS`)，列出
偵測到的前綴和總數。透過將
舊版前綴替換為 `OPENCLAW_` 來重新命名每個值
（例如 `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`）；舊名稱將不會生效。

## 相關

- [Gateway 配置](/zh-Hant/gateway/configuration)
- [FAQ：環境變數與 .env 載入](/zh-Hant/help/faq#env-vars-and-env-loading)
- [模型概述](/zh-Hant/concepts/models)
