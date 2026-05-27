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

| 介面             | 金鑰                                                                                       | 使用時機                                                                                                             | 更多資訊                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 本機模型執行階段 | `agents.defaults.experimental.localModelLean`，`agents.list[].experimental.localModelLean` | 較小或較嚴格的本機後端無法處理 OpenClaw 的完整預設工具介面                                                           | [本地模型](/zh-Hant/gateway/local-models)                                             |
| 記憶體搜尋       | `agents.defaults.memorySearch.experimental.sessionMemory`                                  | 您希望 `memory_search` 索引先前的工作階段記錄，並接受額外的儲存/索引成本                                             | [記憶體配置參考](/zh-Hant/reference/memory-config#session-memory-search-experimental) |
| Codex 套件       | `plugins.entries.codex.config.appServer.experimental.sandboxExecServer`                    | 如果您希望原生 Codex app-server 0.132.0 或更新版本將目標設為以 OpenClaw 沙盒支援的 exec-server，而不是停用 Code Mode | [Codex 套件參考](/zh-Hant/plugins/codex-harness-reference#sandboxed-native-execution) |
| 結構化規劃工具   | `tools.experimental.planTool`                                                              | 您希望在相容的 runtime 和 UI 中公開結構化的 `update_plan` 工具，以進行多步驟工作追蹤                                 | [Gateway 配置參考](/zh-Hant/gateway/config-tools#toolsexperimental)                   |

## 本地模型精簡模式

`agents.defaults.experimental.localModelLean: true` 是較弱本地模型設置的減壓閥。當它開啟時，OpenClaw 會在每一輪中從代理的工具介面移除三個預設工具 —— `browser`、`cron` 和 `message`。其他不變。使用 `agents.list[].experimental.localModelLean` 為單一配置的代理啟用或停用相同的行為。

### 為什麼是這三個工具

這三個工具在預設的 OpenClaw runtime 中具有最大的描述和最多的參數形狀。在小型上下文或更嚴格的 OpenAI 相容後端上，這決定了：

- 工具架構整齊地放入提示中 vs. 擠壓對話歷史記錄。
- 模型選擇正確的工具 vs. 因為外觀相似的架構太多而發出格式錯誤的工具呼叫。
- Chat Completions 配接器保持在伺服器的結構化輸出限制內 vs. 因工具呼叫負載大小而觸發 400 錯誤。

移除它們不會靜默地重新接線 OpenClaw —— 它只是讓工具列表變短。模型仍然可以使用 `read`、`write`、`edit`、`exec`、`apply_patch`、網頁搜尋/擷取 (當已配置)、記憶體以及會話/代理工具。

### 何時開啟它

當您已經證明模型可以與 Gateway 通訊，但完整的代理輪次行為異常時，請啟用精簡模式。典型的信號鏈是：

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` 成功。
2. 正常的代理輪次失敗，出現格式錯誤的工具呼叫、提示過大，或模型忽略其工具。
3. 切換 `localModelLean: true` 可清除失敗狀態。

### 何時應保持關閉

如果您的後端能乾淨地處理完整的預設執行時，請保持此項關閉。精簡模式是一種權宜之計，並非預設值。它的存在是因為某些本地堆疊需要較小的工具介面才能正常運作；託管模型和資源充足的本地裝置則不需要。

精簡模式也不能取代 `tools.profile`、`tools.allow`/`tools.deny` 或模型 `compat.supportsTools: false` 逃生艙。如果您需要為特定代理永久縮減工具介面，請優先使用這些穩定的控制項，而非實驗性旗標。

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

僅適用於單一代理：

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

變更旗標後重新啟動 Gateway，然後使用以下指令確認已修剪的工具清單：

```bash
openclaw status --deep
```

深度狀態輸出會列出作用中的代理工具；當精簡模式開啟時，`browser`、`cron` 和 `message` 應該不會出現。

## 實驗性功能不代表隱藏功能

如果某項功能是實驗性的，OpenClaw 應在文件和設定路徑中明確說明。它**不**該做的是將預覽行為偷偷塞進看似穩定的預設控制項中，並假裝這很正常。這正是設定介面變得雜亂的原因。

## 相關

- [功能](/zh-Hant/concepts/features)
- [發行管道](/zh-Hant/install/development-channels)
