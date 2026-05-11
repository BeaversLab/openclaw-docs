---
summary: "memory-wiki：附帶來源、主張、儀表板和橋接模式的編譯知識庫"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Memory wiki"
---

`memory-wiki` 是一個隨附的插件，可以將持久記憶轉換為編譯後的知識庫。

它**並不**取代 active memory 插件。Active memory 插件仍然擁有召回、晉升、索引和做夢功能。`memory-wiki` 位於其旁邊，並將持久的知識編譯成一個具有確定性頁面、結構化主張、來源、儀表板和機器可讀摘要的可導航 wiki。

當您希望記憶的行為更像一個維護良好的知識層，而不僅僅是一堆 Markdown 文件時，請使用它。

## 它增加了什麼

- 一個具有確定性頁面佈局的專用 wiki 庫
- 結構化的主張和證據元數據，而不僅僅是散文
- 頁面級別的來源、信心、矛盾和未解決的問題
- 為代理/運行時使用者編譯的摘要
- Wiki 原生的搜尋/獲取/應用/檢查工具
- 可選的橋接模式，用於從 active memory 插件匯入公共成品
- 可選的 Obsidian 友好渲染模式和 CLI 整合

## 它如何與記憶配合

可以這樣理解這種分工：

| 層級                                               | 擁有                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| Active memory 插件 (`memory-core`, QMD, Honcho 等) | 召回、語意搜尋、晉升、做夢、記憶運行時                                  |
| `memory-wiki`                                      | 編譯的 wiki 頁面、富含來源的綜合資訊、儀表板、wiki 特定的搜尋/獲取/應用 |

如果 active memory 插件暴露了共享的召回成品，OpenClaw 可以使用 `memory_search corpus=all` 在一次通過中搜尋這兩個層級。

當您需要 wiki 特定的排名、來源或直接頁面存取時，請改用 wiki 原生工具。

## 推薦的混合模式

對於本地優先的設定，一個強大的預設值是：

- QMD 作為用於召回和廣泛語意搜尋的 active memory 後端
- `memory-wiki` 處於 `bridge` 模式，用於持久的綜合知識頁面

這種分工運作良好，因為每個層級都保持專注：

- QMD 保持原始筆記、會話匯出和額外的集合可被搜尋
- `memory-wiki` 編譯穩定的實體、主張、儀表板和來源頁面

實用規則：

- 當您想要在記憶中進行一次廣泛的召回通過時，請使用 `memory_search`
- 當您想要具有來源感知的 wiki 結果時，請使用 `wiki_search` 和 `wiki_get`
- 當您希望共用搜尋涵蓋這兩個層級時，請使用 `memory_search corpus=all`

如果橋接模式報告零個匯出的產物，表示主動記憶體外掛目前尚未公開公開的橋接輸入。請先執行 `openclaw wiki doctor`，然後確認主動記憶體外掛支援公開產物。

## Vault 模式

`memory-wiki` 支援三種 Vault 模式：

### `isolated`

擁有自己的 Vault，擁有自己的來源，不依賴 `memory-core`。

當您希望 wiki 成為自己策劃的知識庫時，請使用此模式。

### `bridge`

透過公開外掛 SDK 縫隙，從主動記憶體外掛讀取公開記憶體產物和記憶體事件。

當您希望 wiki 編譯和整理記憶體外掛匯出的產物，而不深入私人外掛內部時，請使用此模式。

橋接模式可以索引：

- 匯出的記憶體產物
- 夢境報告
- 每日筆記
- 記憶體根檔案
- 記憶體事件日誌

### `unsafe-local`

針對本機私人路徑的明確同機逃離通道。

此模式故意設計為實驗性且不可移植的。僅當您了解信任邊界並且特別需要橋接模式無法提供的本機檔案系統存取權時，才使用它。

## Vault 版面配置

外掛會像這樣初始化 Vault：

```text
<vault>/
  AGENTS.md
  WIKI.md
  index.md
  inbox.md
  entities/
  concepts/
  syntheses/
  sources/
  reports/
  _attachments/
  _views/
  .openclaw-wiki/
```

受管理的內容保留在產生的區塊內。人類筆記區塊會被保留。

主要頁面群組包括：

- `sources/` 用於匯入的原始材料和橋接支援的頁面
- `entities/` 用於持久的事物、人員、系統、專案和物件
- `concepts/` 用於想法、抽象、模式和政策
- `syntheses/` 用於編譯摘要和維護的彙總
- `reports/` 用於產生的儀表板

## 結構化聲明與證據

頁面可以攜帶結構化的 `claims` 前置資料，而不僅僅是自由形式的文字。

每個聲明可以包含：

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

證據條目可以包括：

- `sourceId`
- `path`
- `lines`
- `weight`
- `note`
- `updatedAt`

這就是讓 wiki 運作得更像一個信念層，而不是被動的傾倒筆記的原因。主張可以被追蹤、評分、爭議，並解決回源頭。

## 編譯管道

編譯步驟會讀取 wiki 頁面、標準化摘要，並在以下位置輸出穩定的機器可讀構件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

這些摘要的存在是為了讓代理程式和執行時代碼不必去抓取 Markdown 頁面。

編譯輸出也提供支援給：

- 搜尋/取得流程的初步 wiki 索引
- 根據主題 ID 反查擁有頁面
- 緊湊的提示詞補充
- 報告/儀表板生成

## 儀表板與健康報告

當啟用 `render.createDashboards` 時，編譯會維護 `reports/` 下的儀表板。

內建報告包括：

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

這些報告追蹤以下事項：

- 矛盾筆記群集
- 競爭主張群集
- 缺少結構化證據的主張
- 低信心度的頁面與主張
- 陳舊或不明的新鮮度
- 包含未解決問題的頁面

## 搜尋與檢索

`memory-wiki` 支援兩種搜尋後端：

- `shared`：在可用時使用共用的記憶搜尋流程
- `local`：在本機搜尋 wiki

它也支援三種語料庫：

- `wiki`
- `memory`
- `all`

重要行為：

- `wiki_search` 和 `wiki_get` 盡可能會將編譯摘要作為第一遍使用
- 主題 ID 可以解析回擁有頁面
- 有爭議/陳舊/新鮮的主張會影響排名
- 出處標籤可以保留在結果中

實用規則：

- 使用 `memory_search corpus=all` 進行一次廣泛的召回
- 當您關注 wiki 特定的排名、出處或頁面層級的信念結構時，請使用 `wiki_search` + `wiki_get`

## Agent 工具

此外掛註冊了這些工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它們的功能：

- `wiki_status`：目前的 vault 模式、健康狀況、Obsidian CLI 可用性
- `wiki_search`：搜尋 wiki 頁面，若經設定，亦包含共享的記憶語料庫
- `wiki_get`：透過 id/path 讀取 wiki 頁面，或退回共享記憶語料庫
- `wiki_apply`：狹隘的綜合/元資料變異，而非自由形式的頁面手術
- `wiki_lint`：結構檢查、出處缺口、矛盾、未解問題

此外掛也註冊了一個非獨佔的記憶語料庫補充，因此當 active memory
外掛支援語料庫選擇時，共享的 `memory_search` 和 `memory_get` 可以存取 wiki。

## 提示與上下文行為

當啟用 `context.includeCompiledDigestPrompt` 時，記憶提示區段會
附加來自 `agent-digest.json` 的精簡編譯快照。

該快照刻意保持小巧且高訊號價值：

- 僅包含頂層頁面
- 僅包含頂層聲明
- 矛盾計數
- 問題計數
- 信心/新鮮度限定詞

這是選用的，因為它會改變提示的形狀，且主要對明確消耗記憶補充的上下文引擎或舊版提示組裝有用。

## 設定

將設定置於 `plugins.entries.memory-wiki.config` 下：

```json5
{
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "isolated",
          vault: {
            path: "~/.openclaw/wiki/main",
            renderMode: "obsidian",
          },
          obsidian: {
            enabled: true,
            useOfficialCli: true,
            vaultName: "OpenClaw Wiki",
            openAfterWrites: false,
          },
          bridge: {
            enabled: false,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          ingest: {
            autoCompile: true,
            maxConcurrentJobs: 1,
            allowUrlIngest: true,
          },
          search: {
            backend: "shared",
            corpus: "wiki",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
          render: {
            preserveHumanBlocks: true,
            createBacklinks: true,
            createDashboards: true,
          },
        },
      },
    },
  },
}
```

主要切換開關：

- `vaultMode`：`isolated`、`bridge`、`unsafe-local`
- `vault.renderMode`：`native` 或 `obsidian`
- `bridge.readMemoryArtifacts`：匯入 active memory 外掛的公開成品
- `bridge.followMemoryEvents`：在橋接模式中包含事件日誌
- `search.backend`：`shared` 或 `local`
- `search.corpus`: `wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`：將緊湊摘要快照附加至記憶提示區段
- `render.createBacklinks`：生成決定性相關區塊
- `render.createDashboards`：生成儀表板頁面

### 示例：QMD + 橋接模式

當您希望使用 QMD 進行檢索並使用 `memory-wiki` 作為維護的知識層時，請使用此選項：

```json5
{
  memory: {
    backend: "qmd",
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "bridge",
          bridge: {
            enabled: true,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          search: {
            backend: "shared",
            corpus: "all",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
        },
      },
    },
  },
}
```

這將保持：

- QMD 負責主動記憶檢索
- `memory-wiki` 專注於編譯頁面和儀表板
- 在您刻意啟用編譯摘要提示之前，提示結構保持不變

## CLI

`memory-wiki` 也公開了頂層 CLI 介面：

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki get entity.alpha
openclaw wiki apply synthesis "Alpha Summary" --body "..." --source-id source.alpha
openclaw wiki bridge import
openclaw wiki obsidian status
```

完整的指令參考請參見 [CLI: wiki](/zh-Hant/cli/wiki)。

## Obsidian 支援

當 `vault.renderMode` 為 `obsidian` 時，外掛會寫入 Obsidian 友善的 Markdown，並可選擇使用官方 `obsidian` CLI。

支援的工作流程包括：

- 狀態探測
- 存放庫搜尋
- 開啟頁面
- 呼叫 Obsidian 指令
- 跳轉至日記

這是可選的。Wiki 仍可在不使用 Obsidian 的原生模式下運作。

## 推薦工作流程

1. 保留您的主動記憶外掛用於檢索/升級/夢境。
2. 啟用 `memory-wiki`。
3. 除非您明確需要橋接模式，否則請從 `isolated` 模式開始。
4. 當來源很重要時，請使用 `wiki_search` / `wiki_get`。
5. 使用 `wiki_apply` 進行狹窄的綜合或元數據更新。
6. 在有意義的變更之後執行 `wiki_lint`。
7. 如果您希望查看過期/矛盾的內容，請開啟儀表板。

## 相關文件

- [記憶概觀](/zh-Hant/concepts/memory)
- [CLI: memory](/zh-Hant/cli/memory)
- [CLI: wiki](/zh-Hant/cli/wiki)
- [外掛 SDK 概觀](/zh-Hant/plugins/sdk-overview)
