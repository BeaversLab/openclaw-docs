---
summary: "Security considerations and threat model for running an AI gateway with shell access"
read_when:
  - Adding features that widen access or automation
title: "Security"
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

另請參閱：[正式驗證（安全模型）](/zh-Hant/security/formal-verification)

定期執行此操作（尤其是在更改配置或暴露網絡表面之後）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 保持刻意狹窄：它將常見的開放群組策略反轉為允許清單，還原 `logging.redactSensitive: "tools"`，收緊
狀態/配置/包含檔案的權限，並在 Windows 上運行時使用 Windows ACL 重置而不是
POSIX `chmod`。

它會標記常見的陷阱（Gateway 授權暴露、瀏覽器控制暴露、提升的允許清單、檔案系統權限、寬鬆的執行批准以及開放通道工具暴露）。

OpenClaw 既是一個產品也是一項實驗：您正將前沿模型的行為連接到真實的傳訊介面和真實的工具上。**不存在「完美安全」的設置。** 目標是刻意做到：

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

### 共享 Slack 工作區：真正的風險

如果「Slack 中的每個人都可以傳訊息給機器人」，核心風險在於委派的工具權限：

- 任何允許的發送者都可以在 agent 的原則內引發工具呼叫（`exec`、瀏覽器、網路/檔案工具）；
- 來自一個發送者的提示/內容注入可能會導致影響共享狀態、裝置或輸出的操作；
- 如果一個共享 agent 擁有敏感的憑證/檔案，任何允許的發送者都可能會透過工具使用來推動資料外洩。

對於團隊工作流程，請使用具有最少工具的獨立 agents/gateways；將個人資料 agents 保持私密。

### 公司共享 agent：可接受的模式

當使用該 agent 的每個人都在同一個信任邊界內（例如一個公司團隊）並且該 agent 嚴格限於業務範圍時，這是可以接受的。

- 在專用的機器/VM/容器上運行它；
- 為該運行時環境使用專用的作業系統使用者 + 專用瀏覽器/設定檔/帳戶；
- 請勿登入個人 Apple/Google 帳戶或個人密碼管理員/瀏覽器設定檔至該運行時環境中。

如果您在同一個運行時環境中混合使用個人和公司的身分，您將破壞分隔性並增加個人資料暴露的風險。

## Gateway 和節點信任概念

將 Gateway 和節點視為一個具有不同角色的操作員信任網域：

- **Gateway** 是控制平面和策略表面 (`gateway.auth`、工具策略、路由)。
- **節點 (Node)** 是與該 Gateway 配對的遠端執行表面 (指令、裝置操作、主機本地功能)。
- 經過 Gateway 驗證的呼叫者在 Gateway 範圍內受信任。配對後，節點操作即為該節點上受信任的操作員操作。
- 使用共享 gateway token/password 驗證的直接回環後端客戶端，可以在不呈現使用者裝置身分的情況下發出內部控制平面 RPC。這並非遠端或瀏覽器配對的繞過：網路客戶端、節點客戶端、裝置 token 客戶端和明確的裝置身分仍需經過配對和範圍升級強制執行。
- `sessionKey` 是路由/內容選擇，而非每個使用者的驗證。
- 執行核准 (允許清單 + 詢問) 是針對操作員意圖的防護措施，而非對抗惡意多租戶的隔離。
- OpenClaw 針對受信任的單操作員設定的產品預設值是，允許在 `gateway`/`node` 上進行主機執行而無需核准提示 (`security="full"`、`ask="off"`，除非您收緊設定)。該預設值是有意的 UX 設計，而非本身的漏洞。
- 執行核准綁定了確切的請求上下文和盡力而為的直接本地檔案操作數；它們並未在語意上模擬每個執行時/直譯器載入路徑。請使用沙箱和主機隔離來建立強大的邊界。

如果您需要對抗惡意使用者的隔離，請按作業系統使用者/主機分割信任邊界並執行獨立的 gateways。

## 信任邊界矩陣

在進行風險分類時，請將此作為快速模型：

| 邊界或控制                                                | 其含義                         | 常見誤讀                                       |
| --------------------------------------------------------- | ------------------------------ | ---------------------------------------------- |
| `gateway.auth` (token/password/trusted-proxy/device auth) | 向 Gateway API 驗證呼叫者      | 「需要在每個幀上都有每個訊息的簽章才能安全」   |
| `sessionKey`                                              | 用於背景/會話選擇的路由金鑰    | "會話金鑰是使用者驗證邊界"                     |
| 提示/內容防護措施                                         | 降低模型濫用風險               | "單獨的提示注入即可證明驗證繞過"               |
| `canvas.eval` / 瀏覽器評估                                | 啟用時有意為的運算者功能       | "在此信任模型中，任何 JS 評估原語自動為漏洞"   |
| 本機 TUI `!` shell                                        | 明確的運算者觸發本機執行       | "本機 shell 便利指令是遠端注入"                |
| 節點配對和節點指令                                        | 配對裝置上的運算者層級遠端執行 | "遠端裝置控制預設應被視為不受信任的使用者存取" |
| `gateway.nodes.pairing.autoApproveCidrs`                  | 選用信任網路節點註冊政策       | "預設停用的允許清單是自動配對漏洞"             |

## 依設計而非漏洞

<Accordion title="超出範圍的常見發現">

以下模式經常被回報，除非證明存在真正的邊界繞過，否則通常會被標記為不採取行動關閉：

- 僅包含提示詞注入但未繞過策略、身份驗證或沙箱的鏈條。
- 假設在單一共用主機或配置上進行惡意多租戶運作的主張。
- 在共用網關設置中，將正常的操作員讀取路徑存取（例如 `sessions.list` / `sessions.preview` / `chat.history`）歸類為 IDOR 的主張。
- 僅限本機部署的發現（例如僅限迴路的網關上的 HSTS）。
- 針對此儲存庫中不存在的入站路徑的 Discord 入站 Webhook 簽章發現。
- 當真正的執行邊界仍然是網關的全域節點指令策略加上節點自己的執行核准時，將節點配對元數據視為 `system.run` 的隱藏第二層每指令核准層的報告。
- 將配置的 `gateway.nodes.pairing.autoApproveCidrs` 視為漏洞本身的報告。此設定預設為停用，需要明確的 CIDR/IP 條目，僅適用於沒有請求範圍的首次 `role: node` 配對，並且不會自動核准操作員/瀏覽器/Control UI、WebChat、角色升級、範圍升級、元數據變更、公開金鑰變更或同主機迴路受信任代理標頭路徑。
- 將 `sessionKey` 視為驗證 Token 的「缺少每用戶授權」發現。

</Accordion>

## 60 秒內建立強化基線

先使用此基線，然後根據受信任的代理有選擇性地重新啟用工具：

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

這會將網關保持在僅限本機，隔離 DM，並預設停用控制平面/執行時間工具。

## 共用收件匣快速規則

如果不止一個人可以 DM 您的機器人：

- 設定 `session.dmScope: "per-channel-peer"`（若為多帳戶頻道則設定 `"per-account-channel-peer"`）。
- 保持 `dmPolicy: "pairing"` 或嚴格的允許清單。
- 切勿將共用 DM 與廣泛的工具存取權結合使用。
- 這可以強化協作/共用收件匣，但並非設計為當用戶共用主機/配置寫入存取權時的惡意共同租戶隔離。

## 內容可見性模型

OpenClaw 分離了兩個概念：

- **觸發授權**：誰可以觸發代理程式（`dmPolicy`、`groupPolicy`、允許清單、提及閘門）。
- **內容可見性**：有哪些額外內容被注入到模型輸入中（回覆內文、引用文字、執行緒歷史、轉發的中繼資料）。

允許清單會對觸發器和指令授權進行閘道管控。`contextVisibility` 設定控制如何過濾額外內容（引用的回覆、執行緒根、擷取的歷史記錄）：

- `contextVisibility: "all"`（預設值）會保留接收到的額外內容。
- `contextVisibility: "allowlist"` 會將額外內容過濾為僅限由目前允許清單檢查所允許的寄件者。
- `contextVisibility: "allowlist_quote"` 的行為類似 `allowlist`，但仍保留一則明確的引用回覆。

請針對每個頻道或每個房間/對話設定 `contextVisibility`。請參閱 [群組聊天] (/en/channels/groups#context-visibility-and-allowlists) 以了解設定詳情。

顧問分類指導原則：

- 僅顯示「模型可查看來自非允許清單寄件者的引用或歷史文字」的主張，屬於可透過 `contextVisibility` 解決的強化發現，本身並非授權或沙盒邊界繞過。
- 若要產生安全性影響，報告仍需展示出已證實的信任邊界繞過（授權、原則、沙盒、核准或其他記載的邊界）。

## 稽核檢查項目（高層次）

- **輸入存取**（DM 原則、群組原則、允許清單）：陌生人能否觸發機器人？
- **工具影響範圍**（提升權限的工具 + 開放式房間）：提示詞注入是否會轉變為 shell/檔案/網路動作？
- **執行核准偏移**（`security=full`、`autoAllowSkills`、沒有 `strictInlineEval` 的直譯器允許清單）：主機執行防護機制是否仍如預期運作？
  - `security="full"` 是一項廣泛的姿態警告，而非錯誤的證明。這是受信任個人助理設定的選定預設值；僅當您的威脅模型需要核准或允許清單防護機制時，才應將其縮減。
- **網路暴露**（Gateway 繫結/授權、Tailscale Serve/Funnel、弱/短授權權杖）。
- **瀏覽器控制暴露**（遠端節點、中繼連接埠、遠端 CDP 端點）。
- **本機磁碟衛生**（權限、符號連結、配置包含、“同步資料夾”路徑）。
- **外掛程式**（外掛程式在沒有明確允許清單的情況下載入）。
- **策略漂移/配置錯誤**（已配置沙箱 docker 設定但沙箱模式關閉；`gateway.nodes.denyCommands` 模式無效，因為匹配僅限於精確的指令名稱（例如 `system.run`）並且不檢查 shell 文字；危險的 `gateway.nodes.allowCommands` 項目；全域 `tools.profile="minimal"` 被每個代理程式的設定檔覆寫；在寬鬆的工具策略下可存取外掛程式擁有的工具）。
- **執行時期預期漂移**（例如，當 `tools.exec.host` 現在預設為 `auto` 時，假設隱含執行仍然意味著 `sandbox`，或者在沙箱模式關閉時明確設定 `tools.exec.host="sandbox"`）。
- **模型衛生**（當配置的模型看起來是舊版時發出警告；這不是強制阻止）。

如果您執行 `--deep`，OpenClaw 也會嘗試盡最大努力進行即時 Gateway 探測。

## 憑證儲存對應表

在稽核存取權或決定要備份什麼時使用此功能：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 機器人權杖**：config/env 或 `channels.telegram.tokenFile`（僅限一般檔案；拒絕符號連結）
- **Discord 機器人權杖**：config/env 或 SecretRef（env/file/exec 提供者）
- **Slack 權杖**：config/env（`channels.slack.*`）
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（預設帳戶）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非預設帳戶）
- **模型驗證設定檔**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **檔案支援的秘密負載（可選）**：`~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**：`~/.openclaw/credentials/oauth.json`

## 安全性稽核檢查清單

當稽核列印結果時，請將此視為優先順序：

1. **任何「公開」+ 已啟用工具**：首先鎖定 DM/群組（配對/允許清單），然後加強工具策略/沙箱。
2. **公開網路暴露**（LAN 綁定、Funnel、缺少驗證）：立即修復。
3. **瀏覽器控制遠端暴露**：將其視為操作員存取（僅限 tailnet、刻意配對節點、避免公開暴露）。
4. **權限**：請確保 state/config/credentials/auth 不是群組/世界可讀的。
5. **外掛**：僅載入您明確信任的外掛。
6. **模型選擇**：對於任何具備工具的機器人，請優先使用現代化且經過指令強化的模型。

## 安全審計術語表

每個審計發現都由結構化的 `checkId` （例如
`gateway.bind_no_auth` 或 `tools.exec.security_full_configured`）作為索引鍵。常見的
嚴重性類別：

- `fs.*` — 狀態、設定、憑證、身分設定檔的檔案系統權限。
- `gateway.*` — 繫結模式、身分驗證、Tailscale、控制 UI、信任的 Proxy 設定。
- `hooks.*`、`browser.*`、`sandbox.*`、`tools.exec.*` — 針對各介面的強化防護。
- `plugins.*`、`skills.*` — 外掛/技能供應鏈與掃描發現。
- `security.exposure.*` — 存取權原則與工具影響範圍交匯處的跨領域檢查。

請參閱 [安全審計檢查](/zh-Hant/gateway/security/audit-checks) 以取得包含嚴重性層級、修復金鑰和自動修復支援的完整目錄。

## 透過 HTTP 使用控制 UI

控制 UI 需要 **安全內容** (HTTPS 或 localhost) 才能產生裝置
身分。`gateway.controlUi.allowInsecureAuth` 是一個本機相容性切換開關：

- 在 localhost 上，當頁面透過非安全的 HTTP 載入時，
  它允許在沒有裝置身分的情況下進行控制 UI 身分驗證。
- 它不會略過配對檢查。
- 它不會放寬遠端 (非 localhost) 裝置身分的要求。

建議優先使用 HTTPS (Tailscale Serve) 或在 `127.0.0.1` 上開啟 UI。

僅限用於緊急情況，`gateway.controlUi.dangerouslyDisableDeviceAuth`
會完全停用裝置身分檢查。這是一個嚴重的安全性降級；
請保持關閉，除非您正在主動進行除錯且能快速還原。

與那些危險的標誌分開來看，成功的 `gateway.auth.mode: "trusted-proxy"`
可以在沒有裝置身分的情況下接受 **操作員** 控制 UI 會話。這是
一項刻意設計的身分驗證模式行為，而非 `allowInsecureAuth` 的捷徑，且它
仍然不適用於節點角色控制 UI 會話。

`openclaw security audit` 會在啟用此設定時發出警告。

## 不安全或危險旗標摘要

當啟用已知的不安全/危險除錯開關時，`openclaw security audit` 會引發 `config.insecure_or_dangerous_flags`。請在生產環境中保持未設定這些開關。

<AccordionGroup>
  <Accordion title="目前稽核追蹤的旗標">
    - `gateway.controlUi.allowInsecureAuth=true`
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
    - `hooks.gmail.allowUnsafeExternalContent=true`
    - `hooks.mappings[<index>].allowUnsafeExternalContent=true`
    - `tools.exec.applyPatch.workspaceOnly=false`
    - `plugins.entries.acpx.config.permissionMode=approve-all`
  </Accordion>

  <Accordion title="設定架構中的所有 `dangerous*` / `dangerously*` 金鑰">
    控制介面和瀏覽器：

    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth`
    - `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

    頻道名稱匹配（內建和外掛頻道；亦適用於各 `accounts.<accountId>`）：

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

    - `channels.telegram.network.dangerouslyAllowPrivateNetwork` (亦適用於各帳戶)

    沙箱 Docker（預設值 + 各代理程式）：

    - `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
    - `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
    - `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

  </Accordion>
</AccordionGroup>

## 反向代理設定

如果您在反向代理（nginx、Caddy、Traefik 等）後方執行 Gateway，請設定 `gateway.trustedProxies` 以正確處理轉送的用戶端 IP。

當 Gateway 偵測到來自 **不在** `trustedProxies` 中之位址的 proxy 標頭時，它會 **不** 將連線視為本機用戶端。如果已停用 Gateway 驗證，這些連線將會被拒絕。這可防止經過代理的連線顯示為來自 localhost 並自動獲得信任，從而導致驗證被繞過。

`gateway.trustedProxies` 也會導入 `gateway.auth.mode: "trusted-proxy"`，但該驗證模式更嚴格：

- trusted-proxy 驗證對來源為回環的代理會「預設拒絕」（fails closed）
- 相同主機的回環反向代理仍可使用 `gateway.trustedProxies` 進行本機端偵測及轉送 IP 處理
- 對於相同主機的回環反向代理，請改用 token/password 驗證，而不是 `gateway.auth.mode: "trusted-proxy"`

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

當設定 `trustedProxies` 時，Gateway 會使用 `X-Forwarded-For` 來判斷客戶端 IP。`X-Real-IP` 預設會被忽略，除非明確設定 `gateway.allowRealIpFallback: true`。

受信任的代理標頭並不會讓節點裝置配對自動受信任。
`gateway.nodes.pairing.autoApproveCidrs` 是一項獨立、預設停用
的運算原則。即使啟用，來源為回環的受信任代理標頭路徑
仍會被排除在節點自動核准之外，因為本機呼叫者可以偽造
這些標頭。

良好的反向代理行為（覆寫傳入的轉送標頭）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良的反向代理行為（附加/保留未受信任的轉送標頭）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 與來源備註

- OpenClaw gateway 優先考慮本地/回環。如果您在反向代理終止 TLS，請在該處對面向代理的 HTTPS 網域設定 HSTS。
- 如果 gateway 本身終止 HTTPS，您可以設定 `gateway.http.securityHeaders.strictTransportSecurity` 以從 OpenClaw 回應中發出 HSTS 標頭。
- 詳細的部署指引請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 對於非回環的 Control UI 部署，預設需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是一項明確允許所有瀏覽器來源的原則，並非強化的預設值。除了嚴密控制的本地測試外，請避免使用。
- 回環上的瀏覽器來源驗證失敗即使啟用了一般
  回環豁免，仍會受到速率限制，但鎖定金鑰的範圍
  是以標準化的 `Origin` 值為準，而不是
  一個共用的 localhost 區塊。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源後援模式；請將其視為一項危險的運算者選取原則。
- 將 DNS 重新綁定和代理主機標頭行為視為部署強化問題；保持 `trustedProxies` 嚴格，並避免將閘道直接暴露於公共網際網路。

## 本機工作階段記錄儲存於磁碟上

OpenClaw 將工作階段記錄儲存在磁碟上的 `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下。
這是工作階段連續性以及（可選）工作階段記憶體索引所必需的，但這也意味著
**任何具有檔案系統存取權的行程/使用者都可以讀取這些記錄**。將磁碟存取視為信任
邊界，並鎖定 `~/.openclaw` 的權限（請參閱下方的稽核章節）。如果您需要
代理程式之間更強的隔離，請在獨立的 OS 使用者或獨立的主機下執行它們。

## 節點執行 (system.run)

如果已配對 macOS 節點，閘道可以在該節點上叫用 `system.run`。這是 Mac 上的 **遠端程式碼執行**：

- 需要節點配對（核准 + 權杖）。
- 閘道節點配對並非逐指令核准介面。它建立節點身分/信任和權杖發行。
- 閘道透過 `gateway.nodes.allowCommands` / `denyCommands` 套用粗略的全域節點指令策略。
- 在 Mac 上透過 **設定 → 執行核准** (security + ask + allowlist) 進行控制。
- 各個節點的 `system.run` 策略是節點自己的執行核准檔案 (`exec.approvals.node.*`)，它可以比閘道的全域指令 ID 策略更嚴格或更寬鬆。
- 以 `security="full"` 和 `ask="off"` 執行的節點正在遵循預設的受信任操作者模型。除非您的部署明確需要更嚴格的核准或允許清單立場，否則請將此視為預期行為。
- 核准模式會綁定確切的要求內容，並在可能的情況下綁定一個具體的本機腳本/檔案操作元。如果 OpenClaw 無法為解譯器/執行時指令識別出確切的一個直接本機檔案，將拒絕支援核准的執行，而不是承諾完整的語意涵蓋範圍。
- 對於 `host=node`，支援核准的執行也會儲存一個規範的準備
  `systemRunPlan`；稍後經核准的轉發會重用該儲存的計畫，並且閘道
  驗證會拒絕在建立核准要求後對指令/cwd/工作階段內容進行呼叫者編輯。
- 如果您不希望遠端執行，請將安全性設為 **deny** 並移除該 Mac 的節點配對。

這項區別對於分類處理非常重要：

- 如果 Gateway 全域原則和節點的本機執行核准仍然強制執行實際的執行邊界，那麼宣傳不同指令清單的重新連線配對節點本身並不是漏洞。
- 將節點配對元資料視為第二個隱藏的逐指令核准層的報告，通常屬於原則/使用者體驗混淆，而非繞過安全性邊界。

## 動態技能

OpenClaw 可以在會話中途重新整理技能清單：

- **Skills watcher**：對 `SKILL.md` 的變更可以在下一次 agent 輪次更新技能快照。
- **Remote nodes**：連接 macOS 節點可以使僅限 macOS 的技能變為可用（基於 bin probing）。

將技能資料夾視為 **受信任的程式碼** 並限制誰可以修改它們。

## 威脅模型

您的 AI 助手可以：

- 執行任意 shell 指令
- 讀寫檔案
- 存取網路服務
- 傳送訊息給任何人（如果您給它 WhatsApp 存取權）

傳訊給您的人可以：

- 試圖誘騙您的 AI 做壞事
- 透過社交工程取得您的資料存取權
- 探測基礎設施細節

## 核心概念：智慧之前的存取控制

此處的大部分失敗並非花俏的漏洞利用——它們是「有人傳訊息給機器人，機器人就照他們的要求做了」。

OpenClaw 的立場：

- **身分優先**：決定誰可以與機器人交談（DM 配對 / 允許清單 / 明確的「開放」）。
- **範圍次之**：決定機器人被允許在哪裡運作（群組允許清單 + 提及閘道、工具、沙盒、裝置權限）。
- **模型最後**：假設模型可以被操控；進行設計使操控具有有限的爆炸半徑。

## 指令授權模型

斜線指令和指令僅對 **授權發送者** 有效。授權來自
頻道允許清單/配對加上 `commands.useAccessGroups`（請參閱 [Configuration](/zh-Hant/gateway/configuration)
和 [Slash commands](/zh-Hant/tools/slash-commands)）。如果頻道允許清單為空或包含 `"*"`，
則該頻道的指令實際上開放。

`/exec` 是僅限目前工作階段的便利功能，供授權操作員使用。它**不**會寫入設定或變更其他工作階段。

## 控制平面工具風險

有兩個內建工具可以進行永久性的控制平面變更：

- `gateway` 可以使用 `config.schema.lookup` / `config.get` 檢查設定，並使用 `config.apply`、`config.patch` 和 `update.run` 進行永久性變更。
- `cron` 可以建立排程工作，這些工作會在原始聊天/任務結束後繼續執行。

僅限擁有者使用的 `gateway` 執行階段工具仍然拒絕重寫 `tools.exec.ask` 或 `tools.exec.security`；舊版 `tools.bash.*` 別名會在寫入前正規化為相同的受保護執行路徑。預設情況下，代理驅動的 `gateway config.apply` 和 `gateway config.patch` 編輯是「失敗即封閉」：只有一小部分的提示詞、模型和提及閘道路徑可由代理調整。因此，新的敏感設定樹會受到保護，除非它們被刻意加入到允許清單中。

對於任何處理不受信任內容的代理/介面，預設拒絕這些操作：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 僅封鎖重新啟動操作。它不會停用 `gateway` 設定/更新操作。

## 外掛程式

外掛程式與閘道在**同一進程**中執行。請將其視為受信任的程式碼：

- 僅安裝來自您信任來源的外掛程式。
- 優先使用明確的 `plugins.allow` 允許清單。
- 在啟用前審查外掛程式設定。
- 外掛程式變更後請重新啟動閘道。
- 如果您安裝或更新外掛程式（`openclaw plugins install <package>`、`openclaw plugins update <id>`），請將其視為執行不受信任的程式碼：
  - 安裝路徑是現用外掛程式安裝根目錄下的各個外掛程式目錄。
  - OpenClaw 在安裝/更新前會執行內建的危險程式碼掃描。預設會封鎖 `critical` 的發現結果。
  - OpenClaw 使用 `npm pack`，然後在該目錄中執行專案本地的 `npm install --omit=dev --ignore-scripts`。繼承的全域 npm 安裝設定會被忽略，以便相依性保留在插件安裝路徑下。
  - 優先使用鎖定的確切版本 (`@scope/pkg@1.2.3`)，並在啟用前檢查磁碟上的未封裝程式碼。
  - `--dangerously-force-unsafe-install` 僅供在插件安裝/更新流程中針對內建掃描誤報時緊急使用。它不會繞過插件 `before_install` 掛鉤原則阻擋，也不會繞過掃描失敗。
  - Gateway 支援的技能相依性安裝遵循相同的危險/可疑區分：內建 `critical` 發現會阻擋，除非呼叫者明確設定 `dangerouslyForceUnsafeInstall`，而可疑發現仍僅發出警告。`openclaw skills install` 保持為獨立的 ClawHub 技能下載/安裝流程。

詳情：[插件](/zh-Hant/tools/plugin)

## DM 存取模型：配對、允許清單、開放、已停用

所有目前支援 DM 的頻道都支援 DM 原則 (`dmPolicy` 或 `*.dm.policy`)，在訊息處理**之前**對傳入的 DM 進行管制：

- `pairing` (預設)：未知發送者會收到一個簡短的配對碼，機器人會在核准前忽略其訊息。配對碼會在 1 小時後過期；重複的 DM 在建立新請求之前不會重新發送碼。待處理請求預設上限為每個頻道 **3 個**。
- `allowlist`：未知發送者會被阻擋 (無配對交握)。
- `open`：允許任何人 DM (公開)。**要求** 頻道允許清單包含 `"*"` (明確選擇加入)。
- `disabled`：完全忽略傳入的 DM。

透過 CLI 核准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

詳情 + 磁碟上的檔案：[配對](/zh-Hant/channels/pairing)

## DM 會話隔離 (多使用者模式)

預設情況下，OpenClaw 將 **所有 DM 路由到主會話**，以便您的助理在裝置和頻道之間保持連續性。如果 **多個人** 可以 DM 機器人 (開放 DM 或多人允許清單)，請考慮隔離 DM 會話：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

這可以防止跨使用者內容洩漏，同時保持群組聊天隔離。

這是一個訊息上下文邊界，而非主機管理員邊界。如果使用者彼此互為對手並且共用同一個 Gateway 主機/設定，請改為每個信任邊界執行個別的 gateway。

### 安全 DM 模式（推薦）

將上方的程式碼片段視為 **安全 DM 模式**：

- 預設值：`session.dmScope: "main"`（所有 DM 共用一個工作階段以保持連續性）。
- 本地 CLI 入門預設值：未設定時會寫入 `session.dmScope: "per-channel-peer"`（保留既有的明確值）。
- 安全 DM 模式：`session.dmScope: "per-channel-peer"`（每個頻道+發送者配對都會獲得一個隔離的 DM 上下文）。
- 跨頻道對等隔離：`session.dmScope: "per-peer"`（每個發送者在所有相同類型的頻道中僅獲得一個工作階段）。

如果您在同一個頻道上執行多個帳戶，請改用 `per-account-channel-peer`。如果同一個人透過多個頻道聯絡您，請使用 `session.identityLinks` 將這些 DM 工作階段合併為一個標準身分。請參閱[工作階段管理](/zh-Hant/concepts/session)與[設定](/zh-Hant/gateway/configuration)。

## DM 與群組的允許清單

OpenClaw 有兩個獨立的「誰可以觸發我？」層級：

- **DM 允許清單**（`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；舊版：`channels.discord.dm.allowFrom`、`channels.slack.dm.allowFrom`）：允許誰在私訊中與機器人交談。
  - 當設定為 `dmPolicy="pairing"` 時，批准會被寫入帳戶範圍的配對允許清單儲存庫中，路徑為 `~/.openclaw/credentials/`（預設帳戶為 `<channel>-allowFrom.json`，非預設帳戶為 `<channel>-<accountId>-allowFrom.json`），並與設定允許清單合併。
- **群組允許清單**（特定頻道）：機器人會完全接受來自哪些群組/頻道/公會的訊息。
  - 常見模式：
    - `channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`：各群組的預設值，例如 `requireMention`；設定後，它也會充當群組允許清單（包含 `"*"` 以保持全部允許的行為）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制群組會話（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）*內部*可以觸發機器人的使用者。
    - `channels.discord.guilds` / `channels.slack.channels`：針對各表面的允許清單 + 提及預設值。
  - 群組檢查按以下順序執行：首先檢查 `groupPolicy`/群組允許清單，其次檢查提及/回覆啟動。
  - 回覆機器人的訊息（隱含提及）**並不會**繞過傳送者允許清單，例如 `groupAllowFrom`。
  - **安全性備註：**請將 `dmPolicy="open"` 和 `groupPolicy="open"` 視為最後手段的設定。應儘量少用；除非您完全信任房間中的每個成員，否則建議優先使用配對 + 允許清單。

詳細資訊：[組態](/zh-Hant/gateway/configuration) 和 [群組](/zh-Hant/channels/groups)

## 提示詞注入（它是什麼，為什麼重要）

提示詞注入是指攻擊者精心設計一則訊息，操縱模型執行不安全操作的行為（例如「忽略你的指令」、「傾印你的檔案系統」、「追蹤此連結並執行指令」等）。

即使有強大的系統提示詞，**提示詞注入問題仍未解決**。系統提示詞防護措施僅屬於軟性指引；嚴格的執行來自工具原則、執行核准、沙盒機制和通道允許清單（且操作員可依照設計停用這些功能）。實務上有效的做法包括：

- 鎖定傳入的私人訊息（配對/允許清單）。
- 在群組中優先使用提及閘門；避免在公開房間中使用「永遠開啟」的機器人。
- 預設將連結、附件和貼上的指令視為具有敵意。
- 在沙盒中執行敏感工具操作；將機密資訊遠離代理人可存取的檔案系統。
- 注意：沙盒機制屬於選用功能。如果關閉沙盒模式，隱含的 `host=auto` 會解析為閘道主機。明確指定的 `host=sandbox` 仍然會因為沒有可用的沙盒執行時而失敗關閉。如果您希望在設定中明確顯示此行為，請設定 `host=gateway`。
- 將高風險工具（`exec`、`browser`、`web_fetch`、`web_search`）限制在受信任的代理人或明確的允許清單中。
- 如果您將直譯器（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`）加入允許清單，請啟用 `tools.exec.strictInlineEval`，這樣內聯 eval 表單仍需要明確批准。
- Shell 批准分析也會拒絕位於**未加引號的 heredocs**內的 POSIX 參數擴展形式（`$VAR`、`$?`、`$$`、`$1`、`$@`、`${…}`），因此允許清單中的 heredoc 內容無法透過純文字的形式，在允許清單審查時偷偷進行 Shell 擴展。請將 heredoc 終止符加上引號（例如 `<<'EOF'`）以選擇字面內容語意；會進行變數擴展的未加引號 heredocs 將會被拒絕。
- **模型選擇很重要：** 舊型/較小/舊版模型對於提示詞注入和工具誤用的防禦能力明顯較弱。對於啟用工具的代理程式，請使用可用的最強大、最新一代且經過指令強化的模型。

應視為不可信的危險訊號：

- 「讀取這個檔案/URL 並完全照它說的做。」
- 「忽略你的系統提示詞或安全規則。」
- 「揭露你的隱藏指令或工具輸出。」
- 「貼上 ~/.openclaw 或你日誌的完整內容。」

## 外部內容特殊記號清理

OpenClaw 會在封裝的外部內容和中繼資料到達模型之前，從中移除常見的自行架設 LLM 聊天範本特殊記號字面值。涵蓋的記號家族包括 Qwen/ChatML、Llama、Gemma、Mistral、Phi 和 GPT-OSS 角色/輪次記號。

原因：

- 位於自行架設模型前端的 OpenAI 相容後端，有時會保留出現在用戶文字中的特殊記號，而不是將其遮蔽。否則，能夠寫入輸入外部內容（提取的頁面、電子郵件主體、檔案內容工具輸出）的攻擊者可能會注入合成的 `assistant` 或 `system` 角色邊界，並逃脫封裝內容的防護機制。
- 清理發生在外部內容包裝層，因此它均勻地應用於擷取/讀取工具和入站通道內容，而不是針對每個供應商。
- 出站模型回應已經有一個單獨的清理器，可以從使用者可見的回覆中去除洩漏的 `<tool_call>`、`<function_calls>` 和類似的基架。外部內容清理器是其入站對應物。

這並不取代本頁中的其他防護措施——`dmPolicy`、允許清單、執行核准、沙盒和 `contextVisibility` 仍然發揮主要作用。它封閉了一個特定的針對轉發帶有特殊令牌的使用者文字的自託管堆疊的詞元化器層繞過漏洞。

## 不安全的外部內容繞過旗標

OpenClaw 包含明確的繞過旗標，用於停用外部內容安全包裝：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 載荷欄位 `allowUnsafeExternalContent`

指導原則：

- 在生產環境中保持這些設定為未設定/false。
- 僅針對嚴格範圍的除錯暫時啟用。
- 如果啟用，請隔離該代理程式（沙盒 + 最少工具 + 專用會話命名空間）。

Hook 風險提示：

- Hook 載荷是不可信內容，即使傳遞來自您控制的系統（郵件/文件/網頁內容可能攜帶提示注入）。
- 較弱的模型層級會增加此風險。對於由 Hook 驅動的自動化，請優先選擇強大的現代模型層級並保持工具政策嚴格（`tools.profile: "messaging"` 或更嚴格），並在可能的情况下進行沙盒隔離。

### 提示注入不需要公開的 DM

即使**只有您**可以向機器人發送訊息，提示注入仍可能透過機器人讀取的任何**不受信任的內容**（網頁搜尋/擷取結果、瀏覽器頁面、電子郵件、文件、附件、貼上的日誌/代碼）發生。換句話說：發送者不是唯一的威脅面；**內容本身**可能攜帶對抗性指令。

啟用工具時，典型的風險是外洩上下文或觸發工具呼叫。透過以下方式減少爆炸半徑：

- 使用唯讀或停用工具的**讀取代理程式**來總結不受信任的內容，然後將摘要傳遞給您的主代理程式。
- 除非必要，否則對於啟用工具的代理，請將 `web_search` / `web_fetch` / `browser` 保持關閉。
- 對於 OpenResponses URL 輸入 (`input_file` / `input_image`)，請設定嚴格的
  `gateway.http.endpoints.responses.files.urlAllowlist` 和
  `gateway.http.endpoints.responses.images.urlAllowlist`，並將 `maxUrlParts` 保持在低水平。
  空的允許清單被視為未設定；如果您想完全停用 URL 獲取，請使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 對於 OpenResponses 檔案輸入，解碼後的 `input_file` 文字仍會被注入為
  **不受信任的外部內容**。不要僅因為 Gateway 在本機解碼了檔案就依賴其文字是受信任的。注入的區塊仍然帶有明確的
  `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 邊界標記以及 `Source: External`
  元數據，儘管此路徑省略了較長的 `SECURITY NOTICE:` 橫幅。
- 當媒體理解從附加的文件中提取文字並將其附加到媒體提示之前，會套用相同的基於標記的包裝。
- 為任何接觸不受信任輸入的代理啟用沙盒和嚴格的工具允許清單。
- 將機密資訊排除在提示之外；改為透過 gateway 主機上的 env/config 傳遞它們。

### 自託管 LLM 後端

OpenAI 相容的自託管後端（如 vLLM、SGLang、TGI、LM Studio
或自訂 Hugging Face tokenizer 堆疊）在處理 chat-template
特殊標記的方式上可能與託管提供商不同。如果後端將諸如 `<|im_start|>`、`<|start_header_id|>` 或 `<start_of_turn>` 之類的字面字串
在用戶內容中標記為結構性 chat-template 標記，不受信任的文字可能會嘗試在 tokenizer 層偽造角色邊界。

OpenClaw 會在將包裝的外部內容分派給模型之前，從中剝離常見的模型系列特殊標記字面值。請保持外部內容包裝處於啟用狀態，並在可用時優先使用在用戶提供的內容中分割或跳脫特殊標記的後端設定。OpenAI
和 Anthropic 等託管提供商已經應用了自己的請求端清理。

### 模型強度（安全說明）

各模型層級的提示詞注入防護能力並不均勻。較小/較便宜的模型通常更容易受到工具誤用和指令劫持的影響，特別是在受到對抗性提示詞攻擊時。

<Warning>對於已啟用工具的代理或讀取不受信任內容的代理，使用較舊/較小的模型時，提示詞注入風險通常過高。請勿在弱勢模型層級上執行這些工作負載。</Warning>

建議：

- 對於任何可以執行工具或存取檔案/網路的機器人，**請使用最新世代、最高層級的模型**。
- **請勿對已啟用工具的代理或不受信任的收件匣使用較舊/較弱/較小的層級**；提示詞注入風險過高。
- 如果您必須使用較小的模型，請**降低爆炸半徑**（唯讀工具、強化沙箱、最小檔案系統存取權、嚴格的允許清單）。
- 執行小型模型時，請**對所有會話啟用沙箱**，並**停用 web_search/web_fetch/browser**，除非輸入受到嚴格控制。
- 對於具有受信任輸入且無工具的純聊天個人助理，較小的模型通常是可以的。

## 群組中的推理和詳細輸出

`/reasoning`、`/verbose` 和 `/trace` 可能會暴露不應出現在公開頻道中的內部推理、工具輸出或外掛程式診斷資訊。在群組設定中，請將其視為**僅限偵錯**使用，並在明確需要之前保持關閉。

指引：

- 請在公開房間中停用 `/reasoning`、`/verbose` 和 `/trace`。
- 如果您啟用它們，請僅在受信任的 DM 或嚴格控制的房間中啟用。
- 請記住：詳細輸出和追蹤輸出可能包含工具參數、URL、外掛程式診斷資訊以及模型看到的資料。

## 設定強化範例

### 檔案權限

在 Gateway 主機上將設定 + 狀態設為私密：

- `~/.openclaw/openclaw.json`: `600` (僅使用者讀寫)
- `~/.openclaw`: `700` (僅使用者)

`openclaw doctor` 可以發出警告並提供加強這些權限的選項。

### 網路暴露 (bind、port、防火牆)

Gateway 在單一連接埠上多工傳輸 **WebSocket + HTTP**：

- 預設值：`18789`
- 設定/旗標/環境變數： `gateway.port`, `--port`, `OPENCLAW_GATEWAY_PORT`

此 HTTP 介面包含控制 UI 和 canvas 主機：

- 控制 UI (SPA 資源) (預設基礎路徑 `/`)
- Canvas 主機： `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` (任意 HTML/JS；請將其視為不受信任的內容)

如果您在一般瀏覽器中載入 canvas 內容，請像對待任何其他不受信任的網頁一樣對待它：

- 不要將 canvas 主機暴露給不受信任的網路/使用者。
- 除非您完全了解其影響，否則不要讓 canvas 內容與具備特權的網頁介面共享來源 (origin)。

綁定模式 控制閘道器 的監聽位置：

- `gateway.bind: "loopback"` (預設值)：僅本機客戶端 可以連線。
- 非回環綁定 (`"lan"`, `"tailnet"`, `"custom"`) 會擴大攻擊面。僅在使用閘道器驗證 (共享 token/密碼或正確設定的非回環受信任 proxy) 以及真正的防火牆時才使用它們。

經驗法則：

- 優先使用 Tailscale Serve 而非區域網路 (LAN) 綁定 (Serve 讓閘道器保持在回環上，並由 Tailscale 處理存取)。
- 如果您必須綁定到區域網路，請將埠的防火牆設定為嚴格的來源 IP 白名單；不要廣泛地進行埠轉送。
- 切勿在 `0.0.0.0` 上以未經驗證的方式公開閘道器。

### 使用 UFW 發布 Docker 埠

如果您在 VPS 上使用 Docker 執行 OpenClaw，請記住已發布的容器埠
(`-p HOST:CONTAINER` 或 Compose `ports:`) 是透過 Docker 的轉發
鏈 路由，而不僅是主機 `INPUT` 規則。

為了使 Docker 流量與您的防火牆政策保持一致，請在
`DOCKER-USER` 中強制執行規則 (此鏈會在 Docker 自己的接受規則之前被評估)。
在許多現代發行版中，`iptables`/`ip6tables` 使用 `iptables-nft` 前端
並且仍會將這些規則套用至 nftables 後端。

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

避免在文件代碼片段中硬編碼介面名稱，如 `eth0`。介面名稱因 VPS 映像檔而異（`ens3`、`enp*` 等），不匹配可能會意外導致您的拒絕規則被跳過。

重新載入後的快速驗證：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

預期的外部連接埠應僅限於您刻意公開的內容（對於大多數設定：SSH + 您的反向代理連接埠）。

### mDNS/Bonjour 探索

Gateway 透過 mDNS（連接埠 5353 上的 `_openclaw-gw._tcp`）廣播其存在，以進行本地裝置探索。在完整模式下，這包括可能暴露運作細節的 TXT 記錄：

- `cliPath`：CLI 二進位檔的完整檔案系統路徑（會揭露使用者名稱和安裝位置）
- `sshPort`：廣告主機上 SSH 的可用性
- `displayName`、`lanHost`：主機名稱資訊

**營運安全考量：** 廣播基礎設施細節會讓本機網路上的任何人更容易進行偵察。即使是「無害」的資訊，如檔案系統路徑和 SSH 可用性，也能幫助攻擊者繪製您的環境圖。

**建議：**

1. **最小模式**（預設，建議用於公開的 Gateway）：從 mDNS 廣播中省略敏感欄位：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

2. **完全停用**，如果您不需要本地裝置探索：

   ```json5
   {
     discovery: {
       mdns: { mode: "off" },
     },
   }
   ```

3. **完整模式**（選用）：在 TXT 記錄中包含 `cliPath` + `sshPort`：

   ```json5
   {
     discovery: {
       mdns: { mode: "full" },
     },
   }
   ```

4. **環境變數**（替代方案）：設定 `OPENCLAW_DISABLE_BONJOUR=1` 以停用 mDNS 而無需變更設定。

在最小模式下，Gateway 仍會廣播足以進行裝置探索的資訊（`role`、`gatewayPort`、`transport`），但會省略 `cliPath` 和 `sshPort`。需要 CLI 路徑資訊的應用程式可以改透過已驗證的 WebSocket 連線來擷取。

### 鎖定 Gateway WebSocket（本地驗證）

Gateway 驗證**預設為必填**。如果未設定有效的 gateway 驗證路徑，
Gateway 將拒絕 WebSocket 連線（失敗關閉/fail‑closed）。

Onboarding 預設會產生一個 token（即使是對於 loopback），因此
本地用戶端必須通過驗證。

設定權杖，以便**所有** WS 用戶端都必須通過驗證：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以幫您產生一個：`openclaw doctor --generate-gateway-token`。

<Note>`gateway.remote.token` 和 `gateway.remote.password` 是用戶端憑證來源。它們**本身並不**保護本機 WS 存取。本機呼叫路徑僅在 `gateway.auth.*` 未設定時，才能將 `gateway.remote.*` 作為後備。如果 `gateway.auth.token` 或 `gateway.auth.password` 透過 SecretRef 明確設定但無法解析，解析將以關閉方式失敗（沒有遠端後備遮罩）。</Note>
選用：使用 `wss://` 時，使用 `gateway.remote.tlsFingerprint` 釘選遠端 TLS。 純文字 `ws://` 預設僅限回送。對於受信任的私有網路 路徑，在用戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為 應急手段。這是有意僅限於程序環境，而非 `openclaw.json` 設定鍵。 行動裝置配對和 Android 手動或掃描的閘道路由更嚴格： 回送接受明文，但私有 LAN、鏈路本機、`.local` 和 無點主機名稱必須使用
TLS，除非您明確選擇加入受信任的 私有網路明文路徑。

本機裝置配對：

- 針對直接本機回送連線，裝置配對會自動批准，以保持
  同主機用戶端順暢。
- OpenClaw 也有一個狹窄的後端/容器本機自連路徑，用於
  受信任的共用密碼輔助流程。
- Tailnet 和 LAN 連線（包括同主機 tailnet 繫結）在配對時被視為
  遠端，仍然需要批准。
- 回送請求上的轉送標頭證據會取消回送
  本地性。元數據升級自動批准的範圍很狹窄。請參閱
  [閘道配對](/zh-Hant/gateway/pairing) 了解這兩條規則。

驗證模式：

- `gateway.auth.mode: "token"`：共用持有人權杖（建議用於大多數設定）。
- `gateway.auth.mode: "password"`：密碼驗證（建議透過環境變數設定：`OPENCLAW_GATEWAY_PASSWORD`）。
- `gateway.auth.mode: "trusted-proxy"`：信任具備身分感知的反向代理來驗證使用者並透過標頭傳遞身分（請參閱[受信任的代理驗證](/zh-Hant/gateway/trusted-proxy-auth)）。

輪換檢查清單（權杖/密碼）：

1. 產生/設定新的密鑰（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重新啟動 Gateway（如果 macOS 應用程式監控 Gateway，則重新啟動該應用程式）。
3. 更新任何遠端用戶端（呼叫 Gateway 的機器上的 `gateway.remote.token` / `.password`）。
4. 驗證您無法再使用舊的憑證進行連線。

### Tailscale Serve 身分標頭

當 `gateway.auth.allowTailscale` 為 `true`（Serve 的預設值）時，OpenClaw
會接受 Tailscale Serve 身分標頭（`tailscale-user-login`）用於 Control
UI/WebSocket 驗證。OpenClaw 透過本機 Tailscale daemon（`tailscale whois`）
解析 `x-forwarded-for` 位址並將其與標頭比對來驗證身分。這僅對於命中 loopback
且包含 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 的請求觸發。
對於此非同步身分檢查路徑，相同 `{scope, ip}` 的失敗嘗試
會在限制器記錄失敗前被序列化。因此，來自一個 Serve 用戶端的並發錯誤重試
可以立即鎖定第二次嘗試，而不是作為兩個單純的不匹配請求競爭。
HTTP API 端點（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
**不**使用 Tailscale 身分標頭驗證。它們仍遵循 gateway
設定的 HTTP 驗證模式。

重要邊界說明：

- Gateway HTTP bearer 驗證實際上為全有或全無的操作員存取權限。
- 請將可呼叫 `/v1/chat/completions`、`/v1/responses` 或 `/api/channels/*` 的憑證視為該 gateway 的完全存取操作員密鑰。
- 在相容 OpenAI 的 HTTP 表面上，共享密碼 bearer 驗證會恢復完整的預設操作員範圍（`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`）以及代理回合的擁有者語意；較狹隘的 `x-openclaw-scopes` 值不會縮減該共享密碼路徑。
- HTTP 上的個別請求範圍語意僅在請求來自已身分驗證模式（例如受信任的 Proxy 驗證或私人入口上的 `gateway.auth.mode="none"`）時才會套用。
- 在這些身分驗證模式中，若省略 `x-openclaw-scopes`，則會回退至正常的操作員預設範圍集；當您需要較狹隘的範圍集時，請明確傳送標頭。
- `/tools/invoke` 遵循相同的共享密碼規則：Token/密碼 bearer 驗證在那裡也會被視為完整操作員存取權，而身分驗證模式則會遵守宣告的範圍。
- 請勿與未受信任的呼叫者共用這些憑證；建議每個信任邊界使用個別的閘道。

**信任假設：** 無 Token Serve 驗證假設閘道主機是受信任的。
請勿將此視為防禦來自同主機敵對程序的手段。如果在閘道主機上可能執行未受信任的本機程式碼，請停用 `gateway.auth.allowTailscale`
並要求使用 `gateway.auth.mode: "token"` 或
`"password"` 進行明確的共享密碼驗證。

**安全性規則：** 請勿從您自己的反向 Proxy 轉送這些標頭。如果您在閘道終止 TLS 或進行 Proxy 請求，請停用
`gateway.auth.allowTailscale`，並改用共享密碼驗證（`gateway.auth.mode:
"token"` or `"password"`）或 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)。

受信任的 Proxy：

- 如果您在 Gateway 前方終止 TLS，請將 `gateway.trustedProxies` 設為您的 Proxy IP。
- OpenClaw 將信任來自這些 IP 的 `x-forwarded-for`（或 `x-real-ip`），以判斷用於本機配對檢查和 HTTP 驗證/本機檢查的用戶端 IP。
- 請確保您的 Proxy **覆寫** `x-forwarded-for` 並阻擋對 Gateway 連接埠的直接存取。

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 和 [Web 概覽](/zh-Hant/web)。

### 透過節點主機進行瀏覽器控制（推薦）

如果您的 Gateway 位於遠端但瀏覽器在另一台機器上運行，請在瀏覽器機器上運行 **node host** 並讓 Gateway 代理瀏覽器動作（請參閱 [Browser tool](/zh-Hant/tools/browser)）。請將節點配對視為管理員存取權限。

推薦模式：

- 將 Gateway 和 node host 保持在同一個 tailnet (Tailscale) 中。
- 有意地配對節點；如果不需要，請停用瀏覽器代理路由。

避免：

- 透過區域網路 (LAN) 或公開網際網路暴露中繼/控制連接埠。
- 針對瀏覽器控制端點使用 Tailscale Funnel（公開暴露）。

### 磁碟上的機密

假設 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何內容都可能包含機密或私人資料：

- `openclaw.json`：設定可能包含權杖 (gateway, remote gateway)、供應商設定和允許清單。
- `credentials/**`：通道憑證（例如：WhatsApp 憑證）、配對允許清單、舊版 OAuth 匯入。
- `agents/<agentId>/agent/auth-profiles.json`：API 金鑰、權杖設定檔、OAuth 權杖，以及選用的 `keyRef`/`tokenRef`。
- `secrets.json` (選用)：由 `file` SecretRef 供應商使用的檔案支援機密承載 (`secrets.providers`)。
- `agents/<agentId>/agent/auth.json`：舊版相容性檔案。偵測到時會清除靜態 `api_key` 項目。
- `agents/<agentId>/sessions/**`：工作階段逐字稿 (`*.jsonl`) + 路由中繼資料 (`sessions.json`)，可能包含私人訊息和工具輸出。
- 套件外掛程式：已安裝的外掛程式（以及其 `node_modules/`）。
- `sandboxes/**`：工具沙箱工作區；可能會累積您在沙箱內讀寫的檔案副本。

防護加固提示：

- 保持嚴格的權限（目錄設為 `700`，檔案設為 `600`）。
- 在 Gateway 主機上使用全碟加密。
- 如果主機是共用的，Gateway 優先使用專用的 OS 使用者帳戶。

### 工作區 `.env` 檔案

OpenClaw 會載入針對代理程式和工具的工作區本機 `.env` 檔案，但絕不允許這些檔案無聲無息地覆寫閘道執行期控制。

- 任何以 `OPENCLAW_*` 開頭的索引鍵都會被不受信任的工作區 `.env` 檔案封鎖。
- 針對 Matrix、Mattermost、IRC 和 Synology Chat 的通道端點設定也會受到工作區 `.env` 覆寫的封鎖，因此複製的工作區無法透過本機端點設定重新導向套件連接器的流量。端點環境變數索引鍵（例如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`）必須來自閘道程序環境或 `env.shellEnv`，而不能來自工作區載入的 `.env`。
- 此封鎖是失效關閉 (fail-closed) 的：未來版本中新增的執行期控制變數無法從簽入或攻擊者提供的 `.env` 繼承；該索引鍵會被忽略，且閘道將保持其本身的值。
- 受信任的程序/作業系統環境變數（閘道本身的 shell、launchd/systemd 單元、應用程式套件）仍然適用——這僅限制 `.env` 檔案的載入。

原因：工作區 `.env` 檔案經常與代理程式碼放在一起、被意外提交，或由工具寫入。封鎖整個 `OPENCLAW_*` 前綴意味著稍後新增新的 `OPENCLAW_*` 標誌時，絕不會回退到從工作區狀態無聲繼承。

### 日誌和對話記錄（編修與保留）

即使存取控制設定正確，日誌和對話記錄仍可能洩漏敏感資訊：

- 閘道日誌可能包含工具摘要、錯誤和 URL。
- 會話對話記錄可能包含貼上的機密、檔案內容、指令輸出和連結。

建議：

- 保持日誌和對話記錄編修功能開啟（`logging.redactSensitive: "tools"`；預設值）。
- 透過 `logging.redactPatterns` 為您的環境新增自訂模式（權杖、主機名稱、內部 URL）。
- 分享診斷資訊時，優先使用 `openclaw status --all`（可貼上、秘密已編輯）而非原始日誌。
- 如果不需要長期保留，請修剪舊的工作階段對話記錄和日誌檔案。

詳細資訊：[日誌記錄](/zh-Hant/gateway/logging)

### 私訊 (DMs)：預設配對

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 群組：到處皆需提及

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

在群組聊天中，僅在明確被提及時回應。

### 分離號碼 (WhatsApp, Signal, Telegram)

對於基於電話號碼的頻道，請考慮使用與您個人電話號碼不同的號碼來執行您的 AI：

- 個人號碼：您的對話保持私人
- 機器人號碼：AI 處理這些通訊，並設有適當的邊界

### 唯讀模式 (透過沙盒與工具)

您可以透過結合以下方式建構唯讀設定檔：

- `agents.defaults.sandbox.workspaceAccess: "ro"` (或 `"none"` 以不存取工作區)
- 封鎖 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允許/拒絕清單。

額外的強化選項：

- `tools.exec.applyPatch.workspaceOnly: true` (預設值)：確保 `apply_patch` 即使在關閉沙盒時，也無法在工作區目錄之外寫入/刪除。僅在您有意讓 `apply_patch` 接觸工作區外的檔案時，才設定為 `false`。
- `tools.fs.workspaceOnly: true` (選用)：將 `read`/`write`/`edit`/`apply_patch` 路徑和原生提示圖片自動載入路徑限制在工作區目錄內 (如果您目前允許絕對路徑並且想要單一防護措施，這很有用)。
- 保持檔案系統根目錄狹窄：避免為代理工作區/沙盒工作區設定寬泛的根目錄（例如您的家目錄）。寬泛的根目錄可能會將敏感的本機檔案（例如 `~/.openclaw` 下的狀態/設定）暴露給檔案系統工具。

### 安全基準 (複製/貼上)

一個「安全預設」設定，能保持 Gateway 私有、需要私訊配對，並避免始終開啟的群組機器人：

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

如果您也希望「預設更安全」的工具執行，請為任何非擁有者的代理程式新增沙箱 + 拒絕危險工具（範例見下方「Per-agent access profiles」）。

針對聊天驅動代理程式輪次的內建基準：非擁有者傳送者無法使用 `cron` 或 `gateway` 工具。

## 沙箱機制（推薦）

專屬文件：[沙箱機制](/zh-Hant/gateway/sandboxing)

兩種互補的方法：

- **在 Docker 中執行完整的 Gateway**（容器邊界）：[Docker](/zh-Hant/install/docker)
- **工具沙箱**（`agents.defaults.sandbox`，主機 Gateway + 沙箱隔離工具；Docker 為預設後端）：[沙箱機制](/zh-Hant/gateway/sandboxing)

<Note>若要防止跨代理程式存取，請將 `agents.defaults.sandbox.scope` 保持為 `"agent"`（預設）或 `"session"` 以實施更嚴格的各工作階段隔離。`scope: "shared"` 使用單一容器或工作區。</Note>

此外，也請考量沙箱內的代理程式工作區存取權：

- `agents.defaults.sandbox.workspaceAccess: "none"`（預設）使代理程式工作區保持禁止存取；工具會對 `~/.openclaw/sandboxes` 下的沙箱工作區執行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 會以唯讀方式將代理程式工作區掛載於 `/agent`（停用 `write`/`edit`/`apply_patch`）
- `agents.defaults.sandbox.workspaceAccess: "rw"` 會以讀寫方式將代理程式工作區掛載於 `/workspace`
- 額外的 `sandbox.docker.binds` 會根據正規化與正準化的來源路徑進行驗證。若父層符號連結技巧或正準家目錄別名解析至被阻擋的根目錄（例如 `/etc`、`/var/run` 或 OS 家目錄下的憑證目錄），仍會在失敗時封閉存取。

<Warning>`tools.elevated` 是在沙箱外運行 exec 的全域基準緊急出口。有效主機預設為 `gateway`，當 exec 目標設定為 `node` 時則為 `node`。請嚴格控制 `tools.elevated.allowFrom`，不要對陌生人啟用它。您可以透過 `agents.list[].tools.elevated` 進一步限制各個代理程式的提升權限。請參閱 [Elevated mode](/zh-Hant/tools/elevated)。</Warning>

### 子代理程式委派防護措施

如果您允許會話工具，請將委派的子代理程式執行視為另一個邊界決策：

- 除非代理程式確實需要委派，否則拒絕 `sessions_spawn`。
- 請將 `agents.defaults.subagents.allowAgents` 和任何針對各個代理程式的 `agents.list[].subagents.allowAgents` 覆蓋設定限制在已知安全的目標代理程式上。
- 對於任何必須保持在沙箱內的工作流程，請使用 `sandbox: "require"` 呼叫 `sessions_spawn`（預設為 `inherit`）。
- 當目標子執行時期未處於沙箱中時，`sandbox: "require"` 會快速失敗。

## 瀏覽器控制風險

啟用瀏覽器控制賦予模型驅動真實瀏覽器的能力。
如果該瀏覽器設定檔已包含登入階段，模型就可以
存取這些帳號和資料。請將瀏覽器設定檔視為 **敏感狀態**：

- 最好為代理程式使用專用的設定檔（預設的 `openclaw` 設定檔）。
- 避免將代理程式指向您的個人日常使用設定檔。
- 除非您信任它們，否則請對沙箱化的代理程式停用主機瀏覽器控制。
- 獨立的回環瀏覽器控制 API 僅支援共用秘密驗證
  (gateway token bearer auth 或 gateway password)。它不使用
  trusted-proxy 或 Tailscale Serve 身分標頭。
- 將瀏覽器下載內容視為不受信任的輸入；最好使用隔離的下載目錄。
- 如果可能的話，請在代理程式設定檔中停用瀏覽器同步/密碼管理器（以減少爆炸半徑）。
- 對於遠端閘道，請假設「瀏覽器控制」等同於對該設定檔可存取之任何內容的「操作員存取權」。
- 請將 Gateway 和節點主機限制為僅透過 tailnet 存取；避免將瀏覽器控制埠暴露到 LAN 或公開網際網路。
- 當您不需要時，請停用瀏覽器代理路由 (`gateway.nodes.browser.mode="off"`)。
- Chrome MCP 現有工作階段模式並**非**「更安全」；它可以在該主機 Chrome 設定檔能存取的任何地方以您的身份執行操作。

### 瀏覽器 SSRF 政策 (預設為嚴格模式)

OpenClaw 的瀏覽器導航政策預設為嚴格模式：私人/內部目的地會保持封鎖，除非您明確選擇加入。

- 預設值：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未設定，因此瀏覽器導航會保持封鎖私人/內部/特殊用途的目的地。
- 舊版別名：為了相容性，`browser.ssrfPolicy.allowPrivateNetwork` 仍被接受。
- 選擇加入模式：設定 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允許私人/內部/特殊用途的目的地。
- 在嚴格模式下，使用 `hostnameAllowlist` (如 `*.example.com` 的模式) 和 `allowedHostnames` (確切的主機例外，包括像 `localhost` 這樣的被封鎖名稱) 作為明確的例外。
- 導航會在請求前檢查，並在導航後對最終的 `http(s)` URL 進行盡力檢查，以減少基於重新導行的樞軸攻擊。

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

## 每個代理的存取設定檔 (多代理)

使用多代理路由時，每個代理都可以有自己的沙箱 + 工具政策：
使用此功能為每個代理提供 **完整存取**、**唯讀** 或 **禁止存取**。
請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解完整細節
和優先順序規則。

常見使用案例：

- 個人代理：完整存取，無沙箱
- 家庭/工作代理：沙箱化 + 唯讀工具
- 公開代理：沙箱化 + 無檔案系統/Shell 工具

### 範例：完整存取 (無沙箱)

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

### 範例：無檔案系統/Shell 存取 (允許提供者訊息傳遞)

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

## 事件應變

如果您的 AI 做了錯事：

### 遏制

1. **停止它：** 停止 macOS 應用程式 (如果它監督 Gateway) 或終止您的 `openclaw gateway` 程序。
2. **關閉暴露：** 設定 `gateway.bind: "loopback"` (或停用 Tailscale Funnel/Serve) 直到您了解發生了什麼事。
3. **凍結存取：** 將有風險的私訊/群組切換到 `dmPolicy: "disabled"` / 要求提及，並移除 `"*"` 允許所有項目 (如果您設有的話)。

### 輪換（如果洩露了機密資訊，請假設已遭入侵）

1. 輪換 Gateway 驗證（`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`）並重新啟動。
2. 在所有可呼叫 Gateway 的機器上輪換遠端用戶端機密（`gateway.remote.token` / `.password`）。
3. 輪換供應商/API 憑證（WhatsApp 憑證、Slack/Discord token、`auth-profiles.json` 中的模型/API 金鑰，以及使用時的加密機密 payload 值）。

### 稽核

1. 檢查 Gateway 日誌：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 檢閱相關的對話紀錄：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 檢閱最近的設定變更（任何可能擴大存取權限的項目：`gateway.bind`、`gateway.auth`、dm/group 政策、`tools.elevated`、外掛程式變更）。
4. 重新執行 `openclaw security audit --deep` 並確認關鍵發現已解決。

### 蒐集報告資料

- 時間戳記、Gateway 主機作業系統 + OpenClaw 版本
- 對話紀錄 + 簡短的日誌尾部（經過遮罩後）
- 攻擊者傳送的內容 + Agent 執行的動作
- Gateway 是否暴露於回環位址之外（LAN/Tailscale Funnel/Serve）

## 使用 detect-secrets 掃描機密

CI 在 `secrets` 工作中執行 `detect-secrets` pre-commit hook。
推送到 `main` 時總是會執行全檔案掃描。Pull requests 在有基礎提交時會使用變更檔案快速路徑，否則會退回全檔案掃描。
如果失敗，表示有新的候選項目尚未加入基線。

### 如果 CI 失敗

1. 在本地重現：

   ```bash
   pre-commit run --all-files detect-secrets
   ```

2. 了解這些工具：
   - pre-commit 中的 `detect-secrets` 會使用儲存庫的基線
     和排除項目來執行 `detect-secrets-hook`。
   - `detect-secrets audit` 會開啟互動式檢閱，將每個基線
     項目標記為真實或誤報。
3. 對於真實機密：輪換/移除它們，然後重新執行掃描以更新基線。
4. 對於誤報：執行互動式稽核並將其標記為誤報：

   ```bash
   detect-secrets audit .secrets.baseline
   ```

5. 如果您需要新增排除項，請將其新增至 `.detect-secrets.cfg`，並使用匹配的 `--exclude-files` / `--exclude-lines` 標誌重新產生
   基準（設定檔
   僅供參考；detect-secrets 不會自動讀取它）。

一旦更新後的 `.secrets.baseline` 反映了預期狀態，請將其提交。

## 回報安全問題

在 OpenClaw 中發現了漏洞？請負責任地回報：

1. Email: [security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修復前請勿公開發布
3. 我們會記載您的貢獻（除非您希望保持匿名）
