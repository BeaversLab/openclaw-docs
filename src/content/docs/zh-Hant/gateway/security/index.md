---
summary: "執行具備 Shell 存取權限的 AI 閘道時的安全性考量與威脅模型"
read_when:
  - Adding features that widen access or automation
title: "安全性"
---

# 安全性

<Warning>**個人助理信任模型：** 此指南假設每個閘道有一個可信操作員邊界（單一使用者/個人助理模型）。 OpenClaw **並非**針對多個共享同一個代理程式/閘道的惡意使用者的敵對多租戶安全邊界。 如果您需要混合信任或惡意使用者操作，請拆分信任邊界（分離的閘道 + 憑證，理想情況下是分離的 OS 使用者/主機）。</Warning>

**本頁內容：** [信任模型](#scope-first-personal-assistant-security-model) | [快速稽核](#quick-check-openclaw-security-audit) | [強化基準](#hardened-baseline-in-60-seconds) | [DM 存取模型](#dm-access-model-pairing--allowlist--open--disabled) | [組態強化](#configuration-hardening-examples) | [事件回應](#incident-response)

## 優先確定範圍：個人助理安全模型

OpenClaw 安全指南假設採用 **個人助理** 部署：每個閘道一個可信操作員邊界，可能有多個代理程式。

- 支援的安全態勢：每個閘道一個使用者/信任邊界（每個邊界最好有一個 OS 使用者/主機/VPS）。
- 不支援的安全邊界：一個由互不信任或惡意使用者共享的閘道/代理程式。
- 如果需要惡意使用者隔離，請按信任邊界拆分（分離的閘道 + 憑證，理想情況下是分離的 OS 使用者/主機）。
- 如果多個不受信任的使用者可以向一個啟用工具的代理程式發送訊息，請將其視為共享該代理程式的相同委派工具權限。

本頁說明 **在該模型內** 的強化措施。它不聲稱在單一共享閘道上提供敵對多租戶隔離。

## 快速檢查： `openclaw security audit`

另請參閱： [形式驗證 (安全模型)](/en/security/formal-verification)

定期執行此操作（特別是在更改組態或暴露網路表面之後）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

它會標記常見的陷阱（閘道驗證暴露、瀏覽器控制暴露、權限過高的允許清單、檔案系統權限、寬鬆的執行核准以及開放頻道的工具暴露）。

OpenClaw 既是一個產品也是一個實驗：您正在將前沿模型的行為連接到真實的訊息傳遞表面和真實的工具。 **沒有所謂的「完美安全」設定。** 目標是審慎處理：

- 誰可以與您的機器人交談
- 允許機器人在何處運作
- 機器人可以接觸什麼

從最小的可用權限開始，然後隨著建立信心再逐步擴大。

### 部署與主機信任

OpenClaw 假設主機與配置邊界都是可信任的：

- 如果某人可以修改 Gateway 的主機狀態或配置（`~/.openclaw`，包括 `openclaw.json`），應將其視為受信任的操作員。
- 為多個互不信任或對立的操作員運行一個 Gateway **並非建議的設定**。
- 對於混合信任團隊，請使用獨立的 Gateway 分割信任邊界（或至少使用獨立的 OS 使用者/主機）。
- 推薦預設值：每台機器/主機（或 VPS）一個使用者，該使用者一個網關，以及該網關中一個或多個代理程式。
- 在一個 Gateway 實例內，已驗證的操作員存取權是受信任的控制平面角色，而非個別使用者的租用戶角色。
- 會話識別碼（`sessionKey`、session ID、標籤）是用於路由選擇器，而非授權令牌。
- 如果有多人可以傳送訊息給同一個啟用工具的代理程式，他們每個人都可以操控相同的權限集。個別使用者的會話/記憶隔離有助於隱私，但無法將共享代理程式轉換為個別使用者的主機授權。

### 共享 Slack 工作區：實際風險

如果「Slack 中的每個人都可以傳送訊息給機器人」，核心風險在於委派的工具權限：

- 任何獲允許的傳送者都可以在代理程式的原則範圍內觸發工具呼叫（`exec`、瀏覽器、網路/檔案工具）；
- 來自某個傳送者的提示/內容注入可能導致影響共享狀態、裝置或輸出的動作；
- 如果某個共享代理程式擁有敏感的憑證/檔案，任何獲允許的傳送者都可能透過工具使用潛在地推動資料外洩。

針對團隊工作流程，請使用具備最少工具的獨立代理程式/Gateway；並將個人資料代理程式設為私人使用。

### 公司共享代理程式：可接受的模式

當所有使用該代理程式的人都在同一個信任邊界內（例如一個公司團隊），且該代理程式嚴格限定於業務範圍時，這是可以接受的。

- 在專用的機器/VM/容器上運行它；
- 針對該運行環境，使用專用的 OS 使用者 + 專用的瀏覽器/設定檔/帳戶；
- 不要使用該運行環境登入個人的 Apple/Google 帳戶或個人的密碼管理器/瀏覽器設定檔。

如果你在同一個運行環境上混合使用個人和公司的身分，你將會破壞分隔並增加個人資料暴露的風險。

## Gateway 與節點信任概念

將 Gateway 和節點視為一個具備不同角色的操作員信任網域：

- **Gateway** 是控制平面和政策表面 (`gateway.auth`、工具政策、路由)。
- **Node** 是與該 Gateway 配對的遠端執行表面（指令、裝置動作、主機本機功能）。
- 向 Gateway 進行身份驗證的呼叫者在 Gateway 範圍內受信任。配對後，Node 動作即為該 Node 上受信任的操作者動作。
- `sessionKey` 是路由/上下文選擇，而非個別使用者身份驗證。
- 執行核准 (allowlist + ask) 是針對操作者意圖的防護措施，而非針對惡意多租戶的隔離。
- 執行核准綁定確切的請求上下文和盡力的直接本機檔案運算元；它們並未在語意上對每個執行時期/直譯器載入器路徑進行建模。請使用沙盒和主機隔離來建立強固的邊界。

如果您需要針對惡意使用者的隔離，請依 OS 使用者/主機分割信任邊界，並執行個別的 Gateway。

## 信任邊界矩陣

在分類風險時，將此作為快速模型：

| 邊界或控制                                  | 其含義                            | 常見誤讀                                        |
| ------------------------------------------- | --------------------------------- | ----------------------------------------------- |
| `gateway.auth` (token/password/device auth) | 向 Gateway API 進行呼叫者身份驗證 | "需要在每個幀上進行逐訊息簽章才能確保安全"      |
| `sessionKey`                                | 用於上下文/工作階段選擇的路由金鑰 | "工作階段金鑰是使用者身份驗證邊界"              |
| 提示詞/內容防護措施                         | 降低模型濫用風險                  | "僅憑提示詞注入即可證明身分驗證繞過"            |
| `canvas.eval` / browser evaluate            | 啟用時的刻意操作者功能            | "在此信任模型中，任何 JS eval 原語自動構成漏洞" |
| 本機 TUI `!` shell                          | 明確的操作者觸發本機執行          | "本機 shell 便利指令是遠端注入"                 |
| Node 配對和 Node 指令                       | 配對裝置上的操作者級別遠端執行    | "遠端裝置控制預設應視為不受信任的使用者存取"    |

## 並非設計上的漏洞

這些模式常被回報，除非顯示真正的邊界繞過，否則通常會結案不處理：

- 僅具提示詞注入的鏈，而無政策/身分驗證/沙盒繞過。
- 假設在一個共用主機/設定上進行惡意多租戶操作的聲稱。
- 將一般操作員讀取路徑存取（例如 `sessions.list`/`sessions.preview`/`chat.history`）分類為共用閘道設置中 IDOR 的聲明。
- 僅限本地主機部署的發現（例如僅限回環閘道上的 HSTS）。
- 針對此程式庫中不存在的入站路徑的 Discord 入站 Webhook 簽章發現。
- 將節點配對中繼資料視為 `system.run` 的隱藏第二層每指令審核層的報告，而實際執行邊界仍然是閘道的全域節點指令政策加上節點自身的執行審核。
- 將 `sessionKey` 視為驗證權杖的「缺少每個使用者授權」發現。

## 研究人員預檢清單

在建立 GHSA 之前，請驗證所有事項：

1. 問題重現仍適用於最新的 `main` 或最新版本。
2. 報告包含確切的路徑（`file`、函式、行範圍）以及經過測試的版本/提交。
3. 影響跨越了記錄在案的信任邊界（而不僅僅是提示注入）。
4. 該聲明未列於[範圍之外](https://github.com/openclaw/openclaw/blob/main/SECURITY.md#out-of-scope)中。
5. 已檢查現有公告以確認重複（適用時重複使用正式 GHSA）。
6. 部署假設是明確的（回環/本地對比暴露，受信任對比不受信任的操作員）。

## 60 秒內建立強化基準

首先使用此基準，然後針對受信任的代理程式選擇性重新啟用工具：

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

這會讓閘道保持僅限本地，隔離 DM，並預設停用控制平面/執行階段工具。

## 共用收件匣快速規則

如果不止一個人可以 DM 您的機器人：

- 設定 `session.dmScope: "per-channel-peer"`（或者針對多重帳戶通道設定 `"per-account-channel-peer"`）。
- 保留 `dmPolicy: "pairing"` 或嚴格的允許清單。
- 切勿將共用 DM 與廣泛的工具存取權結合使用。
- 這可以強化合作/共用收件匣，但當使用者共用主機/設定寫入權限時，並非設計為惡意共租隔離。

## 審計檢查項目（高層次）

- **入站存取**（DM 政策、群組政策、允許清單）：陌生人是否可以觸發機器人？
- **工具爆炸範圍**（提權工具 + 開放聊天室）：提示注入是否會轉變為 shell/檔案/網路動作？
- **執行審批漂移** (`security=full`, `autoAllowSkills`, 沒有 `strictInlineEval` 的直譯器允許清單)：主機執行防護措施是否仍在按您的預期運作？
- **網路暴露** (Gateway 綁定/身份驗證、Tailscale Serve/Funnel、弱/短身份驗證權杖)。
- **瀏覽器控制暴露** (遠端節點、中繼連接埠、遠端 CDP 端點)。
- **本機磁碟衛生** (權限、符號連結、組態包含、「同步資料夾」路徑)。
- **外掛程式** (擴充功能存在但無明確允許清單)。
- **原則漂移/錯誤設定** (已設定沙箱 docker 設定但沙箱模式已關閉；`gateway.nodes.denyCommands` 模式無效，因為比對僅限於確切的指令名稱 (例如 `system.run`) 且不檢查 shell 文字；危險的 `gateway.nodes.allowCommands` 項目；全域 `tools.profile="minimal"` 被各個代理程式的設定檔覆寫；在寬鬆工具原則下可存取擴充外掛工具)。
- **執行時期預期漂移** (例如，當 `tools.exec.host` 現在預設為 `auto` 時，仍假設隱式執行意味著 `sandbox`，或在沙箱模式關閉時明確設定 `tools.exec.host="sandbox"`)。
- **模型衛生** (當設定的模型看起來是舊版時發出警告；並非強制阻擋)。

如果您執行 `--deep`，OpenClaw 也會嘗試盡力進行即時 Gateway 探測。

## 憑證儲存對應表

在稽核存取權或決定要備份什麼時使用：

- **WhatsApp**： `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 機器人權杖**： config/env 或 `channels.telegram.tokenFile` (僅限一般檔案；拒絕符號連結)
- **Discord 機器人權杖**： config/env 或 SecretRef (env/file/exec 提供者)
- **Slack 權杖**： config/env (`channels.slack.*`)
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (預設帳戶)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (非預設帳戶)
- **模型身分驗證設定檔**： `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **檔案支援的秘密載荷 (選用)**： `~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**： `~/.openclaw/credentials/oauth.json`

## 安全性稽核檢查清單

當審計列印結果時，請將其視為優先順序：

1. **任何「開放」+ 已啟用工具**：首先鎖定 DM/群組（配對/允許清單），然後收緊工具策略/沙箱。
2. **公開網路暴露**（LAN 繫結、Funnel、缺少驗證）：立即修復。
3. **瀏覽器控制遠端暴露**：將其視為操作員存取（僅限 tailnet、刻意配對節點、避免公開暴露）。
4. **權限**：確保狀態/設定/憑證/驗證不是群組/全域可讀的。
5. **外掛/擴充功能**：僅載入您明確信任的項目。
6. **模型選擇**：對於任何具有工具的機器人，優先使用現代、經過指令強化的模型。

## 安全審計術語

您在實際部署中極有可能會看到的高訊號 `checkId` 值（非詳盡列表）：

| `checkId`                                                     | 嚴重性        | 為什麼重要                                                                | 主要修復金鑰/路徑                                                                                 | 自動修復 |
| ------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| `fs.state_dir.perms_world_writable`                           | 嚴重          | 其他使用者/程序可以修改完整的 OpenClaw 狀態                               | `~/.openclaw` 上的檔案系統權限                                                                    | 是       |
| `fs.config.perms_writable`                                    | 嚴重          | 其他人可以變更驗證/工具策略/設定                                          | `~/.openclaw/openclaw.json` 上的檔案系統權限                                                      | 是       |
| `fs.config.perms_world_readable`                              | 嚴重          | 設定可能會洩露權杖/設定                                                   | 設定檔上的檔案系統權限                                                                            | 是       |
| `gateway.bind_no_auth`                                        | 嚴重          | 沒有共用密鑰的遠端繫結                                                    | `gateway.bind`、`gateway.auth.*`                                                                  | 否       |
| `gateway.loopback_no_auth`                                    | 嚴重          | 反向代理的迴路可能變得未經驗證                                            | `gateway.auth.*`、代理設定                                                                        | 否       |
| `gateway.http.no_auth`                                        | 警告/嚴重     | 可透過 `auth.mode="none"` 存取的 Gateway HTTP API                         | `gateway.auth.mode`、`gateway.http.endpoints.*`                                                   | 否       |
| `gateway.tools_invoke_http.dangerous_allow`                   | 警告/嚴重     | 透過 HTTP API 重新啟用危險工具                                            | `gateway.tools.allow`                                                                             | 否       |
| `gateway.nodes.allow_commands_dangerous`                      | 警告/嚴重     | 啟用高影響的節點指令（相機/畫面/連絡人/行事曆/SMS）                       | `gateway.nodes.allowCommands`                                                                     | 否       |
| `gateway.tailscale_funnel`                                    | 嚴重          | 公開網際網路暴露                                                          | `gateway.tailscale.mode`                                                                          | 否       |
| `gateway.control_ui.allowed_origins_required`                 | 關鍵          | 非回環控制 UI，且未明確允許瀏覽器來源                                     | `gateway.controlUi.allowedOrigins`                                                                | 否       |
| `gateway.control_ui.host_header_origin_fallback`              | 警告/關鍵     | 啟用 Host 標頭來源回退（DNS 重新綁定強化降級）                            | `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`                                      | 否       |
| `gateway.control_ui.insecure_auth`                            | 警告          | 已啟用不安全驗證相容性切換開關                                            | `gateway.controlUi.allowInsecureAuth`                                                             | 否       |
| `gateway.control_ui.device_auth_disabled`                     | 關鍵          | 停用裝置身分檢查                                                          | `gateway.controlUi.dangerouslyDisableDeviceAuth`                                                  | 否       |
| `gateway.real_ip_fallback_enabled`                            | 警告/關鍵     | 信任 `X-Real-IP` 回退可能因為代理設定錯誤而啟用來源 IP 欺騙               | `gateway.allowRealIpFallback`, `gateway.trustedProxies`                                           | 否       |
| `discovery.mdns_full_mode`                                    | 警告/關鍵     | mDNS 完整模式會在區域網路上廣播 `cliPath`/`sshPort` 中繼資料              | `discovery.mdns.mode`, `gateway.bind`                                                             | 否       |
| `config.insecure_or_dangerous_flags`                          | 警告          | 已啟用任何不安全/危險的偵錯旗標                                           | 多個金鑰（請參閱發現詳情）                                                                        | 否       |
| `hooks.token_reuse_gateway_token`                             | 關鍵          | Hook ingress token 也會解鎖 Gateway 驗證                                  | `hooks.token`, `gateway.auth.token`                                                               | 否       |
| `hooks.token_too_short`                                       | 警告          | 對 hook ingress 進行暴力破解攻擊更容易                                    | `hooks.token`                                                                                     | 否       |
| `hooks.default_session_key_unset`                             | 警告          | Hook agent 執行會擴散為產生的每個請求工作階段                             | `hooks.defaultSessionKey`                                                                         | 否       |
| `hooks.allowed_agent_ids_unrestricted`                        | 警告/關鍵     | 已驗證的 hook 呼叫者可能路由到任何設定的代理程式                          | `hooks.allowedAgentIds`                                                                           | 否       |
| `hooks.request_session_key_enabled`                           | 警告/關鍵     | 外部呼叫者可以選擇 sessionKey                                             | `hooks.allowRequestSessionKey`                                                                    | 否       |
| `hooks.request_session_key_prefixes_missing`                  | 警告/關鍵     | 外部工作階段金鑰格式沒有限制                                              | `hooks.allowedSessionKeyPrefixes`                                                                 | 否       |
| `logging.redact_off`                                          | 警告          | 敏感值洩漏到日誌/狀態                                                     | `logging.redactSensitive`                                                                         | 是       |
| `sandbox.docker_config_mode_off`                              | 警告          | 存在 Sandbox Docker 設定但未啟用                                          | `agents.*.sandbox.mode`                                                                           | 否       |
| `sandbox.dangerous_network_mode`                              | 嚴重          | Sandbox Docker 網路使用 `host` 或 `container:*` namespace-join 模式       | `agents.*.sandbox.docker.network`                                                                 | 否       |
| `tools.exec.host_sandbox_no_sandbox_defaults`                 | 警告          | 當沙箱關閉時，`exec host=sandbox` 失效關閉                                | `tools.exec.host`, `agents.defaults.sandbox.mode`                                                 | 否       |
| `tools.exec.host_sandbox_no_sandbox_agents`                   | 警告          | 當沙箱關閉時，針對每個代理的 `exec host=sandbox` 失效關閉                 | `agents.list[].tools.exec.host`, `agents.list[].sandbox.mode`                                     | 否       |
| `tools.exec.security_full_configured`                         | 警告/嚴重     | 主機執行正以 `security="full"` 運作                                       | `tools.exec.security`, `agents.list[].tools.exec.security`                                        | 否       |
| `tools.exec.auto_allow_skills_enabled`                        | 警告          | 執行核准隱含信任技能分類                                                  | `~/.openclaw/exec-approvals.json`                                                                 | 否       |
| `tools.exec.allowlist_interpreter_without_strict_inline_eval` | 警告          | 直譯器許可清單允許內聯評估而無需強制重新核准                              | `tools.exec.strictInlineEval`, `agents.list[].tools.exec.strictInlineEval`, 執行核准許可清單      | 否       |
| `tools.exec.safe_bins_interpreter_unprofiled`                 | 警告          | `safeBins` 中沒有明確設定檔的直譯器/執行時分類會擴大執行風險              | `tools.exec.safeBins`, `tools.exec.safeBinProfiles`, `agents.list[].tools.exec.*`                 | 否       |
| `tools.exec.safe_bins_broad_behavior`                         | 警告          | `safeBins` 中的廣泛行為工具會削弱低風險 stdin-filter 信任模型             | `tools.exec.safeBins`, `agents.list[].tools.exec.safeBins`                                        | 否       |
| `skills.workspace.symlink_escape`                             | 警告          | 工作區 `skills/**/SKILL.md` 解析超出工作區根目錄（符號連結鏈漂移）        | 工作區 `skills/**` 檔案系統狀態                                                                   | 否       |
| `security.exposure.open_channels_with_exec`                   | 警告/嚴重     | 共享/公開房間可以連線到已啟用執行的代理                                   | `channels.*.dmPolicy`, `channels.*.groupPolicy`, `tools.exec.*`, `agents.list[].tools.exec.*`     | 否       |
| `security.exposure.open_groups_with_elevated`                 | 嚴重          | 公開群組 + 提昇權限的工具會建立高影響力的提示注入路徑                     | `channels.*.groupPolicy`, `tools.elevated.*`                                                      | 否       |
| `security.exposure.open_groups_with_runtime_or_fs`            | critical/warn | Open groups can reach command/file tools without sandbox/workspace guards | `channels.*.groupPolicy`, `tools.profile/deny`, `tools.fs.workspaceOnly`, `agents.*.sandbox.mode` | 否       |
| `security.trust_model.multi_user_heuristic`                   | warn          | Config looks multi-user while gateway trust model is personal-assistant   | split trust boundaries, or shared-user hardening (`sandbox.mode`, tool deny/workspace scoping)    | 否       |
| `tools.profile_minimal_overridden`                            | warn          | Agent overrides bypass global minimal profile                             | `agents.list[].tools.profile`                                                                     | 否       |
| `plugins.tools_reachable_permissive_policy`                   | warn          | Extension tools reachable in permissive contexts                          | `tools.profile` + tool allow/deny                                                                 | 否       |
| `models.small_params`                                         | critical/info | Small models + unsafe tool surfaces raise injection risk                  | model choice + sandbox/tool policy                                                                | 否       |

## Control UI over HTTP

The Control UI needs a **secure context** (HTTPS or localhost) to generate device
identity. `gateway.controlUi.allowInsecureAuth` is a local compatibility toggle:

- On localhost, it allows Control UI auth without device identity when the page
  is loaded over non-secure HTTP.
- It does not bypass pairing checks.
- It does not relax remote (non-localhost) device identity requirements.

Prefer HTTPS (Tailscale Serve) or open the UI on `127.0.0.1`.

For break-glass scenarios only, `gateway.controlUi.dangerouslyDisableDeviceAuth`
disables device identity checks entirely. This is a severe security downgrade;
keep it off unless you are actively debugging and can revert quickly.

`openclaw security audit` warns when this setting is enabled.

## Insecure or dangerous flags summary

`openclaw security audit` includes `config.insecure_or_dangerous_flags` when
known insecure/dangerous debug switches are enabled. That check currently
aggregates:

- `gateway.controlUi.allowInsecureAuth=true`
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
- `hooks.gmail.allowUnsafeExternalContent=true`
- `hooks.mappings[<index>].allowUnsafeExternalContent=true`
- `tools.exec.applyPatch.workspaceOnly=false`
- `plugins.entries.acpx.config.permissionMode=approve-all`

OpenClaw 組態架構中定義的完整 `dangerous*` / `dangerously*` 組態鍵：

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
- `channels.synology-chat.dangerouslyAllowNameMatching` (擴充通道)
- `channels.synology-chat.accounts.<accountId>.dangerouslyAllowNameMatching` (擴充通道)
- `channels.zalouser.dangerouslyAllowNameMatching` (擴充通道)
- `channels.irc.dangerouslyAllowNameMatching` (擴充通道)
- `channels.irc.accounts.<accountId>.dangerouslyAllowNameMatching` (擴充通道)
- `channels.mattermost.dangerouslyAllowNameMatching` (擴充通道)
- `channels.mattermost.accounts.<accountId>.dangerouslyAllowNameMatching` (擴充通道)
- `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
- `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowExternalBindSources`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

## 反向代理伺服器組態

如果您在反向代理伺服器後執行閘道，您應該組態 `gateway.trustedProxies` 以正確偵測用戶端 IP。

當閘道偵測到來自**不在** `trustedProxies` 中的位址的代理標頭時，它將**不**會將連線視為本地用戶端。如果停用閘道驗證，這些連線將會被拒絕。這可防止驗證繞過，否則代理連線會看起來像是來自本地主機並獲得自動信任。

```yaml
gateway:
  trustedProxies:
    - "127.0.0.1" # if your proxy runs on localhost
  # Optional. Default false.
  # Only enable if your proxy cannot provide X-Forwarded-For.
  allowRealIpFallback: false
  auth:
    mode: password
    password: ${OPENCLAW_GATEWAY_PASSWORD}
```

當組態 `trustedProxies` 時，閘道會使用 `X-Forwarded-For` 來判斷用戶端 IP。除非明確設定 `gateway.allowRealIpFallback: true`，否則預設會忽略 `X-Real-IP`。

良好的反向代理行為（覆寫傳入的轉送標頭）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良的反向代理行為（附加/保留不受信任的轉送標頭）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 和來源說明

- OpenClaw 閘道優先考慮本機/回送。如果您在反向代理終止 TLS，請在那裡的面向代理的 HTTPS 網域上設定 HSTS。
- 如果閘道本身終止 HTTPS，您可以設定 `gateway.http.securityHeaders.strictTransportSecurity` 從 OpenClaw 回應發出 HSTS 標頭。
- 詳細的部署指南請參閱[受信任的 Proxy 驗證](/en/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 對於非本地回環的 Control UI 部署，預設需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是一個明確允許所有瀏覽器來源的政策，而非強化的預設值。請在嚴密控制的本地測試之外避免使用它。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源後援模式；請將其視為危險的操作員選取政策。
- 請將 DNS 重新綁定 (DNS rebinding) 和 proxy-host 標頭行為視為部署強化事項；保持 `trustedProxies` 嚴格，並避免將閘道直接暴露於公共網際網路。

## 本地工作階段日誌儲存於磁碟上

OpenClaw 將工作階段逐字稿儲存在磁碟上的 `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下。
這是工作階段連續性以及（可選的）工作階段記憶體索引所必需的，但這也意味著
**任何具有檔案系統存取權的程序/使用者都可以讀取這些日誌**。請將磁碟存取權視為信任
邊界，並鎖定 `~/.openclaw` 的權限（請參閱下方的稽核部分）。如果您需要在代理程式之間
建立更強的隔離，請在個別的 OS 使用者或個別的主機上執行它們。

## 節點執行 (system.run)

如果已配對 macOS 節點，閘道可以在該節點上叫用 `system.run`。這是在 Mac 上的 **遠端程式碼執行**：

- 需要節點配對（核准 + 權杖）。
- 閘道節點配對並非逐次指令的核准介面。它用於建立節點身分/信任和權杖核發。
- 閘道透過 `gateway.nodes.allowCommands` / `denyCommands` 套用粗略的全域節點指令政策。
- 在 Mac 上透過 **設定 → 執行核准**（security + ask + allowlist）進行控制。
- 個別節點的 `system.run` 政策是節點自己的執行核准檔案 (`exec.approvals.node.*`)，它可以比閘道的全域指令 ID 政策更嚴格或更寬鬆。
- 批准模式綁定確切的請求上下文，並在可能時綁定一個具體的本機腳本/檔案操作數。如果 OpenClaw 無法為解譯器/執行時指令精確識別一個直接的本機檔案，將拒絕基於批准的執行，而不是保證完整的語義覆蓋。
- 如果您不想要遠端執行，請將安全性設為 **deny** 並移除該 Mac 的節點配對。

這種區別對於檢傷分類很重要：

- 如果 Gateway 全域政策和節點的本機執行批准仍然強制執行實際的執行邊界，則重新連接的配對節點通告不同的指令清單本身並不是漏洞。
- 將節點配對元資料視為第二個隱藏的逐指令批准層的報告，通常是政策/UX 混淆，而不是繞過安全性邊界。

## 動態技能 (watcher / 遠端節點)

OpenClaw 可以在會話中途更新技能清單：

- **Skills watcher**：對 `SKILL.md` 的變更可以在下一次代理轉向時更新技能快照。
- **Remote nodes**：連接 macOS 節點可以讓僅限 macOS 的技能變為可用（基於 bin probing）。

將技能資料夾視為 **受信任的程式碼** 並限制誰可以修改它們。

## 威脅模型

您的 AI 助手可以：

- 執行任意 shell 指令
- 讀寫檔案
- 存取網路服務
- 向任何人發送訊息（如果您授予 WhatsApp 存取權）

傳訊給您的人可以：

- 試圖誘騙您的 AI 做壞事
- 透過社交工程手段存取您的資料
- 探測基礎設施細節

## 核心概念：存取控制優先於智慧

這裡的大部分失敗都不是花哨的漏洞利用——它們是「有人傳訊給機器人，機器人就照他們說的做了」。

OpenClaw 的立場：

- **身分優先**：決定誰可以與機器人交談（DM 配對 / 允許清單 / 明確的「開放」）。
- **範圍次之**：決定允許機器人在何處運作（群組允許清單 + 提及閘道、工具、沙箱、裝置權限）。
- **模型最後**：假設模型可以被操縱；設計時要確保操縱的影響範圍有限。

## 指令授權模型

斜線指令和指令僅對 **授權發送者** 生效。授權源自
頻道允許清單/配對以及 `commands.useAccessGroups`（請參閱 [Configuration](/en/gateway/configuration)
和 [Slash commands](/en/tools/slash-commands)）。如果頻道允許清單為空白或包含 `"*"`，
該頻道的指令實際上即為開放。

`/exec` 僅供授權操作員在當前會話中使用。它**不**會寫入設定或
變更其他會話。

## 控制平面工具風險

有兩個內建工具可以進行永久性的控制平面變更：

- `gateway` 可以呼叫 `config.apply`、`config.patch` 和 `update.run`。
- `cron` 可以建立排程工作，這些工作會在原始聊天/任務結束後繼續執行。

對於任何處理不受信任內容的代理/介面，預設拒絕這些操作：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 僅封鎖重新啟動動作。它不會停用 `gateway` 設定/更新動作。

## 外掛程式/擴充功能

外掛程式與 Gateway **在相同行程** 中執行。請將其視為受信任的程式碼：

- 僅安裝來自您信任來源的外掛程式。
- 偏好使用明確的 `plugins.allow` 允許清單。
- 在啟用前審查外掛程式設定。
- 外掛程式變更後請重新啟動 Gateway。
- 如果您安裝外掛程式 (`openclaw plugins install <package>`)，請將其視為執行不受信任的程式碼：
  - 安裝路徑是現用外掛程式安裝根目錄下的個別外掛程式目錄。
  - OpenClaw 在安裝前會執行內建的危險程式碼掃描。`critical` 的發現結果預設會遭到封鎖。
  - OpenClaw 使用 `npm pack`，然後在該目錄中執行 `npm install --omit=dev`（npm 生命週期腳本可以在安裝期間執行程式碼）。
  - 偏好使用鎖定的精確版本 (`@scope/pkg@1.2.3`)，並在啟用前檢查磁碟上解壓縮的程式碼。
  - `--dangerously-force-unsafe-install` 僅用於內建掃描誤報的緊急情況。它不會繞過外掛程式 `before_install` Hook 政策封鎖，也不會繞過掃描失敗。
  - Gateway 支援的技能相依性安裝遵循相同的危險/可疑分割：內建 `critical` 發現會進行封鎖，除非呼叫端明確設定 `dangerouslyForceUnsafeInstall`，而可疑發現仍僅發出警告。`openclaw skills install` 保持為獨立的 ClawHub 技能下載/安裝流程。

詳細資訊：[外掛程式](/en/tools/plugin)

## DM 存取模型 (配對 / 允許清單 / 開放 / 已停用)

所有目前支援 DM 的通道都支援 DM 原則 (`dmPolicy` 或 `*.dm.policy`)，會在訊息處理**之前**阻擋傳入的 DM：

- `pairing` (預設)：未知發送者會收到簡短的配對碼，且機器人會忽略其訊息直到獲得核准。配對碼在 1 小時後過期；重複的 DM 在建立新要求之前不會重新傳送碼。待處理要求預設上限為每個通道 **3 個**。
- `allowlist`：未知發送者會被封鎖 (無配對交握)。
- `open`：允許任何人傳送 DM (公開)。**需要** 通道允許清單包含 `"*"` (明確加入)。
- `disabled`：完全忽略傳入的 DM。

透過 CLI 核准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

詳細資訊 + 磁碟上的檔案：[配對](/en/channels/pairing)

## DM 工作階段隔離 (多用戶模式)

根據預設，OpenClaw 會將**所有 DM 路由至主工作階段**，讓您的助理在裝置和通道之間保持連續性。如果**多人**可以傳送 DM 給機器人 (開放 DM 或多人允許清單)，請考慮隔離 DM 工作階段：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

這可以防止跨用戶內容洩漏，同時保持群組聊天隔離。

這是訊息內容邊界，而非主機管理邊界。如果用戶互為對立且共用相同的 Gateway 主機/設定，請改為每個信任邊界執行個別的 Gateway。

### 安全 DM 模式 (建議)

請將上述程式碼片段視為**安全 DM 模式**：

- 預設值：`session.dmScope: "main"` (所有 DM 共用一個工作階段以保持連續性)。
- 本機 CLI 入門預設值：若未設定則寫入 `session.dmScope: "per-channel-peer"` (保留現有的明確值)。
- 安全 DM 模式：`session.dmScope: "per-channel-peer"` (每個通道+發送者組合都會獲得隔離的 DM 內容)。
- 跨通道對等隔離： `session.dmScope: "per-peer"` （每個發送者在所有相同類型的通道中獲得一個會話）。

如果您在同一個通道上運行多個帳戶，請改用 `per-account-channel-peer` 。如果同一個人通過多個通道聯繫您，請使用 `session.identityLinks` 將這些 DM 會話合併為一個規範身份。請參閱[會話管理](/en/concepts/session)和[配置](/en/gateway/configuration)。

## 允許名單（DM + 群組）- 術語

OpenClaw 有兩個獨立的「誰可以觸發我？」層級：

- **DM 允許名單**（ `allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom` ；舊版： `channels.discord.dm.allowFrom` ， `channels.slack.dm.allowFrom` ）：誰被允許在直接訊息中與機器人對話。
  - 當 `dmPolicy="pairing"` 時，批准會寫入帳戶範圍的配對允許名單存儲中的 `~/.openclaw/credentials/` 下（預設帳戶為 `<channel>-allowFrom.json` ，非預設帳戶為 `<channel>-<accountId>-allowFrom.json` ），並與配置允許名單合併。
- **群組允許名單**（通道特定）：機器人將從哪些群組/通道/公會接受訊息。
  - 常見模式：
    - `channels.whatsapp.groups` 、 `channels.telegram.groups` 、 `channels.imessage.groups` ：每個群組的預設值，例如 `requireMention` ；設定後，它也充當群組允許名單（包含 `"*"` 以保持允許所有行為）。
    - `groupPolicy="allowlist"` + `groupAllowFrom` ：限制誰可以在群組會話*內部*觸發機器人（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）。
    - `channels.discord.guilds` / `channels.slack.channels` ：每個表面的允許名單 + 提及預設值。
  - 群組檢查按此順序運行： `groupPolicy` /群組允許名單優先，提及/回覆激活其次。
  - 回覆機器人訊息（隱式提及）**不**會繞過像 `groupAllowFrom` 這樣的發送者允許名單。
  - **安全性提示：** 請將 `dmPolicy="open"` 和 `groupPolicy="open"` 視為最後手段的設定。應極少使用它們；除非您完全信任房間中的每個成員，否則優先使用配對 + 許可清單。

詳情：[設定](/en/gateway/configuration) 和 [群組](/en/channels/groups)

## 提示注入（它是什麼，為什麼重要）

提示注入是指攻擊者製作一則訊息，操縱模型執行不安全的操作（例如「忽略你的指令」、「傾印你的檔案系統」、「跟隨此連結並執行命令」等）。

即使有強大的系統提示詞，**提示注入仍未解決**。系統提示詞防護僅屬軟性指引；強制執行來自工具政策、執行核可、沙盒機制和頻道許可清單（而操作者可依設計停用這些機制）。實務上有效的作法：

- 保持傳入的私人訊息處於鎖定狀態（配對/許可清單）。
- 在群組中偏好使用提及閘門；避免在公開房間中使用「始終開啟」的機器人。
- 預設將連結、附件和貼上的指令視為惡意。
- 在沙盒中執行敏感的工具執行；將機密資訊遠離代理程式可存取的檔案系統。
- 注意：沙盒機制為選用功能。如果沙盒模式關閉，隱含的 `host=auto` 會解析為閘道主機。明確的 `host=sandbox` 仍會以失敗封閉，因為沒有可用的沙盒執行環境。如果您希望在設定中明確表達此行為，請設定 `host=gateway`。
- 將高風險工具（`exec`、`browser`、`web_fetch`、`web_search`）限制為僅限受信任的代理程式或明確的許可清單。
- 如果您將直譯器列入許可清單（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`），請啟用 `tools.exec.strictInlineEval`，以便內嵌評估表單仍需明確批准。
- **模型選擇很重要：** 舊型/較小/舊版模型對於提示詞注入和工具誤用的防禦能力明顯較弱。對於啟用工具的代理，請使用可用的最強最新一代且經過指令強化的模型。

應視為不可信賴的危險信號：

- 「讀取此檔案/URL 並完全照做。」
- 「無視你的系統提示詞或安全規則。」
- 「揭露你的隱藏指令或工具輸出。」
- 「貼上 ~/.openclaw 或你日誌的完整內容。」

## 不安全的外部內容繞過標誌

OpenClaw 包含明確的繞過標誌，可停用外部內容安全包裝：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron payload 欄位 `allowUnsafeExternalContent`

指引：

- 在生產環境中保持未設定或設為 false。
- 僅針對範圍嚴格限定的除錯暫時啟用。
- 如果啟用，請隔離該代理（沙盒 + 最少工具 + 專用會話命名空間）。

Hook 風險提示：

- Hook payload 是不可信賴的內容，即使傳遞來源來自您控制的系統（郵件/文件/網頁內容可能攜帶提示詞注入）。
- 弱勢模型層級會增加此風險。對於 Hook 驅動的自動化，建議使用強大的現代模型層級，並保持嚴格的工具政策（`tools.profile: "messaging"` 或更嚴格），並在可行情況下進行沙盒隔離。

### 提示詞注入不需要公開的 DM

即使**只有您**能傳訊給機器人，提示詞注入仍可能透過
機器人讀取的任何**不可信賴內容**發生（網頁搜尋/擷取結果、瀏覽器頁面、
電子郵件、文件、附件、貼上的日誌/程式碼）。換句話說：發送者並非
唯一的威脅面向；**內容本身**可能攜帶惡意指令。

當啟用工具時，典型風險是洩漏語境或觸發
工具呼叫。透過以下方式減少爆炸半徑：

- 使用唯讀或停用工具的 **reader agent** 來摘要不可信賴內容，
  然後將摘要傳遞給您的主要代理。
- 除非必要，否則對於啟用工具的代理，請保持 `web_search` / `web_fetch` / `browser` 關閉。
- 對於 OpenResponses URL 輸入 (`input_file` / `input_image`)，請設定嚴格的
  `gateway.http.endpoints.responses.files.urlAllowlist` 和
  `gateway.http.endpoints.responses.images.urlAllowlist`，並將 `maxUrlParts` 保持在低位。
  空的白名單會被視為未設定；如果您想完全停用 URL 擷取，請使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 為任何接觸未受信任輸入的代理程式啟用沙箱並設定嚴格的工具白名單。
- 避免在提示詞中洩露機密；改透過閘道主機上的 env/config 來傳遞它們。

### 模型強度 (安全性備註)

對提示詞注入的抵抗力在各個模型層級中並**不**一致。較小/較便宜的模型通常更容易受到工具濫用和指令劫持，尤其是在面對惡意提示詞時。

<Warning>對於啟用工具的代理程式或讀取未受信任內容的代理程式，使用較舊/較小的模型時，提示詞注入的風險通常過高。請勿在弱勢的模型層級上執行這些工作負載。</Warning>

建議：

- **使用最新世代、最高階的模型**來執行任何可以執行工具或存取檔案/網路的機器人。
- **請勿針對啟用工具的代理程式或未受信任的收件匣使用較舊/較弱/較小的層級**；提示詞注入的風險太高。
- 如果您必須使用較小的模型，**請降低爆炸半徑** (唯讀工具、強力沙箱、最小檔案系統存取權、嚴格白名單)。
- 執行小型模型時，**請為所有階段作業啟用沙箱**，並**停用 web_search/web_fetch/browser**，除非輸入受到嚴格控制。
- 對於僅限聊天且輸入受信任且無工具的個人助理，使用較小的模型通常沒問題。

<a id="reasoning-verbose-output-in-groups"></a>

## 群組中的推理與詳細輸出

`/reasoning` 和 `/verbose` 可能會暴露不打算在公開頻道中發布的內部推理或工具輸出。
在群組設定中，請將它們視為**僅限偵錯**使用，除非您明確需要，否則請保持關閉。

指引：

- 在公開房間中，請保持 `/reasoning` 和 `/verbose` 停用。
- 如果您啟用它們，請僅在受信任的私人訊息或嚴格控制的房間中進行。
- 請記住：詳細輸出可能包含工具引數、URL 和模型看到的資料。

## 設定強化 (範例)

### 0) 檔案權限

保持閘道主機上的設定與狀態為私有：

- `~/.openclaw/openclaw.json`: `600` (僅限使用者讀寫)
- `~/.openclaw`: `700` (僅限使用者)

`openclaw doctor` 可以發出警告並提供加嚴這些權限的選項。

### 0.4) 網路暴露 (bind + port + firewall)

閘道在單一埠上多工傳輸 **WebSocket + HTTP**：

- 預設值：`18789`
- 設定/旗標/環境變數：`gateway.port`、`--port`、`OPENCLAW_GATEWAY_PORT`

此 HTTP 表面包含控制 UI 和 canvas 主機：

- 控制 UI (SPA 資產) (預設基底路徑 `/`)
- Canvas 主機：`/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` (任意 HTML/JS；請視為不受信任的內容)

如果您在一般瀏覽器中載入 canvas 內容，請將其視為任何其他不受信任的網頁：

- 不要將 canvas 主機暴露給不受信任的網路/使用者。
- 除非您完全了解其含義，否則不要讓 canvas 內容與具有權限的網路表面共用相同的來源 (origin)。

綁定模式控制閘道的監聽位置：

- `gateway.bind: "loopback"` (預設值)：只有本機用戶端可以連線。
- 非回環綁定 (`"lan"`、`"tailnet"`、`"custom"`) 會擴大攻擊表面。僅在搭配共享權杖/密碼和真正的防火牆時使用它們。

經驗法則：

- 優先使用 Tailscale Serve 而非區域網路綁定 (Serve 會將閘道保持在回環位址上，並由 Tailscale 處理存取)。
- 如果您必須綁定到區域網路，請將該埠的防火牆設定為僅允許嚴格的來源 IP 白名單；請勿廣泛進行埠轉發。
- 切勿在未經驗證的情況下，於 `0.0.0.0` 上暴露閘道。

### 0.4.1) Docker 埠發布 + UFW (`DOCKER-USER`)

如果您在 VPS 上使用 Docker 執行 OpenClaw，請記住已發布的容器埠
(`-p HOST:CONTAINER` 或 Compose `ports:`) 是透過 Docker 的轉發
鏈進行路由，而不僅是主機 `INPUT` 規則。

為了讓 Docker 流量與您的防火牆策略保持一致，請在 `DOCKER-USER` 中強制執行規則（此鏈在 Docker 自己的接受規則之前評估）。
在許多現代發行版中，`iptables`/`ip6tables` 使用 `iptables-nft` 前端
並且仍然將這些規則應用於 nftables 後端。

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

IPv6 有單獨的表。如果啟用了 Docker IPv6，請在 `/etc/ufw/after6.rules` 中添加匹配的策略。

避免在文檔片段中硬編碼介面名稱，如 `eth0`。介面名稱
因 VPS 映像而異（`ens3`、`enp*` 等），不匹配可能會意外
跳過您的拒絕規則。

重新加載後的快速驗證：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

預期的外部端口應該只是您有意暴露的內容（對於大多數
設置：SSH + 您的反向代理端口）。

### 0.4.2) mDNS/Bonjour 發現（資訊洩露）

閘道透過 mDNS（埠 5353 上的 `_openclaw-gw._tcp`）廣播其存在，以便進行本機裝置發現。在完整模式下，這包括可能暴露操作細節的 TXT 記錄：

- `cliPath`：CLI 二進位檔案的完整檔案系統路徑（揭示使用者名稱和安裝位置）
- `sshPort`：通告主機上 SSH 的可用性
- `displayName`、`lanHost`：主機名資訊

**操作安全考量：** 廣播基礎設施細節會讓本機網路上的任何人都更容易進行偵察。即使是檔案系統路徑和 SSH 可用性等「無害」資訊也有助於攻擊者繪製您的環境圖。

**建議：**

1. **最小模式**（預設，建議用於暴露的閘道）：從 mDNS 廣播中省略敏感欄位：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

2. **完全停用**，如果您不需要本機裝置發現：

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

4. **環境變數**（替代方案）：設定 `OPENCLAW_DISABLE_BONJOUR=1` 以在不更改設定的情況下停用 mDNS。

在最小模式下，閘道仍廣播足夠的資訊供裝置探索 (`role`、`gatewayPort`、`transport`)，但會省略 `cliPath` 和 `sshPort`。需要 CLI 路徑資訊的應用程式可以透過已驗證的 WebSocket 連線來擷取。

### 0.5) 鎖定閘道 WebSocket (本機驗證)

閘道驗證**預設為必要**。如果未配置 token/密碼，
閘道會拒絕 WebSocket 連線 (失效關閉)。

入門 預設會產生 token (即使對於 loopback)，因此
本機用戶端必須進行驗證。

設定 token，讓**所有** WS 用戶端都必須驗證：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以為您產生一個：`openclaw doctor --generate-gateway-token`。

注意：`gateway.remote.token` / `.password` 是用戶端憑證來源。它們
本身並**不**保護本機 WS 存取。
本機呼叫路徑僅在未設定 `gateway.auth.*` 時，才能
使用 `gateway.remote.*` 作為後備。
如果 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef
明確配置但未解析，解析會失效關閉 (沒有遠端後備遮罩)。
選用：使用 `wss://` 時，用 `gateway.remote.tlsFingerprint` 固定遠端 TLS。
純文字 `ws://` 預設僅限 loopback。對於受信任的私人網路
路徑，在用戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為應急手段。

本機裝置配對：

- 裝置配對對於**本機**連線 (loopback 或
  閘道主機自己的 tailnet 位址) 會自動核准，以保持同主機用戶端流暢。
- 其他 tailnet 端點**不**被視為本機；它們仍然需要配對
  核准。

驗證模式：

- `gateway.auth.mode: "token"`：共享 bearer token (推薦用於大多數設定)。
- `gateway.auth.mode: "password"`：密碼驗證 (建議透過 env 設定：`OPENCLAW_GATEWAY_PASSWORD`)。
- `gateway.auth.mode: "trusted-proxy"`：信任具備身分感知的反向代理來驗證使用者，並透過標頭傳遞身分 (請參閱 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth))。

輪換檢查清單 (token/密碼)：

1. 產生/設定一個新的金鑰 (`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`)。
2. 重新啟動 Gateway（如果 Gateway 由 macOS 應用程式監管，則請重新啟動該應用程式）。
3. 更新任何遠端用戶端（呼叫 Gateway 的機器上的 `gateway.remote.token` / `.password`）。
4. 驗證您已無法使用舊的憑證進行連線。

### 0.6) Tailscale Serve 身分標頭

當 `gateway.auth.allowTailscale` 為 `true`（Serve 的預設值）時，OpenClaw
會接受 Tailscale Serve 身分標頭 (`tailscale-user-login`) 用於控制
UI/WebSocket 驗證。OpenClaw 會透過本機 Tailscale 守護程式 (`tailscale whois`)
解析 `x-forwarded-for` 位址並將其與標頭進行比對，以此來驗證身分。這僅針對命中 loopback
且包含 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 的請求觸發。
HTTP API 端點（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
仍需要 token/密碼驗證。

重要的邊界說明：

- Gateway HTTP bearer 驗證實際上就是全有或全無的操作員存取權。
- 請將能夠呼叫 `/v1/chat/completions`、`/v1/responses` 或 `/api/channels/*` 的憑證視為該 gateway 的完全存取操作員金鑰。
- 在 OpenAI 相容的 HTTP 層面上，共享金鑰 bearer 驗證會恢復 agent 輪次的完整預設操作員範圍和擁有者語意；較狹窄的 `x-openclaw-scopes` 值並不會減少該共享金鑰路徑的權限。
- HTTP 上的每次請求範圍語意僅在請求是來自具有身分的模式（例如受信任的 proxy 驗證或私有入口上的 `gateway.auth.mode="none"`）時才會套用。
- `/tools/invoke` 遵循相同的共享金鑰規則：token/密碼 bearer 驗證在那裡也被視為完整的操作員存取權，而具有身分的模式仍會遵守宣告的範圍。
- 請勿與不受信任的呼叫者分享這些憑證；建議每個信任邊界使用獨立的 gateway。

**信任假設：** 無 Token Serve 驗證假設 Gateway 主機是受信任的。
不要將其視為針對同主機惡意進程的保護。如果 Gateway 主機上可能運行不受信任的
本地代碼，請禁用 `gateway.auth.allowTailscale`
並要求使用 Token/密碼驗證。

**安全規則：** 不要從您自己的反向代理轉發這些標頭。如果您
在 Gateway 前端終止 TLS 或進行代理，請禁用
`gateway.auth.allowTailscale` 並改用 Token/密碼驗證（或 [受信任代理驗證](/en/gateway/trusted-proxy-auth)）。

受信任代理：

- 如果您在 Gateway 前端終止 TLS，請將 `gateway.trustedProxies` 設置為您的代理 IP。
- OpenClaw 將信任來自這些 IP 的 `x-forwarded-for`（或 `x-real-ip`）以確定客戶端 IP，用於本地配對檢查和 HTTP 驗證/本地檢查。
- 確保您的代理 **覆蓋** `x-forwarded-for` 並阻止對 Gateway 端口的直接訪問。

參見 [Tailscale](/en/gateway/tailscale) 和 [Web 概述](/en/web)。

### 0.6.1) 通過節點主機控制瀏覽器（推薦）

如果您的 Gateway 是遠程的，但瀏覽器在另一台機器上運行，請在瀏覽器機器上運行 **節點主機**
並讓 Gateway 代理瀏覽器操作（參見 [瀏覽器工具](/en/tools/browser)）。
將節點配對視為管理員訪問權限。

推薦模式：

- 將 Gateway 和節點主機保持在同一個 tailnet (Tailscale) 中。
- 有意地配對節點；如果您不需要瀏覽器代理路由，請將其禁用。

避免：

- 通過 LAN 或公共網際網路暴露中繼/控制端口。
- 對瀏覽器控制端點使用 Tailscale Funnel（公開暴露）。

### 0.7) 磁盤上的機密（敏感數據）

假設 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何內容可能包含機密或私有數據：

- `openclaw.json`：配置可能包含 Tokens (gateway, remote gateway)、提供商設置和允許列表。
- `credentials/**`：通道憑證（例如：WhatsApp 憑證）、配對允許列表、舊版 OAuth 導入。
- `agents/<agentId>/agent/auth-profiles.json`：API 密鑰、Token 配置文件、OAuth Tokens 以及可選的 `keyRef`/`tokenRef`。
- `secrets.json` (可選)：由 `file` SecretRef 提供程式使用的檔案支援機密載荷 (`secrets.providers`)。
- `agents/<agentId>/agent/auth.json`：舊版相容性檔案。發現靜態 `api_key` 條目時會將其清除。
- `agents/<agentId>/sessions/**`：會話記錄 (`*.jsonl`) + 路由元資料 (`sessions.json`)，可能包含私人訊息和工具輸出。
- 打包的外掛程式套件：已安裝的外掛程式 (及其 `node_modules/`)。
- `sandboxes/**`：工具沙箱工作區；可能會累積您在沙箱內讀寫的檔案副本。

加固提示：

- 嚴格保持權限 (目錄設定 `700`，檔案設定 `600`)。
- 在 Gateway 主機上使用全碟加密。
- 如果主機共享，Gateway 優先使用專用的 OS 使用者帳戶。

### 0.8) 日誌 + 記錄 (編輯 + 保留)

即使存取控制正確，日誌和記錄也可能洩露敏感資訊：

- Gateway 日誌可能包含工具摘要、錯誤和 URL。
- 會話記錄可能包含貼上的機密、檔案內容、指令輸出和連結。

建議：

- 保持工具摘要編輯開啟 (`logging.redactSensitive: "tools"`；預設值)。
- 透過 `logging.redactPatterns` 為您的環境新增自訂模式 (Token、主機名稱、內部 URL)。
- 分享診斷資訊時，優先使用 `openclaw status --all` (可貼上，機密已編輯) 而非原始日誌。
- 如果您不需要長期保留，請修剪舊的會話記錄和日誌檔案。

詳細資訊：[日誌記錄](/en/gateway/logging)

### 1) 私訊 (DM)：預設配對

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

在群組聊天中，僅在被明確提及時才回應。

### 3) 分開的號碼 (WhatsApp、Signal、Telegram)

對於基於電話號碼的管道，請考慮在與您個人號碼分開的電話號碼上執行您的 AI：

- 個人號碼：您的對話保持私密
- Bot 號碼：AI 處理這些，並設有適當的邊界

### 4) 唯讀模式 (透過沙箱 + 工具)

您可以透過組合以下內容來建立唯讀設定檔：

- `agents.defaults.sandbox.workspaceAccess: "ro"`（或者如果無工作區存取權限則使用 `"none"`）
- 封鎖 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允許/拒絕清單。

額外的加固選項：

- `tools.exec.applyPatch.workspaceOnly: true`（預設值）：確保即使關閉沙箱，`apply_patch` 也無法在工作區目錄之外寫入/刪除。僅在您故意希望 `apply_patch` 存取工作區以外的檔案時，才將其設定為 `false`。
- `tools.fs.workspaceOnly: true`（可選）：將 `read`/`write`/`edit`/`apply_patch` 路徑和原生提示圖片自動載入路徑限制在工作區目錄內（如果您目前允許絕對路徑並希望設置單一防護措施，這很有用）。
- 保持檔案系統根目錄狹窄：避免為代理工作區/沙箱工作區設定像家目錄這樣寬泛的根目錄。寬泛的根目錄可能會將敏感的本機檔案（例如 `~/.openclaw` 下的狀態/配置）暴露給檔案系統工具。

### 5) 安全基線（複製/貼上）

一個讓 Gateway 保持私有、需要 DM 配對並避免常開群組機器人的「安全預設」配置：

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

如果您也想要「預設更安全」的工具執行，請為任何非擁有者的代理添加沙箱並拒絕危險工具（「每個代理存取配置檔」下的示例如下）。

聊天驅動代理輪次的內建基線：非擁有者發送者無法使用 `cron` 或 `gateway` 工具。

## 沙箱機制（推薦）

專用文件：[沙箱機制](/en/gateway/sandboxing)

兩種互補的方法：

- **在 Docker 中執行完整的 Gateway**（容器邊界）：[Docker](/en/install/docker)
- **工具沙箱**（`agents.defaults.sandbox`，主機 Gateway + Docker 隔離工具）：[沙箱機制](/en/gateway/sandboxing)

注意：為了防止跨代理存取，請將 `agents.defaults.sandbox.scope` 保持為 `"agent"`（預設值）或 `"session"` 以進行更嚴格的每會話隔離。`scope: "shared"` 使用單一容器/工作區。

同時請考慮沙箱內的代理工作區存取權限：

- `agents.defaults.sandbox.workspaceAccess: "none"`（預設值）會限制代理工作區，無法被存取；工具會在 `~/.openclaw/sandboxes` 下的沙箱工作區中執行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 會將代理工作區以唯讀方式掛載於 `/agent`（停用 `write`/`edit`/`apply_patch`）
- `agents.defaults.sandbox.workspaceAccess: "rw"` 會將代理工作區以讀寫方式掛載於 `/workspace`

重要提示：`tools.elevated` 是在主機上執行 exec 的全域基準緊急出口。請嚴格控制 `tools.elevated.allowFrom`，不要對陌生人開啟。您可以透過 `agents.list[].tools.elevated` 進一步限制各個代理的提升權限。請參閱[提升模式](/en/tools/elevated)。

### 子代理委派防護措施

如果您允許會話工具，請將委派的子代理執行視為另一個邊界決策：

- 拒絕 `sessions_spawn`，除非代理確實需要委派功能。
- 將 `agents.list[].subagents.allowAgents` 限制在已知安全的目標代理。
- 對於任何必須保持在沙箱中的工作流程，請使用 `sandbox: "require"` 呼叫 `sessions_spawn`（預設為 `inherit`）。
- 當目標子執行時期未處於沙箱狀態時，`sandbox: "require"` 會快速失敗。

## 瀏覽器控制風險

啟用瀏覽器控制會賦予模型驅動真實瀏覽器的能力。
如果該瀏覽器設定檔已包含登入的工作階段，模型就能夠
存取這些帳號和資料。請將瀏覽器設定檔視為**敏感狀態**：

- 建議為代理使用專用的設定檔（預設的 `openclaw` 設定檔）。
- 避免讓代理指向您的個人日常使用設定檔。
- 對於處於沙箱中的代理，除非您信任它們，否則請保持主機瀏覽器控制為停用狀態。
- 將瀏覽器下載視為不受信任的輸入；優先使用獨立的下載目錄。
- 如果可能的話，在代理配置檔案中停用瀏覽器同步/密碼管理器（以減少影響範圍）。
- 對於遠端閘道，假設「瀏覽器控制」等同於對該配置檔案所能存取的任何內容的「操作員存取權」。
- 將閘道和節點主機保持在 tailnet 專用模式；避免將瀏覽器控制埠暴露給區域網路或公共網際網路。
- 當不需要時，請停用瀏覽器代理路由 (`gateway.nodes.browser.mode="off"`)。
- Chrome MCP 現有會話模式**並不**「更安全」；它可以代表您在該主機 Chrome 設定檔所能存取的任何地方進行操作。

### 瀏覽器 SSRF 政策（trusted-network 預設值）

OpenClaw 的瀏覽器網路政策預設為受信任操作員模型：除非您明確停用，否則允許存取私有/內部目的地。

- 預設值：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`（未設定時隱含此設定）。
- 舊版別名：`browser.ssrfPolicy.allowPrivateNetwork` 仍為相容性而被接受。
- 嚴格模式：設定 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: false` 以預設封鎖私有/內部/特殊用途目的地。
- 在嚴格模式下，使用 `hostnameAllowlist`（模式如 `*.example.com`）和 `allowedHostnames`（精確主機例外，包括被封鎖的名稱如 `localhost`）來指定例外。
- 會在請求前檢查導航，並在導航後盡力重新檢查最終的 `http(s)` URL，以減少基於重新導向的樞軸攻擊。

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

## 每個代理的存取設定檔（多代理）

透過多代理路由，每個代理都可以有自己的沙箱 + 工具政策：
使用此功能為每個代理提供 **完整存取權**、**唯讀** 或 **無存取權**。
請參閱 [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) 以取得完整細節
和優先順序規則。

常見使用案例：

- 個人代理：完整存取權，無沙箱
- 家庭/工作代理：沙箱化 + 唯讀工具
- 公開代理：沙箱化 + 無檔案系統/Shell 工具

### 範例：完整存取權（無沙箱）

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

## 告訴您的 AI 什麼

在您代理的系統提示詞中加入安全性準則：

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

1. **停止它：** 停止 macOS 應用程式（如果它監管 Gateway）或終止您的 `openclaw gateway` 程序。
2. **關閉暴露：** 設置 `gateway.bind: "loopback"`（或停用 Tailscale Funnel/Serve），直到您了解發生了什麼。
3. **凍結存取：** 將有風險的私訊/群組切換到 `dmPolicy: "disabled"` / 要求提及，並移除 `"*"` 允許所有的條目（如果您設置了它們）。

### 輪換（如果機密洩露則假設已被入侵）

1. 輪換 Gateway 認證 (`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`) 並重新啟動。
2. 在任何可以呼叫 Gateway 的機器上輪換遠端客戶端機密 (`gateway.remote.token` / `.password`)。
3. 輪換供應商/API 憑證（WhatsApp 憑證、Slack/Discord Token、`auth-profiles.json` 中的模型/API 金鑰，以及使用時的加密機密 Payload 值）。

### 稽核

1. 檢查 Gateway 日誌：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 檢視相關的對話紀錄：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 檢視最近的設定變更（任何可能擴大存取權的項目：`gateway.bind`、`gateway.auth`、dm/group 原則、`tools.elevated`、外掛程式變更）。
4. 重新執行 `openclaw security audit --deep` 並確認關鍵發現已解決。

### 收集以用於報告

- 時間戳記、Gateway 主機 OS + OpenClaw 版本
- 會話對話紀錄 + 簡短的日誌尾部（編輯後）
- 攻擊者發送的內容 + 代理執行的操作
- Gateway 是否暴露於 loopback 之外（LAN/Tailscale Funnel/Serve）

## 機密掃描 (detect-secrets)

CI 在 `secrets` 任務中執行 `detect-secrets` pre-commit hook。
推送到 `main` 總是執行全檔案掃描。當有基礎提交可用時，Pull requests 使用變更檔案的
快速路徑，否則回退到全檔案掃描。
如果失敗，表示有新的候選項目不在基準中。

### 如果 CI 失敗

1. 在本機重現：

   ```bash
   pre-commit run --all-files detect-secrets
   ```

2. 了解工具：
   - pre-commit 中的 `detect-secrets` 會使用倉庫的
     基準和排除項目來執行 `detect-secrets-hook`。
   - `detect-secrets audit` 會開啟互動式審查，將每個基準
     項目標記為實際風險或誤報。
3. 對於實際的機密：輪換或移除它們，然後重新執行掃描以更新基準。
4. 對於誤報：執行互動式審查並將其標記為誤報：

   ```bash
   detect-secrets audit .secrets.baseline
   ```

5. 如果您需要新的排除項，請將其新增至 `.detect-secrets.cfg` 並使用相符的 `--exclude-files` / `--exclude-lines` 標誌重新產生
   基準（設定檔
   僅供參考；detect-secrets 不會自動讀取它）。

當更新的 `.secrets.baseline` 反映了預期狀態後，請提交它。

## 回報安全性問題

在 OpenClaw 中發現了漏洞？請負責任地回報：

1. 電子郵件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修復之前不要公開發布
3. 我們會將功勞歸於您（除非您希望保持匿名）
