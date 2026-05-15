---
summary: "CLI 參考手冊，適用於 `openclaw wiki` (memory-wiki vault status、search、compile、lint、apply、bridge 以及 Obsidian 輔助工具)"
read_when:
  - You want to use the memory-wiki CLI
  - You are documenting or changing `openclaw wiki`
title: "Wiki"
---

# `openclaw wiki`

檢查並維護 `memory-wiki` vault。

由內建的 `memory-wiki` 外掛程式提供。

相關連結：

- [Memory Wiki 外掛程式](/zh-Hant/plugins/memory-wiki)
- [記憶體概覽](/zh-Hant/concepts/memory)
- [CLI：memory](/zh-Hant/cli/memory)

## 用途

當您想要一個具備以下功能的已編譯知識庫時，請使用 `openclaw wiki`：

- wiki 原生搜尋和頁面讀取
- 豐富來源的綜合報告
- 矛盾和新舊程度報告
- 從作用中的 memory 外掛程式橋接匯入
- 選用的 Obsidian CLI 輔助工具

## 常用指令

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki search "who should I ask about Teams?" --mode route-question
openclaw wiki get entity.alpha --from 1 --lines 80

openclaw wiki apply synthesis "Alpha Summary" \
  --body "Short synthesis body" \
  --source-id source.alpha

openclaw wiki apply metadata entity.alpha \
  --source-id source.alpha \
  --status review \
  --question "Still active?"

openclaw wiki bridge import
openclaw wiki unsafe-local import

openclaw wiki obsidian status
openclaw wiki obsidian search "alpha"
openclaw wiki obsidian open syntheses/alpha-summary.md
openclaw wiki obsidian command workspace:quick-switcher
openclaw wiki obsidian daily
```

## 指令

### `wiki status`

檢查目前的 vault 模式、健康狀態和 Obsidian CLI 可用性。

當您不確定 vault 是否已初始化、橋接模式是否健全，或是否可使用 Obsidian 整合功能時，請先使用此指令。

當橋接模式處於啟用狀態並設定為讀取記憶體成品時，此命令會
查詢執行中的 Gateway，以便它能看到與 agent/runtime
記憶體相同的啟用記憶體外掛程式內容。

### `wiki doctor`

執行 wiki 健康檢查並顯示設定或 vault 問題。

當橋接模式處於啟用狀態並設定為讀取記憶體成品時，此命令會
在建立報表前查詢執行中的 Gateway。已停用的橋接匯入
以及未讀取記憶體成品的橋接設定會保持在本地/離線狀態。

常見問題包括：

- 啟用橋接模式但未提供公開記憶體成品
- 無效或遺失的 vault 版面配置
- 當預期為 Obsidian 模式時，遺失外部 Obsidian CLI

### `wiki init`

建立 wiki vault 版面配置和起始頁面。

這會初始化根目錄結構，包括頂層索引和快取
目錄。

### `wiki ingest <path-or-url>`

將內容匯入 wiki 來源層。

註記：

- URL 匯入由 `ingest.allowUrlIngest` 控制
- 匯入的來源頁面會在 frontmatter 中保留來源資訊
- 啟用後，自動編譯可在匯入後執行

### `wiki compile`

重建索引、相關區塊、儀表板和已編譯的摘要。

這會將穩定的機器可讀成品寫入以下位置：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

如果啟用 `render.createDashboards`，編譯也會重新整理報表頁面。

### `wiki lint`

對 vault 進行 Lint 並回報：

- 結構性問題
- 來源缺口
- 矛盾
- 未解決的問題
- 低置信度頁面/主張
- 過時的頁面/主張

在進行有意義的 wiki 更新後執行此操作。

### `wiki search <query>`

搜尋 wiki 內容。

行為取決於配置：

- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`
- `--mode`：`auto`、`find-person`、`route-question`、`source-evidence` 或
  `raw-claim`

當您需要 wiki 特定的排名或出處詳細資訊時，請使用 `wiki search`。
若要進行一次廣泛的共享召回傳遞，當啟用的記憶體外掛程式公開共享搜尋時，建議優先使用 `openclaw memory search`。

搜尋模式有助於代理程式選擇正確的介面：

- `find-person`：別名、代號、社交帳號、規範 ID 和人員頁面
- `route-question`：詢問/最適用於提示和關係脈絡
- `source-evidence`：來源頁面和結構化證據欄位
- `raw-claim`：具有主張/證據元資料的結構化主張文字

範例：

```bash
openclaw wiki search "bgroux" --mode find-person
openclaw wiki search "who knows Teams rollout?" --mode route-question
openclaw wiki search "maintainer-whois" --mode source-evidence
openclaw wiki search "strong route Teams" --mode raw-claim --json
```

當結果符合結構化主張時，文字輸出包含 `Claim:` 和 `Evidence:` 行。JSON 輸出還會公開 `matchedClaimId`、
`matchedClaimStatus`、`matchedClaimConfidence`、`evidenceKinds` 和
`evidenceSourceIds`，以供代理程式端進行深入分析。

### `wiki get <lookup>`

透過 ID 或相對路徑讀取 wiki 頁面。

範例：

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

套用狹隘的變更，而無需自由形式的頁面手術。

支援的流程包括：

- 建立/更新綜合頁面
- 更新頁面元資料
- 附加來源 ID
- 新增問題
- 新增矛盾
- 更新置信度/狀態
- 撰寫結構化主張

此命令的存在是為了讓 wiki 能夠安全演進，而無需手動編輯受管理的區塊。

### `wiki bridge import`

將公開的記憶體成品從現用記憶體外掛匯入至橋接支援的來源頁面。

當您希望將最新的匯出記憶體成品拉取到 wiki vault 中時，請在 `bridge` 模式下使用此功能。

對於主動橋接成品讀取，CLI 會透過 Gateway RPC 路由匯入，以便匯入使用執行時記憶體外掛上下文。如果橋接匯入被停用或成品讀取被關閉，該指令將保持本機/離線零匯入行為。

### `wiki unsafe-local import`

在 `unsafe-local` 模式下從明確配置的本機路徑匯入。

這是有意設計為實驗性的，且僅限於同一台機器。

### `wiki obsidian ...`

適用於以 Obsidian 相容模式執行之 vault 的 Obsidian 輔助指令。

子指令：

- `status`
- `search`
- `open`
- `command`
- `daily`

當啟用 `obsidian.useOfficialCli` 時，這些需要 `PATH` 上的官方 `obsidian` CLI。

## 實用使用指南

- 當出處和頁面身分很重要時，請使用 `wiki search` + `wiki get`。
- 請使用 `wiki apply`，而不是手動編輯受管理的產生區段。
- 在信任相互矛盾或低信心的內容之前，請先使用 `wiki lint`。
- 當您希望立即獲得最新的儀表板和編譯摘要時，請在大量匯入或來源變更後使用 `wiki compile`。
- 當橋接模式依賴新匯出的記憶體成品時，請使用 `wiki bridge import`。

## 配置關聯

`openclaw wiki` 的行為受以下因素影響：

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

請參閱 [Memory Wiki plugin](/zh-Hant/plugins/memory-wiki) 以了解完整的配置模型。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Memory wiki](/zh-Hant/plugins/memory-wiki)
