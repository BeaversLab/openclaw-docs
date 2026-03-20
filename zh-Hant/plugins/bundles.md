---
summary: "OpenClaw 中 Codex、Claude 和 Cursor 套件的統一套件格式指南"
read_when:
  - 您想要安裝或除錯相容於 Codex、Claude 或 Cursor 的套件
  - 您需要了解 OpenClaw 如何將套件內容對應到原生功能
  - 您正在記錄套件相容性或目前的支援限制
title: "Plugin Bundles"
---

# Plugin bundles

OpenClaw 支援一類共享的外部插件套件：**套件
插件**。

這意味著目前支援三個密切相關的生態系統：

- Codex bundles
- Claude bundles
- Cursor bundles

OpenClaw 會在 `openclaw plugins list` 中將所有這些顯示為 `Format: bundle`。
詳細輸出和 `openclaw plugins inspect <id>` 也會顯示子類型
(`codex`、`claude` 或 `cursor`)。

相關：

- Plugin system overview: [Plugins](/zh-Hant/tools/plugin)
- CLI install/list flows: [plugins](/zh-Hant/cli/plugins)
- Native manifest schema: [Plugin manifest](/zh-Hant/plugins/manifest)

## What a bundle is

套件是**內容/元資料包**，而非原生 OpenClaw
進程內插件。

目前，OpenClaw **不**會在進程內執行套件執行時程式碼。相反，
它會偵測已知的套件檔案，讀取元資料，並將支援的套件
內容對應到原生 OpenClaw 介面，例如技能、Hook 包、MCP 設定
和內嵌 Pi 設定。

這是主要的信任邊界：

- native OpenClaw plugin: 執行時模組在進程內執行
- bundle: 元資料/內容包，具有選擇性的功能對應

## Shared bundle model

Codex、Claude 和 Cursor 套件足夠相似，OpenClaw 將其
視為一個正規化模型。

共用的概念：

- 一個小型清單檔案，或預設目錄佈局
- 一或多個內容根目錄，例如 `skills/` 或 `commands/`
- 選用的工具/執行時元資料，例如 MCP、hooks、agents 或 LSP
- 以目錄或歸檔形式安裝，然後在一般插件清單中啟用

OpenClaw 的常見行為：

- 偵測套件子類型
- 將其正規化為一個內部套件記錄
- 將支援的部分對應到原生 OpenClaw 功能
- 將不支援的部分回報為已偵測但未連線的能力

實務上，大多數使用者不需要先考慮特定供應商的格式。
更有用的問題是：OpenClaw 目前支援哪些 bundle 介面？

## 偵測順序

OpenClaw 在處理 bundle 之前，會優先採用原生的 OpenClaw 外掛程式/套件佈局。

實際效果：

- `openclaw.plugin.json` 優先於 bundle 偵測
- 具有有效 `package.json` + `openclaw.extensions` 的套件安裝會使用
  原生安裝路徑
- 如果目錄同時包含原生和 bundle 元資料，OpenClaw 會優先將其
  視為原生

這可以避免將雙格式套件部分安裝為 bundle，然後稍後再作為原生外掛程式載入。

## 目前可用的功能

OpenClaw 會將 bundle 元資料正規化為一個內部 bundle 記錄，然後將支援的介面對應到現有的原生行為。

### 目前支援

#### 技能內容

- bundle 技能根目錄會作為一般的 OpenClaw 技能根目錄載入
- Claude `commands` 根目錄會被視為額外的技能根目錄
- Cursor `.cursor/commands` 根目錄會被視為額外的技能根目錄

這意味著 Claude markdown 指令檔案可以透過一般的 OpenClaw 技能載入器運作。Cursor 指令 markdown 也透過相同的路徑運作。

#### Hook 套件

- bundle hook 根目錄**僅**在它們使用一般 OpenClaw hook-pack
  佈局時才會運作。目前這主要是 Codex 相容的情況：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### Pi 的 MCP

- 已啟用的 bundle 可以提供 MCP 伺服器設定
- OpenClaw 會將 bundle MCP 設定合併到有效的內嵌 Pi 設定中，作為
  `mcpServers`
- OpenClaw 也會透過將支援的 stdio MCP 伺服器作為子程序啟動，在內嵌 Pi 代理程式回合期間公開支援的 bundle MCP 工具
- 專案本地的 Pi 設定仍會在 bundle 預設值之後套用，因此在需要時，工作區設定可以覆寫 bundle MCP 項目

#### 內嵌 Pi 設定

- 當 bundle 啟用時，Claude `settings.json` 會匯入為預設的內嵌 Pi 設定
- OpenClaw 會在套用 shell 覆寫金鑰之前將其清理

已清理的金鑰：

- `shellPath`
- `shellCommandPrefix`

### 已偵測但未執行

這些介面會被偵測到，顯示在套件功能中，並可能出現在診斷/資訊輸出中，但 OpenClaw 尚未執行它們：

- Claude `agents`
- Claude `hooks.json` 自動化
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- Codex 內聯/應用程式中繼資料（除功能報告外）

## 功能報告

`openclaw plugins inspect <id>` 顯示來自標準化套件記錄的套件功能。

支援的功能會在背景靜默載入。不支援的功能會產生如下警告：

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

目前的例外情況：

- Claude `commands` 被視為支援，因為它對應至技能
- Claude `settings` 被視為支援，因為它對應至嵌入式 Pi 設定
- Cursor `commands` 被視為支援，因為它對應至技能
- 套件 MCP 被視為支援，因為它對應至嵌入式 Pi 設定
  並向嵌入式 Pi 公開支援的 stdio 工具
- Codex `hooks` 僅針對 OpenClaw hook-pack 版面配置被視為支援

## 格式差異

這些格式很接近，但並非逐位元組完全相同。以下是 OpenClaw 中重要的實際差異。

### Codex

典型標記：

- `.codex-plugin/plugin.json`
- 選用 `skills/`
- 選用 `hooks/`
- 選用 `.mcp.json`
- 選用 `.app.json`

當 Codex 套件使用技能根目錄和 OpenClaw 風格的 hook-pack 目錄時，最適合 OpenClaw。

### Claude

OpenClaw 支援這兩者：

- 基於清單 的 Claude 套件：`.claude-plugin/plugin.json`
- 使用預設 Claude 版面配置的無清單 Claude 套件

OpenClaw 可識別的預設 Claude 版面配置標記：

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Claude 專屬說明：

- `commands/` 被視為技能內容
- `settings.json` 被匯入至內嵌 Pi 設定
- `.mcp.json` 和 manifest `mcpServers` 可將受支援的 stdio 工具公開給
  內嵌 Pi
- `hooks/hooks.json` 會被偵測到，但不會作為 Claude 自動化執行

### Cursor

典型標記：

- `.cursor-plugin/plugin.json`
- 選用 `skills/`
- 選用 `.cursor/commands/`
- 選用 `.cursor/agents/`
- 選用 `.cursor/rules/`
- 選用 `.cursor/hooks.json`
- 選用 `.mcp.json`

Cursor 特定說明：

- `.cursor/commands/` 被視為技能內容
- `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 目前
  僅供偵測

## Claude 自訂路徑

Claude bundle manifest 可宣告自訂元件路徑。OpenClaw 將
這些路徑視為**附加**，而非取代預設值。

目前可識別的自訂路徑鍵：

- `skills`
- `commands`
- `agents`
- `hooks`
- `mcpServers`
- `lspServers`
- `outputStyles`

範例：

- 預設 `commands/` 加上 manifest `commands: "extra-commands"` =>
  OpenClaw 掃描兩者
- 預設 `skills/` 加上 manifest `skills: ["team-skills"]` =>
  OpenClaw 掃描兩者

## 安全性模型

Bundle 支援的範圍刻意比原生外掛支援更狹窄。

目前行為：

- bundle 探索機制會透過邊界檢查讀取外掛根目錄內的檔案
- 技能和 hook-pack 路徑必須維持在外掛根目錄內
- bundle 設定檔的讀取亦經過相同的邊界檢查
- 受支援的 stdio bundle MCP 伺服器可能會作為子程序啟動，以供
  內嵌 Pi 工具呼叫
- OpenClaw 不會在程序內載入任意的 bundle 執行時間模組

這使得 bundle 支援預設上比原生外掛模組更安全，但您
仍應將第三方 bundle 視為其所公開功能的受信任內容。

## 安裝範例

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
openclaw plugins inspect my-bundle
```

如果目錄是原生的 OpenClaw 插件/套件，原生安裝路徑優先。

對於 Claude marketplace 名稱，OpenClaw 會讀取位於 `~/.claude/plugins/known_marketplaces.json` 的本機 Claude known-marketplace 註冊表。Marketplace 項目可以解析為相容的套件目錄/壓縮檔或原生插件來源；解析後，正常的安裝規則仍然適用。

## 疑難排解

### 偵測到套件但功能未執行

請檢查 `openclaw plugins inspect <id>`。

如果列出該功能，但 OpenClaw 表示尚未連接，這是真正的產品限制，而不是安裝失敗。

### Claude 指令檔未顯示

請確保套件已啟用，且 markdown 檔案位於偵測到的 `commands` 根目錄或 `skills` 根目錄內。

### Claude 設定未套用

目前的支援僅限來自 `settings.json` 的嵌入式 Pi 設定。OpenClaw 不會將套件設定視為原始的 OpenClaw 設定檔補丁。

### Claude hooks 未執行

目前僅偵測 `hooks/hooks.json`。

如果您現在需要可執行的套件 hooks，請透過支援的 Codex hook 根目錄使用正常的 OpenClaw hook-pack 配置，或是發送原生的 OpenClaw 插件。

import en from "/components/footer/en.mdx";

<en />
