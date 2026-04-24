---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢及探索 gateway"
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

- 根據預設，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則 Gateway 會拒絕啟動。請使用 `--allow-unconfigured` 進行臨時/開發執行。
- `openclaw onboard --mode local` 和 `openclaw setup` 預期會寫入 `gateway.mode=local`。如果檔案存在但缺少 `gateway.mode`，請將其視為損壞或被覆寫的設定並加以修復，而不是隱含地假設為本機模式。
- 如果檔案存在且缺少 `gateway.mode`，Gateway 會將其視為可疑的設定損壞，並拒絕為您「猜測為本機」。
- 在未經授權的情況下，禁止繫結到 loopback 以外的位置（安全防護機制）。
- `SIGUSR1` 在獲得授權時會觸發程序內重啟（預設已啟用 `commands.restart`；設定 `commands.restart: false` 可阻止手動重啟，但仍允許使用 gateway tool/config apply/update）。
- `SIGINT`/`SIGTERM` 處理程序會停止 gateway 處理程序，但不會還原任何自訂的終端機狀態。如果您使用 TUI 或原始模式輸入包裝 CLI，請在退出前還原終端機。

### 選項

- `--port <port>`：WebSocket 連接埠（預設值來自設定/環境變數；通常為 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：監聽器綁定模式。
- `--auth <token|password>`：驗證模式覆寫。
- `--token <token>`：權杖覆寫（同時也會為程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密碼覆寫。警告：內嵌密碼可能會在本機程序列表中暴露。
- `--password-file <path>`：從檔案讀取 gateway 密碼。
- `--tailscale <off|serve|funnel>`：透過 Tailscale 暴露 Gateway。
- `--tailscale-reset-on-exit`：在關機時重設 Tailscale serve/funnel 設定。
- `--allow-unconfigured`：允許在不具備設定中的 `gateway.mode=local` 的情況下啟動 Gateway。這僅繞過臨時/開發引導的啟動防護；它不會寫入或修復設定檔。
- `--dev`：如果遺失，則建立開發設定 + 工作區（跳過 BOOTSTRAP.md）。
- `--reset`：重設開發設定 + 憑證 + 會話 + 工作區（需要 `--dev`）。
- `--force`：在啟動前終止所選連接埠上任何現有的監聽程式。
- `--verbose`：詳細日誌。
- `--cli-backend-logs`：僅在主控台中顯示 CLI 後端日誌（並啟用 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日誌樣式（預設 `auto`）。
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
- `--json`：機器可讀的 JSON（無樣式/載入動畫）。
- `--no-color`（或 `NO_COLOR=1`）：停用 ANSI 同時保留人類可讀的版面配置。

共用選項（僅在支援的情況下）：

- `--url <url>`：Gateway WebSocket URL。
- `--token <token>`：Gateway 權杖。
- `--password <password>`：Gateway 密碼。
- `--timeout <ms>`：逾時/預算（因指令而異）。
- `--expect-final`：等待「最終」回應（代理程式呼叫）。

注意：當您設定 `--url` 時，CLI 不會回退到設定或環境憑證。
明確傳遞 `--token` 或 `--password`。缺少明確的憑證是一個錯誤。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端點是存活探針：一旦伺服器可以回應 HTTP，它就會返回。HTTP `/readyz` 端點更嚴格，當啟動 sidecar、通道或配置的 hooks 尚在穩定時，它會保持紅色狀態。

### `gateway usage-cost`

從工作階段記錄中擷取使用費用的摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

選項：

- `--days <days>`：要包含的天數（預設 `30`）。

### `gateway stability`

從正在執行的 Gateway 擷取最近的診斷穩定性記錄器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

選項：

- `--limit <limit>`：要包含的最近事件的最大數量（預設 `25`，最大 `1000`）。
- `--type <type>`：依診斷事件類型過濾，例如 `payload.large` 或 `diagnostic.memory.pressure`。
- `--since-seq <seq>`：僅包含診斷序號之後的事件。
- `--bundle [path]`：讀取持續化的穩定性套件而不是呼叫正在執行的 Gateway。使用 `--bundle latest`（或僅 `--bundle`）來獲取狀態目錄下最新的套件，或直接傳遞套件 JSON 路徑。
- `--export`：寫入可分享的支援診斷 zip 檔案，而不是列印穩定性詳細資訊。
- `--output <path>`：`--export` 的輸出路徑。

備註：

- 記錄器預設為啟用且不包含負載：它僅捕獲操作元資料，不捕獲聊天文字、工具輸出或原始請求或回應主體。僅當您需要完全停用 Gateway 診斷心跳收集時，才設定 `diagnostics.enabled: false`。
- 記錄保留操作元資料：事件名稱、計數、位元組大小、記憶體讀數、佇列/會話狀態、通道/外掛名稱和編輯過的會話摘要。它們不保留聊天文字、 webhook 主體、工具輸出、原始請求或回應主體、權杖、 cookies、秘密值、主機名稱或原始會話 ID。
- 當 Gateway 嚴重錯誤退出、關機逾時或重啟啟動失敗時，如果錄製器擁有事件，OpenClaw 會將相同的診斷快照寫入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。請使用 `openclaw gateway stability --bundle latest` 檢查最新的套件；`--limit`、`--type` 和 `--since-seq` 也適用於套件輸出。

### `gateway diagnostics export`

寫入一個設計用於附加到錯誤報告的本機診斷 zip 檔案。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

選項：

- `--output <path>`：輸出 zip 路徑。預設為狀態目錄下的支援匯出。
- `--log-lines <count>`：要包含的最大清理日誌行數（預設 `5000`）。
- `--log-bytes <bytes>`：要檢查的最大日誌位元組數（預設 `1000000`）。
- `--url <url>`：健康狀態快照的 Gateway WebSocket URL。
- `--token <token>`：健康狀態快照的 Gateway 權杖。
- `--password <password>`：健康狀態快照的 Gateway 密碼。
- `--timeout <ms>`：狀態/健康快照逾時（預設 `3000`）。
- `--no-stability-bundle`：跳過持久化的穩定性套件查詢。
- `--json`：以 JSON 格式列印寫入的路徑、大小和清單。

匯出包含清單、Markdown 摘要、配置形狀、已清理的配置詳細資訊、已清理的日誌摘要、已清理的 Gateway 狀態/健康快照，以及存在的最新穩定性套件。

該匯出旨在供分享。它保留了有助於偵錯的操作細節，例如安全的 OpenClaw 日誌欄位、子系統名稱、狀態碼、持續時間、配置的模式、連接埠、外掛 ID、提供者 ID、非秘密功能設定，以及已編輯的操作日誌訊息。它會省略或編輯聊天文字、Webhook 內容、工具輸出、憑證、Cookies、帳戶/訊息識別碼、提示/指令文字、主機名稱和秘密值。當 LogTape 風格的訊息看起來像使用者/聊天/工具承載文字時，匯出僅保留訊息已被省略及其位元組計數。

### `gateway status`

`gateway status` 顯示 Gateway 服務（launchd/systemd/schtasks）以及可選的連線/授權功能探測。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

選項：

- `--url <url>`：新增一個明確的探測目標。設定的遠端 + localhost 仍會被探測。
- `--token <token>`：探測用的 token 授權。
- `--password <password>`：探測用的密碼授權。
- `--timeout <ms>`：探渢逾時（預設 `10000`）。
- `--no-probe`：跳過連線探測（僅顯示服務資訊）。
- `--deep`：也掃描系統層級的服務。
- `--require-rpc`：將預設的連線探測升級為讀取探測，並在讀取探測失敗時以非零值結束。不可與 `--no-probe` 結合使用。

備註：

- 即使本機 CLI 設定遺失或無效，`gateway status` 仍可用於診斷。
- 預設的 `gateway status` 會驗證服務狀態、WebSocket 連線，以及在交握時可見的授權功能。它不會驗證讀取/寫入/管理操作。
- `gateway status` 會在可能時解析設定的授權 SecretRef 以進行探測授權。
- 如果在指令路徑中所需的授權 SecretRef 未能解析，當探測連線/授權失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 如果探測成功，未解析的 auth-ref 警告會被隱藏以避免誤判。
- 在腳本和自動化中使用 `--require-rpc`，當僅有監聽服務不足，且您需要讀取範圍的 RPC 呼叫也正常時。
- `--deep` 新增了對額外 launchd/systemd/schtasks 安裝的盡力掃描。當偵測到多個類似 gateway 的服務時，人類可讀輸出會列印清理提示，並警告大多數設定應該在每台機器上執行一個 gateway。
- 人類可讀輸出包含解析後的檔案日誌路徑，以及 CLI 與服務的設定路徑/有效性快照，以協助診斷設定檔或 state-dir 偏差。
- 在 Linux systemd 安裝中，服務授權漂移檢查會讀取單元中的 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、帶引號的路徑、多個檔案以及可選的 `-` 檔案）。
- 漂移檢查使用合併的運行時環境（優先使用服務命令環境，然後回退到進程環境）來解析 `gateway.auth.token` SecretRefs。
- 如果令牌授權未實際啟用（顯式設定 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或在密碼可優先且無令牌候選者可優先的情況下未設定模式），令牌漂移檢查將跳過配置令牌解析。

### `gateway probe`

`gateway probe` 是「調試所有內容」的指令。它始終探查：

- 您配置的遠端閘道（如果已設定），以及
- localhost（回環）**即使已配置遠端**。

如果您傳遞 `--url`，該顯式目標會被添加到兩者之前。人類可讀的輸出將目標標記為：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

如果可達到多個閘道，它會列印所有閘道。當您使用隔離的設定檔/連接埠（例如救援機器人）時，支援多個閘道，但大多數安裝仍運行單個閘道。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解讀：

- `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
- `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 報告探針能夠證明的關於授權的資訊。它與可達性分開。
- `Read probe: ok` 表示讀取範圍的詳細資訊 RPC 呼叫（`health`/`status`/`system-presence`/`config.get`）也成功。
- `Read probe: limited - missing scope: operator.read` 表示連線成功但讀取範圍的 RPC 受到限制。這被報告為**降級**的可達性，而非完全失敗。
- 僅當沒有探測到的目標可達時，退出代碼才為非零。

JSON 說明（`--json`）：

- 頂層：
  - `ok`：至少有一個目標是可達的。
  - `degraded`: 至少有一個目標具有範圍受限的詳細資訊 RPC。
  - `capability`: 在可達目標中看到的最佳功能 (`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`)。
  - `primaryTargetId`: 按此順序將視為主動勝出者的最佳目標：明確 URL、SSH 隧道、設定的遠端，然後是本地環回。
  - `warnings[]`: 盡力而為的警告記錄，包含 `code`、`message` 和可選的 `targetIds`。
  - `network`: 從當前配置和主機網路衍生的本地環回/tailnet URL 提示。
  - `discovery.timeoutMs` 和 `discovery.count`: 此次探測傳遞使用的實際探索預算/結果計數。
- 每個目標 (`targets[].connect`):
  - `ok`: 連接後的可達性 + 降級分類。
  - `rpcOk`: 完整詳細資訊 RPC 成功。
  - `scopeLimited`: 由於缺少操作員範圍，詳細資訊 RPC 失敗。
- 每個目標 (`targets[].auth`):
  - `role`: 可用時在 `hello-ok` 中報告的身分驗證角色。
  - `scopes`: 可用時在 `hello-ok` 中報告的授權範圍。
  - `capability`: 該目標顯示的身分驗證功能分類。

常見警告代碼：

- `ssh_tunnel_failed`: SSH 隧道設置失敗；該命令回退到直接探測。
- `multiple_gateways`: 超過一個目標是可達的；除非您故意執行獨立的配置文件 (例如救援機器人)，否則這種情況並不常見。
- `auth_secretref_unresolved`: 無法解析失敗目標的已配置身分驗證 SecretRef。
- `probe_scope_limited`: WebSocket 連接成功，但讀取探測因缺少 `operator.read` 而受到限制。

#### 透過 SSH 遠端 (Mac 應用程式同等功能)

macOS 應用程式的「透過 SSH 遠端」模式使用本地連接埠轉發，因此遠端閘道（可能僅綁定至 loopback）可在 `ws://127.0.0.1:<port>` 存取。

CLI 對等項目：

```bash
openclaw gateway probe --ssh user@gateway-host
```

選項：

- `--ssh <target>`：`user@host` 或 `user@host:port`（連接埠預設為 `22`）。
- `--ssh-identity <path>`：身分檔案。
- `--ssh-auto`：從解析的探索端點（`local.` 加上設定的廣域網域，若有）中，選擇第一個探索到的閘道主機作為 SSH 目標。僅 TXT 提示會被忽略。

設定（可選，作為預設值使用）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低層級 RPC 助手。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

選項：

- `--params <json>`：參數的 JSON 物件字串（預設 `{}`）
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

備註：

- `--params` 必須是有效的 JSON。
- `--expect-final` 主要適用於代理程式風格的 RPC，這類 RPC 會在傳送最終載荷之前串流中間事件。

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
- 當 token auth 需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析出的 token 持久化到服務環境元數據中。
- 如果 token auth 需要 token 且配置的 token SecretRef 無法解析，安裝將會失敗（封閉式），而不是持久化回退純文本。
- 對於 `gateway run` 上的密碼驗證，優先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支援的 `gateway.auth.password`，而不是內聯的 `--password`。
- 在推斷驗證模式下，�限 shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不會放寬安裝 token 要求；在安裝受管服務時，請使用持久化配置（`gateway.auth.password` 或配置 `env`）。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則安裝將被阻止，直到明確設定模式。
- 生命週期命令接受 `--json` 以用於腳本編寫。

## 探索 Gateway (Bonjour)

`gateway discover` 掃描 Gateway 信標 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD: `local.`
- 單播 DNS-SD (廣域 Bonjour)：選擇一個網域（例如：`openclaw.internal.`）並設置拆分 DNS + DNS 伺服器；請參閱 [/gateway/bonjour](/zh-Hant/gateway/bonjour)

只有啟用了 Bonjour 探索（預設）的 Gateway 才會廣播信標。

廣域探索記錄包括 (TXT)：

- `role` (gateway 角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 埠，通常為 `18789`)
- `sshPort` (可選；當其不存在時，客戶端會將 SSH 目標預設為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，如果可用)
- `gatewayTls` / `gatewayTlsSha256` (已啟用 TLS + 憑證指紋)
- `cliPath` (已將遠端安裝提示寫入廣域區域)

### `gateway discover`

```bash
openclaw gateway discover
```

選項：

- `--timeout <ms>`：個別指令的逾時時間 (瀏覽/解析)；預設為 `2000`。
- `--json`：機器可讀的輸出 (同時停用樣式/載入動畫)。

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

備註：

- 當啟用時，CLI 會掃描 `local.` 以及設定的廣域網域。
- JSON 輸出中的 `wsUrl` 是衍生自解析出的服務端點，而非來自僅 TXT 的提示，例如 `lanHost` 或 `tailnetDns`。
- 在 `local.` mDNS 上，只有在 `discovery.mdns.mode` 為 `full` 時才會廣播 `sshPort` 和 `cliPath`。廣域 DNS-SD 仍會寫入 `cliPath`；`sshPort` 在那裡也是選用的。
