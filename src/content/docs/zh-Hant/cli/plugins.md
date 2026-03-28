---
summary: "`openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor) 的 CLI 參考手冊"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "外掛程式"
---

# `openclaw plugins`

管理 Gateway 外掛程式/擴充功能及相容套件組合。

相關主題：

- 外掛程式系統：[外掛程式](/zh-Hant/tools/plugin)
- 套件組合相容性：[外掛程式套件組合](/zh-Hant/plugins/bundles)
- 外掛程式資訊清單 + 結構描述：[外掛程式資訊清單](/zh-Hant/plugins/manifest)
- 安全性強化：[安全性](/zh-Hant/gateway/security)

## 指令

```exec
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

隨附的外掛程式隨 OpenClaw 一起發行，但預設為停用狀態。請使用 `plugins enable` 來啟用它們。

原生 OpenClaw 外掛程式必須隨附 `openclaw.plugin.json`，其中包含內聯 JSON Schema（`configSchema`，即使為空）。相容的套件則改用其自己的套件清單。

`plugins list` 顯示 `Format: openclaw` 或 `Format: bundle`。詳細的清單/資訊輸出也會顯示套件子類型（`codex`、`claude` 或 `cursor`）以及偵測到的套件功能。

### 安裝

```exec
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

安全性提示：請將安裝外掛程式視為執行程式碼。建議優先使用鎖定的版本。

Npm 規格僅限於 **registry-only**（套件名稱 + 可選的 **確切版本** 或 **dist-tag**）。Git/URL/檔案規格和 semver 範圍會被拒絕。為了安全起見，相依性安裝會以 `--ignore-scripts` 執行。

簡易規格和 `@latest` 會保持在穩定追蹤。如果 npm 將其中任何一個解析為預發布版本，OpenClaw 會停止並要求您明確選擇加入預發布標籤（例如 `@beta`/`@rc`）或特定的預發布版本（例如 `@1.2.3-beta.4`）。

如果簡易安裝規格符合內建外掛 ID（例如 `diffs`），OpenClaw 會直接安裝內建外掛。若要安裝同名的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

支援的壓縮檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支援從 Claude 市集安裝。

當市集名稱存在於 Claude 的本地註冊表快取 `~/.claude/plugins/known_marketplaces.json` 中時，使用 `plugin@marketplace` 簡寫：

```exec
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

當您想要明確傳遞市集來源時，使用 `--marketplace`：

```exec
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市集來源可以是：

- 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市集名稱
- 本地市集根目錄或 `marketplace.json` 路徑
- GitHub 儲存庫簡寫，例如 `owner/repo`
- git URL

對於本地路徑和封存檔，OpenClaw 會自動偵測：

- 原生 OpenClaw 外掛程式 (`openclaw.plugin.json`)
- 相容 Codex 的套件 (`.codex-plugin/plugin.json`)
- 相容 Claude 的套件 (`.claude-plugin/plugin.json` 或預設的 Claude
  組件佈局)
- 相容 Cursor 的套件 (`.cursor-plugin/plugin.json`)

相容的套件會安裝到正常的擴充功能根目錄，並參與相同的 list/info/enable/disable 流程。目前支援 bundle 技能、Claude 指令技能、Claude `settings.json` 預設值、Cursor 指令技能，以及相容的 Codex hook 目錄；其他偵測到的套件功能會顯示在 diagnostics/info 中，但尚未連結到執行時期執行。

使用 `--link` 以避免複製本機目錄（會新增至 `plugins.load.paths`）：

```exec
openclaw plugins install -l ./my-plugin
```

在 npm 安裝時使用 `--pin`，以便將解析出的確切規格（`name@version`）儲存在
`plugins.installs` 中，同時保持預設行為未固定版本。

### 解除安裝

```exec
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`、`plugins.installs`、
外掛程式允許清單中移除外掛程式記錄，並在適用時移除連結的 `plugins.load.paths` 項目。
對於作用中的記憶體外掛程式，記憶體插槽會重設為 `memory-core`。

依預設，解除安裝也會移除作用中狀態目錄 extensions 根目錄 (`$OPENCLAW_STATE_DIR/extensions/<id>`) 下的
外掛程式安裝目錄。請使用
`--keep-files` 來保留磁碟上的檔案。

`--keep-config` 受支援為 `--keep-files` 的已棄用別名。

### 更新

```exec
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

更新套用於 `plugins.installs` 中追蹤的安裝項目，目前為 npm 和
marketplace 安裝項目。

當您傳遞外掛程式 ID 時，OpenClaw 會重用該外掛程式記錄的安裝規格。這表示先前儲存的 dist-tags（如 `@beta`）和精確鎖定的版本會在之後的 `update <id>` 執行中繼續使用。

對於 npm 安裝，您也可以傳遞帶有 dist-tag 或精確版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回追蹤的外掛程式記錄，更新已安裝的外掛程式，並記錄新的 npm 規格以供未來基於 ID 的更新使用。

當存在儲存的完整性雜湊且擷取的構件雜湊發生變更時，OpenClaw 會列印警告並在繼續之前要求確認。請使用全域 `--yes` 在 CI/非互動式執行中略過提示。

### 檢查

```exec
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

深入檢視單一外掛程式。顯示身分識別、載入狀態、來源、
已註冊的功能、掛鉤、工具、命令、服務、閘道方法、
HTTP 路由、原則旗標、診斷及安裝中繼資料。

每個外掛程式會根據其在執行階段實際註冊的內容進行分類：

- **plain-capability** — 單一功能類型（例如僅提供者的外掛程式）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 影像）
- **hook-only** — 僅有掛鉤，沒有功能或介面
- **non-capability** — 有工具/命令/服務但沒有功能

請參閱 [Plugin shapes](/zh-Hant/plugins/architecture#plugin-shapes) 以進一步瞭解功能模型。

`--json` 旗標會輸出適用於腳本與稽核的機器可讀報告。

`info` 是 `inspect` 的別名。
