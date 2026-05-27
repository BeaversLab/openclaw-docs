---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢與探索 Gateway"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "閘道"
sidebarTitle: "閘道"
---

Gateway 是 OpenClaw 的 WebSocket 伺服器（通道、節點、工作階段、掛鉤）。本頁中的子指令位於 `openclaw gateway …` 之下。

<CardGroup cols={3}>
  <Card title="Bonjour 探索" href="/zh-Hant/gateway/bonjour">
    本機 mDNS + 廣域 DNS-SD 設定。
  </Card>
  <Card title="探索概覽" href="/zh-Hant/gateway/discovery">
    OpenClaw 如何廣告與尋找閘道。
  </Card>
  <Card title="設定" href="/zh-Hant/gateway/configuration">
    頂層閘道配置鍵。
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
    - 預設情況下，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則 Gateway 會拒絕啟動。請使用 `--allow-unconfigured` 進行臨時/開發執行。
    - 預期 `openclaw onboard --mode local` 和 `openclaw setup` 會寫入 `gateway.mode=local`。如果檔案存在但缺少 `gateway.mode`，請將其視為損壞或被覆寫的設定並進行修復，而不是隱含地假設為本機模式。
    - 如果檔案存在且缺少 `gateway.mode`，Gateway 會將其視為可疑的設定損壞，並拒絕為您「猜測本機」。
    - 未經驗證而繫結到 loopback 之外會被封鎖（安全防護機制）。
    - `lan`、`tailnet` 和 `custom` 目前僅透過 IPv4 的 BYOH 路徑進行解析。
    - 目前此路徑不原生支援僅 IPv6 的 BYOH。如果主機本身是僅 IPv6，請使用 IPv4 sidecar 或 proxy。
    - `SIGUSR1` 在獲得授權時會觸發程序內重啟（`commands.restart` 預設為啟用；設定 `commands.restart: false` 以封鎖手動重啟，但仍然允許 gateway tool/config apply/update）。
    - `SIGINT`/`SIGTERM` 處理程式會停止 gateway 程序，但它們不會還原任何自訂終端機狀態。如果您使用 TUI 或 raw-mode 輸入包裝 CLI，請在退出前還原終端機。

  </Accordion>
</AccordionGroup>

### 選項

<ParamField path="--port <port>" type="number">
  WebSocket 連接埠（預設值來自配置/環境變數；通常為 `18789`）。
</ParamField>
<ParamField path="--bind <loopback|lan|tailnet|auto|custom>" type="string">
  監聽器綁定模式。`lan`、`tailnet` 和 `custom` 目前僅透過 IPv4 路徑解析。
</ParamField>
<ParamField path="--auth <token|password>" type="string">
  覆寫驗證模式。
</ParamField>
<ParamField path="--token <token>" type="string">
  覆寫 Token（同時為該程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
</ParamField>
<ParamField path="--password <password>" type="string">
  覆寫密碼。
</ParamField>
<ParamField path="--password-file <path>" type="string">
  從檔案讀取 Gateway 密碼。
</ParamField>
<ParamField path="--tailscale <off|serve|funnel>" type="string">
  透過 Tailscale 公開 Gateway。
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  在關機時重設 Tailscale serve/funnel 配置。
</ParamField>
<ParamField path="--bind custom + gateway.customBindHost" type="string">
  目前預期為 IPv4 位址。對於僅限 IPv6 的 BYOH，請在 Gateway 前放置一個 IPv4 sidecar 或 proxy，並將 OpenClaw 指向該 IPv4 端點。
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  允許在配置中沒有 `gateway.mode=local` 的情況下啟動 Gateway。僅繞過臨時/開發引導的啟動防護；不會寫入或修復配置檔案。
</ParamField>
<ParamField path="--dev" type="boolean">
  如果缺少，則建立開發配置 + 工作區（跳過 BOOTSTRAP.md）。
</ParamField>
<ParamField path="--reset" type="boolean">
  重設開發配置 + 憑證 + 會話 + 工作區（需要 `--dev`）。
</ParamField>
<ParamField path="--force" type="boolean">
  在啟動前終止所選連接埠上任何現有的監聽器。
</ParamField>
<ParamField path="--verbose" type="boolean">
  詳細日誌。
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean">
  只在控制台中顯示 CLI 後端日誌（並啟用 stdout/stderr）。
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

## 重新啟動 Gateway

```bash
openclaw gateway restart
openclaw gateway restart --safe
openclaw gateway restart --safe --skip-deferral
openclaw gateway restart --force
```

`openclaw gateway restart --safe` 會要求正在執行的 Gateway 在重新啟動前對作用中的 OpenClaw 工作進行預檢。如果已排隊的操作、回覆傳遞、嵌入式執行或任務執行正在進行中，Gateway 會回報阻礙因素，合併重複的安全重新啟動請求，並在作用中的工作排空後重新啟動。單純的 `restart` 會保留現有的服務管理員行為以保持相容性。僅當您明確想要立即覆寫路徑時，才使用 `--force`。

`openclaw gateway restart --safe --skip-deferral` 會執行與 `--safe` 相同的 OpenClaw 感知協調重新啟動，但會繞過作用中工作的延遲閘門，因此即使回報了阻礙因素，Gateway 也會立即發出重新啟動訊號。當延遲被卡住的任務執行固定住，且單獨使用 `--safe` 會無限期等待時，請將其作為操作員的緊急應變手段。`--skip-deferral` 需要 `--safe`。

<Warning>行內 `--password` 可能會在本機程序清單中暴露。建議優先使用 `--password-file`、環境變數，或由 SecretRef 支援的 `gateway.auth.password`。</Warning>

### Gateway 分析

- 設定 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以在 Gateway 啟動期間記錄階段時序，包括每個階段的 `eventLoopMax` 延遲，以及針對安裝索引、清單註冊表、啟動規劃和擁有者對映工作的插件查詢表時序。
- 設定 `OPENCLAW_GATEWAY_RESTART_TRACE=1` 以記錄重新啟動範圍的 `restart trace:` 行，內容涵蓋重新啟動訊號處理、作用中工作排空、關閉階段、下一次啟動、就緒時序和記憶體指標。
- 使用 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=<path>` 設定 `OPENCLAW_DIAGNOSTICS=timeline`，以盡力寫入用於外部 QA 測試工具的 JSONL 啟動診斷時間軸。您也可以在設定中使用 `diagnostics.flags: ["timeline"]` 啟用該旗標；路徑仍由環境變數提供。新增 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` 以包含事件迴圈範例。
- 先執行 `pnpm build`，然後執行 `pnpm test:startup:gateway -- --runs 5 --warmup 1`，以對照建置的 CLI 項目來對 Gateway 啟動進行基準測試。該基準測試會記錄首次程序輸出、`/healthz`、`/readyz`、啟動追蹤時間、事件迴圈延遲以及外掛查找表的時間細節。
- 先執行 `pnpm build`，然後執行 `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`，以在 macOS 或 Linux 上對照建置的 CLI 項目來對程序內 Gateway 重啟進行基準測試。重啟基準測試使用 SIGUSR1，在子程序中同時啟用啟動和重啟追蹤，並記錄下一次 `/healthz`、下一次 `/readyz`、停機時間、就緒時間、CPU、RSS 和重啟追蹤指標。
- 將 `/healthz` 視為存活性（liveness），將 `/readyz` 視為可用就緒度（readiness）。追蹤行和基準測試輸出用於負責人歸屬；請勿將單一追蹤範圍或單一樣本視為完整的效能結論。

## 查詢正在執行的 Gateway

所有查詢指令皆使用 WebSocket RPC。

<Tabs>
  <Tab title="輸出模式">
    - 預設：人類可讀（在 TTY 中帶有顏色）。
    - `--json`：機器可讀的 JSON（無樣式/旋轉符號）。
    - `--no-color`（或 `NO_COLOR=1`）：停用 ANSI 同時保留人類可讀的排版。

  </Tab>
  <Tab title="共用選項">
    - `--url <url>`：Gateway WebSocket URL。
    - `--token <token>`：Gateway token。
    - `--password <password>`：Gateway 密碼。
    - `--timeout <ms>`：逾時/預算（依指令而異）。
    - `--expect-final`：等待「最終」回應（agent 呼叫）。

  </Tab>
</Tabs>

<Note>當您設定 `--url` 時，CLI 不會回退至設定檔或環境變數的認證資訊。請明確傳遞 `--token` 或 `--password`。缺少明確的認證資訊視為錯誤。</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端點是存活探測：一旦伺服器可以回應 HTTP，它就會返回。HTTP `/readyz` 端點更為嚴格，在啟動外掛程式 sidecar、通道或設定的 hooks 尚在穩定期時會保持紅色。本地或已驗證的詳細就緒回應包含一個 `eventLoop` 診斷區塊，其中包含事件迴圈延遲、事件迴圈使用率、CPU 核心比例以及 `degraded` 標誌。

### `gateway usage-cost`

從工作階段日誌中擷取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

<ParamField path="--days <days>" type="number" default="30">
  要包含的天數。
</ParamField>

### `gateway stability`

從執行中的 Gateway 擷取最近的診斷穩定性記錄器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

<ParamField path="--limit <limit>" type="number" default="25">
  要包含的最近事件的最大數量（最多 `1000`）。
</ParamField>
<ParamField path="--type <type>" type="string">
  依診斷事件類型過濾，例如 `payload.large` 或 `diagnostic.memory.pressure`。
</ParamField>
<ParamField path="--since-seq <seq>" type="number">
  僅包含診斷序號之後的事件。
</ParamField>
<ParamField path="--bundle [path]" type="string">
  讀取持久的穩定性套件，而不是呼叫正在執行的 Gateway。使用 `--bundle latest`（或僅用 `--bundle`）來取得狀態目錄下最新的套件，或直接傳入套件 JSON 路徑。
</ParamField>
<ParamField path="--export" type="boolean">
  寫入可分享的支援診斷 zip 檔案，而不是列印穩定性詳細資訊。
</ParamField>
<ParamField path="--output <path>" type="string">
  `--export` 的輸出路徑。
</ParamField>

<AccordionGroup>
  <Accordion title="隱私權與套件行為">
    - 記錄會保留運作元資料：事件名稱、計數、位元組大小、記憶體讀數、佇列/會話狀態、頻道/外掛程式名稱，以及經過編修的會話摘要。它們不會保留聊天文字、Webhook 內文、工具輸出、原始請求或回應內文、Token、Cookie、機密值、主機名稱或原始會話 ID。設定 `diagnostics.enabled: false` 以完全停用記錄器。
    - 當 Gateway 發生嚴重錯誤退出、關機逾時，以及重新啟動啟動失敗時，若記錄器包含事件，OpenClaw 會將相同的診斷快照寫入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。請使用 `openclaw gateway stability --bundle latest` 檢查最新的套件；`--limit`、`--type` 和 `--since-seq` 也適用於套件輸出。

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

寫入一個設計用於附加至錯誤報告的本機診斷 zip 檔案。關於隱私權模型和套件內容，請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  輸出 zip 路徑。預設為狀態目錄下的支援匯出。
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  要包含的經過清理的最大日誌行數。
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  要檢查的最大日誌位元組數。
</ParamField>
<ParamField path="--url <url>" type="string">
  健康快照的 Gateway WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  健康快照的 Gateway 權杖。
</ParamField>
<ParamField path="--password <password>" type="string">
  健康快照的 Gateway 密碼。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  狀態/健康快照逾時。
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  跳過持久化的穩定性套件查詢。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式列印寫入的路徑、大小和清單。
</ParamField>

匯出包含一份清單、Markdown 摘要、設定結構、已清理的設定詳情、已清理的日誌摘要、已清理的 Gateway 狀態/健康快照，以及最新的穩定性套件（如果存在的話）。

此匯出旨在供分享使用。它保留了有助於偵錯的操作細節，例如安全的 OpenClaw 日誌欄位、子系統名稱、狀態代碼、持續時間、配置模式、連接埠、外掛程式 ID、提供者 ID、非機密功能設定以及已編修的操作日誌訊息。它會略過或編修聊天文字、Webhook 內容、工具輸出、憑證、Cookie、帳戶/訊息識別碼、提示/指令文字、主機名稱和機密值。當 LogTape 風格的訊息看起來像是使用者/聊天/工具的載荷文字時，匯出僅保留該訊息已被略過的事實及其位元組數。

### `gateway status`

`gateway status` 顯示 Gateway 服務（launchd/systemd/schtasks）以及可選的連線/認證功能探測。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  新增一個明確的探測目標。已設定的遠端 + 本地主機仍會被探測。
</ParamField>
<ParamField path="--token <token>" type="string">
  探測的 Token 驗證。
</ParamField>
<ParamField path="--password <password>" type="string">
  探測的密碼驗證。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  探測逾時。
</ParamField>
<ParamField path="--no-probe" type="boolean">
  跳過連線探測（僅服務檢視）。
</ParamField>
<ParamField path="--deep" type="boolean">
  一併掃描系統層級的服務。
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  將預設的連線探測升級為讀取探測，並在讀取探測失敗時以非零狀態碼結束。不可與 `--no-probe` 搭配使用。
</ParamField>

<AccordionGroup>
  <Accordion title="Status semantics">
    - 即使本機 CLI 設定遺失或無效，`gateway status` 仍可用於診斷。
    - 預設的 `gateway status` 可證明服務狀態、WebSocket 連線，以及在交握時可見的認證能力。它不會證明讀取/寫入/管理員操作。
    - 對於首次裝置認證，診斷探測是非變動性的：當存在現有的快取裝置權杖時，它們會重複使用，但不會僅為了檢查狀態而建立新的 CLI 裝置身分或唯讀裝置配對記錄。
    - `gateway status` 會在可能時解析已設定的認證 SecretRef 以用於探測認證。
    - 如果所需的認證 SecretRef 在此指令路徑中未解析，當探測連線/認證失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析秘密來源。
    - 如果探測成功，將會抑制未解析的 auth-ref 警告以避免誤報。
    - 當啟用探測時，如果執行中的 Gateway 回報，JSON 輸出將包含 `gateway.version`；如果後續的交握探測無法提供版本中繼資料，`--require-rpc` 可以回退到 `status.runtimeVersion` RPC 載荷。
    - 在腳本和自動化中使用 `--require-rpc`，當僅有監聽服務不足且您需要讀取範圍的 RPC 呼叫也正常時。
    - `--deep` 增加了針對額外 launchd/systemd/schtasks 安裝的最佳努力掃描。當偵測到多個類似 Gateway 的服務時，人類可讀輸出會列印清理提示並警告大多數設定應在每台機器上執行一個 gateway。
    - `--deep` 也會在服務程序為外部監督器重新啟動而乾淨退出時，回報最近的 Gateway 監督器重新啟動交接。
    - `--deep` 在外掛感知模式 (`pluginValidation: "full"`) 下執行設定驗證，並顯示已設定的外掛清單警告（例如遺漏通道設定中繼資料），以便安裝和更新檢測能夠捕捉它們。預設的 `gateway status` 保持跳過外掛驗證的快速唯讀路徑。
    - 人類可讀輸出包含解析後的檔案記錄路徑以及 CLI 與服務的設定路徑/有效性快照，以協助診斷設定檔或狀態目錄漂移。

  </Accordion>
  <Accordion title="Linux systemd 認證漂移檢查">
    - 在安裝了 Linux systemd 的系統上，服務認證漂移檢查會讀取單元（unit）中的 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、帶引號的路徑、多個檔案以及可選的 `-` 檔案）。
    - 漂移檢查使用合併後的執行時環境（優先使用服務指令環境，然後是程序環境後備）來解析 `gateway.auth.token` SecretRefs。
    - 如果 Token 認證未有效啟用（顯式設置了 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或在密碼可優先且無 Token 候選可優先的情況下未設置模式），Token 漂移檢查將跳過設定檔 Token 解析。

  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` 是「偵錯所有內容」的指令。它始終會探查：

- 您設定的遠端 Gateway（如果已設定），以及
- localhost（回環）**即使已設定遠端**。

如果您傳遞 `--url`，該明確目標會被加入到這兩者之前。人類可讀輸出會將目標標記為：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

<Note>如果有多個 Gateway 可達，它會列印出所有 Gateway。當您使用隔離的設定檔/連接埠（例如救援機器人）時，支援多個 Gateway，但大多數安裝仍運行單一 Gateway。</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="解讀">
    - `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 回報探針能證實的認證資訊。這與可達性是分開的。
    - `Read probe: ok` 表示讀取範圍的詳細 RPC 呼叫（`health`/`status`/`system-presence`/`config.get`）也成功了。
    - `Read probe: limited - missing scope: operator.read` 表示連線成功，但讀取範圍的 RPC 受到限制。這會被回報為**部分降級** 的可達性，而非完全失敗。
    - `Read probe: failed` 出現在 `Connect: ok` 之後，表示 Gateway 接受了 WebSocket 連線，但後續的讀取診斷逾時或失敗。這也是**部分降級** 的可達性，並非 Gateway 無法連線。
    - 就像 `gateway status`，探針會重複使用現有的快取裝置認證，但並不會建立初次使用的裝置身分或配對狀態。
    - 僅當沒有受測目標可達時，結束代碼（Exit code）才不為零。

  </Accordion>
  <Accordion title="JSON output">
    頂層：

    - `ok`：至少有一個目標是可連線的。
    - `degraded`：至少有一個目標接受了連線，但未完成完整的詳細 RPC 診斷。
    - `capability`：在可連線的目標中看到最佳功能（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`：視為活躍獲勝者的最佳目標，順序如下：明確 URL、SSH tunnel、設定的遠端，然後是本機 loopback。
    - `warnings[]`：盡力而為的警告記錄，包含 `code`、`message` 和可選的 `targetIds`。
    - `network`：從目前設定和主機網路衍生的本機 loopback/tailnet URL 提示。
    - `discovery.timeoutMs` 和 `discovery.count`：此探測回合使用的實際探索預算/結果計數。

    每個目標 (`targets[].connect`)：

    - `ok`：連線後的可達性 + 降級分類。
    - `rpcOk`：完整詳細 RPC 成功。
    - `scopeLimited`：因缺少操作員範圍而導致的詳細 RPC 失敗。

    每個目標 (`targets[].auth`)：

    - `role`：可用時，在 `hello-ok` 中回報的授權角色。
    - `scopes`：可用時，在 `hello-ok` 中回報的已授予範圍。
    - `capability`：該目標的介面授權功能分類。

  </Accordion>
  <Accordion title="常見警告代碼">
    - `ssh_tunnel_failed`：SSH 隧道設定失敗；指令已回退至直接探測。
    - `multiple_gateways`：有多個目標可連線；除非您刻意執行獨立的設定檔（例如救援機器人），否則這並不尋常。
    - `auth_secretref_unresolved`：無法解析失敗目標的已設定 auth SecretRef。
    - `probe_scope_limited`：WebSocket 連線成功，但讀取探測因缺少 `operator.read` 而受限。

  </Accordion>
</AccordionGroup>

#### 透過 SSH 遠端連線 (Mac 應用程式對等功能)

macOS 應用程式的「透過 SSH 遠端」模式使用本地埠轉發，因此遠端閘道（可能僅綁定至 loopback）可在 `ws://127.0.0.1:<port>` 連線。

CLI 對應指令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` 或 `user@host:port`（埠預設為 `22`）。
</ParamField>
<ParamField path="--ssh-identity <path>" type="string">
  身分檔案。
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  從解析後的探索端點（`local.` 加上設定的廣域網域，若有）中，選取第一個發現的閘道主機作為 SSH 目標。僅限 TXT 的提示會被忽略。
</ParamField>

設定 (選用，作為預設值)：

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
  主要用於在傳送最終載荷之前串流中間事件的代理程式式別 RPC。
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

當受管理服務必須透過另一個可執行檔啟動時，請使用 `--wrapper`，例如秘密管理器 shim 或 run-as helper。Wrapper 會接收標準的 Gateway 參數，並負責最終執行 `openclaw` 或具有這些參數的 Node。

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

您也可以透過環境設定 wrapper。`gateway install` 會驗證路徑是否為可執行檔，將 wrapper 寫入服務 `ProgramArguments` 中，並將 `OPENCLAW_WRAPPER` 保留在服務環境中，以供日後強制重新安裝、更新和診斷修復使用。

```bash
OPENCLAW_WRAPPER="$HOME/.local/bin/openclaw-doppler" openclaw gateway install --force
openclaw doctor
```

若要移除已保留的 wrapper，請在重新安裝時清除 `OPENCLAW_WRAPPER`：

```bash
OPENCLAW_WRAPPER= openclaw gateway install --force
openclaw gateway restart
```

<AccordionGroup>
  <Accordion title="指令選項">
    - `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
    - `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`
    - `gateway restart`: `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`
    - `gateway uninstall|start`: `--json`
    - `gateway stop`: `--disable`, `--json`

  </Accordion>
  <Accordion title="生命週期行為">
    - 使用 `gateway restart` 重新啟動受管服務。請勿將 `gateway stop` 和 `gateway start` 鏈接作為重新啟動的替代方案。
    - 在 macOS 上，`gateway stop` 預設使用 `launchctl bootout`，這會將 LaunchAgent 從當前啟動會話中移除，而不會持久化禁用狀態 — 針對未來崩潰的 KeepAlive 自動恢復保持啟用，並且 `gateway start` 可以乾淨地重新啟用，無需手動 `launchctl enable`。傳遞 `--disable` 以持久化抑制 KeepAlive 和 RunAtLoad，以便 Gateway 在下一次明確 `gateway start` 之前不會重新產生；當手動停止應在重新啟動或系統重啟後保持有效時，請使用此選項。
    - `gateway restart --safe` 要求正在執行的 Gateway 對活動的 OpenClaw 工作進行預檢，並將重新啟動延遲到回覆傳遞、嵌入式執行和任務執行排空為止。`--safe` 不能與 `--force` 或 `--wait` 結合使用。
    - `gateway restart --wait 30s` 覆寫該次重新啟動的設定重新啟動排空預算。純數字表示毫秒；接受諸如 `s`、`m` 和 `h` 等單位。`--wait 0` 表示無限期等待。
    - `gateway restart --safe --skip-deferral` 執行 OpenClaw 感知的安全重新啟動，但繞過延遲閘門，因此即使報告了阻礙因素，Gateway 也會立即發出重新啟動信號。這是針對卡住的任務執行延遲的操作員應急手段；需要 `--safe`。
    - `gateway restart --force` 跳過活動工作排空並立即重新啟動。當操作員已經檢查了列出的任務阻礙因素並希望立即讓 Gateway 恢復時，請使用它。
    - 生命週期指令接受 `--json` 進行腳本編寫。

  </Accordion>
  <Accordion title="安裝時期的驗證與 SecretRef">
    - 當 token 驗證需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析出的 token 持久化至服務環境中繼資料。
    - 如果 token 驗證需要 token 且設定的 token SecretRef 無法解析，安裝會失敗封閉，而不會持久化回退明文。
    - 針對 `gateway run` 上的密碼驗證，優先選用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支援的 `gateway.auth.password`，而非行內 `--password`。
    - 在推斷驗證模式下，僅限 shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不會放寬安裝 token 需求；安裝受控服務時請使用持久化設定（`gateway.auth.password` 或設定檔 `env`）。
    - 若同時設定 `gateway.auth.token` 與 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將會受阻，直到明確設定模式。

  </Accordion>
</AccordionGroup>

## 探索 Gateway（Bonjour）

`gateway discover` 掃描 Gateway 信標（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (Wide-Area Bonjour)：選擇一個網域（例如：`openclaw.internal.`）並設定 split DNS + DNS 伺服器；詳見 [Bonjour](/zh-Hant/gateway/bonjour)。

只有啟用 Bonjour 探索（預設）的 Gateway 會廣播信標。

廣域探索記錄可以包含以下 TXT 提示：

- `role` (gateway 角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 連接埠，通常為 `18789`)
- `sshPort` (僅限完整探索模式；當其不存在時，客戶端預設 SSH 目標為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，當可用時)
- `gatewayTls` / `gatewayTlsSha256` (已啟用 TLS + 憑證指紋)
- `cliPath` (僅限完整探索模式)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  每個指令逾時時間 (browse/resolve)。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀輸出 (同時停用樣式/載入動畫)。
</ParamField>

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
- 當啟用時，CLI 會掃描 `local.` 以及設定的廣域網域。
- JSON 輸出中的 `wsUrl` 是衍生自解析後的服務端點，而非僅來自 TXT 提示 (例如 `lanHost` 或 `tailnetDns`)。
- 在 `local.` mDNS 和廣域 DNS-SD 上，僅當 `discovery.mdns.mode` 為 `full` 時，才會發布 `sshPort` 和 `cliPath`。

</Note>

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Gateway 手冊](/zh-Hant/gateway)
