---
summary: "`openclaw plugins` 的 CLI 參考資料 (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "外掛程式"
---

# `openclaw plugins`

管理 Gateway 外掛程式/擴充功能、Hook 套件及相容的套件組合。

相關：

- 外掛程式系統：[外掛程式](/en/tools/plugin)
- 套件組合相容性：[外掛程式套件組合](/en/plugins/bundles)
- 外掛程式清單 + 結構描述：[外掛程式清單](/en/plugins/manifest)
- 安全性強化：[安全性](/en/gateway/security)

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

隨附的外掛程式隨 OpenClaw 一起提供，但預設為停用狀態。請使用 `plugins enable` 來
啟用它們。

原生的 OpenClaw 外掛程式必須隨附內嵌 JSON 結構描述的 `openclaw.plugin.json`
(`configSchema`，即使是空的)。相容的套件組合則改用其自己的套件組合清單。

`plugins list` 會顯示 `Format: openclaw` 或 `Format: bundle`。詳細的清單/資訊
輸出也會顯示套件組合子類型 (`codex`、`claude` 或 `cursor`) 以及偵測到的套件組合
功能。

### 安裝

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
```

純套件名稱會先檢查 ClawHub，然後是 npm。安全性提示：
將外掛程式安裝視為執行程式碼。建議優先使用鎖定的版本。

`plugins install` 也是在 `package.json` 中公開
`openclaw.hooks` 的 Hook 套件安裝介面。請使用 `openclaw hooks` 進行過濾的 Hook
可見性及個別 Hook 啟用，而非套件安裝。

Npm 規格僅限 **registry-only** (套件名稱 + 可選的 **確切版本** 或
**dist-tag**)。會拒絕 Git/URL/檔案規格和 semver 範圍。為了安全起見，
相依性安裝會使用 `--ignore-scripts` 執行。

純規格和 `@latest` 會保持在穩定追蹤。如果 npm 將其中任一解析為搶鮮版，
OpenClaw 會停止並要求您明確選擇加入，方法是使用搶鮮版標籤 (例如 `@beta`/`@rc`) 或
確切的搶鮮版版本 (例如 `@1.2.3-beta.4`)。

如果簡單的安裝規範與捆綁插件 ID 匹配（例如 `diffs`），OpenClaw
會直接安裝該捆綁插件。若要安裝具有相同名稱的 npm 套件，
請使用明確的範圍規範（例如 `@scope/diffs`）。

支援的存檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支援從 Claude marketplace 安裝。

ClawHub 安裝使用明確的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 現在也偏好針對裸露 npm-safe 插件規範使用 ClawHub。只有在 ClawHub 沒有該套件或版本時才會回退到 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw 從 ClawHub 下載套件存檔，檢查廣告的
插件 API / 最低 gateway 相容性，然後透過正常
存檔路徑進行安裝。記錄的安裝會保留其 ClawHub 來源元數據以便稍後更新。

當 marketplace 名稱存在於 `~/.claude/plugins/known_marketplaces.json` 中 Claude 的
本機登錄快取時，使用 `plugin@marketplace` 簡寫：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

當您想要明確傳遞 marketplace 來源時，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Marketplace 來源可以是：

- 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名稱
- 本機 marketplace 根目錄或 `marketplace.json` 路徑
- GitHub 存儲庫簡寫，例如 `owner/repo`
- git URL

對於從 GitHub 或 git 載入的遠端 marketplace，插件條目必須保留
在複製的 marketplace 存儲庫內。OpenClaw 接受來自
該存儲庫的相對路徑來源，並拒絕來自遠端清單的外部 git、GitHub、URL/存檔和絕對路徑
插件來源。

對於本機路徑和存檔，OpenClaw 會自動偵測：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- Codex 相容套件（`.codex-plugin/plugin.json`）
- Claude 相容套件（`.claude-plugin/plugin.json` 或預設的 Claude
  組件佈局）
- Cursor 相容套件（`.cursor-plugin/plugin.json`）

相容的套件會安裝到一般的 extensions root，並參與相同的 list/info/enable/disable 流程。目前支援 bundle 技能、Claude command-skills、Claude `settings.json` defaults、Cursor command-skills 以及相容的 Codex hook 目錄；其他偵測到的 bundle 功能會顯示在 diagnostics/info 中，但尚未連結到執行時期執行。

使用 `--link` 以避免複製本機目錄（會新增到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安裝時使用 `--pin`，將解析的確切規格（`name@version`）儲存在 `plugins.installs` 中，同時保持預設行為未固定版本。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`、`plugins.installs`、外掛允許清單以及連結的 `plugins.load.paths` 項目（如適用）中移除外掛記錄。對於啟用的記憶體外掛，記憶體插槽會重設為 `memory-core`。

預設情況下，解除安裝也會移除活動狀態目錄 extensions root（`$OPENCLAW_STATE_DIR/extensions/<id>`）下的外掛安裝目錄。使用 `--keep-files` 以保留磁碟上的檔案。

`--keep-config` 支援作為 `--keep-files` 的已棄用別名。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

更新適用於 `plugins.installs` 中的追蹤安裝以及 `hooks.internal.installs` 中的追蹤 hook-pack 安裝。

當您傳遞外掛 id 時，OpenClaw 會重用該外掛記錄的安裝規格。這表示先前儲存的 dist-tags（例如 `@beta`）和確切的固定版本會在後續的 `update <id>` 執行中繼續使用。

對於 npm 安裝，您也可以傳遞帶有 dist-tag 或確切版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回追蹤的外掛記錄，更新該已安裝的外掛，並記錄新的 npm 規格以供未來基於 id 的更新使用。

當儲存的完整性雜湊存在且提取的構件雜湊變更時，OpenClaw 會列印警告並在繼續之前要求確認。在 CI/非互動式執行中，使用全域 `--yes` 以略過提示。

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

對單一外掛程式進行深度內省。顯示身分識別、載入狀態、來源、
註冊功能、鉤子、工具、命令、服務、閘道方法、
HTTP 路由、原則旗標、診斷和安裝中繼資料。

每個外掛程式會根據其在執行階段實際註冊的內容進行分類：

- **plain-capability** — 一種功能類型（例如僅提供者的外掛程式）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 影像）
- **hook-only** — 僅有鉤子，沒有功能或介面
- **non-capability** — 工具/命令/服務但沒有功能

請參閱[外掛程式形狀](/en/plugins/architecture#plugin-shapes)以進一步了解功能模型。

`--json` 旗標會輸出適合腳本撰寫和稽核的機器可讀報告。

`info` 是 `inspect` 的別名。
