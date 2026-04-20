---
title: "貢献威脅模型"
summary: "如何貢獻至 OpenClaw 威脅模型"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

# 貢獻至 OpenClaw 威脅模型

感謝您協助讓 OpenClaw 更安全。此威脅模型是一份持續更新的文件，我們歡迎任何人的貢獻——您無需成為安全專家。

## 貢獻方式

### 新增威脅

發現了我們未涵蓋的攻擊途徑或風險嗎？在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上開啟一個 issue，並用自己的話描述它。您無需了解任何框架或填寫每個欄位——只需描述該情境。

**建議包含（非必要）：**

- 攻擊情境及其可能的利用方式
- OpenClaw 的哪些部分受影響（CLI、gateway、channels、ClawHub、MCP 伺服器等）
- 您認為的嚴重程度（低 / 中 / 高 / 關鍵）
- 任何相關研究、CVE 或實際案例的連結

我們會在審查期間處理 ATLAS 對應、威脅 ID 和風險評估。如果您想包含這些細節，那很好——但並非必要。

> **此處用於新增威脅模型，而非回報即時漏洞。**如果您發現了可利用的漏洞，請參閱我們的 [Trust 頁面](https://trust.openclaw.ai) 以了解負責任的披露指示。

### 建議緩解措施

有解決現有威脅的想法嗎？開啟一個 issue 或 PR 並提及該威脅。有用的緩解措施應具體且可執行——例如，「在 gateway 實作每個發送者每分鐘 10 則訊息的速率限制」就比「實作速率限制」更好。

### 提出攻擊鏈

攻擊鏈展示了多個威脅如何結合成為現實的攻擊情境。如果您發現了危險的組合，請描述步驟以及攻擊者會將其串聯在一起的方式。一段關於攻擊在實務中如何展開的簡短敘述，比正式的模板更有價值。

### 修正或改進現有內容

錯別字、釐清說明、過時資訊、更好的範例——歡迎 PR，無需開啟 issue。

## 我們使用的工具

### MITRE ATLAS

此威脅模型建立在 [MITRE ATLAS](https://atlas.mitre.org/)（人工智慧系統對手威脅景觀）之上，該框架專為針對 AI/ML 的威脅（如提示詞注入、工具濫用和代理利用）而設計。您無需了解 ATLAS 即可做出貢獻 — 我們會在審查期間將提交內容映射到該框架。

### 威脅 ID

每個威脅都會獲得一個像 `T-EXEC-003` 的 ID。類別如下：

| 代碼    | 類別                    |
| ------- | ----------------------- |
| RECON   | 偵察 - 資訊收集         |
| ACCESS  | 初始存取 - 獲得進入權限 |
| EXEC    | 執行 - 執行惡意操作     |
| PERSIST | 持久化 - 維持存取       |
| EVADE   | 防禦規避 - 避免被偵測   |
| DISC    | 發現 - 了解環境         |
| EXFIL   | 資料外滲 - 竊取資料     |
| IMPACT  | 影響 - 損害或中斷       |

ID 由維護者在審查期間分配。您無需自行選擇。

### 風險等級

| 等級     | 含義                                      |
| -------- | ----------------------------------------- |
| **嚴重** | 系統完全遭入侵，或高可能性 + 嚴重影響     |
| **高**   | 可能造成重大損害，或中等可能性 + 嚴重影響 |
| **中**   | 中度風險，或低可能性 + 高影響             |
| **低**   | 可能性低且影響有限                        |

如果您不確定風險等級，只需描述影響，我們將進行評估。

## 審查流程

1. **分診** - 我們會在 48 小時內審查新的提交內容
2. **評估** - 我們驗證可行性，分配 ATLAS 映射和威脅 ID，並驗證風險等級
3. **文件化** - 我們確保所有內容都已格式化且完整
4. **合併** - 新增至威脅模型和視覺化圖表

## 資源

- [ATLAS 網站](https://atlas.mitre.org/)
- [ATLAS 技術](https://atlas.mitre.org/techniques/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [OpenClaw 威脅模型](/zh-Hant/security/THREAT-MODEL-ATLAS)

## 聯絡

- **安全漏洞：** 請參閱我們的 [信任頁面](https://trust.openclaw.ai) 以了解回報指示
- **威脅模型問題：** 在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上開立議題
- **一般討論：** Discord #security 頻道

## 致謝

威脅模型的貢獻者將在威脅模型致謝、發行說明以及 OpenClaw 安全名人堂（針對重大貢獻）中獲得表彰。
