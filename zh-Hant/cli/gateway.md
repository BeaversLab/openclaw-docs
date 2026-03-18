---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢與探索 gateway"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (LAN + tailnet)
title: "gateway"
---

# Gateway CLI

Gateway 是 OpenClaw 的 WebSocket 伺服器（通道、節點、工作階段、hooks）。

本頁面中的子指令位於 `openclaw gateway …` 之下。

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
- 未經授權繫結至 loopback 以外會被封鎖（安全防護）。
- `SIGUSR1` 在獲得授權時會觸發程序內重新啟動（預設啟用 `commands.restart`；設定 `commands.restart: false` 以封鎖手動重新啟動，但仍允許 gateway tool/config apply/update）。
- `SIGINT`/`SIGTERM` 處理程序會停止 gateway 程序，但不會還原任何自訂終端機狀態。如果您用 TUI 或 raw-mode 輸入包裝 CLI，請在結束前還原終端機。

### 選項

- `--port <port>`： WebSocket 埠（預設值來自設定/環境變數；通常為 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`： 監聽器繫結模式。
- `--auth <token|password>`： 授權模式覆寫。
- `--token <token>`： 權杖覆寫（也會為該程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`： 密碼覆寫。警告：內嵌密碼可能會在本地程序列表中暴露。
- `--password-file <path>`： 從檔案讀取 gateway 密碼。
- `--tailscale <off|serve|funnel>`： 透過 Tailscale 公開 Gateway。
- `--tailscale-reset-on-exit`： 在關閉時重設 Tailscale serve/funnel 設定。
- `--allow-unconfigured`： 允許 gateway 在未於設定中設定 `gateway.mode=local` 的情況下啟動。
- `--dev`: 如果缺少，則建立開發設定 + 工作區（跳過 BOOTSTRAP.md）。
- `--reset`: 重設開發設定 + 憑證 + 會話 + 工作區（需要 `--dev`）。
- `--force`: 在啟動前終止所選連接埠上任何現有的監聽程式。
- `--verbose`: 詳細日誌。
- `--claude-cli-logs`: 僅在主控台中顯示 claude-cli 日誌（並啟用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`: websocket 日誌樣式（預設 `auto`）。
- `--compact`: `--ws-log compact` 的別名。
- `--raw-stream`: 將原始模型串流事件記錄到 l。
- `--raw-stream-path <path>`: 原始串流 l 路徑。

## 查詢正在執行的 Gateway

所有查詢指令都使用 WebSocket RPC。

輸出模式：

- 預設：人類可讀（TTY 中帶有顏色）。
- `--json`: 機器可讀的 JSON（無樣式/載入動畫）。
- `--no-color`（或 `NO_COLOR=1`）：停用 ANSI，同時保留人類可讀的佈局。

共用的選項（適用時）：

- `--url <url>`: Gateway WebSocket URL。
- `--token <token>`: Gateway 權杖。
- `--password <password>`: Gateway 密碼。
- `--timeout <ms>`: 逾時/預算（因指令而異）。
- `--expect-final`: 等待「最終」回應（agent 呼叫）。

注意：當您設定 `--url` 時，CLI 不會回退到設定或環境憑證。
請明確傳遞 `--token` 或 `--password`。缺少明確憑證是一個錯誤。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 顯示 Gateway 服務 以及一個選用的 RPC 探測。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

選項：

- `--url <url>`: 覆寫探測 URL。
- `--token <token>`: 探測的權杖認證。
- `--password <password>`: 探測的密碼認證。
- `--timeout <ms>`: 探測逾時（預設 `10000`）。
- `--no-probe`：跳過 RPC 探測（僅限服務檢視）。
- `--deep`：一併掃描系統層級的服務。
- `--require-rpc`：當 RPC 探測失敗時以非零狀態碼退出。不能與 `--no-probe` 併用。

備註：

- `gateway status` 會盡可能解析已配置的 auth SecretRefs 以進行探測驗證。
- 如果在此指令路徑中所需的 auth SecretRef 未被解析，當探測連線/驗證失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 如果探測成功，將會隱藏未解析的 auth-ref 警告以避免誤報。
- 當單純的監聽服務不足且您需要 Gateway RPC 本身處於健全狀態時，請在腳本和自動化程序中使用 `--require-rpc`。
- 在 Linux systemd 安裝中，服務認證偏移檢查會從單元讀取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、帶引號的路徑、多個檔案和選用的 `-` 檔案）。

### `gateway probe`

`gateway probe` 是「除錯所有內容」的指令。它總是會探測：

- 您設定的遠端 gateway（如果已設定），以及
- localhost (loopback) **即使已設定遠端**。

如果可以連接到多個 gateway，它會全部列印出來。當您使用獨立的設定檔/連接埠時（例如救援 bot），支援多個 gateway，但大多數安裝仍然只會執行單一 gateway。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解讀：

- `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
- `RPC: ok` 表示詳細的 RPC 呼叫（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `RPC: limited - missing scope: operator.read` 表示連線成功但詳細 RPC 受限範圍。這會被回報為**部分降級**的可連線性，而非完全失敗。
- 只有當沒有任何探測的目標可連線時，結束代碼才會是非零。

JSON 備註（`--json`）：

- 頂層：
  - `ok`：至少有一個目標是可連線的。
  - `degraded`：至少有一個目標具有範圍限制的詳細資訊 RPC。
- 每個目標 (`targets[].connect`)：
  - `ok`：連線後的可連線性 + 降級分類。
  - `rpcOk`：完整詳細資訊 RPC 成功。
  - `scopeLimited`：由於缺少操作員範圍，詳細資訊 RPC 失敗。

#### 透過 SSH 遠端 (Mac 應用程式同等功能)

macOS 應用程式的「透過 SSH 遠端」模式使用本地連接埠轉發，因此遠端閘道 (可能僅綁定到 loopback) 可在 `ws://127.0.0.1:<port>` 連線。

CLI 同等指令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

選項：

- `--ssh <target>`：`user@host` 或 `user@host:port` (連接埠預設為 `22`)。
- `--ssh-identity <path>`：身份檔案。
- `--ssh-auto`：選擇第一個發現的閘道主機作為 SSH 目標 (僅限 LAN/WAB)。

設定 (可選，作為預設值使用)：

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
- 當 Token 驗證需要 Token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析後的 Token 保存到服務環境中繼資料中。
- 如果 Token 驗證需要 Token 且設定的 Token SecretRef 未解析，安裝會以封閉式失敗，而不是保存後援純文字。
- 對於 `gateway run` 上的密碼驗證，建議優先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支援的 `gateway.auth.password`，而非內聯 `--password`。
- 在推斷的驗證模式下，僅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD`/`CLAWDBOT_GATEWAY_PASSWORD` 不會放寬安裝權杖的要求；安裝受管理服務時請使用持續性設定 (`gateway.auth.password` 或設定 `env`)。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將會被封鎖，直到明確設定模式為止。
- 生命週期指令接受 `--json` 以用於編寫腳本。

## 探索 Gateway (Bonjour)

`gateway discover` 掃描 Gateway 信標 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (廣域 Bonjour)：選擇一個網域 (例如：`openclaw.internal.`) 並設定 split DNS + DNS 伺服器；請參閱 [/gateway/bonjour](/zh-Hant/gateway/bonjour)

只有啟用 Bonjour 探索的 Gateway (預設) 才會廣播信標。

廣域探索記錄包括 (TXT)：

- `role` (Gateway 角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 連接埠，通常為 `18789`)
- `sshPort` (SSH 連接埠；如果不存在則預設為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，當可用時)
- `gatewayTls` / `gatewayTlsSha256` (已啟用 TLS + 憑證指紋)
- `cliPath` (遠端安裝的可選提示)

### `gateway discover`

```bash
openclaw gateway discover
```

選項：

- `--timeout <ms>`：每個指令的逾時 (瀏覽/解析)；預設 `2000`。
- `--json`：機器可讀的輸出 (也會停用樣式/載入動畫)。

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
