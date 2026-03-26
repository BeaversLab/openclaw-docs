---
summary: "OpenClaw 中適用於 Codex、Claude 和 Cursor 套件的統一套件格式指南"
read_when:
  - You want to install or debug a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are documenting bundle compatibility or current support limits
title: "外掛程式套件"
---

# 外掛程式套件

OpenClaw 支援一種共享的外部外掛程式套件類別：**套件
外掛程式**。

目前這意味著三個密切相關的生態系：

- Codex 套件
- Claude 套件
- Cursor 套件

OpenClaw 在 `openclaw plugins list` 中將它們全部顯示為 `Format: bundle`。
詳細輸出和 `openclaw plugins inspect <id>` 也會顯示子類型
(`codex`、`claude` 或 `cursor`)。

相關：

- 外掛系統概覽：[外掛程式](/zh-Hant/tools/plugin)
- CLI 安裝/列表流程：[plugins](/zh-Hant/cli/plugins)
- 原生 manifest 結構描述：[Plugin manifest](/zh-Hant/plugins/manifest)

## 什麼是套件

套件是一個**內容/元數據包**，而不是原生進程內 OpenClaw 外掛程式。

目前，OpenClaw **並不會**在進程內執行套件的執行時程式碼。相反地，它會偵測已知的套件檔案，讀取元數據，並將支援的套件內容對應到原生的 OpenClaw 介面，例如技能、hook 包、MCP 設定，以及嵌入式 Pi 設定。

這就是主要的信任邊界：

- 原生 OpenClaw 外掛程式：執行時模組在進程內執行
- 套件：元數據/內容包，具有選擇性的功能對應

## 共用的套件模型

Codex、Claude 和 Cursor 套件非常相似，因此 OpenClaw 將它們視為一個標準化的模型。

共用的概念：

- 一個小的 manifest 檔案，或一個預設的目錄結構
- 一個或多個內容根目錄，例如 `skills/` 或 `commands/`
- 選用性工具/執行時期中繼資料，例如 MCP、hooks、agents 或 LSP
- 安裝為目錄或壓縮檔，然後在一般外掛清單中啟用

常見的 OpenClaw 行為：

- 偵測套件子類型
- 將其正規化為一個內部套件紀錄
- 將支援的部分對應到原生的 OpenClaw 功能
- 將不支援的部分回報為已偵測但未接線的功能

實務上，大多數使用者不需要先考慮特定廠商的格式。
更有用的問題是：OpenClaw 目前對應哪些套件介面？

## 偵測順序

OpenClaw 在處理套件之前，會優先使用原生 OpenClaw 外掛/套件配置。

實際影響：

- `openclaw.plugin.json` 優先於套件偵測
- 具有有效 `package.json` + `openclaw.extensions` 的套件安裝會使用
  原生安裝路徑
- 如果目錄同時包含原生與套件中繼資料，OpenClaw 會優先將其視為原生

這樣可以避免將雙格式套件部分安裝為 bundle，然後再將其作為原生外掛程式載入。

## 目前支援的功能

OpenClaw 會將 bundle 元資料正規化為一個內部 bundle 記錄，然後將支援的介面對應到現有的原生行為。

### 目前已支援

#### 技能內容

- bundle 技能根目錄會像一般 OpenClaw 技能根目錄一樣載入
- Claude `commands` 根目錄會被視為額外的技能根目錄
- Cursor `.cursor/commands` 根目錄會被視為額外的技能根目錄

這意味著 Claude Markdown 指令檔案透過一般 OpenClaw 技能載入器運作。Cursor 指令 Markdown 也透過相同路徑運作。

#### Hook 套件

- bundle hook 根目錄**僅**在使用一般 OpenClaw hook-pack 版面配置時運作。目前這主要是 Codex 相容的情況：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### MCP for Pi

- 已啟用的套件可以提供 MCP 伺服器設定
- OpenClaw 會將套件 MCP 設定合併到有效的嵌入式 Pi 設定中，作為
  `mcpServers`
- OpenClaw 也會透過將支援的 stdio MCP 伺服器作為子程序啟動，在嵌入式 Pi 代理程序回合期間公開支援的套件 MCP 工具
- 專案本機 Pi 設定在套件預設之後仍然適用，因此工作區設定可以在需要時覆寫套件 MCP 項目

#### 嵌入式 Pi 設定

- 當套件啟用時，Claude `settings.json` 會作為預設嵌入式 Pi 設定匯入
- OpenClaw 在應用 shell 覆寫鍵之前會將其消毒

已消毒的鍵：

- `shellPath`
- `shellCommandPrefix`

### 已偵測但未執行

這些介面已被偵測、顯示在套件功能中，並可能出現在診斷/資訊輸出中，但 OpenClaw 尚未執行它們：

- Claude `agents`
- Claude `hooks.json` 自動化
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- 除了功能報告之外的 Codex 內聯/應用程式元數據

## 功能報告

`openclaw plugins inspect <id>` 顯示來自標準化 bundle 記錄的 bundle 功能。

支援的功能會靜默載入。不支援的功能會產生如下警告：

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

當前例外：

- Claude `commands` 被視為受支援，因為它對應至技能
- Claude `settings` 被視為受支援，因為它對應至內嵌 Pi 設定
- Cursor `commands` 被視為受支援，因為它對應至技能
- bundle MCP 被視為已支援，因為它映射到內嵌 Pi 設定並向內嵌 Pi 公開支援的 stdio 工具
- Codex `hooks` 僅針對 OpenClaw hook-pack 版面配置被視為已支援

## 格式差異

這些格式很接近，但並非逐位元組完全相同。以下是在 OpenClaw 中重要的實際差異。

### Codex

典型標記：

- `.codex-plugin/plugin.json`
- 選用 `skills/`
- 選用 `hooks/`
- 選用 `.mcp.json`
- 選用 `.app.json`

當 Codex 套件使用技能根目錄和 OpenClaw 風格的 hook-pack 目錄時，最適合 OpenClaw。

### Claude

OpenClaw 支援兩者：

- 基於清單的 Claude 套件： `.claude-plugin/plugin.json`
- 使用預設 Claude 版面配置的無清單 Claude 套件

OpenClaw 可識別的預設 Claude 版面配置標記：

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Claude 特定注意事項：

- `commands/` 被視為技能內容
- `settings.json` 會匯入至嵌入式 Pi 設定
- `.mcp.json` 和清單 `mcpServers` 可將受支援的 stdio 工具公開給
  嵌入式 Pi
- `hooks/hooks.json` 會被偵測到，但不會作為 Claude 自動化執行

### Cursor

典型標記：

- `.cursor-plugin/plugin.json`
- 選用 `skills/`
- 選用 `.cursor/commands/`
- 選用 `.cursor/agents/`
- 可選 `.cursor/rules/`
- 可選 `.cursor/hooks.json`
- 可選 `.mcp.json`

Cursor 特定注意事項：

- `.cursor/commands/` 被視為技能內容
- `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 目前
  僅供偵測

## Claude 自訂路徑

Claude 套件清單可以宣告自訂元件路徑。OpenClaw 將這些路徑視為
**附加**，而非取代預設值。

目前可識別的自訂路徑鍵：

- `skills`
- `commands`
- `agents`
- `hooks`
- `mcpServers`
- `lspServers`
- `outputStyles`

範例：

- 預設 `commands/` 加上清單 `commands: "extra-commands"` =>
  OpenClaw 會掃描這兩者
- 預設 `skills/` 加上清單 `skills: ["team-skills"]` =>
  OpenClaw 會掃描這兩者

## 安全模型

Bundle 支援的範圍刻意比原生外掛支援更狹窄。

目前行為：

- bundle 探索機制會在檢查邊界後，讀取外掛根目錄內的檔案
- skills 與 hook-pack 的路徑必須位於外掛根目錄內
- 讀取 bundle 設定檔時會套用相同的邊界檢查
- 受支援的 stdio bundle MCP 伺服器可能會作為子程序啟動，以用於
  嵌入式 Pi 工具呼叫
- OpenClaw 不會在程序內載入任意的 bundle 執行階段模組

這使得 bundle 支援預設上比原生外掛模組更安全，但您
仍應將第三方 bundle 視為其確實開放功能的信任內容。

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

如果目錄是原生的 OpenClaw 外掛程式/套件，原生安裝路徑仍然優先。

對於 Claude 市集名稱，OpenClaw 會讀取 `~/.claude/plugins/known_marketplaces.json` 的本機 Claude 已知市集登錄檔。市集項目可以解析為相容套件的目錄/封存檔或原生外掛程式來源；解析後，一般的安裝規則仍然適用。

## 疑難排解

### 偵測到套件但功能未執行

請檢查 `openclaw plugins inspect <id>`。

如果功能已列出，但 OpenClaw 表示尚未連線，這是真正的產品限制，並非安裝錯誤。

### Claude 指令檔未顯示

請確保已啟用套件，且 markdown 檔案位於偵測到的 `commands` 根目錄或 `skills` 根目錄內。

### Claude 設定未套用

目前的支援僅限於來自 `settings.json` 的內嵌 Pi 設定。
OpenClaw 不會將套件設定視為原始的 OpenClaw 設定檔補丁。

### Claude 掛鉤（hooks）未執行

目前僅偵測到 `hooks/hooks.json`。

如果您現在需要可執行的套件掛鉤，請透過支援的 Codex 掛鉤根目錄使用標準的 OpenClaw 掛鉤套件（hook-pack）佈局，或是提供原生的 OpenClaw 外掛程式。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
