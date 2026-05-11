---
summary: "透過 Honcho 外掛實現的 AI 原生跨會話記憶"
title: "Honcho 記憶"
read_when:
  - You want persistent memory that works across sessions and channels
  - You want AI-powered recall and user modeling
---

[Honcho](https://honcho.dev) 為 OpenClaw 新增 AI 原生記憶功能。它將對話持久化到專用服務中，並隨時間建立使用者和代理程式模型，為您的代理程式提供超越工作區 Markdown 檔案的跨會話上下文。

## 提供的功能

- **跨會話記憶** —— 每次輪詢後都會持久化對話，因此上下文會跨會話重置、壓縮和通道切換持續傳遞。
- **使用者建模** —— Honcho 為每個使用者（偏好設定、事實、溝通風格）和代理程式（個性、學習行為）維護個人資料。
- **語意搜尋** —— 搜尋過去對話中的觀察結果，而不僅僅是當前會話。
- **多代理感知** —— 父代理會自動追蹤產生的子代理，並將父代理作為觀察者新增到子會話中。

## 可用工具

Honcho 註冊了代理程式在對話期間可以使用的工具：

**資料檢索（快速，無 LLM 呼叫）：**

| 工具                        | 功能                                 |
| --------------------------- | ------------------------------------ |
| `honcho_context`            | 跨會話的完整使用者表示               |
| `honcho_search_conclusions` | 對儲存結論的語意搜尋                 |
| `honcho_search_messages`    | 跨會話尋找訊息（按發送者、日期篩選） |
| `honcho_session`            | 當前會話歷史和摘要                   |

**問答（由 LLM 驅動）：**

| 工具         | 功能                                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| `honcho_ask` | 詢問關於使用者的問題。 `depth='quick'` 用於查詢事實，`'thorough'` 用於綜合分析 |

## 快速入門

安裝外掛並執行設置：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

設置指令會提示您輸入 API 憑證，寫入配置，並選擇性地遷移現有的工作區記憶檔案。

<Info>Honcho 可以完全在本地執行（自託管），也可以透過 `api.honcho.dev` 的託管 API 執行。自託管選項不需要外部相依項。</Info>

## 配置

設定位於 `plugins.entries["openclaw-honcho"].config` 下：

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // omit for self-hosted
          workspaceId: "openclaw", // memory isolation
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

對於自託管實例，將 `baseUrl` 指向您的本地伺服器（例如 `http://localhost:8000`）並省略 API 金鑰。

## 遷移現有記憶

如果您有現有的工作區記憶檔案 (`USER.md`、 `MEMORY.md`、
`IDENTITY.md`、 `memory/`、 `canvas/`)， `openclaw honcho setup` 會偵測並
提議進行遷移。

<Info>遷移過程是非破壞性的——檔案會上傳到 Honcho。原始檔案 永遠不會被刪除或移動。</Info>

## 運作原理

在每次 AI 回合之後，對話內容會持久化儲存至 Honcho。由於會同時觀察使用者與
代理人的訊息，這讓 Honcho 能隨著時間建立並優化其模型。

在對話過程中，Honcho 工具會在 `before_prompt_build`
階段查詢服務，在模型看到提示詞之前注入相關上下文。這確保了
準確的回合邊界與相關的召回。

## Honcho 與內建記憶

|                | Builtin / QMD           | Honcho                 |
| -------------- | ----------------------- | ---------------------- |
| **儲存空間**   | 工作區 Markdown 檔案    | 專屬服務（本地或託管） |
| **跨會話**     | 透過記憶檔案            | 自動，內建             |
| **使用者建模** | 手動（寫入 MEMORY.md）  | 自動設定檔             |
| **搜尋**       | 向量 + 關鍵字（混合）   | 基於觀測結果的語意搜尋 |
| **多代理**     | 未追蹤                  | 具備父子關係感知       |
| **相依性**     | 無（內建）或 QMD 執行檔 | 外掛安裝               |

Honcho 和內建記憶系統可以一起運作。當 QMD 設定完成後，
除了 Honcho 的跨會話記憶外，還會有額外的工具可用來搜尋本地的 Markdown 檔案。

## CLI 指令

```bash
openclaw honcho setup                        # Configure API key and migrate files
openclaw honcho status                       # Check connection status
openclaw honcho ask <question>               # Query Honcho about the user
openclaw honcho search <query> [-k N] [-d D] # Semantic search over memory
```

## 延伸閱讀

- [外掛原始碼](https://github.com/plastic-labs/openclaw-honcho)
- [Honcho 文件](https://docs.honcho.dev)
- [Honcho OpenClaw 整合指南](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [記憶](/zh-Hant/concepts/memory) -- OpenClaw 記憶概覽
- [上下文引擎](/zh-Hant/concepts/context-engine) -- 外掛上下文引擎的運作方式

## 相關

- [記憶概覽](/zh-Hant/concepts/memory)
- [內建記憶引擎](/zh-Hant/concepts/memory-builtin)
- [QMD 記憶引擎](/zh-Hant/concepts/memory-qmd)
