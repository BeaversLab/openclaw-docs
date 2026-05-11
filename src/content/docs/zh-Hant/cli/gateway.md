---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢與探索 Gateway"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "Gateway"
sidebarTitle: "Gateway"
---

Gateway 是 OpenClaw 的 WebSocket 伺服器（channels、nodes、sessions、hooks）。本頁面的子指令位於 `openclaw gateway …` 之下。

<CardGroup cols={3}>
  <Card title="Bonjour discovery" href="/zh-Hant/gateway/bonjour">
    本地 mDNS + 廣域 DNS-SD 設定。
  </Card>
  <Card title="Discovery overview" href="/zh-Hant/gateway/discovery">
    OpenClaw 如何廣告與尋找 Gateway。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration">
    頂層 Gateway 設定鍵。
  </Card>
</CardGroup>

## 執行 Gateway

執行本地 Gateway 程序：

```bash
openclaw gateway
```

前景別名：

```bash
openclaw gateway run
```

<AccordionGroup>
  <Accordion title="啟動行為">
    - 預設情況下，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則 Gateway 會拒絕啟動。請針對臨時/開發執行使用 `--allow-unconfigured`。 - 預期 `openclaw onboard --mode local` 和 `openclaw setup` 會寫入 `gateway.mode=local`。如果檔案存在但缺少 `gateway.mode`，請將其視為損壞或被覆寫的設定並修復它，而不是隱含地假設為本機模式。 - 如果檔案存在且缺少 `gateway.mode`，Gateway
    會將其視為可疑的設定損毀，並拒絕為您「猜測為本機」。 - 在未經授權的情況下，禁止繫結到 loopback 以外的位置（安全防護）。 - 當經過授權時，`SIGUSR1` 會觸發程序內重啟（`commands.restart` 預設為啟用；請設定 `commands.restart: false` 以阻擋手動重啟，而 gateway tool/config apply/update 則仍被允許）。 - `SIGINT`/`SIGTERM` 處理程式會停止 gateway 程序，但它們不會還原任何自訂終端機狀態。如果您使用 TUI
    或原始模式輸入包裝 CLI，請在結束前還原終端機。
  </Accordion>
</AccordionGroup>

### 選項

<ParamField path="--port <port>" type="number">
  WebSocket 連接埠（預設值來自配置/環境變數；通常為 `18789`）。
</ParamField>
<ParamField path="--bind <loopback|lan|tailnet|auto|custom>" type="string">
  監聽器綁定模式。
</ParamField>
<ParamField path="--auth <token|password>" type="string">
  覆蓋驗證模式。
</ParamField>
<ParamField path="--token <token>" type="string">
  覆蓋 Token（同時為程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
</ParamField>
<ParamField path="--password <password>" type="string">
  覆蓋密碼。
</ParamField>
<ParamField path="--password-file <path>" type="string">
  從檔案讀取 Gateway 密碼。
</ParamField>
<ParamField path="--tailscale <off|serve|funnel>" type="string">
  透過 Tailscale 公開 Gateway。
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  在關閉時重設 Tailscale serve/funnel 設定。
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  允許在設定中沒有 `gateway.mode=local` 的情況下啟動 Gateway。僅針對臨時/開發引導程序略過啟動防護；不會寫入或修復設定檔。
</ParamField>
<ParamField path="--dev" type="boolean">
  如果缺少開發設定 + 工作區，則建立一個（跳過 BOOTSTRAP.md）。
</ParamField>
<ParamField path="--reset" type="boolean">
  重設開發設定 + 憑證 + 會話 + 工作區（需要 `--dev`）。
</ParamField>
<ParamField path="--force" type="boolean">
  在啟動前終止選定連接埠上任何現有的監聽器。
</ParamField>
<ParamField path="--verbose" type="boolean">
  詳細日誌。
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean">
  只在主控台顯示 CLI 後端日誌（並啟用 stdout/stderr）。
</ParamField>
<ParamField path="--ws-log <auto|full|compact>" type="string" default="auto">
  Websocket 日誌樣式。
</ParamField>
<ParamField path="--compact" type="boolean">
  `--ws-log compact` 的別名。
</ParamField>
<ParamField path="--raw-stream" type="boolean">
  將原始模型串流事件記錄到 l。
</ParamField>
<ParamField path="--raw-stream-path <path>" type="string">
  原始串流 l 路徑。
</ParamField>

<Warning>Inline `--password` 可能在本機程序列表中暴露。建議優先使用 `--password-file`、環境變數或由 SecretRef 支援的 `gateway.auth.password`。</Warning>

### 啟動分析

- 設定 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以在 Gateway 啟動期間記錄各階段的時間，包括各階段的 `eventLoopMax` 延遲，以及 installed-index、manifest registry、startup planning 和 owner-map 工作的插件查找表時間。
- 執行 `pnpm test:startup:gateway -- --runs 5 --warmup 1` 以對 Gateway 啟動進行基準測試。該基準測試會記錄首次程序輸出、`/healthz`、`/readyz`、啟動追蹤時間、事件循環延遲以及插件查找表的時間詳情。

## 查詢正在執行的 Gateway

所有查詢指令皆使用 WebSocket RPC。

<Tabs>
  <Tab title="輸出模式">
    - 預設：人類可讀（在 TTY 中帶有顏色）。
    - `--json`：機器可讀的 JSON（無樣式/旋轉圖示）。
    - `--no-color`（或 `NO_COLOR=1`）：停用 ANSI 同時保留人類可讀佈局。
  </Tab>
  <Tab title="共用選項">
    - `--url <url>`：Gateway WebSocket URL。
    - `--token <token>`：Gateway 權杖。
    - `--password <password>`：Gateway 密碼。
    - `--timeout <ms>`：逾時/預算（因指令而異）。
    - `--expect-final`：等待「最終」回應（agent 呼叫）。
  </Tab>
</Tabs>

<Note>當您設定 `--url` 時，CLI 不會回退至設定檔或環境認證。請明確傳遞 `--token` 或 `--password`。缺少明確認證將視為錯誤。</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端點是活躍度探測：一旦伺服器能回應 HTTP 即會傳回。HTTP `/readyz` 端點則更為嚴格，當啟動 sidecar、通道或已設定的 hooks 仍在準備時會保持紅色狀態。

### `gateway usage-cost`

從會話日誌中取得使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

<ParamField path="--days <days>" type="number" default="30">
  要包含的天數。
</ParamField>

### `gateway stability`

從正在執行的 Gateway 取得最近的診斷穩定性記錄器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

<ParamField path="--limit <limit>" type="number" default="25">
  要包含的最近事件的最大數量（最大 `1000`）。
</ParamField>
<ParamField path="--type <type>" type="string">
  依診斷事件類型篩選，例如 `payload.large` 或 `diagnostic.memory.pressure`。
</ParamField>
<ParamField path="--since-seq <seq>" type="number">
  僅包含診斷序號之後的事件。
</ParamField>
<ParamField path="--bundle [path]" type="string">
  讀取持續化的穩定性套件，而不是呼叫正在執行的 Gateway。請使用 `--bundle latest`（或僅使用 `--bundle`）來指定狀態目錄下的最新套件，或直接傳遞套件 JSON 路徑。
</ParamField>
<ParamField path="--export" type="boolean">
  寫入可分享的支援診斷 zip 檔案，而不是列印穩定性詳細資訊。
</ParamField>
<ParamField path="--output <path>" type="string">
  `--export` 的輸出路徑。
</ParamField>

<AccordionGroup>
  <Accordion title="隱私權與套件行為">
    - 記錄會保留操作元資料：事件名稱、計數、位元組大小、記憶體讀數、佇列/會話狀態、通道/外掛名稱，以及編輯過的會話摘要。它們不會保留聊天文字、Webhook 內文、工具輸出、原始請求或回應內文、權杖、Cookies、機密值、主機名稱或原始會話 ID。設定 `diagnostics.enabled: false` 即可完全停用記錄器。 - 當 Gateway 發生嚴重錯誤退出、關機逾時或重新啟動失敗時，若記錄器中有事件，OpenClaw 會將相同的診斷快照寫入
    `~/.openclaw/logs/stability/openclaw-stability-*.json`。請使用 `openclaw gateway stability --bundle latest` 檢查最新的套件；`--limit`、`--type` 和 `--since-seq` 也適用於套件輸出。
  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

寫入一個本機診斷壓縮檔，專門設計用於附加至錯誤報告。關於隱私權模型和套件內容，請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  輸出 zip 路徑。預設為狀態目錄下的支援匯出。
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  包含的清理日誌行數上限。
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  檢查的日誌位元組數上限。
</ParamField>
<ParamField path="--url <url>" type="string">
  健康快照的 Gateway WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  健康快照的 Gateway Token。
</ParamField>
<ParamField path="--password <password>" type="string">
  健康快照的 Gateway 密碼。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  狀態/健康快照逾時。
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  略過持久化穩定性套件查閱。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式列印寫入路徑、大小和清單。
</ParamField>

匯出包含清單、Markdown 摘要、設定形狀、清理設定細節、清理日誌摘要、清理 Gateway 狀態/健康快照，以及最新的穩定性套件（如果存在）。

它旨在用於分享。它保留了有助於除錯的操作細節，例如安全的 OpenClaw 日誌欄位、子系統名稱、狀態碼、持續時間、設定模式、連接埠、外掛 ID、提供者 ID、非秘密功能設定和編修的操作日誌訊息。它會省略或編修聊天文字、Webhook 內文、工具輸出、憑證、Cookies、帳號/訊息識別符、提示/指令文字、主機名稱和秘密值。當 LogTape 風格的訊息看起來像是使用者/聊天/工具承載文字時，匯出僅保留訊息已被省略及其位元組數。

### `gateway status`

`gateway status` 會顯示 Gateway 服務（launchd/systemd/schtasks），並可選擇性探查連線/認證能力。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  新增一個明確的探測目標。已設定的遠端 + 本機主機仍會被探測。
</ParamField>
<ParamField path="--token <token>" type="string">
  用於探測的 Token 認證。
</ParamField>
<ParamField path="--password <password>" type="string">
  用於探測的密碼認證。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  探測逾時時間。
</ParamField>
<ParamField path="--no-probe" type="boolean">
  跳過連線探測（僅顯示服務）。
</ParamField>
<ParamField path="--deep" type="boolean">
  同時掃描系統層級的服務。
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  將預設的連線探測升級為讀取探測，並在讀取探測失敗時以非零狀態碼結束。無法與 `--no-probe` 並用。
</ParamField>

<AccordionGroup>
  <Accordion title="Status semantics">
    - 即使本機 CLI 設定缺失或無效，`gateway status` 仍可用於診斷。 - 預設的 `gateway status` 可證明服務狀態、WebSocket 連線以及交握時可見的認證能力。它不會證明讀取/寫入/管理員操作。 - 對於首次設備認證，診斷探查是非變異的：當存在現有的快取設備權杖時，它們會重複使用，但不會僅為了檢查狀態而建立新的 CLI 設備身分或唯讀設備配對記錄。 - `gateway status` 會盡可能解析設定的認證 SecretRefs 以用於探查認證。
    - 如果在此指令路徑中所需的認證 SecretRef 未能解析，當探查連線/認證失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。 - 如果探查成功，將隱藏未解析的 auth-ref 警告以避免誤報。 - 在腳本和自動化中使用 `--require-rpc`，當僅有監聽中的服務不足且您需要讀取範圍的 RPC 呼叫也正常時。 - `--deep` 增加了對額外 launchd/systemd/schtasks
    安裝的盡力掃描。當偵測到多個類似 Gateway 的服務時，人類可讀的輸出會列印清理提示並警告大多數設定應在每台機器上執行一個 Gateway。 - 人類可讀的輸出包含解析後的檔案日誌路徑以及 CLI 對服務的設定路徑/有效性快照，以協助診斷設定檔或狀態目錄的漂移。
  </Accordion>
  <Accordion title="Linux systemd auth-drift checks">
    - 在 Linux systemd 安裝中，服務認證漂移檢查會讀取單元中的 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、帶引號的路徑、多個檔案以及可選的 `-` 檔案）。 - 漂移檢查使用合併的執行時環境（優先使用服務指令環境，然後是行程環境備用）來解析 `gateway.auth.token` SecretRefs。 - 如果令牌認證未實際生效（顯式 `gateway.auth.mode` 為
    `password`/`none`/`trusted-proxy`，或模式未設定且密碼可獲勝且沒有令牌候選者可獲勝），令牌漂移檢查將跳過配置令牌解析。
  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` 是「除錯所有內容」的指令。它總是探測：

- 您設定的遠端閘道（如果已設定），以及
- localhost（loopback）**即使已設定遠端閘道**。

如果您傳遞 `--url`，該明確目標會被加入到這兩者之前。人類可讀的輸出會將目標標記為：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

<Note>如果有多個閘道可連線，它會列印所有閘道。當您使用隔離的設定檔/連接埠（例如救援 bot）時，支援多個閘道，但大多數安裝仍然只執行單一閘道。</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="解讀">
    - `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連接。
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 回報了探測能證明的關於認證的資訊。這與可達性分開。
    - `Read probe: ok` 表示讀取範圍的詳細 RPC 呼叫 (`health`/`status`/`system-presence`/`config.get`) 也成功了。
    - `Read probe: limited - missing scope: operator.read` 表示連接成功，但讀取範圍的受限於 RPC。這被回報為**降級** 的可達性，而非完全失敗。
    - 就像 `gateway status` 一樣，探測會重複使用現有的快取裝置認證，但不會建立首次裝置身分或配對狀態。
    - 只有當沒有被探測的目標可達時，結束代碼才會是非零值。
  </Accordion>
  <Accordion title="JSON 輸出">
    頂層：

    - `ok`：至少有一個目標是可連線的。
    - `degraded`：至少有一個目標具有範圍限制的詳細資訊 RPC。
    - `capability`：在所有可連線目標中看到的最佳能力（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`：視為目前啟用獲勝者的最佳目標，順序為：明確 URL、SSH 通道、已設定的遠端，然後是本地迴路。
    - `warnings[]`：盡力而為的警告記錄，包含 `code`、`message` 和選用的 `targetIds`。
    - `network`：根據目前設定和主機網路推導出的本地迴路/tailnet URL 提示。
    - `discovery.timeoutMs` 和 `discovery.count`：此次探測階段使用的實際探索預算/結果計數。

    每個目標（`targets[].connect`）：

    - `ok`：連線後的可達性 + 降級分類。
    - `rpcOk`：完整詳細資訊 RPC 成功。
    - `scopeLimited`：詳細資訊 RPC 因缺少操作員範圍而失敗。

    每個目標（`targets[].auth`）：

    - `role`：可用時在 `hello-ok` 中回報的驗證角色。
    - `scopes`：可用時在 `hello-ok` 中回報的授權範圍。
    - `capability`：該目標的表面化驗證能力分類。

  </Accordion>
  <Accordion title="常見警告代碼">
    - `ssh_tunnel_failed`：SSH 通道設定失敗；指令回退為直接探測。
    - `multiple_gateways`：有一個以上的目標可連接；除非您故意執行獨立的設定檔（例如救援機器人），否則這很罕見。
    - `auth_secretref_unresolved`：無法解析失敗目標的已設定 auth SecretRef。
    - `probe_scope_limited`：WebSocket 連線成功，但讀取探測受到缺少 `operator.read` 的限制。
  </Accordion>
</AccordionGroup>

#### 透過 SSH 遠端（Mac app 相容性）

macOS app 的「透過 SSH 遠端」模式會使用本地連接埠轉發，讓遠端 Gateway（可能僅綁定至 loopback）可在 `ws://127.0.0.1:<port>` 上連接。

CLI 對等項目：

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` 或 `user@host:port`（連接埠預設為 `22`）。
</ParamField>
<ParamField path="--ssh-identity <path>" type="string">
  身分檔案。
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  從解析出的探索端點（`local.` 加上設定的廣域網域名稱（若有））中，選擇第一個探索到的 Gateway 主機作為 SSH 目標。僅 TXT 的提示會被忽略。
</ParamField>

設定（選用，作為預設值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低階 RPC 輔助工具。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

<ParamField path="--params <json>" type="string" default="{}">
  參數的 JSON 物件字串。
</ParamField>
<ParamField path="--url <url>" type="string">
  Gateway WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  Gateway 權杖。
</ParamField>
<ParamField path="--password <password>" type="string">
  Gateway 密碼。
</ParamField>
<ParamField path="--timeout <ms>" type="number">
  逾時預算。
</ParamField>
<ParamField path="--expect-final" type="boolean">
  主要用於在最終負載之前傳輸中間事件的代理式 RPC。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀的 JSON 輸出。
</ParamField>

<Note>`--params` 必須是有效的 JSON。</Note>

## 管理 Gateway 服務

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

### 使用包裝程式安裝

當受管理的服務必須透過另一個可執行檔啟動時，請使用 `--wrapper`，例如秘密管理器 shim 或 run-as helper。包裝程式會接收正常的 Gateway 參數，並負責最終執行 `openclaw` 或帶有這些參數的 Node。

```bash
cat > ~/.local/bin/openclaw-doppler <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec doppler run --project my-project --config production -- openclaw "$@"
EOF
chmod +x ~/.local/bin/openclaw-doppler

openclaw gateway install --wrapper ~/.local/bin/openclaw-doppler --force
openclaw gateway restart
```

您也可以透過環境設定包裝程式。`gateway install` 會驗證該路徑是否為可執行檔，將包裝程式寫入服務 `ProgramArguments`，並將 `OPENCLAW_WRAPPER` 保存於服務環境中，以便日後的強制重新安裝、更新和 doctor 修復。

```bash
OPENCLAW_WRAPPER="$HOME/.local/bin/openclaw-doppler" openclaw gateway install --force
openclaw doctor
```

若要移除已保存的包裝程式，請在重新安裝時清除 `OPENCLAW_WRAPPER`：

```bash
OPENCLAW_WRAPPER= openclaw gateway install --force
openclaw gateway restart
```

<AccordionGroup>
  <Accordion title="指令選項">
    - `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
    - `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`
    - `gateway uninstall|start|stop|restart`: `--json`
  </Accordion>
  <Accordion title="生命週期行為">
    - 使用 `gateway restart` 重新啟動受管理的服務。請勿將 `gateway stop` 和 `gateway start` 連結起來作為重新啟動的替代方案；在 macOS 上，`gateway stop` 會在停止之前刻意停用 LaunchAgent。
    - 生命週期指令接受 `--json` 以用於編寫腳本。
  </Accordion>
  <Accordion title="安裝時期的驗證與 SecretRefs">
    - 當 token 驗證需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析出的 token 持久化到服務環境元數據中。
    - 如果 token 驗證需要 token 且配置的 token SecretRef 無法解析，安裝將以失敗封閉（fail closed）處理，而不是持久化後備純文本。
    - 對於 `gateway run` 上的密碼驗證，建議優先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支援的 `gateway.auth.password`，而非內聯的 `--password`。
    - 在推斷驗證模式下，僅限 shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不會放寬安裝 token 的要求；安裝受管服務時，請使用持久化配置（`gateway.auth.password` 或 config `env`）。
    - 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將會被阻擋，直到明確設定模式。
  </Accordion>
</AccordionGroup>

## 探索閘道 (Bonjour)

`gateway discover` 會掃描閘道訊標 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (Wide-Area Bonjour)：選擇一個網域（例如：`openclaw.internal.`）並設定分割 DNS + DNS 伺服器；請參閱 [Bonjour](/zh-Hant/gateway/bonjour)。

只有啟用 Bonjour 探索功能的閘道（預設）才會廣播訊標。

廣域探索記錄包含 (TXT)：

- `role` (閘道角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 連接埠，通常為 `18789`)
- `sshPort` (可選；當缺少此項時，客戶端預設將 SSH 目標設為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，當可用時)
- `gatewayTls` / `gatewayTlsSha256` (TLS 已啟用 + 憑證指紋)
- `cliPath` (remote-install hint written to the wide-area zone)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  每個指令的超時時間 (browse/resolve)。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀輸出 (同時停用樣式/轉圈動畫)。
</ParamField>

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>- 當啟用廣域網域時，CLI 會掃描 `local.` 加上設定的廣域網域。 - JSON 輸出中的 `wsUrl` 是從解析出的服務端點衍生的，而非來自僅限 TXT 的提示，例如 `lanHost` 或 `tailnetDns`。 - 在 `local.` mDNS 上，僅當 `discovery.mdns.mode` 為 `full` 時，才會廣播 `sshPort` 和 `cliPath`。廣域 DNS-SD 仍會寫入 `cliPath`；`sshPort` 在那裡也保持選用狀態。</Note>

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Gateway 執行手冊](/zh-Hant/gateway)
