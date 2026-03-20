---
title: "Contributing to the Threat Model"
summary: "How to contribute to the OpenClaw threat model"
read_when:
  - 您想提供安全發現或威脅場景
  - 審查或更新威脅模型
---

# Contributing to the OpenClaw Threat Model

感謝您協助讓 OpenClaw 更安全。此威脅模型是一份持續更新的文件，我們歡迎任何人做出貢獻——您無需成為安全專家。

## Ways to Contribute

### Add a Threat

發現了我們未涵蓋的攻擊向量或風險？在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上提出 issue 並用自己的話描述它。您不需要了解任何框架或填寫每個欄位——只需描述場景即可。

**Helpful to include (but not required):**

- 攻擊場景及其如何被利用
- OpenClaw 的哪些部分受影響（CLI、gateway、channels、ClawHub、MCP servers 等）
- 您認為的嚴重程度（低 / 中 / 高 / 關鍵）
- 相關研究、CVE 或真實案例的連結

我們會在審查期間處理 ATLAS 對應、威脅 ID 和風險評估。如果您想包含這些詳細資訊，那很好——但這不是預期的。

> **這是用於添加至威脅模型，而非報告即時漏洞。** 如果您發現了可利用的漏洞，請參閱我們的 [Trust 頁面](https://trust.openclaw.ai) 以取得負責任的披露說明。

### Suggest a Mitigation

有關於如何解決現有威脅的想法嗎？開啟一個 issue 或 PR 並引用該威脅。有用的緩解措施是具體且可執行的——例如，「在 gateway 對每個發送者實施每分鐘 10 則訊息的速率限制」比「實施速率限制」更好。

### Propose an Attack Chain

攻擊鏈顯示了多個威脅如何結合成為現實的攻擊場景。如果您看到一個危險的組合，請描述步驟以及攻擊者如何將它們串聯起來。簡短描述攻擊在實踐中如何展開的敘述，比正式的範本更有價值。

### Fix or Improve Existing Content

錯別字、澄清、過時資訊、更好的範例——歡迎 PR，無需提出 issue。

## What We Use

### MITRE ATLAS

此威脅模型基於 [MITRE ATLAS](https://atlas.mitre.org/) (AI 系統對手威脅景觀)，這是一個專門針對 AI/ML 威脅（如提示注入、工具濫用和代理利用）設計的框架。您無需了解 ATLAS 即可參與貢獻 —— 我們會在審查期間將提交內容對應到該框架。

### 威脅 ID

每個威脅都有一個像 `T-EXEC-003` 這樣的 ID。分類如下：

| 代碼    | 類別                                   |
| ------- | ------------------------------------------ |
| RECON   | 偵察 - 信息收集     |
| ACCESS  | 初始存取 - 獲得進入權限             |
| EXEC    | 執行 - 運行惡意操作      |
| PERSIST | 持久化 - 維持存取權限           |
| EVADE   | 防禦規避 - 避免被偵測       |
| DISC    | 發現 - 了解環境 |
| EXFIL   | 資料外洩 - 竊取數據               |
| IMPACT  | 影響 - 損害或干擾              |

ID 由維護者在審查期間分配。您無需自行選擇。

### 風險等級

| 等級        | 含義                                                           |
| ------------ | ----------------------------------------------------------------- |
| **嚴重 (Critical)** | 系統完全遭入侵，或高可能性 + 嚴重影響      |
| **高 (High)**     | 可能造成重大損害，或中等可能性 + 嚴重影響 |
| **中等 (Medium)**   | 中等風險，或低可能性 + 重大影響                    |
| **低 (Low)**      | 可能性低且影響有限                                       |

如果您不確定風險等級，只需描述影響，我們會進行評估。

## 審查流程

1. **分類 (Triage)** - 我們會在 48 小時內審閱新的提交內容
2. **評估 (Assessment)** - 我們驗證可行性，分配 ATLAS 對應關係和威脅 ID，驗證風險等級
3. **文件 (Documentation)** - 我們確保所有內容的格式完整
4. **合併 (Merge)** - 新增至威脅模型和視覺化呈現中

## 資源

- [ATLAS 網站](https://atlas.mitre.org/)
- [ATLAS 技術](https://atlas.mitre.org/techniques/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [OpenClaw 威脅模型](/zh-Hant/security/THREAT-MODEL-ATLAS)

## 聯絡方式

- **安全漏洞：** 請參閱我們的 [信任頁面](https://trust.openclaw.ai) 以取得回報說明
- **威脅模型相關問題：** 在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上建立問題
- **一般討論：** Discord #security 頻道

## 致謝

威脅模型的貢獻者將在威脅模型致謝、發行說明以及針對重大貢獻的 OpenClaw 安全名人堂中獲得表彰。

import en from "/components/footer/en.mdx";

<en />
