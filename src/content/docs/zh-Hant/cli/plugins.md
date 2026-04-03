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

- 外掛系統：[外掛](/en/tools/plugin)
- 套件相容性：[外掛套件](/en/plugins/bundles)
- 外掛清單與架構：[外掛清單](/en/plugins/manifest)
- 安全強化：[安全性](/en/gateway/security)

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
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
```

純套件名稱會先檢查 ClawHub，然後是 npm。安全性提示：
將外掛程式安裝視為執行程式碼。建議優先使用鎖定的版本。

`--dangerously-force-unsafe-install` 是內建危險程式碼掃描器誤報的緊急應變選項。即使內建掃描器回報 `critical` 發現，它仍允許安裝繼續，但並不會繞過外掛 `before_install` hook 原則封鎖，也不會繞過掃描失敗。

此 CLI 標誌適用於 `openclaw plugins install`。Gateway 支援的技能相依性安裝使用對應的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則維持為個別的 ClawHub 技能下載/安裝流程。

`plugins install` 也是用於安裝在 `package.json` 中公開 `openclaw.hooks` 的 hook 套件的介面。請使用 `openclaw hooks` 來進行過濾的 hook 可見性與個別啟用，而非用於套件安裝。

Npm 規格僅限於 registry（套件名稱 + 可選的 **確切版本** 或 **dist-tag**）。Git/URL/file 規格與 semver 範圍會被拒絕。相依性安裝會以 `--ignore-scripts` 執行以確保安全。

純規格與 `@latest` 維持在穩定追蹤上。如果 npm 將其中任一解析為搶先版，OpenClaw 會停止並要求您明確選擇加入，例如使用搶先版標籤如 `@beta`/`@rc`，或是確切的搶先版版本如 `@1.2.3-beta.4`。

如果純安裝規格符合內建外掛 ID（例如 `diffs`），OpenClaw 會直接安裝內建外掛。若要安裝同名的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

支援的壓縮檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

同時也支援從 Claude 市集安裝。

ClawHub 安裝使用顯式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 現在也更偏向於使用 ClawHub 來處理裸 npm-safe 插件規範。只有在 ClawHub 沒有該套件或版本時，才會回退到 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw 從 ClawHub 下載套件歸檔，檢查聲明的插件 API / 最低閘道相容性，然後通過常規歸檔路徑進行安裝。記錄的安裝會保留其 ClawHub 來源元數據以便日後更新。

當市場名稱存在於 Claude 的本機註冊表快取 `~/.claude/plugins/known_marketplaces.json` 中時，使用 `plugin@marketplace` 簡寫：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

當您想要顯式傳遞市場來源時，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市場來源可以是：

- 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市場名稱
- 本機市場根目錄或 `marketplace.json` 路徑
- GitHub 儲存庫簡寫，例如 `owner/repo`
- git URL

對於從 GitHub 或 git 載入的遠端市場，插件條目必須保持在克隆的市場儲存庫內。OpenClaw 接受來自該儲存庫的相對路徑來源，並拒絕來自遠端清單的外部 git、GitHub、URL/歸檔和絕對路徑插件來源。

對於本機路徑和歸檔，OpenClaw 會自動檢測：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設 Claude 組件佈局)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

相容套件安裝到常規擴充功能根目錄，並參與相同的列表/資訊/啟用/停用流程。目前，支援套件技能、Claude 指令技能、Claude `settings.json` 預設值、Cursor 指令技能和相容 Codex hook 目錄；其他檢測到的套件功能會顯示在診斷/資訊中，但尚未連線到執行時執行。

使用 `--link` 以避免複製本機目錄 (新增到 `plugins.load.paths`)：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安裝上使用 `--pin`，以將解析的確切規範 (`name@version`) 儲存在 `plugins.installs` 中，同時保持預設行為未固定。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`、`plugins.installs`、外掛允許清單以及相關的 `plugins.load.paths` 項目中移除外掛記錄（如適用）。
對於作用中的記憶體外掛，記憶體槽位會重設為 `memory-core`。

根據預設，解除安裝也會移除作用中 state-dir 外掛根目錄下的外掛安裝目錄。請使用
`--keep-files` 以保留磁碟上的檔案。

`--keep-config` 被支援為 `--keep-files` 的已棄用別名。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

更新套用於 `plugins.installs` 中的追蹤安裝項目以及 `hooks.internal.installs` 中的追蹤 hook-pack 安裝項目。

當您傳入外掛 ID 時，OpenClaw 會重用該外掛記錄的安裝規格。這意味著先前儲存的 dist-tags（例如 `@beta`）和確切釘選的版本會在後續的 `update <id>` 執行中繼續使用。

對於 npm 安裝，您也可以傳入帶有 dist-tag 或確切版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回追蹤的外掛記錄，更新該已安裝的外掛，並記錄新的 npm 規格以供日後基於 ID 的更新使用。

當存在儲存的完整性雜湊且擷取的構件雜湊發生變更時，OpenClaw 會列印警告並在繼續之前要求確認。請使用
全域 `--yes` 以在 CI/非互動式執行中略過提示。

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

針對單一外掛的深度檢視。顯示身分識別、載入狀態、來源、
已註冊的功能、hooks、工具、指令、服務、閘道方法、
HTTP 路由、原則旗標、診斷和安裝中繼資料。

每個外掛都會根據其在執行階段實際註冊的內容進行分類：

- **plain-capability** — 單一功能類型（例如僅提供者的外掛）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 影像）
- **hook-only** — 僅有 hooks，沒有功能或介面
- **non-capability** — 工具/指令/服務但沒有功能

請參閱 [Plugin shapes](/en/plugins/architecture#plugin-shapes) 以進一步了解功能模型。

`--json` 旗標會輸出適合用於腳本和稽核的機器可讀報告。

`info` 是 `inspect` 的別名。
