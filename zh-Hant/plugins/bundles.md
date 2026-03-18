---
summary: "OpenClaw 中 Codex、Claude 和 Cursor 套件的統一套件格式指南"
read_when:
  - You want to install or debug a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are documenting bundle compatibility or current support limits
title: "外掛程式套件"
---

# 外掛程式套件

OpenClaw 支援一種共享類別的外掛程式套件：**套件外掛程式**。

目前這意味著三個密切相關的生態系：

- Codex 套件
- Claude 套件
- Cursor 套件

OpenClaw 在 `openclaw plugins list` 中將所有這些顯示為 `Format: bundle`。
詳細輸出和 `openclaw plugins info <id>` 也會顯示子類型
(`codex`、`claude` 或 `cursor`)。

相關連結：

- 外掛程式系統概覽：[外掛程式](/zh-Hant/tools/plugin)
- CLI 安裝/列表流程：[plugins](/zh-Hant/cli/plugins)
- 原生 Manifest 結構描述：[外掛程式 Manifest](/zh-Hant/plugins/manifest)

## 什麼是套件

套件是 **內容/元資料包**，而非原生進程內 OpenClaw
外掛程式。

目前，OpenClaw **不會**在進程內執行套件執行階段程式碼。相反地，
它會偵測已知的套件檔案，讀取元資料，並將支援的套件
內容對應到原生 OpenClaw 介面，例如技能、Hook 套件、MCP 設定
和內嵌 Pi 設定。

這就是主要的信任邊界：

- 原生 OpenClaw 外掛程式：執行階段模組在進程內執行
- 套件：元資料/內容包，具有選擇性的功能對應

## 共享套件模型

Codex、Claude 和 Cursor 套件足夠相似，OpenClaw 將它們
視為一個標準化模型。

共同理念：

- 一個小型 manifest 檔案，或預設目錄結構
- 一個或多個內容根目錄，例如 `skills/` 或 `commands/`
- 選用的工具/執行階段元資料，例如 MCP、hooks、agents 或 LSP
- 以目錄或封存形式安裝，然後在一般外掛程式列表中啟用

常見的 OpenClaw 行為：

- 偵測套件子類型
- 將其正規化為一個內部套件記錄
- 將支援的部分對應到原生 OpenClaw 功能
- 將不支援的部分回報為已偵測但未連線的功能

實際上，大多數使用者不需要先考慮廠商特定的格式。
更有用的問題是：OpenClaw 目前對應哪些套件介面？

## 偵測順序

OpenClaw 在處理套件之前，會優先考慮原生 OpenClaw 外掛/套件佈局。

實際效果：

- `openclaw.plugin.json` 優先於套件偵測
- 具備有效 `package.json` + `openclaw.extensions` 的套件安裝會使用
  原生安裝路徑
- 如果目錄同時包含原生和套件元數據，OpenClaw 會將其
  視為原生優先

這可以避免將雙格式套件部分安裝為套件，然後再以原生外掛
方式載入。

## 目前支援的功能

OpenClaw 會將套件元數據標準化為單一內部套件記錄，然後將
支援的介面映射至現有的原生行為。

### 目前支援

#### 技能內容

- 套件技能根目錄會作為一般的 OpenClaw 技能根目錄載入
- Claude `commands` 根目錄被視為額外的技能根目錄
- Cursor `.cursor/commands` 根目錄被視為額外的技能根目錄

這意味著 Claude markdown 指令檔案透過一般的 OpenClaw 技能
載入器運作。Cursor 指令 markdown 則透過相同路徑運作。

#### Hook 套件

- 套件 hook 根目錄**僅**在採用一般 OpenClaw hook-pack
  佈局時運作。目前這主要是指相容 Codex 的情況：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### CLI 後端的 MCP

- 已啟用的套件可以提供 MCP 伺服器設定
- 目前的運行時連線由 `claude-cli` 後端使用
- OpenClaw 會將套件 MCP 設定合併到後端 `--mcp-config` 檔案中

#### 嵌入式 Pi 設定

- 當套件啟用時，Claude `settings.json` 會匯入為預設的嵌入式 Pi 設定
- OpenClaw 會在套用 Shell 覆寫鍵前進行清理

已清理的鍵：

- `shellPath`
- `shellCommandPrefix`

### 已偵測但未執行

這些介面會被偵測到、顯示在套件功能中，並可能出現在
診斷/資訊輸出中，但 OpenClaw 目前尚未執行它們：

- Claude `agents`
- Claude `hooks.json` 自動化
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- Cursor `mcpServers` 位於當前映射的運行時路徑之外
- 超出功能報告的 Codex 內聯/應用程式元數據

## 功能報告

`openclaw plugins info <id>` 顯示來自標準化 bundle 記錄的 bundle 功能。

支援的功能會被靜默載入。不支援的功能會產生如下警告：

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

目前的例外情況：

- Claude `commands` 被視為支援，因其映射到技能
- Claude `settings` 被視為支援，因其映射到嵌入式 Pi 設定
- Cursor `commands` 被視為支援，因其映射到技能
- bundle MCP 在 OpenClaw 實際匯入它的地方被視為支援
- Codex `hooks` 僅針對 OpenClaw hook-pack 版面配置被視為支援

## 格式差異

這些格式很接近，但並非位元組完全一致。以下是 OpenClaw 中重要的實際差異。

### Codex

典型標記：

- `.codex-plugin/plugin.json`
- 選用 `skills/`
- 選用 `hooks/`
- 選用 `.mcp.json`
- 選用 `.app.json`

當 Codex bundles 使用技能根目錄和 OpenClaw 風格的 hook-pack 目錄時，最適合 OpenClaw。

### Claude

OpenClaw 支援兩者：

- 基於清單 的 Claude bundles：`.claude-plugin/plugin.json`
- 使用預設 Claude 版面配置的無清單 Claude bundles

OpenClaw 辦識的預設 Claude 版面配置標記：

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Claude 特有注意事項：

- `commands/` 被視為技能內容
- `settings.json` 被匯入到嵌入式 Pi 設定中
- `hooks/hooks.json` 被偵測到，但不作為 Claude 自動化執行

### Cursor

典型標記：

- `.cursor-plugin/plugin.json`
- 選用 `skills/`
- 選用 `.cursor/commands/`
- 選用 `.cursor/agents/`
- 選用性 `.cursor/rules/`
- 選用性 `.cursor/hooks.json`
- 選用性 `.mcp.json`

Cursor 特定注意事項：

- `.cursor/commands/` 被視為技能內容
- `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 目前僅供偵測

## Claude 自訂路徑

Claude 套件清單 可以宣告自訂元件路徑。OpenClaw 將這些路徑視為**附加**，而不會取代預設值。

目前可識別的自訂路徑鍵：

- `skills`
- `commands`
- `agents`
- `hooks`
- `mcpServers`
- `lspServers`
- `outputStyles`

範例：

- 預設 `commands/` 加上清單 `commands: "extra-commands"` => OpenClaw 掃描兩者
- 預設 `skills/` 加上清單 `skills: ["team-skills"]` => OpenClaw 掃描兩者

## 安全性模型

套件支援的範圍刻意比原生外掛程式支援更狹窄。

目前行為：

- 套件探索會透過邊界檢查，讀取外掛程式根目錄內的檔案
- 技能和 hook-pack 路徑必須停留在外掛程式根目錄內
- 套件設定檔會透過相同的邊界檢查讀取
- OpenClaw 不會在處理程序中執行任意的套件執行階段程式碼

這使得套件支援預設上比原生外掛程式模組更安全，但您仍應將第三方套件視為其所公開功能的受信任內容。

## 安裝範例

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
openclaw plugins info my-bundle
```

如果該目錄是原生 OpenClaw 外掛程式/套件，則原生安裝路徑仍然優先。

對於 Claude 市集名稱，OpenClaw 會讀取位於 `~/.claude/plugins/known_marketplaces.json` 的本機 Claude 已知市集登錄檔。市集項目可以解析為相容套件的目錄/壓縮檔或原生外掛程式來源；解析後，一般的安裝規則仍然適用。

## 疑難排解

### 偵測到套件但功能未執行

請檢查 `openclaw plugins info <id>`。

如果該功能已列出，但 OpenClaw 表示尚未接線，則這是實際的產品限制，而非安裝失敗。

### Claude 指令檔未出現

請確保已啟用該套件組合，並且 markdown 檔案位於已偵測到的
`commands` 根目錄或 `skills` 根目錄內。

### Claude 設定未套用

目前的支援僅限於來自 `settings.json` 的內嵌 Pi 設定。
OpenClaw 不會將套件組合設定視為原始 OpenClaw 設定檔補丁。

### Claude 掛鉤 (hooks) 未執行

目前僅偵測 `hooks/hooks.json`。

如果您今天需要可執行的套件組合掛鉤，請透過支援的 Codex 掛鉤根目錄使用標準的 OpenClaw hook-pack 版面配置，或是發布原生的 OpenClaw 外掛。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
