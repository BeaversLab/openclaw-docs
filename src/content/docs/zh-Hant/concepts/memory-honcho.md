---
title: "Honcho 記憶體"
summary: "透過 Honcho 外掛程式實現的 AI 原生跨會話記憶體"
read_when:
  - You want persistent memory that works across sessions and channels
  - You want AI-powered recall and user modeling
---

# Honcho 記憶體

[Honcho](https://honcho.dev) 為 OpenClaw 新增了 AI 原生記憶體。它會將對話保存到專用服務，並隨著時間建立使用者和代理程式模型，讓您的代理程式擁有超越工作區 Markdown 檔案的跨會話上下文。

## 提供的功能

- **跨會話記憶體** -- 每次對話後都會持久化保存，因此上下文會在會話重置、壓縮和頻道切換時延續。
- **使用者建模** -- Honcho 為每個使用者（偏好設定、事實、溝通風格）和代理程式（人格、學習到的行為）維護檔案。
- **語意搜尋** -- 搜尋過去對話中的觀察結果，而不僅僅是當前會話。
- **多重代理程式感知** -- 父代理程式會自動追蹤衍生的子代理程式，並將父代理程式加入為子會話的觀察者。

## 可用工具

Honcho 註冊了代理程式在對話期間可以使用的工具：

**資料檢索 (快速，無 LLM 呼叫):**

| 工具                        | 功能                                  |
| --------------------------- | ------------------------------------- |
| `honcho_context`            | 跨會話的完整使用者呈現                |
| `honcho_search_conclusions` | 對儲存的結論進行語意搜尋              |
| `honcho_search_messages`    | 尋找跨會話的訊息 (依傳送者、日期篩選) |
| `honcho_session`            | 當前會話歷史和摘要                    |

**問答 (由 LLM 驅動):**

| 工具         | 功能                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `honcho_ask` | 詢問關於使用者的問題。`depth='quick'` 取得事實，`'thorough'` 進行綜合 |

## 開始使用

安裝外掛程式並執行設定：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

設定指令會提示您輸入 API 憑證，寫入設定，並選擇性地遷移現有的工作區記憶體檔案。

<Info>Honcho 可以完全在本機執行 (自我託管) 或透過 `api.honcho.dev` 的託管 API 執行。自我託管選項不需要外部相依性。</Info>

## 設定

設定值位於 `plugins.entries["openclaw-honcho"].config` 之下：

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

對於自我託管執行個體，請將 `baseUrl` 指向您的本機伺服器 (例如 `http://localhost:8000`) 並省略 API 金鑰。

## 遷移現有記憶

如果您有現有的工作區記憶檔案（`USER.md`、`MEMORY.md`、
`IDENTITY.md`、`memory/`、`canvas/`），`openclaw honcho setup` 會偵測並
提議遷移它們。

<Info>遷移過程是非破壞性的 —— 檔案會被上傳到 Honcho。原始檔案 絕不會被刪除或移動。</Info>

## 運作原理

在每次 AI 輪次之後，對話會被持久化至 Honcho。使用者與
代理人的訊息都會被觀察，讓 Honcho 能隨著時間建構並完善其模型。

在對話過程中，Honcho 工具會在 `before_prompt_build`
階段查詢服務，在模型看到提示之前注入相關語境。這確保了
準確的輪次邊界和相關的回憶。

## Honcho 與內建記憶的比較

|                | 內建 / QMD                | Honcho                 |
| -------------- | ------------------------- | ---------------------- |
| **儲存**       | 工作區 Markdown 檔案      | 專用服務（本地或託管） |
| **跨工作階段** | 透過記憶檔案              | 自動、內建             |
| **使用者建模** | 手動（寫入 MEMORY.md）    | 自動個人資料           |
| **搜尋**       | 向量 + 關鍵字（混合）     | 基於觀察的語意搜尋     |
| **多代理人**   | 未追蹤                    | 父子感知               |
| **相依性**     | 無（內建）或 QMD 二進位檔 | 外掛安裝               |

Honcho 和內建記憶系統可以一起運作。當 QMD 配置後，
會提供額外工具來搜尋本地 Markdown 檔案，並配合
Honcho 的跨工作階段記憶。

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
- [記憶](/en/concepts/memory) -- OpenClaw 記憶概覽
- [語境引擎](/en/concepts/context-engine) -- 外掛語境引擎的運作方式
