---
title: "實驗性功能"
summary: "OpenClaw 中實驗性旗標的含義以及目前記載了哪些旗標"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

# 實驗性功能

OpenClaw 中的實驗性功能是**選用預覽介面**。它們背後有明確的旗標，因為在被納入穩定預設值或長期公開合約之前，它們仍需要實際使用場景的驗證。

請以不同於一般設定方式來對待它們：

- 除非相關文件告訴您嘗試，否則請保持**預設關閉**。
- 預期其**形狀和行為會比穩定設定變動得更快**。
- 當穩定途徑已存在時，優先選擇穩定途徑。
- 如果您正在廣泛部署 OpenClaw，請先在較小的環境中測試實驗性旗標，再將其納入共用基準。

## 目前已記載的旗標

| 介面             | 金鑰                                                      | 使用時機                                                                            | 更多資訊                                                                         |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 本機模型執行階段 | `agents.defaults.experimental.localModelLean`             | 較小或較嚴格的本機後端無法應付 OpenClaw 完整的預設工具介面                          | [本機模型](/zh-Hant/gateway/local-models)                                             |
| 記憶體搜尋       | `agents.defaults.memorySearch.experimental.sessionMemory` | 您希望 `memory_search` 為先前的會話逐字稿建立索引，並接受額外的儲存/索引成本        | [記憶體設定參考](/zh-Hant/reference/memory-config#session-memory-search-experimental) |
| 結構化規劃工具   | `tools.experimental.planTool`                             | 您希望在相容的執行階段和 UI 中公開結構化的 `update_plan` 工具，以進行多步驟工作追蹤 | [Gateway 設定參考](/zh-Hant/gateway/configuration-reference#toolsexperimental)        |

## 本機模型精簡模式

`agents.defaults.experimental.localModelLean: true` 是針對較弱本機模型設定的釋壓閥。它會修剪像
`browser`、`cron` 和 `message` 這類重量級預設工具，讓提示形狀變小且對於小語境或較嚴格的 OpenAI 相容後端來說較不脆弱。

這刻意**不是**正常途徑。如果您的後端能順利處理完整的執行階段，請將此功能關閉。

## 實驗性不代表隱藏

如果某個功能是實驗性的，OpenClaw 應該在文件和設定路徑中清楚說明。它**不該**做的是將預覽行為偷偷塞進看起來穩定的預設選項，並假裝那是正常的。這就是設定介面變得混亂的原因。
