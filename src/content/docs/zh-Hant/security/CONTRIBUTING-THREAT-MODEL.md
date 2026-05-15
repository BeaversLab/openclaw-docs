---
summary: "如何為 OpenClaw 威脅模型做出貢獻"
title: "為威脅模型做出貢獻"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

感謝您協助讓 OpenClaw 更安全。此威脅模型是一份持續更新的文件，我們歡迎任何人貢獻——您不必是安全專家。

## 貢獻方式

### 新增威脅

發現了我們未涵蓋的攻擊向量或風險嗎？請在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上開啟一個 Issue，並用自己的話描述它。您不需要了解任何框架或填寫每個欄位——只需描述該情境即可。

**建議包含（非必填）：**

- 攻擊情境及其如何被利用
- OpenClaw 的哪些部分會受到影響（CLI、gateway、channels、ClawHub、MCP servers 等）
- 您認為的嚴重程度（低 / 中 / 高 / 嚴重）
- 任何相關研究、CVE 或實際案例的連結

我們會在審查期間處理 ATLAS 對應、威脅 ID 和風險評估。如果您想包含這些細節，那很好——但這並非預期之舉。

> **這是用於新增至威脅模型，而非通報即時漏洞。**如果您發現了可被利用的漏洞，請參閱我們的 [Trust page](https://trust.openclaw.ai) 以了解負責任的披露指引。

### 建議緩解措施

有解決現有威脅的點子嗎？請開啟一個 Issue 或 PR 並引用該威脅。有用的緩解措施應具體且可執行——例如，「在 gateway 實作每個發送者每分鐘 10 則訊息的速率限制」就比「實作速率限制」來得好。

### 提議攻擊鏈

攻擊鏈展示了多個威脅如何結合成為一個現實的攻擊情境。如果您發現了危險的組合，請描述步驟以及攻擊者會如何將它們串連起來。一段簡短描述攻擊在實務上如何發展的敘述，比正式的模板更有價值。

### 修正或改善現有內容

錯別字、釐清說明、過時資訊、更好的範例——歡迎提交 PR，無需開啟 Issue。

## 我們使用的工具

### MITRE ATLAS 框架

此威脅模型基於 [MITRE ATLAS](https://atlas.mitre.org/)（Adversarial Threat Landscape for AI Systems）建立，這是一個專門為 AI/ML 威脅（如提示注入、工具誤用和代理程式利用）設計的框架。您不需要了解 ATLAS 也能貢獻——我們會在審查期間將提交內容對應到該框架。

### 威脅 ID

每個威脅都會獲得一個像 `T-EXEC-003` 的 ID。分類如下：

| 代碼    | 類別                  |
| ------- | --------------------- |
| RECON   | 偵查 - 資訊收集       |
| ACCESS  | 初始存取 - 取得進入權 |
| EXEC    | 執行 - 執行惡意操作   |
| PERSIST | 持久化 - 維持存取權   |
| EVADE   | 防禦規避 - 避免被偵測 |
| DISC    | 探索 - 瞭解環境       |
| EXFIL   | 資料外洩 - 竊取資料   |
| IMPACT  | 影響 - 損害或中斷     |

ID 是由維護者在審查期間指派的。您不需要選擇一個。

### 風險等級

| 等級     | 含義                                      |
| -------- | ----------------------------------------- |
| **關鍵** | 系統完全被攻陷，或高可能性 + 關鍵影響     |
| **高**   | 可能造成重大損害，或中等可能性 + 關鍵影響 |
| **中等** | 中等風險，或低可能性 + 高影響             |
| **低**   | 可能性低且影響有限                        |

如果您不確定風險等級，只需描述影響，我們會進行評估。

## 審查流程

1. **分類** - 我們會在 48 小時內審查新的提交
2. **評估** - 我們會驗證可行性，指派 ATLAS 對應和威脅 ID，並驗證風險等級
3. **文件** - 我們確保所有內容格式正確且完整
4. **合併** - 新增至威脅模型和視覺化圖表

## 資源

- [ATLAS 網站](https://atlas.mitre.org/)
- [ATLAS 技術](https://atlas.mitre.org/techniques/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [OpenClaw 威脅模型](/zh-Hant/security/THREAT-MODEL-ATLAS)

## 聯絡

- **安全漏洞：** 請參閱我們的 [信任頁面](https://trust.openclaw.ai) 以取得回報指示
- **威脅模型問題：** 在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上提出議題
- **一般討論：** Discord #security 頻道

## 致謝

威脅模型的貢獻者將在威脅模型致謝、版本說明以及 OpenClaw 安全名人堂中受到表彰，以感謝其重大貢獻。

## 相關

- [威脅模型](/zh-Hant/security/THREAT-MODEL-ATLAS)
- [形式化驗證](/zh-Hant/security/formal-verification)
