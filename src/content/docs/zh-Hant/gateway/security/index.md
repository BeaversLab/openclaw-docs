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

## 快速檢查：`openclaw security audit`

另請參閱：[形式驗證（安全性模型）](/zh-Hant/security/formal-verification)

定期執行此操作（尤其是在更改配置或暴露網絡表面之後）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 保持刻意的狹窄：它將常見的開放群組原則反轉為允許清單，恢復 `logging.redactSensitive: "tools"`，加強狀態/配置/包含檔案的權限，並在 Windows 上執行時使用 Windows ACL 重設而非 POSIX `chmod`。

它會標記常見的陷阱（Gateway 授權暴露、瀏覽器控制暴露、提升的允許清單、檔案系統權限、寬鬆的執行批准以及開放通道工具暴露）。

OpenClaw 既是一個產品也是一個實驗：您正在將前沿模型的行為連接到真實的訊息介面和真實的工具。**沒有所謂「完美安全」的設定。** 目標是有意識地做到：

- 誰可以與您的機器人對話
- 允許機器人在何處運作
- 機器人可以接觸什麼

從仍然能運作的最小權限開始，然後隨著您建立信心再逐步放寬。

### 部署與主機信任

OpenClaw 假設主機和配置邊界是受信任的：

- 如果某人可以修改 Gateway 主機狀態/配置（`~/.openclaw`，包括 `openclaw.json`），請將其視為受信任的操作員。
- 為多個互不信任/對立的操作員運行一個 Gateway **不是建議的設置**。
- 對於混合信任的團隊，請使用獨立的 gateway 來劃分信任邊界（或至少分離 OS 使用者/主機）。
- 建議的預設值：每台機器/主機（或 VPS）一個使用者，該使用者一個 gateway，以及該 gateway 中一個或多個 agents。
- 在單一 Gateway 實例內，已驗證的操作員存取是受信任的控制平面角色，而非每個使用者的租戶角色。
- 會話識別符（`sessionKey`、會話 ID、標籤）是路由選擇器，而非授權權杖。
- 如果幾個人可以訊息傳遞給一個已啟用工具的 agent，他們每個人都可以引導同一組權限集。每個使用者的會話/記憶體隔離有助於隱私，但不能將共享 agent 轉換為每個使用者的主機授權。

### 安全的檔案操作

OpenClaw 使用 `@openclaw/fs-safe` 進行以 root 為邊界的檔案存取、原子寫入、歸檔解壓縮、暫存工作區以及秘密檔案輔助功能。OpenClaw 預設將 fs-safe 的選用 POSIX Python 輔助功能設為**關閉**；僅當您需要額外的 fd 相關變異防護並且能支援 Python 執行環境時，才設定 `OPENCLAW_FS_SAFE_PYTHON_MODE=auto` 或 `require`。

詳情：[安全檔案操作](/zh-Hant/gateway/security/secure-file-operations)。

### 共享 Slack 工作區：真正的風險

如果「Slack 中的每個人都可以傳訊息給機器人」，核心風險在於委派的工具權限：

- 任何允許的發送者都可以在代理的策略範圍內誘發工具呼叫（`exec`、瀏覽器、網路/檔案工具）；
- 來自一位發送者的提示/內容注入可能導致影響共享狀態、裝置或輸出的動作；
- 如果一個共享代理擁有敏感的憑證/檔案，任何允許的發送者都可能會透過工具使用潛在地驅動資料外洩。

針對團隊工作流程，請使用具有最小工具集的獨立代理/閘道；將包含個人資料的代理設為私人。

### 公司共享代理：可接受的模式

當使用該代理程式的所有人都在同一個信任邊界內（例如一個公司團隊），並且該代理程式嚴格限於業務範圍時，這是可以接受的。

- 在專用的機器/虛擬機/容器上運行它；
- 為該運行環境使用專用的作業系統使用者 + 專用的瀏覽器/設定檔/帳戶；
- 不要將該運行環境登入個人的 Apple/Google 帳戶或個人的密碼管理器/瀏覽器設定檔。

如果您在同一個運行環境中混合了個人和公司身分，您就消除了隔離並增加了個人資料暴露的風險。

## 閘道和節點信任概念

將閘道和節點視為一個操作員信任域，具有不同的角色：

- **閘道**是控制平面和策略表面 (`gateway.auth`、工具策略、路由)。
- **節點**是與該閘道配對的遠端執行表面（命令、裝置操作、主機本地功能）。
- 通過閘道驗證的呼叫者在閘道範圍內是受信任的。配對後，節點操作即為該節點上受信任的操作員操作。
- 操作員範圍層級與審批時間檢查摘要於
  [操作員範圍](/zh-Hant/gateway/operator-scopes)。
- 使用共享閘道路徑令牌/密碼進行身份驗證的直接迴路後端客戶端可以在不呈現使用者裝置身分的情況下發出內部控制平面 RPC。這不是遠端或瀏覽器配對的繞過：網路客戶端、節點客戶端、裝置令牌客戶端和顯式裝置身分仍需經過配對和範圍升級強制執行。
- `sessionKey` 是路由/環境選擇，而非每個使用者的身份驗證。
- 執行審批（允許清單 + 詢問）是操作員意圖的防護措施，而非惡意多租戶隔離。
- OpenClaw 針對受信任的單操作員設定的產品預設值是，允許在 `gateway`/`node` 上進行主機執行而無需審批提示（`security="full"`、`ask="off"`，除非您收緊它）。該預設值是有意體驗設計，而非本身即為漏洞。
- 執行審批綁定確切的請求上下文和盡力而為的直接本地檔案操作數；它們不會在語義上對每個運行環境/直譯器載入器路徑進行建模。請使用沙盒和主機隔離來建立強大的邊界。

如果您需要敵對用戶隔離，請按作業系統用戶/主機劃分信任邊界，並運行獨立的閘道。

## 信任邊界矩陣

在風險分診時，請將此作為快速模型：

| 邊界或控制                                                | 含義                                 | 常見誤讀                                           |
| --------------------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| `gateway.auth` (token/password/trusted-proxy/device auth) | 對呼叫閘道 API 的進行身份驗證        | "需要在每一幀上都有每條訊息的簽名才能保證安全"     |
| `sessionKey`                                              | 用於上下文/會話選擇的路由鍵          | "會話鍵是用戶身份驗證邊界"                         |
| 提示/內容防護措施                                         | 降低模型濫用風險                     | "僅憑提示注入就能證明繞過了身份驗證"               |
| `canvas.eval` / browser evaluate                          | 啟用時的預期操作員功能               | "在此信任模型中，任何 JS eval 原語自動構成漏洞"    |
| 本地 TUI `!` shell                                        | 由操作員明確觸發的本地執行           | "本地 shell 便捷命令是遠端注入"                    |
| 節點配對和節點命令                                        | 在配對設備上進行操作員級別的遠端執行 | "遠端設備控制預設情況下應被視為不受信任的用戶訪問" |
| `gateway.nodes.pairing.autoApproveCidrs`                  | 可選的信任網絡節點註冊策略           | "預設停用的允許列表是自動配對漏洞"                 |

## 並非設計上的漏洞

<Accordion title="超出範圍的常見發現">

這些模式經常被回報，除非能證明存在真正的邊界繞過，否則通常會被標記為無需採取行動並結案：

- 僅涉及提示詞注入但未繞過策略、驗證或沙箱的攻擊鏈。
- 假設在單一共享主機或配置上進行惡意多租戶運作的聲稱。
- 在共享 Gateway 設定中，將正常的操作員讀取路徑存取（例如
  `sessions.list` / `sessions.preview` / `chat.history`）歸類為 IDOR
  的聲稱。
- 僅限 Localhost 的部署發現（例如僅在 loopback 上的 Gateway 設定 HSTS）。
- 針對此存儲庫中不存在之入站路徑的 Discord 入站 Webhook 簽章發現。
- 將節點配對元數據視為 `system.run` 的隱藏第二層「每次指令」批准層的報告，而實際的執行邊界仍然是 Gateway 的全域節點指令策略加上節點自身的執行批准。
- 將已配置的 `gateway.nodes.pairing.autoApproveCidrs` 視為單純漏洞的報告。此設定預設為停用，需要明確的 CIDR/IP 條目，僅適用於沒有請求範圍的首次 `role: node` 配對，並且不會自動批准操作員/瀏覽器/Control UI、WebChat、角色升級、範圍升級、元數據變更、金鑰變更，或是同主機 loopback trusted-proxy 標頭路徑，除非明確啟用了 loopback trusted-proxy 驗證。
- 將 `sessionKey` 視為驗證 Token 的「缺少每個使用者授權」發現。

</Accordion>

## 60 秒內建立強化基準

先使用此基準，然後針對受信任的代理程式選擇性地重新啟用工具：

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

這可保持 Gateway 僅限本地存取，隔離 DM，並預設停用控制平面/執行時期工具。

## 共享收件匣快速規則

如果超過一個人可以 DM 您的機器人：

- 設定 `session.dmScope: "per-channel-peer"`（針對多帳戶頻道則設定 `"per-account-channel-peer"`）。
- 維持 `dmPolicy: "pairing"` 或嚴格的允許清單。
- 切勿將共享 DM 與廣泛的工具存取權限結合使用。
- 這可以強化協作/共享收件匣，但當使用者共享主機/配置寫入權限時，並非設計為惡意共同租戶隔離。

## 內容可見性模型

OpenClaw 區分了兩個概念：

- **觸發授權**：誰可以觸發代理（`dmPolicy`、`groupPolicy`、允許清單、提及閘門）。
- **上下文可見性**：哪些補充上下文會被注入到模型輸入中（回覆主體、引用文字、執行緒歷史、轉發的中繼資料）。

允許清單控制觸發器和命令授權。`contextVisibility` 設定控制如何篩選補充上下文（引用回覆、執行緒根節點、擷取的歷史）：

- `contextVisibility: "all"`（預設）保持補充上下文與接收時一致。
- `contextVisibility: "allowlist"` 將補充上下文篩選為僅包含啟用允許清單檢查所允許的發送者。
- `contextVisibility: "allowlist_quote"` 的行為類似於 `allowlist`，但仍保留一個明確的引用回覆。

請針對每個頻道或每個房間/對話設定 `contextVisibility`。有關設定詳細資訊，請參閱 [群組聊天](/zh-Hant/channels/groups#context-visibility-and-allowlists)。

諮詢分診指導原則：

- 僅顯示「模型可以看到來自非允許清單發送者的引用或歷史文字」的主張，是可透過 `contextVisibility` 解決的加固發現，本身並非授權或沙箱邊界的繞過。
- 要產生安全影響，報告仍需展示出已證實的信任邊界繞過（授權、原則、沙箱、核准或其他記錄在案的邊界）。

## 稽核檢查項目（高階）

- **輸入存取**（DM 原則、群組原則、允許清單）：陌生人可以觸發機器人嗎？
- **工具爆炸半徑**（提權工具 + 開放式房間）：提示詞注入是否會轉變為 shell/檔案/網路動作？
- **Exec 檔案系統偏移**：當 `exec`/`process` 在沒有沙箱檔案系統限制的情況下仍可用時，變更檔案系統的工具是否被拒絕？
- **Exec 核准偏移**（`security=full`、`autoAllowSkills`、沒有 `strictInlineEval` 的直譯器允許清單）：主機執行防護措施是否仍在執行您認為它們在做的事情？
  - `security="full"` 是一個廣泛的姿態警告，而不是證明存在錯誤。它是受信任的個人助理設定所選的預設值；僅當您的威脅模型需要審核或允許清單防護措施時，才將其收緊。
- **網路暴露** (Gateway 繫結/驗證、Tailscale Serve/Funnel、弱/短驗證 Token)。
- **瀏覽器控制暴露** (遠端節點、中繼連接埠、遠端 CDP 端點)。
- **本機磁碟衛生** (權限、符號連結、設定包含、「同步資料夾」路徑)。
- **外掛程式** (外掛程式在沒有明確允許清單的情況下載入)。
- **原則漂移/設定錯誤** (已設定沙盒 docker 設定但沙盒模式已關閉；`gateway.nodes.denyCommands` 模式無效，因為比對僅限於確切的指令名稱 (例如 `system.run`) 且不檢查 Shell 文字；危險的 `gateway.nodes.allowCommands` 項目；全域 `tools.profile="minimal"` 被每個代理程式設定檔覆寫；在寬鬆的工具原則下可存取外掛程式擁有的工具)。
- **執行時期預期漂移** (例如，假設隱含執行仍意味著 `sandbox`，但當 `tools.exec.host` 現在預設為 `auto` 時，或在沙盒模式關閉時明確設定 `tools.exec.host="sandbox"`)。
- **模型衛生** (當設定的模型看起來過時時發出警告；這不是強制封鎖)。

如果您執行 `--deep`，OpenClaw 也會嘗試盡力進行即時 Gateway 探測。

## 憑證儲存對應表

在稽核存取權或決定要備份什麼時使用此對應表：

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 機器人 Token**: config/env 或 `channels.telegram.tokenFile` (僅限一般檔案；拒絕符號連結)
- **Discord 機器人 Token**: config/env 或 SecretRef (env/file/exec 提供者)
- **Slack Token**: config/env (`channels.slack.*`)
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (預設帳戶)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (非預設帳戶)
- **模型驗證設定檔**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Codex 執行時期狀態**: `~/.openclaw/agents/<agentId>/agent/codex-home/`
- **檔案支援的秘密承載 (可選)**: `~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**: `~/.openclaw/credentials/oauth.json`

## 安全性稽核檢查清單

當稽核列印發現結果時，請將其視為優先順序：

1. **任何「開放」內容 + 已啟用工具**：首先鎖定私訊/群組（配對/允許清單），然後收緊工具政策/沙盒機制。
2. **公開網路暴露**（LAN 繫結、Funnel、缺少驗證）：立即修復。
3. **瀏覽器控制遠端暴露**：將其視為操作員存取（僅限 tailnet、刻意配對節點、避免公開暴露）。
4. **權限**：確保狀態/設定/憑證/驗證設定檔不會被群組/其他使用者讀取。
5. **外掛程式**：僅載入您明確信任的項目。
6. **模型選擇**：對於任何具有工具的機器人，優先選擇現代化、經過指令強化的模型。

## 安全稽核詞彙表

每項稽核發現都以結構化的 `checkId` 為鍵值（例如
`gateway.bind_no_auth` 或 `tools.exec.security_full_configured`）。常見的
嚴重嚴重性類別：

- `fs.*` - 狀態、設定、憑證、驗證設定檔的檔案系統權限。
- `gateway.*` - 繫結模式、驗證、Tailscale、控制 UI、受信任 Proxy 設定。
- `hooks.*`、`browser.*`、`sandbox.*`、`tools.exec.*` - 介面特定強化。
- `plugins.*`、`skills.*` - 外掛程式/技能供應鏈與掃描發現。
- `security.exposure.*` - 跨領域檢查，涉及存取政策與工具影響範圍的交會點。

請參閱 [安全性審計檢查](/zh-Hant/gateway/security/audit-checks) 以了解包含嚴重性層級、修復鍵和自動修復支援的完整目錄。

## 透過 HTTP 存取控制 UI

控制 UI 需要**安全上下文**（HTTPS 或 localhost）才能產生裝置身分。`gateway.controlUi.allowInsecureAuth` 是一個本機相容性切換開關：

- 在 localhost 上，當頁面透過非安全的 HTTP 載入時，它允許控制 UI 在無裝置身分的情況下進行驗證。
- 它不會繞過配對檢查。
- 它不會放寬遠端（非 localhost）裝置身分的要求。

建議優先使用 HTTPS (Tailscale Serve) 或在 `127.0.0.1` 上開啟 UI。

僅限緊急情況使用，`gateway.controlUi.dangerouslyDisableDeviceAuth`
會完全停用裝置身分檢查。這是嚴重的安全性降級；
請將其保持關閉，除非您正在主動除錯並且可以快速還原。

除了那些危險的標誌之外，成功的 `gateway.auth.mode: "trusted-proxy"`
可以在沒有裝置身分的情況下允許 **operator** 控制台會話。這是一種
有意的驗證模式行為，而不是 `allowInsecureAuth` 捷徑，並且它仍然
不擴展到節點角色控制台會話。

當啟用此設定時，`openclaw security audit` 會發出警告。

## 不安全或危險的標誌摘要

當啟用已知不安全/危險的除錯開關時，
`openclaw security audit` 會引發 `config.insecure_or_dangerous_flags`。請在生產環境中保持未設定這些值。
每個啟用的旗標都會作為單獨的發現項目進行回報。如果已設定審計抑制項目，
`security.audit.suppressions.active` 將保留在
作用中的審計輸出中，即使相符的發現項目已移至 `suppressedFindings`。

<AccordionGroup>
  <Accordion title="目前審計追蹤的旗標">
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
    Control UI and browser:

    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth`
    - `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

    Channel name-matching (bundled and plugin channels; also available per
    `accounts.<accountId>` where applicable):

    - `channels.discord.dangerouslyAllowNameMatching`
    - `channels.slack.dangerouslyAllowNameMatching`
    - `channels.googlechat.dangerouslyAllowNameMatching`
    - `channels.msteams.dangerouslyAllowNameMatching`
    - `channels.synology-chat.dangerouslyAllowNameMatching` (plugin channel)
    - `channels.synology-chat.dangerouslyAllowInheritedWebhookPath` (plugin channel)
    - `channels.zalouser.dangerouslyAllowNameMatching` (plugin channel)
    - `channels.irc.dangerouslyAllowNameMatching` (plugin channel)
    - `channels.mattermost.dangerouslyAllowNameMatching` (plugin channel)

    Network exposure:

    - `channels.telegram.network.dangerouslyAllowPrivateNetwork` (also per account)

    Sandbox Docker (defaults + per-agent):

    - `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
    - `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
    - `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

  </Accordion>
</AccordionGroup>

## 反向代理設定

If you run the Gateway behind a reverse proxy (nginx, Caddy, Traefik, etc.), configure
`gateway.trustedProxies` for proper forwarded-client IP handling.

When the Gateway detects proxy headers from an address that is **not** in `trustedProxies`, it will **not** treat connections as local clients. If gateway auth is disabled, those connections are rejected. This prevents authentication bypass where proxied connections would otherwise appear to come from localhost and receive automatic trust.

`gateway.trustedProxies` also feeds `gateway.auth.mode: "trusted-proxy"`, but that auth mode is stricter:

- trusted-proxy auth **預設會在來源為回環的代理上封閉失敗（fail closed）**
- same-host loopback reverse proxies can use `gateway.trustedProxies` for local-client detection and forwarded IP handling
- same-host loopback reverse proxies can satisfy `gateway.auth.mode: "trusted-proxy"` only when `gateway.auth.trustedProxy.allowLoopback = true`; otherwise use token/password auth

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

When `trustedProxies` is configured, the Gateway uses `X-Forwarded-For` to determine the client IP. `X-Real-IP` is ignored by default unless `gateway.allowRealIpFallback: true` is explicitly set.

受信任的 Proxy 標頭並不會讓節點裝置配對自動變成受信任。
`gateway.nodes.pairing.autoApproveCidrs` 是一個獨立的、預設停用的
操作員原則。即使啟用，來自回來源的 trusted-proxy 標頭路徑
也會從節點自動核准中排除，因為本機呼叫者可以偽造這些
標頭，包括在明確啟用回授 trusted-proxy 驗證時。

良好的反向代理行為（覆寫傳入的轉送標頭）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良的反向代理行為（附加/保留不信任的轉送標頭）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 與來源註記

- OpenClaw gateway 優先考慮本機/回環。如果您在反向代理終止 TLS，請在那裡對面向代理的 HTTPS 網域設定 HSTS。
- 如果閘道本身終止 HTTPS，您可以設定 `gateway.http.securityHeaders.strictTransportSecurity` 以從 OpenClaw 回應中發出 HSTS 標頭。
- 詳細的部署指引請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 對於非回授的 Control UI 部署，預設情況下需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是一個明確允許所有瀏覽器來源的原則，而非一個強化的預設值。請在嚴密控制的本地測試之外避免使用它。
- 即使在啟用一般回授豁免時，回授上的瀏覽器來源驗證失敗仍會受到速率限制，但鎖定金鑰的範圍是根據標準化的
  `Origin` 值，而不是一個共用的 localhost bucket。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源後援模式；請將其視為一個危險的操作員選取原則。
- 請將 DNS rebinding 和 proxy-host 標頭行為視為部署強化方面的考量；保持 `trustedProxies` 嚴謹，並避免將閘道直接暴露於公共網際網路。

## 本機工作階段記錄儲存於磁碟上

OpenClaw 會將會話逐字稿儲存在磁碟上的 `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下。
這是會話連續性和（可選的）會話記憶索引所必需的，但這也意味著
**任何具有檔案系統存取權的程式/使用者都可以讀取這些日誌**。請將磁碟存取視為信任
邊界，並鎖定 `~/.openclaw` 的權限（請參閱下方的稽核部分）。如果您需要在
代理程式之間進行更強大的隔離，請在獨立的 OS 使用者或獨立的主機下執行它們。

## 節點執行 (system.run)

如果配對了 macOS 節點，閘道可以在該節點上叫用 `system.run`。這是在 Mac 上的 **遠端程式碼執行**：

- 需要節點配對（核准 + 權杖）。
- 閘道節點配對不是每個指令的核准介面。它建立節點身分識別/信任和權杖發行。
- 閘道透過 `gateway.nodes.allowCommands` / `denyCommands` 套用粗略的全域節點指令原則。
- 在 Mac 上透過 **設定 → 執行核准** 進行控制（安全性 + 詢問 + 允許清單）。
- 每個節點 `system.run` 政策是節點自己的執行核准檔案 (`exec.approvals.node.*`)，它可以比閘道的全域指令 ID 政策更嚴格或更寬鬆。
- 以 `security="full"` 和 `ask="off"` 執行的節點遵循預設的可信操作者模型。除非您的部署明確需要更嚴格的核准或允許清單立場，否則請將其視為預期行為。
- 審核模式會綁定精確的請求上下文，並在可能的情况下綁定一個具體的本地腳本/文件操作數。如果 OpenClaw 無法為解釋器/運行時命令精確識別出一個直接的本地文件，則將拒絕受審核支持的執行，而不是承諾完整的語義覆蓋。
- 對於 `host=node`，基於核准的執行也會儲存一個規範的準備 `systemRunPlan`；稍後核准的轉發會重用該儲存的計畫，且閘道驗證會拒絕在建立核准請求後，呼叫者對 command/cwd/session 內容的編輯。
- 如果您不希望遠程執行，請將 security 設置為 **deny** 並移除該 Mac 的節點配對。

這種區別對於分診至關重要：

- 如果網關全局策略和節點的本地執行審核仍然強制執行實際的執行邊界，那麼重新連接的配對節點宣佈不同的命令列表本身並不是漏洞。
- 將節點配對元數據視為第二個隱藏的每命令審核層的報告，通常是策略/UX 混淆，而不是安全邊界繞過。

## 動態技能

OpenClaw 可以在會話中途刷新技能列表：

- **技能監視器 (Skills watcher)**：對 `SKILL.md` 的變更可以在下一次代理回合時更新技能快照。
- **遠程節點**：連接 macOS 節點可以使僅限 macOS 的技能變得可用（基於 bin 探測）。

將技能文件夾視為 **受信任的代碼** 並限制誰可以修改它們。

## 威脅模型

您的 AI 助手可以：

- 執行任意的 shell 命令
- 讀取/寫入文件
- 訪問網絡服務
- 向任何人發送消息（如果您授予其 WhatsApp 訪問權限）

給您發送消息的人可以：

- 試圖誘騙您的 AI 做壞事
- 通過社會工程學獲取對您數據的訪問權
- 探測基礎設施細節

## 核心概念：先訪問控制，後智能

這裡的大部分失敗並不是花哨的漏洞利用——它們只是「有人給機器人發了消息，機器人就照做了」。

OpenClaw 的立場：

- **身份優先**：決定誰可以與機器人交談（DM 配對 / 允許列表 / 顯式「開放」）。
- **範圍其次**：決定機器人被允許在哪裡採取行動（群組允許列表 + 提及閘門、工具、沙箱、設備權限）。
- **模型最後**：假設模型可以被操縱；在設計時應確保操縱的影響範圍有限。

## 指令授權模型

斜線指令和指令僅對 **已授權的發送者** 生效。授權源自頻道允許清單/配對加上 `commands.useAccessGroups` (請參閱 [組態](/zh-Hant/gateway/configuration) 和 [斜線指令](/zh-Hant/tools/slash-commands))。如果頻道允許清單為空或包含 `"*"`，則指令實際上對該頻道開放。

`/exec` 是供已授權操作者使用的僅限會話便利功能。它 **不** 會寫入組態或變更其他會話。

## 控制平面工具風險

有兩個內建工具可以進行永久性的控制平面變更：

- `gateway` 可以使用 `config.schema.lookup` / `config.get` 檢查組態，並可以使用 `config.apply`、`config.patch` 和 `update.run` 進行永久性變更。
- `cron` 可以建立排程工作，這些工作會在原始聊天/任務結束後繼續執行。

僅限擁有者的 `gateway` 執行階段工具仍然拒絕重寫
`tools.exec.ask` 或 `tools.exec.security`；舊版 `tools.bash.*` 別名會在
寫入前被正規化為相同的受保護執行路徑。
由 Agent 驅動的 `gateway config.apply` 和 `gateway config.patch` 編輯預設
為失效自動關閉：只有一小部分提示、模型和提及閘道路徑可由 Agent 調整。因此，新的敏感設定樹會受到保護，
除非它們被刻意加入到允許清單中。

對於任何處理不受信任內容的代理程式/介面，預設拒絕以下項目：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 僅阻擋重新啟動動作。它不會停用 `gateway` 設定/更新動作。

## 外掛程式

外掛程式與閘道**在程序內**（in-process）一起執行。請將它們視為受信任的程式碼：

- 僅安裝來自您信任來源的外掛程式。
- 偏好使用明確的 `plugins.allow` 允許清單。
- 在啟用前審查外掛程式組態。
- 在外掛程式變更後重新啟動閘道。
- 如果您安裝或更新外掛程式 (`openclaw plugins install <package>`, `openclaw plugins update <id>`)，請將其視為執行未受信任的程式碼：
  - 安裝路徑是作用中外掛程式安裝根目錄下的個別外掛程式目錄。
  - OpenClaw 會在安裝/更新之前執行內建的危險程式碼掃描。`critical` 發現項目預設會阻擋。
  - npm 和 git 外掛程式安裝僅在明確的安裝/更新流程期間執行套件管理員相依性收斂。本機路徑和封存會被視為獨立的外掛程式套件；OpenClaw 會複製/參照它們，而不執行 `npm install`。
  - 偏好使用鎖定的精確版本 (`@scope/pkg@1.2.3`)，並在啟用前檢查磁碟上解壓縮的程式碼。
  - `--dangerously-force-unsafe-install` 僅作為外掛程式安裝/更新流程中內建掃描誤報的緊急存取手段。它不會繞過外掛程式 `before_install` 掛鉤原則阻擋，也不會繞過掃描失敗。
  - 由 Gateway 支援的技能相依性安裝遵循相同的危險/可疑分類：內建 `critical` 發現項目會遭到阻擋，除非呼叫者明確設定 `dangerouslyForceUnsafeInstall`，而可疑的發現項目仍然僅會發出警告。`openclaw skills install` 仍然是獨立的 ClawHub 技能下載/安裝流程。

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## DM 存取模型：配對、允許清單、開放、已停用

所有目前支援 DM 的管道都支援 DM 策略（`dmPolicy` 或 `*.dm.policy`），該策略會在訊息處理**之前**阻擋傳入的 DM：

- `pairing`（預設）：未知傳送者會收到一個簡短的配對代碼，且機器人會忽略其訊息直到被核准。代碼會在 1 小時後過期；重複的 DM 在建立新請求之前不會重新傳送代碼。待處理請求預設上限為每個管道 **3 個**。
- `allowlist`：未知傳送者被封鎖（無配對握手）。
- `open`：允許任何人 DM（公開）。**要求**管道允許名單必須包含 `"*"`（明確選用）。
- `disabled`：完全忽略傳入的 DM。

透過 CLI 批准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

詳細資訊 + 磁碟上的檔案：[配對](/zh-Hant/channels/pairing)

## DM 會話隔離（多使用者模式）

預設情況下，OpenClaw 會將**所有 DM 路由到主會話**中，以便您的助理在裝置和頻道之間保持連續性。如果**多個人**可以 DM 機器人（開放 DM 或多人允許清單），請考慮隔離 DM 會話：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

這可以防止跨使用者上下文洩漏，同時保持群組聊天隔離。

這是一個訊息上下文邊界，而不是主機管理員邊界。如果使用者之間互為對抗並且共用同一個 Gateway 主機/配置，請改為針對每個信任邊界執行獨立的 Gateway。

### 安全 DM 模式（推薦）

將上述程式碼片段視為**安全 DM 模式**：

- 預設：`session.dmScope: "main"`（所有 DM 共用一個工作階段以保持連續性）。
- 本機 CLI 入門預設：若未設定則寫入 `session.dmScope: "per-channel-peer"`（保留現有的明確值）。
- 安全 DM 模式：`session.dmScope: "per-channel-peer"`（每個管道+傳送者配對都會獲得一個獨立的 DM 上下文）。
- 跨管道對等隔離：`session.dmScope: "per-peer"`（每個傳送者在所有相同類型的管道中獲得一個工作階段）。

如果您在同一個管道上執行多個帳戶，請改用 `per-account-channel-peer`。如果同一個人透過多個管道聯絡您，請使用 `session.identityLinks` 將這些 DM 工作階段合併為一個規範身分。請參閱[工作階段管理](/zh-Hant/concepts/session)和[設定](/zh-Hant/gateway/configuration)。

## DM 和群組的允許清單

OpenClaw 有兩個獨立的「誰可以觸發我？」層級：

- **DM 允許名單**（`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；舊版：`channels.discord.dm.allowFrom`，`channels.slack.dm.allowFrom`）：誰被允許在直接訊息中與機器人交談。
  - 當 `dmPolicy="pairing"` 時，核准項目會被寫入帳戶範圍的配對允許名單存放區中的 `~/.openclaw/credentials/`（預設帳戶為 `<channel>-allowFrom.json`，非預設帳戶為 `<channel>-<accountId>-allowFrom.json`），並與設定允許名單合併。
- **群組允許清單**（特定頻道）：機器人將從哪些群組/頻道/公會接受訊息。
  - 常見模式：
    - `channels.whatsapp.groups`, `channels.telegram.groups`, `channels.imessage.groups`：群組預設值，例如 `requireMention`；設定後，它也充當群組允許清單（包含 `"*"` 以保留允許所有行為）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制誰可以在群組會話（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）*內部*觸發機器人。
    - `channels.discord.guilds` / `channels.slack.channels`：針對表面的允許清單 + 提及預設值。
  - 群組檢查按此順序執行：`groupPolicy`/group 允許清單優先，提及/回覆啟動次之。
  - 回覆機器人訊息（隱含提及）**不會**繞過發送者允許清單，例如 `groupAllowFrom`。
  - **安全注意事項：**將 `dmPolicy="open"` 和 `groupPolicy="open"` 視為最後手段的設定。它們應該很少使用；除非您完全信任房間的每個成員，否則建議優先使用配對 + 允許清單。

詳情：[組態](/zh-Hant/gateway/configuration) 和 [群組](/zh-Hant/channels/groups)

## 提示注入（它是什麼，為什麼重要）

提示注入是指攻擊者製作一則訊息，操縱模型執行不安全的操作（「忽略您的指令」、「傾印您的檔案系統」、「連結到此網址並執行指令」等）。

即使有強大的系統提示，**提示注入仍未解決**。系統提示防護僅是軟性指引；強制執行來自工具原則、執行核准、沙盒化和通道允許清單（且操作員可依設計停用這些功能）。實務上有幫助的做法包括：

- 保持傳入的 DM 鎖定（配對/允許清單）。
- 在群組中優先使用提及閘門；避免在公開房間中使用「永遠開啟」的機器人。
- 預設將連結、附件和貼上的指令視為惡意。
- 在沙盒中執行敏感的工具執行；將機密資料保持在代理程式可存取的檔案系統之外。
- 注意：沙箱是選用的。如果關閉沙箱模式，隱含的 `host=auto` 會解析為 Gateway 主機。明確的 `host=sandbox` 仍會以封閉失敗（fail closed）處理，因為沒有可用的沙箱執行時。如果您希望該行為在組態中明確顯示，請設定 `host=gateway`。
- 將高風險工具（`exec`, `browser`, `web_fetch`, `web_search`）限制在信任的代理程式或明確的允許清單內。
- 如果您將解譯器加入允許清單（`python`, `node`, `ruby`, `perl`, `php`, `lua`, `osascript`），請啟用 `tools.exec.strictInlineEval`，這樣內聯評估表單仍需要明確批准。
- Shell 審批分析也會拒絕位於 **未加引號的 heredocs** 內的 POSIX 參數擴展形式（`$VAR`、`$?`、`$$`、`$1`、`$@`、`${…}`），因此列入白名單的 heredoc 內容無法以純文字形式在白名單審查中偷運 shell 擴展功能。請將 heredoc 終止符加上引號（例如 `<<'EOF'`）以選擇字面內含語義；原本會擴展變數的未加引號 heredocs 將被拒絕。
- **模型選擇很重要：** 舊型/較小/舊版模型對於提示注入和工具濫用的防禦能力明顯較弱。對於啟用工具的代理程式，請使用可用的最強最新一代、經指令強化的模型。

應視為不可信賴的危險訊號："

- 「閱讀此檔案/URL 並完全照著做。」
- 「忽略您的系統提示或安全規則。」
- 「揭露您的隱藏指令或工具輸出。」
- 「貼上 ~/.openclaw 或您日誌的完整內容。」

## 外部內容特殊符號清理

OpenClaw 會在封裝的外部內容和中繼資料送達模型之前，從中移除常見的自託管 LLM 聊天範本特殊符號字面值。涵蓋的標記系列包括 Qwen/ChatML、Llama、Gemma、Mistral、Phi 和 GPT-OSS 角色/回合符號。

原因：

- 位於自託管模型前端的 OpenAI 相容後端，有時會保留使用者文字中出現的特殊標記，而不是將其遮蔽。否則，能夠寫入傳入外部內容（擷取的頁面、電子郵件內文、檔案內容工具輸出）的攻擊者，可能會注入合成 `assistant` 或 `system` 角色邊界，並逃脫包裹內容的防護機制。
- 清理發生在外部內容包裹層，因此它統一套用於擷取/讀取工具和入站通道內容，而不是針對每個提供者。
- 傳出的模型回應已經有一個獨立的清除器，會在最終通道傳遞邊界處，從使用者可見的回覆中移除洩漏的 `<tool_call>`、`<function_calls>`、`<system-reminder>`、`<previous_response>` 和類似的內部執行時期基礎架構。外部內容清除器則是其傳入的對應部分。

這並不取代本頁的其他加固措施——`dmPolicy`、白名單、執行審批、沙箱和 `contextVisibility` 仍然執行主要工作。它封閉了一個特定的分詞器層級繞過漏洞，針對的是那些連同特殊標記一併轉發使用者文字的自託管堆疊。

## 不安全的外部內容繞過標誌

OpenClaw 包含明確的繞過標誌，用於停用外部內容安全包裹：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 載荷欄位 `allowUnsafeExternalContent`

指導原則：

- 在生產環境中保持這些設定未設定或為 false。
- 僅針對範圍嚴格限定的除錯暫時啟用。
- 如果啟用，請隔離該代理程式（沙箱 + 最小工具集 + 專用會話命名空間）。

Hook 風險說明：

- Hook 負載是不受信任的內容，即使傳遞來自您控制的系統（郵件/文件/網頁內容可能攜帶提示注入）。
- 較弱的模型階層會增加此風險。對於由掛鉤驅動的自動化，建議偏好使用強大的現代模型階層，並保持工具政策嚴格（`tools.profile: "messaging"` 或更嚴格），並在可能的情況下使用沙箱。

### 提示注入不需要公開的私人訊息

即使**只有您**可以傳送訊息給機器人，透過機器人讀取的任何**不受信任的內容**（網頁搜尋/擷取結果、瀏覽器頁面、電子郵件、文件、附件、貼上的日誌/程式碼），提示詞注入仍然可能發生。換句話說：發送者不是唯一的威脅面；**內容本身**可能帶有惡意指令。

當啟用工具時，典型的風險是外洩上下文或觸發工具呼叫。透過以下方式減少爆炸半徑：

- 使用唯讀或已停用工具的**閱讀代理程式**來摘要不受信任的內容，然後將摘要傳遞給您的主要代理程式。
- 除非有必要，否則請將啟用工具的代理的 `web_search` / `web_fetch` / `browser` 保持關閉。
- 對於 OpenResponses URL 輸入（`input_file` / `input_image`），請設定嚴格的
  `gateway.http.endpoints.responses.files.urlAllowlist` 和
  `gateway.http.endpoints.responses.images.urlAllowlist`，並將 `maxUrlParts` 保持在低值。
  空的允許清單會被視為未設定；如果您想完全停用 URL 獲取，請使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 對於 OpenResponses 檔案輸入，解碼後的 `input_file` 文字仍會被作為
  **不受信賴的外部內容** 注入。不要僅因為 Gateway 在本機進行了解碼，就依賴檔案文字是受信賴的。即使此路徑省略了較長的 `SECURITY NOTICE:` 橫幅，注入的區塊仍會帶有明確的
  `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 邊界標記以及 `Source: External`
  元數據。
- 當媒體理解在將文字附加至媒體提示詞之前，從附加的文件中擷取文字時，也會套用相同的基於標記的包裝方式。
- 為任何接觸不受信任輸入的代理程式啟用沙箱和嚴格的工具允許清單。
- 不要將機密放在提示詞中；改為透過 gateway 主機上的 env/config 傳遞它們。

### 自託管的 LLM 後端

vLLM、SGLang、TGI、LM Studio 等相容 OpenAI 的自託管後端，或是自訂 Hugging Face tokenizer 堆疊，在處理
chat-template 特殊 Token 的方式上可能與託管供應商不同。如果後端將 `<|im_start|>`、`<|start_header_id|>` 或 `<start_of_turn>` 等字串字面值作為
使用者內容內部的結構性 chat-template Token 進行分詞，不受信賴的文字可能會嘗試在分詞器層級偽造角色邊界。

OpenClaw 會在將外部內容發送給模型之前，從被封裝的外部內容中移除常見的模型系列特殊 token 字面值。請保持啟用外部內容封裝，並且在可用的情況下，優先選擇能夠分割或跳脫使用者提供內容中特殊 token 的後端設定。諸如 OpenAI 和 Anthropic 等託管供應商已經自行套用了請求端的清理程序。

### 模型強度（安全備註）

對於提示詞注入的防禦能力在不同的模型階層中並**不**統一。較小/較便宜的模型通常更容易受到工具誤用和指令劫持的影響，特別是在面對對抗性提示詞時。

<Warning>對於啟用工具的代理程式或讀取不信任內容的代理程式，舊款/較小模型的提示詞注入風險通常過高。請不要在弱勢模型階層上執行這些工作負載。</Warning>

建議：

- **對於任何可以執行工具或存取檔案/網路的機器人，請使用最新世代、最高階層的模型**。
- **不要對啟用工具的代理程式或不受信任的收件匣使用舊款/較弱/較小的階層**；提示詞注入風險過高。
- 如果您必須使用較小的模型，請**減少爆炸半徑**（唯讀工具、強大的沙盒、最小的檔案系統存取權、嚴格的白名單）。
- 執行小型模型時，請**為所有工作階段啟用沙盒**，並**停用 web_search/web_fetch/browser**，除非輸入受到嚴格控制。
- 對於僅用於聊天、輸入受信任且沒有工具的個人助理，較小的模型通常是可以的。

## 群組中的推理和詳細輸出

`/reasoning`、`/verbose` 和 `/trace` 可能會暴露內部推理、工具
輸出或外掛程式診斷資訊，而這些內容並非
預計在公開頻道發布。在群組環境中，請將其視為 **僅限除錯**
用途，除非您明確需要，否則請保持關閉。

指引：

- 在公開房間中，請保持 `/reasoning`、`/verbose` 和 `/trace` 為停用狀態。
- 如果您啟用它們，請僅在受信任的私人訊息或嚴格控制的房間中進行。
- 請記住：詳細輸出和追蹤輸出可能包含工具參數、URL、外掛程式診斷資訊以及模型看到的資料。

## 配置加固範例

### 檔案權限

在 Gateway 主機上保持配置和狀態為私密：

- `~/.openclaw/openclaw.json`: `600` (僅使用者讀寫)
- `~/.openclaw`: `700` (僅使用者)

`openclaw doctor` 可以發出警告並提供加強這些權限的選項。

### 網路暴露（綁定、連接埠、防火牆）

Gateway 在單一連接埠上多工傳輸 **WebSocket + HTTP**：

- 預設值： `18789`
- 設定/旗標/環境變數： `gateway.port`, `--port`, `OPENCLAW_GATEWAY_PORT`

此 HTTP 介面包含控制 UI 和 canvas 主機：

- 控制 UI (SPA 資源) (預設基底路徑 `/`)
- Canvas 主機：`/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`（任意 HTML/JS；視為不受信任的內容）

如果您在一般瀏覽器中載入 canvas 內容，請將其視為任何其他不受信任的網頁：

- 不要將 canvas 主機暴露給不受信任的網路或使用者。
- 除非您完全理解其影響，否則不要讓 canvas 內容與具有特權的網頁介面共享相同的來源。

綁定模式控制 Gateway 的監聽位置：

- `gateway.bind: "loopback"`（預設值）：僅限本機用戶端連線。
- 非回環位址綁定（`"lan"`、`"tailnet"`、`"custom"`）會擴大攻擊面。僅在啟用 Gateway 驗證（共享 token/密碼或正確設定的信任 Proxy）並搭配實體防火牆的情況下使用。

經驗法則：

- 優先使用 Tailscale Serve 而非 LAN 綁定（Serve 將 Gateway 保持在回環位址上，並由 Tailscale 處理存取）。
- 如果您必須綁定到 LAN，請使用防火牆將連接埠限制為嚴格的來源 IP 白名單；不要廣泛地進行連接埠轉發。
- 切勿在 `0.0.0.0` 上未經驗證地公開 Gateway。

### 使用 UFW 的 Docker 連接埠發布

如果您在 VPS 上使用 Docker 執行 OpenClaw，請記住已發布的容器埠
（`-p HOST:CONTAINER` 或 Compose `ports:`）是透過 Docker 的轉發
鏈路由，而不僅是主機 `INPUT` 規則。

若要使 Docker 流量符合您的防火牆策略，請在
`DOCKER-USER` 中強制執行規則（此鏈會在 Docker 自己的接受規則之前評估）。
在許多現代發行版中，`iptables`/`ip6tables` 使用 `iptables-nft` 前端介面
，並且仍然將這些規則套用至 nftables 後端。

最小允許清單示例 (IPv4)：

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
啟用了 Docker IPv6，請在 `/etc/ufw/after6.rules` 中新增相符的策略。

避免在文件片段中硬編碼介面名稱，例如 `eth0`。介面名稱
會因 VPS 映像檔而異（`ens3`、`enp*` 等），不匹配可能會導致
意外略過您的拒絕規則。

重新載入後的快速驗證：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

預期的外部連接埠應僅限於您有意暴露的連接埠 (對於大多數
設定：SSH + 您的反向代理連接埠)。

### mDNS/Bonjour 探索

當啟用內建的 `bonjour` 外掛程式時，Gateway 會透過 mDNS（埠 5353 上的 `_openclaw-gw._tcp`）廣播其存在，以供本機裝置探索。在完整模式下，這包括可能暴露運作細節的 TXT 記錄：

- `cliPath`：CLI 二進位檔案的完整檔案系統路徑（會揭露使用者名稱和安裝位置）
- `sshPort`：宣佈主機上的 SSH 可用性
- `displayName`、`lanHost`：主機名稱資訊

**操作安全考量：** 廣播基礎設施細節會讓本機網路上的任何人更容易進行偵察。即使是像檔案系統路徑和 SSH 可用性這樣「無害」的資訊，也有助於攻擊者繪製您的環境圖。

**建議：**

1. **除非需要 LAN 探索，否則請保持 Bonjour 停用。** Bonjour 在 macOS 主機上會自動啟動，而在其他地方則是選擇加入的；直接的 Gateway URL、Tailnet、SSH 或廣域 DNS-SD 可避免本機多播。

2. **最小模式**（啟用 Bonjour 時的預設值，推薦用於暴露的閘道）：從 mDNS 廣播中省略敏感欄位：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

3. **停用 mDNS 模式**，如果您想保持外掛程式啟用但抑制本地裝置探索：

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

5. **環境變數**（替代方案）：設定 `OPENCLAW_DISABLE_BONJOUR=1` 以在不變更設定的情況下停用 mDNS。

當 Bonjour 在最小模式下啟用時，Gateway 會廣播足夠用於裝置探索的資訊（`role`、`gatewayPort`、`transport`），但會省略 `cliPath` 和 `sshPort`。需要 CLI 路徑資訊的應用程式可以透過已驗證的 WebSocket 連線來擷取它。

### 鎖定閘道 WebSocket（本地驗證）

閘道驗證**預設為必須**。如果未設定有效的閘道驗證路徑，閘道將拒絕 WebSocket 連線（故障關閉）。

入門（Onboarding）預設會產生一個權杖（即使是對於回送），因此本地客戶端必須通過驗證。

設定一個權杖，以便**所有** WS 客戶端都必須通過驗證：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以為您產生一個：`openclaw doctor --generate-gateway-token`。

<Note>`gateway.remote.token` 和 `gateway.remote.password` 是客戶端憑證來源。它們本身**不**保護本機 WS 存取。本機呼叫路徑僅當 `gateway.auth.*` 未設定時，才能使用 `gateway.remote.*` 作為後備。如果 `gateway.auth.token` 或 `gateway.auth.password` 透過 SecretRef 明確設定但無法解析，解析會失敗關閉（無遠端後備遮罩）。</Note>
選用：使用 `wss://` 時，使用 `gateway.remote.tlsFingerprint` 固定遠端 TLS。 純文字 `ws://` 被接受用於回送、私有 IP 字面值、`.local` 和 Tailnet `*.ts.net` gateway URL。對於其他受信任的私有 DNS 名稱，請在客戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為緊急措施。 這僅限於程序環境，而非 `openclaw.json` 設定 鍵。 行動裝置配對和 Android 手動或掃描的 gateway 路由更嚴格： 回送接受明文，但私有
LAN、鏈路本機、`.local` 和 無點主機名稱必須使用 TLS，除非您明確選擇加入受信任的 私有網路明文路徑。

本地裝置配對：

- 直接本地回送連線的裝置配對會自動核准，以保持
  同主機用戶端的順暢。
- OpenClaw 也有一個狹窄的後端/容器本地自我連接路徑，用於
  受信任的共用密鑰輔助流程。
- Tailnet 和 LAN 連線（包括同主機 tailnet 繫結）在配對時被視為
  遠端，仍然需要核准。
- 回送請求上的轉送標頭證據會取消回送
  地區的資格。中繼資料升級自動批准的範圍很窄。請參閱
  [Gateway 配對](/zh-Hant/gateway/pairing)以了解這兩項規則。

驗證模式：

- `gateway.auth.mode: "token"`：共享 bearer token（建議用於大多數設定）。
- `gateway.auth.mode: "password"`：密碼驗證（建議透過 env 設定：`OPENCLAW_GATEWAY_PASSWORD`）。
- `gateway.auth.mode: "trusted-proxy"`：信任具備身分感知的反向代理伺服器以驗證使用者，並透過標頭傳遞身分（請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)）。

輪替檢查清單（token/密碼）：

1. 產生/設定新的金鑰（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重新啟動 Gateway（如果 macOS App 監督 Gateway，則重新啟動該 App）。
3. 更新任何遠端用戶端（呼叫 Gateway 的機器上的 `gateway.remote.token` / `.password`）。
4. 驗證您無法再使用舊憑證連線。

### Tailscale Serve 身分標頭

當 `gateway.auth.allowTailscale` 為 `true`（Serve 的預設值）時，OpenClaw 會接受 Tailscale Serve 身分標頭（`tailscale-user-login`）以進行控制 UI/WebSocket 驗證。OpenClaw 會透過本機 Tailscale 守護程序（`tailscale whois`）解析 `x-forwarded-for` 位址並將其與標頭比對，以此驗證身分。這僅會對命中 loopback 並包含由 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 的請求觸發。
對於此非同步身分檢查路徑，相同 `{scope, ip}` 的失敗嘗試會在限制器記錄失敗前被序列化。因此，來自單一 Serve 用戶端的並發錯誤重試可以立即鎖定第二次嘗試，而不是像兩個單純的不匹配那樣競爭。
HTTP API 端點（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）**不**使用 Tailscale 身分標頭驗證。它們仍遵循 Gateway 設定的 HTTP 驗證模式。

重要的邊界說明：

- 閘道 HTTP bearer 驗證實際上即是全有或全無的操作員存取權。
- 將能夠呼叫 `/v1/chat/completions`、`/v1/responses`、外掛路由如 `/api/v1/admin/rpc` 或 `/api/channels/*` 的憑證視為該 Gateway 的完整存取操作員機密。
- 在 OpenAI 相容的 HTTP 介面上，共享密碼 bearer auth 會恢復完整的預設 operator scopes (`operator.admin`, `operator.approvals`, `operator.pairing`, `operator.read`, `operator.talk.secrets`, `operator.write`) 以及 agent 輪次的 owner 語意；較狹隘的 `x-openclaw-scopes` 值並不會縮減該共享密碼路徑。
- HTTP 上的每個請求 scope 語意僅在請求來自身分驗證模式（例如受信任的 proxy auth）或明確為無認證的私人入口時才會套用。
- 在這些身分驗證模式中，若省略 `x-openclaw-scopes` 則會還原為正常的 operator 預設 scope 集合；若您需要較狹隘的 scope 集合，請明確發送該標頭。
- `/tools/invoke` 遵循相同的共享密碼規則：token/password bearer auth 也被視為完整的 operator 存取權，而身分驗證模式則仍會遵循宣告的 scopes。
- 請勿與不受信任的呼叫者共用這些憑證；建議為每個信任邊界使用獨立的閘道。

**信任假設：** 無 token Serve auth 假設 gateway 主機是受信任的。
請勿將此視為防禦同主機惡意程序的保護機制。如果在 gateway 主機上可能執行未受信任的本機程式碼，請停用 `gateway.auth.allowTailscale`
並要求使用 `gateway.auth.mode: "token"` 或
`"password"` 進行明確的共享密碼驗證。

**安全規則：** 請勿從您自己的 reverse proxy 轉送這些標頭。如果您在 gateway 前終止 TLS 或進行代理，請停用
`gateway.auth.allowTailscale` 並改用共享密碼驗證 (`gateway.auth.mode:
"token"` or `"password"`) 或 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)。

受信任的代理伺服器：

- 如果您在 Gateway 前終止 TLS，請將 `gateway.trustedProxies` 設定為您的 proxy IP。
- OpenClaw 將信任來自這些 IP 的 `x-forwarded-for` (或 `x-real-ip`) 以判定用於本機配對檢查與 HTTP auth/local 檢查的用戶端 IP。
- 請確保您的 proxy **覆寫** `x-forwarded-for` 並封鎖對 Gateway 連接埠的直接存取。

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 與 [Web 概覽](/zh-Hant/web)。

### 透過節點主機進行瀏覽器控制 (推薦)

如果您的 Gateway 位於遠端，但瀏覽器運行在另一台機器上，請在瀏覽器機器上運行一個 **node host**，並讓 Gateway 代理瀏覽器操作（請參閱 [Browser tool](/zh-Hant/tools/browser)）。將 node 配對視為管理員存取權限。

推薦模式：

- 將閘道和節點主機保持在同一個 tailnet (Tailscale) 中。
- 有意地配對節點；如果您不需要，請停用瀏覽器代理路由。

避免：

- 透過區域網路或公開網際網路公開中繼/控制連接埠。
- 針對瀏覽器控制端點使用 Tailscale Funnel (公開暴露)。

### 磁碟上的機密

假設 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何內容都可能包含機密或私人資料：

- `openclaw.json`：配置可能包含權杖（gateway、remote gateway）、提供者設定以及允許清單。
- `credentials/**`：通道憑證（例如：WhatsApp 憑證）、配對允許清單、舊版 OAuth 匯入。
- `agents/<agentId>/agent/auth-profiles.json`：API 金鑰、token 設定檔、OAuth 權杖，以及選用的 `keyRef`/`tokenRef`。
- `agents/<agentId>/agent/codex-home/**`：每個 agent 的 Codex app-server 帳戶、配置、技能、外掛、原生執行緒狀態和診斷資料。
- `secrets.json`（選用）：檔案支援的機密載荷，由 `file` SecretRef 提供者使用（`secrets.providers`）。
- `agents/<agentId>/agent/auth.json`：舊版相容性檔案。偵測到靜態 `api_key` 項目時會將其清除。
- `agents/<agentId>/sessions/**`：會話逐字稿（`*.jsonl`）+ 路由中繼資料（`sessions.json`），可能包含私人訊息和工具輸出。
- 捆綁的外掛套件：已安裝的外掛（及其 `node_modules/`）。
- `sandboxes/**`：工具沙箱工作區；可能會累積您在沙箱內讀寫的檔案副本。

加固建議：

- 保持嚴格的權限（目錄設為 `700`，檔案設為 `600`）。
- 在閘道主機上使用全碟加密。
- 如果主機是共用的，建議為閘道使用專用的 OS 使用者帳戶。

### 工作區 `.env` 檔案

OpenClaw 會為代理程式和工具載入工作區本地的 `.env` 檔案，但絕不允許這些檔案在無提示的情況下覆蓋 Gateway 執行時控制項。

- 任何以 `OPENCLAW_*` 開頭的鍵都會被不受信任的工作區 `.env` 檔案封鎖。
- 針對 Matrix、Mattermost、IRC 和 Synology Chat 的通道端點設定也無法透過工作區 `.env` 覆寫變更，因此複製的工作區無法透過本機端點設定重新導向內建的連接器流量。端點環境變數金鑰（例如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`）必須來自於閘道程序環境或 `env.shellEnv`，而非來自於工作區載入的 `.env`。
- 此封鎖為失效安全：未來版本新增的新執行時期控制變數無法繼承自已提交或攻擊者提供的 `.env`；該金鑰會被忽略，而閘道將維持其自身的值。
- 受信任的程序/作業系統環境變數（閘道自身的 shell、launchd/systemd 單元、應用程式套件組合）仍然適用 —— 這僅限制 `.env` 檔案的載入。

原因：工作區 `.env` 檔案經常存放於代理程式碼旁邊、會意外被提交，或被工具寫入。封鎖整個 `OPENCLAW_*` 前綴意味著之後新增新的 `OPENCLAW_*` 旗標時，絕不會退化成從工作區狀態無聲繼承。

### 日誌和逐字稿（編修與保留）

即使存取控制設定正確，日誌和逐字稿仍可能洩露敏感資訊：

- 閘道日誌可能包含工具摘要、錯誤和 URL。
- 工作階段逐字稿可能包含貼上的機密、檔案內容、指令輸出和連結。

建議：

- 保持日誌和對話紀錄的編校開啟（`logging.redactSensitive: "tools"`；預設值）。
- 透過 `logging.redactPatterns` 為您的環境新增自訂模式（權杖、主機名稱、內部 URL）。
- 分享診斷資訊時，偏好使用 `openclaw status --all`（可貼上、已編校機密）而非原始日誌。
- 如果您不需要長期保留，請修剪舊的工作階段逐字稿和日誌檔案。

詳情：[日誌記錄](/zh-Hant/gateway/logging)

### DM：預設使用配對

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 群組：到處都需提及

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

### 分離號碼（WhatsApp、Signal、Telegram）

對於基於電話號碼的頻道，請考慮將您的 AI 運行在與您的個人號碼不同的電話號碼上：

- 個人號碼：您的對話保持私密
- 機器人號碼：AI 處理這些訊息，並設有適當的邊界

### 唯讀模式 (透過沙盒和工具)

您可以透過結合以下方式建立唯讀設定檔：

- `agents.defaults.sandbox.workspaceAccess: "ro"`（或使用 `"none"` 以拒絕工作區存取）
- 封鎖 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允許/拒絕清單。

額外的加固選項：

- `tools.exec.applyPatch.workspaceOnly: true` (預設值)：確保 `apply_patch` 即使在沙箱關閉時也無法在工作區目錄之外寫入/刪除。僅在您有意讓 `apply_patch` 存取工作區外的檔案時，才設定為 `false`。
- `tools.fs.workspaceOnly: true` (可選)：將 `read`/`write`/`edit`/`apply_patch` 路徑和原生提示圖片自動載入路徑限制在工作區目錄內（如果您目前允許絕對路徑並希望設置單一防線，這會很有用）。
- 保持檔案系統根目錄狹窄：避免為代理工作區/沙箱工作區設定過於寬廣的根目錄（例如您的主目錄）。寬廣的根目錄可能會將敏感的本機檔案（例如 `~/.openclaw` 下的狀態/配置）暴露給檔案系統工具。

### 安全基線 (複製/貼上)

一個「安全的預設」配置，可保持 Gateway 的私密性、要求 DM 配對，並避免始終開啟的群組機器人：

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

如果您也希望工具執行「預設更安全」，請為任何非擁有者的代理程式新增沙盒 + 拒絕危險工具 (範例請見下方的「各代理程式存取設定檔」)。

聊天驅動代理輪次的內建基準：非擁有者發送者無法使用 `cron` 或 `gateway` 工具。

## 沙盒機制 (推薦)

專屬文件：[Sandboxing](/zh-Hant/gateway/sandboxing)

兩種互補的方法：

- **在 Docker 中執行完整的 Gateway**（容器邊界）：[Docker](/zh-Hant/install/docker)
- **工具沙箱**（`agents.defaults.sandbox`，主機 Gateway + 沙箱隔離工具；Docker 是預設後端）：[Sandboxing](/zh-Hant/gateway/sandboxing)

<Note>為了防止跨代理存取，請將 `agents.defaults.sandbox.scope` 保持為 `"agent"` (預設值) 或 `"session"` 以實施更嚴格的每個會話隔離。`scope: "shared"` 使用單一容器或工作區。</Note>

同時請考慮沙箱內的代理程式工作區存取權：

- `agents.defaults.sandbox.workspaceAccess: "none"` (預設值) 將代理工作區設為禁止存取；工具針對 `~/.openclaw/sandboxes` 下的沙箱工作區執行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 將代理工作區以唯讀方式掛載於 `/agent` (停用 `write`/`edit`/`apply_patch`)
- `agents.defaults.sandbox.workspaceAccess: "rw"` 將代理工作區以讀寫方式掛載於 `/workspace`
- 額外的 `sandbox.docker.binds` 會針對標準化和正規化的來源路徑進行驗證。如果父目錄符號連結技巧和正規主目錄別名解析到被封鎖的根目錄（例如 `/etc`、`/var/run` 或 OS 主目錄下的憑證目錄），它們仍然會因失敗而被封閉。

<Warning>`tools.elevated` 是在沙箱外執行 exec 的全域基線緊急出口。預設的有效主機是 `gateway`，當 exec 目標配置為 `node` 時則為 `node`。請嚴格控制 `tools.elevated.allowFrom`，不要對陌生人啟用它。您可以透過 `agents.list[].tools.elevated` 進一步限制每個代理程式的提升權限。請參閱[提升模式](/zh-Hant/tools/elevated)。</Warning>

### 子代理程式委派防護機制

如果您允許工作階段工具，請將委派的子代理程式執行視為另一個邊界決策：

- 拒絕 `sessions_spawn`，除非代理程式確實需要委派。
- 將 `agents.defaults.subagents.allowAgents` 和任何針對每個代理程式的 `agents.list[].subagents.allowAgents` 覆寫限制為已知安全的目標代理程式。
- 對於任何必須保持沙箱化的工作流程，請使用 `sandbox: "require"` 呼叫 `sessions_spawn`（預設為 `inherit`）。
- 當目標子執行時間未處於沙箱中時，`sandbox: "require"` 會快速失敗。

## 瀏覽器控制風險

啟用瀏覽器控制會賦予模型驅動真實瀏覽器的能力。
如果該瀏覽器設定檔已包含登入工作階段，模型即可
存取這些帳號和資料。請將瀏覽器設定檔視為**敏感狀態**：

- 建議為代理程式使用專用設定檔（預設的 `openclaw` 設定檔）。
- 避免將代理程式指向您的個人日常使用設定檔。
- 除非您信任沙箱代理程式，否則請針對它們停用主機瀏覽器控制。
- 獨立迴路瀏覽器控制 API 僅接受共享金鑰驗證
  （Gateway token bearer auth 或 gateway password）。它不使用
  trusted-proxy 或 Tailscale Serve 身份標頭。
- 將瀏覽器下載內容視為不受信任的輸入；優先使用隔離的下載目錄。
- 如果可能的話，請在代理程式設定檔中停用瀏覽器同步/密碼管理器（可降低爆風半徑）。
- 對於遠端 Gateway，請假設「瀏覽器控制」等同於對該設定檔所能存取之任何內容的「操作員存取權」。
- 請將 Gateway 和節點主機保持在僅限 tailnet 存取；避免將瀏覽器控制埠暴露至區域網路或公網。
- 當您不需要時，請停用瀏覽器代理程式路由（`gateway.nodes.browser.mode="off"`）。
- Chrome MCP 現有工作階段模式並**不**「更安全」；它可以在該主機 Chrome 設定檔所能到達的任何地方以您的身份行事。

### 瀏覽器 SSRF 政策（預設為嚴格模式）

OpenClaw 的瀏覽器導航政策預設為嚴格模式：私有/內部目的地會持續被封鎖，除非您明確選擇加入。

- 預設值：未設定 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`，因此瀏覽器導航會封鎖私有/內部/特殊用途的目的地。
- 舊版別名：`browser.ssrfPolicy.allowPrivateNetwork` 為了相容性仍被接受。
- 選用模式：設定 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允許私有/內部/特殊用途的目的地。
- 在嚴格模式下，使用 `hostnameAllowlist`（模式如 `*.example.com`）和 `allowedHostnames`（精確主機例外，包括被封鎖的名稱如 `localhost`）作為明確的例外。
- 導航會在請求前進行檢查，並在導航後對最終的 `http(s)` URL 進行盡力重新檢查，以減少基於重定向的轉向攻擊。

嚴格策略範例：

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

## 每個代理的存取設定檔（多代理）

使用多代理路由時，每個代理都可以有自己的沙箱 + 工具策略：
使用此策略為每個代理提供 **完全存取**、**唯讀** 或 **無存取權**。
請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解完整細節
和優先順序規則。

常見使用案例：

- 個人代理：完整存取，無沙箱
- 家庭/工作代理：沙箱 + 唯讀工具
- 公開代理：沙箱 + 無檔案系統/Shell 工具

### 範例：完整存取（無沙箱）

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

### 範例：無檔案系統/Shell 存取（允許提供者傳訊）

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

如果您的 AI 做了壞事：

### 遏制

1. **停止運作：** 停止 macOS 應用程式（如果它監控 Gateway）或終止您的 `openclaw gateway` 程序。
2. **關閉暴露：** 設定 `gateway.bind: "loopback"`（或停用 Tailscale Funnel/Serve），直到您了解發生了什麼事情。
3. **凍結存取：** 將有風險的 DM/群組切換到 `dmPolicy: "disabled"` / 要求提及，並移除 `"*"` 允許所有的條目（如果您設有的話）。

### 輪換（如果秘密洩漏則假設已遭入侵）

1. 輪換 Gateway 驗證 (`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`) 並重新啟動。
2. 輪換任何可呼叫 Gateway 的機器上的遠端用戶端密鑰 (`gateway.remote.token` / `.password`)。
3. 輪換提供者/API 憑證（WhatsApp 憑證、Slack/Discord Token、`auth-profiles.json` 中的模型/API 金鑰，以及使用時的加密秘密 payload 值）。

### 稽核

1. 檢查 Gateway 日誌：`/tmp/openclaw/openclaw-YYYY-MM-DD.log` (或 `logging.file`)。
2. 檢視相關的逐字稿：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 檢視最近的設定變更（任何可能擴大存取權的項目：`gateway.bind`、`gateway.auth`、DM/群組策略、`tools.elevated`、外掛程式變更）。
4. 重新執行 `openclaw security audit --deep` 並確認關鍵發現已解決。

### 蒐集以供報告

- 時間戳記、Gateway 主機作業系統 + OpenClaw 版本
- 對話記錄 + 簡短的日誌尾部（在塗黑敏感資訊後）
- 攻擊者傳送的內容 + Agent 執行的動作
- Gateway 是否暴露於回環 位址之外（區域網路/LAN/Tailscale Funnel/Serve）

## 機密掃描

CI 會對存放庫執行 pre-commit `detect-private-key` hook。如果失敗，
請移除或輪換已提交的金鑰材料，然後在本機重現：

```bash
pre-commit run --all-files detect-private-key
```

## 回報安全性問題

在 OpenClaw 中發現了漏洞？請負責任地進行回報：

1. Email：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修復前不要公開張貼
3. 我們會註明您的貢獻（除非您希望匿名）
