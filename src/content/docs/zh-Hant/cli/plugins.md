---
summary: "CLI 參考文件 `openclaw plugins` (init, build, validate, list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to scaffold or validate a simple tool plugin
  - You want to debug plugin load failures
title: "外掛程式"
sidebarTitle: "外掛程式"
---

管理 Gateway 外掛程式、hook 套件及相容的套件組合。

<CardGroup cols={2}>
  <Card title="外掛程式系統" href="/zh-Hant/tools/plugin">
    用於安裝、啟用及疑難排解外掛程式的終端使用者指南。
  </Card>
  <Card title="管理外掛程式" href="/zh-Hant/plugins/manage-plugins">
    用於安裝、列出、更新、解除安裝及發佈的快速範例。
  </Card>
  <Card title="外掛程式套件" href="/zh-Hant/plugins/bundles">
    套件相容性模型。
  </Card>
  <Card title="外掛程式清單" href="/zh-Hant/plugins/manifest">
    清單欄位與配置架構。
  </Card>
  <Card title="安全性" href="/zh-Hant/gateway/security">
    外掛程式安裝的安全性強化。
  </Card>
</CardGroup>

## 指令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
openclaw plugins init <id>
openclaw plugins init <id> --directory ./my-plugin --name "My Plugin"
openclaw plugins build --entry ./dist/index.js
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
```

針對安裝、檢查、解除安裝或登錄檔重新整理緩慢的情況進行調查時，請使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 執行指令。追蹤會將階段計時寫入 stderr 並保持 JSON 輸出可解析。請參閱 [Debugging](/zh-Hant/help/debugging#plugin-lifecycle-trace)。

<Note>在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，外掛生命週期變更器會停用。請改用 Nix 來源進行此安裝，而不是 `plugins install`、`plugins update`、`plugins uninstall`、`plugins enable` 或 `plugins disable`；若為 nix-openclaw，請使用代理優先的 [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。</Note>

<Note>
隨附的套件外掛隨 OpenClaw 一起發行。部分外掛預設為啟用（例如隨附的模型提供者、隨附的語音提供者以及隨附的瀏覽器外掛）；其他外掛則需要 `plugins enable`。

原生 OpenClaw 外掛必須隨附 `openclaw.plugin.json` 以及內嵌的 JSON Schema（`configSchema`，即使為空）。相容的套件則改用其自己的套件清單。

`plugins list` 會顯示 `Format: openclaw` 或 `Format: bundle`。詳細的列表/資訊輸出也會顯示套件子類型（`codex`、`claude` 或 `cursor`）以及偵測到的套件功能。

</Note>

### 作者

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm run plugin:build
npm run plugin:validate
```

`plugins init` 會建立一個使用 `defineToolPlugin` 的最小化 TypeScript 工具外掛。`plugins build` 會匯入該入口、讀取其靜態工具元資料、寫入 `openclaw.plugin.json`，並保持 `package.json` `openclaw.extensions` 一致。`plugins validate` 會檢查產生的資訊清單、套件元資料與目前的匯出是否仍然相符。如需完整的編寫工作流程，請參閱 [Tool Plugins](/zh-Hant/plugins/tool-plugins)。

支架會撰寫 TypeScript 原始碼，但會根據建置的 `./dist/index.js` 入口產生中繼資料，因此此工作流程也適用於已發行的 CLI。當入口不是預設的套件入口時，請使用 `--entry <path>`。在 CI 中使用 `plugins build --check`，可在生成的中繼資料過期時導致失敗而不需重寫檔案。

### 安裝

```bash
openclaw plugins search "calendar"                   # search ClawHub plugins
openclaw plugins install <package>                      # source auto-detection
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install npm:<package>                  # npm only
openclaw plugins install npm-pack:<path.tgz>            # local npm pack through npm install semantics
openclaw plugins install git:github.com/<owner>/<repo>  # git repo
openclaw plugins install git:github.com/<owner>/<repo>@<ref>
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

正在測試設定時安裝的維護人員可以使用受保護的環境變數覆寫自動外掛安裝來源。請參閱 [Plugin install overrides](/zh-Hant/plugins/install-overrides)。

<Warning>
在啟動切換期間，除非符合官方外掛程式 ID，否則純套件名稱預設會從 npm 安裝。符合隨附外掛程式的原始 `@openclaw/*` 套件規格會使用隨附於目前 OpenClaw 組建的隨附複本。當您刻意需要外部 npm 套件時，請使用 `npm:<package>`。針對 ClawHub，請使用 `clawhub:<package>`。請將外掛程式安裝視為執行程式碼。建議優先使用釘選的版本。
</Warning>

`plugins search` 會查詢 ClawHub 以尋找可安裝的外掛程式套件，並列印準備好安裝的套件名稱。它會搜尋 code-plugin 和 bundle-plugin 套件，而非技能。針對 ClawHub 技能，請使用 `openclaw skills search`。

<Note>
  ClawHub 是大多數外掛的主要發行與發現平台。Npm 仍是支援的備援方案與直接安裝途徑。OpenClaw 擁有的 `@openclaw/*` 外掛套件已在 npm 上重新發行；您可以在 [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 或 [plugin inventory](/zh-Hant/plugins/plugin-inventory) 上查看目前的清單。穩定版安裝使用 `latest`。Beta 頻道的安裝與更新會優先使用 npm `beta` dist-tag（如果該標籤可用），然後才回退至 `latest`。
</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    如果您的 `plugins` 部分是由單一檔案 `$include` 支援，`plugins install/update/enable/disable/uninstall` 會直接寫入該引入的檔案並保持 `openclaw.json` 不變。根層級引入、引入陣列以及具有同層級覆寫的引入會採取「封閉失敗」（fail closed）而非扁平化處理。請參閱 [Config includes](/zh-Hant/gateway/configuration) 以了解支援的結構。

    如果在安裝期間設定無效，`plugins install` 通常會採取封閉失敗並告訴您先執行 `openclaw doctor --fix`。在 Gateway 啟動和熱重載期間，無效的外掛設定會像任何其他無效設定一樣採取封閉失敗；`openclaw doctor --fix` 可以隔離無效的外掛項目。唯一記載的安裝時期例外情況，是針對明確選擇加入 `openclaw.install.allowInvalidConfigRecovery` 之外掛的狹隘打包外掛復原路徑。

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` 會重用現有的安裝目標，並就地覆寫已安裝的外掛程式或 hook pack。當您故意從新的本機路徑、封存檔、ClawHub 套件或 npm 構件重新安裝相同的 id 時，請使用此選項。若要對已追蹤的 npm 外掛程式進行常規升級，建議使用 `openclaw plugins update <id-or-npm-spec>`。

    如果您針對已安裝的外掛程式 id 執行 `plugins install`，OpenClaw 會停止並指引您使用 `plugins update <id-or-npm-spec>` 進行一般升級，或當您確實想要從不同的來源覆寫目前的安裝時，指引您使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` 僅適用於 npm 安裝。不支援搭配 `git:` 安裝使用；當您需要固定的來源時，請使用明確的 git ref，例如 `git:github.com/acme/plugin@v1.2.3`。不支援搭配 `--marketplace` 使用，因為市集安裝會保留市集來源的元資料，而非 npm 規格。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是內建危險代碼掃描器誤報時的緊急選項。即使內建掃描器報告 `critical` 發現，它也允許安裝繼續，但它**不會**繞過插件 `before_install` hook 政策封鎖，也**不會**繞過掃描失敗。

    安裝掃描會忽略常見的測試檔案和目錄，例如 `tests/`、`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免封鎖打包的測試模擬物件；即使聲明的插件運行時進入點使用這些名稱之一，仍會被掃描。

    此 CLI 標誌適用於插件安裝/更新流程。Gateway 支援的技能依賴安裝使用匹配的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 仍然是單獨的 ClawHub 技能下載/安裝流程。

    如果您在 ClawHub 上發布的插件被註冊表掃描隱藏或封鎖，請使用 [ClawHub publishing](/zh-Hant/clawhub/publishing) 中的發布者步驟。`--dangerously-force-unsafe-install` 僅影響您自己機器上的安裝；它不會要求 ClawHub 重新掃描插件或使被封鎖的發布版本公開。

  </Accordion>
  <Accordion title="Hook packs and npm specs">
    `plugins install` 也是在 `package.json` 中公開 `openclaw.hooks` 的 Hook 套件安裝介面。請使用 `openclaw hooks` 來過濾 Hook 可見性並啟用各個 Hook，而非用於套件安裝。

    Npm 規格僅限於 **registry-only**（套件名稱 + 選用的 **確切版本** 或 **dist-tag**）。Git/URL/file 規格和 semver 範圍會被拒絕。相依性安裝會在每個外掛的一個受控 npm 專案中執行，並使用 `--ignore-scripts` 以確保安全，即使您的 Shell 設定了全域 npm 安裝設定也一樣。受控的外掛 npm 專案會繼承 OpenClaw 的套件層級 npm `overrides`，因此主機安全性固定版本也會套用至被提升的外掛相依性。

    當您希望明確指定 npm 解析時，請使用 `npm:<package>`。除非符合官方外掛 ID，否則純套件規格也會在啟動切換期間直接從 npm 安裝。

    符合隨附外掛的原始 `@openclaw/*` 套件規格會先解析為映像檔擁有的隨附副本，然後才回退至 npm。例如，`openclaw plugins install @openclaw/discord@2026.5.20 --pin` 會使用目前 OpenClaw 建置版本中隨附的 Discord 外掛，而不是建立受控的 npm 覆寫。若要強制使用外部 npm 套件，請使用 `openclaw plugins install npm:@openclaw/discord@2026.5.20 --pin`。

    純規格和 `@latest` 會保持在穩定版本軌道上。OpenClaw 日期標記的修正版本（例如 `2026.5.3-1`）對於此檢查而言屬於穩定版本。如果 npm 將其中任一者解析為發行前版本，OpenClaw 會停止並要求您使用發行前版本標籤（例如 `@beta`/`@rc`）或確切的發行前版本（例如 `@1.2.3-beta.4`）明確選擇加入。

    對於沒有確切版本（`npm:<package>` 或 `npm:<package>@latest`）的 npm 安裝，OpenClaw 會在安裝前檢查已解析的套件元資料。如果最新的穩定套件需要較新的 OpenClaw 外掛 API 或最低主機版本，OpenClaw 會檢查較舊的穩定版本，並改為安裝最新的相容版本。確切版本和明確的 dist-tag（例如 `@beta`）保持嚴格：如果選取的套件不相容，指令會失敗並要求您升級 OpenClaw 或選擇相容版本。

    如果純安裝規格符合官方外掛 ID（例如 `diffs`），OpenClaw 會直接安裝目錄項目。若要安裝同名稱的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git repositories">
    使用 `git:<repo>` 直接從 git 儲存庫安裝。支援的格式包括 `git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://` 和 `git@host:owner/repo.git` 克隆 URL。在安裝前加入 `@<ref>` 或 `#<ref>` 以檢出分支、標籤或提交。

    Git 安裝會克隆到暫存目錄，如果存在請求的引用則進行檢出，然後使用正常的插件目錄安裝程式。這意味著清單驗證、危險代碼掃描、套件管理器安裝工作以及安裝記錄的行為都與 npm 安裝相同。記錄的 git 安裝包含來源 URL/引用以及解析出的提交，因此 `openclaw plugins update` 可以在稍後重新解析來源。

    從 git 安裝後，使用 `openclaw plugins inspect <id> --runtime --json` 驗證執行時期註冊項，例如 Gateway 方法和 CLI 命令。如果插件使用 `api.registerCli` 註冊了 CLI 根目錄，請直接透過 OpenClaw 根 CLI 執行該命令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="Archives">
    支援的壓縮檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件壓縮檔必須在解壓縮後的插件根目錄中包含有效的 `openclaw.plugin.json`；僅包含 `package.json` 的壓縮檔會在 OpenClaw 寫入安裝記錄之前被拒絕。

    當檔案是 npm 打包的 tarball 並且您想要測試註冊表安裝所使用的相同每個插件受管理 npm 專案路徑時，請使用 `npm-pack:<path.tgz>`，包括 `package-lock.json` 驗證、提升依賴項掃描和 npm 安裝記錄。純壓縮檔路徑仍然會作為插件擴充功能根目錄下的本機壓縮檔進行安裝。

    也支援從 Claude 市場安裝。

  </Accordion>
</AccordionGroup>

ClawHub 安裝使用明確的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

除非符合官方外掛 ID，否則裸露的 npm 安全外掛規格會在啟動切換期間預設從 npm 安裝：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 以明確指定僅解析 npm：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@openclaw/discord@2026.5.20
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 會在安裝前檢查宣告的外掛 API / 最低 Gateway 相容性。當選定的 ClawHub 版本發布 ClawPack 成品時，OpenClaw 會下載版本控制的 npm-pack `.tgz`，驗證 ClawHub 摘要標頭和成品摘要，然後透過一般存檔路徑進行安裝。沒有 ClawPack 元數據的舊版 ClawHub 仍會透過舊版套件存檔驗證路徑進行安裝。記錄的安裝會保留其 ClawHub 來源元數據、成品類型、npm 完整性、npm shasum、tarball 名稱和 ClawPack 摘要事實，以供後續更新使用。
未指定版本的 ClawHub 安裝會保留未指定版本的記錄規格，因此 `openclaw plugins update` 可以追蹤較新的 ClawHub 版本；明確的版本或標籤選擇器（例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）會保持固定在該選擇器。

#### Marketplace 簡寫

當市集名稱存在於 Claude 本機註冊表快取 `~/.claude/plugins/known_marketplaces.json` 中時，使用 `plugin@marketplace` 簡寫：

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

<Tabs>
  <Tab title="市集來源">
    - 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市集名稱
    - 本機市集根目錄或 `marketplace.json` 路徑
    - GitHub 存儲庫簡寫，例如 `owner/repo`
    - GitHub 存儲庫 URL，例如 `https://github.com/owner/repo`
    - git URL

  </Tab>
  <Tab title="遠端 marketplace 規則">
    對於從 GitHub 或 git 載入的遠端 marketplace，插件條目必須保留在複製的 marketplace 存儲庫內。OpenClaw 接受來自該存儲庫的相對路徑來源，並拒絕來自遠端清單的 HTTP(S)、絕對路徑、git、 GitHub 和其他非路徑插件來源。
  </Tab>
</Tabs>

對於本機路徑和歸檔，OpenClaw 會自動偵測：

- 原生 OpenClaw 外掛 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設的 Claude 元件佈局)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

<Note>相容的套件會安裝到標準的外掛程式根目錄中，並參與相同的 list/info/enable/disable 流程。目前支援套件技能、Claude command-skills、Claude `settings.json` defaults、Claude `.lsp.json` / manifest-declared `lspServers` defaults、Cursor command-skills，以及相容的 Codex hook 目錄；其他偵測到的套件功能會顯示在 diagnostics/info 中，但尚未連接到執行階段執行。</Note>

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
```

<ParamField path="--enabled" type="boolean">
  僅顯示已啟用的插件。
</ParamField>
<ParamField path="--verbose" type="boolean">
  從表格檢視切換至每個插件的詳細資訊行，包含來源/來處/版本/啟用中繼資料。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀的清單，加上註冊表診斷和套件相依性安裝狀態。
</ParamField>

<Note>
`plugins list` 會先讀取持續化的本地外掛程式登錄檔，當登錄檔遺失或無效時，則回退到僅 manifest 的推導資訊。這對於檢查外掛程式是否已安裝、啟用且對冷啟動規劃可見很有用，但它不是針對已運行 Gateway 處理程序的即時執行階段探測。在變更外掛程式碼、啟用狀態、hook 原則或 `plugins.load.paths` 後，若期望新的 `register(api)` 程式碼或 hooks 能夠運行，請先重新啟動服務該通道的 Gateway。對於遠端/容器部署，請確認您重新啟動的是實際的 `openclaw gateway run` 子程序，而不僅僅是包裝程序。

`plugins list --json` 包含每個外掛程式的 `dependencyStatus`，來自 `package.json`
`dependencies` 和 `optionalDependencies`。OpenClaw 會檢查這些套件
名稱是否存在於外掛程式的標準 Node `node_modules` 查找路徑中；它
不會匯入外掛程式執行階段程式碼、執行套件管理員，或修復遺失的相依項。

</Note>

`plugins search` 是一個遠端 ClawHub 目錄查詢。它不會檢查本地
狀態、變更設定、安裝套件或載入外掛程式執行階段程式碼。搜尋
結果包含 ClawHub 套件名稱、系列、通道、版本、摘要，以及
安裝提示，例如 `openclaw plugins install clawhub:<package>`。

對於在打包的 Docker 映像檔中進行的捆綁插件工作，將來源目錄掛載到相符的打包來源路徑上，例如 `/app/extensions/synology-chat`。OpenClaw 會在 `/app/dist/extensions/synology-chat` 之前發現該掛載的來源疊加層；單純複製的來源目錄將保持不活動，因此正常的打包安裝仍會使用已編譯的 dist。

若要進行執行階段 Hook 除錯：

- `openclaw plugins inspect <id> --runtime --json` 顯示來自模組載入檢查階段的已註冊掛鉤與診斷資訊。執行階段檢查從不安裝相依項；請使用 `openclaw doctor --fix` 來清除舊版相依項狀態，或復原設定參照中遺失的可下載插件。
- `openclaw gateway status --deep --require-rpc` 會確認可到達的 Gateway URL/設定檔、服務/程序提示、設定路徑與 RPC 健康狀態。
- 非捆綁的對話掛鉤 (`llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize`、`agent_end`) 需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 以避免複製本機目錄 (會新增至 `plugins.load.paths`)：

```bash
openclaw plugins install -l ./my-plugin
```

獨立的插件檔案必須列在 `plugins.load.paths` 中，而不是直接放在 `~/.openclaw/extensions` 或 `<workspace>/.openclaw/extensions` 中。這些自動發現的根目錄會加載插件套件或綑綁目錄，而頂層腳本檔案則被視為本地輔助程式並被跳過。

<Note>
`--force` 不支援與 `--link` 一起使用，因為連結安裝會重複使用來源路徑，而不是複製到受管理的安裝目標。

在 npm 安裝上使用 `--pin`，將解析的確切規格 (`name@version`) 儲存在受管理的插件索引中，同時保持預設行為未固定。

</Note>

### 插件索引

外掛程式安裝中繼資料是機器管理的狀態，而非使用者設定。安裝和更新會將其寫入至作用中 OpenClaw 狀態目錄下的 `plugins/installs.json`。其頂層 `installRecords` 對映是安裝中繼資料的持久來源，包含損壞或遺失外掛程式資訊清單的記錄。`plugins` 陣列是衍生的資訊清單冷登錄快取。此檔案包含請勿編輯的警告，並供 `openclaw plugins update`、解除安裝、診斷和外掛程式冷登錄使用。

當 OpenClaw 在設定中看到隨附的舊版 `plugins.installs` 記錄時，執行階段讀取會將其視為相容性輸入，而不重寫 `openclaw.json`。明確的外掛程式寫入和 `openclaw doctor --fix` 會將這些記錄移至外掛程式索引，並在允許設定寫入時移除設定金鑰；如果任一寫入失敗，則會保留設定記錄，以免安裝中繼資料遺失。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`（持續性的外掛程式索引）、外掛程式允許/拒絕清單項目，以及連結的 `plugins.load.paths` 項目（如適用）中移除外掛程式記錄。除非設定了 `--keep-files`，否則解除安裝也會在受追蹤的受管理安裝目錄位於 OpenClaw 的外掛程式延伸模組根目錄內時將其移除。對於作用中的記憶體外掛程式，記憶體插槽會重設為 `memory-core`。

<Note>`--keep-config` 受支援為 `--keep-files` 的已棄用別名。</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新套用於受管理外掛程式索引中受追蹤的外掛程式安裝，以及 `hooks.internal.installs` 中受追蹤的 hook-pack 安裝。

<AccordionGroup>
  <Accordion title="解析插件 ID 與 npm 規格">
    當您傳遞插件 ID 時，OpenClaw 會重用該插件的記錄安裝規格。這意味著先前儲存的發行標籤 (dist-tags)，例如 `@beta`，以及確切的固定版本，會在後續的 `update <id>` 執行中繼續使用。

    對於 npm 安裝，您也可以傳遞帶有發行標籤或確切版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回已追蹤的插件記錄，更新該已安裝的插件，並記錄新的 npm 規格以供日後基於 ID 的更新使用。

    傳遞不帶有版本或標籤的 npm 套件名稱也會解析回已追蹤的插件記錄。當插件被固定在特定版本，而您想要將其移回註冊表的預設發佈線時，請使用此方式。

  </Accordion>
  <Accordion title="Beta 頻道更新">
    `openclaw plugins update` 會重用已追蹤的插件規格，除非您傳遞了新的規格。`openclaw update` 還會知道目前的 OpenClaw 更新頻道：在 beta 頻道上，預設線的 npm 和 ClawHub 插件記錄會先嘗試 `@beta`。如果沒有插件 beta 版本存在，它們會回退到記錄的 default/latest 規格；如果 beta 套件存在但安裝驗證失敗，npm 插件也會回退。該回退會被回報為警告，且不會導致核心更新失敗。確切版本和明確標籤會保持固定在該選擇器。

  </Accordion>
  <Accordion title="版本檢查與完整性漂移">
    在進行即時 npm 更新之前，OpenClaw 會檢查已安裝的套件版本與 npm 註冊表元數據。如果已安裝的版本和記錄的構件身分已經符合解析的目標，該更新將會被跳過，而不會下載、重新安裝或重寫 `openclaw.json`。

    當儲存的完整性雜湊存在且擷取的構件雜湊發生變化時，OpenClaw 會將其視為 npm 構件漂移。互動式 `openclaw plugins update` 指令會列印預期和實際的雜湊值，並在繼續之前要求確認。非互動式更新輔助程式會以失敗封閉（fail closed）的方式運作，除非呼叫者提供明確的繼續策略。

  </Accordion>
  <Accordion title="更新時的 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 也可在 `plugins update` 上使用，作為插件更新期間內建危險代碼掃描誤報的緊急覆寫（break-glass override）。它仍然不會繞過插件 `before_install` 策略封鎖或掃描失敗封鎖，且僅適用於插件更新，不適用於 hook-pack 更新。
  </Accordion>
</AccordionGroup>

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect 會顯示身分、載入狀態、來源、清單功能、策略標誌、診斷、安裝元數據、套件組合功能以及任何偵測到的 MCP 或 LSP 伺服器支援，且預設不會匯入插件運行時。加入 `--runtime` 以載入插件模組並包含已註冊的 hooks、工具、指令、服務、gateway 方法和 HTTP 路由。運行時檢查會直接回報遺失的插件相依性；安裝和修復作業則保留在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中。

外掛程式擁有的 CLI 命令通常會安裝為根 `openclaw` 命令群組，但外掛程式也可能在核心父項下註冊巢狀命令，例如 `openclaw nodes`。當 `inspect --runtime` 顯示 `cliCommands` 下的命令時，請在列出的路徑執行它；例如，註冊了 `demo-git` 的外掛程式可以透過 `openclaw demo-git ping` 進行驗證。

每個外掛程式會根據其在執行階段實際註冊的內容進行分類：

- **plain-capability** — 一種功能類型（例如僅提供者的外掛程式）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 圖片）
- **hook-only** — 僅包含 hooks，沒有功能或 surfaces
- **non-capability** — 包含工具/命令/服務但沒有功能

請參閱 [Plugin shapes](/zh-Hant/plugins/architecture#plugin-shapes) 以了解更多關於功能模型的資訊。

<Note>`--json` 標誌會輸出適用於腳本和稽核的機器可讀報告。`inspect --all` 會呈現一個整個範圍的表格，其中包含形狀、功能類型、相容性注意事項、套件束功能以及 hook 摘要欄位。`info` 是 `inspect` 的別名。</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 會回報外掛程式載入錯誤、清單/探索診斷、相容性注意事項，以及過時的外掛程式設定參照，例如遺失的外掛程式插槽。當安裝樹和外掛程式設定都很乾淨時，它會列印 `No plugin issues detected.`。如果仍有過時的設定，但安裝樹在其他方面是健康的，摘要會說明這一點，而不是暗示外掛程式完全健康。

如果設定的外掛程式存在於磁碟上，但因載入器的路徑安全檢查而被阻擋，設定驗證會保留該外掛程式項目並將其回報為 `present but blocked`。請修正先前的 blocked-plugin 診斷問題（例如路徑所有權或全球可寫入權限），而不是移除 `plugins.entries.<id>` 或 `plugins.allow` 設定。

對於缺少 `register`/`activate` 匯出等模組形狀失敗，請使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新執行，以便在診斷輸出中包含精簡的匯出形狀摘要。

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本機插件註冊表是 OpenClaw 的持久化冷讀取模型，用於已安裝的插件身分、啟用狀態、來源中繼資料和貢獻擁有權。正常啟動、提供者擁有者查閱、通道設定分類和插件盤點可以在不匯入插件執行階段模組的情況下讀取它。

使用 `plugins registry` 來檢查持久化註冊表是否存在、是最新版本還是已過時。使用 `--refresh` 從持久化插件索引、設定原則以及 manifest/package 中繼資料重建它。這是一條修復路徑，而不是執行階段啟用路徑。

`openclaw doctor --fix` 也會修復註冊表相鄰的受控 npm 偏差：如果受控插件 npm 專案下的孤兒或已復原 `@openclaw/*` 套件，或舊版扁平化受控 npm 根目錄遮蔽了捆綁插件，doctor 會移除該過時套件並重建註冊表，以便啟動時根據捆綁 manifest 進行驗證。Doctor 也會將主機 `openclaw` 套件重新連結到宣告 `peerDependencies.openclaw` 的受控 npm 插件，因此在更新或 npm 修復後，諸如 `openclaw/plugin-sdk/*` 等套件本機執行階段匯入可以正確解析。

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一個已棄用的緊急相容性開關，用於註冊表讀取失敗。建議優先使用 `plugins registry --refresh` 或 `openclaw doctor --fix`；環境變數後備僅用於推出遷移時的緊急啟動修復。</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace list 接受本機 marketplace 路徑、`marketplace.json` 路徑、類似 `owner/repo` 的 GitHub 簡寫、GitHub 儲存庫 URL 或 git URL。`--json` 會列印解析後的來源標籤以及解析後的 marketplace manifest 和插件項目。

## 相關

- [建置插件](/zh-Hant/plugins/building-plugins)
- [CLI 參考](/zh-Hant/cli)
- [ClawHub](/zh-Hant/clawhub)
