---
summary: "OpenClaw 中的實驗性標誌含義以及目前記錄了哪些標誌"
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

| 介面             | 金鑰                                                                                       | 使用時機                                                                            | 更多資訊                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 本機模型執行階段 | `agents.defaults.experimental.localModelLean`，`agents.list[].experimental.localModelLean` | 較小或較嚴格的本機後端無法處理 OpenClaw 的完整預設工具介面                          | [本機模型](/zh-Hant/gateway/local-models)                                             |
| 記憶體搜尋       | `agents.defaults.memorySearch.experimental.sessionMemory`                                  | 您希望 `memory_search` 索引先前的工作階段記錄，並接受額外的儲存/索引成本            | [記憶體設定參考](/zh-Hant/reference/memory-config#session-memory-search-experimental) |
| 結構化規劃工具   | `tools.experimental.planTool`                                                              | 您希望在相容的執行環境和 UI 中公開結構化的 `update_plan` 工具，以用於多步驟工作追蹤 | [Gateway 設定參考](/zh-Hant/gateway/config-tools#toolsexperimental)                   |

## 本機模型精簡模式

`agents.defaults.experimental.localModelLean: true` 是一個針對較弱本機模型設定的減壓閥。當它開啟時，OpenClaw 會在每一輪中從代理人的工具介面中移除三個預設工具 — `browser`、`cron` 和 `message`。其他都不會改變。使用 `agents.list[].experimental.localModelLean` 可針對單一已設定的代理人啟用或停用相同的行為。

### 為什麼是這三個工具

這三個工具在預設的 OpenClaw 執行環境中具有最大的描述和最多的參數形式。在小上下文或更嚴格的 OpenAI 相容後端上，這意味著以下區別：

- 工具架構乾淨地放入提示中，與擠出對話歷史之間的區別。
- 模型選擇正確的工具，與因為有太多相似架構而發出格式錯誤的工具呼叫之間的區別。
- Chat Completions 介面卡保持在伺服器的結構化輸出限制內，與因工具呼叫 payload 大小而觸發 400 錯誤之間的區別。

移除它們並不會靜默地重新接線 OpenClaw — 這只是讓工具列表變短而已。模型仍然擁有 `read`、`write`、`edit`、`exec`、`apply_patch`、網頁搜尋/擷取（設定時）、記憶體以及工作階段/代理人工具可用。

### 何時開啟

當您已經證明模型可以與閘道器通訊但完整的代理程式輪次表現異常時，請啟用精簡模式。典型的訊號鏈是：

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` 成功。
2. 當正常的代理輪次因格式錯誤的工具呼叫、過大的提示或模型忽略其工具而失敗時。
3. 切換 `localModelLean: true` 可清除失敗狀態。

### 何時保持關閉

如果您的後端能乾淨地處理完整的預設執行時，請保持此功能關閉。精簡模式是一種權宜之計，而非預設選項。它的存在是因為某些本機堆疊需要較小的工具介面才能正常運作；託管模型和資源充足的本機機器則不需要。

精簡模式也不會取代 `tools.profile`、`tools.allow`/`tools.deny` 或模型 `compat.supportsTools: false` 緊急逃生門。如果您需要為特定代理人提供永久且更狹窄的工具介面，請優先使用這些穩定的控制項，而非實驗性標誌。

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

僅針對單一代理人：

```json5
{
  agents: {
    list: [
      {
        id: "local",
        model: "lmstudio/gemma-4-e4b-it",
        experimental: {
          localModelLean: true,
        },
      },
    ],
  },
}
```

變更標誌後請重新啟動 Gateway，然後使用以下指令確認已修剪的工具列表：

```bash
openclaw status --deep
```

深度狀態輸出會列出啟用的代理工具；當啟用精簡模式時，`browser`、`cron` 和 `message` 應該不會出現。

## 實驗性功能並不意味著隱藏

如果某項功能是實驗性的，OpenClaw 應該在文件和設定路徑中明確說明。它**不**應該做的是將預覽行為偷偷塞進一個看似穩定的預設選項，並假裝那是正常的。這就是設定介面變得混亂的原因。

## 相關

- [功能](/zh-Hant/concepts/features)
- [發布管道](/zh-Hant/install/development-channels)
