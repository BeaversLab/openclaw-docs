---
summary: "memory-wiki：附帶來源、主張、儀表板和橋接模式的編譯知識庫"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "記憶維基"
---

# 記憶 Wiki

`memory-wiki` 是一個內建插件，可將持久記憶轉換為編譯的知識庫。

它**不**會取代活動記憶插件。活動記憶插件仍然擁有召回、提升、索引和做夢功能。`memory-wiki` 位於其旁邊，並將持久知識編譯成具有決定性頁面、結構化主張、來源、儀表板和機器可讀摘要的可導航維基。

當您希望記憶的運作方式更接近維護良好的知識層，而非一堆 Markdown 檔案時，請使用它。

## 新增的功能

- 具有確定性頁面佈局的專用 Wiki 保存庫
- 結構化的主張和證據元資料，而不只是散文
- 頁面層級的出處、信心度、矛盾和待解決問題
- 供代理程式/執行階段消費者使用的編譯摘要
- Wiki 原生的搜尋/取得/應用/檢查工具
- 可選的橋接模式，從作用中的記憶外掛程式匯入公用成果
- 可選的 Obsidian 友善渲染模式和 CLI 整合

## 它如何與記憶整合

可以這樣看待這種區分：

| 層級                                          | 擁有                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| 活動記憶插件（`memory-core`、QMD、Honcho 等） | 召回、語意搜尋、晉升、夢境、記憶執行階段                                |
| `memory-wiki`                                 | 編譯的 Wiki 頁面、豐富出處的綜合摘要、儀表板、Wiki 專屬的搜尋/取得/應用 |

如果活動記憶插件公開共享的召回工件，OpenClaw 可以使用 `memory_search corpus=all` 在一次通過中搜尋這兩個層級。

當您需要 Wiki 專屬的排序、出處或直接存取頁面時，請改用 Wiki 原生工具。

## 推薦的混合模式

對於本地優先的設置，一個強大的預設值是：

- 使用 QMD 作為活動記憶後端進行召回和廣泛的語義搜尋
- 使用 `memory-wiki` 的 `bridge` 模式來建立持久合成知識頁面

這種分離效果很好，因為每個層級都保持專注：

- QMD 保持原始筆記、會話匯出和額外集合的可搜尋性
- `memory-wiki` 編譯穩定的實體、主張、儀表板和來源頁面

實用規則：

- 當您想要跨記憶體進行一次廣泛召回時，請使用 `memory_search`
- 當您想要具備來源感知能力的維基結果時，請使用 `wiki_search` 和 `wiki_get`
- 當您想要共享搜尋跨越這兩個層級時，請使用 `memory_search corpus=all`

如果橋接模式報告零個匯出工件，則活動記憶插件目前尚未公開公開橋接輸入。先執行 `openclaw wiki doctor`，然後確認活動記憶插件支援公開工件。

## 保存庫模式

`memory-wiki` 支援三種保存庫模式：

### `isolated`

擁有自己的保存庫、自己的來源，不依賴 `memory-core`。

當您希望維基成為其自己的策展知識儲存庫時，請使用此模式。

### `bridge`

透過公開外掛程式 SDK 縫隙，從主動記憶外掛程式讀取公開記憶產出和記憶事件。

當您希望 Wiki 編譯並整理記憶外掛程式的匯出產出，而不深入存取私有外掛程式內部時，請使用此模式。

橋接模式可以索引：

- 匯出的記憶產出
- 夢境報告
- 每日筆記
- 記憶根目錄檔案
- 記憶事件日誌

### `unsafe-local`

針對本機私有路徑的明確同機逃逸方法。

此模式是有意設計為實驗性且不可移植的。僅當您了解信任邊界並且特別需要橋接模式無法提供的本機檔案系統存取權限時才使用它。

## Vault 版面配置

外掛程式初始化 Vault 的方式如下：

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

受管理的內容保留在生成的區塊內。人類筆記區塊會被保留。

主要頁面群組包括：

- `sources/` 用於匯入的原始素材和橋接支援的頁面
- `entities/` 用於持久的事物、人員、系統、專案和物件
- `concepts/` 用於想法、抽象、模式和政策
- `syntheses/` 用於編譯摘要和維護的匯總
- `reports/` 用於生成的儀表板

## 結構化主張和證據

頁面可以攜帶結構化的 `claims` 前置元數據，而不僅僅是自由形式文字。

每個主張可以包含：

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

證據條目可以包含：

- `sourceId`
- `path`
- `lines`
- `weight`
- `note`
- `updatedAt`

這就是讓 Wiki 表現得更像信念層而不是被動筆記傾倒的原因。主張可以被追蹤、評分、爭論，並回溯解析到來源。

## 編譯管線

編譯步驟讀取 Wiki 頁面，正規化摘要，並在以下位置發出穩定的機器可讀產出：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

這些摘要的存在是為了讓代理程式和執行時代碼不必抓取 Markdown 頁面。

編譯輸出還支持：

- 用於搜尋/獲取流程的首輪 wiki 索引
- 依據 claim-id 查詢回所屬頁面
- 精簡的提示詞補充
- 報告/儀表板生成

## 儀表板與健康報告

當 `render.createDashboards` 啟用時，編譯會在 `reports/` 下維護儀表板。

內建報告包括：

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

這些報告追蹤諸如：

- 矛盾筆記叢集
- 競爭聲明叢集
- 缺少結構化證據的聲明
- 低信心度的頁面與聲明
- 陳舊或新鮮度未知
- 有未解決問題的頁面

## 搜尋與檢索

`memory-wiki` 支援兩種搜尋後端：

- `shared`：可用時使用共享記憶體搜尋流程
- `local`：本地搜尋 wiki

它還支援三種語料庫：

- `wiki`
- `memory`
- `all`

重要行為：

- `wiki_search` 和 `wiki_get` 盡可能使用編譯摘要作為首輪
- claim id 可以解析回所屬頁面
- 有爭議/陳舊/新鮮的聲明會影響排序
- 來源標籤可以保留到結果中

實用規則：

- 使用 `memory_search corpus=all` 進行一次廣泛的召回
- 當您關注 wiki 特定的排序、來源或頁面級信念結構時，
  使用 `wiki_search` + `wiki_get`

## 代理工具

該外掛註冊了這些工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它們的作用：

- `wiki_status`：目前儲存庫模式、健康狀況、Obsidian CLI 可用性
- `wiki_search`：搜尋 wiki 頁面，且若經配置，搜尋共享記憶體語料庫
- `wiki_get`：透過 id/路徑讀取 wiki 頁面，或退回至共享記憶體語料庫
- `wiki_apply`：狹義的綜合/元資料變更，而不涉及自由形式的頁面手術
- `wiki_lint`：結構檢查、來源缺口、矛盾、未解問題

該外掛也註冊了一個非獨佔的記憶語料庫補充，因此當啟用記憶外掛支援語料庫選擇時，共享的 `memory_search` 和 `memory_get` 可以存取該 Wiki。

## 提示詞與上下文行為

當啟用 `context.includeCompiledDigestPrompt` 時，記憶提示詞區段會附加來自 `agent-digest.json` 的精簡編譯快照。

該快照特意保持精簡且高訊號量：

- 僅限頂層頁面
- 僅限頂層主張
- 矛盾計數
- 問題計數
- 信心/新穎度限定詞

這是選用的，因為它會改變提示詞形狀，且主要對明確使用記憶補充的上下文引擎或舊版提示詞組建有幫助。

## 設定

將設定放在 `plugins.entries.memory-wiki.config` 下：

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

主要切換選項：

- `vaultMode`：`isolated`、`bridge`、`unsafe-local`
- `vault.renderMode`：`native` 或 `obsidian`
- `bridge.readMemoryArtifacts`：匯入啟用記憶外掛的公共產物
- `bridge.followMemoryEvents`：在橋接模式中包含事件日誌
- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`：將精簡摘要快照附加至記憶提示詞區段
- `render.createBacklinks`：生成決定性相關區塊
- `render.createDashboards`：生成儀表板頁面

### 範例：QMD + 橋接模式

當您希望使用 QMD 進行回憶並使用 `memory-wiki` 作為維護的知識層時，請使用此設定：

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

這保留了：

- QMD 負責啟用記憶回憶
- `memory-wiki` 專注於編譯頁面和儀表板
- 在您刻意啟用編譯摘要提示詞之前，提示詞形狀保持不變

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

請參閱 [CLI: wiki](/zh-Hant/cli/wiki) 以取得完整的命令參考。

## Obsidian 支援

當 `vault.renderMode` 為 `obsidian` 時，外掛會寫入 Obsidian 友善的
Markdown，並可選擇性地使用官方 `obsidian` CLI。

支援的工作流程包括：

- 狀態探測
- vault 搜尋
- 開啟頁面
- 呼叫 Obsidian 指令
- 跳至每日筆記

這是可選的。Wiki 仍可在沒有 Obsidian 的原生模式下運作。

## 推薦工作流程

1. 保留您的作用中記憶體外掛用於召回/提升/做夢。
2. 啟用 `memory-wiki`。
3. 從 `isolated` 模式開始，除非您明確想要橋接模式。
4. 當出處很重要時使用 `wiki_search` / `wiki_get`。
5. 對於狹隘的綜合或元資料更新，使用 `wiki_apply`。
6. 在有意義的變更之後執行 `wiki_lint`。
7. 如果您想要查看過時/矛盾的內容，請開啟儀表板。

## 相關文件

- [記憶體概觀](/zh-Hant/concepts/memory)
- [CLI: memory](/zh-Hant/cli/memory)
- [CLI: wiki](/zh-Hant/cli/wiki)
- [外掛 SDK 概觀](/zh-Hant/plugins/sdk-overview)
