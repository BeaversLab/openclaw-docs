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

### 啟動分析

- 設定 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以在 Gateway 啟動期間記錄階段計時，包括每個階段的 `eventLoopMax` 延遲，以及已安裝索引、清單註冊表、啟動規劃和所有者對映工作的外掛程式查閱表計時。
- 使用 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=<path>` 設定 `OPENCLAW_DIAGNOSTICS=timeline`，以寫入盡力而為的 JSONL 啟動診斷時間軸，供外部 QA 測試工具使用。您也可以在設定中使用 `diagnostics.flags: ["timeline"]` 啟用該旗標；路徑仍由環境變數提供。新增 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` 以包含事件迴圈樣本。
- 執行 `pnpm test:startup:gateway -- --runs 5 --warmup 1` 以對 Gateway 啟動進行基準測試。該基準測試會記錄首次程序輸出、`/healthz`、`/readyz`、啟動追蹤計時、事件迴圈延遲以及外掛程式查閱表計時詳細資訊。

## 查詢正在執行的 Gateway

所有查詢指令都使用 WebSocket RPC。

<Tabs>
  <Tab title="輸出模式">
    - 預設：人類可讀（在 TTY 中帶顏色）。
    - `--json`：機器可讀的 JSON（無樣式/載入動畫）。
    - `--no-color`（或 `NO_COLOR=1`）：在保留人類可讀佈局的同時停用 ANSI。

  </Tab>
  <Tab title="共享選項">
    - `--url <url>`：Gateway WebSocket URL。
    - `--token <token>`：Gateway 權杖。
    - `--password <password>`：Gateway 密碼。
    - `--timeout <ms>`：逾時/預算（依指令而異）。
    - `--expect-final`：等待「最終」回應（代理程式呼叫）。

  </Tab>
</Tabs>

<Note>當您設定 `--url` 時，CLI 不會回退至設定檔或環境變數中的認證資訊。請明確傳遞 `--token` 或 `--password`。若缺少明確的認證資訊則會發生錯誤。</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端點是存活性探測：一旦伺服器可以回應 HTTP 請求，它就會回傳。HTTP `/readyz` 端點更為嚴格，當啟動外掛程式 sidecar、通道或設定的掛鉤仍在穩定時，它會保持紅色狀態。本機或已驗證的詳細就緒回應包含一個 `eventLoop` 診斷區塊，其中包含事件迴圈延遲、事件迴圈使用率、CPU 核心比例以及一個 `degraded` 旗標。

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
  僅包含診斷序列號之後的事件。
</ParamField>
<ParamField path="--bundle [path]" type="string">
  讀取持續性穩定性套件，而不是呼叫執行中的 Gateway。使用 `--bundle latest`（或僅使用 `--bundle`）取得狀態目錄下最新的套件，或直接傳入套件 JSON 路徑。
</ParamField>
<ParamField path="--export" type="boolean">
  寫入可分享的支援診斷壓縮檔，而不是列印穩定性詳細資訊。
</ParamField>
<ParamField path="--output <path>" type="string">
  `--export` 的輸出路徑。
</ParamField>

<AccordionGroup>
  <Accordion title="隱私權與套件行為">
    - 記錄會保留操作中繼資料：事件名稱、計數、位元組大小、記憶體讀數、佇列/會話狀態、通道/外掛程式名稱，以及已編輯的會話摘要。它們不會保留聊天文字、Webhook 內文、工具輸出、原始請求或回應內文、權杖、Cookie、機密值、主機名稱或原始會話 ID。設定 `diagnostics.enabled: false` 可完全停用記錄器。
    - 當 Gateway 發生嚴重錯誤結束、關機逾時，以及重新啟動啟動失敗時，如果記錄器中有事件，OpenClaw 會將相同的診斷快照寫入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。使用 `openclaw gateway stability --bundle latest` 檢查最新的套件；`--limit`、`--type` 和 `--since-seq` 也適用於套件輸出。

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

撰寫一個本機診斷 zip 檔案，專為附加至錯誤報告而設計。關於隱私模型和組合內容，請參閱[診斷匯出](/zh-Hant/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  輸出 zip 路徑。預設為狀態目錄下的支援匯出。
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  要包含的已清理日誌行數上限。
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  要檢查的日誌位元組數上限。
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
  略過持久化的穩定性組合查詢。
</ParamField>
<ParamField path="--json" type="boolean">
  將寫入的路徑、大小和資訊清單以 JSON 格式列印出來。
</ParamField>

匯出內容包含資訊清單、Markdown 摘要、組態形狀、已清理的組態細節、已清理的日誌摘要、已清理的 Gateway 狀態/健康快照，以及當存在時最新的穩定性組合。

此匯出旨在分享。它保留了有助於除錯的操作細節，例如安全的 OpenClaw 日誌欄位、子系統名稱、狀態碼、持續時間、設定的模式、連接埠、外掛程式 ID、提供者 ID、非秘密的功能設定，以及已編修的操作日誌訊息。它會省略或編修聊天文字、Webhook 內文、工具輸出、憑證、Cookie、帳號/訊息識別碼、提示/指令文字、主機名稱和秘密值。當 LogTape 風格的訊息看起來像是使用者/聊天/工具承載文字時，匯出僅保留訊息已被省略的事實及其位元組數。

### `gateway status`

`gateway status` 顯示 Gateway 服務 (launchd/systemd/schtasks) 以及可選的連線/驗證能力探測。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  加入明確的探測目標。設定的遠端 + localhost 仍會被探測。
</ParamField>
<ParamField path="--token <token>" type="string">
  探測用的 Token 驗證。
</ParamField>
<ParamField path="--password <password>" type="string">
  探測用的密碼驗證。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  探測逾時。
</ParamField>
<ParamField path="--no-probe" type="boolean">
  跳過連線探測 (僅顯示服務)。
</ParamField>
<ParamField path="--deep" type="boolean">
  同時掃描系統層級的服務。
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  將預設的連線探測升級為讀取探測，並在讀取探測失敗時以非零狀態碼退出。不可與 `--no-probe` 併用。
</ParamField>

<AccordionGroup>
  <Accordion title="Status semantics">
    - 即使本機 CLI 設定遺失或無效，`gateway status` 仍可用於診斷。
    - 預設的 `gateway status` 可證明服務狀態、WebSocket 連線，以及交握時可見的認證能力。它不能證明讀取/寫入/管理作業。
    - 針對首次設備認證，診斷探測不會進行變更：當存在時，它們會重複使用現有的快取設備權杖，但不會僅為了檢查狀態而建立新的 CLI 設備身分或唯讀設備配對記錄。
    - `gateway status` 會在可能時為探測認證解析已設定的認證 SecretRefs。
    - 如果在此指令路徑中無法解析必要的認證 SecretRef，當探測連線/認證失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析秘密來源。
    - 如果探測成功，將隱藏未解析的 auth-ref 警告以避免誤報。
    - 當監聽服務不足，且您需要讀取範圍的 RPC 呼叫也正常時，請在腳本和自動化中使用 `--require-rpc`。
    - `--deep` 增加了對額外 launchd/systemd/schtasks 安裝的盡力掃描。當偵測到多個類似 Gateway 的服務時，人類可讀輸出會列印清理提示，並警告大多數設定應該在每台機器上執行一個 Gateway。
    - 當服務程序因外部監督器重新啟動而乾淨地結束時，`--deep` 也會回報最近的 Gateway 監督器重新啟動交握。
    - 人類可讀輸出包含解析後的檔案記錄路徑，以及 CLI 與服務設定路徑/有效性快照，以協助診斷設定檔或狀態目錄漂移。

  </Accordion>
  <Accordion title="Linux systemd auth-drift 檢查">
    - 在 Linux systemd 安裝中，服務 auth-drift 檢查會從單元中讀取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、帶引號的路徑、多個檔案以及可選的 `-` 檔案）。
    - Drift 檢查會使用合併的執行時環境來解析 `gateway.auth.token` SecretRefs（優先使用服務指令環境，然後是程序環境備援）。
    - 如果 token auth 未實際啟用（明確的 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或模式未設定且密碼可能獲勝而沒有 token 候選者能獲勝），token-drift 檢查將跳過設定 token 解析。

  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` 是「除錯所有事項」的指令。它始終會探查：

- 您設定的遠端 gateway（如果已設定），以及
- localhost （loopback）**即使已設定遠端**。

如果您傳遞 `--url`，該明確目標會被加入到這兩者之前。人類可讀的輸出會將目標標記為：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

<Note>如果有多個 gateway 可連線，它會將其全部印出。當您使用隔離的設定檔/連接埠（例如，救援機器人）時，支援多個 gateway，但大多數安裝仍會執行單一 gateway。</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="解讀">
    - `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 回報探測能關於驗證的資訊。這與連線能力是分開的。
    - `Read probe: ok` 表示讀取範圍的詳細 RPC 呼叫 (`health`/`status`/`system-presence`/`config.get`) 也成功了。
    - `Read probe: limited - missing scope: operator.read` 表示連線成功，但讀取範圍的 RPC 受到限制。這會被回報為 **降級** 的連線能力，而非完全失敗。
    - 在 `Connect: ok` 之後出現 `Read probe: failed`，表示 Gateway 接受了 WebSocket 連線，但後續的讀取診斷逾時或失敗。這也是 **降級** 的連線能力，而非無法連線的 Gateway。
    - 就像 `gateway status`，探測會重複使用現有的快取裝置驗證，但不會建立初次裝置身分或配對狀態。
    - 只有當沒有被探測的目標可連線時，結束代碼才會非零。

  </Accordion>
  <Accordion title="JSON 輸出">
    頂層：

    - `ok`：至少有一個目標是可連線的。
    - `degraded`：至少有一個目標接受了連線，但未完成完整的詳細 RPC 診斷。
    - `capability`：在所有可連線的目標中看到的最佳能力（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`：按此順序視為作用中獲勝者的最佳目標：明確 URL、SSH 隧道、已設定的遠端，然後是本機回環。
    - `warnings[]`：包含 `code`、`message` 和選用 `targetIds` 的盡力而為的警告記錄。
    - `network`：根據目前設定和主機網路衍生的本機回環/tailnet URL 提示。
    - `discovery.timeoutMs` 和 `discovery.count`：此探測傳遞使用的實際探索預算/結果計數。

    每個目標（`targets[].connect`）：

    - `ok`：連線後的可達性 + 降級分類。
    - `rpcOk`：完整詳細 RPC 成功。
    - `scopeLimited`：由於缺少操作員範圍，詳細 RPC 失敗。

    每個目標（`targets[].auth`）：

    - `role`：可用時在 `hello-ok` 中回報的授權角色。
    - `scopes`：可用時在 `hello-ok` 中回報的已授予範圍。
    - `capability`：該目標的表面授權能力分類。

  </Accordion>
  <Accordion title="常見警告代碼">
    - `ssh_tunnel_failed`：SSH 通道設定失敗；該指令回退到直接探查。
    - `multiple_gateways`：有多個目標可連線；除非您刻意執行獨立的設定檔（例如救援機器人），否則這種情況不尋常。
    - `auth_secretref_unresolved`：無法解析失敗目標的已設定 auth SecretRef。
    - `probe_scope_limited`：WebSocket 連線成功，但讀取探查因缺少 `operator.read` 而受限。

  </Accordion>
</AccordionGroup>

#### 透過 SSH 遠端（Mac 應用程式對等）

macOS 應用程式的「透過 SSH 遠端」模式使用本地通口轉發，因此遠端閘道（可能僅綁定到 loopback）可透過 `ws://127.0.0.1:<port>` 連線。

CLI 對等項目：

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` 或 `user@host:port`（通口預設為 `22`）。
</ParamField>
<ParamField path="--ssh-identity <path>" type="string">
  身份識別檔案。
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  從解析出的探索端點（`local.` 加上設定的廣域網域，若有）中，選擇第一個探索到的閘道主機作為 SSH 目標。僅 TXT 的提示會被忽略。
</ParamField>

設定（選用，作為預設值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低層級 RPC 輔助工具。

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
  主要用於在最終負載之前串流中間事件的代理程式風格 RPC。
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

當受控服務必須透過另一個可執行檔啟動時，請使用 `--wrapper`，例如機密管理程式 shim 或 run-as 輔助程式。包裝程式會接收正常的 Gateway 引數，並負責最終執行 `openclaw` 或帶有這些引數的 Node。

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

您也可以透過環境設定包裝程式。`gateway install` 會驗證該路徑是否為可執行檔，將包裝程式寫入服務 `ProgramArguments`，並將 `OPENCLAW_WRAPPER` 保留在服務環境中，以便稍後進行強制重新安裝、更新和 doctor 修復。

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
    - 使用 `gateway restart` 重新啟動受管服務。不要將 `gateway stop` 和 `gateway start` 串聯起來作為重新啟動的替代方案。
    - 在 macOS 上，`gateway stop` 預設使用 `launchctl bootout`，這會從當前啟動會話中移除 LaunchAgent 而不持久化停用設定 — KeepAlive 自動恢復對未來的崩潰保持啟用，且 `gateway start` 會在不需要手動 `launchctl enable` 的情況下乾淨地重新啟用。傳遞 `--disable` 以持久化抑制 KeepAlive 和 RunAtLoad，這樣 Gateway 在下一次明確 `gateway start` 之前不會重新生成；當手動停止應該在重啟或系統重新啟動後持續生效時，請使用此選項。
    - `gateway restart --safe` 要求正在執行的 Gateway 對活動的 OpenClaw 工作進行預檢，並將重新啟動延遲直到回覆傳遞、嵌入式執行和任務執行排空。`--safe` 不能與 `--force` 或 `--wait` 結合使用。
    - `gateway restart --wait 30s` 覆寫該次重新啟動的設定重新啟動排空預算。純數字表示毫秒；接受諸如 `s`、`m` 和 `h` 等單位。`--wait 0` 表示無限期等待。
    - `gateway restart --safe --skip-deferral` 執行 OpenClaw 感知的 安全重啟，但繞過延遲閘門，因此即使報告了阻礙因素，Gateway 也會立即發出重啟指令。操作員用於卡住任務執行延遲的逃生艙；需要 `--safe`。
    - `gateway restart --force` 跳過活動工作排空並立即重新啟動。當操作員已經檢查了列出的任務阻礙因素並希望現在讓 Gateway 恢復運行時，請使用此選項。
    - 生命週期指令接受 `--json` 用於腳本編寫。

  </Accordion>
  <Accordion title="安裝時的驗證與 SecretRef">
    - 當 token 驗證需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析出的 token 持久化到服務環境元數據中。
    - 如果 token 驗證需要 token 且配置的 token SecretRef 無法解析，安裝將失敗（不會持久化回退純文本）。
    - 對於 `gateway run` 上的密碼驗證，優先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支援的 `gateway.auth.password`，而非內聯的 `--password`。
    - 在推斷驗證模式下，僅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不會放寬安裝 token 的要求；在安裝受管服務時，請使用持久化配置（`gateway.auth.password` 或配置 `env`）。
    - 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則會阻擋安裝，直到明確設定模式為止。

  </Accordion>
</AccordionGroup>

## 探索閘道 (Bonjour)

`gateway discover` 會掃描閘道信標 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (Wide-Area Bonjour)：選擇一個網域 (例如：`openclaw.internal.`) 並設定分割 DNS + DNS 伺服器；請參閱 [Bonjour](/zh-Hant/gateway/bonjour)。

只有啟用 Bonjour 探索功能（預設）的閘道才會廣播信標。

廣域探索記錄包含 (TXT)：

- `role` (閘道角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 連接埠，通常為 `18789`)
- `sshPort` (可選；當其不存在時，客戶端預設將 SSH 目標設為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，當可用時)
- `gatewayTls` / `gatewayTlsSha256` (已啟用 TLS + 憑證指紋)
- `cliPath` (remote-install hint written to the wide-area zone)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  Per-command timeout (browse/resolve).
</ParamField>
<ParamField path="--json" type="boolean">
  Machine-readable output (also disables styling/spinner).
</ParamField>

Examples:

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
- The CLI scans `local.` plus the configured wide-area domain when one is enabled.
- `wsUrl` in JSON output is derived from the resolved service endpoint, not from TXT-only hints such as `lanHost` or `tailnetDns`.
- On `local.` mDNS, `sshPort` and `cliPath` are only broadcast when `discovery.mdns.mode` is `full`. Wide-area DNS-SD still writes `cliPath`; `sshPort` stays optional there too.

</Note>

## Related

- [CLI reference](/zh-Hant/cli)
- [Gateway runbook](/zh-Hant/gateway)
