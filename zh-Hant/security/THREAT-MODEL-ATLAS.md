---
title: "威脅模型 (MITRE ATLAS)"
summary: "對應至 MITRE ATLAS 架構的 OpenClaw 威脅模型"
read_when:
  - 檢閱安全態勢或威脅情境時
  - 處理安全功能或審計回應時
---

# OpenClaw 威脅模型 v1.0

## MITRE ATLAS 架構

**版本：** 1.0-draft
**最後更新：** 2026-02-04
**方法：** MITRE ATLAS + 資料流程圖
**架構：** [MITRE ATLAS](https://atlas.mitre.org/) (AI 系統的對手威脅全景)

### 架構歸屬

此威脅模型基於 [MITRE ATLAS](https://atlas.mitre.org/) 建構，這是記錄 AI/ML 系統對手威脅的業界標準架構。ATLAS 由 [MITRE](https://www.mitre.org/) 與 AI 安全社群共同維護。

**主要 ATLAS 資源：**

- [ATLAS 技術](https://atlas.mitre.org/techniques/)
- [ATLAS 戰術](https://atlas.mitre.org/tactics/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [ATLAS GitHub](https://github.com/mitre-atlas/atlas-data)
- [貢獻 ATLAS](https://atlas.mitre.org/resources/contribute)

### 貢獻此威脅模型

這是一份由 OpenClaw 社群維護的持續更新文件。請參閱 [CONTRIBUTING-THREAT-MODEL.md](/zh-Hant/security/CONTRIBUTING-THREAT-MODEL) 以了解貢獻準則：

- 回報新威脅
- 更新現有威脅
- 提出攻擊鏈
- 建議緩解措施

---

## 1. 簡介

### 1.1 目的

此威脅模型使用專為 AI/ML 系統設計的 MITRE ATLAS 架構，記錄了 OpenClaw AI 代理程式平台與 ClawHub 技能市集的對手威脅。

### 1.2 範圍

| 組件              | 包含 | 備註                                            |
| ---------------------- | -------- | ------------------------------------------------ |
| OpenClaw 代理程式執行時 | 是      | 核心代理程式執行、工具呼叫、工作階段       |
| 閘道                | 是      | 驗證、路由、管道整合     |
| 管道整合   | 是      | WhatsApp、Telegram、Discord、Signal、Slack 等 |
| ClawHub 市集    | 是      | 技能發布、審核、分發       |
| MCP 伺服器            | 是      | 外部工具提供者                          |
| 使用者裝置           | 部分  | 行動應用程式、桌面客戶端                     |

### 1.3 範圍外

此威脅模型未明確排除任何範圍。

---

## 2. 系統架構

### 2.1 信任邊界

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  WhatsApp   │  │  Telegram   │  │   Discord   │  ...         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
└─────────┼────────────────┼────────────────┼──────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 1: Channel Access                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      GATEWAY                              │   │
│  │  • Device Pairing (30s grace period)                      │   │
│  │  • AllowFrom / AllowList validation                       │   │
│  │  • Token/Password/Tailscale auth                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 2: Session Isolation              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   AGENT SESSIONS                          │   │
│  │  • Session key = agent:channel:peer                       │   │
│  │  • Tool policies per agent                                │   │
│  │  • Transcript logging                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 3: Tool Execution                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  EXECUTION SANDBOX                        │   │
│  │  • Docker sandbox OR Host (exec-approvals)                │   │
│  │  • Node remote execution                                  │   │
│  │  • SSRF protection (DNS pinning + IP blocking)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 4: External Content               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FETCHED URLs / EMAILS / WEBHOOKS             │   │
│  │  • External content wrapping (XML tags)                   │   │
│  │  • Security notice injection                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 5: Supply Chain                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      CLAWHUB                              │   │
│  │  • Skill publishing (semver, SKILL.md required)           │   │
│  │  • Pattern-based moderation flags                         │   │
│  │  • VirusTotal scanning (coming soon)                      │   │
│  │  • GitHub account age verification                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 資料流程

| 流程 | 來源  | 目的地 | 資料               | 防護           |
| ---- | ------- | ----------- | ------------------ | -------------------- |
| F1   | 管道 | 閘道     | 使用者訊息      | TLS, AllowFrom       |
| F2   | 閘道 | 代理程式       | 路由訊息    | Session isolation    |
| F3   | Agent   | Tools       | Tool invocations   | Policy enforcement   |
| F4   | Agent   | External    | web_fetch requests | SSRF blocking        |
| F5   | ClawHub | Agent       | Skill code         | Moderation, scanning |
| F6   | Agent   | Channel     | Responses          | Output filtering     |

---

## 3. Threat Analysis by ATLAS Tactic

### 3.1 Reconnaissance (AML.TA0002)

#### T-RECON-001: Agent Endpoint Discovery

| Attribute               | Value                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0006 - Active Scanning                                          |
| **Description**         | Attacker scans for exposed OpenClaw gateway endpoints                |
| **Attack Vector**       | Network scanning, shodan queries, DNS enumeration                    |
| **Affected Components** | Gateway, exposed API endpoints                                       |
| **Current Mitigations** | Tailscale auth option, bind to loopback by default                   |
| **Residual Risk**       | Medium - Public gateways discoverable                                |
| **Recommendations**     | Document secure deployment, add rate limiting on discovery endpoints |

#### T-RECON-002: Channel Integration Probing

| Attribute               | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| **ATLAS ID**            | AML.T0006 - Active Scanning                                        |
| **Description**         | Attacker probes messaging channels to identify AI-managed accounts |
| **Attack Vector**       | Sending test messages, observing response patterns                 |
| **Affected Components** | All channel integrations                                           |
| **Current Mitigations** | None specific                                                      |
| **Residual Risk**       | Low - Limited value from discovery alone                           |
| **Recommendations**     | Consider response timing randomization                             |

---

### 3.2 Initial Access (AML.TA0004)

#### T-ACCESS-001: Pairing Code Interception

| Attribute               | Value                                                    |
| ----------------------- | -------------------------------------------------------- |
| **ATLAS ID**            | AML.T0040 - AI Model Inference API Access                |
| **Description**         | Attacker intercepts pairing code during 30s grace period |
| **Attack Vector**       | Shoulder surfing, network sniffing, social engineering   |
| **Affected Components** | Device pairing system                                    |
| **Current Mitigations** | 30s expiry, codes sent via existing channel              |
| **Residual Risk**       | Medium - Grace period exploitable                        |
| **Recommendations**     | Reduce grace period, add confirmation step               |

#### T-ACCESS-002: AllowFrom Spoofing

| Attribute               | Value                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| **ATLAS ID**            | AML.T0040 - AI Model Inference API Access                                      |
| **Description**         | Attacker spoofs allowed sender identity in channel                             |
| **Attack Vector**       | Depends on channel - phone number spoofing, username impersonation             |
| **Affected Components** | AllowFrom validation per channel                                               |
| **Current Mitigations** | 特定通道的身份驗證                                         |
| **剩餘風險**       | 中等 - 部分通道易受偽造攻擊                                  |
| **建議**     | 記錄特定通道的風險，並盡可能添加加密驗證 |

#### T-ACCESS-003: 權杖竊取

| 屬性               | 值                                                       |
| ----------------------- | ----------------------------------------------------------- |
| **ATLAS ID**            | AML.T0040 - AI 模型推論 API 存取                   |
| **描述**         | 攻擊者從配置檔案中竊取驗證權杖     |
| **攻擊向量**       | 惡意軟體、未授權裝置存取、配置備份暴露 |
| **受影響元件** | ~/.openclaw/credentials/, 配置儲存                    |
| **目前緩解措施** | 檔案權限                                            |
| **剩餘風險**       | 高 - 權杖以明文儲存                           |
| **建議**     | 實施靜態權杖加密，並添加權杖輪換      |

---

### 3.3 執行 (AML.TA0005)

#### T-EXEC-001: 直接提示詞注入

| 屬性               | 值                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0051.000 - LLM 提示詞注入：直接                                              |
| **描述**         | 攻擊者發送精心設計的提示詞以操控代理程式的行為                               |
| **攻擊向量**       | 包含對抗性指令的通道訊息                                      |
| **受影響元件** | 代理程式 LLM，所有輸入介面                                                             |
| **目前緩解措施** | 模式偵測，外部內容包裹                                              |
| **剩餘風險**       | 嚴重 - 僅偵測，無阻擋；複雜攻擊可繞過                      |
| **建議**     | 實施多層防禦、輸出驗證，並對敏感操作進行使用者確認 |

#### T-EXEC-002: 間接提示詞注入

| 屬性               | 值                                                       |
| ----------------------- | ----------------------------------------------------------- |
| **ATLAS ID**            | AML.T0051.001 - LLM 提示詞注入：間接              |
| **描述**         | 攻擊者在取得的內容中嵌入惡意指令   |
| **攻擊向量**       | 惡意 URL、有毒的電子郵件、遭入侵的 Webhook       |
| **受影響元件** | web_fetch、電子郵件攝取、外部資料來源           |
| **目前緩解措施** | 使用 XML 標籤和安全通告包裹內容          |
| **剩餘風險**       | 高 - LLM 可能會忽略包裹指令                  |
| **建議**     | 實施內容清理，分離執行環境 |

#### T-EXEC-003: 工具引數注入

| 屬性               | 值                                                        |
| ----------------------- | ------------------------------------------------------------ |
| **ATLAS ID**            | AML.T0051.000 - LLM 提示詞注入：直接                 |
| **描述**         | 攻擊者透過提示詞注入操控工具引數 |
| **攻擊向量**       | 影響工具參數值的精心設計提示詞         |
| **受影響元件** | 所有工具調用                                         |
| **目前緩解措施** | 危險指令的執行核准                        |
| **剩餘風險**       | 高 - 依賴使用者判斷                               |
| **建議**     | 實施參數驗證、參數化工具呼叫      |

#### T-EXEC-004: 執行核准繞過

| 屬性               | 值                                                      |
| ----------------------- | ---------------------------------------------------------- |
| **ATLAS ID**            | AML.T0043 - 構建對抗數據                         |
| **描述**         | 攻擊者構建繞過核准白名單的指令    |
| **攻擊向量**       | 指令混淆、別名利用、路徑操作 |
| **受影響元件** | exec-approvals.ts, 指令白名單                       |
| **目前緩解措施** | 白名單 + 詢問模式                                       |
| **剩餘風險**       | 高 - 無指令清理                             |
| **建議**     | 實施指令正規化、擴展黑名單          |

---

### 3.4 持續性 (AML.TA0006)

#### T-PERSIST-001: 惡意技能安裝

| 屬性               | 值                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| **ATLAS ID**            | AML.T0010.001 - 供應鏈入侵：AI 軟體                     |
| **描述**         | 攻擊者將惡意技能發布到 ClawHub                            |
| **攻擊向量**       | 建立帳戶、發布包含隱藏惡意程式碼的技能                 |
| **受影響元件** | ClawHub、技能載入、代理程式執行                                  |
| **目前緩解措施** | GitHub 帳戶年齡驗證、基於模式的審查標記          |
| **剩餘風險**       | 嚴重 - 無沙箱隔離、審查有限                                 |
| **建議**     | VirusTotal 整合 (進行中)、技能沙箱隔離、社群審查 |

#### T-PERSIST-002: 技能更新投毒

| 屬性               | 值                                                          |
| ----------------------- | -------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0010.001 - 供應鏈入侵：AI 軟體           |
| **描述**         | 攻擊者入侵熱門技能並推送惡意更新 |
| **攻擊向量**       | 帳戶入侵、對技能擁有者的社交工程          |
| **受影響元件** | ClawHub 版本控制、自動更新流程                          |
| **目前緩解措施** | 版本指紋識別                                         |
| **剩餘風險**       | 高 - 自動更新可能拉取惡意版本                |
| **建議**     | 實施更新簽署、復原能力、版本鎖定 |

#### T-PERSIST-003: 代理程式配置篡改

| 屬性               | 值                                                           |
| ----------------------- | --------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0010.002 - 供應鏈入侵：數據                   |
| **描述**         | 攻擊者修改代理程式配置以維持存取         |
| **攻擊向量**       | 配置檔案修改、設定注入                    |
| **受影響元件** | 代理程式配置、工具原則                                     |
| **目前緩解措施** | 檔案權限                                                |
| **剩餘風險**       | Medium - Requires local access                                  |
| **建議**     | Config integrity verification, audit logging for config changes |

---

### 3.5 Defense Evasion (AML.TA0007)

#### T-EVADE-001: Moderation Pattern Bypass

| Attribute               | Value                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0043 - Craft Adversarial Data                                     |
| **Description**         | Attacker crafts skill content to evade moderation patterns             |
| **Attack Vector**       | Unicode homoglyphs, encoding tricks, dynamic loading                   |
| **Affected Components** | ClawHub moderation.ts                                                  |
| **Current Mitigations** | Pattern-based FLAG_RULES                                               |
| **Residual Risk**       | High - Simple regex easily bypassed                                    |
| **建議**     | Add behavioral analysis (VirusTotal Code Insight), AST-based detection |

#### T-EVADE-002: Content Wrapper Escape

| Attribute               | Value                                                     |
| ----------------------- | --------------------------------------------------------- |
| **ATLAS ID**            | AML.T0043 - Craft Adversarial Data                        |
| **Description**         | Attacker crafts content that escapes XML wrapper context  |
| **Attack Vector**       | Tag manipulation, context confusion, instruction override |
| **Affected Components** | External content wrapping                                 |
| **Current Mitigations** | XML tags + security notice                                |
| **Residual Risk**       | Medium - Novel escapes discovered regularly               |
| **建議**     | Multiple wrapper layers, output-side validation           |

---

### 3.6 Discovery (AML.TA0008)

#### T-DISC-001: Tool Enumeration

| Attribute               | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| **ATLAS ID**            | AML.T0040 - AI Model Inference API Access             |
| **Description**         | Attacker enumerates available tools through prompting |
| **Attack Vector**       | "What tools do you have?" style queries               |
| **Affected Components** | Agent tool registry                                   |
| **Current Mitigations** | None specific                                         |
| **Residual Risk**       | Low - Tools generally documented                      |
| **建議**     | Consider tool visibility controls                     |

#### T-DISC-002: Session Data Extraction

| Attribute               | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| **ATLAS ID**            | AML.T0040 - AI Model Inference API Access             |
| **Description**         | Attacker extracts sensitive data from session context |
| **Attack Vector**       | "What did we discuss?" queries, context probing       |
| **Affected Components** | Session transcripts, context window                   |
| **Current Mitigations** | Session isolation per sender                          |
| **Residual Risk**       | Medium - Within-session data accessible               |
| **建議**     | Implement sensitive data redaction in context         |

---

### 3.7 Collection & Exfiltration (AML.TA0009, AML.TA0010)

#### T-EXFIL-001: Data Theft via web_fetch

| Attribute               | 值                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0009 - Collection                                                 |
| **描述**         | 攻擊者透過指示代理將資料傳送至外部 URL 來進行資料滲透 |
| **攻擊向量**       | 提示詞注入導致代理將資料 POST 到攻擊者伺服器         |
| **受影響組件** | web_fetch 工具                                                         |
| **目前緩解措施** | 封鎖內部網路的 SSRF                                    |
| **剩餘風險**       | 高 - 允許外部 URL                                         |
| **建議**     | 實施 URL 白名單，並具備資料分級意識              |

#### T-EXFIL-002: 未授權訊息發送

| 屬性               | 值                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0009 - Collection                                           |
| **描述**         | 攻擊者導致代理發送包含敏感資料的訊息 |
| **攻擊向量**       | 提示詞注入導致代理向攻擊者發送訊息               |
| **受影響組件** | 訊息工具、通道整合                               |
| **目前緩解措施** | 外寄訊息閘道                                        |
| **剩餘風險**       | 中等 - 閘道可能被繞過                                  |
| **建議**     | 新收件者需要明確確認                 |

#### T-EXFIL-003: 憑證收集

| 屬性               | 值                                                   |
| ----------------------- | ------------------------------------------------------- |
| **ATLAS ID**            | AML.T0009 - Collection                                  |
| **描述**         | 惡意技能從代理上下文中收集憑證 |
| **攻擊向量**       | 技能程式碼讀取環境變數、設定檔    |
| **受影響組件** | 技能執行環境                             |
| **目前緩解措施** | 無特定於技能的措施                                 |
| **剩餘風險**       | 嚴重 - 技能以代理權限執行             |
| **建議**     | 技能沙盒化、憑證隔離                  |

---

### 3.8 影響 (AML.TA0011)

#### T-IMPACT-001: 未授權指令執行

| 屬性               | 值                                               |
| ----------------------- | --------------------------------------------------- |
| **ATLAS ID**            | AML.T0031 - Erode AI Model Integrity                |
| **描述**         | 攻擊者在使用者系統上執行任意指令 |
| **攻擊向量**       | 提示詞注入結合繞過執行核准 |
| **受影響組件** | Bash 工具、指令執行                        |
| **目前緩解措施** | 執行核准、Docker 沙盒選項               |
| **剩餘風險**       | 嚴重 - 無沙盒的主機執行           |
| **建議**     | 預設使用沙盒，改善核准使用者體驗             |

#### T-IMPACT-002: 資源耗盡 (DoS)

| 屬性               | 值                                              |
| ----------------------- | -------------------------------------------------- |
| **ATLAS ID**            | AML.T0031 - Erode AI Model Integrity               |
| **描述**         | 攻擊者耗盡 API 點數或運算資源 |
| **攻擊向量**       | 自動化訊息淹沒、昂貴的工具呼叫   |
| **受影響組件** | 閘道、代理程式會話、API 提供商              |
| **目前緩解措施** | 無                                               |
| **剩餘風險**       | 高 - 無速率限制                            |
| **建議**     | 實施針對每位發送者的速率限制與成本預算     |

#### T-IMPACT-003：聲譽受損

| 屬性               | 數值                                                   |
| ----------------------- | ------------------------------------------------------- |
| **ATLAS ID**            | AML.T0031 - 侵蝕 AI 模型完整性                    |
| **描述**         | 攻擊者導致代理程式發送有害/冒犯性內容 |
| **攻擊向量**       | 導致不當回應的提示詞注入        |
| **受影響組件** | 輸出生成、頻道訊息傳遞                    |
| **目前緩解措施** | LLM 提供商內容政策                           |
| **剩餘風險**       | 中 - 提供商過濾器不完美                     |
| **建議**     | 輸出過濾層、使用者控制                   |

---

## 4. ClawHub 供應鏈分析

### 4.1 目前的安全控制措施

| 控制措施              | 實施方式              | 有效性                                        |
| -------------------- | --------------------------- | ---------------------------------------------------- |
| GitHub 帳號註冊時間   | `requireGitHubAccountAge()` | 中 - 提高新攻擊者的門檻                |
| 路徑清理    | `sanitizePath()`            | 高 - 防止路徑遍歷                       |
| 檔案類型驗證 | `isTextFile()`              | 中 - 僅限文字檔，但仍可能具惡意 |
| 大小限制          | 總套件 50MB           | 高 - 防止資源耗盡                  |
| 必填的 SKILL.md    | 強制性的說明文件            | 低安全性價值 - 僅供資訊參考              |
| 模式審核   | moderation.ts 中的 FLAG_RULES | 低 - 容易被繞過                                |
| 審核狀態    | `moderationStatus` 欄位    | 中 - 可進行人工審查                      |

### 4.2 審核標記模式

`moderation.ts` 中的目前模式：

```javascript
// Known-bad identifiers
/(keepcold131\/ClawdAuthenticatorTool|ClawdAuthenticatorTool)/i

// Suspicious keywords
/(malware|stealer|phish|phishing|keylogger)/i
/(api[-_ ]?key|token|password|private key|secret)/i
/(wallet|seed phrase|mnemonic|crypto)/i
/(discord\.gg|webhook|hooks\.slack)/i
/(curl[^\n]+\|\s*(sh|bash))/i
/(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd)/i
```

**限制：**

- 僅檢查 slug、displayName、summary、frontmatter、metadata、檔案路徑
- 不分析實際的技能程式碼內容
- 簡單的正規表達式易透過混淆手法繞過
- 無行為分析

### 4.3 計劃中的改進

| 改進項目            | 狀態                                | 影響                                                                |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| VirusTotal 整合 | 進行中                           | 高 - Code Insight 行為分析                               |
| 社群檢舉    | 部分 (`skillReports` 資料表已存在) | 中                                                                |
| 審計記錄          | 部分 (`auditLogs` 資料表已存在)    | 中                                                                |
| 徽章系統           | 已實施                           | 中 - `highlighted`、`official`、`deprecated`、`redactionApproved` |

---

## 5. 風險矩陣

### 5.1 可能性 vs 影響

| 威脅 ID     | 可能性 | 影響   | 風險等級   | 優先順序 |
| ------------- | ---------- | -------- | ------------ | -------- |
| T-EXEC-001    | 高       | 嚴重 | **嚴重** | P0       |
| T-PERSIST-001 | 高       | 嚴重 | **嚴重** | P0       |
| T-EXFIL-003   | 中     | 嚴重 | **嚴重** | P0       |
| T-IMPACT-001  | 中     | 嚴重 | **高**     | P1       |
| T-EXEC-002    | 高       | 高     | **高**     | P1       |
| T-EXEC-004    | 中     | 高     | **高**     | P1       |
| T-ACCESS-003  | 中     | 高     | **高**     | P1       |
| T-EXFIL-001   | 中     | 高     | **高**     | P1       |
| T-IMPACT-002  | 高       | 中   | **高**     | P1       |
| T-EVADE-001   | 高       | 中   | **中**   | P2       |
| T-ACCESS-001  | 低        | 高     | **中**   | P2       |
| T-ACCESS-002  | 低        | 高     | **中**   | P2       |
| T-PERSIST-002 | 低        | 高     | **中**   | P2       |

### 5.2 關鍵路徑攻擊鏈

**攻擊鏈 1：基於技能的數據盜竊**

```
T-PERSIST-001 → T-EVADE-001 → T-EXFIL-003
(Publish malicious skill) → (Evade moderation) → (Harvest credentials)
```

**攻擊鏈 2：提示詞注入導致 RCE**

```
T-EXEC-001 → T-EXEC-004 → T-IMPACT-001
(Inject prompt) → (Bypass exec approval) → (Execute commands)
```

**攻擊鏈 3：透過獲取內容進行間接注入**

```
T-EXEC-002 → T-EXFIL-001 → External exfiltration
(Poison URL content) → (Agent fetches & follows instructions) → (Data sent to attacker)
```

---

## 6. 建議摘要

### 6.1 即時

| ID    | 建議                              | 解決                  |
| ----- | ------------------------------------------- | -------------------------- |
| R-001 | 完成 VirusTotal 整合             | T-PERSIST-001, T-EVADE-001 |
| R-002 | 實施沙盒化                  | T-PERSIST-001, T-EXFIL-003 |
| R-003 | 針對敏感操作新增輸出驗證 | T-EXEC-001, T-EXEC-002     |

### 6.2 短期 (P1)

| ID    | 建議                           | 解決    |
| ----- | ---------------------------------------- | ------------ |
| R-004 | 實施速率限制                  | T-IMPACT-002 |
| R-005 | 新增靜態 Token 加密             | T-ACCESS-003 |
| R-006 | 改善執行核准 UX 與驗證  | T-EXEC-004   |
| R-007 | 為 web_fetch 實施 URL 允許清單 | T-EXFIL-001  |

### 6.3 中期 (P2)

| ID    | 建議                                        | 解決     |
| ----- | ----------------------------------------------------- | ------------- |
| R-008 | 盡可能新增加密通道驗證 | T-ACCESS-002  |
| R-009 | 實施設定完整性驗證               | T-PERSIST-003 |
| R-010 | 新增更新簽章與版本鎖定                | T-PERSIST-002 |

---

## 7. 附錄

### 7.1 ATLAS 技術映射

| ATLAS ID      | 技術名稱                 | OpenClaw 威脅                                                 |
| ------------- | ------------------------------ | ---------------------------------------------------------------- |
| AML.T0006     | 主動掃描                | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | 收集                     | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | 供應鏈：AI 軟體      | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | 供應鏈：數據             | T-PERSIST-003                                                    |
| AML.T0031     | 侵蝕 AI 模型完整性       | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | AI 模型推斷 API 存取  | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | 製作對抗性數據         | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | LLM 提示詞注入：直接   | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | LLM 提示詞注入：間接 | T-EXEC-002                                                       |

### 7.2 關鍵安全性檔案

| 路徑                                | 用途                     | 風險等級   |
| ----------------------------------- | --------------------------- | ------------ |
| `src/infra/exec-approvals.ts`       | 指令審核邏輯      | **關鍵** |
| `src/gateway/auth.ts`               | 閘道驗證      | **關鍵** |
| `src/web/inbound/access-control.ts` | 通道存取控制      | **關鍵** |
| `src/infra/net/ssrf.ts`             | SSRF 防護             | **關鍵** |
| `src/security/external-content.ts`  | 提示詞注入緩解 | **關鍵** |
| `src/agents/sandbox/tool-policy.ts` | 工具政策執行     | **關鍵** |
| `convex/lib/moderation.ts`          | ClawHub 內容審核          | **高**     |
| `convex/lib/skillPublish.ts`        | 技能發佈流程       | **高**     |
| `src/routing/resolve-route.ts`      | 會話隔離           | **中**   |

### 7.3 術語表

| 術語                 | 定義                                                |
| -------------------- | --------------------------------------------------------- |
| **ATLAS**            | MITRE 針對 AI 系統的對抗性威脅景觀       |
| **ClawHub**          | OpenClaw 的技能市集                              |
| **閘道**          | OpenClaw 的訊息路由與驗證層       |
| **MCP**              | Model Context Protocol - 工具提供者介面          |
| **Prompt Injection** | 將惡意指令嵌入於輸入內容中的攻擊 |
| **Skill**            | 適用於 OpenClaw 代理程式的可下載擴充功能                |
| **SSRF**             | Server-Side Request Forgery - 伺服器端請求偽造                               |

---

_本威脅模型為持續更新的文件。請將安全問題回報至 security@openclaw.ai_

import en from "/components/footer/en.mdx";

<en />
