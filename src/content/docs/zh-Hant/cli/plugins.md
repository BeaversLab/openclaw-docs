---
summary: "CLI 參考資料，用於 `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway 外掛程式、hook 套件及相容的套件組合。

相關：

- 外掛系統：[外掛程式](/zh-Hant/tools/plugin)
- 套件組合相容性：[外掛程式套件組合](/zh-Hant/plugins/bundles)
- 外掛程式清單與架構：[外掛程式清單](/zh-Hant/plugins/manifest)
- 安全性加固：[安全性](/zh-Hant/gateway/security)

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
openclaw plugins update <id-or-npm-spec>
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

如果您的 `plugins` 區段基於單一檔案的 `$include`，則 `plugins install`、
`plugins update`、`plugins enable`、`plugins disable` 和 `plugins uninstall`
會直接寫入該引入檔案，並保留 `openclaw.json` 不變。根層級引入、引入陣列，以及具有同層級覆寫的引入會封閉式地失敗，
而不是進行扁平化。請參閱 [Config includes](/zh-Hant/gateway/configuration) 以了解
支援的結構。

如果設定無效，`plugins install` 通常會封閉式地失敗，並提示您
先執行 `openclaw doctor --fix`。唯一記載的例外是針對明確選擇加入
`openclaw.install.allowInvalidConfigRecovery` 之外掛程式的狹隘打包外掛程式復原路徑。

`--force` 會重用現有的安裝目標，並就地覆寫已安裝的
外掛程式或 hook 套件。當您有意從新的本地路徑、封存檔、ClawHub 套件或 npm 成品重新安裝
相同的 id 時，請使用此選項。對於已追蹤 npm 外掛程式的常規升級，建議優先使用
`openclaw plugins update <id-or-npm-spec>`。

如果您針對已安裝的外掛程式 id 執行 `plugins install`，OpenClaw
會停止並指引您使用 `plugins update <id-or-npm-spec>` 進行正常升級，
或是當您確實想要從不同來源覆寫
目前安裝時使用 `plugins install <package> --force`。

`--pin` 僅適用於 npm 安裝。它不支援與 `--marketplace`
搭配使用，因為市集安裝會保存市集來源中繼資料，而非
npm 規格。

`--dangerously-force-unsafe-install` 是內建危險代碼掃描器誤報的緊急選項。它允許安裝在內建掃描器回報 `critical` 發現的情況下繼續，但它**不**會繞過外掛 `before_install` 掛鉤原則阻擋，也**不**會繞過掃描失敗。

此 CLI 標誌適用於外掛安裝/更新流程。由 Gateway 支援的技能依賴安裝會使用相符的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則維持為單獨的 ClawHub 技能下載/安裝流程。

`plugins install` 也是在 `package.json` 中公開 `openclaw.hooks` 的掛鉤套件安裝介面。請使用 `openclaw hooks` 來進行過濾的掛鉤可見性和個別掛鉤啟用，而非用於套件安裝。

Npm 規格僅支援註冊表（套件名稱 + 可選的 **確切版本** 或 **dist-tag**）。會拒絕 Git/URL/檔案規格和 semver 範圍。依賴安裝會以 `--ignore-scripts` 執行以確保安全。

純規格和 `@latest` 會保持在穩定版本軌道。如果 npm 將其中任一解析為發行前版本，OpenClaw 會停止並要求您明確選擇加入，方式是使用發行前版本標籤（例如 `@beta`/`@rc`）或確切的發行前版本（例如 `@1.2.3-beta.4`）。

如果純安裝規格符合綑綁的外掛 ID（例如 `diffs`），OpenClaw 會直接安裝綑綁的外掛。若要安裝具有相同名稱的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

支援的封存檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支援 Claude marketplace 安裝。

ClawHub 安裝使用明確的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 現在也優先針對純 npm 安全外掛規格使用 ClawHub。只有在 ClawHub 沒有該套件或版本時才會退回 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw 會從 ClawHub 下載套件封存，檢查公告的
外掛程式 API / 最低閘道相容性，然後透過一般
封存路徑進行安裝。記錄的安裝會保留其 ClawHub 來源中繼資料以便日後
更新。

當市集名稱存在於 `~/.claude/plugins/known_marketplaces.json` 的 Claude
本機登錄快取中時，使用 `plugin@marketplace` 簡寫：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

當您想要明確傳遞市集來源時，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市集來源可以是：

- 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市集名稱
- 本機市集根目錄或 `marketplace.json` 路徑
- GitHub 儲存庫簡寫，例如 `owner/repo`
- GitHub 儲存庫 URL，例如 `https://github.com/owner/repo`
- git URL

對於從 GitHub 或 git 載入的遠端市集，外掛程式項目必須保留
在複製的市集儲存庫內。OpenClaw 接受來自
該儲存庫的相對路徑來源，並拒絕來自遠端清單的 HTTP(S)、絕對路徑、git、GitHub 和其他非路徑
外掛程式來源。

對於本機路徑和封存，OpenClaw 會自動偵測：

- 原生 OpenClaw 外掛程式 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設的 Claude
  元件配置)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

相容套件會安裝到一般外掛程式根目錄，並參與
相同的清單/資訊/啟用/停用流程。目前，支援套件技能、Claude
指令技能、Claude `settings.json` 預設值、Claude `.lsp.json` /
清單宣告的 `lspServers` 預設值、Cursor 指令技能以及相容
Codex 掛載目錄；其他偵測到的套件功能
會顯示在診斷/資訊中，但尚未連結至執行階段執行。

### 清單

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

使用 `--enabled` 只顯示已載入的外掛程式。使用 `--verbose` 從表格檢視切換到
每個外掛程式的詳細行，包含來源/來源/版本/啟用
中繼資料。使用 `--json` 取得機器可讀的庫存以及登錄
診斷。

使用 `--link` 以避免複製本機目錄（新增到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

不支援 `--link` 搭配 `--force`，因為連結安裝會重複使用來源路徑，而不是將其複製到受管理的安裝目標。

在 npm 安裝上使用 `--pin`，將解析的確切規格（`name@version`）儲存在 `plugins.installs` 中，同時保持預設行為未被鎖定。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`、`plugins.installs`、外掛程式允許清單，以及連結的 `plugins.load.paths` 項目（如適用）中移除外掛程式記錄。對於作用中的記憶體外掛程式，記憶體插槽會重設為 `memory-core`。

根據預設，解除安裝也會移除作用中 state-dir 外掛程式根目錄下的外掛程式安裝目錄。請使用
`--keep-files` 來保留磁碟上的檔案。

支援 `--keep-config` 作為 `--keep-files` 的已棄用別名。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新套用於 `plugins.installs` 中追蹤的安裝以及 `hooks.internal.installs` 中追蹤的 hook-pack
安裝。

當您傳遞外掛程式 ID 時，OpenClaw 會重複使用該外掛程式的記錄安裝規格。這表示先前儲存的 dist-tags（例如 `@beta`）和確切的鎖定版本會在後續的 `update <id>` 執行中繼續使用。

對於 npm 安裝，您也可以傳遞帶有 dist-tag 或確切版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回追蹤的外掛程式記錄，更新該已安裝的外掛程式，並記錄新的 npm 規格以供未來以 ID 為基礎的更新使用。

傳遞不帶有版本或標記的 npm 套件名稱也會解析回追蹤的外掛程式記錄。當外掛程式被鎖定為確切版本，而您想要將其移回 registry 的預設發佈行時，請使用此方式。

在進行實際 npm 更新之前，OpenClaw 會根據 npm registry 中繼資料檢查已安裝的套件版本。如果已安裝版本和記錄的成品識別碼已符合解析的目標，則會跳過更新，而不會下載、重新安裝或重寫 `openclaw.json`。

當儲存的完整性雜湊存在且獲取的構件雜湊發生變更時，OpenClaw 會將其視為 npm 構件偏移。互動式 `openclaw plugins update` 指令會列印預期與實際的雜湊值，並在繼續之前請求確認。除非呼叫者提供明確的繼續策略，否則非互動式更新輔助程式會以封閉式失敗處理。

`--dangerously-force-unsafe-install` 也可在 `plugins update` 上使用，作為覆寫外掛程式更新期間內建危險代碼掃描誤報的緊急手段。它仍然不會繞過外掛程式 `before_install` 策略封鎖或掃描失敗封鎖，且僅適用於外掛程式更新，不適用於 Hook Pack 更新。

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

針對單一外掛程式的深度內省。顯示身分識別、載入狀態、來源、已註冊的功能、Hooks、工具、指令、服務、閘道方法、HTTP 路由、策略旗標、診斷、安裝中繼資料、套件組合功能，以及任何偵測到的 MCP 或 LSP 伺服器支援。

每個外掛程式會根據其在執行階段實際註冊的內容進行分類：

- **plain-capability** — 一種功能類型（例如僅提供者的外掛程式）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 影像）
- **hook-only** — 僅有 Hooks，沒有功能或介面
- **non-capability** — 具有工具/指令/服務但沒有功能

參閱 [外掛程式類型](/zh-Hant/plugins/architecture#plugin-shapes) 以進一步了解功能模型。

`--json` 旗標會輸出適用於腳本與稽核的機器可讀報告。

`inspect --all` 會呈現一份全艦隊表格，其中包含類型、功能種類、相容性注意事項、套件組合功能以及 Hook 摘要欄位。

`info` 是 `inspect` 的別名。

### 診斷

```bash
openclaw plugins doctor
```

`doctor` 會回報外掛程式載入錯誤、資訊清單/探索診斷以及相容性注意事項。當一切正常時，它會列印 `No plugin issues
detected.`

對於模組類型失敗（例如缺少 `register`/`activate` 匯出），請使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新執行，以便在診斷輸出中包含簡明的匯出類型摘要。

### 市集

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace list 接受本地 marketplace 路徑、`marketplace.json` 路徑、
類似 `owner/repo` 的 GitHub 簡寫、GitHub 存儲庫 URL 或 git URL。`--json`
會列印已解析的來源標籤以及已解析的 marketplace 清單和
插件條目。
