---
summary: "安裝、列出、解除安裝、更新和發佈 OpenClaw 外掛程式的快速範例"
read_when:
  - You want quick plugin install, list, update, or uninstall examples
  - You want to choose between ClawHub and npm plugin distribution
  - You are publishing a plugin package
title: "管理外掛程式"
sidebarTitle: "管理外掛程式"
---

大多數外掛程式工作流程只有幾個指令：搜尋、安裝、重新啟動 Gateway、驗證，以及當您不再需要該外掛程式時將其解除安裝。

## 列出外掛程式

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

請針對腳本使用 `--json`。它包含註冊表診斷資訊，以及當外掛程式套件宣告 `dependencies` 或 `optionalDependencies` 時，每個外掛程式的靜態 `dependencyStatus`。

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` 是一種冷清單檢查。它會顯示 OpenClaw 可以從組態、清單和外掛程式註冊表中發現的內容；它並不證明正在執行的 Gateway 程序已匯入外掛程式執行時期。

## 安裝外掛程式

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Bare package specs try ClawHub first, then npm fallback.
openclaw plugins install <package>

# Force one source.
openclaw plugins install clawhub:<package>
openclaw plugins install npm:<package>

# Install a specific version or dist-tag.
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

安裝外掛程式碼後，請重新啟動提供服務給您頻道的 Gateway：

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

當您需要證明外掛程式已註冊執行時期介面（例如工具、鉤子、服務、Gateway 方法或外掛程式擁有的 CLI 指令）時，請使用 `inspect --runtime`。

## 更新外掛程式

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
```

如果外掛程式是從 npm dist-tag (例如 `@beta`) 安裝的，後續的 `update <plugin-id>` 呼叫會重用該記錄的標籤。傳遞明確的 npm 規格會將追蹤的安裝切換為該規格，以供未來更新使用。

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

當外掛程式先前被釘選到特定版本或標籤時，第二個指令會將其移回註冊表的預設發佈線。

當 `openclaw update` 在 Beta 頻道上執行時，預設線的 npm 和 ClawHub 外掛程式記錄會先嘗試相符的外掛程式 `@beta` 發佈版本。如果該 Beta 發佈版本不存在，OpenClaw 會退回到記錄的預設/最新規格。對於 npm 外掛程式，如果 Beta 套件存在但安裝驗證失敗，OpenClaw 也會退回。確切版本和明確標籤 (例如 `@rc` 或 `@beta`) 會被保留。

## 解除安裝外掛程式

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
openclaw gateway restart
```

解除安裝會移除外掛程式的設定項目、外掛程式索引記錄、允許/拒絕清單項目，以及連結的載入路徑（如適用）。除非您傳遞 `--keep-files`，否則會移除受管理的安裝目錄。

在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，外掛程式的安裝、更新、解除安裝、啟用和停用命令會停用。請改在用於安裝的 Nix 來源中管理這些選項；若為 nix-openclaw，請使用代理優先的 [快速入門](https://github.com/openclaw/nix-openclaw#quick-start)。

## 發佈外掛程式

您可以將外部外掛程式發佈至 [ClawHub](https://clawhub.ai)、npmjs.com，或兩者皆有。

### 發佈至 ClawHub

ClawHub 是 OpenClaw 外掛程式的主要公開探索介面。它為使用者提供可搜尋的中繼資料、版本歷史記錄，以及安裝前的登錄檔掃描結果。

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

使用者透過以下方式從 ClawHub 安裝：

```bash
openclaw plugins install clawhub:<package>
openclaw plugins install <package>
```

簡易形式仍會先檢查 ClawHub。

### 發佈至 npmjs.com

原生 npm 外掛程式必須包含外掛程式資訊清單和 `package.json` OpenClaw 進入點中繼資料。

```json package.json
{
  "name": "@acme/openclaw-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

```bash
npm publish --access public
```

使用者僅透過 npm 安裝的方式：

```bash
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

如果相同的套件也可在 ClawHub 上取得，`npm:` 會略過 ClawHub 查詢並強制使用 npm 解析。

## 來源選擇

- **ClawHub**：當您想要 OpenClaw 原生探索、掃描摘要、版本和安裝提示時使用。
- **npmjs.com**：當您已經發佈 JavaScript 套件或需要 npm dist-tags/私有登錄檔工作流程時使用。
- **Git**：當您想要直接從分支、標籤或提交安裝時使用。
- **本機路徑**：當您在同一台機器上開發或測試外掛程式時使用。

## 相關

- [外掛程式](/zh-Hant/tools/plugin) - 概觀與疑難排解
- [`openclaw plugins`](/zh-Hant/cli/plugins) - 完整 CLI 參考資料
- [ClawHub](/zh-Hant/clawhub/cli) - 發佈與登錄檔操作
- [建置外掛程式](/zh-Hant/plugins/building-plugins) - 建立外掛程式套件
- [外掛程式資訊清單](/zh-Hant/plugins/manifest) - 資訊清單與套件中繼資料
