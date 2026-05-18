---
summary: "列出、安裝、更新、檢查及解除安裝 OpenClaw 外掛程式的快速範例"
read_when:
  - You want quick plugin list, install, update, inspect, or uninstall examples
  - You want to choose a plugin install source
  - You want the right reference for publishing plugin packages
title: "管理外掛程式"
sidebarTitle: "管理外掛程式"
doc-schema-version: 1
---

使用此頁面執行常見的外掛程式管理指令。如需詳盡的指令約定、標誌、來源選擇規則與邊緣情況，請參閱[`openclaw plugins`](/zh-Hant/cli/plugins)。

大多數安裝工作流程如下：

1. 尋找套件
2. 從 ClawHub、npm、git 或本機路徑安裝
3. 讓受管理的 Gateway 自動重新啟動，若為未受管理則手動重新啟動
4. 驗證外掛程式的執行時期註冊

## 列出並搜尋外掛程式

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search "calendar"
```

針對指令稿使用 `--json`：

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` 是一項冷庫存檢查。它顯示 OpenClaw 可從組態、資訊清單與外掛程式註冊表中探索的內容；它無法證明執行中的 Gateway 已匯入該外掛程式執行時期。JSON 輸出包含註冊表診斷資訊，以及當外掛程式套件宣告 `dependencies` 或 `optionalDependencies` 時，每個外掛程式的靜態 `dependencyStatus`。

`plugins search` 會查詢 ClawHub 以取得可安裝的外掛程式套件，並印出安裝提示，例如 `openclaw plugins install clawhub:<package>`。

## 安裝外掛程式

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Install from ClawHub.
openclaw plugins install clawhub:<package>
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta

# Install from npm.
openclaw plugins install npm:<package>
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from a local npm pack artifact.
openclaw plugins install npm-pack:<path.tgz>

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

純套件規格會在啟動切換期間從 npm 安裝。當您需要確定性來源選擇時，請使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:`。如果純名稱符合官方外掛程式 ID，OpenClaw 可直接安裝目錄項目。

僅在您刻意想要覆寫現有安裝目標時，才使用 `--force`。針對已追蹤的 npm、ClawHub 或 hook-pack 安裝的常規升級，請使用 `openclaw plugins update`。

## 重新啟動與檢查

在安裝、更新或解除安裝外掛程式程式碼後，已啟用組態重新載入的執行中受管理 Gateway 會自動重新啟動。若 Gateway 未受管理或已停用重新載入，請在檢查即時執行時期介面前自行重新啟動：

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

當您需要外掛程式已註冊運行時介面（例如工具、鉤子、服務、Gateway 方法、HTTP 路由或外掛程式擁有的 CLI 指令）的證明時，請使用 `inspect --runtime`。單純的 `inspect` 和 `list` 是冷清單、組態和註冊表檢查。

## 更新外掛程式

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
openclaw plugins update <plugin-id> --dry-run
```

當您傳遞外掛程式 ID 時，OpenClaw 會重用追蹤的安裝規格。儲存的 dist-tags（例如 `@beta`）和精確的固定版本會在之後的 `update <plugin-id>` 執行中繼續使用。

對於 npm 安裝，您可以傳遞明確的套件規格來切換追蹤記錄：

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

第二個指令會在先前將外掛程式固定到特定版本或標籤時，將其移回註冊表的預設發布行。

當 `openclaw update` 在 Beta 頻道上執行時，外掛程式記錄可以優先匹配 `@beta` 發布版。如需確切的后備和固定規則，請參閱 [`openclaw plugins`](/zh-Hant/cli/plugins#update)。

## 解除安裝外掛程式

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
```

解除安裝會移除外掛程式的組態項目、持續性的外掛程式索引記錄、允許/拒絕清單項目，以及適用時的連結載入路徑。除非您傳遞 `--keep-files`，否則會移除受管理的安裝目錄。當解除安裝變更外掛程式來源時，執行中的受管理 Gateway 會自動重新啟動。

在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，外掛程式安裝、更新、解除安裝、啟用和停用指令會被停用。請改為在安裝的 Nix 來源中管理這些選項。

## 選擇來源

| 來源        | 使用時機                                                  | 範例                                                           |
| ----------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub     | 您想要 OpenClaw 原生的探索、掃描摘要、版本和提示          | `openclaw plugins install clawhub:<package>`                   |
| npmjs.com   | 您已經發布 JavaScript 套件或需要 npm dist-tags/私人註冊表 | `openclaw plugins install npm:@acme/openclaw-plugin`           |
| git         | 您想要儲存庫中的特定分支、標籤或提交                      | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| 本機路徑    | 您正在同一台機器上開發或測試外掛程式                      | `openclaw plugins install --link ./my-plugin`                  |
| npm pack    | 您正在透過 npm install 語意驗證本機套件構件               | `openclaw plugins install npm-pack:<path.tgz>`                 |
| marketplace | 您正在安裝相容 Claude 的 marketplace 外掛程式             | `openclaw plugins install <plugin> --marketplace <source>`     |

## 發佈外掛程式

ClawHub 是 OpenClaw 插件的主要公開探索介面。當您希望使用者在安裝前能找到插件元資料、版本歷史、registry 掃描結果和安裝提示時，請將其發佈到那裡。

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

原生 npm 插件在發佈前必須包含插件清單和套件元資料：

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
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

請使用這些頁面來查看完整的發佈合約，而非將此頁面作為發佈參考：

- [ClawHub publishing](/zh-Hant/clawhub/publishing) 解釋了擁有者、範圍、發佈、審查、套件驗證和套件傳輸。
- [Building plugins](/zh-Hant/plugins/building-plugins) 展示了插件套件結構和首次發佈工作流程。
- [Plugin manifest](/zh-Hant/plugins/manifest) 定義了原生插件清單欄位。

如果 ClawHub 和 npm 上都有相同的套件，當您需要強制使用其中一個來源時，請使用明確的 `clawhub:` 或 `npm:` 前綴。

## 相關

- [Plugins](/zh-Hant/tools/plugin) - 安裝、設定、重新啟動和疑難排解
- [`openclaw plugins`](/zh-Hant/cli/plugins) - 完整的 CLI 參考
- [Community plugins](/zh-Hant/plugins/community) - 公開探索和 ClawHub 發佈
- [ClawHub](/zh-Hant/clawhub/cli) - registry CLI 操作
- [Building plugins](/zh-Hant/plugins/building-plugins) - 建立插件套件
- [Plugin manifest](/zh-Hant/plugins/manifest) - 清單和套件元資料
