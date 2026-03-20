---
summary: "`openclaw plugins` 的 CLI 參考（列表、安裝、市集、解除安裝、啟用/停用、診斷）"
read_when:
  - 您想要安裝或管理 Gateway 外掛程式或相容套件
  - 您想要除錯外掛程式載入失敗
title: "plugins"
---

# `openclaw plugins`

管理 Gateway 外掛程式/擴充功能及相容套件。

相關連結：

- 外掛程式系統：[外掛程式](/zh-Hant/tools/plugin)
- 套件相容性：[外掛程式套件](/zh-Hant/plugins/bundles)
- 外掛程式清單 + 結構描述：[外掛程式清單](/zh-Hant/plugins/manifest)
- 安全性強化：[安全性](/zh-Hant/gateway/security)

## 指令

```bash
openclaw plugins list
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
```

隨附的外掛程式會隨 OpenClaw 一起發布，但預設為停用狀態。請使用 `plugins enable`
啟用它們。

原生 OpenClaw 外掛必須隨附 `openclaw.plugin.json` 以及內嵌 JSON
Schema (`configSchema`，即使為空)。相容套件則使用其自身的套件
清單。

`plugins list` 會顯示 `Format: openclaw` 或 `Format: bundle`。詳細清單/資訊
輸出也會顯示套件子類型 (`codex`、`claude` 或 `cursor`) 以及偵測到的套件
功能。

### 安裝

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

安全提示：請將外掛安裝視為執行程式碼。優先使用鎖定的版本。

Npm 規格僅限於 **registry-only** (套件名稱 + 可選的 **確切版本** 或
**dist-tag**)。會拒絕 Git/URL/檔案規格與 semver 範圍。為確保安全，相依性安裝會使用 `--ignore-scripts` 執行。

裸規格與 `@latest` 會保持在穩定版本軌道上。如果 npm 將其中任何一個解析為發行前版本，OpenClaw 會停止並要求您使用發行前版本標籤（例如 `@beta`/`@rc`）或確切的發行前版本（例如 `@1.2.3-beta.4`）明確選擇加入。

如果裸安裝規格符合套件的外掛程式 ID（例如 `diffs`），OpenClaw 會直接安裝套件的外掛程式。若要安裝具有相同名稱的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

支援的封存檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支援從 Claude 市集安裝。

當市集名稱存在於 Claude 本機註冊表快取 `~/.claude/plugins/known_marketplaces.json` 中時，使用 `plugin@marketplace` 簡寫：

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
- GitHub 存儲庫簡寫，例如 `owner/repo`
- git URL

對於本機路徑和歸檔，OpenClaw 會自動偵測：

- 原生 OpenClaw 外掛程式 (`openclaw.plugin.json`)
- 相容 Codex 的套件組合 (`.codex-plugin/plugin.json`)
- 相容 Claude 的套件組合 (`.claude-plugin/plugin.json` 或預設的 Claude 元件佈局)
- 相容 Cursor 的套件組合 (`.cursor-plugin/plugin.json`)

相容的套件會安裝到一般的擴充功能根目錄，並參與相同的 list/info/enable/disable 流程。目前支援的套件技能包括：Claude command-skills、Claude `settings.json` 預設值、Cursor command-skills，以及相容的 Codex hook 目錄；偵測到的其他套件功能會顯示在 diagnostics/info 中，但尚未連線至執行階段執行。

使用 `--link` 以避免複製本機目錄（會新增至 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安裝時使用 `--pin`，將解析出的確切規格 (`name@version`) 儲存在 `plugins.installs` 中，同時保持預設行為未固定。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`、`plugins.installs`
外掛程式允許清單以及連結的 `plugins.load.paths` 項目中移除外掛程式記錄（如適用）。
對於作用中的記憶體外掛程式，記憶體插槽會重設為 `memory-core`。

根據預設，解除安裝也會移除作用中狀態目錄擴充功能根目錄 (`$OPENCLAW_STATE_DIR/extensions/<id>`) 下的外掛程式安裝目錄。請使用
`--keep-files` 來保留磁碟上的檔案。

`--keep-config` 支援作為 `--keep-files` 的已棄用別名。

### 更新

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新套用於 `plugins.installs` 中追蹤的安裝項目，目前包括 npm 和
marketplace 的安裝項目。

當儲存的完整性雜湊存在，且獲取的構件雜湊發生變化時，OpenClaw 會列印警告並在繼續之前要求確認。使用全域 `--yes` 在 CI/非互動式執行中繞過提示。

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

針對單一外掛的深度自省。顯示身分識別、載入狀態、來源、已註冊的能力、鉤子、工具、指令、服務、閘道方法、HTTP 路由、原則旗標、診斷以及安裝中繼資料。

每個外掛是根據其在執行階段實際註冊的內容進行分類：

- **plain-capability** — 一種能力類型（例如僅供應商外掛）
- **hybrid-capability** — 多種能力類型（例如文字 + 語音 + 影像）
- **hook-only** — 僅有鉤子，沒有能力或介面
- **non-capability** — 具有工具/指令/服務但沒有能力

參閱 [Plugins](/zh-Hant/tools/plugin#plugin-shapes) 以進一步了解能力模型。

`--json` 標誌會輸出適合腳本和稽核的機器可讀報告。

`info` 是 `inspect` 的別名。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
