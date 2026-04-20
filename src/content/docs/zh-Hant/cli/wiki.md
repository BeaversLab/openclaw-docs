---
summary: "`openclaw wiki` 的 CLI 參考（memory-wiki vault status、search、compile、lint、apply、bridge 和 Obsidian 輔助工具）"
read_when:
  - You want to use the memory-wiki CLI
  - You are documenting or changing `openclaw wiki`
title: "wiki"
---

# `openclaw wiki`

檢查並維護 `memory-wiki` vault。

由捆綁的 `memory-wiki` 外掛程式提供。

相關連結：

- [Memory Wiki 外掛程式](/zh-Hant/plugins/memory-wiki)
- [Memory 概覽](/zh-Hant/concepts/memory)
- [CLI：memory](/zh-Hant/cli/memory)

## 用途

當您想要一個具有以下功能的編譯知識庫時，請使用 `openclaw wiki`：

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

### `wiki doctor`

執行 wiki 健康檢查並顯示設定或 vault 問題。

典型問題包括：

- 已啟用橋接模式但沒有公開的 memory 構件
- 無效或遺失的 vault 版面配置
- 當預期為 Obsidian 模式時，缺少外部 Obsidian CLI

### `wiki init`

建立 wiki vault 版面配置和起始頁面。

這會初始化根結構，包括頂層索引和快取目錄。

### `wiki ingest <path-or-url>`

將內容匯入 wiki 來源層。

注意事項：

- URL 擷取由 `ingest.allowUrlIngest` 控制
- 匯入的來源頁面會在 frontmatter 中保留來源資訊
- 啟用後，可以在擷取後自動執行編譯

### `wiki compile`

重建索引、相關區塊、儀表板和編譯摘要。

這會在以下位置寫入穩定的機器可讀構件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

如果啟用了 `render.createDashboards`，編譯也會重新整理報告頁面。

### `wiki lint`

對 vault 進行 Lint 並報告：

- 結構性問題
- 來源缺口
- 矛盾之處
- 未解決的問題
- 低置信度的頁面/聲明
- 過時的頁面/聲明

在進行有意義的 wiki 更新後執行此操作。

### `wiki search <query>`

搜尋 wiki 內容。

行為取決於配置：

- `search.backend`: `shared` 或 `local`
- `search.corpus`: `wiki`、`memory` 或 `all`

當您需要 wiki 特定的排名或來源細節時，請使用 `wiki search`。
若要進行一次廣泛的共享召回傳遞，當活動記憶體外掛程式公開共享搜尋時，建議優先使用 `openclaw memory search`。

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
- 撰寫結構化聲明

此指令的存在是為了讓 wiki 可以在不手動編輯受管理區塊的情況下安全演進。

### `wiki bridge import`

將公開的記憶體構件從活動記憶體外掛程式匯入到橋接支援的來源頁面中。

當您希望將最新匯出的記憶體構件提取到 wiki 儲存庫時，請在 `bridge` 模式下使用此功能。

### `wiki unsafe-local import`

在 `unsafe-local` 模式下，從明確配置的本機路徑匯入。

這是有意的實驗性功能，且僅限於同一台機器上使用。

### `wiki obsidian ...`

適用於以 Obsidian 友善模式執行之儲存庫的 Obsidian 輔助指令。

子指令：

- `status`
- `search`
- `open`
- `command`
- `daily`

當 `obsidian.useOfficialCli` 啟用時，這些需要在 `PATH` 上安裝官方的 `obsidian` CLI。

## 實務使用指南

- 當來源和頁面身分識別很重要時，請使用 `wiki search` + `wiki get`。
- 請使用 `wiki apply`，而不是手動編輯受管理的生成區段。
- 在信任矛盾或低置信度內容之前，請使用 `wiki lint`。
- 在批量匯入或來源變更後，如果您希望立即獲得新的儀表板和編譯摘要，請使用 `wiki compile`。
- 當橋接模式依賴新匯出的記憶體構件時，請使用 `wiki bridge import`。

## 配置關聯

`openclaw wiki` 的行為取決於：

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

請參閱 [Memory Wiki plugin](/zh-Hant/plugins/memory-wiki) 以了解完整的配置模型。
