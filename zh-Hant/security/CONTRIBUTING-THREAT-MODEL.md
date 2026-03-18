# 貢獻至 OpenClaw 威脅模型

感謝您協助讓 OpenClaw 更安全。此威脅模型是一份持續更新的文件，我們歡迎任何人貢獻——您無需成為安全專家。

## 貢獻方式

### 新增威脅

發現了我們未涵蓋的攻擊向量或風險嗎？請在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上提出 issue 並用自己的話描述它。您不需要了解任何架構或填寫所有欄位——只要描述情境即可。

**建議包含（非必填）：**

- 攻擊情境及其可能被利用的方式
- OpenClaw 的哪些部分會受到影響（CLI、gateway、channels、ClawHub、MCP servers 等）
- 您認為的嚴重程度（低 / 中 / 高 / 嚴重）
- 相關研究、CVE 或實際範例的任何連結

我們會在審查期間處理 ATLAS 對應、威脅 ID 和風險評估。如果您想包含這些細節，那很好——但並非預期之事。

> **這是用於新增威脅模型，而非回報即時漏洞。** 如果您發現了可利用的漏洞，請參閱我們的 [Trust 頁面](https://trust.openclaw.ai) 以取得負責任的揭露說明。

### 建議緩解措施

有解決現有威脅的想法嗎？請提出 issue 或 PR 並參照該威脅。有用的緩解措施應具體且可執行——例如，「在 gateway 實作每個發送者每分鐘 10 則訊息的速率限制」比「實作速率限制」更好。

### 提出攻擊鏈

攻擊鏈展示了多個威脅如何結合成為現實的攻擊情境。如果您發現了危險的組合，請描述步驟以及攻擊者會如何將它們串連起來。一份簡短的攻擊實際演變敘述，比正式的範本更有價值。

### 修正或改善現有內容

錯別字、釐清內容、過期資訊、更好的範例——歡迎提出 PR，無需提出 issue。

## 我們使用的工具

### MITRE ATLAS

此威脅模型是基於 [MITRE ATLAS](https://atlas.mitre.org/)（Adversarial Threat Landscape for AI Systems）構建的，這是一個專為 AI/ML 威脅（如提示注入、工具濫用和代理利用）設計的架構。您無需了解 ATLAS 也能貢獻——我們會在審查期間將提交內容對應至該架構。

### 威脅 ID

每個威脅都會獲得一個 ID，例如 `T-EXEC-003`。類別包括：

| 代碼    | 類別                  |
| ------- | --------------------- |
| RECON   | 偵查 - 資訊收集       |
| ACCESS  | 初步存取 - 獲得進入權 |
| EXEC    | 執行 - 執行惡意行為   |
| PERSIST | 持續性 - 維持存取     |
| EVADE   | 防禦規避 - 避免被偵測 |
| DISC    | 發現 - 了解環境       |
| EXFIL   | 滲透 - 竊取資料       |
| IMPACT  | 影響 - 損害或中斷     |

ID 會在審查期間由維護者指派。您不需要選擇一個。

### 風險等級

| 等級     | 含義                                      |
| -------- | ----------------------------------------- |
| **嚴重** | 完全系統入侵，或高可能性 + 嚴重影響       |
| **高**   | 可能造成重大損害，或中等可能性 + 嚴重影響 |
| **中**   | 中等風險，或低可能性 + 高影響             |
| **低**   | 可能性低且影響有限                        |

如果您不確定風險等級，只需描述影響，我們會進行評估。

## 審查流程

1. **分類** - 我們會在 48 小時內審閱新的提交
2. **評估** - 我們驗證可行性、指派 ATLAS 對應和威脅 ID、驗證風險等級
3. **文件化** - 我們確保所有內容格式正確且完整
4. **合併** - 新增至威脅模型和視覺化

## 資源

- [ATLAS 網站](https://atlas.mitre.org/)
- [ATLAS 技術](https://atlas.mitre.org/techniques/)
- [ATLAS 個案研究](https://atlas.mitre.org/studies/)
- [OpenClaw 威脅模型](/zh-Hant/security/THREAT-MODEL-ATLAS)

## 聯絡方式

- **安全漏洞：** 請參閱我們的 [Trust 頁面](https://trust.openclaw.ai) 以取得回報說明
- **威脅模型相關問題：** 在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上建立議題
- **一般討論：** Discord #security 頻道

## 致謝

威脅模型的貢獻者會在威脅模型致謝、發行說明，以及 OpenClaw 安全名人堂中獲得表彰，以感謝其重大貢獻。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
