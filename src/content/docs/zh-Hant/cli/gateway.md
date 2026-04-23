---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢和探索 gateway"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "gateway"
---

# Gateway CLI

Gateway 是 OpenClaw 的 WebSocket 伺服器（頻道、節點、工作階段、鉤子）。

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

- 預設情況下，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則 Gateway 將拒絕啟動。請使用 `--allow-unconfigured` 進行臨時/開發執行。
- `openclaw onboard --mode local` 和 `openclaw setup` 預期會寫入 `gateway.mode=local`。如果檔案存在但缺少 `gateway.mode`，請將其視為損壞或被覆寫的配置並進行修復，而不是隱含地假設為本機模式。
- 如果檔案存在但缺少 `gateway.mode`，Gateway 會將其視為可疑的配置損壞，並拒絕為您「猜測本機模式」。
- 在未經授權的情況下，禁止繫結到 loopback 以外的位置（安全防護機制）。
- 當經過授權時，`SIGUSR1` 會觸發程序內重啟（預設啟用 `commands.restart`；設定 `commands.restart: false` 以阻止手動重啟，但仍允許 gateway tool/config apply/update）。
- `SIGINT`/`SIGTERM` 處理程式會停止 gateway 程序，但它們不會恢復任何自訂終端機狀態。如果您使用 TUI 或 raw-mode 模式輸入包裝 CLI，請在退出前恢復終端機。

### 選項

- `--port <port>`：WebSocket 連接埠（預設值來自配置/環境變數；通常為 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：監聽器繫結模式。
- `--auth <token|password>`：授權模式覆寫。
- `--token <token>`：權杖覆寫（同時為程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密碼覆寫。警告：內聯密碼可能會暴露在本機程序列表中。
- `--password-file <path>`：從檔案讀取 gateway 密碼。
- `--tailscale <off|serve|funnel>`：透過 Tailscale 公開 Gateway。
- `--tailscale-reset-on-exit`：在關閉時重設 Tailscale serve/funnel 設定。
- `--allow-unconfigured`：允許在設定中沒有 `gateway.mode=local` 的情況下啟動 gateway。這僅繞過臨時/開發引導的啟動保護；它不會寫入或修復設定檔。
- `--dev`：如果缺少，則建立開發設定 + 工作區（跳過 BOOTSTRAP.md）。
- `--reset`：重設開發設定 + 憑證 + 連線階段 + 工作區（需要 `--dev`）。
- `--force`：在啟動前終止選定連接埠上任何現有的監聽器。
- `--verbose`：詳細日誌。
- `--cli-backend-logs`：僅在主控台中顯示 CLI 後端日誌（並啟用 stdout/stderr）。
- `--ws-log <auto|full|compact>`：WebSocket 日誌樣式（預設為 `auto`）。
- `--compact`：`--ws-log compact` 的別名。
- `--raw-stream`：將原始模型串流事件記錄到 l。
- `--raw-stream-path <path>`：原始串流 l 路徑。

啟動分析：

- 設定 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以在 Gateway 啟動期間記錄階段計時。
- 執行 `pnpm test:startup:gateway -- --runs 5 --warmup 1` 以對 Gateway 啟動進行基準測試。基準測試會記錄首次程序輸出、`/healthz`、`/readyz` 和啟動追蹤計時。

## 查詢正在執行的 Gateway

所有查詢指令都使用 WebSocket RPC。

輸出模式：

- 預設：人類可讀（TTY 中為彩色）。
- `--json`：機器可讀的 JSON（無樣式/轉圈）。
- `--no-color`（或 `NO_COLOR=1`）：停用 ANSI 同時保持人類可讀的佈局。

共用選項（僅在支援的情況下）：

- `--url <url>`：Gateway WebSocket URL。
- `--token <token>`：Gateway 權杖。
- `--password <password>`：Gateway 密碼。
- `--timeout <ms>`：逾時/預算（因指令而異）。
- `--expect-final`：等待「最終」回應（agent 呼叫）。

注意：當您設定 `--url` 時，CLI 不會回退至設定檔或環境認證。
明確傳遞 `--token` 或 `--password`。缺少明確認證是一種錯誤。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端點是活躍度探測：一旦伺服器可以回應 HTTP，它就會返回。HTTP `/readyz` 端點更嚴格，並且在啟動 sidecar、通道或設定的 hooks 仍在定時時保持紅色。

### `gateway usage-cost`

從工作階段記錄中擷取使用費用的摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

選項：

- `--days <days>`：要包含的天數（預設 `30`）。

### `gateway status`

`gateway status` 顯示 Gateway 服務（launchd/systemd/schtasks）以及對連線/認證能力的可選探測。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

選項：

- `--url <url>`：加入明確的探測目標。設定的遠端 + localhost 仍會被探測。
- `--token <token>`：用於探測的權杖認證。
- `--password <password>`：探針的密碼驗證。
- `--timeout <ms>`：探針逾時時間（預設為 `10000`）。
- `--no-probe`：略過連線探針（僅檢視服務）。
- `--deep`：也掃描系統層級的服務。
- `--require-rpc`：將預設連線探針升級為讀取探針，並在讀取探針失敗時以非零代碼退出。不能與 `--no-probe` 結合使用。

備註：

- 即使當本機 CLI 設定遺失或無效時，`gateway status` 仍可用於診斷。
- 預設的 `gateway status` 會驗證服務狀態、WebSocket 連線，以及在交握時可見的驗證能力。它不會驗證讀寫/管理操作。
- `gateway status` 會在可能的情況下解析設定的驗證 SecretRefs 以進行探針驗證。
- 如果所需的驗證 SecretRef 在此指令路徑中未解析，當探針連線/驗證失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析密鑰來源。
- 如果探針成功，將會隱藏未解析的 auth-ref 警告以避免誤報。
- 在腳本和自動化中使用 `--require-rpc`，當僅有監聽中的服務不足且您也需要讀取範圍的 RPC 呼叫正常時。
- `--deep` 會新增額外 launchd/systemd/schtasks 安裝的盡力掃描。當偵測到多個類 Gateway 的服務時，人類可讀的輸出會列印清理提示並警告大多數設定應在每台機器上執行一個 gateway。
- 人類可讀的輸出包含解析後的檔案日誌路徑，以及 CLI 與服務的設定路徑/有效性快照，以協助診斷設定檔或狀態目錄的漂移。
- 在 Linux systemd 安裝上，服務驗證漂移檢查會從單元讀取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、帶引號的路徑、多個檔案以及選用的 `-` 檔案）。
- 漂移檢查會使用合併的執行時期環境來解析 `gateway.auth.token` SecretRefs（優先使用服務指令環境，其次為處理程序環境備援）。
- 如果 token 認證未實際生效（明確 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或未設定模式且密碼可勝出而沒有 token 候選者可勝出），token 偏移檢查將跳過配置 token 解析。

### `gateway probe`

`gateway probe` 是「調試所有內容」的指令。它總是探查：

- 您配置的遠端 gateway（若已設定），以及
- localhost（迴路位址）**即使已配置遠端**。

如果您傳遞 `--url`，該明確目標會被加入到兩者之前。人類可讀輸出會將
目標標記為：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

如果有多個 gateway 可連線，它會將其全部印出。當您使用獨立的設定檔/連接埠時（例如救援機器人），支援多個 gateway，但大多數安裝仍只執行單一 gateway。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解讀：

- `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
- `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 報告探測所能證實的認證資訊。這與連線能力分開。
- `Read probe: ok` 表示讀取範圍的詳細資訊 RPC 呼叫（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `Read probe: limited - missing scope: operator.read` 表示連線成功但讀取範圍的 RPC 受到限制。這會被報告為**降級**（degraded）的連線能力，而非完全失敗。
- 只有在所有探測的目標都無法連線時，結束代碼才會為非零。

JSON 註記（`--json`）：

- 頂層：
  - `ok`：至少有一個目標可連線。
  - `degraded`：至少有一個目標具有範圍受限的詳細資訊 RPC。
  - `capability`：在可連線的目標中看到的最佳功能（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
  - `primaryTargetId`：按此順序視為目前有效目標的最佳目標：明確 URL、SSH 隧道、已設定的遠端，然後是本機 loopback。
  - `warnings[]`：盡力而為的警告記錄，包含 `code`、`message` 以及選用的 `targetIds`。
  - `network`：從目前設定和主機網路衍生的本機 loopback/tailnet URL 提示。
  - `discovery.timeoutMs` 和 `discovery.count`：此探測過程使用的實際探索預算/結果計數。
- 每個目標 (`targets[].connect`)：
  - `ok`：連線後的可達性 + 降級分類。
  - `rpcOk`：完整詳細資訊 RPC 成功。
  - `scopeLimited`：由於缺少操作員範圍，詳細資訊 RPC 失敗。
- 每個目標 (`targets[].auth`)：
  - `role`：當可用時，在 `hello-ok` 中回報的驗證角色。
  - `scopes`：當可用時，在 `hello-ok` 中回報的已授權範圍。
  - `capability`：該目標的表面化驗證能力分類。

常見警告代碼：

- `ssh_tunnel_failed`：SSH 隧道設定失敗；指令回退至直接探測。
- `multiple_gateways`：有一個以上的目標可達；除非您刻意執行隔離的設定檔（例如救援機器人），否則這種情況並不常見。
- `auth_secretref_unresolved`：無法解析失敗目標的已設定驗證 SecretRef。
- `probe_scope_limited`：WebSocket 連線成功，但讀取探測因缺少 `operator.read` 而受限。

#### 透過 SSH 遠端 (Mac 應用程式對等)

macOS 應用程式的「透過 SSH 遠端」模式會使用本地連接埠轉發，讓遠端閘道（可能僅綁定到 loopback）可在 `ws://127.0.0.1:<port>` 存取。

CLI 對等項目：

```bash
openclaw gateway probe --ssh user@gateway-host
```

選項：

- `--ssh <target>`：`user@host` 或 `user@host:port` (連接埠預設為 `22`)。
- `--ssh-identity <path>`：身分識別檔案。
- `--ssh-auto`：從解析後的探索端點（`local.` 加上設定的廣域網域，如果有）中，選擇第一個探索到的 gateway 主機作為 SSH 目標。僅 TXT 的提示會被忽略。

Config（可選，用作預設值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低層級 RPC 輔助工具。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

選項：

- `--params <json>`：參數的 JSON 物件字串（預設為 `{}`）
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

備註：

- `--params` 必須是有效的 JSON。
- `--expect-final` 主要適用於在最終負載之前串流中間事件的 agent 式 RPC。

## 管理 Gateway 服務

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

指令選項：

- `gateway status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `gateway install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- `gateway uninstall|start|stop|restart`：`--json`

備註：

- `gateway install` 支援 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 當 token auth 需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析出的 token 保存到服務環境元數據中。
- 如果 token auth 需要 token 且設定的 token SecretRef 無法解析，安裝將以封閉式失敗（fails closed）進行，而不會保存回退的明文。
- 對於 `gateway run` 上的密碼驗證，建議優先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支援的 `gateway.auth.password`，而非內聯 `--password`。
- 在推斷驗證模式下，僅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不會放寬安裝權杖的要求；安裝受控服務時請使用持久配置（`gateway.auth.password` 或配置 `env`）。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將被阻止，直到明確設定模式。
- 生命週期指令接受 `--json` 以用於編寫腳本。

## 探索 Gateway (Bonjour)

`gateway discover` 會掃描 Gateway 訊標 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (廣域 Bonjour)：選擇一個網域（例如：`openclaw.internal.`）並設置分割 DNS 和 DNS 伺服器；請參閱 [/gateway/bonjour](/zh-Hant/gateway/bonjour)

只有啟用 Bonjour 探索功能的 Gateway（預設）才會廣播訊標。

廣域探索記錄包括 (TXT)：

- `role` (Gateway 角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 埠，通常為 `18789`)
- `sshPort` (可選；當其不存在時，客戶端預設將 SSH 目標設為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，如果可用)
- `gatewayTls` / `gatewayTlsSha256` (TLS 已啟用 + 憑證指紋)
- `cliPath` (寫入廣域區域的遠端安裝提示)

### `gateway discover`

```bash
openclaw gateway discover
```

選項：

- `--timeout <ms>`：個別指令的逾時時間 (瀏覽/解析)；預設 `2000`。
- `--json`：機器可讀輸出（同時停用樣式/轉動指示器）。

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

注意：

- 當啟用時，CLI 會掃描 `local.` 以及設定的廣域網域。
- JSON 輸出中的 `wsUrl` 是衍生自解析後的服務端點，而非來自僅 TXT 的提示（例如 `lanHost` 或 `tailnetDns`）。
- 在 `local.` mDNS 上，僅當 `discovery.mdns.mode` 為 `full` 時，才會廣播 `sshPort` 和 `cliPath`。廣域 DNS-SD 仍會寫入 `cliPath`；`sshPort` 在那裡也保持可選。
