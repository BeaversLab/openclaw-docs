---
title: "Threat Model (MITRE ATLAS)"
summary: "OpenClaw threat model mapped to the MITRE ATLAS framework"
read_when:
  - Reviewing security posture or threat scenarios
  - Working on security features or audit responses
---

# OpenClaw Threat Model v1.0

## MITRE ATLAS Framework

**Version:** 1.0-draft
**Last Updated:** 2026-02-04
**Methodology:** MITRE ATLAS + Data Flow Diagrams
**Framework:** [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems)

### Framework Attribution

This threat model is built on [MITRE ATLAS](https://atlas.mitre.org/), the industry-standard framework for documenting adversarial threats to AI/ML systems. ATLAS is maintained by [MITRE](https://www.mitre.org/) in collaboration with the AI security community.

**Key ATLAS Resources:**

- [ATLAS Techniques](https://atlas.mitre.org/techniques/)
- [ATLAS Tactics](https://atlas.mitre.org/tactics/)
- [ATLAS Case Studies](https://atlas.mitre.org/studies/)
- [ATLAS GitHub](https://github.com/mitre-atlas/atlas-data)
- [Contributing to ATLAS](https://atlas.mitre.org/resources/contribute)

### Contributing to This Threat Model

This is a living document maintained by the OpenClaw community. See [CONTRIBUTING-THREAT-MODEL.md](/zh-Hant/security/CONTRIBUTING-THREAT-MODEL) for guidelines on contributing:

- Reporting new threats
- Updating existing threats
- Proposing attack chains
- Suggesting mitigations

---

## 1. Introduction

### 1.1 Purpose

This threat model documents adversarial threats to the OpenClaw AI agent platform and ClawHub skill marketplace, using the MITRE ATLAS framework designed specifically for AI/ML systems.

### 1.2 Scope

| Component              | Included | Notes                                            |
| ---------------------- | -------- | ------------------------------------------------ |
| OpenClaw Agent Runtime | Yes      | Core agent execution, tool calls, sessions       |
| Gateway                | Yes      | Authentication, routing, channel integration     |
| Channel Integrations   | Yes      | WhatsApp, Telegram, Discord, Signal, Slack, etc. |
| ClawHub Marketplace    | Yes      | Skill publishing, moderation, distribution       |
| MCP Servers            | Yes      | External tool providers                          |
| User Devices           | Partial  | Mobile apps, desktop clients                     |

### 1.3 Out of Scope

Nothing is explicitly out of scope for this threat model.

---

## 2. System Architecture

### 2.1 Trust Boundaries

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

### 2.2 Data Flows

| Flow | Source  | Destination | Data           | Protection     |
| ---- | ------- | ----------- | -------------- | -------------- |
| F1   | Channel | Gateway     | User messages  | TLS, AllowFrom |
| F2   | Gateway | Agent       | 已路由訊息     | 工作階段隔離   |
| F3   | Agent   | 工具        | 工具呼叫       | 政策執行       |
| F4   | Agent   | 外部        | web_fetch 請求 | SSRF 阻擋      |
| F5   | ClawHub | Agent       | 技能程式碼     | 內容審核、掃描 |
| F6   | Agent   | 通道        | 回應           | 輸出過濾       |

---

## 3. 依 ATLAS 戰術進行的威脅分析

### 3.1 偵查 (AML.TA0002)

#### T-RECON-001: Agent 端點探索

| 屬性             | 數值                                       |
| ---------------- | ------------------------------------------ |
| **ATLAS ID**     | AML.T0006 - 主動掃描                       |
| **描述**         | 攻擊者掃描已暴露的 OpenClaw 閘道端點       |
| **攻擊向量**     | 網路掃描、Shodan 查詢、DNS 列舉            |
| **受影響的元件** | 閘道、已暴露的 API 端點                    |
| **現有緩解措施** | Tailscale 驗證選項、預設綁定至 loopback    |
| **剩餘風險**     | 中等 - 公開閘道可被探索                    |
| **建議**         | 記錄安全部署方式、在探索端點上新增速率限制 |

#### T-RECON-002: 通道整合探測

| 屬性             | 數值                                   |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0006 - 主動掃描                   |
| **描述**         | 攻擊者探測訊息通道以識別 AI 管理的帳號 |
| **攻擊向量**     | 發送測試訊息、觀察回應模式             |
| **受影響的元件** | 所有通道整合                           |
| **現有緩解措施** | 無特定措施                             |
| **剩餘風險**     | 低 - 僅探索的價值有限                  |
| **建議**         | 考慮隨機化回應時間                     |

---

### 3.2 初始存取 (AML.TA0004)

#### T-ACCESS-001: 配對碼攔截

| 屬性             | 數值                             |
| ---------------- | -------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推論 API 存取 |
| **描述**         | 攻擊者在 30 秒寬限期內攔截配對碼 |
| **攻擊向量**     | 窺視、網路嗅探、社會工程         |
| **受影響的元件** | 裝置配對系統                     |
| **現有緩解措施** | 30 秒到期、透過現有通道發送代碼  |
| **剩餘風險**     | 中等 - 寬限期可被利用            |
| **建議**         | 縮短寬限期、新增確認步驟         |

#### T-ACCESS-002: AllowFrom 詐欺

| 屬性             | 數值                                      |
| ---------------- | ----------------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推論 API 存取          |
| **描述**         | 攻擊者在通道中詐欺允許的寄件者身分        |
| **攻擊向量**     | 取決於通道 - 電話號碼詐欺、使用者名稱冒充 |
| **受影響的元件** | 每個通道的 AllowFrom 驗證                 |
| **現有緩解措施** | 特定管道的識別驗證                        |
| **剩餘風險**     | 中等 - 部分管道易受到偽造攻擊             |
| **建議**         | 記錄特定管道的風險，並盡可能加入加密驗證  |

#### T-ACCESS-003: 權杖竊取

| 屬性             | 數值                                       |
| ---------------- | ------------------------------------------ |
| **ATLAS ID**     | AML.T0040 - AI 模型推論 API 存取           |
| **描述**         | 攻擊者從設定檔中竊取認證權杖               |
| **攻擊向量**     | 惡意軟體、未經授權的裝置存取、設定備份洩露 |
| **受影響元件**   | ~/.openclaw/credentials/, 設定儲存         |
| **目前緩解措施** | 檔案權限                                   |
| **剩餘風險**     | 高 - 權杖以明文儲存                        |
| **建議**         | 實作靜態權杖加密，加入權杖輪換             |

---

### 3.3 執行 (AML.TA0005)

#### T-EXEC-001: 直接提示詞注入

| 屬性             | 數值                                         |
| ---------------- | -------------------------------------------- |
| **ATLAS ID**     | AML.T0051.000 - LLM 提示詞注入：直接         |
| **描述**         | 攻擊者發送精心設計的提示詞以操控代理程式行為 |
| **攻擊向量**     | 包含對抗指令的管道訊息                       |
| **受影響元件**   | Agent LLM，所有輸入表面                      |
| **目前緩解措施** | 模式偵測、外部內容包裝                       |
| **剩餘風險**     | 嚴重 - 僅偵測無阻擋；複雜攻擊可繞過          |
| **建議**         | 實作多層防禦、輸出驗證、敏感動作的使用者確認 |

#### T-EXEC-002: 間接提示詞注入

| 屬性             | 數值                                     |
| ---------------- | ---------------------------------------- |
| **ATLAS ID**     | AML.T0051.001 - LLM 提示詞注入：間接     |
| **描述**         | 攻擊者在取得的內容中嵌入惡意指令         |
| **攻擊向量**     | 惡意 URL、中毒電子郵件、遭入侵的 Webhook |
| **受影響元件**   | web_fetch、電子郵件擷取、外部資料來源    |
| **目前緩解措施** | 使用標籤和安全提示包裝內容               |
| **剩餘風險**     | 高 - LLM 可能會忽略包裝指令              |
| **建議**         | 實作內容清理、隔離執行環境               |

#### T-EXEC-003: 工具引數注入

| 屬性             | 數值                                 |
| ---------------- | ------------------------------------ |
| **ATLAS ID**     | AML.T0051.000 - LLM 提示詞注入：直接 |
| **描述**         | 攻擊者透過提示詞注入操控工具引數     |
| **攻擊向量**     | 影響工具參數值的精心設計提示詞       |
| **受影響元件**   | 所有工具呼叫                         |
| **目前緩解措施** | 危險指令的執行核準                   |
| **剩餘風險**     | 高 - 依賴使用者判斷                  |
| **建議**         | 實施參數驗證、參數化工具呼叫         |

#### T-EXEC-004：執行核準繞過

| 屬性             | 值                               |
| ---------------- | -------------------------------- |
| **ATLAS ID**     | AML.T0043 - 製作對抗性資料       |
| **描述**         | 攻擊者製作繞過核准允許清單的指令 |
| **攻擊向量**     | 指令混淆、別名利用、路徑操作     |
| **受影響組件**   | exec-approvals.ts、指令允許清單  |
| **目前緩解措施** | 允許清單 + 詢問模式              |
| **剩餘風險**     | 高 - 無指令清理                  |
| **建議**         | 實施指令正規化、擴充封鎖清單     |

---

### 3.4 持久性 (AML.TA0006)

#### T-PERSIST-001：惡意技能安裝

| 屬性             | 值                                                |
| ---------------- | ------------------------------------------------- |
| **ATLAS ID**     | AML.T0010.001 - 供應鏈洩漏：AI 軟體               |
| **描述**         | 攻擊者將惡意技能發佈到 ClawHub                    |
| **攻擊向量**     | 建立帳戶、發佈具有隱藏惡意程式碼的技能            |
| **受影響組件**   | ClawHub、技能載入、代理程式執行                   |
| **目前緩解措施** | GitHub 帳戶建立時間驗證、基於模式的內容審查標記   |
| **剩餘風險**     | 嚴重 - 無沙盒機制、審查有限                       |
| **建議**         | VirusTotal 整合（進行中）、技能沙盒機制、社群審查 |

#### T-PERSIST-002：技能更新投毒

| 屬性             | 值                                  |
| ---------------- | ----------------------------------- |
| **ATLAS ID**     | AML.T0010.001 - 供應鏈洩漏：AI 軟體 |
| **描述**         | 攻擊者入侵熱門技能並推送惡意更新    |
| **攻擊向量**     | 帳戶入侵、對技能擁有者的社會工程學  |
| **受影響組件**   | ClawHub 版本控制、自動更新流程      |
| **目前緩解措施** | 版本指紋識別                        |
| **剩餘風險**     | 高 - 自動更新可能下載惡意版本       |
| **建議**         | 實施更新簽章、回復功能、版本鎖定    |

#### T-PERSIST-003：代理程式配置篡改

| 屬性             | 值                                 |
| ---------------- | ---------------------------------- |
| **ATLAS ID**     | AML.T0010.002 - 供應鏈洩漏：資料   |
| **描述**         | 攻擊者修改代理程式配置以維持存取權 |
| **攻擊向量**     | 配置檔案修改、設定注入             |
| **受影響組件**   | 代理程式配置、工具原則             |
| **目前緩解措施** | 檔案權限                           |
| **剩餘風險**     | 中等 - 需要本機存取                |
| **建議**         | 設定完整性驗證、設定變更的稽核日誌 |

---

### 3.5 防禦規避 (AML.TA0007)

#### T-EVADE-001: 內審模式繞過

| 屬性             | 數值                                                    |
| ---------------- | ------------------------------------------------------- |
| **ATLAS ID**     | AML.T0043 - 製作對抗性數據                              |
| **描述**         | 攻擊者製作技能內容以規避內審模式                        |
| **攻擊向量**     | Unicode 同形字、編碼技巧、動態載入                      |
| **受影響元件**   | ClawHub moderation.ts                                   |
| **目前緩解措施** | 基於模式的 FLAG_RULES                                   |
| **剩餘風險**     | 高 - 簡單的正則表達式易被繞過                           |
| **建議**         | 加入行為分析 (VirusTotal Code Insight)、基於 AST 的偵測 |

#### T-EVADE-002: 內容包裝器逃逸

| 屬性             | 數值                                  |
| ---------------- | ------------------------------------- |
| **ATLAS ID**     | AML.T0043 - 製作對抗性數據            |
| **描述**         | 攻擊者製作能逃逸 XML 包裝器情境的內容 |
| **攻擊向量**     | 標籤操作、情境混淆、指令覆寫          |
| **受影響元件**   | 外部內容包裝                          |
| **目前緩解措施** | XML 標籤 + 安全通知                   |
| **剩餘風險**     | 中等 - 經常發現新型逃逸方式           |
| **建議**         | 多層包裝器、輸出端驗證                |

---

### 3.6 探索 (AML.TA0008)

#### T-DISC-001: 工具列舉

| 屬性             | 數值                             |
| ---------------- | -------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推斷 API 存取 |
| **描述**         | 攻擊者透過提示列舉可用工具       |
| **攻擊向量**     | 「你有什麼工具？」類型的查詢     |
| **受影響元件**   | Agent 工具註冊表                 |
| **目前緩解措施** | 無特定措施                       |
| **剩餘風險**     | 低 - 工具通常已有文件記錄        |
| **建議**         | 考慮工具可見性控制               |

#### T-DISC-002: 會話數據擷取

| 屬性             | 數值                                   |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推斷 API 存取       |
| **描述**         | 攻擊者從會話情境中擷取敏感數據         |
| **攻擊向量**     | 「我們討論了什麼？」類型查詢、情境探測 |
| **受影響元件**   | 會話記錄、情境視窗                     |
| **目前緩解措施** | 每個發送者的會話隔離                   |
| **剩餘風險**     | 中等 - 可存取會話內數據                |
| **建議**         | 在情境中實作敏感數據編輯               |

---

### 3.7 收集與外滲 (AML.TA0009, AML.TA0010)

#### T-EXFIL-001: 透過 web_fetch 竊取數據

| 屬性               | 數值                                                      |
| ------------------ | --------------------------------------------------------- |
| **ATLAS ID**       | AML.T0009 - Collection                                    |
| **描述**           | 攻擊者透過指示代理程式將資料傳送至外部 URL 來進行資料外洩 |
| **攻擊向量**       | 提示詞注入導致代理程式將資料 POST 至攻擊者伺服器          |
| **受影響的元件**   | web_fetch 工具                                            |
| **目前的緩解措施** | 針對內部網路的 SSRP 阻擋                                  |
| **剩餘風險**       | 高 - 允許外部 URL                                         |
| **建議**           | 實作 URL 白名單、資料分級感知                             |

#### T-EXFIL-002: 未授權傳送訊息

| 屬性               | 數值                                     |
| ------------------ | ---------------------------------------- |
| **ATLAS ID**       | AML.T0009 - Collection                   |
| **描述**           | 攻擊者導致代理程式傳送包含敏感資料的訊息 |
| **攻擊向量**       | 提示詞注入導致代理程式傳送訊息給攻擊者   |
| **受影響的元件**   | 訊息工具、頻道整合                       |
| **目前的緩解措施** | 外傳訊息閘道                             |
| **剩餘風險**       | 中等 - 閘道可能被繞過                    |
| **建議**           | 新收件者需明確確認                       |

#### T-EXFIL-003: 憑證收集

| 屬性               | 數值                               |
| ------------------ | ---------------------------------- |
| **ATLAS ID**       | AML.T0009 - Collection             |
| **描述**           | 惡意技能從代理程式上下文中收集憑證 |
| **攻擊向量**       | 技能代碼讀取環境變數、設定檔       |
| **受影響的元件**   | 技能執行環境                       |
| **目前的緩解措施** | 無針對技能的特定措施               |
| **剩餘風險**       | 嚴重 - 技能以代理程式權限執行      |
| **建議**           | 技能沙盒化、憑證隔離               |

---

### 3.8 影響 (AML.TA0011)

#### T-IMPACT-001: 未授權指令執行

| 屬性               | 數值                                 |
| ------------------ | ------------------------------------ |
| **ATLAS ID**       | AML.T0031 - Erode AI Model Integrity |
| **描述**           | 攻擊者在使用者系統上執行任意指令     |
| **攻擊向量**       | 提示詞注入結合執行核准繞過           |
| **受影響的元件**   | Bash 工具、指令執行                  |
| **目前的緩解措施** | 執行核准、Docker 沙盒選項            |
| **剩餘風險**       | 嚴重 - 無沙盒的主機執行              |
| **建議**           | 預設使用沙盒、改善核准使用者體驗     |

#### T-IMPACT-002: 資源耗盡 (DoS)

| 屬性             | 數值                                   |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0031 - Erode AI Model Integrity   |
| **描述**         | 攻擊者耗盡 API 點數或運算資源          |
| **攻擊向量**     | 自動化訊息泛洪、昂貴的工具呼叫         |
| **受影響的元件** | Gateway, agent sessions, API provider  |
| **目前緩解措施** | 無                                     |
| **剩餘風險**     | 高 - 無速率限制                        |
| **建議**         | 實施針對每位發送者的速率限制、成本預算 |

#### T-IMPACT-003: 聲譽受損

| 屬性             | 數值                                 |
| ---------------- | ------------------------------------ |
| **ATLAS ID**     | AML.T0031 - 侵蝕 AI 模型完整性       |
| **描述**         | 攻擊者導致 agent 發送有害/冒犯性內容 |
| **攻擊向量**     | 導致不當回應的提示注入               |
| **受影響組件**   | 輸出生成、頻道訊息傳遞               |
| **目前緩解措施** | LLM 提供商內容政策                   |
| **剩餘風險**     | 中等 - 提供商過濾器並不完美          |
| **建議**         | 輸出過濾層、使用者控制               |

---

## 4. ClawHub 供應鏈分析

### 4.1 目前安全控制措施

| 控制措施        | 實施方式                      | 有效性                                |
| --------------- | ----------------------------- | ------------------------------------- |
| GitHub 帳號年齡 | `requireGitHubAccountAge()`   | 中等 - 提高新攻擊者的門檻             |
| 路徑清理        | `sanitizePath()`              | 高 - 防止路徑遍歷                     |
| 檔案類型驗證    | `isTextFile()`                | 中等 - 僅限文字檔案，但仍可能具有惡意 |
| 大小限制        | 總共 50MB 的套件              | 高 - 防止資源耗盡                     |
| 必需的 SKILL.md | 強制性說明檔案                | 低安全性價值 - 僅供參考               |
| 模式審核        | moderation.ts 中的 FLAG_RULES | 低 - 容易繞過                         |
| 審核狀態        | `moderationStatus` 欄位       | 中等 - 可進行人工審核                 |

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
- 簡單的正則表達式易透過混淆繞過
- 無行為分析

### 4.3 計畫中的改進

| 改進項目        | 狀態                           | 影響                                                                |
| --------------- | ------------------------------ | ------------------------------------------------------------------- |
| VirusTotal 整合 | 進行中                         | 高 - Code Insight 行為分析                                          |
| 社群舉報        | 部分 (`skillReports` 表格存在) | 中等                                                                |
| 審計日誌記錄    | 部分 (`auditLogs` 表格存在)    | 中等                                                                |
| 徽章系統        | 已實施                         | 中等 - `highlighted`、`official`、`deprecated`、`redactionApproved` |

---

## 5. 風險矩陣

### 5.1 可能性 vs 影響

| 威脅 ID       | 可能性 | 影響 | 風險等級 | 優先級 |
| ------------- | ------ | ---- | -------- | ------ |
| T-EXEC-001    | 高     | 嚴重 | **嚴重** | P0     |
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

**攻擊鏈 2：透過提示注入導致 RCE**

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

### 6.1 即時 (P0)

| ID    | 建議                     | 解決項目                   |
| ----- | ------------------------ | -------------------------- |
| R-001 | 完成 VirusTotal 整合     | T-PERSIST-001, T-EVADE-001 |
| R-002 | 實作沙盒化機制           | T-PERSIST-001, T-EXFIL-003 |
| R-003 | 針對敏感操作新增輸出驗證 | T-EXEC-001, T-EXEC-002     |

### 6.2 短期 (P1)

| ID    | 建議                               | 解決項目     |
| ----- | ---------------------------------- | ------------ |
| R-004 | 實作速率限制                       | T-IMPACT-002 |
| R-005 | 新增靜態 Token 加密                | T-ACCESS-003 |
| R-006 | 改善執行核准的使用者體驗與驗證機制 | T-EXEC-004   |
| R-007 | 為 web_fetch 實作 URL 白名單機制   | T-EXFIL-001  |

### 6.3 中期 (P2)

| ID    | 建議                   | 解決項目      |
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
| AML.T0009     | 蒐集                 | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | 供應鏈：AI 軟體      | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | 供應鏈：資料         | T-PERSIST-003                                                    |
| AML.T0031     | 侵蝕 AI 模型完整性   | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | AI 模型推論 API 存取 | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | 製作對抗性資料       | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | LLM 提示詞注入：直接 | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | LLM 提示詞注入：間接 | T-EXEC-002                                                       |

### 7.2 關鍵安全檔案

| 路徑                                | 用途             | 風險等級 |
| ----------------------------------- | ---------------- | -------- |
| `src/infra/exec-approvals.ts`       | 指令審核邏輯     | **嚴重** |
| `src/gateway/auth.ts`               | 閘道驗證         | **嚴重** |
| `src/web/inbound/access-control.ts` | 通道存取控制     | **嚴重** |
| `src/infra/net/ssrf.ts`             | SSRF 防護        | **嚴重** |
| `src/security/external-content.ts`  | 提示詞注入緩解   | **嚴重** |
| `src/agents/sandbox/tool-policy.ts` | 工具政策執行     | **嚴重** |
| `convex/lib/moderation.ts`          | ClawHub 內容審核 | **高**   |
| `convex/lib/skillPublish.ts`        | 技能發布流程     | **高**   |
| `src/routing/resolve-route.ts`      | 會話隔離         | **中**   |

### 7.3 術語表

| 術語           | 定義                                    |
| -------------- | --------------------------------------- |
| **ATLAS**      | MITRE 的 AI 系統對抗威脅風景            |
| **ClawHub**    | OpenClaw 的技能市集                     |
| **Gateway**    | OpenClaw 的訊息路由與驗證層             |
| **MCP**        | Model Context Protocol - 工具提供者介面 |
| **提示詞注入** | 將惡意指令嵌入輸入中的攻擊              |
| **技能**       | OpenClaw 代理的可下載擴充功能           |
| **SSRF**       | 伺服器端請求偽造                        |

---

_此威脅模型為持續更新的文件。請將安全問題回報至 security@openclaw.ai_
