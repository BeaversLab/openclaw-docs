---
summary: "OpenClaw 中的實驗性旗標意味著什麼，以及目前記載了哪些旗標"
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

| 介面             | 金鑰                                                      | 使用時機                                                                                | 更多資訊                                                                         |
| ---------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 本機模型執行階段 | `agents.defaults.experimental.localModelLean`             | 較小或較嚴格的本機後端無法處理 OpenClaw 的完整預設工具介面                              | [本地模型](/zh-Hant/gateway/local-models)                                             |
| 記憶體搜尋       | `agents.defaults.memorySearch.experimental.sessionMemory` | 您希望 `memory_search` 編製先前會話記錄的索引，並接受額外的儲存/編製索引成本            | [記憶體配置參考](/zh-Hant/reference/memory-config#session-memory-search-experimental) |
| 結構化規劃工具   | `tools.experimental.planTool`                             | 您希望結構化的 `update_plan` 工具被公開，以便在相容的執行環境和 UI 中進行多步驟工作追蹤 | [閘道器配置參考](/zh-Hant/gateway/config-tools#toolsexperimental)                     |

## 本機模型精簡模式

`agents.defaults.experimental.localModelLean: true` 是針對較弱本地模型設定的壓力釋放閥。當它開啟時，OpenClaw 會在每個輪次中從代理程式的工具介面移除三個預設工具 —— `browser`、`cron` 和 `message`。其他一切保持不變。

### 為什麼是這三個工具

這三個工具在預設的 OpenClaw 執行環境中具有最大的描述和最多的參數形式。在小上下文或更嚴格的 OpenAI 相容後端上，這意味著以下區別：

- 工具架構乾淨地放入提示中，與擠出對話歷史之間的區別。
- 模型選擇正確的工具，與因為有太多相似架構而發出格式錯誤的工具呼叫之間的區別。
- Chat Completions 介面卡保持在伺服器的結構化輸出限制內，與因工具呼叫 payload 大小而觸發 400 錯誤之間的區別。

移除它們不會無線重新連接 OpenClaw —— 它只是縮短了工具列表。模型仍然可以使用 `read`、`write`、`edit`、`exec`、`apply_patch`、網頁搜尋/擷取（當已配置時）、記憶體以及會話/代理程式工具。

### 何時開啟

當您已經證明模型可以與閘道器通訊但完整的代理程式輪次表現異常時，請啟用精簡模式。典型的訊號鏈是：

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` 成功。
2. 當正常的代理輪次因格式錯誤的工具呼叫、過大的提示或模型忽略其工具而失敗時。
3. 切換 `localModelLean: true` 可清除該失敗狀態。

### 何時保持關閉

如果您的後端能乾淨地處理完整的預設執行時，請保持此功能關閉。精簡模式是一種權宜之計，而非預設選項。它的存在是因為某些本機堆疊需要較小的工具介面才能正常運作；託管模型和資源充足的本機機器則不需要。

精簡模式也不能取代 `tools.profile`、`tools.allow`/`tools.deny` 或模型 `compat.supportsTools: false` 逃生艙。如果您需要為特定代理永久使用更狹窄的工具介面，請優先考慮使用這些穩定的控制項，而非實驗性標誌。

### 啟用

```json5
{
  agents: {
    defaults: {
      experimental: {
        localModelLean: true,
      },
    },
  },
}
```

變更標誌後重新啟動 Gateway，然後使用以下命令確認已修剪的工具清單：

```bash
openclaw status --deep
```

深度狀態輸出會列出活躍的代理工具；當開啟精簡模式時，`browser`、`cron` 和 `message` 應該不會出現。

## 實驗性不代表隱藏

如果某個功能是實驗性的，OpenClaw 應該在文件和設定路徑中明確說明。它**不**應該做的是將預覽行為偷偷塞進看起來穩定的預設控制項中，並假裝這很正常。這就是設定介面變得雜亂的原因。

## 相關

- [功能](/zh-Hant/concepts/features)
- [發布管道](/zh-Hant/install/development-channels)
