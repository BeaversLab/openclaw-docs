---
summary: "CLI 參考資料：`openclaw plugins`（list、install、marketplace、uninstall、enable/disable、doctor）"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway 外掛程式/擴充功能以及相容的套件組合。

相關：

- 外掛系統：[外掛程式](/zh-Hant/tools/plugin)
- 套件組合相容性：[外掛套件組合](/zh-Hant/plugins/bundles)
- 外掛清單 + 結構描述：[外掛程式清單](/zh-Hant/plugins/manifest)
- 安全性強化：[安全性](/zh-Hant/gateway/security)

## 指令

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
```

隨附的外掛程式會隨 OpenClaw 一起發布，但預設為停用狀態。請使用 `plugins enable` 來
啟用它們。

原生 OpenClaw 外掛程式必須隨附 `openclaw.plugin.json`，並包含內嵌 JSON
結構描述（`configSchema`，即使為空）。相容的套件組合則使用其自己的套件組合
清單。

`plugins list` 會顯示 `Format: openclaw` 或 `Format: bundle`。詳細清單/資訊
輸出也會顯示套件組合子類型（`codex`、`claude` 或 `cursor`）以及偵測到的套件組合
功能。

### 安裝

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

安全性提示：請將外掛程式安裝視為執行程式碼。建議優先使用鎖定的版本。

Npm 規格僅支援 **registry-only**（套件名稱 + 選用的 **確切版本** 或
**dist-tag**）。會拒絕 Git/URL/file 規格與 semver 範圍。為了安全起見，相依性
安裝會使用 `--ignore-scripts` 執行。

純規格和 `@latest` 會保持在穩定版本軌道上。如果 npm 將其中任一者解析為發行前版本，OpenClaw 會停止並要求您使用
發行前版本標籤（例如 `@beta`/`@rc`）或確切的發行前版本（例如
`@1.2.3-beta.4`）明確選擇加入。

如果純安裝規格符合隨附的外掛程式 ID（例如 `diffs`），OpenClaw
會直接安裝隨附的外掛程式。若要安裝具有相同名稱的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

支援的壓縮檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支援從 Claude 市集安裝。

當市集名稱存在於 Claude 的本機註冊表快取 `~/.claude/plugins/known_marketplaces.json` 時，使用 `plugin@marketplace` 簡寫：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

當您想要明確傳遞市集來源時，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市集來源可以是：

- 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市集名稱
- 本機市集根目錄或 `marketplace.json` 路徑
- GitHub repo 簡寫，例如 `owner/repo`
- git URL

對於本機路徑和壓縮檔，OpenClaw 會自動偵測：

- 原生 OpenClaw 外掛 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設的 Claude
  元件佈局)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

相容套件會安裝到一般的延伸模組根目錄，並參與相同的列表/資訊/啟用/停用流程。目前，支援套件技能、Claude
指令技能、Claude `settings.json` 預設值、Cursor 指令技能，以及相容的 Codex hook
目錄；其他偵測到的套件功能會顯示在診斷/資訊中，但尚未連結至執行階段執行。

使用 `--link` 以避免複製本機目錄 (新增至 `plugins.load.paths`)：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安裝時使用 `--pin`，以便將解析後的確切規格 (`name@version`) 儲存在
`plugins.installs` 中，同時保持預設行為未固定版本。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`、`plugins.installs`、
外掛允許清單，以及連結的 `plugins.load.paths` 項目中移除外掛記錄 (如適用)。
對於使用中的記憶體外掛，記憶體插槽會重設為 `memory-core`。

預設情況下，解除安裝也會移除作用中狀態目錄擴充功能根目錄（`$OPENCLAW_STATE_DIR/extensions/<id>`）下的外掛程式安裝目錄。請使用
`--keep-files` 以保留磁碟上的檔案。

`--keep-config` 被支援為 `--keep-files` 的已棄用別名。

### 更新

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新適用於 `plugins.installs` 中的已追蹤安裝項，目前為 npm
和 marketplace 安裝項。

當存在儲存的完整性雜湊，且擷取的製件雜湊發生變更時，
OpenClaw 會列印警告並在繼續之前要求確認。請使用
全域 `--yes` 以在 CI/非互動式執行中略過提示。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
