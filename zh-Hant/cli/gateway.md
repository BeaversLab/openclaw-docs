---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢和探索 gateway"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (LAN + tailnet)
title: "gateway"
---

# Gateway CLI

Gateway 是 OpenClaw 的 WebSocket 伺服器（頻道、節點、工作階段、勾點）。

本頁面的子指令位於 `openclaw gateway …` 之下。

相關文件：

- [/gateway/bonjour](/zh-Hant/gateway/bonjour)
- [/gateway/discovery](/zh-Hant/gateway/discovery)
- [/gateway/configuration](/zh-Hant/gateway/configuration)

## 執行 Gateway

執行本機 Gateway 程序：

```bash
openclaw gateway
```

前景別名：

```bash
openclaw gateway run
```

備註：

- 根據預設，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則 Gateway 會拒絕啟動。請使用 `--allow-unconfigured` 進行臨時/開發執行。
- 未經授權而綁定至 loopback 以外的位置會被封鎖（安全防護機制）。
- `SIGUSR1` 會在經過授權時觸發進程內重啟（`commands.restart` 預設為啟用；設定 `commands.restart: false` 可封鎖手動重啟，但仍允許 gateway tool/config apply/update）。
- `SIGINT`/`SIGTERM` 處理程序會停止 gateway 進程，但不會復原任何自訂的終端機狀態。如果您用 TUI 或原始模式輸入包裝 CLI，請在結束前復原終端機狀態。

### 選項

- `--port <port>`：WebSocket 連接埠（預設值來自設定/環境變數；通常為 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：監聽器綁定模式。
- `--auth <token|password>`：授權模式覆寫。
- `--token <token>`：token 覆寫（同時會為該程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密碼覆寫。警告：內聯密碼可能在本地程序列表中暴露。
- `--password-file <path>`：從檔案讀取 gateway 密碼。
- `--tailscale <off|serve|funnel>`：透過 Tailscale 公開 Gateway。
- `--tailscale-reset-on-exit`：在關機時重設 Tailscale serve/funnel 設定。
- `--allow-unconfigured`：允許在設定中沒有 `gateway.mode=local` 的情況下啟動 gateway。
- `--dev`：如果缺少開發設定和工作區，則建立它們（跳過 BOOTSTRAP.md）。
- `--reset`：重設開發設定、憑證、會話和工作區（需要 `--dev`）。
- `--force`：在啟動前終止選定連接埠上任何現有的監聽程式。
- `--verbose`：詳細日誌。
- `--claude-cli-logs`：僅在主控台中顯示 claude-cli 日誌（並啟用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日誌樣式（預設為 `auto`）。
- `--compact`：`--ws-log compact` 的別名。
- `--raw-stream`：將原始模型串流事件記錄到 l。
- `--raw-stream-path <path>`：原始串流 l 路徑。

## 查詢運行中的 Gateway

所有查詢指令皆使用 WebSocket RPC。

輸出模式：

- 預設：人類可讀（在 TTY 中為彩色）。
- `--json`：機器可讀的 JSON（無樣式/轉圈動畫）。
- `--no-color`（或 `NO_COLOR=1`）：停用 ANSI 同時保留人類可讀排版。

共享選項（於支援處）：

- `--url <url>`：Gateway WebSocket URL。
- `--token <token>`：Gateway 權杖。
- `--password <password>`：Gateway 密碼。
- `--timeout <ms>`：逾時/預算（因指令而異）。
- `--expect-final`：等待「最終」回應（agent 呼叫）。

注意：當您設定 `--url` 時，CLI 不會退而求其次使用設定檔或環境憑證。
請明確傳遞 `--token` 或 `--password`。缺少明確的憑證是一種錯誤。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 會顯示 Gateway 服務（launchd/systemd/schtasks）以及選用的 RPC 探測。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

選項：

- `--url <url>`：覆寫探測 URL。
- `--token <token>`：探測的權杖驗證。
- `--password <password>`：探測的密碼驗證。
- `--timeout <ms>`：探測逾時（預設 `10000`）。
- `--no-probe`：跳過 RPC 探測（僅檢視服務）。
- `--deep`：也掃描系統層級的服務。
- `--require-rpc`：當 RPC 探測失敗時，以非零狀態碼結束。不可與 `--no-probe` 結合使用。

備註：

- 當可行時，`gateway status` 會解析為探測認證設定的 auth SecretRefs。
- 若在此指令路徑中無法解析必要的 auth SecretRef，則當探測連線/認證失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 若探測成功，將隱藏未解析 auth-ref 的警告以避免誤判。
- 在腳本和自動化中使用 `--require-rpc`，當僅有監聽服務不足且需要 Gateway RPC 本身處於健康狀態時。
- 在 Linux systemd 安裝上，服務授權漂移檢查會從單元讀取 `Environment=` 和 `EnvironmentFile=` 的值（包括 `%h`、帶引號的路徑、多個檔案以及可選的 `-` 檔案）。

### `gateway probe`

`gateway probe` 是「調試一切」的指令。它總是探測：

- 您設定的遠端 Gateway（如果已設定），以及
- localhost（loopback，環回位址）**即使已設定遠端**。

如果有多個 Gateway 可觸達，它會將其全部印出。當您使用獨立的設定檔/連接埠時（例如救援機器人），支援多個 Gateway，但大多數安裝仍運行單一 Gateway。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解讀：

- `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
- `RPC: ok` 表示詳細的 RPC 呼叫 (`health`/`status`/`system-presence`/`config.get`) 也成功。
- `RPC: limited - missing scope: operator.read` 表示連線成功，但詳細 RPC 受到範圍限制。這會被回報為**降級** (degraded) 的連線能力，而非完全失敗。
- 只有當沒有被探測的目標可連線時，結束代碼才會為非零。

JSON 註解 (`--json`)：

- 頂層：
  - `ok`：至少有一個目標可連線。
  - `degraded`：至少有一個目標的詳細 RPC 受到範圍限制。
- 每個目標 (`targets[].connect`)：
  - `ok`：連線並加上降級分類後的連線能力。
  - `rpcOk`：完整細節 RPC 成功。
  - `scopeLimited`：由於缺少操作員範圍，細節 RPC 失敗。

#### 透過 SSH 遠端連線（Mac 應用程式同等功能）

macOS 應用程式的「透過 SSH 遠端連線」模式使用本地連接埠轉發，因此遠端閘道（可能僅綁定到 loopback）可在 `ws://127.0.0.1:<port>` 存取。

CLI 同等指令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

選項：

- `--ssh <target>`：`user@host` 或 `user@host:port`（連接埠預設為 `22`）。
- `--ssh-identity <path>`：身分識別檔案。
- `--ssh-auto`：選擇第一個發現的閘道主機作為 SSH 目標（僅限 LAN/WAB）。

設定（可選，用作預設值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低階 RPC 輔助工具。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

## 管理 Gateway 服務

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

備註：

- `gateway install` 支援 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 當 token 認證需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析後的 token 儲存到服務環境元資料中。
- 如果 token 認證需要 token 且設定的 token SecretRef 無法解析，安裝將會失敗，而不會儲存回退的純文字。
- 對於 `gateway run` 上的密碼認證，優先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支援的 `gateway.auth.password`，而不是內聯的 `--password`。
- 在推斷授權模式 (inferred auth mode) 下，僅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD`/`CLAWDBOT_GATEWAY_PASSWORD` 不會放寬安裝權杖 (install token) 要求；安裝受管理服務時，請使用持久化設定 (`gateway.auth.password` 或 config `env`)。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將會被阻擋，直到明確設定模式。
- 生命週期指令接受 `--json` 以用於指令碼 (scripting)。

## 探索閘道 (Bonjour)

`gateway discover` 會掃描閘道信標 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (Wide-Area Bonjour)：選擇一個網域 (例如：`openclaw.internal.`) 並設置分流 DNS + DNS 伺服器；請參閱 [/gateway/bonjour](/zh-Hant/gateway/bonjour)

只有啟用 Bonjour 探索功能的閘道 (預設) 才會廣播訊標。

廣域探索記錄包括 (TXT)：

- `role` (閘道角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 埠，通常為 `18789`)
- `sshPort` (SSH 埠；若不存在則預設為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，當可用時)
- `gatewayTls` / `gatewayTlsSha256` (啟用 TLS + 憑證指紋)
- `cliPath`（遠端安裝的選用提示）

### `gateway discover`

```bash
openclaw gateway discover
```

選項：

- `--timeout <ms>`：個別指令的逾時時間（瀏覽/解析）；預設為 `2000`。
- `--json`：機器可讀的輸出（也會停用樣式/載入動畫）。

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
