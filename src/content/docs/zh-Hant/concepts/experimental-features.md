---
summary: "OpenClaw 中的實驗性標誌含義以及目前有記錄哪些標誌"
title: "實驗性功能"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

OpenClaw 中的實驗性功能是**選用預覽功能**。它們位於明確的標誌之後，因為它們在成為穩定的預設值或長期的公開合約之前，仍需要實際驗證。

請將它們與一般設定區別對待：

- 除非相關文件告訴您嘗試某個功能，否則請保持**預設關閉**狀態。
- 預期其**形狀和行為的變更**速度會比穩定設定更快。
- 如果已經存在穩定的路徑，請優先選擇穩定路徑。
- 如果您在大範圍內推廣 OpenClaw，請先在較小的環境中測試實驗性標誌，然後再將其納入共用的基準。

## 目前記錄的標誌

| 介面             | 金鑰                                                      | 使用時機                                                                            | 更多資訊                                                                         |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 本機模型執行階段 | `agents.defaults.experimental.localModelLean`             | 較小或較嚴格的本機後端無法處理 OpenClaw 的完整預設工具介面                          | [本機模型](/zh-Hant/gateway/local-models)                                             |
| 記憶體搜尋       | `agents.defaults.memorySearch.experimental.sessionMemory` | 您希望 `memory_search` 索引先前的會話記錄，並接受額外的儲存/索引成本                | [記憶體設定參考](/zh-Hant/reference/memory-config#session-memory-search-experimental) |
| 結構化規劃工具   | `tools.experimental.planTool`                             | 您希望在相容的執行階段和 UI 中公開結構化的 `update_plan` 工具，以進行多步驟工作追蹤 | [Gateway 設定參考](/zh-Hant/gateway/config-tools#toolsexperimental)                   |

## 本機模型精簡模式

`agents.defaults.experimental.localModelLean: true` 是較弱的本機模型設定的
壓力釋放閥。它會修剪重量級的預設工具，例如
`browser`、`cron` 和 `message`，以便對於小內容或較嚴格的 OpenAI 相容後端來說，提示形狀更小且不那麼脆弱。

這故意**不是**正常的路徑。如果您的後端能乾淨利落地處理完整的執行階段，請將其關閉。

## 實驗性並不意味著隱藏

如果某個功能是實驗性的，OpenClaw 應該在文件和設定路徑本身中清楚地說明。它**不應該**做的是將預覽行為偷偷塞進一個看起來穩定的預設旋鈕，並假裝這是正常的。這就是設定介面變得雜亂的原因。

## 相關

- [功能](/zh-Hant/concepts/features)
- [發行頻道](/zh-Hant/install/development-channels)
