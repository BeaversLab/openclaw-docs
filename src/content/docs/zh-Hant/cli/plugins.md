---
summary: "CLI 參考資料，用於 `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway 外掛程式/擴充功能、Hook 套件及相容的套件組合。

相關：

- 外掛程式系統：[Plugins](/en/tools/plugin)
- 套件組合相容性：[Plugin bundles](/en/plugins/bundles)
- 外掛程式清單 + Schema：[Plugin manifest](/en/plugins/manifest)
- 安全性強化：[Security](/en/gateway/security)

## 指令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

隨附的外掛程式隨 OpenClaw 一起出貨。有些預設為啟用（例如隨附的模型提供者、隨附的語音提供者和隨附的瀏覽器外掛程式）；其他則需要 `plugins enable`。

原生 OpenClaw 外掛程式必須隨附內嵌 JSON Schema (`configSchema`，即使為空) 的 `openclaw.plugin.json`。相容的套件組合則改用自己的套件組合清單。

`plugins list` 會顯示 `Format: openclaw` 或 `Format: bundle`。詳細的列表/資訊輸出也會顯示套件組合子類型 (`codex`、`claude` 或 `cursor`) 以及偵測到的套件組合功能。

### 安裝

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

純套件名稱會先檢查 ClawHub，然後是 npm。安全性提示：
將外掛程式安裝視為執行程式碼。建議優先使用鎖定的版本。

如果設定無效，`plugins install` 通常會無法開啟並告訴您先執行 `openclaw doctor --fix`。唯一記載的例外情況是針對明確選擇加入 `openclaw.install.allowInvalidConfigRecovery` 的外掛程式，提供狹窄的隨附外掛程式復原路徑。

`--force` 會重複使用現有的安裝目標，並就地覆寫已安裝的外掛程式或 hook 套件。當您故意從新的本機路徑、封存檔、ClawHub 套件或 npm 成品重新安裝相同的 id 時，請使用此選項。

`--pin` 僅適用於 npm 安裝。`--marketplace` 不支援此選項，因為市集安裝會保存市集來源中繼資料，而不是 npm 規格。

`--dangerously-force-unsafe-install` 是內建危險程式碼掃描器誤報的緊急選項。即使內建掃描器回報 `critical` 發現，它仍允許安裝繼續，但並**不**繞過外掛程式 `before_install` 掛鉤原則封鎖，且不繞過掃描失敗。

此 CLI 標誌適用於外掛程式安裝/更新流程。Gateway 支援的技能相依性安裝使用相符的 `dangerouslyForceUnsafeInstall` 要求覆寫，而 `openclaw skills install` 則維持為個別的 ClawHub 技能下載/安裝流程。

`plugins install` 也是用來安裝在 `package.json` 中公開 `openclaw.hooks` 的掛鉤套件的介面。請使用 `openclaw hooks` 進行篩選的掛鉤可見性與個別掛鉤啟用，而非套件安裝。

Npm 規格僅限於**登錄庫**（套件名稱 + 選用的**確切版本**或**發行標籤**）。會拒絕 Git/URL/檔案規格和 semver 範圍。為確保安全，相依性安裝會以 `--ignore-scripts` 執行。

純規格和 `@latest` 會保持在穩定軌道。如果 npm 將其中任何一個解析為預發行版本，OpenClaw 會停止並要求您明確選擇加入，方法是使用預發行標籤（例如 `@beta`/`@rc`）或確切的預發行版本（例如 `@1.2.3-beta.4`）。

如果純安裝規格符合打包的外掛程式 ID（例如 `diffs`），OpenClaw 會直接安裝打包的外掛程式。若要安裝具有相同名稱的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

支援的封存檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支援 Claude 市集安裝。

ClawHub 安裝使用明確的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 現在也偏好將 ClawHub 用於純 npm 安全外掛程式規格。只有在 ClawHub 沒有該套件或版本時，才會退回 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw 會從 ClawHub 下載套件封存，檢查公告的
插件 API / 最低閘道相容性，然後透過一般封存路徑進行安裝。記錄的安裝會保留其 ClawHub 來源中繼資料，以便日後更新。

當市集名稱存在於 Claude 的本機登錄快取 `~/.claude/plugins/known_marketplaces.json` 中時，請使用 `plugin@marketplace` 簡寫：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

當您想要明確傳遞市集來源時，請使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市集來源可以是：

- 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市集名稱
- 本機市集根目錄或 `marketplace.json` 路徑
- GitHub 存放庫簡寫，例如 `owner/repo`
- GitHub 存放庫 URL，例如 `https://github.com/owner/repo`
- git URL

對於從 GitHub 或 git 載入的遠端市集，插件項目必須保留在
複製的市集存放庫內。OpenClaw 接受來自該存放庫的相對路徑來源，並拒絕來自遠端清單的 HTTP(S)、絕對路徑、git、GitHub 和其他非路徑插件來源。

對於本機路徑和封存，OpenClaw 會自動偵測：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設的 Claude
  組件佈局)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

相容套件會安裝到一般延伸模組根目錄，並參與
相同的 list/info/enable/disable 流程。目前支援套件技能、Claude 指令技能、Claude `settings.json` 預設值、Claude `.lsp.json` /
宣告的 `lspServers` 預設值、Cursor 指令技能和相容的 Codex hook 目錄；其他偵測到的套件功能會顯示在診斷/資訊中，但尚未連線至執行時執行。

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

使用 `--enabled` 僅顯示已載入的插件。使用 `--verbose` 從表格檢視切換到包含來源/來源/版本/啟用
中繼資料的個別插件詳細資訊行。使用 `--json` 取得機器可讀的清單加上登錄
診斷。

使用 `--link` 以避免複製本地目錄（新增到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

`--force` 不支援與 `--link` 搭配使用，因為連結安裝會重複使用來源路徑，而不是複製到受管理的安裝目標。

在 npm 安裝上使用 `--pin`，將解析的確切規格（`name@version`）儲存在 `plugins.installs` 中，同時保持預設行為不受固定限制。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`、`plugins.installs`、外掛程式允許清單以及連結的 `plugins.load.paths` 項目中移除外掛程式記錄（如果適用）。
對於活躍的記憶體外掛程式，記憶體插槽會重設為 `memory-core`。

預設情況下，解除安裝也會移除作用中 state-dir 外掛程式根目錄下的外掛程式安裝目錄。請使用
`--keep-files` 保留磁碟上的檔案。

`--keep-config` 作為已淘汰的別名支援，用於 `--keep-files`。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新適用於 `plugins.installs` 中追蹤的安裝以及 `hooks.internal.installs` 中追蹤的 hook-pack 安裝。

當您傳遞外掛程式 ID 時，OpenClaw 會重複使用該外掛程式的記錄安裝規格。這表示先前儲存的 dist-tags（例如 `@beta`）和確切固定的版本會在之後的 `update <id>` 執行中繼續使用。

對於 npm 安裝，您也可以傳遞帶有 dist-tag 或確切版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回追蹤的外掛程式記錄，更新該已安裝的外掛程式，並記錄新的 npm 規格以供日後基於 ID 的更新使用。

當儲存的完整性雜湊存在且擷取的构件雜湊發生變更時，OpenClaw 會列印警告並在繼續之前要求確認。請使用全域 `--yes` 在 CI/非互動式執行中略過提示。

`--dangerously-force-unsafe-install` 也可在 `plugins update` 上取得，作為外掛程式更新期間內建危險代碼掃描誤報的緊急覆寫措施。它仍不會繞過外掛程式 `before_install` 原則封鎖或掃描失敗封鎖，且僅適用於外掛程式更新，不適用於 Hook Pack 更新。

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

針對單一外掛程式的深度內省。顯示身分識別、載入狀態、來源、註冊的功能、Hook、工具、命令、服務、閘道方法、HTTP 路由、原則旗標、診斷資訊、安裝中繼資料、套件組合功能，以及任何偵測到的 MCP 或 LSP 伺服器支援。

每個外掛程式會根據其在執行階段實際註冊的內容進行分類：

- **plain-capability** — 一種功能類型 (例如僅提供者的外掛程式)
- **hybrid-capability** — 多種功能類型 (例如文字 + 語音 + 影像)
- **hook-only** — 僅有 Hook，沒有功能或介面
- **non-capability** — 有工具/命令/服務但沒有功能

請參閱 [外掛程式類型](/en/plugins/architecture#plugin-shapes) 以進一步了解功能模型。

`--json` 旗標會輸出適用於指令碼和稽核的機器可讀報告。

`inspect --all` 會呈現一個涵蓋整個環境的表格，其中包含類型、功能種類、相容性注意事項、套件組合功能和 Hook 摘要欄位。

`info` 是 `inspect` 的別名。

### 診斷

```bash
openclaw plugins doctor
```

`doctor` 會回報外掛程式載入錯誤、資訊清單/探索診斷資訊和相容性注意事項。當一切正常時，它會印出 `No plugin issues detected.`

### 市集

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

市集清單接受本機市集路徑、`marketplace.json` 路徑、類似 `owner/repo` 的 GitHub 簡寫、GitHub 存放庫 URL 或 git URL。`--json` 會列印已解析的來源標籤以及已解析的市集資訊清單和外掛程式項目。
