---
summary: "memory-wiki：具有來源、聲明、儀表板和橋接模式的編譯知識保管庫"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "記憶體 wiki"
---

`memory-wiki` 是一個內建外掛，可將持久記憶體轉換為編譯後的知識保管庫。

它**不會**取代主動記憶體外掛。主動記憶體外掛仍然負責召回、提升、索引和夢境。`memory-wiki` 位於其旁邊，將持久知識編譯成具有確定性頁面、結構化聲明、來源、儀表板和機器可讀摘要的可瀏覽 wiki。

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

| 層級                                           | 擁有                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| 主動記憶體外掛 (`memory-core`、QMD、Honcho 等) | 召回、語意搜尋、晉升、做夢、記憶運行時                                  |
| `memory-wiki`                                  | 編譯的 wiki 頁面、富含來源的綜合資訊、儀表板、wiki 特定的搜尋/獲取/應用 |

如果主動記憶體外掛公開了共享的召回工件，OpenClaw 可以使用 `memory_search corpus=all` 在一次通過中搜尋這兩個層級。

當您需要 wiki 特定的排名、來源或直接頁面存取時，請改用 wiki 原生工具。

## 推薦的混合模式

對於本地優先的設定，一個強大的預設值是：

- QMD 作為用於召回和廣泛語意搜尋的 active memory 後端
- 用於持久合成知識頁面的 `bridge` 模式下的 `memory-wiki`

這種分工運作良好，因為每個層級都保持專注：

- QMD 保持原始筆記、會話匯出和額外的集合可被搜尋
- `memory-wiki` 編譯穩定的實體、聲明、儀表板和來源頁面

實用規則：

- 當您想要對記憶體進行一次廣泛的召回通過時，請使用 `memory_search`
- 當您想要具有來源感知的 wiki 結果時，請使用 `wiki_search` 和 `wiki_get`
- 當您希望共享搜尋跨越兩個層級時，請使用 `memory_search corpus=all`

如果橋接模式報告零個匯出工件，則主動記憶體外掛目前尚未公開公用橋接輸入。請先執行 `openclaw wiki doctor`，然後確認主動記憶體外掛支援公用工件。

當橋接模式處於啟用狀態並且啟用了 `bridge.readMemoryArtifacts` 時，`openclaw wiki status`、`openclaw wiki doctor` 和 `openclaw wiki bridge
import` 會透過執行中的 Gateway 讀取。這使 CLI 橋接檢查與執行時記憶體外掛內容保持一致。如果橋接已停用或工件讀取已關閉，這些指令將保持其本機/離線行為。

## 保存庫模式

`memory-wiki` 支援三種保管庫模式：

### `isolated`

擁有自己的保管庫、自己的來源，不依賴 `memory-core`。

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

- 用於匯入原始素材和橋接支援頁面的 `sources/`
- 用於持久事物、人物、系統、專案和物件的 `entities/`
- 用於想法、抽象概念、模式和政策的 `concepts/`
- 用於編譯摘要和維護彙總的 `syntheses/`
- 用於生成儀表板的 `reports/`

## 結構化主張和證據

頁面可以包含結構化的 `claims` 前置元數據，而不僅僅是自由格式的文本。

每個主張可以包含：

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

證據條目可以包含：

- `kind`
- `sourceId`
- `path`
- `lines`
- `weight`
- `confidence`
- `privacyTier`
- `note`
- `updatedAt`

這就是讓 wiki 的運作更像一個信念層，而不是被動的筆記堆積的原因。主張可以被追蹤、評分、爭議，並解析回源頭。

## 面向代理程式的實體元數據

實體頁面還可以包含供代理程式使用的路由元數據。這是通用的前置元數據，因此適用於人員、團隊、系統、專案或任何其他實體類型。

常見欄位包括：

- `entityType`：例如 `person`、`team`、`system` 或 `project`
- `canonicalId`：跨別名和匯入使用的穩定身份金鑰
- `aliases`：應解析到同一頁面的名稱、代號或標籤
- `privacyTier`：`public`、`local-private`、`sensitive` 或 `confirm-before-use`
- `bestUsedFor` / `notEnoughFor`：精簡的路由提示
- `lastRefreshedAt`：與頁面編輯時間分開的來源重新整理時間戳
- `personCard`：可選的特定人員路由卡，包含帳號、社交媒體、電子郵件、時區、領域、要求、避免要求、信心和隱私設定
- `relationships`：指向相關頁面的類型邊，包含目標、種類、權重、信心、證據種類、隱私層級和備註

對於人員 wiki，代理通常應先從 `reports/person-agent-directory.md` 開始，然後在使用聯絡細節或推斷事實之前，使用 `wiki_get` 開啟人員頁面。

範例：

```yaml
pageType: entity
entityType: person
id: entity.brad-groux
canonicalId: maintainer.brad-groux
aliases:
  - Brad
  - bgroux
privacyTier: local-private
bestUsedFor:
  - Microsoft Teams and Azure routing
notEnoughFor:
  - legal approval
lastRefreshedAt: "2026-04-29T00:00:00.000Z"
personCard:
  handles:
    - "@bgroux"
  socials:
    - "https://x.example/bgroux"
  emails:
    - brad@example.com
  timezone: America/Chicago
  lane: Microsoft ecosystem
  askFor:
    - Teams rollout questions
  avoidAskingFor:
    - unrelated billing decisions
  confidence: 0.8
  privacyTier: confirm-before-use
relationships:
  - targetId: entity.alice
    targetTitle: Alice
    kind: collaborates-with
    confidence: 0.7
    evidenceKind: discrawl-stat
claims:
  - id: claim.brad.teams
    text: Brad is useful for Microsoft Teams routing.
    status: supported
    confidence: 0.9
    evidence:
      - kind: maintainer-whois
        sourceId: source.maintainers
        privacyTier: local-private
```

## 編譯管線

編譯步驟會讀取 wiki 頁面、正規化摘要，並在以下位置輸出穩定的機器可讀工件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

這些摘要的存在是為了讓代理和執行時代碼不必去抓取 Markdown 頁面。

編譯輸出還提供給以下功能使用：

- 搜尋/取得流程的初步 wiki 索引
- 查詢聲明 ID 以回溯到擁有該聲明的頁面
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
- `reports/person-agent-directory.md`
- `reports/relationship-graph.md`
- `reports/provenance-coverage.md`
- `reports/privacy-review.md`

這些報告追蹤的事項包括：

- 矛盾註記叢集
- 競爭聲明叢集
- 缺乏結構化證據的聲明
- 低信心度頁面與聲明
- 陳舊或未知的新鮮度
- 包含未解決問題的頁面
- 人員/實體路由卡
- 結構化關係邊
- 證據類別覆蓋率
- 使用前需要審查的非公開隱私層級

## 搜尋與檢索

`memory-wiki` 支援兩種搜尋後端：

- `shared`：當可用時使用共享的記憶體搜尋流程
- `local`：在本地搜尋 wiki

它還支援三個語料庫：

- `wiki`
- `memory`
- `all`

重要行為：

- `wiki_search` 和 `wiki_get` 可能會在可能時使用編譯摘要作為第一遍篩選
- 聲明 ID 可以解析回所屬頁面
- 有爭議/過時/新穎的聲明會影響排名
- 出處標籤可以保留在結果中
- 搜尋模式可以針對人員查詢、問題路由、來源證據或原始聲明對排名進行偏調

實用規則：

- 使用 `memory_search corpus=all` 進行一次廣泛的回顧
- 當您關心 Wiki 特定的排名、出處或頁面級別的信念結構時，請使用 `wiki_search` + `wiki_get`

搜尋模式：

- `auto`：平衡的預設值
- `find-person`：提昇類人實體、別名、代號、社交帳號和規範 ID
- `route-question`：提昇代理卡片、請求提示、最佳用途提示和關係上下文
- `source-evidence`：提昇來源頁面和結構化證據元數據
- `raw-claim`：提昇匹配的結構化聲明並在結果中返回聲明/證據元數據

當結果匹配結構化聲明時，`wiki_search` 可以在其詳細資訊有效載荷中返回
`matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、
`evidenceKinds` 和 `evidenceSourceIds`。文字輸出
還會在可用時包含緊湊的 `Claim:` 和 `Evidence:` 行。

## 代理工具

此外掛註冊了這些工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它們的作用：

- `wiki_status`：目前的儲存庫模式、健康狀況、Obsidian CLI 可用性
- `wiki_search`：搜尋 Wiki 頁面，並在配置時搜尋共享記憶語料庫；
  接受 `mode` 用於人員查詢、問題路由、來源證據或原始
  聲明深入分析
- `wiki_get`：透過 ID/路徑讀取 Wiki 頁面或退回到共享記憶語料庫
- `wiki_apply`：狹義的綜合/元數據變更，無需自由形式的頁面手術
- `wiki_lint`：結構檢查、來源缺口、矛盾、未解決的問題

該插件也註冊了一個非獨佔的記憶語料庫補充，因此共享的
`memory_search` 和 `memory_get` 可以在主動記憶
插件支援語料庫選擇時存取該 wiki。

## 提示詞與上下文行為

當啟用 `context.includeCompiledDigestPrompt` 時，記憶提示詞區塊
會附加來自 `agent-digest.json` 的精簡編譯快照。

該快照刻意保持小巧且高信號：

- 僅包含頂層頁面
- 僅包含頂層聲明
- 矛盾計數
- 問題計數
- 信心/新鮮度限定符

這是選用功能，因為它會改變提示詞的形狀，且主要對明確消耗記憶補充內容的
上下文引擎或舊版提示詞組裝有用。

## 組態

將組態放在 `plugins.entries.memory-wiki.config` 下：

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
- `bridge.readMemoryArtifacts`：匯入主動記憶插件的公用產出
- `bridge.followMemoryEvents`：在橋接模式下包含事件日誌
- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`：將精簡摘要快照附加至記憶提示詞區塊
- `render.createBacklinks`：生成確定性相關區塊
- `render.createDashboards`：生成儀表板頁面

### 範例：QMD + 橋接模式

當您想要使用 QMD 進行檢索並使用 `memory-wiki` 作為維護的
知識層時，請使用此設定：

```json5
{
  memory: {
    backend: "qmd",
  },
  plugins: {
    entries: {
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
- 提示詞形狀保持不變，直到您有意啟用編譯摘要提示詞

## CLI

`memory-wiki` 也公開了一個頂層 CLI 介面：

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

當 `vault.renderMode` 為 `obsidian` 時，此外掛程式會寫入 Obsidian 友善的 Markdown，並可選擇性地使用官方的 `obsidian` CLI。

支援的工作流程包括：

- 狀態探測
- vault 搜尋
- 開啟頁面
- 呼叫 Obsidian 指令
- 跳轉到每日筆記

這是可選的。即使沒有 Obsidian，wiki 仍可在原生模式下運作。

## 建議的工作流程

1. 保留您的 active memory 外掛程式用於召回/晉升/夢想。
2. 啟用 `memory-wiki`。
3. 除非您明確想要 bridge 模式，否則請從 `isolated` 模式開始。
4. 當出處重要時，使用 `wiki_search` / `wiki_get`。
5. 使用 `wiki_apply` 進行狹隘的綜合或元資料更新。
6. 在有意義的變更後執行 `wiki_lint`。
7. 如果您想要查看過時/矛盾的內容，請開啟儀表板。

## 相關文件

- [記憶體概覽](/zh-Hant/concepts/memory)
- [CLI: memory](/zh-Hant/cli/memory)
- [CLI: wiki](/zh-Hant/cli/wiki)
- [外掛 SDK 概覽](/zh-Hant/plugins/sdk-overview)
