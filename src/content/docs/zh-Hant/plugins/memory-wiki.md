---
summary: "memory-wiki: 編譯的知識保存庫，具備出處、主張、儀表板和橋接模式"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "記憶 Wiki"
---

# 記憶 Wiki

`memory-wiki` 是一個內建的外掛程式，可將持續性記憶轉換為編譯的知識保存庫。

它並**不會**取代作用中的記憶外掛程式。作用中的記憶外掛程式仍負責召回、晉升、索引和夢境。 `memory-wiki` 與其並存，將持續性知識編譯成具有確定性頁面、結構化主張、出處、儀表板和機器可讀摘要的可瀏覽 Wiki。

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

| 層級                                                  | 擁有                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| 作用中的記憶外掛程式 (`memory-core`, QMD, Honcho, 等) | 召回、語意搜尋、晉升、夢境、記憶執行階段                                |
| `memory-wiki`                                         | 編譯的 Wiki 頁面、豐富出處的綜合摘要、儀表板、Wiki 專屬的搜尋/取得/應用 |

如果作用中的記憶外掛程式公開共享的召回成果，OpenClaw 可以使用 `memory_search corpus=all` 在一次操作中搜尋這兩個層級。

當您需要 Wiki 專屬的排序、出處或直接存取頁面時，請改用 Wiki 原生工具。

## 保存庫模式

`memory-wiki` 支援三種保存庫模式：

### `isolated`

專屬保存庫、專屬來源，不依賴 `memory-core`。

當您希望 Wiki 成為自己的策展知識儲存庫時，請使用此模式。

### `bridge`

透過公用外掛程式 SDK 接縫，從作用中的記憶外掛程式讀取公用記憶成果和記憶事件。

當您希望 wiki 編譯並組織記憶體插件導出的檔案，而不深入存取私有插件內部時，請使用此模式。

橋接模式可以索引：

- 導出的記憶體檔案
- 夢境報告
- 每日筆記
- 記憶體根檔案
- 記憶體事件日誌

### `unsafe-local`

針對本地私有路徑的明確同機逃逸機制。

此模式是有意設計為實驗性質且不可攜帶的。僅當您了解信任邊界並且特別需要橋接模式無法提供的本地檔案系統存取權時，才使用此模式。

## Vault 佈局

插件會像這樣初始化一個 Vault：

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

- `sources/` 用於導入的原始材料和橋接支援的頁面
- `entities/` 用於持久的事物、人物、系統、專案和物件
- `concepts/` 用於想法、抽象概念、模式和策略
- `syntheses/` 用於編譯的摘要和維護的彙總
- `reports/` 用於生成的儀表板

## 結構化聲明與證據

頁面可以攜帶結構化的 `claims` 前置資料，而不僅僅是自由格式的文字。

每個聲明可以包含：

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

這使得 wiki 的運作更像是信念層級，而不是被動的筆記堆積。聲明可以被追蹤、評分、爭議，並解析回來源。

## 編譯管線

編譯步驟會讀取 wiki 頁面、正規化摘要，並在以下位置發出穩定的機器可讀檔案：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

這些摘要的存在是為了讓代理程式和執行時代碼不必抓取 Markdown 頁面。

編譯輸出也驅動了：

- 針對搜尋/獲取流程的首輪 wiki 索引
- 聲明 ID 查找回所屬頁面
- 精簡的提示補充
- 報告/儀表板生成

## 儀表板與健康報告

當啟用 `render.createDashboards` 時，編譯會在 `reports/` 下維護儀表板。

內建報告包括：

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

這些報告追蹤以下內容：

- 矛盾筆記叢集
- 競爭聲明叢集
- 缺少結構化證據的聲明
- 低信度的頁面和聲明
- 陳舊或未知的新鮮度
- 包含未解決問題的頁面

## 搜尋與檢索

`memory-wiki` 支援兩種搜尋後端：

- `shared`：盡可能使用共享的記憶搜尋流程
- `local`：在本地搜尋 wiki

它也支援三種語料庫：

- `wiki`
- `memory`
- `all`

重要行為：

- `wiki_search` 和 `wiki_get` 在可能時會將編譯摘要作為第一遍
- 聲明 ID 可以解析回所屬頁面
- 有爭議/陳舊/新鮮的聲明會影響排名
- 出處標籤可以保留到結果中

實用規則：

- 使用 `memory_search corpus=all` 進行一次廣泛的召回
- 當您關心 wiki 特定的排名、出處或頁面級信念結構時，
  請使用 `wiki_search` + `wiki_get`

## 代理工具

外掛註冊了這些工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它們的作用：

- `wiki_status`：當前保存庫模式、健康狀況、Obsidian CLI 可用性
- `wiki_search`：搜尋 wiki 頁面，且在配置時搜尋共享記憶語料庫
- `wiki_get`：透過 id/路徑讀取 wiki 頁面，或回退到共享記憶語料庫
- `wiki_apply`：狹窄的綜合/元數據變更，無需自由形式的頁面手術
- `wiki_lint`：結構檢查、出處缺失、矛盾、未解決問題

此外，外掛程式還註冊了一個非獨佔的記憶語料庫補充，因此當主動記憶外掛程式支援語料庫選擇時，共享的 `memory_search` 和 `memory_get` 可以存取 wiki。

## 提示詞與上下文行為

當啟用 `context.includeCompiledDigestPrompt` 時，記憶提示詞區段會附加來自 `agent-digest.json` 的精簡編譯快照。

該快照刻意保持小巧且高訊號：

- 僅包含頂級頁面
- 僅包含頂級斷言
- 矛盾計數
- 問題計數
- 信心/新鮮度限定符

這是選用功能，因為它會改變提示詞的形狀，主要適用於明確使用記憶補充的上下文引擎或舊版提示詞組裝。

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

主要切換選項：

- `vaultMode`：`isolated`、`bridge`、`unsafe-local`
- `vault.renderMode`：`native` 或 `obsidian`
- `bridge.readMemoryArtifacts`：匯入主動記憶外掛程式公開產出
- `bridge.followMemoryEvents`：在橋接模式中包含事件日誌
- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`：將精簡摘要快照附加至記憶提示詞區段
- `render.createBacklinks`：產生確定性相關區塊
- `render.createDashboards`：產生儀表板頁面

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

完整指令參考請參閱 [CLI: wiki](/en/cli/wiki)。

## Obsidian 支援

當 `vault.renderMode` 為 `obsidian` 時，外掛程式會寫入 Obsidian 友善的 Markdown，並可選擇使用官方 `obsidian` CLI。

支援的工作流程包括：

- 狀態探查
- 儲存庫搜尋
- 開啟頁面
- 呼叫 Obsidian 指令
- 跳轉至日記

這是選用的。即使沒有 Obsidian，wiki 仍可在原生模式下運作。

## 建議的工作流程

1. 保留您的主動記憶外掛程式用於召回/晉升/做夢。
2. 啟用 `memory-wiki`。
3. 除非您明確需要橋接模式，否則請從 `isolated` 模式開始。
4. 當來源出處很重要時，請使用 `wiki_search` / `wiki_get`。
5. 使用 `wiki_apply` 進行狹隘的綜合或元數據更新。
6. 在進行有意義的更改後，執行 `wiki_lint`。
7. 如果您希望看到過時/矛盾的可見性，請開啟儀表板。

## 相關文件

- [記憶概覽](/en/concepts/memory)
- [CLI: memory](/en/cli/memory)
- [CLI: wiki](/en/cli/wiki)
- [外掛程式 SDK 概覽](/en/plugins/sdk-overview)
