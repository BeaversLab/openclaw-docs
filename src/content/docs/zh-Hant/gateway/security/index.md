---
summary: "執行具備 Shell 存取權限的 AI 閘道時的安全性考量與威脅模型"
read_when:
  - Adding features that widen access or automation
title: "安全性"
---

# 安全性

<Warning>**個人助理信任模型：** 此指南假設每個閘道有一個可信操作員邊界（單一使用者/個人助理模型）。 OpenClaw **並非**針對多個共享同一個代理程式/閘道的惡意使用者的敵對多租戶安全邊界。 如果您需要混合信任或惡意使用者操作，請拆分信任邊界（分離的閘道 + 憑證，理想情況下是分離的 OS 使用者/主機）。</Warning>

**本頁內容：** [信任模型](#scope-first-personal-assistant-security-model) | [快速審計](#quick-check-openclaw-security-audit) | [加固基準](#hardened-baseline-in-60-seconds) | [DM 存取模型](#dm-access-model-pairing-allowlist-open-disabled) | [配置加固](#configuration-hardening-examples) | [事件回應](#incident-response)

## 優先確定範圍：個人助理安全模型

OpenClaw 安全指南假設採用 **個人助理** 部署：每個閘道一個可信操作員邊界，可能有多個代理程式。

- 支援的安全態勢：每個閘道一個使用者/信任邊界（每個邊界最好有一個 OS 使用者/主機/VPS）。
- 不支援的安全邊界：一個由互不信任或惡意使用者共享的閘道/代理程式。
- 如果需要惡意使用者隔離，請按信任邊界拆分（分離的閘道 + 憑證，理想情況下是分離的 OS 使用者/主機）。
- 如果多個不受信任的使用者可以向一個啟用工具的代理程式發送訊息，請將其視為共享該代理程式的相同委派工具權限。

本頁說明 **在該模型內** 的強化措施。它不聲稱在單一共享閘道上提供敵對多租戶隔離。

## 快速檢查：`openclaw security audit`

另請參閱：[形式化驗證（安全性模型）](/zh-Hant/security/formal-verification)

定期執行此操作（特別是在更改組態或暴露網路表面之後）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 保持刻意的狹窄：它將常見的開放群組原則翻轉為允許清單，還原 `logging.redactSensitive: "tools"`，加強狀態/設定/包含檔案的權限，並且在 Windows 上執行時使用 Windows ACL 重設而非 POSIX `chmod`。

它會標記常見的陷阱（Gateway 驗證暴露、瀏覽器控制暴露、提升的允許清單、檔案系統權限、寬鬆的執行核准，以及開放通道工具暴露）。

OpenClaw 既是一個產品也是一個實驗：您正在將前沿模型的行為連接到真實的訊息介面和真實的工具。**沒有所謂的「完美安全」設定。** 目標是要慎重考量：

- 誰可以與您的機器人交談
- 允許機器人在何處運作
- 機器人可以接觸什麼

從仍然有效的最小存取權限開始，然後隨著您建立信心再逐步擴大。

### 部署與主機信任

OpenClaw 假設主機和設定邊界是可信賴的：

- 如果某人可以修改 Gateway 主機狀態/設定（`~/.openclaw`，包括 `openclaw.json`），請將其視為受信任的操作員。
- 為多個彼此不可信/敵對的操作者執行一個 Gateway **並不是一個建議的設定**。
- 對於混合信任團隊，請使用不同的 Gateway 分割信任邊界（或至少使用不同的 OS 使用者/主機）。
- 建議的預設值：每台機器/主機（或 VPS）一個使用者，該使用者一個 gateway，以及該 gateway 中一個或多個 agent。
- 在一個 Gateway 實例內部，已驗證的操作者存取是一個可信賴的控制平面角色，而不是每個使用者的租用戶角色。
- 會話識別碼（`sessionKey`、會話 ID、標籤）是路由選擇器，而非授權權杖。
- 如果有多人可以傳送訊息給同一個已啟用工具的代理程式，每個人都可以控制同一組權限。每個使用者的會話/記憶體隔離有助於保護隱私，但無法將共享代理程式轉換為每個使用者的主機授權。

### 共享 Slack 工作區：真正的風險

如果「Slack 中的每個人都可以傳送訊息給機器人」，核心風險在於委派的工具權限：

- 任何允許的傳送者都可以在代理程式原則內引發工具呼叫（`exec`、瀏覽器、網路/檔案工具）；
- 來自一個傳送者的提示/內容注入可能會導致影響共享狀態、裝置或輸出的操作；
- 如果一個共享代理程式擁有敏感的憑證/檔案，任何允許的傳送者都可能透過工具使用驅動資料外洩。

對於團隊工作流程，請使用具有最少工具的獨立代理程式/閘道；將個人資料代理程式設為私有。

### 公司共享的代理程式：可接受的模式

當使用該代理程式的每個人都在同一個信任邊界內（例如一個公司團隊），並且該代理程式嚴格限於業務範圍時，這是可以接受的。

- 在專用的機器/VM/容器上運行它；
- 對於該運行時，使用專用的作業系統使用者 + 專用的瀏覽器/設定檔/帳戶；
- 不要將該運行時登入到個人 Apple/Google 帳戶或個人密碼管理器/瀏覽器設定檔。

如果您在同一個運行時混合使用個人與公司身分，您將崩潰這種隔離並增加個人資料暴露的風險。

## 閘道與節點信任概念

將閘道和節點視為一個操作員信任網域，具有不同的角色：

- **Gateway** 是控制平面和原則介面（`gateway.auth`、工具原則、路由）。
- **節點**是與該閘道配對的遠端執行表面（指令、裝置操作、主機本機功能）。
- 經過閘道驗證的呼叫者在閘道範圍內受信任。配對後，節點操作即為該節點上受信任的操作員操作。
- `sessionKey` 是路由/情境選擇，而非每個使用者的驗證。
- 執行核准（允許清單 + 詢問）是操作員意圖的防護措施，而非惡意多租戶隔離。
- OpenClaw 針對受信任單一操作員設定的產品預設值是，允許在 `gateway`/`node` 上進行主機執行而無需核准提示（`security="full"`，`ask="off"`，除非您加以收緊）。該預設值是有意的 UX 設計，而非本身即為漏洞。
- 執行批准綁定確切的請求上下文和盡力而為的直接本地檔案操作數；它們在語義上不對每個運行時/直譯器載入器路徑進行建模。請使用沙箱和主機隔離來實現強大的邊界。

如果您需要對抗性用戶隔離，請按作業系統用戶/主機拆分信任邊界，並運行獨立的閘道。

## 信任邊界矩陣

在分類風險時，請將此作為快速模型：

| 邊界或控制                                                | 含義                         | 常見誤讀                                         |
| --------------------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| `gateway.auth` (token/password/trusted-proxy/device auth) | 向閘道 API 驗證呼叫者        | 「需要在每個幀上進行每條訊息簽名才能保證安全」   |
| `sessionKey`                                              | 用於上下文/會話選擇的路由鍵  | 「會話鍵是用戶驗證邊界」                         |
| 提示/內容防護機制                                         | 降低模型濫用風險             | 「僅提示注入證明驗證繞過」                       |
| `canvas.eval` / browser evaluate                          | 啟用時的有意操作員功能       | 「在此信任模型中，任何 JS 評估原語自動構成漏洞」 |
| 本機 TUI `!` shell                                        | 操作員顯式觸發的本地執行     | 「本地 shell 便捷命令是遠端注入」                |
| 節點配對和節點命令                                        | 配對裝置上的操作員級遠端執行 | 「遠端裝置控制預設應視為不受信任的用戶存取」     |

## 非設計漏洞

這些模式經常被回報，除非顯示了真正的邊界繞過，否則通常會被標記為不採取行動：

- 僅提示注入鏈而無策略/驗證/沙箱繞過。
- 假設在一個共享主機/配置上進行對抗性多租戶操作的主張。
- 在共享 Gateway 設定中，將正常操作員讀取路徑存取（例如 `sessions.list`/`sessions.preview`/`chat.history`）分類為 IDOR 的說法。
- 僅限本地主機的部署發現（例如僅環回閘道上的 HSTS）。
- 針對此存儲庫中不存在的入站路徑，有關 Discord 入站 Webhook 簽章的研究發現。
- 那些將節點配對元資料視為 `system.run` 的隱藏第二層指令批准機制的報告，而實際的執行邊界仍然是閘道的全域節點指令原則加上節點自己的執行批准。
- 「缺少每使用者授權」的發現，將 `sessionKey` 視為驗證權杖。

## 研究人員預檢查清單

在開啟 GHSA 之前，請驗證所有以下事項：

1. 在最新的 `main` 或最新版本上仍然可以重現。
2. 報告包含確切的路徑（`file`、函式、行數範圍）和測試的版本/提交。
3. 影響範圍跨越了記錄在案的信任邊界（不僅僅是提示詞注入）。
4. 聲明未列於[範圍之外](https://github.com/openclaw/openclaw/blob/main/SECURITY.md#out-of-scope)。
5. 現有的安全公告已檢查過重複項（適用時重複使用正式的 GHSA）。
6. 部署假設是明確的（迴路/本機與對外暴露，受信任與不受信任的操作者）。

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

這會將 Gateway 限制為僅限本機、隔離私人訊息，並預設停用控制平面/執行時期工具。

## 共用收件匣快速規則

如果超過一個人可以傳送私人訊息給您的機器人：

- 設定 `session.dmScope: "per-channel-peer"`（或是多帳號通道的 `"per-account-channel-peer"`）。
- 保持 `dmPolicy: "pairing"` 或嚴格的允許清單。
- 切勿將共用的私人訊息與廣泛的工具存取權結合使用。
- 這可以強化協作/共用收件匣，但並非設計為當使用者共用主機/設定檔寫入權限時的惡意共同租用戶隔離。

## 情境可見性模型

OpenClaw 區分了兩個概念：

- **觸發授權**：誰可以觸發代理程式（`dmPolicy`、`groupPolicy`、允許清單、提及閘門）。
- **情境可見性**：哪些補充情境會被注入到模型輸入中（回覆內文、引用文字、執行緒歷史、轉發的元數據）。

允許清單控制觸發和指令授權。`contextVisibility` 設定控制如何過濾補充背景資訊（引用的回覆、討論串根目錄、擷取的歷史紀錄）：

- `contextVisibility: "all"`（預設值）保持接收到的補充背景資訊。
- `contextVisibility: "allowlist"` 將補充背景資訊過濾為由有效允許清單檢查所允許的發送者。
- `contextVisibility: "allowlist_quote"` 的行為類似 `allowlist`，但仍保留一個明確的引用回覆。

針對每個頻道或每個房間/對話設定 `contextVisibility`。有關設定詳情，請參閱[群組聊天](/zh-Hant/channels/groups#context-visibility-and-allowlists)。

諮詢分類指導：

- 僅顯示「模型可以看到來自非允許清單發送者的引用或歷史文字」的主張，是可透過 `contextVisibility` 解決的加固性發現，本身並非授權或沙箱邊界繞過。
- 要產生安全影響，報告仍需展示已證實的信任邊界繞過（身份驗證、原則、沙箱、審批或其他記錄在案的邊界）。

## 稽核檢查項目（高層次）

- **輸入存取**（DM 原則、群組原則、允許清單）：陌生人能否觸發機器人？
- **工具波及範圍** (elevated tools + open rooms)：提示注入是否可能轉化為 shell/檔案/網路動作？
- **執行批准漂移**（`security=full`、`autoAllowSkills`、沒有 `strictInlineEval` 的解譯器允許清單）：主機執行防護措施是否仍在執行您認為它們在執行的任務？
  - `security="full"` 是一個廣泛的姿態警告，而非錯誤的證明。這是受信任個人助理設定所選擇的預設值；僅在您的威脅模型需要批准或允許清單防護措施時才加以收緊。
- **網路暴露**（Gateway 繫結/身份驗證、Tailscale Serve/Funnel、弱/短身份驗證權杖）。
- **瀏覽器控制暴露**（遠端節點、中繼連接埠、遠端 CDP 端點）。
- **本機磁碟衛生**（權限、符號連結、設定包含、「已同步資料夾」路徑）。
- **外掛程式**（外掛程式載入時無需明確的白名單）。
- **策略漂移/錯誤配置**（已設定 sandbox docker 設定但沙箱模式已關閉；`gateway.nodes.denyCommands` 模式無效，因為比對僅限於精確的指令名稱（例如 `system.run`）且不檢查 shell 文字；危險的 `gateway.nodes.allowCommands` 項目；全域 `tools.profile="minimal"` 被每個代理程式的設定檔覆寫；在寬鬆的工具策略下可存取外掛程式擁有的工具）。
- **執行時期望漂移**（例如假設隱式執行仍意味著 `sandbox`，而 `tools.exec.host` 現在預設為 `auto`，或者在沙箱模式關閉的情況下明確設定 `tools.exec.host="sandbox"`）。
- **模型衛生**（當配置的模型看起來過舊時發出警告；這不是硬性阻擋）。

如果您執行 `--deep`，OpenClaw 也會嘗試盡最大努力進行即時 Gateway 探測。

## 憑證儲存對應圖

在稽核存取或決定要備份什麼時使用此項：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`（僅限常規檔案；拒絕符號連結）
- **Discord 機器人權杖**：config/env 或 SecretRef（env/file/exec 提供者）
- **Slack tokens**：config/env (`channels.slack.*`)
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（預設帳戶）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非預設帳戶）
- **Model auth profiles**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **基於檔案的機密負載（可選）**：`~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**：`~/.openclaw/credentials/oauth.json`

## 安全性稽核檢查清單

當稽核列印結果時，請將此視為優先順序：

1. **任何「公開」+ 已啟用工具**：先鎖定 DM/群組（配對/允許清單），然後收緊工具原則/沙箱。
2. **公開網路暴露**（LAN 綁定、Funnel、缺少驗證）：立即修復。
3. **瀏覽器控制遠端暴露**：將其視為操作員存取（僅限 tailnet、刻意配對節點、避免公開暴露）。
4. **權限**：確保 state/config/credentials/auth 不是群組/全世界可讀的。
5. **外掛程式**：僅載入您明確信任的內容。
6. **模型選擇**：對於任何具有工具的機器人，優先選擇經過指令強化的現代模型。

## 安全稽核術語表

高信號 `checkId` 值，您最有可能在實際部署中看到這些值（未窮盡列出）：

| `checkId`                                                     | 嚴重性        | 重要性                                                                    | 主要修復鍵/路徑                                                                                   | 自動修復 |
| ------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| `fs.state_dir.perms_world_writable`                           | 嚴重          | 其他使用者/處理程序可以修改完整的 OpenClaw 狀態                           | `~/.openclaw` 上的檔案系統權限                                                                    | 是       |
| `fs.state_dir.perms_group_writable`                           | 警告          | 群組使用者可以修改完整的 OpenClaw 狀態                                    | `~/.openclaw` 上的檔案系統權限                                                                    | 是       |
| `fs.state_dir.perms_readable`                                 | 警告          | 狀態目錄可被其他人讀取                                                    | `~/.openclaw` 上的檔案系統權限                                                                    | 是       |
| `fs.state_dir.symlink`                                        | 警告          | 狀態目錄目標成為另一個信任邊界                                            | 狀態目錄檔案系統佈局                                                                              | 否       |
| `fs.config.perms_writable`                                    | 關鍵          | 其他人可以變更驗證/工具原則/配置                                          | `~/.openclaw/openclaw.json` 上的檔案系統權限                                                      | 是       |
| `fs.config.symlink`                                           | 警告          | 不支援寫入符號連結的設定檔，並且會增加另一個信任邊界                      | 替換為一般設定檔或將 `OPENCLAW_CONFIG_PATH` 指向真正的檔案                                        | 否       |
| `fs.config.perms_group_readable`                              | 警告          | 群組使用者可以讀取配置權杖/設定                                           | 配置檔案上的檔案系統權限                                                                          | 是       |
| `fs.config.perms_world_readable`                              | 關鍵          | 配置可能暴露權杖/設定                                                     | 配置檔案上的檔案系統權限                                                                          | 是       |
| `fs.config_include.perms_writable`                            | 關鍵          | 配置包含檔案可被其他人修改                                                | 引用自 `openclaw.json` 的 include-file 權限                                                       | 是       |
| `fs.config_include.perms_group_readable`                      | 警告          | 群組使用者可以讀取包含的機密/設定                                         | 引用自 `openclaw.json` 的 include-file 權限                                                       | 是       |
| `fs.config_include.perms_world_readable`                      | 關鍵          | 包含的機密/設定可被任何人讀取                                             | 引用自 `openclaw.json` 的 include-file 權限                                                       | 是       |
| `fs.auth_profiles.perms_writable`                             | 關鍵          | 其他人可以插入或替換已儲存的模型憑證                                      | `agents/<agentId>/agent/auth-profiles.json` 權限                                                  | 是       |
| `fs.auth_profiles.perms_readable`                             | 警告          | 其他人可以讀取 API 金鑰和 OAuth 權杖                                      | `agents/<agentId>/agent/auth-profiles.json` 權限                                                  | 是       |
| `fs.credentials_dir.perms_writable`                           | 關鍵          | 其他人可以修改通道配對/憑證狀態                                           | `~/.openclaw/credentials` 上的檔案系統權限                                                        | 是       |
| `fs.credentials_dir.perms_readable`                           | 警告          | 其他人可以讀取頻道憑證狀態                                                | `~/.openclaw/credentials` 上的檔案系統權限                                                        | 是       |
| `fs.sessions_store.perms_readable`                            | 警告          | 其他人可以讀取會話紀錄/元數據                                             | 會話儲存權限                                                                                      | 是       |
| `fs.log_file.perms_readable`                                  | 警告          | 其他人可以讀取已編輯但仍敏感的日誌                                        | 閘道日誌檔案權限                                                                                  | 是       |
| `fs.synced_dir`                                               | 警告          | iCloud/Dropbox/Drive 中的狀態/配置擴大了權杖/紀錄的暴露風險               | 將配置/狀態移出同步資料夾                                                                         | 否       |
| `gateway.bind_no_auth`                                        | 嚴重          | 無共用金鑰的遠端綁定                                                      | `gateway.bind`、`gateway.auth.*`                                                                  | 否       |
| `gateway.loopback_no_auth`                                    | 嚴重          | 反向代理的回送可能變為未驗證                                              | `gateway.auth.*`、proxy setup                                                                     | 否       |
| `gateway.trusted_proxies_missing`                             | 警告          | 反向代理標頭存在但不受信任                                                | `gateway.trustedProxies`                                                                          | 否       |
| `gateway.http.no_auth`                                        | 警告/嚴重     | 可透過 `auth.mode="none"` 存取的 Gateway HTTP API                         | `gateway.auth.mode`、`gateway.http.endpoints.*`                                                   | 否       |
| `gateway.http.session_key_override_enabled`                   | 資訊          | HTTP API 呼叫者可以覆寫 `sessionKey`                                      | `gateway.http.allowSessionKeyOverride`                                                            | 否       |
| `gateway.tools_invoke_http.dangerous_allow`                   | 警告/嚴重     | 透過 HTTP API 重新啟用危險工具                                            | `gateway.tools.allow`                                                                             | 否       |
| `gateway.nodes.allow_commands_dangerous`                      | 警告/嚴重     | 啟用高影響節點指令 (相機/螢幕/連絡人/行事曆/SMS)                          | `gateway.nodes.allowCommands`                                                                     | 否       |
| `gateway.nodes.deny_commands_ineffective`                     | 警告          | 類似模式的拒絕條目不符合 shell 文字或群組                                 | `gateway.nodes.denyCommands`                                                                      | 否       |
| `gateway.tailscale_funnel`                                    | 嚴重          | 公開網際網路暴露                                                          | `gateway.tailscale.mode`                                                                          | 否       |
| `gateway.tailscale_serve`                                     | 資訊          | 透過 Serve 啟用 Tailnet 暴露                                              | `gateway.tailscale.mode`                                                                          | 否       |
| `gateway.control_ui.allowed_origins_required`                 | 嚴重          | 非回送控制 UI 無明確瀏覽器來源允許清單                                    | `gateway.controlUi.allowedOrigins`                                                                | 否       |
| `gateway.control_ui.allowed_origins_wildcard`                 | 警告/嚴重     | `allowedOrigins=["*"]` 會停用瀏覽器來源允許清單                           | `gateway.controlUi.allowedOrigins`                                                                | 否       |
| `gateway.control_ui.host_header_origin_fallback`              | 警告/嚴重     | 啟用 Host 標頭來源後援（DNS 重新綁定強化降級）                            | `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`                                      | 否       |
| `gateway.control_ui.insecure_auth`                            | warn          | 已啟用不安全身份驗證相容性切換                                            | `gateway.controlUi.allowInsecureAuth`                                                             | 否       |
| `gateway.control_ui.device_auth_disabled`                     | critical      | 停用裝置身份檢查                                                          | `gateway.controlUi.dangerouslyDisableDeviceAuth`                                                  | 否       |
| `gateway.real_ip_fallback_enabled`                            | warn/critical | 信任 `X-Real-IP` 後備機制可能會因 Proxy 設定錯誤而啟用來源 IP 欺騙        | `gateway.allowRealIpFallback`、`gateway.trustedProxies`                                           | 否       |
| `gateway.token_too_short`                                     | warn          | 短共享權杖更容易遭受暴力破解                                              | `gateway.auth.token`                                                                              | 否       |
| `gateway.auth_no_rate_limit`                                  | warn          | 公開未具速率限制的身份驗證會增加暴力破解風險                              | `gateway.auth.rateLimit`                                                                          | 否       |
| `gateway.trusted_proxy_auth`                                  | critical      | Proxy 身份現已成為身份驗證邊界                                            | `gateway.auth.mode="trusted-proxy"`                                                               | 否       |
| `gateway.trusted_proxy_no_proxies`                            | critical      | 未設定信任 Proxy IP 的信任 Proxy 身份驗證並不安全                         | `gateway.trustedProxies`                                                                          | no       |
| `gateway.trusted_proxy_no_user_header`                        | critical      | 信任 Proxy 身份驗證無法安全解析使用者身份                                 | `gateway.auth.trustedProxy.userHeader`                                                            | no       |
| `gateway.trusted_proxy_no_allowlist`                          | warn          | 信任 Proxy 身份驗證接受任何經過驗證的上游使用者                           | `gateway.auth.trustedProxy.allowUsers`                                                            | no       |
| `gateway.probe_auth_secretref_unavailable`                    | warn          | 深度探查無法在此指令路徑中解析身份驗證 SecretRefs                         | deep-probe auth source / SecretRef availability                                                   | no       |
| `gateway.probe_failed`                                        | warn/critical | 即時 Gateway 探查失敗                                                     | gateway reachability/auth                                                                         | no       |
| `discovery.mdns_full_mode`                                    | warn/critical | mDNS 完整模式會在本地網路上廣播 `cliPath`/`sshPort` 元資料                | `discovery.mdns.mode`, `gateway.bind`                                                             | no       |
| `config.insecure_or_dangerous_flags`                          | warn          | 已啟用任何不安全/危險的偵錯旗標                                           | 多個金鑰（詳見發現細節）                                                                          | no       |
| `config.secrets.gateway_password_in_config`                   | warn          | Gateway 密碼直接儲存在設定中                                              | `gateway.auth.password`                                                                           | no       |
| `config.secrets.hooks_token_in_config`                        | warn          | Hook 承載令牌直接存儲在設定中                                             | `hooks.token`                                                                                     | 否       |
| `hooks.token_reuse_gateway_token`                             | 嚴重          | Hook 進入令牌也能解鎖 Gateway 身份驗證                                    | `hooks.token`, `gateway.auth.token`                                                               | 否       |
| `hooks.token_too_short`                                       | 警告          | Hook 進入更容易遭受暴力破解                                               | `hooks.token`                                                                                     | 否       |
| `hooks.default_session_key_unset`                             | 警告          | Hook 代理執行會擴散到產生的各個請求會話中                                 | `hooks.defaultSessionKey`                                                                         | 否       |
| `hooks.allowed_agent_ids_unrestricted`                        | 警告/嚴重     | 已驗證的 Hook 呼叫者可以路由到任何已設定的代理                            | `hooks.allowedAgentIds`                                                                           | 否       |
| `hooks.request_session_key_enabled`                           | 警告/嚴重     | 外部呼叫者可以選擇 sessionKey                                             | `hooks.allowRequestSessionKey`                                                                    | 否       |
| `hooks.request_session_key_prefixes_missing`                  | 警告/嚴重     | 對外部會話金鑰的形狀沒有限制                                              | `hooks.allowedSessionKeyPrefixes`                                                                 | 否       |
| `hooks.path_root`                                             | 嚴重          | Hook 路徑為 `/`，使得入口流量更容易發生衝突或錯誤路由                     | `hooks.path`                                                                                      | 否       |
| `hooks.installs_unpinned_npm_specs`                           | 警告          | Hook 安裝記錄未固定在不可變的 npm 規格上                                  | hook install metadata                                                                             | 否       |
| `hooks.installs_missing_integrity`                            | 警告          | Hook 安裝記錄缺乏完整性元數據                                             | hook install metadata                                                                             | 否       |
| `hooks.installs_version_drift`                                | 警告          | Hook 安裝記錄與已安裝的套件不一致                                         | hook install metadata                                                                             | 否       |
| `logging.redact_off`                                          | 警告          | 敏感值洩漏到日誌/狀態中                                                   | `logging.redactSensitive`                                                                         | 是       |
| `browser.control_invalid_config`                              | 警告          | 瀏覽器控制設定在執行時之前無效                                            | `browser.*`                                                                                       | 否       |
| `browser.control_no_auth`                                     | 嚴重          | 瀏覽器控制未經令牌/密碼身份驗證即暴露                                     | `gateway.auth.*`                                                                                  | 否       |
| `browser.remote_cdp_http`                                     | 警告          | 透過純 HTTP 的遠端 CDP 缺乏傳輸加密                                       | 瀏覽器設定檔 `cdpUrl`                                                                             | 否       |
| `browser.remote_cdp_private_host`                             | 警告          | 遠端 CDP 以私人/內部主機為目標                                            | 瀏覽器設定檔 `cdpUrl`, `browser.ssrfPolicy.*`                                                     | 否       |
| `sandbox.docker_config_mode_off`                              | 警告          | Sandbox Docker 設定存在但未啟用                                           | `agents.*.sandbox.mode`                                                                           | no       |
| `sandbox.bind_mount_non_absolute`                             | warn          | 相對 bind 掛載可能會以不可預期的方式解析                                  | `agents.*.sandbox.docker.binds[]`                                                                 | no       |
| `sandbox.dangerous_bind_mount`                                | critical      | Sandbox bind 掛載目標阻擋了系統、憑證或 Docker socket 路徑                | `agents.*.sandbox.docker.binds[]`                                                                 | no       |
| `sandbox.dangerous_network_mode`                              | critical      | Sandbox Docker 網路使用 `host` 或 `container:*` 命名空間加入模式          | `agents.*.sandbox.docker.network`                                                                 | no       |
| `sandbox.dangerous_seccomp_profile`                           | critical      | Sandbox seccomp 設定檔減弱了容器隔離                                      | `agents.*.sandbox.docker.securityOpt`                                                             | no       |
| `sandbox.dangerous_apparmor_profile`                          | critical      | Sandbox AppArmor 設定檔減弱了容器隔離                                     | `agents.*.sandbox.docker.securityOpt`                                                             | no       |
| `sandbox.browser_cdp_bridge_unrestricted`                     | warn          | Sandbox browser bridge 已公開且未限制來源範圍                             | `sandbox.browser.cdpSourceRange`                                                                  | no       |
| `sandbox.browser_container.non_loopback_publish`              | critical      | 現有的瀏覽器容器在非 loopback 介面上發佈 CDP                              | browser sandbox container publish config                                                          | no       |
| `sandbox.browser_container.hash_label_missing`                | warn          | 現有的瀏覽器容器早於目前的 config-hash 標籤                               | `openclaw sandbox recreate --browser --all`                                                       | no       |
| `sandbox.browser_container.hash_epoch_stale`                  | warn          | 現有的瀏覽器容器早於目前的瀏覽器設定紀元                                  | `openclaw sandbox recreate --browser --all`                                                       | no       |
| `tools.exec.host_sandbox_no_sandbox_defaults`                 | warn          | 當沙箱關閉時，`exec host=sandbox` 失效關閉                                | `tools.exec.host`, `agents.defaults.sandbox.mode`                                                 | no       |
| `tools.exec.host_sandbox_no_sandbox_agents`                   | warn          | 每個代理 `exec host=sandbox` 在沙箱關閉時失效關閉                         | `agents.list[].tools.exec.host`, `agents.list[].sandbox.mode`                                     | no       |
| `tools.exec.security_full_configured`                         | warn/critical | 主機執行正在以 `security="full"` 運行                                     | `tools.exec.security`, `agents.list[].tools.exec.security`                                        | no       |
| `tools.exec.auto_allow_skills_enabled`                        | warn          | Exec 核准隱含信任 skill bins                                              | `~/.openclaw/exec-approvals.json`                                                                 | no       |
| `tools.exec.allowlist_interpreter_without_strict_inline_eval` | warn          | 解譯器允許清單允許內聯執行而無需強制重新核准                              | `tools.exec.strictInlineEval`, `agents.list[].tools.exec.strictInlineEval`，執行核准允許列表      | 否       |
| `tools.exec.safe_bins_interpreter_unprofiled`                 | 警告          | `safeBins` 中沒有明確配置檔案的直譯器/執行時 bin 會擴大執行風險           | `tools.exec.safeBins`, `tools.exec.safeBinProfiles`, `agents.list[].tools.exec.*`                 | 否       |
| `tools.exec.safe_bins_broad_behavior`                         | 警告          | `safeBins` 中的廣泛行為工具會削弱低風險 stdin-filter 信任模型             | `tools.exec.safeBins`, `agents.list[].tools.exec.safeBins`                                        | 否       |
| `tools.exec.safe_bin_trusted_dirs_risky`                      | 警告          | `safeBinTrustedDirs` 包含可變或有風險的目錄                               | `tools.exec.safeBinTrustedDirs`, `agents.list[].tools.exec.safeBinTrustedDirs`                    | 否       |
| `skills.workspace.symlink_escape`                             | 警告          | 工作區 `skills/**/SKILL.md` 解析到工作區根目錄之外（符號連結鏈偏移）      | 工作區 `skills/**` 檔案系統狀態                                                                   | 否       |
| `plugins.extensions_no_allowlist`                             | 警告          | 安裝外掛程式時未使用明確的外掛程式允許列表                                | `plugins.allowlist`                                                                               | 否       |
| `plugins.installs_unpinned_npm_specs`                         | 警告          | 外掛安裝記錄未固定至不可變的 npm 規格                                     | 外掛安裝元資料                                                                                    | 否       |
| `plugins.installs_missing_integrity`                          | 警告          | 外掛安裝記錄缺少完整性元資料                                              | 外掛安裝元資料                                                                                    | 否       |
| `plugins.installs_version_drift`                              | 警告          | 外掛安裝記錄與已安裝的套件不一致                                          | 外掛安裝元資料                                                                                    | 否       |
| `plugins.code_safety`                                         | 警告/嚴重     | 外掛程式碼掃描發現可疑或危險的模式                                        | 外掛程式碼 / 安裝來源                                                                             | 否       |
| `plugins.code_safety.entry_path`                              | 警告          | 外掛程式進入路徑指向隱藏或 `node_modules` 位置                            | 外掛程式清單 `entry`                                                                              | 否       |
| `plugins.code_safety.entry_escape`                            | 嚴重          | 外掛進入點逃脫外掛目錄                                                    | 外掛程式清單 `entry`                                                                              | 否       |
| `plugins.code_safety.scan_failed`                             | 警告          | 外掛程式碼掃描無法完成                                                    | 外掛程式路徑 / 掃描環境                                                                           | 否       |
| `skills.code_safety`                                          | 警告/嚴重     | Skill installer metadata/code contains suspicious or dangerous patterns   | skill install source                                                                              | no       |
| `skills.code_safety.scan_failed`                              | warn          | Skill code scan could not complete                                        | skill scan environment                                                                            | no       |
| `security.exposure.open_channels_with_exec`                   | warn/critical | Shared/public rooms can reach exec-enabled agents                         | `channels.*.dmPolicy`, `channels.*.groupPolicy`, `tools.exec.*`, `agents.list[].tools.exec.*`     | no       |
| `security.exposure.open_groups_with_elevated`                 | critical      | Open groups + elevated tools create high-impact prompt-injection paths    | `channels.*.groupPolicy`, `tools.elevated.*`                                                      | no       |
| `security.exposure.open_groups_with_runtime_or_fs`            | critical/warn | Open groups can reach command/file tools without sandbox/workspace guards | `channels.*.groupPolicy`, `tools.profile/deny`, `tools.fs.workspaceOnly`, `agents.*.sandbox.mode` | no       |
| `security.trust_model.multi_user_heuristic`                   | warn          | Config looks multi-user while gateway trust model is personal-assistant   | 分割信任邊界，或共享使用者強化 (`sandbox.mode`, 工具拒絕/工作區範圍)                              | no       |
| `tools.profile_minimal_overridden`                            | warn          | Agent overrides bypass global minimal profile                             | `agents.list[].tools.profile`                                                                     | no       |
| `plugins.tools_reachable_permissive_policy`                   | warn          | Extension tools reachable in permissive contexts                          | `tools.profile` + 工具允許/拒絕                                                                   | no       |
| `models.legacy`                                               | warn          | Legacy model families are still configured                                | model selection                                                                                   | no       |
| `models.weak_tier`                                            | warn          | Configured models are below current recommended tiers                     | model selection                                                                                   | no       |
| `models.small_params`                                         | critical/info | Small models + unsafe tool surfaces raise injection risk                  | model choice + sandbox/tool policy                                                                | no       |
| `summary.attack_surface`                                      | info          | Roll-up summary of auth, channel, tool, and exposure posture              | multiple keys (see finding detail)                                                                | no       |

## Control UI over HTTP

控制 UI 需要 **安全上下文** (HTTPS 或 localhost) 才能產生裝置身分。`gateway.controlUi.allowInsecureAuth` 是一個本機相容性切換開關：

- On localhost, it allows Control UI auth without device identity when the page
  is loaded over non-secure HTTP.
- 它不會繞過配對檢查。
- 它不會放寬遠端（非本地主機）裝置身分識別的要求。

優先使用 HTTPS (Tailscale Serve) 或在 `127.0.0.1` 上開啟 UI。

僅限緊急情況 (break-glass)，`gateway.controlUi.dangerouslyDisableDeviceAuth`
會完全停用裝置身分檢查。這是一個嚴重的安全性降級；
除非您正在主動偵錯並能快速還原，否則請保持關閉。

與這些危險的標誌分開來看，成功的 `gateway.auth.mode: "trusted-proxy"`
可以允許沒有裝置身分的 **操作員** 控制UI 會話。這是一個
刻意的身份驗證模式行為，而不是 `allowInsecureAuth` 的捷徑，且它
仍然不適用於節點角色的控制 UI 會話。

當啟用此設定時，`openclaw security audit` 會發出警告。

## 不安全或危險旗標摘要

當
已知的不安全/危險偵錯開關啟用時，`openclaw security audit` 包含 `config.insecure_or_dangerous_flags`。該檢查目前
彙總了：

- `gateway.controlUi.allowInsecureAuth=true`
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
- `hooks.gmail.allowUnsafeExternalContent=true`
- `hooks.mappings[<index>].allowUnsafeExternalContent=true`
- `tools.exec.applyPatch.workspaceOnly=false`
- `plugins.entries.acpx.config.permissionMode=approve-all`

OpenClaw 設定架構中定義的完整 `dangerous*` / `dangerously*` 設定鍵值：

- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
- `gateway.controlUi.dangerouslyDisableDeviceAuth`
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `channels.discord.dangerouslyAllowNameMatching`
- `channels.discord.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.slack.dangerouslyAllowNameMatching`
- `channels.slack.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.googlechat.dangerouslyAllowNameMatching`
- `channels.googlechat.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.msteams.dangerouslyAllowNameMatching`
- `channels.synology-chat.dangerouslyAllowNameMatching` (plugin channel)
- `channels.synology-chat.accounts.<accountId>.dangerouslyAllowNameMatching` (plugin channel)
- `channels.synology-chat.dangerouslyAllowInheritedWebhookPath` (plugin channel)
- `channels.zalouser.dangerouslyAllowNameMatching` (plugin channel)
- `channels.zalouser.accounts.<accountId>.dangerouslyAllowNameMatching` (plugin channel)
- `channels.irc.dangerouslyAllowNameMatching` (plugin channel)
- `channels.irc.accounts.<accountId>.dangerouslyAllowNameMatching` (plugin channel)
- `channels.mattermost.dangerouslyAllowNameMatching` (plugin channel)
- `channels.mattermost.accounts.<accountId>.dangerouslyAllowNameMatching` (plugin channel)
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`
- `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`
- `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
- `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowExternalBindSources`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

## 反向代理設定

如果您在反向代理（nginx、Caddy、Traefik 等）後方執行 Gateway，請設定 `gateway.trustedProxies` 以正確處理轉送用戶端 IP。

當 Gateway 從**不**在 `trustedProxies` 中的位址偵測到 Proxy 標頭時，它將**不**會將連線視為本機用戶端。如果已停用 Gateway 驗證，這些連線將被拒絕。這可防止驗證繞過，否則 Proxy 連線會顯示來自本機並獲得自動信任。

`gateway.trustedProxies` 也會提供給 `gateway.auth.mode: "trusted-proxy"` 使用，但該驗證模式更嚴格：

- trusted-proxy 驗證會**在回環來源代理上失敗關閉**
- 相同主機的回送反向代理仍可使用 `gateway.trustedProxies` 進行本機用戶端偵測和轉送 IP 處理
- 對於相同主機的回送反向代理，請使用 Token/密碼驗證，而不是 `gateway.auth.mode: "trusted-proxy"`

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

當設定 `trustedProxies` 時，Gateway 會使用 `X-Forwarded-For` 來判斷客戶端 IP。除非明確設定 `gateway.allowRealIpFallback: true`，否則預設會忽略 `X-Real-IP`。

良好的反向代理行為（覆寫傳入的轉發標頭）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良的反向代理行為（附加/保留不受信任的轉發標頭）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 和來源備註

- OpenClaw Gateway 優先考慮本地/回環。如果您在反向代理終止 TLS，請在該處面向代理的 HTTPS 網域上設定 HSTS。
- 如果 Gateway 本身終止 HTTPS，您可以設定 `gateway.http.securityHeaders.strictTransportSecurity` 以從 OpenClaw 回應中發出 HSTS 標頭。
- 詳細的部署指引請參閱 [受信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 對於非回路 (non-loopback) 的 Control UI 部署，預設需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是一項明確允許所有瀏覽器來源的政策，而非經過強化的預設值。請避免在嚴密控制的本地測試之外使用它。
- 即使啟用了一般回路豁免，回路上的瀏覽器來源驗證失敗仍會受到速率限制，但鎖定金鑰的範圍是依據正規化的 `Origin` 值，而不是單一共用的 localhost 區塊。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源後援模式；請將其視為一種危險的操作員選擇政策。
- 請將 DNS 重新綁定 (rebinding) 和 proxy-host 標頭行為視為部署強化問題；嚴格控制 `trustedProxies` 並避免將 Gateway 直接暴露於公開網際網路。

## 本地工作階段日誌儲存在磁碟上

OpenClaw 會將會話記錄儲存在磁碟上的 `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下。
這是會話連續性和 (可選) 會話記憶索引所必需的，但這也表示
**任何具有檔案系統存取權的處理程序/使用者都可以讀取這些記錄**。請將磁碟存取視為信任
邊界，並鎖定 `~/.openclaw` 的權限 (請參閱下方的稽核章節)。如果您需要
代理程式之間更強大的隔離，請在獨立的 OS 使用者或獨立的主機下執行它們。

## 節點執行 (system.run)

如果配對了 macOS 節點，Gateway 可以在該節點上叫用 `system.run`。這是在 Mac 上的**遠端程式碼執行**：

- 需要節點配對 (approval + token)。
- Gateway 節點配對並非針對每個指令的核准介面。它會建立節點身分/信任和 token 發行。
- Gateway 透過 `gateway.nodes.allowCommands` / `denyCommands` 套用粗略的全域節點指令政策。
- 在 Mac 上透過 **Settings → Exec approvals** (security + ask + allowlist) 進行控制。
- 各個節點的 `system.run` 政策是節點自己的執行核准檔案 (`exec.approvals.node.*`)，它可以比 Gateway 的全域指令 ID 政策更嚴格或更寬鬆。
- 以 `security="full"` 和 `ask="off"` 運行的節點遵循預設的可信操作員模型。除非您的部署明確要求更嚴格的批准或允許清單策略，否則請將其視為預期行為。
- 批准模式會綁定確切的請求上下文，並在可能時綁定一個具體的本地腳本/檔案操作數。如果 OpenClaw 無法為直譯器/執行時命令精確識別一個直接的本地檔案，將拒絕基於批准的執行，而不是承諾完全的語義覆蓋。
- 對於 `host=node`，基於批准的執行還會儲存一個標準的準備好
  `systemRunPlan`；稍後批准的轉發會重複使用該儲存的計畫，並且閘道
  驗證會拒絕在建立批准請求後，呼叫者對 command/cwd/session 內容的編輯。
- 如果您不想要遠端執行，請將安全性設為 **deny** 並移除該 Mac 的節點配對。

這區別對於分流至關重要：

- 如果閘道全域策略和節點的本地執行批准仍然強制執行實際的執行邊界，那麼重新連線的已配對節點廣告不同的命令清單，這本身並不是一個漏洞。
- 那些將節點配對元資料視為第二個隱藏的逐命令批准層的報告，通常是策略/UX 的混淆，而非繞過安全邊界。

## 動態技能

OpenClaw 可以在會話中途重新整理技能清單：

- **Skills watcher**：對 `SKILL.md` 的變更可以在下一個 agent 輪次更新 skills 快照。
- **Remote nodes**：連接 macOS 節點可以讓僅限 macOS 的技能符合資格（基於 bin probing）。

將技能資料夾視為 **受信任的程式碼** 並限制誰可以修改它們。

## 威脅模型

您的 AI 助理可以：

- 執行任意 shell 命令
- 讀寫檔案
- 存取網路服務
- 傳送訊息給任何人（如果您給予 WhatsApp 存取權）

傳送訊息給您的人可以：

- 嘗試誘騙您的 AI 做壞事
- 利用社會工程學存取您的資料
- 探測基礎架構細節

## 核心概念：智慧之前的存取控制

這裡的大多數失敗並非花俏的漏洞利用——而是「有人傳訊息給機器人，機器人就照做了」。")

OpenClaw 的立場：

- **身份優先**：決定誰可以與機器人交談（DM 配對 / 允許清單 / 明確「開放」）。
- **範圍次之**：決定允許機器人在何處運作（群組允許清單 + 提及閘門、工具、沙箱、裝置權限）。
- **模型最後**：假設模型可以被操控；設計時確保操控的影響範圍有限。

## 指令授權模型

斜線命令和指令僅對**經過授權的發送者**有效。授權源自
頻道允許清單/配對以及 `commands.useAccessGroups`（請參閱 [Configuration](/zh-Hant/gateway/configuration)
和 [Slash commands](/zh-Hant/tools/slash-commands)）。如果頻道允許清單為空或包含 `"*"`，
則該頻道的命令實際上處於開放狀態。

`/exec` 是僅限會話的便利功能，供授權操作員使用。它**不**會寫入配置或
變更其他會話。

## 控制平面工具風險

兩個內建工具可以進行永久性的控制平面變更：

- `gateway` 可以使用 `config.schema.lookup` / `config.get` 檢查配置，並可以使用 `config.apply`、`config.patch` 和 `update.run` 進行持久性變更。
- `cron` 可以建立排程作業，這些作業在原始聊天/任務結束後仍會繼續執行。

僅限擁有者的 `gateway` 執行時期工具仍然拒絕覆寫
`tools.exec.ask` 或 `tools.exec.security`；舊版 `tools.bash.*` 別名會在寫入前
正規化為相同的受保護執行路徑。

對於任何處理不受信任內容的 Agent/介面，預設拒絕以下項目：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 僅阻擋重新啟動動作。它不會停用 `gateway` 配置/更新動作。

## 外掛程式

外掛程式與 Gateway **同進程** 執行。請將其視為受信任的程式碼：

- 僅安裝來自您信任來源的外掛程式。
- 優先使用明確的 `plugins.allow` 允許清單。
- 在啟用前審查外掛程式組態。
- 在外掛程式變更後重新啟動 Gateway。
- 如果您安裝或更新外掛程式（`openclaw plugins install <package>`、`openclaw plugins update <id>`），請將其視為執行不受信任的程式碼：
  - 安裝路徑是作用中外掛程式安裝根目錄下的個別外掛程式目錄。
  - OpenClaw 在安裝/更新之前會執行內建的危險代碼掃描。`critical` 發現結果預設會阻擋。
  - OpenClaw 使用 `npm pack`，然後在該目錄中執行 `npm install --omit=dev`（npm 生命週期腳本可以在安裝期間執行代碼）。
  - 建議優先使用鎖定的精確版本 (`@scope/pkg@1.2.3`)，並在啟用前檢查磁碟上的解壓縮代碼。
  - `--dangerously-force-unsafe-install` 僅適用於外掛程式安裝/更新流程中內建掃描誤報的緊急情況。它不會繞過外掛程式 `before_install` 掛鉤策略阻擋，也不會繞過掃描失敗。
  - Gateway 支援的技能依賴安裝遵循相同的危險/可疑拆分規則：除非呼叫者明確設定 `dangerouslyForceUnsafeInstall`，否則內建 `critical` 發現結果會被阻擋，而可疑發現仍僅發出警告。`openclaw skills install` 保持獨立的 ClawHub 技能下載/安裝流程。

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

<a id="dm-access-model-pairing-allowlist-open-disabled"></a>

## DM 存取模型（配對 / 允許清單 / 開放 / 已停用）

所有目前支援 DM 的通道都支援 DM 策略 (`dmPolicy` 或 `*.dm.policy`)，在訊息處理**之前**對傳入 DM 進行閘道控制：

- `pairing` (預設)：未知發送者會收到一個簡短的配對碼，機器人會忽略其訊息直到獲得批准。配對碼在 1 小時後過期；重複的 DM 在建立新請求之前不會重新發送代碼。預設情況下，待處理請求限制為**每個通道 3 個**。
- `allowlist`：未知發送者被阻擋 (無配對握手)。
- `open`：允許任何人 DM (公開)。**需要**通道允許清單包含 `"*"` (明確選擇加入)。
- `disabled`：完全忽略傳入 DM。

透過 CLI 核准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

詳細資訊 + 磁碟上的檔案：[配對](/zh-Hant/channels/pairing)

## DM 階段隔離（多使用者模式）

根據預設，OpenClaw 會將**所有私訊導入主要階段**，以便您的助理在裝置與頻道之間保持連續性。如果**多個人**可以私訊該機器人（開放式私訊或多使用者允許清單），請考慮隔離私訊階段：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

這可以防止跨使用者內容洩漏，同時保持群組聊天隔離。

這是訊息內容邊界，而非主機管理邊界。如果使用者彼此存在對抗關係且共用同一個 Gateway 主機/設定，請改為針對每個信任邊界執行個別的 Gateway。

### 安全私訊模式（建議）

將上述程式碼片段視為**安全私訊模式**：

- 預設值：`session.dmScope: "main"` (所有 DM 共用一個會話以保持連續性)。
- 本機 CLI 設置預設值：未設定時寫入 `session.dmScope: "per-channel-peer"` (保留現有的明確值)。
- 安全 DM 模式：`session.dmScope: "per-channel-peer"` (每個通道+發送者對組都會獲得獨立的 DM 語境)。
- 跨通道對等隔離：`session.dmScope: "per-peer"`（每個發送者在所有相同類型的通道中獲得一個會話）。

如果您在同一個通道上運行多個帳戶，請改用 `per-account-channel-peer`。如果同一個人通過多個通道聯繫您，請使用 `session.identityLinks` 將這些 DM 會話合併為一個規範身份。請參閱[會話管理](/zh-Hant/concepts/session)和[配置](/zh-Hant/gateway/configuration)。

## 允許清單（DM + 群組）- 術語

OpenClaw 有兩個獨立的「誰可以觸發我？」層級：

- **DM 許可清單**（`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；舊版：`channels.discord.dm.allowFrom`，`channels.slack.dm.allowFrom`）：允許誰在直接訊息中與機器人對話。
  - 當 `dmPolicy="pairing"` 時，批准會寫入到帳戶範圍的配對許可清單存儲中，位於 `~/.openclaw/credentials/` 下（預設帳戶為 `<channel>-allowFrom.json`，非預設帳戶為 `<channel>-<accountId>-allowFrom.json`），並與配置許可清單合併。
- **群組允許清單**（頻道特定）：機器人根本會接受來自哪些群組/頻道/公會的訊息。
  - 常見模式：
    - `channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`：每個群組的預設值，例如 `requireMention`；設定後，它也充當群組許可清單（包含 `"*"` 以保留全部允許的行為）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制誰可以觸發群組會話*內部*的機器人（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）。
    - `channels.discord.guilds` / `channels.slack.channels`：每個表面的許可清單 + 提及預設值。
  - 群組檢查按以下順序運行：首先檢查 `groupPolicy`/群組許可清單，其次檢查提及/回覆啟用。
  - 回覆機器人訊息（隱式提及）**不會**繞過發送者許可清單，例如 `groupAllowFrom`。
  - **安全說明：**將 `dmPolicy="open"` 和 `groupPolicy="open"` 視為最後手段的設定。它們應該很少使用；除非您完全信任房間的每個成員，否則請優先使用配對 + 許可清單。

詳情：[配置](/zh-Hant/gateway/configuration)和[群組](/zh-Hant/channels/groups)

## 提示詞注入（它是什麼，為什麼它很重要）

提示詞注入是指攻擊者精心製作一條訊息，操縱模型執行不安全的操作（「忽略您的指令」、「傾印您的檔案系統」、「按一下此連結並執行指令」等）。

即使有強大的系統提示詞，**提示詞注入問題尚未解決**。系統提示詞防線僅是軟性指導；強制執行來自工具政策、執行核准、沙盒和頻道允許清單（並且操作員可以刻意停用這些功能）。實際上有幫助的做法是：

- 鎖定傳入的私訊（配對/允許清單）。
- 在群組中優先使用提及閘門；避免在公共房間中使用「始終啟用」的機器人。
- 預設將連結、附件和貼上的指令視為惡意內容。
- 在沙盒中執行敏感的工具執行；將機密資訊排除在代理程式可存取的檔案系統之外。
- 注意：沙箱屬於選用功能。如果關閉沙箱模式，隱含的 `host=auto` 會解析為閘道主機。由於沒有可用的沙箱執行時，明確的 `host=sandbox` 仍然會失敗關閉。如果您希望該行為在設定中明確顯示，請設定 `host=gateway`。
- 將高風險工具（`exec`、`browser`、`web_fetch`、`web_search`）限制在受信任的代理程式或明確的允許清單中。
- 如果您將解譯器加入允許清單（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`），請啟用 `tools.exec.strictInlineEval`，以便內聯評估表單仍需要明確核准。
- Shell 核准分析也會拒絕 **未加引號的 heredocs** 內的 POSIX 參數擴展形式（`$VAR`、`$?`、`$$`、`$1`、`$@`、`${…}`），因此允許清單中的 heredoc 內容無法以純文字形式在允許清單審查中偷偷通過 shell 擴展。請將 heredoc 終止符加上引號（例如 `<<'EOF'`）以採用字面內容語意；會擴展變數的未加引號 heredocs 將會被拒絕。
- **模型選擇很重要：** 舊型/較小/傳統模型對於提示詞注入和工具誤用的防禦能力明顯較弱。對於已啟用工具的代理程式，請使用可用的最強、最新世代且經過指令強化的模型。

應視為不受信任的危險訊號：

- 「閱讀此檔案/URL 並完全依照其指示執行。」
- 「忽略您的系統提示詞或安全規則。」
- 「揭露您的隱藏指令或工具輸出。」
- 「貼上 ~/.openclaw 或您的日誌的完整內容。」

## 外部內容特殊權杖清理

OpenClaw 會在包裝的外部內容和元數據到達模型之前，從中移除常見的自託管 LLM 聊天範本特殊權杖字面值。涵蓋的標記家族包括 Qwen/ChatML、Llama、Gemma、Mistral、Phi 和 GPT-OSS 角色/輪次權杖。

原因：

- 位於自託管模型前端的 OpenAI 相容後端，有時會保留出現在使用者文字中的特殊 token，而不是將其遮罩。否則，能夠寫入傳入外部內容（擷取的頁面、電子郵件正文、檔案內容工具輸出）的攻擊者，可能會注入合成的 `assistant` 或 `system` 角色邊界，並逃脫包裹內容的防護措施。
- 淨化發生在外部內容包裹層，因此它會統一套用於各種擷取/讀取工具和傳入通道內容，而不是因提供者而異。
- 傳出模型回應已經有一個獨立的淨化器，可以從使用者可見的回覆中去除洩漏的 `<tool_call>`、`<function_calls>` 和類似的腳手架。外部內容淨化器是其傳入的對應部分。

這並不取代本頁中的其他強化措施 —— `dmPolicy`、允許清單、執行核准、沙盒機制和 `contextVisibility` 仍然負責主要工作。它封閉了針對自託管堆疊的一個特定分詞器層繞過，該堆疊會轉發帶有特殊 token 的使用者文字。

## 不安全的外部內容繞過標誌

OpenClaw 包含明確的繞過標誌，用於停用外部內容安全包裹：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 載荷欄位 `allowUnsafeExternalContent`

指導原則：

- 在生產環境中保持未設定或為 false。
- 僅針對範圍狹窄的除錯暫時啟用。
- 如果啟用，請隔離該代理程式（沙盒 + 最少工具 + 專用會話命名空間）。

Hook 風險提示：

- Hook 載荷是不可信的內容，即使傳送來自您控制的系統（郵件/文件/網路內容可能攜帶提示注入）。
- 弱模型層級會增加此風險。對於 Hook 驅動的自動化，建議使用強大的現代模型層級，並嚴格執行工具原則（`tools.profile: "messaging"` 或更嚴格），並盡可能使用沙盒機制。

### 提示注入不需要公開的 DM

即使**只有您**可以傳送訊息給機器人，提示詞注入仍可能透過機器人讀取的任何**不受信任的內容**（網路搜尋/擷取結果、瀏覽器頁面、電子郵件、文件、附件、貼上的日誌/程式碼）發生。換句話說：發送者並非唯一的威脅來源；**內容本身**可能帶有惡意指令。

啟用工具時，典型風險是洩漏上下文或觸發工具呼叫。透過以下方式減少爆炸半徑：

- 使用唯讀或停用工具的**閱讀代理程式**來摘要不受信任的內容，然後將摘要傳遞給您的主要代理程式。
- 對於已啟用工具的代理程式，除非必要，否則請保持 `web_search` / `web_fetch` / `browser` 關閉。
- 對於 OpenResponses URL 輸入（`input_file` / `input_image`），請設定嚴格的
  `gateway.http.endpoints.responses.files.urlAllowlist` 和
  `gateway.http.endpoints.responses.images.urlAllowlist`，並保持 `maxUrlParts` 較低。
  空白允許清單會被視為未設定；如果您想完全停用 URL 擷取，請使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 對於 OpenResponses 檔案輸入，解碼後的 `input_file` 文字仍會被注入為
  **不受信任的外部內容**。不要僅因為 Gateway 在本機解碼了它，就依賴檔案文字是受信任的。即使此路徑省略了較長的 `SECURITY NOTICE:` 橫幅，注入的區塊仍帶有明確的
  `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 邊界標記加上 `Source: External`
  中繼資料。
- 當媒體理解功能在將文字附加到媒體提示詞之前，從附加的文件中擷取文字時，會套用相同的基於標記的包裝方式。
- 為任何接觸不受信任輸入的代理程式啟用沙盒和嚴格的工具允許清單。
- 不要將機密包含在提示詞中；改為透過 Gateway 主機上的 env/config 傳遞。

### 自託管的 LLM 後端

相容 OpenAI 的自託管後端，例如 vLLM、SGLang、TGI、LM Studio 或自訂 Hugging Face tokenizer 堆疊，在處理 chat-template 特殊標記的方式上可能與託管供應商不同。如果後端將 `<|im_start|>`、`<|start_header_id|>` 或 `<start_of_turn>` 等字面字串作為使用者內容內部的結構性 chat-template 標記進行分詞，不受信任的文字可能會嘗試在分詞器層級偽造角色邊界。

OpenClaw 會在將包裝的外部內容分派給模型之前，從中剝離常見的模型系列特殊標記字面值。請保持外部內容包裝處於啟用狀態，並在可用的情況下，優先選擇可在使用者提供的內容中分割或跳脫特殊標記的後端設定。諸如 OpenAI 和 Anthropic 等託管供應商已經套用了自己的請求端清理。

### 模型強度（安全備註）

各模型層級對於提示詞注入的抵抗力**並不**一致。較小/較便宜的模型通常更容易受到工具誤用和指令劫持的影響，尤其是在對抗性提示詞下。

<Warning>對於啟用工具的代理程式或讀取不受信任內容的代理程式，使用較舊/較小模型時的提示詞注入風險通常過高。請勿在較弱的模型層級上執行這些工作負載。</Warning>

建議：

- 對於任何可以執行工具或接觸檔案/網路的機器人，**請使用最新一代、最高層級的模型**。
- **請勿對啟用工具的代理程式或不受信任的收件匣使用較舊/較弱/較小的層級**；提示詞注入風險太高。
- 如果您必須使用較小的模型，**請縮小爆炸半徑**（唯讀工具、強力沙箱、最小檔案系統存取權、嚴格的允許清單）。
- 執行小型模型時，**請為所有工作階段啟用沙箱**，並**停用 web_search/web_fetch/browser**，除非輸入受到嚴格控制。
- 對於具有受信任輸入且無工具的純聊天個人助理，較小的模型通常是可以接受的。

<a id="reasoning-verbose-output-in-groups"></a>

## 群組中的推理與詳細輸出

`/reasoning`、`/verbose` 和 `/trace` 可能會暴露不應出現在公開頻道中的內部推理、工具輸出或外掛程式診斷資訊。在群組設定中，請將它們視為僅供 **偵錯** 使用，除非您明確需要，否則請保持關閉。

指引：

- 在公開房間中保持停用 `/reasoning`、`/verbose` 和 `/trace`。
- 如果您啟用它們，請僅在受信任的私人訊息 (DM) 或嚴格管控的房間中進行。
- 請記住：詳細輸出和追蹤輸出可能包含工具參數、URL、外掛程式診斷以及模型看到的資料。

## 設定強化（範例）

### 0) 檔案權限

在 Gateway 主機上保持設定 + 狀態為私密：

- `~/.openclaw/openclaw.json`: `600` (僅使用者讀寫)
- `~/.openclaw`: `700` (僅限使用者)

`openclaw doctor` 可以發出警告並提議加強這些權限。

### 0.4) 網路暴露 (bind + port + firewall)

Gateway 在單一連接埠上多工傳輸 **WebSocket + HTTP**：

- 預設值：`18789`
- 設定/標誌/環境變數：`gateway.port`、`--port`、`OPENCLAW_GATEWAY_PORT`

此 HTTP 介面包含控制 UI 和 canvas host：

- 控制 UI (SPA 資源) (預設基礎路徑 `/`)
- Canvas host：`/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` (任意 HTML/JS；將其視為不受信任的內容)

如果您在一般瀏覽器中載入 canvas 內容，請將其視為任何其他不受信任的網頁：

- 不要將 canvas host 暴露給不受信任的網路/使用者。
- 除非您完全理解其含意，否則不要讓 canvas 內容與具有特權的網頁介面共用相同的來源 (origin)。

綁定模式控制 Gateway 的監聽位置：

- `gateway.bind: "loopback"` (預設值)：僅限本地用戶端可以連線。
- 非迴路綁定 (`"lan"`、`"tailnet"`、`"custom"`) 會擴大攻擊面。僅在使用 Gateway 驗證 (共用 token/密碼或正確設定的非迴路受信任 Proxy) 和真實防火牆時才使用它們。

經驗法則：

- 優先使用 Tailscale Serve 而非區域網路綁定（Serve 將 Gateway 保持在 loopback，並由 Tailscale 處理存取）。
- 如果您必須綁定到區域網路，請使用嚴格的來源 IP 白名單對該埠進行防火牆防護；切勿廣泛進行埠轉發。
- 切勿在 `0.0.0.0` 上暴露未經驗證的 Gateway。

### 0.4.1) Docker 埠發佈 + UFW (`DOCKER-USER`)

如果您在 VPS 上使用 Docker 執行 OpenClaw，請記住已發佈的容器埠
(`-p HOST:CONTAINER` 或 Compose `ports:`) 是透過 Docker 的轉發
鏈路路由，而不僅是主機 `INPUT` 規則。

若要使 Docker 流量與您的防火牆策略保持一致，請在
`DOCKER-USER` 中執行規則（此鏈路會在 Docker 自己的接受規則之前進行評估）。
在許多現代發行版中，`iptables`/`ip6tables` 使用 `iptables-nft` 前端
並且仍會將這些規則套用到 nftables 後端。

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

IPv6 有獨立的表格。如果啟用了
Docker IPv6，請在 `/etc/ufw/after6.rules` 中新增相符的策略。

避免在文件片段中硬編碼介面名稱，例如 `eth0`。介面名稱
在不同 VPS 映像檔中會有所不同 (`ens3`, `enp*` 等)，不匹配可能會意外
略過您的拒絕規則。

重新載入後的快速驗證：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

預期的外部埠應僅包含您故意暴露的內容（對於大多數
設定：SSH + 您的反向代理埠）。

### 0.4.2) mDNS/Bonjour 探索（資訊洩露）

Gateway 透過 mDNS (埠 5353 上的 `_openclaw-gw._tcp`) 廣播其存在，以便進行本機裝置探索。在完整模式下，這包括可能暴露操作細節的 TXT 記錄：

- `cliPath`：CLI 二進位檔案的完整檔案系統路徑（會暴露使用者名稱和安裝位置）
- `sshPort`：廣播主機上 SSH 的可用性
- `displayName`, `lanHost`：主機名稱資訊

**營運安全考量：** 廣播基礎設施細節會讓區域網路上的任何人更容易進行偵察。即使是像檔案系統路徑和 SSH 可用性這種「無害」資訊，也有助於攻擊者繪製您的環境地圖。

**建議：**

1. **最小模式**（預設，建議用於暴露的閘道）：從 mDNS 廣播中省略敏感欄位：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

2. **完全停用**，如果您不需要本機裝置探索：

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

4. **環境變數**（替代方案）：設定 `OPENCLAW_DISABLE_BONJOUR=1` 以在無需變更設定的情況下停用 mDNS。

在最小模式下，閘道仍會廣播足夠的資訊供裝置探索（`role`、`gatewayPort`、`transport`），但會省略 `cliPath` 和 `sshPort`。需要 CLI 路徑資訊的應用程式可以透過已驗證的 WebSocket 連線來取得。

### 0.5) 鎖定閘道 WebSocket（本機驗證）

閘道驗證**預設為必填**。如果未設定有效的閘道驗證路徑，
閘道會拒絕 WebSocket 連線（失效關閉/fail‑closed）。

入站預設會產生一個權杖（即使是回環），因此
本機用戶端必須進行驗證。

設定權杖，以便**所有** WS 用戶端都必須驗證：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以為您產生一個：`openclaw doctor --generate-gateway-token`。

注意：`gateway.remote.token` / `.password` 是用戶端憑證來源。它們
單獨並**不**保護本機 WS 存取權。
本機呼叫路徑只有在 `gateway.auth.*`
未設定時，才能使用 `gateway.remote.*` 作為後備。
如果 `gateway.auth.token` / `gateway.auth.password` 是透過
SecretRef 明確設定且無法解析，解析會失效關閉（沒有遠端後備遮罩）。
選用：使用 `wss://` 時，以 `gateway.remote.tlsFingerprint` 釘選遠端 TLS。
純文字 `ws://` 預設僅限回環。對於受信任的私人網路
路徑，在用戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為緊急存取。

本機裝置配對：

- 裝置配對會自動批准直接的本地回環連線，以保持
  同主機客戶端的順暢。
- OpenClaw 也有一個狹窄的後端/容器本機自連路徑，用於
  受信任的共享密鑰輔助流程。
- Tailnet 和 LAN 連線（包括同主機 tailnet 繫結）在配對時
  被視為遠端，仍需批准。
- **轉發標頭證據會取消回環本地性資格。** 如果請求
  到達回環但帶有 `X-Forwarded-For` / `X-Forwarded-Host` /
  `X-Forwarded-Proto` 標頭指向非本地來源，則該請求在配對、受信任代理驗證和
  Control UI 裝置身分閘控方面被視為遠端 — 它不再符合
  回環自動批准的資格。
- **中繼資料升級自動批准** 僅適用於已配對裝置上的非敏感重新連線
  差異（顯示名稱、客戶端平台提示）。
  範圍升級（讀取到寫入/管理員）和公開金鑰變更仍需要
  明確重新批准，且絕不會無靜默升級。

驗證模式：

- `gateway.auth.mode: "token"`：共享持有人權杖（建議用於大多數設定）。
- `gateway.auth.mode: "password"`：密碼驗證（建議透過環境變數設定：`OPENCLAW_GATEWAY_PASSWORD`）。
- `gateway.auth.mode: "trusted-proxy"`：信任具身分感知的反向代理以驗證使用者並透過標頭傳遞身分（請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)）。

輪換檢查清單（權杖/密碼）：

1. 產生/設定新密鑰（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重新啟動 Gateway（如果 macOS 應用程式監控 Gateway，則重新啟動該應用程式）。
3. 更新任何遠端客戶端（呼叫 Gateway 的機器上的 `gateway.remote.token` / `.password`）。
4. 驗證您無法再使用舊憑證連線。

### 0.6) Tailscale Serve 身分標頭

當 `gateway.auth.allowTailscale` 為 `true`（Serve 的預設值）時，OpenClaw
接受 Tailscale Serve 身分標頭 (`tailscale-user-login`) 用於 Control
UI/WebSocket 驗證。OpenClaw 通過本地 Tailscale 守護程序 (`tailscale whois`)
解析 `x-forwarded-for` 位址並將其與標頭進行比對來驗證身分。這僅對命中 loopback
且包含 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 的請求觸發。
對於此非同步身分檢查路徑，同一 `{scope, ip}` 的失敗嘗試
會在限制器記錄失敗之前進行序列化。因此，來自一個 Serve 用戶端的並發錯誤重試
可以立即鎖定第二次嘗試，而不是作為兩個單純的不匹配競爭通過。
HTTP API 端點（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
**不**使用 Tailscale 身分標頭驗證。它們仍然遵循閘道
設定的 HTTP 驗證模式。

重要邊界說明：

- 閘道 HTTP 持有者驗證實際上是全有或全無的操作員存取權。
- 請將可以呼叫 `/v1/chat/completions`、`/v1/responses` 或 `/api/channels/*` 的憑證視為該閘道的完整存取操作機密。
- 在 OpenAI 相容的 HTTP 表面上，共用金鑰持有者驗證會恢復完整的預設操作員範圍 (`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`) 和代理回合的所有者語意；較狹窄的 `x-openclaw-scopes` 值不會減少該共用金鑰路徑。
- HTTP 上的每個請求範圍語意僅在請求來自具有身分的模式（例如受信任的代理驗證或私人入口上的 `gateway.auth.mode="none"`）時才會套用。
- 在那些具有身分的模式中，省略 `x-openclaw-scopes` 會回退到正常的操作員預設範圍集；當您想要較狹窄的範圍集時，請明確發送標頭。
- `/tools/invoke` 遵循相同的共享金鑰規則：那裡的 token/password bearer auth 也被視為完整的操作員存取權限，而承載身分的模式仍然遵守宣告的範圍。
- 請勿與不受信任的呼叫者共用這些憑證；最好每個信任邊界使用個別的閘道。

**信任假設：** 無 token 的 Serve 授權假設閘道主機是受信任的。
請勿將此視為針對惡意同主機程序的保护。如果在閘道主機上可能執行
不受信任的本機程式碼，請停用 `gateway.auth.allowTailscale`
並要求使用 `gateway.auth.mode: "token"` 或
`"password"` 進行明確的共享金鑰授權。

**安全規則：** 不要從您自己的反向代理轉發這些標頭。如果您
在閘道前方終止 TLS 或進行代理，請停用
`gateway.auth.allowTailscale` 並改用共享金鑰授權 (`gateway.auth.mode:
"token"` or `"password"`) 或 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)。

受信任的代理：

- 如果您在閘道前方終止 TLS，請將 `gateway.trustedProxies` 設定為您的代理 IP。
- OpenClaw 將信任來自那些 IP 的 `x-forwarded-for` (或 `x-real-ip`) 以確定用於本機配對檢查和 HTTP 授權/本機檢查的用戶端 IP。
- 確保您的代理 **覆寫** `x-forwarded-for` 並阻止對閘道連接埠的直接存取。

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 和 [Web 概觀](/zh-Hant/web)。

### 0.6.1) 透過節點主機進行瀏覽器控制 (推薦)

如果您的閘道是遠端的，但瀏覽器在另一台機器上執行，請在瀏覽器機器上執行 **節點主機**
並讓閘道代理瀏覽器動作 (請參閱 [Browser tool](/zh-Hant/tools/browser))。
將節點配對視為管理員存取權限。

推薦模式：

- 將閘道和節點主機保持在同一個 tailnet (Tailscale) 上。
- 有意地配對節點；如果您不需要瀏覽器代理路由，請將其停用。

避免：

- 透過區域網路或公開網際網路公開中繼/控制連接埠。
- 針對瀏覽器控制端點使用 Tailscale Funnel (公開暴露)。

### 0.7) 磁碟上的機密 (敏感資料)

假設 `~/.openclaw/` (或 `$OPENCLAW_STATE_DIR/`) 下的任何內容都可能包含機密或私人資料：

- `openclaw.json`：配置可能包括 tokens (gateway, remote gateway)、提供者設定和允許列表。
- `credentials/**`：頻道憑證 (例如：WhatsApp 憑證)、配對允許列表、舊版 OAuth 匯入。
- `agents/<agentId>/agent/auth-profiles.json`：API 金鑰、token 設定檔、OAuth tokens，以及選用的 `keyRef`/`tokenRef`。
- `secrets.json` (選用)：由 `file` SecretRef 提供者 (`secrets.providers`) 使用的檔案支援機密承載。
- `agents/<agentId>/agent/auth.json`：舊版相容性檔案。發現靜態 `api_key` 條目時會將其清除。
- `agents/<agentId>/sessions/**`：會話記錄 (`*.jsonl`) + 路由元資料 (`sessions.json`)，可能包含私人訊息和工具輸出。
- 打包的外掛程式套件：已安裝的外掛程式 (及其 `node_modules/`)。
- `sandboxes/**`：工具沙箱工作區；可能會累積您在沙箱內讀寫的檔案副本。

加固提示：

- 保持嚴格的權限 (目錄設為 `700`，檔案設為 `600`)。
- 在 Gateway 主機上使用全磁碟加密。
- 如果主機是共用的，建議為 Gateway 使用專用的 OS 使用者帳戶。

### 0.8) 工作區 `.env` 檔案

OpenClaw 會載入代理人 和工具 的工作區本機 `.env` 檔案，但絕不允許這些檔案靜默覆寫 Gateway 執行時控制項。

- 任何以 `OPENCLAW_*` 開頭的金鑰都會被不受信任的工作區 `.env` 檔案封鎖。
- 針對 Matrix、Mattermost、IRC 和 Synology Chat 的通道端點設定也被封鎖，無法透過工作區 `.env` 覆寫，因此複製的工作區無法透過本機端點設定重新導向捆綁的連接器流量。端點環境變數金鑰（例如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`）必須來自閘道程序環境或 `env.shellEnv`，而不能來自工作區載入的 `.env`。
- 此封鎖是故障關閉（fail-closed）的：在未來版本中新增的新執行時期控制變數無法從已簽入或攻擊者提供的 `.env` 繼承；該金鑰會被忽略，而閘道將保留其自身的值。
- 受信任的程序/作業系統環境變數（閘道自身的 shell、launchd/systemd 單元、應用程式套件）仍然適用——這僅限制 `.env` 檔案的載入。

原因：工作區 `.env` 檔案經常與代理程式碼並存、因意外而簽入，或由工具寫入。封鎖整個 `OPENCLAW_*` 前綴意味著稍後新增新的 `OPENCLAW_*` 標誌時，絕不會退回到從工作區狀態進行無聲繼承。

### 0.9) 日誌 + 交談記錄（編修 + 保留）

即使存取控制設定正確，日誌和交談記錄仍可能洩露敏感資訊：

- 閘道日誌可能包含工具摘要、錯誤和 URL。
- 工作階段交談記錄可能包含貼上的密碼、檔案內容、命令輸出和連結。

建議：

- 保持工具摘要編修開啟（`logging.redactSensitive: "tools"`；預設值）。
- 透過 `logging.redactPatterns` 為您的環境新增自訂模式（符記、主機名稱、內部 URL）。
- 分享診斷資訊時，優先使用 `openclaw status --all`（可貼上、已編修密碼），而非原始日誌。
- 如果您不需要長期保留，請修剪舊的工作階段交談記錄和日誌檔案。

詳細資訊：[日誌記錄](/zh-Hant/gateway/logging)

### 1) 私訊：預設配對

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 2) 群組：到處都需要提及

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

在群組聊天中，僅在明確被提及時才回應。

### 3) 分離號碼（WhatsApp、Signal、Telegram）

對於基於電話號碼的頻道，請考慮將您的 AI 運行在與個人電話號碼分開的電話號碼上：

- 個人號碼：您的對話保持私密
- 機器人號碼：AI 在適當的邊界下處理這些訊息

### 4) 唯讀模式 (via sandbox + tools)

您可以透過組合以下方式建立唯讀設定檔：

- `agents.defaults.sandbox.workspaceAccess: "ro"` (或 `"none"` 以拒絕工作區存取權)
- 阻擋 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允許/拒絕清單。

額外的強化選項：

- `tools.exec.applyPatch.workspaceOnly: true` (預設值)：確保 `apply_patch` 即使在關閉沙箱時也無法在工作區目錄之外寫入/刪除。僅在您有意允許 `apply_patch` 存取工作區外的檔案時，才將其設為 `false`。
- `tools.fs.workspaceOnly: true` (選用)：將 `read`/`write`/`edit`/`apply_patch` 路徑和原生提示圖片自動載入路徑限制在工作區目錄內 (如果您目前允許絕對路徑並希望有一個單一防護機制，這很有用)。
- 保持檔案系統根目錄狹窄：避免為代理工作區/沙箱工作區設定像您的家目錄這樣廣泛的根目錄。廣泛的根目錄可能會將敏感的本機檔案暴露給檔案系統工具 (例如 `~/.openclaw` 下的狀態/設定)。

### 5) 安全基準 (copy/paste)

一個「安全預設」設定，可將 Gateway 保持為私密、需要 DM 配對，並避免常駐的群組機器人：

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

如果您也想要「預設更安全」的工具執行，請為任何非擁有者的代理新增沙箱並拒絕危險工具 (下方「Per-agent access profiles」中的範例)。

聊天驅動的代理回合內建基準：非擁有者發送者無法使用 `cron` 或 `gateway` 工具。

## 沙箱機制 (Sandboxing) (推薦)

專屬文件：[沙箱機制 (Sandboxing)](/zh-Hant/gateway/sandboxing)

兩種互補的方法：

- **在 Docker 中執行完整的 Gateway** (容器邊界)：[Docker](/zh-Hant/install/docker)
- **工具沙箱** (`agents.defaults.sandbox`，主機閘道 + 沙箱隔離工具；Docker 是預設後端)：[沙箱隔離](/zh-Hant/gateway/sandboxing)

注意：為了防止跨 Agent 存取，請將 `agents.defaults.sandbox.scope` 保持在 `"agent"` (預設)
或 `"session"` 以進行更嚴格的每個會話隔離。`scope: "shared"` 使用
單一容器/工作區。

同時請考慮沙箱內的 Agent 工作區存取權：

- `agents.defaults.sandbox.workspaceAccess: "none"` (預設) 保持 Agent 工作區為禁止存取；工具對 `~/.openclaw/sandboxes` 下的沙箱工作區執行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 以唯讀方式在 `/agent` 掛載 Agent 工作區 (停用 `write`/`edit`/`apply_patch`)
- `agents.defaults.sandbox.workspaceAccess: "rw"` 以讀寫方式在 `/workspace` 掛載 Agent 工作區
- 額外的 `sandbox.docker.binds` 會根據正規化和標準化的來源路徑進行驗證。如果父目錄符號連結技巧或標準主目錄別名解析到受阻的根目錄 (例如 `/etc`、`/var/run` 或 OS 主目錄下的憑證目錄)，仍會以失敗封閉 處理。

重要：`tools.elevated` 是在沙箱外執行 exec 的全域基準緊急逃生門。預設的有效主機是 `gateway`，當 exec 目標設定為 `node` 時則是 `node`。請嚴格控制 `tools.elevated.allowFrom`，不要對陌生人啟用它。您可以透過 `agents.list[].tools.elevated` 進一步針對每個 Agent 限制升級權限。請參閱[升級模式](/zh-Hant/tools/elevated)。

### 子 Agent 委派防護機制

如果您允許會話工具，請將委派的子 Agent 執行視為另一個邊界決策：

- 拒絕 `sessions_spawn`，除非 Agent 真的需要委派。
- 請將 `agents.defaults.subagents.allowAgents` 和任何針對特定 Agent 的 `agents.list[].subagents.allowAgents` 覆蓋值限制在已知安全的目標 Agent。
- 對於任何必須保持沙盒化的工作流程，請使用 `sandbox: "require"` 呼叫 `sessions_spawn`（預設為 `inherit`）。
- 當目標子執行時期未處於沙盒中時，`sandbox: "require"` 會快速失敗。

## 瀏覽器控制風險

啟用瀏覽器控制賦予模型驅動真實瀏覽器的能力。
如果該瀏覽器設定檔已包含已登入的工作階段，模型便可以
存取這些帳號和資料。請將瀏覽器設定檔視為 **敏感狀態**：

- 建議為代理程式使用專用的設定檔（預設的 `openclaw` 設定檔）。
- 避免將代理程式指向您的個人日常使用設定檔。
- 對於沙盒化的代理程式，除非您信任它們，否則請保持主機瀏覽器控制為停用狀態。
- 獨立的迴路瀏覽器控制 API 僅接受共用金鑰驗證
  (gateway token bearer auth 或 gateway password)。它不會使用
  trusted-proxy 或 Tailscale Serve 身份標頭。
- 將瀏覽器下載內容視為不受信任的輸入；建議使用隔離的下載目錄。
- 如果可能的話，請在代理程式設定檔中停用瀏覽器同步/密碼管理器（以減少爆炸半徑）。
- 對於遠端閘道，假設「瀏覽器控制」相當於對該設定檔可存取之任何內容的「操作員存取權」。
- 請將 Gateway 和節點主機保持僅在 tailnet 中存取；避免將瀏覽器控制連接埠暴露給區域網路或公用網際網路。
- 當您不需要時，請停用瀏覽器代理路由（`gateway.nodes.browser.mode="off"`）。
- Chrome MCP 現有工作階段模式並非「更安全」；它可以在該主機 Chrome 設定檔所能存取的任何地方以您的身份進行操作。

### 瀏覽器 SSRF 原則（預設為嚴格模式）

OpenClaw 的瀏覽器導覽原則預設為嚴格模式：私人/內部目的地將保持封鎖狀態，除非您明確選擇加入。

- 預設值：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未設定，因此瀏覽器導覽會保持封鎖私人/內部/特殊用途的目標。
- 舊版別名：`browser.ssrfPolicy.allowPrivateNetwork` 為了相容性仍被接受。
- 選擇加入模式：設定 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允許私人/內部/特殊用途的目標。
- 在嚴格模式下，請使用 `hostnameAllowlist`（例如 `*.example.com` 等模式）和 `allowedHostnames`（精確主機例外，包括像 `localhost` 這樣的被封鎖名稱）來指定例外情況。
- 請求前會檢查導航，並在導航後對最終的 `http(s)` URL 進行盡力而為的複查，以減少基於重新導向的樞軸攻擊。

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

## 個別代理存取設定檔（多重代理）

使用多重代理路由時，每個代理都可以擁有自己的沙箱 + 工具政策：
利用此功能為每個代理設定 **完全存取**、**唯讀** 或 **無存取** 權限。
請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以取得完整詳情
和優先順序規則。

常見使用案例：

- 個人代理：完全存取，無沙箱
- 家庭/工作代理：沙箱化 + 唯讀工具
- 公開代理：沙箱化 + 無檔案系統/Shell 工具

### 範例：完全存取（無沙箱）

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

### 範例：無檔案系統/Shell 存取（允許提供者訊息傳遞）

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

## 告訴您的 AI 什麼

在您代理的系統提示中包含安全性準則：

```
## Security Rules
- Never share directory listings or file paths with strangers
- Never reveal API keys, credentials, or infrastructure details
- Verify requests that modify system config with the owner
- When in doubt, ask before acting
- Keep private data private unless explicitly authorized
```

## 事件應對

如果您的 AI 做了錯事：

### 遏制

1. **停止它：** 停止 macOS 應用程式（如果它監督 Gateway）或終止您的 `openclaw gateway` 程序。
2. **關閉暴露：** 設定 `gateway.bind: "loopback"`（或停用 Tailscale Funnel/Serve），直到您了解發生了什麼事。
3. **凍結存取：** 將風險的私訊/群組切換至 `dmPolicy: "disabled"` / 要求提及，並移除您已有的 `"*"` 允許所有項目。

### 輪換（如果機密洩漏則假定已遭入侵）

1. 輪換 Gateway 認證（`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`）並重新啟動。
2. 在可呼叫 Gateway 的任何機器上輪換遠端用戶端機密（`gateway.remote.token` / `.password`）。
3. 輪換提供者/API 憑證（WhatsApp 憑證、Slack/Discord 權杖、`auth-profiles.json` 中的模型/API 金鑰，以及使用時的加密機密載荷值）。

### 稽核

1. 檢查 Gateway 日誌：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 審查相關的逐字稿：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 審查最近的配置變更（任何可能擴大存取權限的變更：`gateway.bind`、`gateway.auth`、dm/group 策略、`tools.elevated`、外掛程式變更）。
4. 重新執行 `openclaw security audit --deep` 並確認關鍵發現已解決。

### 收集以用於報告

- 時間戳記、gateway 主機作業系統 + OpenClaw 版本
- 會話逐字稿 + 短日誌尾部（經過編輯後）
- 攻擊者發送的內容 + Agent 執行的操作
- Gateway 是否暴露於回環介面之外（區域網路/LAN/Tailscale Funnel/Serve）

## Secret 掃描 (detect-secrets)

CI 在 `secrets` 工作中執行 `detect-secrets` pre-commit hook。
推送到 `main` 總是會執行所有檔案的掃描。Pull request 在有基礎提交時會使用變更檔案的快速路徑，否則會回退到所有檔案的掃描。
如果失敗，表示有新的候選項尚未在基線中。

### 如果 CI 失敗

1. 在本地重現：

   ```bash
   pre-commit run --all-files detect-secrets
   ```

2. 了解工具：
   - pre-commit 中的 `detect-secrets` 會使用 repo 的
     基線和排除項目來執行 `detect-secrets-hook`。
   - `detect-secrets audit` 會開啟互動式審查，以將每個基線
     項目標記為真實或誤報。
3. 對於真實的 secret：輪換/移除它們，然後重新執行掃描以更新基線。
4. 對於誤報：執行互動式審查並將其標記為誤報：

   ```bash
   detect-secrets audit .secrets.baseline
   ```

5. 如果您需要新的排除項目，請將其加入 `.detect-secrets.cfg` 並使用匹配的 `--exclude-files` / `--exclude-lines` 標誌重新產生
   基線（設定檔
   僅供參考；detect-secrets 不會自動讀取它）。

一旦更新的 `.secrets.baseline` 反映了預期狀態，請提交它。

## 回報安全性問題

發現 OpenClaw 中的漏洞？請負責任地回報：

1. 電子郵件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修復之前請勿公開發布
3. 我們會記載您的貢獻（除非您偏好匿名）
