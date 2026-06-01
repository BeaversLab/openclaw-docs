---
summary: "Security considerations and threat model for running an AI gateway with shell access"
read_when:
  - Adding features that widen access or automation
title: "安全"
---

<Warning>**個人助理信任模型。** 此指引假設每個閘道有一個受信任的操作員邊界（單一用戶、個人助理模型）。 OpenClaw **並非** 針對多個共享同一個 Agent 或閘道的敵對用戶的敵意多租戶安全邊界。如果您需要混合信任或 敵對用戶操作，請拆分信任邊界（分離的閘道 + 憑證，理想情況下是分離的 OS 用戶或主機）。</Warning>

## 範圍優先：個人助理安全模型

OpenClaw 安全指引假設採用 **個人助理** 部署：一個受信任的操作員邊界，可能包含多個 Agent。

- 支援的安全姿態：每個閘道一個用戶/信任邊界（建議每個邊界使用一個 OS 用戶/主機/VPS）。
- 不支援的安全邊界：由互不信任或敵對用戶使用的一個共享閘道/Agent。
- 如果需要敵對用戶隔離，請按信任邊界拆分（分離的閘道 + 憑證，理想情況下分離 OS 用戶/主機）。
- 如果多個不受信任的用戶可以向一個啟用工具的 Agent 發送訊息，請將其視為共享該 Agent 的同一個委託工具權限。

本頁面說明 **在該模型內** 的加固措施。它不聲稱在一個共享閘道上提供敵意多租戶隔離。

在變更遠端存取、DM 原則、反向 Proxy 或公開暴露之前，請使用 [Gateway 暴露操作手冊](/zh-Hant/gateway/security/exposure-runbook) 作為事前檢查與回滾檢查清單。

## 快速檢查：`openclaw security audit`

另請參閱：[形式驗證（安全模型）](/zh-Hant/security/formal-verification)

請定期執行此項檢查（尤其是在變更組態或暴露網路表面之後）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 保持刻意的狹窄範圍：它將常見的開放群組原則翻轉為允許清單，還原 `logging.redactSensitive: "tools"`，加強狀態/設定/包含檔案的權限，並在 Windows 上執行時使用 Windows ACL 重設而非 POSIX `chmod`。

它會標記常見的誤用風險（Gateway 鑑權暴露、瀏覽器控制暴露、過度寬鬆的允許清單、檔案系統權限、寬鬆的執行核准，以及公開管道工具暴露）。

OpenClaw 既是一個產品也是一個實驗：您正在將前沿模型的行為連接到真實的傳訊表面與真實的工具。**不存在「完美安全」的設定。** 目標是審慎處理：

- 誰能與您的機器人對話
- 機器人被允許在何處運作
- 機器人能接觸到什麼

從最小且仍能運作的存取權限開始，然後隨著您的信心增長再逐步放寬。

### 已發布套件相依性鎖定

OpenClaw 原始碼檢出使用 `pnpm-lock.yaml`。已發布的 `openclaw` npm 套件和 OpenClaw 擁有的 npm 外掛套件包含 `npm-shrinkwrap.json`，這是 npm 可發布的相依性鎖定檔，因此套件安裝會使用發布版本中已審查的傳遞性相依性圖，而非在安裝時解析全新的圖。

Shrinkwrap 是一種供應鏈強化和發布可重現性邊界，而非沙箱。如需白話文模型、維護者指令和套件檢查，請參閱 [npm shrinkwrap](/zh-Hant/gateway/security/shrinkwrap)。

### 部署與主機信任

OpenClaw 假設主機和設定邊界是受信任的：

- 如果某人可以修改 Gateway 主機狀態/設定（`~/.openclaw`，包括 `openclaw.json`），請將其視為受信任的操作員。
- 為多個互不信任/彼此對立的操作員執行一個 Gateway **並非建議的設定**。
- 對於混合信任團隊，請使用獨立的 Gateway（或至少獨立的 OS 使用者/主機）來分割信任邊界。
- 建議的預設值：每台機器/主機（或 VPS）一個使用者，該使用者一個 Gateway，以及該 Gateway 中一個或多個代理程式。
- 在一個 Gateway 執行個體內，已驗證的操作員存取是受信任的控制平面角色，而非每個使用者的租用戶角色。
- 會話識別碼（`sessionKey`、會話 ID、標籤）是路由選擇器，而非授權權杖。
- 如果有多個人可以傳送訊息給一個啟用工具的代理程式，他們每個人都可以引導該相同的權限集。每個使用者的工作階段/記憶體隔離有助於隱私，但無法將共用的代理程式轉換為每個使用者的主機授權。

### 安全的檔案操作

OpenClaw 使用 `@openclaw/fs-safe` 進行受 root 限制的檔案存取、原子寫入、封存擷取、暫存工作區以及秘密檔案協助程式。OpenClaw 預設將 fs-safe 的選用 POSIX Python 協助程式設為**關閉**；僅在您需要額外的 fd 相對變異防護並且能支援 Python 執行環境時，才設定 `OPENCLAW_FS_SAFE_PYTHON_MODE=auto` 或 `require`。

詳細資訊：[安全的檔案操作](/zh-Hant/gateway/security/secure-file-operations)。

### 共用的 Slack 工作區：真正的風險

如果「Slack 中的每個人都可以傳送訊息給機器人」，核心風險在於委派的工具權限：

- 任何允許的傳送者都可以在代理程式的原則內引發工具呼叫 (`exec`、瀏覽器、網路/檔案工具)；
- 來自一位傳送者的提示詞/內容注入可能導致影響共用狀態、裝置或輸出的操作；
- 如果一個共用的代理程式擁有敏感的憑證/檔案，任何允許的傳送者都可能透過工具使用潛在地驅動資料外洩。

針對團隊工作流程，請使用具有最小工具集的獨立代理程式/閘道；將個人資料代理程式保持私密。

### 公司共用的代理程式：可接受的模式

當使用該代理程式的每個人都處於相同的信任邊界內（例如一個公司團隊），並且該代理程式嚴格限於商務範疇時，這是可以接受的。

- 在專用的機器/VM/容器上執行它；
- 為該執行環境使用專用的作業系統使用者 + 專用的瀏覽器/設定檔/帳戶；
- 請勿將該執行環境登入個人的 Apple/Google 帳戶或個人的密碼管理員/瀏覽器設定檔。

如果您在同一個執行環境上混合使用個人和公司身分，您將破壞隔離並增加個人資料暴露的風險。

## 閘道和節點信任概念

將閘道和節點視為一個操作員信任網域，並具有不同的角色：

- **閘道** 是控制平面和原則介面 (`gateway.auth`、工具原則、路由)。
- **節點** 是與該閘道配對的遠端執行介面（指令、裝置操作、主機本機功能）。
- 經過驗證的呼叫者在 Gateway 範圍內是受信任的。配對後，節點操作即為該節點上受信任的操作員操作。
- 操作員範圍層級和審批時檢查總結於
  [Operator scopes](/zh-Hant/gateway/operator-scopes)。
- 使用共用 gateway token/password 進行驗證的直接 loopback 後端客戶端，可以在不呈現使用者裝置身分的情況下發出內部控制平面 RPC。這並非遠端或瀏覽器配對的繞過：網路客戶端、節點客戶端、裝置 token 客戶端和明確的裝置身分仍需經過配對和範圍升級強制執行。
- `sessionKey` 是路由/上下文選擇，而非每個使用者的驗證。
- Exec 審批（允許清單 + 詢問）是操作員意圖的防護機制，而非對抗惡意多租戶的隔離。
- OpenClaw 對於受信任單一操作員設定的產品預設值是，允許在 `gateway`/`node` 上進行 host exec 而無需審批提示（`security="full"`，`ask="off"`，除非您進行收緊）。該預設值是有意的 UX 設計，而非漏洞本身。
- Exec 審批綁定確切的請求上下文和盡力而為的直接本地檔案操作數；它們不會在語意上對每個執行階段/直譯器載入器路徑進行建模。請使用沙盒和主機隔離來實現強大的邊界。

如果您需要對抗惡意使用者的隔離，請按 OS 使用者/主機分割信任邊界，並執行個別的 gateways。

## 信任邊界矩陣

在排查風險時，請將此作為快速模型：

| 邊界或控制                                                | 含義                             | 常見誤讀                                        |
| --------------------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| `gateway.auth` (token/password/trusted-proxy/device auth) | 對 gateway API 的呼叫者進行驗證  | "需要在每個幀上都有每個訊息的簽章才能安全"      |
| `sessionKey`                                              | 用於上下文/會話選擇的路由鍵      | "會話鍵是用戶驗證邊界"                          |
| 提示/內容防護機制                                         | 降低模型濫用風險                 | "僅憑提示注入即可證明驗證繞過"                  |
| `canvas.eval` / browser evaluate                          | 啟用時的有意操作員能力           | "在此信任模型中，任何 JS eval 原語自動構成漏洞" |
| 本地 TUI `!` shell                                        | 明確的操作員觸發的本機執行       | "本機 Shell 便利指令即為遠端注入"               |
| 節點配對與節點指令                                        | 對已配對裝置的操作員級別遠端執行 | "遠端裝置控制應預設視為不受信任的使用者存取"    |
| `gateway.nodes.pairing.autoApproveCidrs`                  | 選用信任網路節點註冊原則         | "預設停用的允許清單是一種自動配對漏洞"          |

## 依設計而非漏洞

<Accordion title="超出範圍的常見發現">

這些模式經常被回報，除非證明存在真正的邊界繞過，否則通常會被標記為不採取行動並結案：

- 僅提示注入但未繞過原則、驗證或沙盒的鏈路。
- 假設在單一共享主機或設定上進行惡意多租戶操作的主張。
- 在共享閘道設定中，將正常的操作員讀取路徑存取（例如
  `sessions.list` / `sessions.preview` / `chat.history`）歸類為 IDOR 的主張。
- 僅限 Localhost 的部署發現（例如僅限回環的閘道上的 HSTS）。
- 針對此儲存庫中不存在的入站路徑之 Discord 入站 Webhook 簽章發現。
- 將節點配對元資料視為 `system.run` 的隱藏第二層逐指令批准層的報告，而實際執行邊界仍是閘道的全域節點指令原則加上節點自身的執行批准。
- 將已設定的 `gateway.nodes.pairing.autoApproveCidrs` 本身視為漏洞的報告。此設定預設為停用，需要明確的 CIDR/IP 項目，僅適用於首次 `role: node` 配對且無請求範圍的情況，並且不會自動批准操作員/瀏覽器/Control UI、WebChat、角色升級、範圍升級、元資料變更、公開金鑰變更，或同主機回環信任代理標頭路徑，除非明確啟用了回環信任代理驗證。
- 將 `sessionKey` 視為驗證權杖的「缺少逐使用者授權」發現。

</Accordion>

## 60 秒內建立強化基線

請先使用此基線，然後針對信任的代理程式選擇性地重新啟用工具：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
  },
}
```

這可讓閘道保持僅限本機、隔離 DM，並預設停用控制平面/執行階段工具。

## 共享收件匣快速規則

如果多個人可以傳送私訊給您的機器人：

- 設定 `session.dmScope: "per-channel-peer"`（對於多帳號通道則設定 `"per-account-channel-peer"`）。
- 保持 `dmPolicy: "pairing"` 或嚴格的允許清單。
- 切勿將共用的私訊與廣泛的工具存取權限結合使用。
- 這能加強協作/共用收件匣的安全性，但當使用者共用主機/設定寫入權限時，並非設計為對抗惡意共同租用者的隔離機制。

## 情境可見性模型

OpenClaw 區分了兩個概念：

- **觸發授權**：誰可以觸發代理程式（`dmPolicy`、`groupPolicy`、允許清單、提及閘門）。
- **情境可見性**：有哪些補充情境會被注入到模型輸入中（回覆內容、引用文字、串記錄、轉發的中繼資料）。

允許清單會限制觸發和指令授權。`contextVisibility` 設定控制如何過濾補充情境（引用回覆、串根、擷取的記錄）：

- `contextVisibility: "all"`（預設值）保持接收到的補充情境不變。
- `contextVisibility: "allowlist"` 將補充情境過濾為僅包含經主動允許清單檢查通過的傳送者。
- `contextVisibility: "allowlist_quote"` 的行為類似 `allowlist`，但仍會保留一個明確的引用回覆。

針對每個通道或每個房間/對話設定 `contextVisibility`。有關設定詳情，請參閱[群組聊天](/zh-Hant/channels/groups#context-visibility-and-allowlists)。

建議分診指引：

- 僅顯示「模型可以看到來自非允許清單傳送者的引用或歷史文字」的主張，是可透過 `contextVisibility` 解決的加強性發現，本身並非授權或沙箱邊界繞過。
- 若要對安全性產生影響，報告仍需展示出經證實的信任邊界繞過（授權、原則、沙箱、核准或其他已記錄的邊界）。

## 稽核檢查的項目（高層次）

- **輸入存取**（DM 原則、群組原則、允許清單）：陌生人是否可以觸發機器人？
- **工具影響範圍**（提昇權限的工具 + 開放式房間）：提示注入是否會轉變為 shell/檔案/網路動作？
- **Exec 檔案系統偏移**：當 `exec`/`process` 在沒有沙箱檔案系統限制的情況下仍然可用時，是否拒絕了變更檔案系統的工具？
- **執行審批偏移**（`security=full`、`autoAllowSkills`、未含 `strictInlineEval` 的直譯器允許清單）：主機執行防護措施是否仍在發揮您預期的作用？
  - `security="full"` 是一個廣泛的姿態警告，而非錯誤的證明。它是受信任個人助理設定的選用預設值；僅在您的威脅模型需要審批或允許清單防護措施時才需收緊。
- **網路暴露**（Gateway 綁定/認證、Tailscale Serve/Funnel、弱/短認證 token）。
- **瀏覽器控制暴露**（遠端節點、中繼連接埠、遠端 CDP 端點）。
- **本機磁碟衛生**（權限、符號連結、組態包含、「同步資料夾」路徑）。
- **外掛程式**（外掛程式在無明確允許清單的情況下載入）。
- **政策偏移/錯誤設定**（已設定沙箱 docker 設定但沙箱模式關閉；`gateway.nodes.denyCommands` 模式無效，因為比對僅限於精確的指令名稱（例如 `system.run`），且不檢查 shell 文字；危險的 `gateway.nodes.allowCommands` 項目；全域 `tools.profile="minimal"` 被每個代理程式的設定檔覆寫；在寬鬆的工具政策下可存取外掛程式擁有的工具）。
- **執行時期望偏移**（例如假設隱含執行仍然意味著 `sandbox`，而當 `tools.exec.host` 現在預設為 `auto` 時；或在沙箱模式關閉時明確設定 `tools.exec.host="sandbox"`）。
- **模型衛生**（當設定的模型顯示為舊版時發出警告；並非硬性阻擋）。

如果您執行 `--deep`，OpenClaw 也會嘗試盡力進行即時 Gateway 探測。

## 憑證儲存對應

在稽核存取權或決定要備份什麼時使用此對應：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`（僅限一般檔案；拒絕符號連結）
- **Discord bot token**：config/env 或 SecretRef（env/file/exec 提供者）
- **Slack tokens**：config/env（`channels.slack.*`）
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（預設帳戶）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非預設帳戶）
- **Model auth profiles**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Codex 執行時狀態**：`~/.openclaw/agents/<agentId>/agent/codex-home/`
- **檔案支援的秘密載荷（選用）**：`~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**：`~/.openclaw/credentials/oauth.json`

## 安全稽核檢查清單

當稽核列印結果時，請將其視為優先順序：

1. **任何「開放」狀態 + 啟用工具**：先鎖定 DM/群組（配對/允許清單），然後收緊工具政策/沙箱。
2. **公開網路暴露**（LAN 繫結、Funnel、缺少驗證）：立即修復。
3. **瀏覽器控制遠端暴露**：將其視為操作員存取（僅限 tailnet、刻意配對節點、避免公開暴露）。
4. **權限**：確保 state/config/credentials/auth 不會被群組/世界讀取。
5. **外掛程式**：僅載入您明確信任的項目。
6. **模型選擇**：對於任何具有工具的機器人，優先使用現代化、經指令強化的模型。

## 安全稽核術語表

每個稽核結果都以結構化的 `checkId` 為鍵（例如
`gateway.bind_no_auth` 或 `tools.exec.security_full_configured`）。常見的
嚴重嚴重性類別：

- `fs.*` - 狀態、設定、憑證、驗證設定檔的檔案系統權限。
- `gateway.*` - 繫結模式、驗證、Tailscale、控制 UI、trusted-proxy 設定。
- `hooks.*`、`browser.*`、`sandbox.*`、`tools.exec.*` - 各介面強化。
- `plugins.*`、`skills.*` - 外掛程式/技能供應鏈和掃描結果。
- `security.exposure.*` - 跨領域檢查，涉及存取政策與工具爆炸半徑的交會處。

請參閱包含嚴重性等級、修復鍵和自動修復支援的完整目錄
[Security audit checks](/zh-Hant/gateway/security/audit-checks)。

## 透過 HTTP 的控制 UI

控制 UI 需要**安全內容**（HTTPS 或 localhost）才能產生裝置
身分。`gateway.controlUi.allowInsecureAuth` 是本機相容性切換開關：

- 在本機上，當頁面透過非安全的 HTTP 載入時，它允許沒有裝置身分的控制 UI 驗證。
- 它不會繞過配對檢查。
- 它不會放寬遠端（非本機）裝置身分要求。

優先使用 HTTPS (Tailscale Serve) 或在 `127.0.0.1` 上開啟 UI。

僅適用於緊急情況 (break-glass scenarios)，`gateway.controlUi.dangerouslyDisableDeviceAuth`
會完全停用裝置身分檢查。這是一項嚴重的安全性降級；
除非您正在主動偵錯且能夠迅速還原，否則請保持關閉。

除了這些危險的標誌之外，成功的 `gateway.auth.mode: "trusted-proxy"`
可以在不具備裝置身分的情況下允許 **operator** 控制台會話。這是一種
有意為之的認證模式行為，而非 `allowInsecureAuth` 捷徑，而且它
仍然不適用於 node-role 控制台會話。

當啟用此設定時，`openclaw security audit` 會發出警告。

## 不安全或危險的標誌摘要

當啟用已知的不安全/危險偵錯開關時，
`openclaw security audit` 會引發 `config.insecure_or_dangerous_flags`。請在生產環境中
保持未設定這些選項。每個啟用的標誌都會作為單獨的發現事項進行回報。如果
設定了審計抑制 (audit suppressions)，即使相符的發現事項移至
`suppressedFindings`，`security.audit.suppressions.active` 仍會保留在
作用中的審計輸出中。

<AccordionGroup>
  <Accordion title="目前由審計追蹤的標誌">
    - `gateway.controlUi.allowInsecureAuth=true`
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
    - `security.audit.suppressions configured (<count>)`
    - `hooks.gmail.allowUnsafeExternalContent=true`
    - `hooks.mappings[<index>].allowUnsafeExternalContent=true`
    - `tools.exec.applyPatch.workspaceOnly=false`
    - `plugins.entries.acpx.config.permissionMode=approve-all`

  </Accordion>

  <Accordion title="All `dangerous*` / `dangerously*` keys in the config schema">
    控制 UI 與瀏覽器：

    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth`
    - `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

    頻道名稱匹配（內建與外掛頻道；亦可在適用的情況下針對每個
    `accounts.<accountId>` 設定）：

    - `channels.discord.dangerouslyAllowNameMatching`
    - `channels.slack.dangerouslyAllowNameMatching`
    - `channels.googlechat.dangerouslyAllowNameMatching`
    - `channels.msteams.dangerouslyAllowNameMatching`
    - `channels.synology-chat.dangerouslyAllowNameMatching` (外掛頻道)
    - `channels.synology-chat.dangerouslyAllowInheritedWebhookPath` (外掛頻道)
    - `channels.zalouser.dangerouslyAllowNameMatching` (外掛頻道)
    - `channels.irc.dangerouslyAllowNameMatching` (外掛頻道)
    - `channels.mattermost.dangerouslyAllowNameMatching` (外掛頻道)

    網路暴露：

    - `channels.telegram.network.dangerouslyAllowPrivateNetwork` (亦可針對每個帳戶)

    沙箱 Docker（預設值 + 針對代理程式）：

    - `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
    - `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
    - `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

  </Accordion>
</AccordionGroup>

## 反向代理伺服器設定

如果您在反向代理伺服器（nginx、Caddy、Traefik 等）後方執行 Gateway，請設定
`gateway.trustedProxies` 以正確處理轉發的用戶端 IP。

當 Gateway 偵測到來自**不**在 `trustedProxies` 中之位址的代理標頭時，它將**不會**將連線視為本地用戶端。如果已停用 Gateway 驗證，這些連線將會被拒絕。這可防止驗證繞過，否則經過代理的連線會看似來自 localhost 並獲得自動信任。

`gateway.trustedProxies` 也會提供給 `gateway.auth.mode: "trusted-proxy"` 使用，但該驗證模式更為嚴格：

- trusted-proxy auth **預設會對來自回環來源的代理封閉式失敗**
- 同主機的回環反向代理伺服器可以使用 `gateway.trustedProxies` 進行本地用戶端偵測與轉發 IP 處理
- 同主機的回環反向代理伺服器僅在 `gateway.auth.trustedProxy.allowLoopback = true` 時才能滿足 `gateway.auth.mode: "trusted-proxy"`；否則請使用 token/密碼驗證

```yaml
gateway:
  trustedProxies:
    - "10.0.0.1" # reverse proxy IP
  # Optional. Default false.
  # Only enable if your proxy cannot provide X-Forwarded-For.
  allowRealIpFallback: false
  auth:
    mode: password
    password: ${OPENCLAW_GATEWAY_PASSWORD}
```

當設定 `trustedProxies` 時，Gateway 會使用 `X-Forwarded-For` 來判斷用戶端 IP。除非明確設定了 `gateway.allowRealIpFallback: true`，否則預設會忽略 `X-Real-IP`。

受信任的 proxy 標頭並不會讓節點裝置配對自動受信任。
`gateway.nodes.pairing.autoApproveCidrs` 是一個獨立的、預設停用的
操作員政策。即使啟用，來自回來源受信任 proxy 標頭的路徑
也會被排除在節點自動核准之外，因為本地呼叫者可以偽造這些
標頭，包括在明確啟用回來源受信任 proxy 驗證時。

良好的 reverse proxy 行為（覆寫傳入的轉送標頭）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良的 reverse proxy 行為（附加/保留不受信任的轉送標頭）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 與來源備註

- OpenClaw gateway 以本地/回來源優先。如果您在 reverse proxy 終止 TLS，請在該處對面向 proxy 的 HTTPS 網域設定 HSTS。
- 如果 gateway 本身終止 HTTPS，您可以設定 `gateway.http.securityHeaders.strictTransportSecurity` 以從 OpenClaw 回應中發出 HSTS 標頭。
- 詳細的部署指引請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 對於非回來源的控制 UI 部署，預設需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是一個明確允許所有瀏覽器來源的政策，而非強化的預設值。請避免在嚴密控制的本地測試之外使用它。
- 回來源上的瀏覽器來源驗證失敗仍然會受到速率限制，即使
  啟用了一般回來源豁免，但鎖定金鑰的範圍是依
  正規化的 `Origin` 值，而非一個共用的 localhost 儲存區。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源後援模式；請將其視為危險的操作員選取政策。
- 請將 DNS rebind 和 proxy-host 標頭行為視為部署強化考量；保持 `trustedProxies` 嚴謹，並避免直接將 gateway 暴露於公開網際網路。

## 本機階段記錄存在於磁碟上

OpenClaw 將會話記錄儲存在磁碟上的 `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下。
這是會話連續性和（可選）會話記憶體索引所必需的，但這也意味著
**任何具有檔案系統存取權限的進程/使用者都可以讀取這些日誌**。請將磁碟存取視為信任
邊界，並鎖定 `~/.openclaw` 的權限（請參見下文的審計部分）。如果您需要
在代理之間進行更強的隔離，請在單獨的 OS 使用者或單獨的主機上運行它們。

## 節點執行 (system.run)

如果配對了 macOS 節點，Gateway 可以在該節點上調用 `system.run`。這是 Mac 上的 **遠端程式碼執行**：

- 需要節點配對（批准 + token）。
- Gateway 節點配對不是針對每個命令的批准介面。它建立節點身分/信任和 token 發行。
- Gateway 透過 `gateway.nodes.allowCommands` / `denyCommands` 應用粗略的全域節點命令策略。
- 在 Mac 上透過 **Settings → Exec approvals** 進行控制（security + ask + allowlist）。
- 每個節點的 `system.run` 策略是節點自己的 exec approvals 檔案 (`exec.approvals.node.*`)，它可以比 Gateway 的全域命令 ID 策略更嚴格或更寬鬆。
- 以 `security="full"` 和 `ask="off"` 運行的節點遵循預設的受信任操作員模型。除非您的部署明確需要更嚴格的批准或允許清單立場，否則將其視為預期行為。
- 批准模式綁定確切的請求上下文，並在可能的情況下綁定一個具體的本機腳本/檔案操作數。如果 OpenClaw 無法為直譯器/運行時命令確切識別一個直接的本機檔案，則會拒絕基於批准的執行，而不是承諾完全的語義覆蓋。
- 對於 `host=node`，基於批准的運行還會儲存一個規範的準備好
  `systemRunPlan`；後續批准的轉發重用該儲存的計畫，並且 Gateway
  驗證會拒絕在建立批准請求後對命令/cwd/會話上下文的調用者編輯。
- 如果您不希望進行遠端執行，請將 security 設定為 **deny** 並移除該 Mac 的節點配對。

此區別對於檢修很重要：

- 如果 Gateway 全域政策和節點的本機執行核准仍然強制執行實際的執行邊界，那麼重新連線並廣告不同指令清單的配對節點本身並不是漏洞。
- 將節點配對元資料視為第二個隱藏的逐指令核准層的報告，通常是政策/UX 的混淆，而非繞過安全邊界。

## 動態技能

OpenClaw 可以在會話中途重新整理技能清單：

- **技能監看器**：對 `SKILL.md` 的變更可以在下一次代理輪次更新技能快照。
- **遠端節點**：連接 macOS 節點可以讓僅限 macOS 的技能變為可用（基於 bin 探測）。

將技能資料夾視為 **受信任的程式碼**，並限制可以修改它們的人員。

## 威脅模型

您的 AI 助理可以：

- 執行任意 shell 指令
- 讀寫檔案
- 存取網路服務
- 傳送訊息給任何人（如果您給予 WhatsApp 存取權）

傳訊給您的人可以：

- 嘗試誘騙您的 AI 做壞事
- 透過社會工程學存取您的資料
- 探測基礎設施細節

## 核心概念：存取控制優於智慧

這裡的大多數失敗並非花俏的漏洞利用 —— 它們是「有人傳訊給機器人，而機器人照做他們要求的事」。

OpenClaw 的立場：

- **身分優先**：決定誰可以與機器人對話（DM 配對 / 允許清單 / 明確的「開放」）。
- **範圍其次**：決定機器人被允許在何處運作（群組允許清單 + 提及閘道、工具、沙盒、裝置權限）。
- **模型最後**：假設模型可以被操縱；設計時確保操縱的爆炸半徑有限。

## 指令授權模型

斜線指令和指令僅對 **經授權的發送者** 有效。授權來自於通道允許清單/配對加上 `commands.useAccessGroups`（請參閱 [組態](/zh-Hant/gateway/configuration) 和 [斜線指令](/zh-Hant/tools/slash-commands)）。如果通道允許清單為空或包含 `"*"`，則該通道的指令實際上為開放狀態。

`/exec` 是經授權操作員在會話內的便利功能。它 **不會** 寫入設定或變更其他會話。

## 控制平面工具風險

兩個內建工具可以進行永久的控制平面變更：

- `gateway` 可以使用 `config.schema.lookup` / `config.get` 檢查設定，並使用 `config.apply`、`config.patch` 和 `update.run` 進行持久性變更。
- `cron` 可以建立在原始聊天/任務結束後繼續執行的排程任務。

面向代理程式的 `gateway` 執行期工具仍然拒絕覆寫
`tools.exec.ask` 或 `tools.exec.security`；舊版 `tools.bash.*` 別名會在寫入前正規化為相同的受保護執行路徑。
代理程式驅動的 `gateway config.apply` 和 `gateway config.patch` 編輯預設為失敗關閉 (fail-closed)：只有一小部分提示、模型和提及閘道路徑可由代理程式調整。因此，除非故意新增到允許清單中，否則新的敏感設定樹會受到保護。

對於任何處理不受信任內容的代理程式/介面，預設拒絕以下操作：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 僅封鎖重新啟動動作。它不會停用 `gateway` 設定/更新動作。

## 外掛程式

外掛程式與閘道 **同處理序** 執行。請將其視為受信任的程式碼：

- 僅安裝來自您信任來源的外掛程式。
- 優先使用明確的 `plugins.allow` 允許清單。
- 在啟用前審查外掛程式設定。
- 外掛程式變更後請重新啟動閘道。
- 如果您安裝或更新外掛程式 (`openclaw plugins install <package>`, `openclaw plugins update <id>`)，請將其視為執行不受信任的程式碼：
  - 安裝路徑是現用外掛程式安裝根目錄下的個別外掛程式目錄。
  - OpenClaw 在安裝/更新前會執行內建的危险程式碼掃描。`critical` 發現的問題預設會被封鎖。
  - npm 和 git 外掛程式安裝僅在明確的安裝/更新流程期間執行套件管理器相依性收斂。本機路徑和封存會被視為獨立的外掛程式套件；OpenClaw 會複製/參照它們，而不執行 `npm install`。
  - 優先使用鎖定的確切版本 (`@scope/pkg@1.2.3`)，並在啟用前檢查磁碟上解壓縮的程式碼。
  - `--dangerously-force-unsafe-install` 僅用於外掛程式安裝/更新流程中內建掃描誤報的緊急權限。它不會繞過外掛程式 `before_install` hook 政策區塊，也不會繞過掃描失敗。
  - 由 Gateway 支援的技能相依性安裝遵循相同的危險/可疑區分：除非呼叫者明確設定 `dangerouslyForceUnsafeInstall`，否則內建 `critical` 發現會被阻擋，而可疑發現仍然僅發出警告。`openclaw skills install` 仍是單獨的 ClawHub 技能下載/安裝流程。

詳情：[外掛程式](/zh-Hant/tools/plugin)

## DM 存取模型：配對、允許清單、開放、已停用

所有目前支援 DM 的頻道都支援 DM 政策 (`dmPolicy` 或 `*.dm.policy`)，該政策會在處理訊息**之前**對傳入的 DM 進行把關：

- `pairing` (預設值)：未知發送者會收到一個簡短的配對碼，且機器人在核准前會忽略其訊息。配對碼會在 1 小時後過期；重複的 DM 在建立新請求之前不會重新發送配對碼。待處理請求預設限制為**每個頻道 3 個**。
- `allowlist`：未知發送者會被封鎖 (無配對交握)。
- `open`：允許任何人 DM (公開)。**需要**頻道允許清單包含 `"*"` (明確選擇加入)。
- `disabled`：完全忽略傳入的 DM。

透過 CLI 核准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

詳情 + 磁碟上的檔案：[配對](/zh-Hant/channels/pairing)

## DM 工作階段隔離 (多使用者模式)

根據預設，OpenClaw 會將**所有 DM 路由到主工作階段**，因此您的助理在裝置和頻道之間具有連續性。如果**多個人**可以 DM 機器人 (開放 DM 或多人允許清單)，請考慮隔離 DM 工作階段：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

這可以防止跨使用者內容洩漏，同時保持群組聊天隔離。

這是訊息內容邊界，而非主機管理員邊界。如果使用者之間存在相互對抗關係並共用相同的 Gateway 主機/設定，請改為每個信任邊界執行個別的 gateway。

### 安全 DM 模式 (建議)

將上述程式碼片段視為**安全 DM 模式**：

- 預設值：`session.dmScope: "main"` (所有 DM 共用一個工作階段以保持連續性)。
- 本機 CLI 入駐預設值：若未設定則寫入 `session.dmScope: "per-channel-peer"`（保留現有的明確值）。
- 安全 DM 模式：`session.dmScope: "per-channel-peer"`（每個頻道+發送者組合都會獲得一個獨立的 DM 語境）。
- 跨頻道對等隔離：`session.dmScope: "per-peer"`（每個發送者在所有相同類型的頻道中共享一個會話）。

如果您在同一個頻道上執行多個帳戶，請改用 `per-account-channel-peer`。如果同一個人透過多個頻道聯絡您，請使用 `session.identityLinks` 將這些 DM 會話合併為一個標準身分。請參閱 [會話管理](/zh-Hant/concepts/session) 和 [設定](/zh-Hant/gateway/configuration)。

## DM 和群組的允許清單

OpenClaw 有兩個分開的「誰可以觸發我？」層級：

- **DM 允許清單**（`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；舊版：`channels.discord.dm.allowFrom`、`channels.slack.dm.allowFrom`）：允許誰在直接訊息中與機器人交談。
  - 當 `dmPolicy="pairing"` 時，批准會被寫入 `~/.openclaw/credentials/` 下的帳戶範圍配對允許清單儲存（預設帳戶為 `<channel>-allowFrom.json`，非預設帳戶為 `<channel>-<accountId>-allowFrom.json`），並與設定允許清單合併。
- **群組允許清單**（特定頻道）：機器人會從哪些群組/頻道/公會接受訊息。
  - 常見模式：
    - `channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`：每個群組的預設值，例如 `requireMention`；設定後，它也會充當群組允許清單（包含 `"*"` 以維持允許所有行為）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制誰可以在群組會話 _內部_ 觸發機器人（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）。
    - `channels.discord.guilds` / `channels.slack.channels`：每個介面的允許清單 + 提及預設值。
  - 群組檢查按以下順序執行：`groupPolicy`/群組允許清單優先，提及/回覆啟動次之。
  - 回覆機器人訊息（隱含提及）並**不**會繞過像 `groupAllowFrom` 這類的發送者允許清單。
  - **安全注意：** 請將 `dmPolicy="open"` 和 `groupPolicy="open"` 視為最後手段的設定。應盡量少用它們；除非您完全信任房間中的每個成員，否則請優先使用配對 + 允許清單。

詳細資訊：[配置](/zh-Hant/gateway/configuration) 和 [群組](/zh-Hant/channels/groups)

## 提示注入（它是什麼，為什麼它很重要）

提示注入是指攻擊者精心編寫一則訊息，操縱模型執行不安全的操作（「忽略您的指令」、「傾印您的檔案系統」、「跟隨此連結並執行指令」等）。

即使有強大的系統提示，**提示注入問題仍未解決**。系統提示防護措施僅屬於軟性指引；強制執行來自工具原則、執行核准、沙盒和通道允許清單（且操作員可依設計停用這些功能）。實務上有效的做法包括：

- 鎖定傳入的私人訊息（配對/允許清單）。
- 在群組中優先使用提及閘門；避免在公開房間中使用「始終啟用」的機器人。
- 預設將連結、附件和貼上的指令視為惡意內容。
- 在沙盒中執行敏感的工具操作；將機密資訊遠離代理人可存取的檔案系統。
- 注意：沙盒功能是選用的。如果關閉沙盒模式，隱含的 `host=auto` 會解析為閘道主機。明確的 `host=sandbox` 仍會因沒有可用的沙盒執行時而失敗關閉。如果您希望該行為在配置中顯式表達，請設定 `host=gateway`。
- 將高風險工具（`exec`、`browser`、`web_fetch`、`web_search`）限制為僅供信任的代理人或明確的允許清單使用。
- 如果您將解譯器列入允許清單（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`），請啟用 `tools.exec.strictInlineEval`，這樣內嵌評估表單仍需要明確核准。
- Shell 審核分析也會拒絕位於 **未加引號 heredocs** 內的 POSIX 參數擴展形式（`$VAR`、`$?`、`$$`、`$1`、`$@`、`${…}`），因此白名單中的 heredoc 主體無法以純文字形式在白名單審核中偷偷混入 Shell 擴展。請對 heredoc 終止符加引號（例如 `<<'EOF'`）以選擇字面主體語義；原本會擴展變數的未加引號 heredocs 將被拒絕。
- **模型選擇很重要：** 舊型/較小/舊版模型對於提示詞注入和工具誤用的防禦能力明顯較弱。對於啟用工具的代理，請使用可用的最強且經過指令強化的最新世代模型。

視為不可信的危險訊號：

- 「讀取這個檔案/URL 並完全照它說的做。」
- 「忽略你的系統提示詞或安全規則。」
- 「揭露你的隱藏指令或工具輸出。」
- 「貼上 ~/.openclaw 或你的日誌的完整內容。」

## 外部內容特殊標記清理

OpenClaw 會在包裹的外部內容和中繼資料到達模型之前，從中剝除常見的自託管 LLM 聊天範本特殊標記字面值。涵蓋的標記系列包括 Qwen/ChatML、Llama、Gemma、Mistral、Phi 和 GPT-OSS 角色/輪次標記。

原因：

- 位於自託管模型前端的 OpenAI 相容後端，有時會保留出現在使用者文字中的特殊標記，而不是將其遮蔽。否則，能夠寫入傳入外部內容（例如擷取的頁面、電子郵件主體、檔案內容工具輸出）的攻擊者，可能會注入合成的 `assistant` 或 `system` 角色邊界，並逃離包裹內容的防護措施。
- 清理發生在外部內容包裹層，因此它統一適用於擷取/讀取工具和傳入通道內容，而不是依據供應商而定。
- 出站模型回應已經具備一個獨立的過濾器，它會在最終通道傳遞邊界，從用戶可見的回覆中移除洩漏的 `<tool_call>`、`<function_calls>`、`<system-reminder>`、`<previous_response>` 及類似的內部運行時支撐結構。外部內容過濾器則是其入站對應部分。

這並不能取代本頁中的其他加固措施 —— `dmPolicy`、允許清單、執行核准、沙箱機制以及 `contextVisibility` 仍然發揮著主要作用。它封閉了針對自託管堆疊的一個特定詞元化層繞過漏洞，這些堆疊會轉發帶有特殊標記的用戶文本。

## 不安全的外部內容繞過標誌

OpenClaw 包含明確的繞過標誌，用於禁用外部內容安全包裝：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 載荷欄位 `allowUnsafeExternalContent`

指引：

- 在生產環境中保持這些設定為未設定或 false。
- 僅在範圍嚴格受限的除錯期間暫時啟用。
- 如果啟用，請隔離該代理程式（沙箱 + 最少工具 + 專用會話命名空間）。

Hook 風險說明：

- Hook 載荷是不可信內容，即使遞送來自您控制的系統（郵件/文件/網頁內容可能攜帶提示注入）。
- 較弱的模型層級會增加此風險。對於 Hook 驅動的自動化，建議使用強大的現代模型層級，並保持嚴格的工具策略（`tools.profile: "messaging"` 或更嚴格），並在可行的情況下使用沙箱。

### 提示注入不需要公開的 DM

即使**只有您**可以向機器人發送訊息，提示注入仍可能透過機器人讀取的任何**不可信內容**（網頁搜尋/擷取結果、瀏覽器頁面、電子郵件、文件、附件、貼上的日誌/代碼）發生。換句話說：發送者並非唯一的威脅表面；**內容本身**也可能攜帶對抗性指令。

啟用工具時，典型的風險是外洩上下文或觸發工具呼叫。請透過以下方式減輕影響範圍：

- 使用唯讀或已停用工具的**閱讀器代理程式**來摘要不可信內容，
  然後將摘要傳遞給您的主代理程式。
- 除非必要，否則對啟用工具的代理程式保持 `web_search` / `web_fetch` / `browser` 為關閉狀態。
- 對於 OpenResponses URL 輸入（`input_file` / `input_image`），請設定嚴格的
  `gateway.http.endpoints.responses.files.urlAllowlist` 和
  `gateway.http.endpoints.responses.images.urlAllowlist`，並將 `maxUrlParts` 保持在低位。
  空白允許清單會被視為未設定；如果您想完全停用 URL 擷取，請使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 對於 OpenResponses 檔案輸入，解碼後的 `input_file` 文字仍會被注入為
  **不受信任的外部內容**。不要僅因為 Gateway 在本機解碼了檔案文字就對其信賴。注入的區塊仍然帶有明確的
  `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 邊界標記以及 `Source: External`
  元資料，即使此路徑省略了較長的 `SECURITY NOTICE:` 橫幅。
- 當媒體理解功能從附加文件中擷取文字並將該文字附加至媒體提示時，會套用相同的基於標記的包裝方式。
- 為任何接觸不受信任輸入的代理程式啟用沙盒機制和嚴格的工具允許清單。
- 避免將機密資訊放入提示中；請改為透過 Gateway 主機上的 env/config 傳遞這些資訊。

### 自託管 LLM 後端

OpenAI 相容的自託管後端（例如 vLLM、SGLang、TGI、LM Studio
或自訂 Hugging Face tokenizer 堆疊）在處理
chat-template 特殊標記的方式上，可能與託管供應商不同。如果後端將諸如 `<|im_start|>`、`<|start_header_id|>` 或 `<start_of_turn>` 等字串字面量
在用戶內容中標記為結構性 chat-template 標記，不受信任的文字可能會嘗試
在 tokenizer 層級偽造角色邊界。

OpenClaw 會在將包裝後的外部內容發送至模型之前，從中剝除常見的模型家族特殊標記字面量。請保持啟用外部內容包裝功能，並且在可用的情況下，優先選擇能夠分割或跳脫使用者提供內容中特殊標記的後端設定。諸如 OpenAI
和 Anthropic 等託管供應商已經套用了自己的請求端清理機制。

### 模型強度（安全說明）

對於提示注入的抵抗力在模型層級間**並不**一致。較小/較便宜的模型通常更容易受到工具濫用和指令劫持，尤其是在惡意提示下。

<Warning>對於啟用工具的代理或讀取不受信任內容的代理，在舊型/小型模型上進行提示注入的風險通常過高。請勿在弱模型層級上執行這些工作負載。</Warning>

建議：

- 對於任何可以執行工具或存取檔案/網路的機器人，**請使用最新世代、最高層級的模型**。
- **請勿使用舊型/較弱/小型層級的模型**用於啟用工具的代理或不受信任的收件匣；提示注入風險過高。
- 如果您必須使用較小的模型，**請降低影響範圍**（唯讀工具、強力沙盒、最小檔案系統存取權、嚴格的白名單）。
- 執行小型模型時，**請為所有工作階段啟用沙盒**，並**停用 web_search/web_fetch/browser**，除非輸入受到嚴格控制。
- 對於具有受信任輸入且無工具的純聊天個人助理，小型模型通常是可以的。

## 群組中的推理和詳細輸出

`/reasoning`、`/verbose` 和 `/trace` 可能會暴露內部推理、工具
輸出或外掛程式診斷資訊，而這些資訊並非
意圖供公開頻道使用。在群組設定中，請將其視為**僅供
偵錯使用**，除非您明確需要它們，否則請將其關閉。

指引：

- 請在公開房間中停用 `/reasoning`、`/verbose` 和 `/trace`。
- 如果您啟用它們，請僅在受信任的私訊 (DM) 或嚴格控制的房間中進行。
- 請記住：詳細和追蹤輸出可能包含工具引數、URL、外掛程式診斷資訊以及模型所看到的資料。

## 設定加固範例

### 檔案權限

在閘道主機上將設定 + 狀態保持為私有：

- `~/.openclaw/openclaw.json`： `600` （僅限使用者讀寫）
- `~/.openclaw`： `700` （僅限使用者）

`openclaw doctor` 可以警告並提議加嚴這些權限。

### 網路暴露 (綁定、連接埠、防火牆)

閘道在單一連接埠上多工處理 **WebSocket + HTTP**：

- 預設值： `18789`
- 設定/旗標/環境變數： `gateway.port`、`--port`、`OPENCLAW_GATEWAY_PORT`

此 HTTP 介面包含控制 UI 和畫布主機：

- 控制 UI (SPA 資源) (預設基礎路徑 `/`)
- Canvas 主機：`/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` (任意 HTML/JS；將其視為不受信任的內容)

如果您在一般瀏覽器中載入 canvas 內容，請將其視為任何其他不受信任的網頁：

- 不要將 canvas 主機暴露給不受信任的網路/使用者。
- 除非您完全了解其含意，否則不要讓 canvas 內容與具特權的網頁表面共享相同來源。

綁定模式控制 Gateway 的監聽位置：

- `gateway.bind: "loopback"` (預設)：僅本地用戶端可以連線。
- 非回環綁定 (`"lan"`、`"tailnet"`、`"custom"`) 會擴大攻擊面。僅在搭配 Gateway 驗證 (共用 Token/密碼或正確設定的受信任 Proxy) 及真實防火牆時使用。

經驗法則：

- 優先使用 Tailscale Serve 而非 LAN 綁定 (Serve 讓 Gateway 保持在回環上，並由 Tailscale 處理存取)。
- 如果您必須綁定到 LAN，請將該連接埠的防火牆設定為嚴格的來源 IP 白名單；切勿廣泛進行連接埠轉發。
- 絕不要在 `0.0.0.0` 上未經驗證即暴露 Gateway。

### 使用 UFW 發布 Docker 連接埠

如果您在 VPS 上使用 Docker 執行 OpenClaw，請記住已發布的容器連接埠
(`-p HOST:CONTAINER` 或 Compose `ports:`) 是透過 Docker 的轉發
鏈路由，而不僅是主機 `INPUT` 規則。

為了保持 Docker 流量與您的防火牆政策一致，請在
`DOCKER-USER` 中強制執行規則 (此鏈會在 Docker 自己的接受規則之前評估)。
在許多現代發行版上，`iptables`/`ip6tables` 使用 `iptables-nft` 前端
並仍會將這些規則套用至 nftables 後端。

最小白名單範例 (IPv4)：

```bash
# /etc/ufw/after.rules (append as its own *filter section)
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
-A DOCKER-USER -s 127.0.0.0/8 -j RETURN
-A DOCKER-USER -s 10.0.0.0/8 -j RETURN
-A DOCKER-USER -s 172.16.0.0/12 -j RETURN
-A DOCKER-USER -s 192.168.0.0/16 -j RETURN
-A DOCKER-USER -s 100.64.0.0/10 -j RETURN
-A DOCKER-USER -p tcp --dport 80 -j RETURN
-A DOCKER-USER -p tcp --dport 443 -j RETURN
-A DOCKER-USER -m conntrack --ctstate NEW -j DROP
-A DOCKER-USER -j RETURN
COMMIT
```

IPv6 有獨立的表格。如果
啟用了 Docker IPv6，請在 `/etc/ufw/after6.rules` 中新增相符的政策。

避免在文件片段中硬編碼介面名稱，如 `eth0`。介面名稱
會因 VPS 映像檔而異 (`ens3`、`enp*` 等)，且不相符可能會意外
略過您的拒絕規則。

重新載入後的快速驗證：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

預期的外部埠應僅限於您刻意開放的內容（對於大多數設定而言：SSH + 您的反向代理埠）。

### mDNS/Bonjour 探索

當啟用內建的 `bonjour` 外掛程式時，Gateway 會透過 mDNS（埠 5353 上的 `_openclaw-gw._tcp`）廣播其存在，以供本機裝置探索。在完整模式下，這包含可能暴露操作細節的 TXT 記錄：

- `cliPath`：CLI 執行檔的完整檔案系統路徑（會洩露使用者名稱和安裝位置）
- `sshPort`：宣佈主機上有 SSH 可用
- `displayName`、`lanHost`：主機名稱資訊

**營運安全考量：** 廣播基礎設施細節會讓本機網路上的任何人都更容易進行偵查。即使是檔案系統路徑和 SSH 可用性這類「無害」資訊，也能幫助攻擊者繪製您的環境地圖。

**建議事項：**

1. **除非需要區域網路 (LAN) 探索，否則請保持 Bonjour 停用。** Bonjour 在 macOS 主機上會自動啟動，在其他地方則為選用；直接使用 Gateway URL、Tailnet、SSH 或廣域 DNS-SD 可避免本機多播。

2. **最小化模式**（啟用 Bonjour 時的預設值，建議用於已公開的 Gateway）：從 mDNS 廣播中省略敏感欄位：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

3. **停用 mDNS 模式**，如果您想啟用此外掛程式但隱藏本機裝置探索：

   ```json5
   {
     discovery: {
       mdns: { mode: "off" },
     },
   }
   ```

4. **完整模式**（選用）：在 TXT 記錄中包含 `cliPath` + `sshPort`：

   ```json5
   {
     discovery: {
       mdns: { mode: "full" },
     },
   }
   ```

5. **環境變數**（替代方案）：設定 `OPENCLAW_DISABLE_BONJOUR=1` 以停用 mDNS 而無需變更設定。

當在最小化模式下啟用 Bonjour 時，Gateway 會廣播足夠供裝置探索的資訊（`role`、`gatewayPort`、`transport`），但會省略 `cliPath` 和 `sshPort`。需要 CLI 路徑資訊的應用程式可以改透過已驗證的 WebSocket 連線來取得。

### 鎖定 Gateway WebSocket（本機驗證）

Gateway 驗證**預設為必要**。如果未設定有效的 gateway 驗證路徑，Gateway 將拒絕 WebSocket 連線（預設封閉）。

Onboarding 預設會產生一個 token（即使對於 loopback），因此本機用戶端必須進行驗證。

設定一個 token，以便**所有** WS 用戶端都必須進行驗證：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以為您產生一個：`openclaw doctor --generate-gateway-token`。

<Note>`gateway.remote.token` 和 `gateway.remote.password` 是用戶端憑證來源。它們本身並**不**保護本機 WS 存取。本機呼叫路徑僅在未設定 `gateway.auth.*` 時，才能將 `gateway.remote.*` 作為後備。如果 `gateway.auth.token` 或 `gateway.auth.password` 是透過 SecretRef 明確設定且未解析，解析會失敗關閉（沒有遠端後備遮罩）。</Note>
選用：使用 `wss://` 時，使用 `gateway.remote.tlsFingerprint` 釘選遠端 TLS。 純文字 `ws://` 對於 loopback、私有 IP 字面值、`.local` 和 Tailnet `*.ts.net` Gateway URL 是可接受的。對於其他受信任的私有 DNS 名稱，請在用戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為緊急手段。 這是故意僅限於程序環境，而不是 `openclaw.json` 設定 鍵。 行動裝置配對和 Android 手動或掃描的 Gateway 路由更嚴格：
cleartext 對於 loopback 是可接受的，但 private-LAN、link-local、`.local` 和 無點主機名稱必須使用 TLS，除非您明確選擇加入受信任的 私人網路 cleartext 路徑。

本機裝置配對：

- 裝置配對對於直接本機 loopback 連線會自動批准，以保持
  同主機用戶端順暢。
- OpenClaw 也有一個狹窄的後端/容器本機自我連線路徑，用於
  受信任的共享秘密輔助流程。
- Tailnet 和 LAN 連線（包括同主機 tailback 繫結）在配對時被視為
  遠端，仍然需要批准。
- loopback 要求上的轉送標頭證據會取消 loopback
  地區性。元資料升級自動批准的範圍很狹窄。請參閱
  [Gateway 配對](/zh-Hant/gateway/pairing)以了解這兩條規則。

驗證模式：

- `gateway.auth.mode: "token"`：共用 bearer token（建議用於大多數設定）。
- `gateway.auth.mode: "password"`：密碼驗證（建議透過 env 設定：`OPENCLAW_GATEWAY_PASSWORD`）。
- `gateway.auth.mode: "trusted-proxy"`：信任一個具備身份識別能力的反向代理來驗證用戶並透過標頭傳遞身份（參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)）。

輪換檢查清單（權杖/密碼）：

1. 生成/設定一個新的密鑰（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重新啟動 Gateway（如果 macOS 應用程式監管 Gateway，則重新啟動該應用程式）。
3. 更新任何遠端用戶端（呼叫 Gateway 的機器上的 `gateway.remote.token` / `.password`）。
4. 驗證您無法再使用舊的憑證連線。

### Tailscale Serve 身份標頭

當 `gateway.auth.allowTailscale` 為 `true`（Serve 的預設值）時，OpenClaw 接受 Tailscale Serve 身份標頭（`tailscale-user-login`）用於 Control UI/WebSocket 驗證。OpenClaw 透過本機 Tailscale 守護程式（`tailscale whois`）解析 `x-forwarded-for` 位址並將其與標頭進行比對，以此驗證身份。這僅對擊中 loopback 並包含由 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 的請求觸發。
對於此非同步身份檢查路徑，限制器記錄失敗前，相同 `{scope, ip}` 的失敗嘗試會被序列化。因此，來自一個 Serve 用戶端的並發錯誤重試可以立即鎖定第二次嘗試，而不是像兩個單純的不匹配那樣競爭處理。
HTTP API 端點（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）**不**使用 Tailscale 身份標頭驗證。它們仍遵循 Gateway 設定的 HTTP 驗證模式。

重要邊界說明：

- Gateway HTTP bearer 驗證實際上是全有或全無的操作員存取權限。
- 請將可呼叫 `/v1/chat/completions`、`/v1/responses`、外掛路由（如 `/api/v1/admin/rpc`）或 `/api/channels/*` 的憑證視為該 Gateway 的完全存權操作員機密。
- 在 OpenAI 相容的 HTTP 表面上，共享密碼 bearer auth 會恢復完整的預設操作員範圍 (`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`) 以及代理程式回合的擁有者語意；較狹窄的 `x-openclaw-scopes` 值不會減少該共享密碼路徑的權限。
- HTTP 上的每次請求範圍語意，僅在請求是來自承載身分的模式（例如受信任的 proxy auth）或明確無驗證的私有入口時才會套用。
- 在那些承載身分的模式中，省略 `x-openclaw-scopes` 會回退到正常的操作員預設範圍集；當您想要較狹窄的範圍集時，請明確傳送此標頭。
- `/tools/invoke` 和 HTTP 工作階段歷史端點遵循相同的共享密碼規則：token/password bearer auth 也會被視為完全的操作員存取權限，而承載身分的模式則仍會遵守宣告的範圍。
- 請勿與未受信任的呼叫者共用這些憑證；建議每個信任邊界使用個別的閘道。

**信任假設：** 無 token 的 Serve auth 假設閘道主機是受信任的。
請勿將此視為針對惡意同主機程序的保護機制。如果在閘道主機上可能執行
未受信任的本機程式碼，請停用 `gateway.auth.allowTailscale`
並要求透過 `gateway.auth.mode: "token"` 或
`"password"` 進行明確的共享密碼驗證。

**安全規則：** 請勿從您自己的反向代理轉送這些標頭。如果您
在閘道前終止 TLS 或進行代理，請停用
`gateway.auth.allowTailscale` 並改用共享密碼驗證 (`gateway.auth.mode:
"token"` or `"password"`) 或 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)
。

受信任的代理程式：

- 如果您在 Gateway 前終止 TLS，請將 `gateway.trustedProxies` 設為您的 Proxy IP。
- OpenClaw 將信任來自這些 IP 的 `x-forwarded-for` (或 `x-real-ip`)，以判定用於本機配對檢查和 HTTP auth/local 檢查的用戶端 IP。
- 請確保您的 Proxy **覆寫** `x-forwarded-for` 並封鎖對 Gateway 連接埠的直接存取。

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 和 [Web 概覽](/zh-Hant/web)。

### 透過節點主機進行瀏覽器控制（建議）

如果您的 Gateway 是遠端的，但瀏覽器在另一台機器上執行，請在瀏覽器機器上執行 **node host**，並讓 Gateway 代理瀏覽器動作（請參閱 [Browser tool](/zh-Hant/tools/browser)）。請將節點配對視為管理員存取權限。

建議模式：

- 將 Gateway 和 node host 保持在同一個 tailnet (Tailscale) 上。
- 有意地配對節點；如果您不需要，請停用瀏覽器代理路由。

避免：

- 透過區域網路或公開網際網路公開中繼/控制連接埠。
- 針對瀏覽器控制端點使用 Tailscale Funnel（公開暴露）。

### 磁碟上的機密

請假設 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何內容都可能包含機密或私人資料：

- `openclaw.json`：配置可能包含權杖（gateway、remote gateway）、提供者設定和允許清單。
- `credentials/**`：通道憑證（例如：WhatsApp 憑證）、配對允許清單、舊版 OAuth 匯入。
- `agents/<agentId>/agent/auth-profiles.json`：API 金鑰、權杖設定檔、OAuth 權杖，以及選用的 `keyRef`/`tokenRef`。
- `agents/<agentId>/agent/codex-home/**`：每個代理程式的 Codex app-server 帳戶、配置、技能、外掛、原生執行緒狀態和診斷。
- `secrets.json`（選用）：由 `file` SecretRef 提供者使用的檔案支援機密承載 (`secrets.providers`)。
- `agents/<agentId>/agent/auth.json`：舊版相容性檔案。發現靜態 `api_key` 項目時會將其清除。
- `agents/<agentId>/sessions/**`：會話記錄 (`*.jsonl`) + 路由中繼資料 (`sessions.json`)，可包含私人訊息和工具輸出。
- 打包的外掛程式套件：已安裝的外掛程式（及其 `node_modules/`）。
- `sandboxes/**`：工具沙箱工作區；可能會累積您在沙箱內讀寫的檔案副本。

加固提示：

- 保持嚴格的權限（目錄使用 `700`，檔案使用 `600`）。
- 在 Gateway 主機上使用全碟加密。
- 如果主機是共用的，建議為 Gateway 使用專用的 OS 使用者帳戶。

### 工作區 `.env` 檔案

OpenClaw 會載入針對代理程式和工具的工作區本地 `.env` 檔案，但絕不允許這些檔案在無聲無息中覆寫 Gateway 的執行時期控制。

- 供應商憑證環境變數會被從不受信任的工作區 `.env` 檔案中封鎖。範例包括 `GEMINI_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`、`PERPLEXITY_API_KEY`、`BRAVE_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY`、`FIRECRAWL_API_KEY` 以及已安裝受信任外掛程式所宣告的供應商驗證金鑰。請將供應商憑證放在 Gateway 程序環境、`~/.openclaw/.env` (`$OPENCLAW_STATE_DIR/.env`)、設定 `env` 區塊或選用的 login-shell 匯入中。
- 任何以 `OPENCLAW_*` 開頭的金鑰都會被從不受信任的工作區 `.env` 檔案中封鎖。
- 針對 Matrix、Mattermost、IRC 和 Synology Chat 的頻道端點設定也會被從工作區 `.env` 覆寫中封鎖，因此複製的工作區無法透過本機端點設定重新導向打包的連接器流量。端點環境變數金鑰（例如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`）必須來自 Gateway 程序環境或 `env.shellEnv`，而不能來自工作區載入的 `.env`。
- 此封鎖為「故障即封閉」(fail-closed)：未來版本中新增的執行時期控制變數無法從已簽入或攻擊者提供的 `.env` 繼承；該金鑰會被忽略，且 Gateway 將保留其自身的值。
- 受信任的進程/作業系統環境變數、全域運行時 dotenv、設定檔 `env`，以及啟用的登入 shell 匯入仍然適用——這僅限制工作區 `.env` 檔案的載入。

原因：工作區 `.env` 檔案通常位於代理程式碼旁邊、可能被意外提交，或由工具寫入。阻擋提供者憑證可防止複製的工作區替換為攻擊者控制的提供者帳戶。阻擋整個 `OPENCLAW_*` 前綴意味著稍後新增新的 `OPENCLAW_*` 標誌時，絕不會退化為從工作區狀態靜默繼承。

### 日誌和逐字稿（編輯和保留）

即使存取控制正確，日誌和逐字稿仍可能洩露敏感資訊：

- 閘道日誌可能包含工具摘要、錯誤和 URL。
- 會話逐字稿可能包含貼上的機密、檔案內容、指令輸出和連結。

建議：

- 保持日誌和逐字稿編輯開啟（`logging.redactSensitive: "tools"`；預設值）。
- 透過 `logging.redactPatterns` 為您的環境新增自訂模式（權杖、主機名稱、內部 URL）。
- 分享診斷資訊時，優先使用 `openclaw status --all`（可貼上、機密已編輯）而非原始日誌。
- 如果您不需要長期保留，請修剪舊的會話逐字稿和日誌檔案。

詳細資訊：[日誌記錄](/zh-Hant/gateway/logging)

### 直接訊息：預設配對

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 群組：到處都需要提及

```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "*": { "requireMention": true }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "groupChat": { "mentionPatterns": ["@openclaw", "@mybot"] }
      }
    ]
  }
}
```

在群組聊天中，僅在被明確提及時回應。

### 分開的號碼（WhatsApp、Signal、Telegram）

對於基於電話號碼的頻道，請考慮在與個人電話號碼不同的號碼上執行您的 AI：

- 個人號碼：您的對話保持私密
- 機器人號碼：AI 處理這些對話，並具有適當的邊界

### 唯讀模式（透過沙盒和工具）

您可以透過結合以下方式建構唯讀設定檔：

- `agents.defaults.sandbox.workspaceAccess: "ro"`（或 `"none"` 以無工作區存取權）
- 阻擋 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允許/拒絕清單。

額外的加固選項：

- `tools.exec.applyPatch.workspaceOnly: true` (預設值)：確保 `apply_patch` 即使在關閉沙箱時也無法在工作區目錄之外寫入/刪除檔案。僅在您有意讓 `apply_patch` 存取工作區以外的檔案時，才設定為 `false`。
- `tools.fs.workspaceOnly: true` (可選)：將 `read`/`write`/`edit`/`apply_patch` 路徑和原生提示圖片自動載入路徑限制在工作區目錄內（如果您目前允許絕對路徑並希望有單一防護機制，這會很有用）。
- 保持檔案系統根目錄狹窄：避免為代理工作區/沙箱工作區設定像您的家目錄這樣寬泛的根目錄。寬泛的根目錄可能會將敏感的本機檔案（例如 `~/.openclaw` 下的狀態/配置）暴露給檔案系統工具。

### 安全基準（複製/貼上）

一個「安全預設」配置，可保持 Gateway 私有、需要 DM 配對，並避免永遠開啟的群組機器人：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    port: 18789,
    auth: { mode: "token", token: "your-long-random-token" },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

如果您也希望工具執行「預設更安全」，請為任何非擁有者的代理新增沙箱並拒絕危險工具（下方的「Per-agent access profiles」中有範例）。

聊天驅動代理回合的內建基準：非擁有者發送者無法使用 `cron` 或 `gateway` 工具。

## 沙箱（建議）

專屬文件：[Sandboxing](/zh-Hant/gateway/sandboxing)

兩種互補的方法：

- **在 Docker 中執行完整的 Gateway**（容器邊界）：[Docker](/zh-Hant/install/docker)
- **工具沙箱** (`agents.defaults.sandbox`，主機 Gateway + 沙箱隔離工具；Docker 是預設後端)：[Sandboxing](/zh-Hant/gateway/sandboxing)

<Note>為了防止跨代理存取，請將 `agents.defaults.sandbox.scope` 保持為 `"agent"` (預設值) 或 `"session"` 以進行更嚴格的每個會話隔離。`scope: "shared"` 使用單一容器或工作區。</Note>

此外，請考慮沙箱內的代理工作區存取：

- `agents.defaults.sandbox.workspaceAccess: "none"` (預設值) 將代理工作區設為禁止存取；工具針對 `~/.openclaw/sandboxes` 下的沙箱工作區執行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 將代理工作區以唯讀方式掛載於 `/agent`（停用 `write`/`edit`/`apply_patch`）
- `agents.defaults.sandbox.workspaceAccess: "rw"` 將代理工作區以讀寫方式掛載於 `/workspace`
- 額外的 `sandbox.docker.binds` 會根據正規化和標準化的來源路徑進行驗證。如果解析到被阻擋的根目錄（例如 `/etc`、`/var/run` 或 OS 家目錄下的憑證目錄），父目錄符號連結技巧和標準家目錄別名仍會失敗並封閉（fail closed）。

<Warning>`tools.elevated` 是在沙箱外執行 exec 的全域基準逃生艙。有效主機預設為 `gateway`，當 exec 目標設定為 `node` 時則為 `node`。請嚴格控管 `tools.elevated.allowFrom`，不要對陌生人啟用。您可以透過 `agents.list[].tools.elevated` 進一步限制各個代理的提權。請參閱[提權模式](/zh-Hant/tools/elevated)。</Warning>

### 子代理委派防護機制

如果您允許會話工具，請將委派的子代理執行視為另一個邊界決策：

- 拒絕 `sessions_spawn`，除非代理真的需要委派。
- 請將 `agents.defaults.subagents.allowAgents` 和任何各別代理的 `agents.list[].subagents.allowAgents` 覆蓋設定限制為已知安全的目標代理。
- 對於任何必須保持沙箱化的工作流程，請使用 `sandbox: "require"` 呼叫 `sessions_spawn`（預設為 `inherit`）。
- 當目標子執行環境未沙箱化時，`sandbox: "require"` 會快速失敗。

## 瀏覽器控制風險

啟用瀏覽器控制會讓模型具備驅動真實瀏覽器的能力。
如果該瀏覽器設定檔已包含已登入的會話，模型即可
存取這些帳號和資料。請將瀏覽器設定檔視為**敏感狀態**：

- 建議為代理使用專用的設定檔（預設的 `openclaw` 設定檔）。
- 避免將代理指向您的個人日常使用設定檔。
- 對於沙盒代理，除非您信任它們，否則請保持停用主機瀏覽器控制。
- 獨立回環瀏覽器控制 API 僅遵守共享金鑰驗證
  (gateway token bearer auth 或 gateway password)。它不使用
  trusted-proxy 或 Tailscale Serve 身份標頭。
- 將瀏覽器下載視為不受信任的輸入；優先使用獨立的下載目錄。
- 如果可能的話，在代理設定檔中停用瀏覽器同步/密碼管理員（以減少波及範圍）。
- 對於遠端閘道，假設「瀏覽器控制」等同於對該設定檔所能存取之任何內容的「操作員存取權」。
- 將閘道和節點主機保持為僅限 tailnet 存取；避免將瀏覽器控制連接埠暴露給 LAN 或公網。
- 當您不需要瀏覽器代理路由時，請將其停用 (`gateway.nodes.browser.mode="off"`)。
- Chrome MCP 現有工作階段模式並非「更安全」；它可以在該主機 Chrome 設定檔所能存取的任何地方以您的身份行事。

### 瀏覽器 SSRF 政策（預設為嚴格）

OpenClaw 的瀏覽器導航政策預設為嚴格：私有/內部目的地保持封鎖，除非您明確選擇加入。

- 預設值：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未設定，因此瀏覽器導航會繼續封鎖私有/內部/特殊用途的目的地。
- 舊版別名：`browser.ssrfPolicy.allowPrivateNetwork` 為了相容性仍被接受。
- 選用模式：設定 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允許私有/內部/特殊用途的目的地。
- 在嚴格模式下，使用 `hostnameAllowlist` (類似 `*.example.com` 的模式) 和 `allowedHostnames` (精確主機例外，包括被封鎖的名稱如 `localhost`) 來設定明確的例外。
- 導航會在請求之前進行檢查，並在導航後盡最大努力對最終的 `http(s)` URL 重新檢查，以減少基於重新導向的樞紐攻擊。

嚴格政策範例：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"],
    },
  },
}
```

## 各代理存取設定檔（多重代理）

透過多重代理路由，每個代理都可以擁有自己的沙盒 + 工具政策：
利用此功能為每個代理提供 **完整存取**、**唯讀** 或 **無存取權**。
請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解完整細節
和優先順序規則。

常見使用案例：

- 個人代理：完整存取，無沙盒
- 家庭/工作代理：沙盒 + 唯讀工具
- 公開代理程式：沙盒化 + 無檔案系統/Shell 工具

### 範例：完全存取權（無沙盒）

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

### 範例：唯讀工具 + 唯讀工作區

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro",
        },
        tools: {
          allow: ["read"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

### 範例：無檔案系統/Shell 存取權（允許提供者訊息傳遞）

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none",
        },
        // Session tools can reveal sensitive data from transcripts. By default OpenClaw limits these tools
        // to the current session + spawned subagent sessions, but you can clamp further if needed.
        // See `tools.sessions.visibility` in the configuration reference.
        tools: {
          sessions: { visibility: "tree" }, // self | tree | agent | all
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"],
        },
      },
    ],
  },
}
```

## 事件回應

如果您的 AI 做了不當之事：

### 遏制

1. **停止它：** 停止 macOS 應用程式（如果它監管 Gateway）或終止您的 `openclaw gateway` 程序。
2. **關閉暴露：** 設定 `gateway.bind: "loopback"`（或停用 Tailscale Funnel/Serve），直到您了解發生了什麼事。
3. **凍結存取權：** 將風險的私訊/群組切換至 `dmPolicy: "disabled"` / 要求提及，並移除 `"*"` 允許所有項目（如果您有設定的話）。

### 輪換（如果機密外洩則假設已遭入侵）

1. 輪換 Gateway 身份驗證（`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`）並重新啟動。
2. 在任何可呼叫 Gateway 的機器上輪換遠端用戶端機密（`gateway.remote.token` / `.password`）。
3. 輪換提供者/API 憑證（WhatsApp 憑證、Slack/Discord 權杖、`auth-profiles.json` 中的模型/API 金鑰，以及使用時的加密機密 payload 數值）。

### 稽核

1. 檢查 Gateway 日誌：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 檢視相關的對話記錄：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 檢視最近的設定變更（任何可能擴大存取權的項目：`gateway.bind`、`gateway.auth`、dm/group 原則、`tools.elevated`、外掛程式變更）。
4. 重新執行 `openclaw security audit --deep` 並確認關鍵發現已解決。

### 蒐集以供報告

- 時間戳記、gateway 主機作業系統 + OpenClaw 版本
- 對話記錄 + 簡短的日誌尾部（經過編修後）
- 攻擊者發送的內容 + 代理程式執行的操作
- Gateway 是否暴露於 loopback 之外（LAN/Tailscale Funnel/Serve）

## 機密掃描

CI 會在存放庫上執行 pre-commit `detect-private-key` hook。如果失敗，請移除或輪換已提交的金鑰材料，然後在本地重現：

```bash
pre-commit run --all-files detect-private-key
```

## 回報安全性問題

發現 OpenClaw 的漏洞嗎？請負責任地回報：

1. 電子郵件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修復之前，請勿公開發布"
3. 我們將會致謝您（除非您偏好匿名）"
