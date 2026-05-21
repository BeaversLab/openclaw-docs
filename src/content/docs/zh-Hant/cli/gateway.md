---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢和探索閘道"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "閘道"
sidebarTitle: "閘道"
---

閘道是 OpenClaw 的 WebSocket 伺服器（通道、節點、會話、鉤子）。本頁中的子指令位於 `openclaw gateway …` 下。

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
    - 預設情況下，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則閘道會拒絕啟動。請使用 `--allow-unconfigured` 進行臨時/開發執行。
    - `openclaw onboard --mode local` 和 `openclaw setup` 預期會寫入 `gateway.mode=local`。如果檔案存在但缺少 `gateway.mode`，請將其視為損壞或被覆寫的配置並進行修復，而不是隱含地假設為本機模式。
    - 如果檔案存在但缺少 `gateway.mode`，閘道會將其視為可疑的配置損壞，並拒絕為您「猜測為本機」。
    - 在沒有驗證的情況下繫結到 loopback 之外會被阻擋（安全防護）。
    - 當經過授權時，`SIGUSR1` 會觸發程序內重啟（`commands.restart` 預設已啟用；設定 `commands.restart: false` 可阻擋手動重啟，但仍允許 gateway tool/config apply/update）。
    - `SIGINT`/`SIGTERM` 處理程式會停止閘道程序，但不會還原任何自訂終端機狀態。如果您用 TUI 或原始模式輸入包裝 CLI，請在退出前還原終端機。

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
  覆蓋 Token（同時也會為程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
</ParamField>
<ParamField path="--password <password>" type="string">
  覆蓋密碼。
</ParamField>
<ParamField path="--password-file <path>" type="string">
  從檔案讀取 Gateway 密碼。
</ParamField>
<ParamField path="--tailscale <off|serve|funnel>" type="string">
  透過 Tailscale 暴露 Gateway。
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  關機時重設 Tailscale serve/funnel 設定。
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  允許在設定中沒有 `gateway.mode=local` 的情況下啟動 Gateway。僅繞過啟動保護用於臨時/開發引導；不會寫入或修復設定檔。
</ParamField>
<ParamField path="--dev" type="boolean">
  如果缺少開發配置 + 工作區則建立（跳過 BOOTSTRAP.md）。
</ParamField>
<ParamField path="--reset" type="boolean">
  重設開發配置 + 憑證 + 會話 + 工作區（需要 `--dev`）。
</ParamField>
<ParamField path="--force" type="boolean">
  啟動前終止選定連接埠上任何現有的監聽器。
</ParamField>
<ParamField path="--verbose" type="boolean">
  詳細日誌。
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean">
  僅在主控台顯示 CLI 後端日誌（並啟用 stdout/stderr）。
</ParamField>
<ParamField path="--ws-log <auto|full|compact>" type="string" default="auto">
  WebSocket 日誌樣式。
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

`openclaw gateway restart --safe` 會要求正在執行的 Gateway 在重新啟動前對作用中的 OpenClaw 工作進行預檢。如果有佇列操作、回覆傳遞、嵌入式執行或任務執行正在進行中，Gateway 會回報阻礙因素、合併重複的安全重新啟動請求，並在作用中的工作排空後重新啟動。單純的 `restart` 會保留現有的服務管理員行為以維持相容性。僅在您明確想要立即覆蓋路徑時才使用 `--force`。

`openclaw gateway restart --safe --skip-deferral` 執行與 `--safe` 相同的 OpenClaw 感知協調重新啟動，但會繞過作用中工作延遲閘門，因此即使回報了阻礙因素，Gateway 也會立即發出重新啟動訊號。當延遲因卡住的任務執行而被固定住，且單獨使用 `--safe` 會無限期等待時，請將其作為操作員的緊急應變手段。`--skip-deferral` 需要 `--safe`。

<Warning>內聯 `--password` 可能會暴露在本機程序列表中。建議優先使用 `--password-file`、環境變數，或由 SecretRef 支援的 `gateway.auth.password`。</Warning>

### Gateway 分析

- 設定 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以在 Gateway 啟動期間記錄階段計時，包括每個階段的 `eventLoopMax` 延遲，以及已安裝索引、清單註冊表、啟動規劃和所有者對映工作的外掛程式查閱表計時。
- 設定 `OPENCLAW_GATEWAY_RESTART_TRACE=1` 以記錄重啟範圍的 `restart trace:` 行，內容涵蓋重啟訊號處理、進行中工作的排出、關機階段、下次啟動、就緒時間以及記憶體指標。
- 使用 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=<path>` 設定 `OPENCLAW_DIAGNOSTICS=timeline`，以寫入盡最大努力的 JSONL 啟動診斷時間軸，供外部 QA 測試工具使用。您也可以在設定檔中透過 `diagnostics.flags: ["timeline"]` 啟用此標誌；路徑仍由環境變數提供。加入 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` 以包含事件迴圈樣本。
- 請先執行 `pnpm build`，然後執行 `pnpm test:startup:gateway -- --runs 5 --warmup 1`，以針對建置的 CLI 進入點對 Gateway 啟動進行基準測試。該基準測試會記錄首次程序輸出、`/healthz`、`/readyz`、啟動追蹤計時、事件迴圈延遲，以及外掛查詢表計時細節。
- 請先執行 `pnpm build`，然後執行 `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`，以在 macOS 或 Linux 上針對建置的 CLI 進入點對程序內 Gateway 重新啟動進行基準測試。重新啟動基準測試會使用 SIGUSR1，在子程序中同時啟用啟動和重新啟動追蹤，並記錄下一個 `/healthz`、下一個 `/readyz`、停機時間、就緒時間、CPU、RSS 和重新啟動追蹤指標。
- 將 `/healthz` 視為存活狀態，並將 `/readyz` 視為可用就緒狀態。追蹤行和基準測試輸出用於歸屬負責人；請勿將單一追蹤範圍或單一樣本視為完整的效能結論。

## 查詢正在執行的 Gateway

所有查詢指令皆使用 WebSocket RPC。

<Tabs>
  <Tab title="輸出模式">
    - 預設：人類可讀（在 TTY 中著色）。
    - `--json`：機器可讀的 JSON（無樣式/旋轉符號）。
    - `--no-color`（或 `NO_COLOR=1`）：停用 ANSI 同時保留人類可讀排版。

  </Tab>
  <Tab title="共用選項">
    - `--url <url>`：Gateway WebSocket URL。
    - `--token <token>`：Gateway Token。
    - `--password <password>`：Gateway 密碼。
    - `--timeout <ms>`：逾時/預算（因指令而異）。
    - `--expect-final`：等待「最終」回應（Agent 呼叫）。

  </Tab>
</Tabs>

<Note>當您設定 `--url` 時，CLI 不會回退至設定檔或環境認證。請明確傳遞 `--token` 或 `--password`。缺少明確認證為錯誤。</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端點是一個存活探測：一旦伺服器可以回應 HTTP 請求，它就會返回結果。HTTP `/readyz` 端點更為嚴格，在啟動外掛程式 sidecar、通道或已設定的 hook 仍在初始化時會保持紅色狀態。本機或已驗證的詳細就緒回應包含一個 `eventLoop` 診斷區塊，其中包含事件迴圈延遲、事件迴圈使用率、CPU 核心比例以及一個 `degraded` 標誌。

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
  要包含的最近事件的最大數量（最大 `1000`）。
</ParamField>
<ParamField path="--type <type>" type="string">
  依診斷事件類型篩選，例如 `payload.large` 或 `diagnostic.memory.pressure`。
</ParamField>
<ParamField path="--since-seq <seq>" type="number">
  僅包含診斷序號之後的事件。
</ParamField>
<ParamField path="--bundle [path]" type="string">
  讀取已保存的穩定性套件，而不是呼叫執行中的 Gateway。對於狀態目錄下的最新套件，請使用 `--bundle latest`（或僅使用 `--bundle`），或直接傳遞套件 JSON 路徑。
</ParamField>
<ParamField path="--export" type="boolean">
  寫入可分享的支援診斷 zip 檔案，而不是列印穩定性詳細資訊。
</ParamField>
<ParamField path="--output <path>" type="string">
  `--export` 的輸出路徑。
</ParamField>

<AccordionGroup>
  <Accordion title="隱私權與套件行為">
    - 記錄會保留作業元數據：事件名稱、計數、位元組大小、記憶體讀數、佇列/會話狀態、頻道/外掛程式名稱以及經編輯的會話摘要。它們不會保留聊天文字、Webhook 內文、工具輸出、原始請求或回應內文、權杖、Cookie、機密值、主機名稱或原始會話 ID。設定 `diagnostics.enabled: false` 即可完全停用記錄器。
    - 當 Gateway 發生致命錯誤、關機逾時，以及重新啟動時啟動失敗，且記錄器擁有事件時，OpenClaw 會將相同的診斷快照寫入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。請使用 `openclaw gateway stability --bundle latest` 檢查最新的套件；`--limit`、`--type` 和 `--since-seq` 也適用於套件輸出。

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

寫入本機診斷 zip 壓縮檔，設計用於附加至錯誤報告。如需隱私權模型與套件內容的相關資訊，請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  輸出 zip 檔案路徑。預設為狀態目錄下的支援匯出。
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  要包含的已清理日誌行數上限。
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  要檢查的日誌位元組上限。
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
  狀態/健康快照逾時時間。
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  略過已保存的穩定性套件查詢。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式列印寫入的路徑、大小和清單。
</ParamField>

匯出包含一份清單、Markdown 摘要、設定結構、已清理的設定詳情、已清理的日誌摘要、已清理的 Gateway 狀態/健康快照，以及最新的穩定性套件（如果存在的話）。

此匯出旨在供分享使用。它保留了有助於偵錯的操作細節，例如安全的 OpenClaw 日誌欄位、子系統名稱、狀態代碼、持續時間、配置模式、連接埠、外掛程式 ID、提供者 ID、非機密功能設定以及已編修的操作日誌訊息。它會略過或編修聊天文字、Webhook 內容、工具輸出、憑證、Cookie、帳戶/訊息識別碼、提示/指令文字、主機名稱和機密值。當 LogTape 風格的訊息看起來像是使用者/聊天/工具的載荷文字時，匯出僅保留該訊息已被略過的事實及其位元組數。

### `gateway status`

`gateway status` 會顯示 Gateway 服務（launchd/systemd/schtasks）以及對連線/認證能力的選擇性探測。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  新增一個明確的探測目標。已設定的遠端 + 本機主機仍會被探測。
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
  將預設的連線探測升級為讀取探測，並在該讀取探測失敗時以非零狀態碼結束。無法與 `--no-probe` 搭配使用。
</ParamField>

<AccordionGroup>
  <Accordion title="Status semantics">
    - 即使本機 CLI 設定遺失或無效，`gateway status` 仍可用於診斷。
    - 預設的 `gateway status` 可證明服務狀態、WebSocket 連線，以及在交握時可見的驗證能力。它並不證明讀取/寫入/管理操作。
    - 診斷探針對於首次裝置驗證是非變異的：當存在時，它們會重複使用現有的快取裝置權杖，但僅為了檢查狀態，它們不會建立新的 CLI 裝置身分或唯讀裝置配對紀錄。
    - `gateway status` 會在可能的情況下為探針驗證解析已設定的驗證 SecretRefs。
    - 如果在此指令路徑中無法解析所需的驗證 SecretRef，當探針連線/驗證失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析秘密來源。
    - 如果探針成功，將會隱藏未解析的 auth-ref 警告以避免誤報。
    - 當僅有監聽服務不足，且您需要讀取範圍的 RPC 呼叫也正常運作時，請在腳本和自動化中使用 `--require-rpc`。
    - `--deep` 增加了對額外 launchd/systemd/schtasks 安裝的盡力掃描。當偵測到多個類似 Gateway 的服務時，人類可讀的輸出會列印清理提示，並警告大多數設定應在每台機器上執行一個 Gateway。
    - `--deep` 也會在服務程序因外部監督器重新啟動而乾淨退出時，回報最近的 Gateway 監督器重新啟動移交。
    - `--deep` 在感知外掛程式的模式 (`pluginValidation: "full"`) 下執行設定驗證，並顯示已設定的外掛程式清單警告 (例如缺少通道設定元資料)，以便安裝和更新測試能夠發現這些問題。預設的 `gateway status` 則保持跳過外掛程式驗證的快速唯讀路徑。
    - 人類可讀的輸出包含解析後的檔案日誌路徑，以及 CLI 對照服務的設定路徑/有效性快照，以協助診斷設定檔或狀態目錄漂移。

  </Accordion>
  <Accordion title="Linux systemd auth-drift checks">
    - 在 Linux systemd 安裝中，服務身份驗證漂移檢查會從單元讀取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、帶引號的路徑、多個檔案以及可選的 `-` 檔案）。
    - 漂移檢查使用合併的執行時環境解析 `gateway.auth.token` SecretRefs（優先使用服務指令環境，其次為程序環境後備）。
    - 如果令牌身份驗證未有效啟用（明確設定 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或模式未設定且密碼可能獲勝而無令牌候選者能獲勝），令牌漂移檢查將跳過設定檔令牌解析。

  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` 是「除錯所有內容」的指令。它總是探測：

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
  <Accordion title="說明">
    - `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 回報探針所能證明的關於驗證的資訊。這與可達性分開。
    - `Read probe: ok` 表示讀取範圍的詳細 RPC 呼叫（`health`/`status`/`system-presence`/`config.get`）也成功了。
    - `Read probe: limited - missing scope: operator.read` 表示連線成功但讀取範圍的 RPC 受限。這會回報為**降級**的可達性，而非完全失敗。
    - `Read probe: failed` 之後出現 `Connect: ok` 表示 Gateway 接受了 WebSocket 連線，但後續的讀取診斷逾時或失敗。這也是**降級**的可達性，而非無法連線的 Gateway。
    - 就像 `gateway status`，探針會重複使用現有的快取裝置驗證，但不會建立首次的裝置身分或配對狀態。
    - 只有當沒有探測的目標可達時，結束代碼才會為非零。

  </Accordion>
  <Accordion title="JSON 輸出">
    頂層：

    - `ok`：至少有一個目標是可達的。
    - `degraded`：至少有一個目標接受了連線，但未完成完整的詳細 RPC 診斷。
    - `capability`：在所有可達目標中看到的最佳功能（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`：視為目前有效勝出的最佳目標，順序為：明確 URL、SSH 通道、設定的遠端，然後是本機迴路。
    - `warnings[]`：盡力而為的警告記錄，包含 `code`、`message` 和選用的 `targetIds`。
    - `network`：根據目前設定和主機網路衍生的本機迴路/tailnet URL 提示。
    - `discovery.timeoutMs` 和 `discovery.count`：此次探測回合實際使用的探索預算/結果計數。

    每個目標（`targets[].connect`）：

    - `ok`：連線後的可達性 + 降級分類。
    - `rpcOk`：完整詳細 RPC 成功。
    - `scopeLimited`：由於缺少操作員範圍，詳細 RPC 失敗。

    每個目標（`targets[].auth`）：

    - `role`：在可用時於 `hello-ok` 中回報的認證角色。
    - `scopes`：在可用時於 `hello-ok` 中回報的已授予範圍。
    - `capability`：該目標的表層認證功能分類。

  </Accordion>
  <Accordion title="常見的警告代碼">
    - `ssh_tunnel_failed`：SSH 隧道設定失敗；指令已回退到直接探測。
    - `multiple_gateways`：有多個目標可連線；除非您刻意執行隔離的設定檔（例如救援機器人），否則這種情況並不常見。
    - `auth_secretref_unresolved`：無法解析失敗目標的已設定 auth SecretRef。
    - `probe_scope_limited`：WebSocket 連線成功，但讀取探測因缺少 `operator.read` 而受限。

  </Accordion>
</AccordionGroup>

#### 透過 SSH 遠端連線 (Mac 應用程式對等功能)

macOS 應用程式的「透過 SSH 遠端連線」模式使用本地連接埠轉發，讓遠端 Gateway（可能僅綁定至 loopback）可在 `ws://127.0.0.1:<port>` 連線。

CLI 對應指令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` 或 `user@host:port` (連接埠預設為 `22`)。
</ParamField>
<ParamField path="--ssh-identity <path>" type="string">
  身分識別檔案。
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  從解析後的探索端點 (`local.` 加上設定的廣域網域，若有)，選擇第一個探索到的 Gateway 主機作為 SSH 目標。僅 TXT 提示會被忽略。
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
  Gateway token。
</ParamField>
<ParamField path="--password <password>" type="string">
  Gateway 密碼。
</ParamField>
<ParamField path="--timeout <ms>" type="number">
  逾時預算。
</ParamField>
<ParamField path="--expect-final" type="boolean">
  主要用於在最終載荷之前串流中間事件的 agent 風格 RPC。
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

當受控服務必須透過另一個可執行檔啟動時，請使用 `--wrapper`，例如密鑰管理器 shim 或 run-as 輔助程式。包裝程式會接收正常的 Gateway 參數，並負責最終執行 `openclaw` 或帶有這些參數的 Node。

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

您也可以透過環境設定包裝程式。`gateway install` 會驗證該路徑是否為可執行檔，將包裝程式寫入服務 `ProgramArguments`，並將 `OPENCLAW_WRAPPER` 保留在服務環境中，以便後續進行強制重新安裝、更新和 doctor 修復。

```bash
OPENCLAW_WRAPPER="$HOME/.local/bin/openclaw-doppler" openclaw gateway install --force
openclaw doctor
```

若要移除已保留的包裝程式，請在重新安裝時清除 `OPENCLAW_WRAPPER`：

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
    - 使用 `gateway restart` 重新啟動受管理的服務。請勿將 `gateway stop` 和 `gateway start` 串連起來作為重新啟動的替代方案。
    - 在 macOS 上，`gateway stop` 預設使用 `launchctl bootout`，這會將 LaunchAgent 從當前開機階段中移除，而不會持續停用 — KeepAlive 自動恢復功能在未來當機時仍然保持啟用，而 `gateway start` 可以在無需手動 `launchctl enable` 的情況下乾淨地重新啟用。傳遞 `--disable` 以持續抑制 KeepAlive 和 RunAtLoad，使得 Gateway 直到下次明確執行 `gateway start` 時才會重新生成；當手動停止應在重新開機或系統重新啟動後保持有效時，請使用此選項。
    - `gateway restart --safe` 會要求正在執行的 Gateway 對作用中的 OpenClaw 工作進行預檢，並延遲重新啟動直到回覆傳遞、內嵌執行和任務執行排空為止。`--safe` 不能與 `--force` 或 `--wait` 結合使用。
    - `gateway restart --wait 30s` 會覆蓋該次重新啟動所設定的排空預算。純數字表示毫秒；接受諸如 `s`、`m` 和 `h` 等單位。`--wait 0` 會無限期等待。
    - `gateway restart --safe --skip-deferral` 會執行感知 OpenClaw 的安全重新啟動，但會略過延遲閘門，因此即使回報有阻礙因素，Gateway 也會立即發出重新啟動。這是針對卡住任務執行延遲的操作員緊急應變措施；需要 `--safe`。
    - `gateway restart --force` 會跳過作用中工作的排空並立即重新啟動。當操作員已經檢查過列出的任務阻礙因素並希望立即讓 Gateway 回來時，請使用此選項。
    - 生命週期指令接受 `--json` 以進行腳本撰寫。

  </Accordion>
  <Accordion title="安裝時期的 Auth 與 SecretRefs">
    - 當 token auth 需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證該 SecretRef 是否可解析，但不會將解析後的 token 保存到服務環境元數據中。
    - 如果 token auth 需要 token 且設定的 token SecretRef 無法解析，安裝將會封閉式失敗（fails closed），而不是保存後援純文本。
    - 對於 `gateway run` 上的密碼認證，建議優先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支援的 `gateway.auth.password`，而非行內 `--password`。
    - 在推斷認證模式下，僅限 shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不會放寬安裝 token 的要求；安裝受管服務時，請使用持久化設定（`gateway.auth.password` 或設定 `env`）。
    - 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將會被阻擋，直到明確設定模式。

  </Accordion>
</AccordionGroup>

## 探索 Gateway（Bonjour）

`gateway discover` 會掃描 Gateway 信標（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD（廣域 Bonjour）：選擇一個網域（例如：`openclaw.internal.`）並設定分流 DNS 與 DNS 伺服器；請參閱 [Bonjour](/zh-Hant/gateway/bonjour)。

只有啟用 Bonjour 探索（預設）的 Gateway 會廣播信標。

廣域探索記錄可以包含以下 TXT 提示：

- `role`（Gateway 角色提示）
- `transport`（傳輸提示，例如 `gateway`）
- `gatewayPort`（WebSocket 連接埠，通常為 `18789`）
- `sshPort`（僅限完整探索模式；當其不存在時，客戶端預設將 SSH 目標設為 `22`）
- `tailnetDns`（MagicDNS 主機名稱，如有提供）
- `gatewayTls` / `gatewayTlsSha256`（已啟用 TLS + 憑證指紋）
- `cliPath` (僅限完整探索模式)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  每個指令的逾時時間 (browse/resolve)。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀的輸出 (同時停用樣式/旋轉符號)。
</ParamField>

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
- CLI 會掃描 `local.` 以及已啟用的廣網網域。
- JSON 輸出中的 `wsUrl` 是來自已解析的服務端點，而非來自僅限 TXT 的提示，例如 `lanHost` 或 `tailnetDns`。
- 在 `local.` mDNS 與廣網 DNS-SD 上，只有在 `discovery.mdns.mode` 為 `full` 時，才會發佈 `sshPort` 與 `cliPath`。

</Note>

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Gateway 手冊](/zh-Hant/gateway)
