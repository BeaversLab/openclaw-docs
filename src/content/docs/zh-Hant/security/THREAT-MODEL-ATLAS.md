---
summary: "OpenClaw 威脅模型對應至 MITRE ATLAS 框架"
title: "威脅模型 (MITRE ATLAS)"
read_when:
  - Reviewing security posture or threat scenarios
  - Working on security features or audit responses
---

## MITRE ATLAS 框架

**版本：** 1.0-draft
**最後更新：** 2026-02-04
**方法論：** MITRE ATLAS + 資料流程圖
**框架：** [MITRE ATLAS](https://atlas.mitre.org/) (人工智慧系統的對手威脅景象)

### 框架歸屬

此威脅模型基於 [MITRE ATLAS](https://atlas.mitre.org/) 構建，這是用於記錄 AI/ML 系統對手威脅的業界標準框架。ATLAS 由 [MITRE](https://www.mitre.org/) 與 AI 安全社群合作維護。

**關鍵 ATLAS 資源：**

- [ATLAS 技術](https://atlas.mitre.org/techniques/)
- [ATLAS 戰術](https://atlas.mitre.org/tactics/)
- [ATLAS 個案研究](https://atlas.mitre.org/studies/)
- [ATLAS GitHub](https://github.com/mitre-atlas/atlas-data)
- [貢獻 ATLAS](https://atlas.mitre.org/resources/contribute)

### 貢獻此威脅模型

這是由 OpenClaw 社群維護的持續更新文件。請參閱 [CONTRIBUTING-THREAT-MODEL.md](/zh-Hant/security/CONTRIBUTING-THREAT-MODEL) 以了解貢獻準則：

- 回報新威脅
- 更新現有威脅
- 提議攻擊鏈
- 建議緩解措施

---

## 1. 簡介

### 1.1 目的

此威脅模型使用專為 AI/ML 系統設計的 MITRE ATLAS 框架，記錄了 OpenClaw AI 代理程式平台和 ClawHub 技能市集的對手威脅。

### 1.2 範圍

| 組件                   | 包含 | 備註                                          |
| ---------------------- | ---- | --------------------------------------------- |
| OpenClaw Agent Runtime | 是   | 核心代理程式執行、工具呼叫、工作階段          |
| 閘道                   | 是   | 驗證、路由、頻道整合                          |
| 頻道整合               | 是   | WhatsApp、Telegram、Discord、Signal、Slack 等 |
| ClawHub 市集           | 是   | 技能發佈、審核、發行                          |
| MCP 伺服器             | 是   | 外部工具提供者                                |
| 使用者裝置             | 部分 | 行動應用程式、桌面客戶端                      |

### 1.3 範圍外

此威脅模型沒有明確排除任何範圍。

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
│  │  • Device Pairing (1h DM / 5m node grace period)           │   │
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

| 流程 | 來源     | 目的地   | 資料           | 保護           |
| ---- | -------- | -------- | -------------- | -------------- |
| F1   | 頻道     | 閘道     | 使用者訊息     | TLS、AllowFrom |
| F2   | 閘道     | 代理程式 | 路由訊息       | 工作階段隔離   |
| F3   | 代理程式 | 工具     | 工具叫用       | 原則執行       |
| F4   | 代理程式 | 外部     | web_fetch 請求 | SSRF 阻擋      |
| F5   | ClawHub  | 代理程式 | 技能程式碼     | 審核、掃描     |
| F6   | 代理程式 | 頻道     | 回應           | 輸出過濾       |

---

## 3. 依 ATLAS 戰術進行威脅分析

### 3.1 偵察 (AML.TA0002)

#### T-RECON-001: Agent 端點探索

| 屬性             | 數值                                     |
| ---------------- | ---------------------------------------- |
| **ATLAS ID**     | AML.T0006 - 主動掃描                     |
| **描述**         | 攻擊者掃描暴露的 OpenClaw 閘道端點       |
| **攻擊向量**     | 網路掃描、shodan 查詢、DNS 列舉          |
| **受影響元件**   | 閘道、暴露的 API 端點                    |
| **目前緩解措施** | Tailscale 驗證選項、預設綁定至 loopback  |
| **剩餘風險**     | 中等 - 公共閘道可被探索                  |
| **建議**         | 記錄安全部署方式、在探索端點新增速率限制 |

#### T-RECON-002: 通道整合探測

| 屬性             | 數值                                   |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0006 - 主動掃描                   |
| **描述**         | 攻擊者探測訊息通道以識別 AI 管理的帳戶 |
| **攻擊向量**     | 發送測試訊息、觀察回應模式             |
| **受影響元件**   | 所有通道整合                           |
| **目前緩解措施** | 無特定措施                             |
| **剩餘風險**     | 低 - 僅憑探索價值有限                  |
| **建議**         | 考慮回應時間隨機化                     |

---

### 3.2 初始存取 (AML.TA0004)

#### T-ACCESS-001: 配對碼攔截

| 屬性             | 數值                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| **ATLAS ID**     | AML.T0040 - AI 模型推斷 API 存取                                         |
| **描述**         | 攻擊者在配對寬限期間攔截配對碼 (DM 通道配對為 1 小時，節點配對為 5 分鐘) |
| **攻擊向量**     | 窺視、網路嗅探、社會工程                                                 |
| **受影響元件**   | 裝置配對系統                                                             |
| **目前緩解措施** | 1 小時過期 (DM 配對) / 5 分鐘過期 (節點配對)、透過現有通道發送代碼       |
| **剩餘風險**     | 中等 - 寬限期可被利用                                                    |
| **建議**         | 縮短寬限期、新增確認步驟                                                 |

#### T-ACCESS-002: AllowFrom 詐騙

| 屬性             | 數值                                      |
| ---------------- | ----------------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推斷 API 存取          |
| **描述**         | 攻擊者在通道中詐騙允許的傳送者身分        |
| **攻擊向量**     | 取決於通道 - 電話號碼詐騙、使用者名稱冒充 |
| **受影響元件**   | 各通道的 AllowFrom 驗證                   |
| **目前緩解措施** | 特定通道的身分驗證                        |
| **剩餘風險**     | 中等 - 部分通道易受詐騙攻擊               |
| **建議**         | 記錄特定管道的風險，盡可能加入加密驗證    |

#### T-ACCESS-003: 權杖竊取

| 屬性             | 數值                                   |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推論 API 存取       |
| **描述**         | 攻擊者從設定檔中竊取驗證權杖           |
| **攻擊向量**     | 惡意軟體、未授權裝置存取、設定備份外洩 |
| **受影響元件**   | ~/.openclaw/credentials/、設定儲存     |
| **目前緩解措施** | 檔案權限                               |
| **殘餘風險**     | 高 - 權杖以明文儲存                    |
| **建議**         | 實作權杖靜態加密，加入權杖輪換         |

---

### 3.3 執行 (AML.TA0005)

#### T-EXEC-001: 直接提示詞注入

| 屬性             | 數值                                         |
| ---------------- | -------------------------------------------- |
| **ATLAS ID**     | AML.T0051.000 - LLM 提示詞注入：直接         |
| **描述**         | 攻擊者發送經過設計的提示詞以操控代理程式行為 |
| **攻擊向量**     | 包含對抗指令的管道訊息                       |
| **受影響元件**   | Agent LLM，所有輸入表面                      |
| **目前緩解措施** | 模式偵測、外部內容包裝                       |
| **殘餘風險**     | 嚴重 - 僅偵測，無阻擋；精密攻擊可繞過        |
| **建議**         | 實作多層防禦、輸出驗證、敏感動作的使用者確認 |

#### T-EXEC-002: 間接提示詞注入

| 屬性             | 數值                                     |
| ---------------- | ---------------------------------------- |
| **ATLAS ID**     | AML.T0051.001 - LLM 提示詞注入：間接     |
| **描述**         | 攻擊者在擷取的內容中嵌入惡意指令         |
| **攻擊向量**     | 惡意 URL、投毒電子郵件、遭入侵的 Webhook |
| **受影響元件**   | web_fetch、電子郵件攝取、外部資料來源    |
| **目前緩解措施** | 使用標籤與安全提示進行內容包裝           |
| **殘餘風險**     | 高 - LLM 可能會忽略包裝指令              |
| **建議**         | 實作內容淨化、隔離執行環境               |

#### T-EXEC-003: 工具引數注入

| 屬性             | 數值                                 |
| ---------------- | ------------------------------------ |
| **ATLAS ID**     | AML.T0051.000 - LLM 提示詞注入：直接 |
| **描述**         | 攻擊者透過提示詞注入操控工具引數     |
| **攻擊向量**     | 影響工具參數值的精心設計提示詞       |
| **受影響元件**   | 所有工具呼叫                         |
| **目前緩解措施** | 危險指令的執行核准                   |
| **殘餘風險**     | 高 - 依賴使用者判斷                  |
| **建議**         | 實施引數驗證、參數化工具呼叫         |

#### T-EXEC-004: Exec Approval Bypass

| 屬性             | 值                                   |
| ---------------- | ------------------------------------ |
| **ATLAS ID**     | AML.T0043 - Craft Adversarial Data   |
| **描述**         | 攻擊者精心製作指令以繞過審核允許清單 |
| **攻擊向量**     | 指令混淆、別名利用、路徑操作         |
| **受影響組件**   | exec-approvals.ts、指令允許清單      |
| **目前緩解措施** | 允許清單 + 詢問模式                  |
| **剩餘風險**     | 高 - 無指令清理                      |
| **建議**         | 實施指令正規化、擴充封鎖清單         |

---

### 3.4 Persistence (AML.TA0006)

#### T-PERSIST-001: Malicious Skill Installation

| 屬性             | 值                                                   |
| ---------------- | ---------------------------------------------------- |
| **ATLAS ID**     | AML.T0010.001 - Supply Chain Compromise: AI Software |
| **描述**         | 攻擊者將惡意技能發佈到 ClawHub                       |
| **攻擊向量**     | 建立帳戶、發佈隱藏惡意程式碼的技能                   |
| **受影響組件**   | ClawHub、技能載入、代理執行                          |
| **目前緩解措施** | GitHub 帳戶年齡驗證、基於模式的審核標記              |
| **剩餘風險**     | 嚴重 - 無沙盒機制、審核有限                          |
| **建議**         | VirusTotal 整合 (進行中)、技能沙盒化、社群審核       |

#### T-PERSIST-002: Skill Update Poisoning

| 屬性             | 值                                                   |
| ---------------- | ---------------------------------------------------- |
| **ATLAS ID**     | AML.T0010.001 - Supply Chain Compromise: AI Software |
| **描述**         | 攻擊者入侵熱門技能並推送惡意更新                     |
| **攻擊向量**     | 帳戶入侵、對技能擁有者的社交工程                     |
| **受影響組件**   | ClawHub 版本控制、自動更新流程                       |
| **目前緩解措施** | 版本指紋辨識                                         |
| **剩餘風險**     | 高 - 自動更新可能會下載惡意版本                      |
| **建議**         | 實施更新簽署、還原功能、版本鎖定                     |

#### T-PERSIST-003: Agent Configuration Tampering

| 屬性             | 值                                                              |
| ---------------- | --------------------------------------------------------------- |
| **ATLAS ID**     | AML.T0010.002 - Supply Chain Compromise: Data                   |
| **描述**         | 攻擊者修改代理設定以持續存取                                    |
| **攻擊向量**     | 設定檔修改、設定注入                                            |
| **受影響組件**   | 代理設定、工具原則                                              |
| **目前緩解措施** | 檔案權限                                                        |
| **剩餘風險**     | 中 - 需要本機存取                                               |
| **建議**         | Config integrity verification, audit logging for config changes |

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
| **Recommendations**     | Add behavioral analysis (VirusTotal Code Insight), AST-based detection |

#### T-EVADE-002: Content Wrapper Escape

| Attribute               | Value                                                     |
| ----------------------- | --------------------------------------------------------- |
| **ATLAS ID**            | AML.T0043 - Craft Adversarial Data                        |
| **Description**         | Attacker crafts content that escapes XML wrapper context  |
| **Attack Vector**       | Tag manipulation, context confusion, instruction override |
| **Affected Components** | External content wrapping                                 |
| **Current Mitigations** | XML tags + security notice                                |
| **Residual Risk**       | Medium - Novel escapes discovered regularly               |
| **Recommendations**     | Multiple wrapper layers, output-side validation           |

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
| **Recommendations**     | Consider tool visibility controls                     |

#### T-DISC-002: Session Data Extraction

| Attribute               | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| **ATLAS ID**            | AML.T0040 - AI Model Inference API Access             |
| **Description**         | Attacker extracts sensitive data from session context |
| **Attack Vector**       | "What did we discuss?" queries, context probing       |
| **Affected Components** | Session transcripts, context window                   |
| **Current Mitigations** | Session isolation per sender                          |
| **Residual Risk**       | Medium - Within-session data accessible               |
| **Recommendations**     | Implement sensitive data redaction in context         |

---

### 3.7 Collection & Exfiltration (AML.TA0009, AML.TA0010)

#### T-EXFIL-001: Data Theft via web_fetch

| Attribute        | Value                                             |
| ---------------- | ------------------------------------------------- |
| **ATLAS ID**     | AML.T0009 - Collection                            |
| **描述**         | 攻擊者透過指示代理將資料傳送至外部 URL 來滲漏資料 |
| **攻擊向量**     | 提示詞注入導致代理向攻擊者伺服器 POST 資料        |
| **受影響組件**   | web_fetch 工具                                    |
| **目前緩解措施** | 針對內部網路的 SSRP 阻擋                          |
| **剩餘風險**     | 高 - 允許外部 URL                                 |
| **建議**         | 實作 URL 白名單、資料分級感知                     |

#### T-EXFIL-002: 未授權傳送訊息

| 屬性             | 數值                                 |
| ---------------- | ------------------------------------ |
| **ATLAS ID**     | AML.T0009 - 收集                     |
| **描述**         | 攻擊者致使代理發送包含敏感資料的訊息 |
| **攻擊向量**     | 提示詞注入導致代理向攻擊者發送訊息   |
| **受影響組件**   | 訊息工具、頻道整合                   |
| **目前緩解措施** | 外寄訊息閘道                         |
| **剩餘風險**     | 中 - 閘道可能被繞過                  |
| **建議**         | 要求對新收件者進行明確確認           |

#### T-EXFIL-003：惡意憑證收集

| 屬性               | 值                                 |
| ------------------ | ---------------------------------- |
| **ATLAS ID**       | AML.T0009 - Collection             |
| **描述**           | 惡意技能從代理程式上下文中收集憑證 |
| **攻擊向量**       | 技能程式碼讀取環境變數、設定檔     |
| **受影響的組件**   | 技能執行環境                       |
| **目前的緩解措施** | 無針對技能的特定措施               |
| **殘餘風險**       | 嚴重 - 技能以代理程式權限執行      |
| **建議**           | 技能沙盒、憑證隔離                 |

---

### 3.8 影響 (AML.TA0011)

#### T-IMPACT-001：未授權命令執行

| 屬性               | 值                                   |
| ------------------ | ------------------------------------ |
| **ATLAS ID**       | AML.T0031 - Erode AI Model Integrity |
| **描述**           | 攻擊者在用戶系統上執行任意命令       |
| **攻擊向量**       | 提示詞注入結合執行審核繞過           |
| **受影響的組件**   | Bash 工具、命令執行                  |
| **目前的緩解措施** | 執行審核、Docker 沙盒選項            |
| **剩餘風險**       | 嚴重 - 在無沙箱環境下執行主機程式    |
| **建議**           | 預設使用沙箱，改善審核的使用者體驗   |

#### T-IMPACT-002: 資源耗盡 (DoS)

| 屬性             | 數值                                   |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0031 - 侵蝕 AI 模型完整性         |
| **描述**         | 攻擊者耗盡 API 配額或運算資源          |
| **攻擊向量**     | 自動化訊息洪水攻擊、昂貴的工具呼叫     |
| **受影響組件**   | 閘道、代理程式工作階段、API 提供者     |
| **目前緩解措施** | 無                                     |
| **剩餘風險**     | 高 - 無速率限制                        |
| **建議**         | 實施針對每位發送者的速率限制、成本預算 |

#### T-IMPACT-003: 聲譽受損

| 屬性             | 數值                                  |
| ---------------- | ------------------------------------- |
| **ATLAS ID**     | AML.T0031 - 侵蝕 AI 模型完整性        |
| **描述**         | 攻擊者導致代理程式發送有害/冒犯性內容 |
| **攻擊向量**     | 提示詞注入導致不當回應                |
| **受影響組件**   | 輸出生成、通道訊息傳遞                |
| **目前緩解措施** | LLM 提供商內容政策                    |
| **剩餘風險**     | 中等 - 提供商過濾器並不完美           |
| **建議**         | 輸出過濾層、使用者控制                |

---

## 4. ClawHub 供應鏈分析

### 4.1 目前的安全控制措施

| 控制措施        | 實作                          | 有效性                                |
| --------------- | ----------------------------- | ------------------------------------- |
| GitHub 帳號年限 | `requireGitHubAccountAge()`   | 中等 - 提高了新攻擊者的門檻           |
| 路徑清理        | `sanitizePath()`              | 高 - 防止路徑遍歷                     |
| 檔案類型驗證    | `isTextFile()`                | 中等 - 僅限文字檔案，但仍可能具備惡意 |
| 大小限制        | 總套件 50MB                   | 高 - 防止資源耗盡                     |
| 必填的 SKILL.md | 強制讀我檔案                  | 安全價值低 - 僅供資訊參考             |
| 模式審核        | moderation.ts 中的 FLAG_RULES | 低 - 容易繞過                         |
| 審核狀態        | `moderationStatus` 欄位       | 中等 - 可進行人工審查                 |

### 4.2 審核旗標模式

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
- 簡單的正規表示式易被混淆手法繞過
- 無行為分析

### 4.3 計劃改進

| 改進項目        | 狀態                             | 影響                                                              |
| --------------- | -------------------------------- | ----------------------------------------------------------------- |
| VirusTotal 整合 | 進行中                           | 高 - Code Insight 行為分析                                        |
| 社群通報        | 部分（存在 `skillReports` 表格） | 中                                                                |
| 審計日誌        | 部分（存在 `auditLogs` 表格）    | 中                                                                |
| 徽章系統        | 已實作                           | 中 - `highlighted`、`official`、`deprecated`、`redactionApproved` |

---

## 5. 風險矩陣

### 5.1 可能性 vs 影響

| 威脅 ID       | 可能性 | 影響 | 風險等級 | 優先級 |
| ------------- | ------ | ---- | -------- | ------ |
| T-EXEC-001    | 高     | 重大 | **嚴重** | P0     |
| T-PERSIST-001 | 高     | 嚴重 | **嚴重** | P0     |
| T-EXFIL-003   | 中     | 嚴重 | **嚴重** | P0     |
| T-IMPACT-001  | 中     | 嚴重 | **高**   | P1     |
| T-EXEC-002    | 高     | 高   | **高**   | P1     |
| T-EXEC-004    | 中     | 高   | **高**   | P1     |
| T-ACCESS-003  | 中     | 高   | **高**   | P1     |
| T-EXFIL-001   | 中     | 高   | **高**   | P1     |
| T-IMPACT-002  | 高     | 中   | **高**   | P1     |
| T-EVADE-001   | 高     | 中   | **中**   | P2     |
| T-ACCESS-001  | 低     | 高   | **中**   | P2     |
| T-ACCESS-002  | 低     | 高   | **中**   | P2     |
| T-PERSIST-002 | 低     | 高   | **中**   | P2     |

### 5.2 關鍵路徑攻擊鏈

**攻擊鏈 1：基於技能的資料竊取**

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

### 6.1 立即處理 (P0)

| ID    | 建議                              | 解決問題                   |
| ----- | --------------------------------- | -------------------------- |
| R-001 | 完成 VirusTotal 整合              | T-PERSIST-001, T-EVADE-001 |
| R-002 | 實作沙盒化技能 (skill sandboxing) | T-PERSIST-001, T-EXFIL-003 |
| R-003 | 針對敏感操作新增輸出驗證          | T-EXEC-001, T-EXEC-002     |

### 6.2 短期 (P1)

| ID    | 建議                         | 解決問題     |
| ----- | ---------------------------- | ------------ |
| R-004 | 實作速率限制                 | T-IMPACT-002 |
| R-005 | 新增靜態 Token 加密          | T-ACCESS-003 |
| R-006 | 改善執行核准的 UX 與驗證     | T-EXEC-004   |
| R-007 | 為 web_fetch 實作 URL 白名單 | T-EXFIL-001  |

### 6.3 中期 (P2)

| ID    | 建議                   | 解決問題      |
| ----- | ---------------------- | ------------- |
| R-008 | 盡可能新增加密通道驗證 | T-ACCESS-002  |
| R-009 | 實作設定完整性驗證     | T-PERSIST-003 |
| R-010 | 新增更新簽章與版本鎖定 | T-PERSIST-002 |

---

## 7. 附錄

### 7.1 ATLAS 技術對應

| ATLAS ID      | 技術名稱             | OpenClaw 威脅                                                    |
| ------------- | -------------------- | ---------------------------------------------------------------- |
| AML.T0006     | 主動掃描             | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | 收集                 | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | 供應鏈：AI 軟體      | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | 供應鏈：資料         | T-PERSIST-003                                                    |
| AML.T0031     | 削弱 AI 模型完整性   | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | AI 模型推論 API 存取 | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | 製作對抗資料         | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | LLM 提示詞注入：直接 | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | LLM 提示詞注入：間接 | T-EXEC-002                                                       |

### 7.2 關鍵安全檔案

| 路徑                                | 用途           | 風險等級 |
| ----------------------------------- | -------------- | -------- |
| `src/infra/exec-approvals.ts`       | 指令核准邏輯   | **嚴重** |
| `src/gateway/auth.ts`               | 閘道驗證       | **嚴重** |
| `src/infra/net/ssrf.ts`             | SSRF 防護      | **嚴重** |
| `src/security/external-content.ts`  | 提示詞注入緩解 | **嚴重** |
| `src/agents/sandbox/tool-policy.ts` | 工具政策執行   | **嚴重** |
| `src/routing/resolve-route.ts`      | 工作階段隔離   | **中等** |

### 7.3 詞彙表

| 術語           | 定義                                    |
| -------------- | --------------------------------------- |
| **ATLAS**      | MITRE 針對 AI 系統的對手威脅環境        |
| **ClawHub**    | OpenClaw 的技能市集                     |
| **閘道**       | OpenClaw 的訊息路由與驗證層             |
| **MCP**        | Model Context Protocol - 工具提供者介面 |
| **提示詞注入** | 將惡意指令嵌入輸入中的攻擊              |
| **技能**       | OpenClaw 代理程式的可下載擴充功能       |
| **SSRF**       | 伺服器端請求偽造                        |

---

_此威脅模型為一份持續更新的文件。請將安全問題回報至 security@openclaw.ai_

## 相關

- [正式驗證](/zh-Hant/security/formal-verification)
- [貢獻威脅模型](/zh-Hant/security/CONTRIBUTING-THREAT-MODEL)
