---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢及探索閘道"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (LAN + tailnet)
title: "閘道"
---

# Gateway CLI

Gateway 是 OpenClaw 的 WebSocket 伺服器（頻道、節點、工作階段、鉤子）。

本頁面的子指令位於 `openclaw gateway …` 之下。

相關文件：

- [/gateway/bonjour](/en/gateway/bonjour)
- [/gateway/discovery](/en/gateway/discovery)
- [/gateway/configuration](/en/gateway/configuration)

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

- 預設情況下，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則 Gateway 會拒絕啟動。請使用 `--allow-unconfigured` 進行臨時/開發執行。
- 未經授權而繫結至 loopback 以外的位址會被封鎖（安全防護）。
- 當獲得授權時，`SIGUSR1` 會觸發程序內重啟（`commands.restart` 預設為啟用；設定 `commands.restart: false` 可封鎖手動重啟，但仍允許 gateway tool/config apply/update）。
- `SIGINT`/`SIGTERM` 處理程序會停止 gateway 程序，但不會恢復任何自訂終端機狀態。如果您使用 TUI 或原始模式輸入來包裝 CLI，請在結束前恢復終端機。

### 選項

- `--port <port>`：WebSocket 連接埠（預設值來自設定/環境變數；通常為 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：監聽器繫結模式。
- `--auth <token|password>`：授權模式覆寫。
- `--token <token>`：權杖覆寫（同時會為程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密碼覆寫。警告：內聯密碼可能會暴露在本機程序列表中。
- `--password-file <path>`：從檔案讀取 gateway 密碼。
- `--tailscale <off|serve|funnel>`：透過 Tailscale 公開 Gateway。
- `--tailscale-reset-on-exit`：在關機時重設 Tailscale serve/funnel 設定。
- `--allow-unconfigured`：允許在設定中沒有 `gateway.mode=local` 的情況下啟動 gateway。
- `--dev`：如果缺少，則建立開發設定 + 工作區（跳過 BOOTSTRAP.md）。
- `--reset`：重設開發設定 + 憑證 + 會話 + 工作區（需要 `--dev`）。
- `--force`：在啟動前終止選定連接埠上任何現有的監聽程式。
- `--verbose`：詳細記錄。
- `--claude-cli-logs`：僅在主控台顯示 claude-cli 記錄（並啟用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 記錄樣式（預設為 `auto`）。
- `--compact`：`--ws-log compact` 的別名。
- `--raw-stream`：將原始模型串流事件記錄到 l。
- `--raw-stream-path <path>`：原始串流 l 路徑。

## 查詢運行中的 Gateway

所有查詢指令都使用 WebSocket RPC。

輸出模式：

- 預設：人類可讀（在 TTY 中顯示顏色）。
- `--json`：機器可讀的 JSON（無樣式/轉圈動畫）。
- `--no-color`（或 `NO_COLOR=1`）：停用 ANSI 同時保持人類可讀佈局。

共用選項（在支援的情況下）：

- `--url <url>`：Gateway WebSocket URL。
- `--token <token>`：Gateway 權杖。
- `--password <password>`：Gateway 密碼。
- `--timeout <ms>`：逾時/預算（因指令而異）。
- `--expect-final`：等待「最終」回應（代理程式呼叫）。

注意：當您設定 `--url` 時，CLI 不會回退到設定檔或環境憑證。
明確傳遞 `--token` 或 `--password`。缺少明確的憑證是一個錯誤。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 顯示 Gateway 服務（launchd/systemd/schtasks）以及選用的 RPC 探測。

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
- `--no-probe`：跳過 RPC 探測（僅限服務視圖）。
- `--deep`：同時掃描系統層級的服務。
- `--require-rpc`：當 RPC 探測失敗時以非零狀態碼退出。不可與 `--no-probe` 結合使用。

備註：

- `gateway status` 會在可能時解析已配置的驗證 SecretRefs 以進行探測驗證。
- 若在此指令路徑中所需的驗證 SecretRef 未被解析，當探測連線/驗證失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 若探測成功，會抑制未解析的 auth-ref 警告以避免誤報。
- 在腳本與自動化作業中，當僅有監聽中的服務不足且您需要 Gateway RPC 本身健康時，請使用 `--require-rpc`。
- 在 Linux systemd 安裝上，服務驗證偏移檢查會從單元中讀取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、引號路徑、多個檔案以及選用的 `-` 檔案）。

### `gateway probe`

`gateway probe` 是「除錯所有項目」的指令。它總是會探測：

- 您已配置的遠端 gateway（若有設定），以及
- localhost (loopback) **即使已配置遠端**。

若有多個 gateway 可連線，它會全部列出。當您使用隔離的設定檔/連接埠時支援多個 gateway（例如救援 bot），但大多數安裝仍只執行單一 gateway。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解讀方式：

- `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
- `RPC: ok` 表示詳細的 RPC 呼叫（`health`/`status`/`system-presence`/`config.get`）也成功。
- `RPC: limited - missing scope: operator.read` 表示連線成功但詳細 RPC 受範圍限制。這會被回報為 **degraded**（降級）連線能力，而非完全失敗。
- 僅當沒有探測到的目標可連線時，結束代碼才會是非零。

JSON 備註（`--json`）：

- 頂層：
  - `ok`: 至少有一個目標是可連線的。
  - `degraded`: 至少有一個目標具有範圍限制的詳細資訊 RPC。
- 每個目標 (`targets[].connect`)：
  - `ok`: 連線後的連線性 + 降級分類。
  - `rpcOk`: 完整的詳細資訊 RPC 成功。
  - `scopeLimited`: 由於缺少操作員範圍，詳細資訊 RPC 失敗。

#### 透過 SSH 遠端操作 (Mac 應用程式同等功能)

macOS 應用程式的「透過 SSH 遠端操作」模式使用本地連接埠轉送，因此遠端閘道（可能僅綁定至 loopback）可在 `ws://127.0.0.1:<port>` 連線。

CLI 對應項目：

```bash
openclaw gateway probe --ssh user@gateway-host
```

選項：

- `--ssh <target>`: `user@host` 或 `user@host:port` (連接埠預設為 `22`)。
- `--ssh-identity <path>`: 身分識別檔案。
- `--ssh-auto`: 選擇第一個發現的閘道主機作為 SSH 目標 (僅限 LAN/WAB)。

設定 (可選，用作預設值)：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低層級 RPC 助手。

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
- 當 Token 驗證需要 Token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析出的 Token 保存到服務環境元資料中。
- 如果 Token 驗證需要 Token 且設定的 Token SecretRef 未解析，則安裝會以封閉式失敗結束，而不是保存後備純文字。
- 對於 `gateway run` 上的密碼驗證，建議優先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支援的 `gateway.auth.password`，而不是內聯 `--password`。
- 在推斷式驗證模式下，僅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不會放寬安裝 Token 要求；在安裝受管理服務時，請使用持久化配置（`gateway.auth.password` 或 config `env`）。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則會阻止安裝，直到明確設定模式為止。
- 生命週期指令接受 `--json` 以便進行腳本撰寫。

## 探索 Gateway (Bonjour)

`gateway discover` 會掃描 Gateway 訊標（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (Wide-Area Bonjour)：選擇一個網域 (例如：`openclaw.internal.`) 並設定分流 DNS + DNS 伺服器；請參閱 [/gateway/bonjour](/en/gateway/bonjour)

只有啟用 Bonjour 探索功能的 Gateway（預設設定）才會廣播訊標。

廣域探索記錄包括 (TXT)：

- `role` (Gateway 角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 連接埠，通常為 `18789`)
- `sshPort` (SSH 連接埠；若不存在則預設為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，當可用時)
- `gatewayTls` / `gatewayTlsSha256` (已啟用 TLS + 憑證指紋)
- `cliPath` (遠端安裝的可選提示)

### `gateway discover`

```bash
openclaw gateway discover
```

選項：

- `--timeout <ms>`：個別指令的逾時時間 (瀏覽/解析)；預設為 `2000`。
- `--json`：機器可讀取的輸出 (同時停用樣式/轉輪動畫)。

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```
