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

若要針對緩慢的安裝、檢查、解除安裝或登錄檔重新整理進行調查，請使用
`OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 執行指令。追蹤會將階段計時寫入至 stderr
並保持 JSON 輸出可解析。請參閱 [除錯](/zh-Hant/help/debugging#plugin-lifecycle-trace)。

<Note>在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，外掛程式生命週期 mutator 已停用。請使用 Nix 來源進行此安裝，而非 `plugins install`、`plugins update`、`plugins uninstall`、`plugins enable` 或 `plugins disable`；若為 nix-openclaw，請使用 agent-first [快速入門](https://github.com/openclaw/nix-openclaw#quick-start)。</Note>

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

`plugins init` 會建立一個使用 `defineToolPlugin` 的極簡 TypeScript 工具外掛。`plugins build` 會匯入該入口，讀取其靜態工具中繼資料，寫入 `openclaw.plugin.json`，並保持 `package.json` `openclaw.extensions` 一致。`plugins validate` 會檢查生成的清單、套件中繼資料與目前的入口匯出是否仍然一致。請參閱[工具外掛](/zh-Hant/plugins/tool-plugins)以了解完整的編寫工作流程。

支架會撰寫 TypeScript 原始碼，但會根據建置的 `./dist/index.js` 入口產生中繼資料，因此此工作流程也適用於已發行的 CLI。當入口不是預設的套件入口時，請使用 `--entry <path>`。在 CI 中使用 `plugins build --check`，可在生成的中繼資料過期時導致失敗而不需重寫檔案。

### 安裝

```bash
openclaw plugins search "calendar"                   # search ClawHub plugins
openclaw plugins install <package>                      # npm by default
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

正在測試設定時安裝的維護者可以使用受防護的環境變數來覆寫自動外掛安裝來源。請參閱[外掛安裝覆寫](/zh-Hant/plugins/install-overrides)。

<Warning>
在啟動切換期間，純套件名稱預設會從 npm 安裝。對於 ClawHub，請使用 `clawhub:<package>`。請將外掛安裝視為執行程式碼。優先使用鎖定的版本。
</Warning>

`plugins search` 查詢 ClawHub 以取得可安裝的 plugin 套件，並列印
可安裝的套件名稱。它會搜尋 code-plugin 和 bundle-plugin 套件，
不搜尋 skills。請使用 `openclaw skills search` 來安裝 ClawHub skills。

<Note>ClawHub 是大多數 plugin 的主要發行和探索平台。Npm 仍受支援作為備援和直接安裝途徑。OpenClaw 擁有的 `@openclaw/*` plugin 套件會再次發佈到 npm；請在 [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 或 [plugin inventory](/zh-Hant/plugins/plugin-inventory) 查看目前清單。 穩定版安裝使用 `latest`。 Beta 版通道安裝和更新會在可用時優先使用 npm `beta` dist-tag，然後才 退回到 `latest`。</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    如果您的 `plugins` section 是由單一檔案 `$include` 支援，`plugins install/update/enable/disable/uninstall` 會直接寫入該引入檔案，並保持 `openclaw.json` 不變。根層級引入、引入陣列，以及帶有同層級覆寫的引入會失敗關閉，而不是扁平化。請參閱 [Config includes](/zh-Hant/gateway/configuration) 以了解支援的結構。

    如果在安裝期間設定無效，`plugins install` 通常會失敗關閉並告訴您先執行 `openclaw doctor --fix`。在 Gateway 啟動和熱重新載入期間，無效的 plugin 設定會像任何其他無效設定一樣失敗關閉；`openclaw doctor --fix` 可以隔離無效的 plugin 項目。唯一記載的安裝時期例外，是針對明確選擇加入 `openclaw.install.allowInvalidConfigRecovery` 的 plugin 的一個狹窄的 bundled-plugin 復原路徑。

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` 會重複使用現有的安裝目標，並就地覆寫已安裝的外掛程式或 hook pack。當您刻意從新的本機路徑、封存檔、ClawHub 套件或 npm 成品重新安裝相同的 id 時，請使用此選項。若要對已追蹤的 npm 外掛程式進行例行升級，建議使用 `openclaw plugins update <id-or-npm-spec>`。

    如果您針對已安裝的外掛程式 id 執行 `plugins install`，OpenClaw 會停止並指引您使用 `plugins update <id-or-npm-spec>` 進行一般升級，或者當您確實想從不同的來源覆寫目前的安裝時，則指引您使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` 僅適用於 npm 安裝。它不支援 `git:` 安裝；當您需要指定來源時，請使用明確的 git ref，例如 `git:github.com/acme/plugin@v1.2.3`。它也不支援 `--marketplace`，因為市集安裝會保留市集來源的中繼資料，而非 npm 規格。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是內建危險程式碼掃描器誤報的緊急選項。即使內建掃描器回報 `critical` 發現，它仍允許安裝繼續，但它**不會**繞過外掛程式 `before_install` 掛鉤原則封鎖，也**不會**繞過掃描失敗。

    安裝掃描會忽略常見的測試檔案和目錄，例如 `tests/`、`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免封鎖封裝的測試模擬物件；宣告的外掛程式執行時間進入點仍會被掃描，即使它們使用其中一個名稱。

    此 CLI 標誌適用於外掛程式安裝/更新流程。Gateway 支援的技能相依性安裝使用相符的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則是單獨的 ClawHub 技能下載/安裝流程。

    如果您在 ClawHub 上發佈的外掛程式被註冊表掃描隱藏或封鎖，請使用 [ClawHub publishing](/zh-Hant/clawhub/publishing) 中的發行者步驟。`--dangerously-force-unsafe-install` 只會影響您自己機器上的安裝；它不會要求 ClawHub 重新掃描外掛程式或將被封鎖的版本設為公開。

  </Accordion>
  <Accordion title="Hook packs and npm specs">
    `plugins install` 也是用於公開 `openclaw.hooks` 於 `package.json` 中的 hook 套件的安裝介面。請使用 `openclaw hooks` 來過濾 hook 的可見性並啟用特定 hook，而非用於套件安裝。

    Npm 規格僅支援 **registry-only**（套件名稱 + 選用的 **確切版本** 或 **dist-tag**）。Git/URL/file 規格與 semver 範圍將被拒絕。為了安全起見，相依性安裝會以 `--ignore-scripts` 在專案本機執行，即使您的 shell 設定了全域 npm 安裝設定。受管理的外掛 npm 根目錄會繼承 OpenClaw 的套件層級 npm `overrides`，因此主機安全性鎖定也會套用到被提升的外掛相依性。

    當您想要明確指定 npm 解析方式時，請使用 `npm:<package>`。純套件規格也會在啟動切換期間直接從 npm 安裝。

    純規格與 `@latest` 會保持在穩定版本軌道上。諸如 `2026.5.3-1` 的 OpenClaw 日期戳記修正版本對此檢查而言屬於穩定版本。如果 npm 將上述任一項解析為先行版本，OpenClaw 會停止並要求您明確選擇加入，使用諸如 `@beta`/`@rc` 的先行版本標籤，或諸如 `@1.2.3-beta.4` 的確切先行版本。

    如果純安裝規格符合官方外掛 ID（例如 `diffs`），OpenClaw 會直接安裝目錄項目。若要安裝同名的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git repositories">
    使用 `git:<repo>` 直接從 git 儲存庫安裝。支援的形式包括 `git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://` 和 `git@host:owner/repo.git` 克隆 URL。新增 `@<ref>` 或 `#<ref>` 以在安裝前簽出分支、標籤或提交。

    Git 安裝會克隆到一個暫存目錄，在存在時簽出請求的參照，然後使用正常的插件目錄安裝程式。這意味著清單驗證、危險代碼掃描、套件管理器安裝工作以及安裝記錄的行為與 npm 安裝相同。記錄的 git 安裝包含來源 URL/參照加上解析的提交，以便 `openclaw plugins update` 可以稍後重新解析來源。

    從 git 安裝後，使用 `openclaw plugins inspect <id> --runtime --json` 驗證運行時註冊，例如 gateway 方法和 CLI 指令。如果插件使用 `api.registerCli` 註冊了 CLI 根目錄，請透過 OpenClaw 根 CLI 直接執行該指令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="Archives">
    支援的封存檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件封存檔必須在解壓縮的插件根目錄中包含有效的 `openclaw.plugin.json`；僅包含 `package.json` 的封存檔會在 OpenClaw 寫入安裝記錄之前被拒絕。

    當檔案是 npm 打包的 tarball 並且您想要
    測試登錄表安裝所使用的相同受管理 npm-root 安裝路徑時（包括 `package-lock.json` 驗證、提升的相依性掃描和
    npm 安裝記錄），請使用 `npm-pack:<path.tgz>`。純封存路徑仍然會作為本機封存
    安裝在擴充功能根目錄下。

    也支援 Claude 市集安裝。

  </Accordion>
</AccordionGroup>

ClawHub 安裝使用明確的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

裸 npm 安全插件規格在啟動切換期間預設從 npm 安裝：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 使僅限 npm 的解析變得明確：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 在安裝前會檢查公佈的插件 API / 最低閘道相容性。當選定的 ClawHub 版本發佈 ClawPack 成品時，OpenClaw 會下載版本化的 npm-pack `.tgz`，驗證 ClawHub 摘要標頭和成品摘要，然後透過正常歸檔路徑進行安裝。沒有 ClawPack 元資料的舊版 ClawHub 版本仍透過舊版套件歸檔驗證路徑安裝。記錄的安裝會保留其 ClawHub 來源元資料、成品種類、npm 完整性、npm shasum、tarball 名稱和 ClawPack 摘要事實以供後續更新。
未指定版本的 ClawHub 安裝會保留未指定版本的記錄規格，以便 `openclaw plugins update` 能追蹤較新的 ClawHub 版本；明確的版本或標籤選擇器（例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）會保持固定在該選擇器。

#### Marketplace 簡寫

當 marketplace 名稱存在於 Claude 的本機登錄快取 `~/.claude/plugins/known_marketplaces.json` 時，使用 `plugin@marketplace` 簡寫：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

當您想要明確傳遞 marketplace 來源時，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Marketplace 來源">
    - 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名稱
    - 本機 marketplace 根目錄或 `marketplace.json` 路徑
    - GitHub 存儲庫簡寫，例如 `owner/repo`
    - GitHub 存儲庫 URL，例如 `https://github.com/owner/repo`
    - git URL

  </Tab>
  <Tab title="遠端 marketplace 規則">
    對於從 GitHub 或 git 載入的遠端 marketplace，插件條目必須保留在複製的 marketplace 存儲庫內。OpenClaw 接受來自該存儲庫的相對路徑來源，並拒絕來自遠端清單的 HTTP(S)、絕對路徑、git、 GitHub 和其他非路徑插件來源。
  </Tab>
</Tabs>

對於本機路徑和歸檔，OpenClaw 會自動偵測：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設的 Claude 組件佈局)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

<Note>相容套件會安裝到一般的插件根目錄中，並參與相同的 list/info/enable/disable 流程。目前支援 bundle 技能、Claude 指令技能 (command-skills)、Claude `settings.json` 預設值、Claude `.lsp.json` / manifest 宣告的 `lspServers` 預設值、Cursor 指令技能，以及相容的 Codex hook 目錄；其他偵測到的 bundle 功能會顯示在診斷/資訊中，但尚未連接至執行階段。</Note>

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
`plugins list` 首先讀取持久化的本地外掛程式登錄檔，當登錄檔遺失或無效時，則退而求其次使用僅清單衍生的後備方案。這對於檢查外掛程式是否已安裝、已啟用，以及對冷啟動規劃是否可見非常有用，但它並非對正在執行的 Gateway 程序的即時執行階段探測。在變更外掛程式碼、啟用狀態、 Hook 原則或 `plugins.load.paths` 後，請先重新啟動服務該頻道的 Gateway，再預期新的 `register(api)` 程式碼或 Hook 會執行。對於遠端/容器部署，請確認您正在重新啟動實際的 `openclaw gateway run` 子行程，而不僅僅是包裝行程。

`plugins list --json` 包含來自 `package.json`
`dependencies` 和 `optionalDependencies` 的每個外掛程式的 `dependencyStatus`。OpenClaw 會檢查這些套件名稱是否存在於外掛程式的正常 Node `node_modules` 查閱路徑中；它不會匯入外掛程式執行階段程式碼、執行套件管理員，或修復遺失的相依項目。

</Note>

`plugins search` 是遠端 ClawHub 目錄查閱。它不會檢查本機狀態、變更組態、安裝套件或載入外掛程式執行階段程式碼。搜尋結果包括 ClawHub 套件名稱、系列 (family)、頻道、版本、摘要，以及安裝提示，例如 `openclaw plugins install clawhub:<package>`。

若要在打包的 Docker 映像檔內進行套件外掛程式開發，請將外掛程式來源目錄繫結掛載到對應的打包來源路徑上，例如 `/app/extensions/synology-chat`。OpenClaw 會在 `/app/dist/extensions/synology-chat` 之前發現該掛載的來源疊加層；純粹複製的來源目錄將保持不動作用，因此正常的打包安裝仍會使用編譯後的 dist。

若要進行執行階段 Hook 除錯：

- `openclaw plugins inspect <id> --runtime --json` 顯示來自模組載入檢查行程的已註冊 Hook 和診斷資訊。執行階段檢查從不安裝相依項目；請使用 `openclaw doctor --fix` 來清除舊版相依項目狀態，或復原組態中參照但遺失的可下載外掛程式。
- `openclaw gateway status --deep --require-rpc` 確認可連線的 Gateway URL/設定檔、服務/程序提示、組態路徑和 RPC 健全狀況。
- 未打包的對話掛鉤（`llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 以避免複製本機目錄（會新增至 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不支援與 `--link` 搭配使用，因為連結安裝會重複使用來源路徑，而不是複製到受管理的安裝目標。

在 npm 安裝上使用 `--pin`，將解析的確切規格（`name@version`）儲存在受管理的外掛程式索引中，同時保持預設行為未固定。

</Note>

### 外掛程式索引

外掛程式安裝中繼資料是由機器管理的狀態，而非使用者設定。安裝和更新會將其寫入到作用中的 OpenClaw 狀態目錄下的 `plugins/installs.json`。其頂層的 `installRecords` 對應是安裝中繼資料的永久來源，包括損壞或遺失的外掛程式清單記錄。`plugins` 陣列是衍生的清單冷登錄快取。該檔案包含請勿編輯的警告，並由 `openclaw plugins update`、解除安裝、診斷和冷外掛程式登錄使用。

當 OpenClaw 在設定中看到 shipped 的舊版 `plugins.installs` 記錄時，執行階段讀取會將其視為相容性輸入，而不會重寫 `openclaw.json`。明確的外掛程式寫入和 `openclaw doctor --fix` 會將這些記錄移至外掛程式索引，並在允許寫入設定時移除設定金鑰；如果任一寫入失敗，則會保留設定記錄，以免安裝中繼資料遺失。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`（持久化的插件索引）、插件允許/拒絕列表條目以及相關的 `plugins.load.paths` 條目（如適用）中移除插件記錄。除非設定了 `--keep-files`，否則當受控安裝目錄位於 OpenClaw 的插件擴展根目錄下時，解除安裝也會一併移除該受控安裝目錄。對於活動記憶體插件，記憶體插槽會重置為 `memory-core`。

<Note>`--keep-config` 作為 `--keep-files` 的已棄用別名受到支援。</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新適用於受控插件索引中追蹤的插件安裝，以及 `hooks.internal.installs` 中追蹤的 hook-pack 安裝。

<AccordionGroup>
  <Accordion title="解析插件 ID 與 npm 規範">
    當您傳入插件 ID 時，OpenClaw 會重用該插件的已記錄安裝規範。這意味著先前儲存的 dist-tags（例如 `@beta`）和確切鎖定的版本會在之後的 `update <id>` 執行中繼續被使用。

    對於 npm 安裝，您也可以傳入帶有 dist-tag 或確切版本的明確 npm 套件規範。OpenClaw 會將該套件名稱解析回追蹤的插件記錄，更新該已安裝的插件，並記錄新的 npm 規範以供日後基於 ID 的更新使用。

    若在未指定版本或標籤的情況下傳入 npm 套件名稱，也會解析回追蹤的插件記錄。當某個插件被鎖定為確切版本，而您希望將其恢復為註冊表的預設發佈線時，請使用此方法。

  </Accordion>
  <Accordion title="Beta 頻道更新">
    `openclaw plugins update` 會重用追蹤的插件規範，除非您傳入新的規範。`openclaw update` 還能識別目前啟用的 OpenClaw 更新頻道：在 beta 頻道上，預設線 npm 和 ClawHub 插件記錄會優先嘗試 `@beta`。如果不存在 beta 版插件發佈，則會退回到記錄的 default/latest 規範；若 beta 套件存在但安裝驗證失敗，npm 插件也會退回。該退回行為會回報為警告，且不會導致核心更新失敗。確切版本和明確標籤會保持鎖定至該選擇器。

  </Accordion>
  <Accordion title="版本檢查與完整性偏移">
    在進行實時 npm 更新之前，OpenClaw 會檢查已安裝的套件版本與 npm 註冊表元數據進行比對。如果已安裝的版本和記錄的工件識別碼已經符合解析出的目標，則會跳過更新，而不會下載、重新安裝或重寫 `openclaw.json`。

    當儲存的完整性雜湊存在且獲取的工件雜湊發生變化時，OpenClow 會將其視為 npm 工件偏移。互動式 `openclaw plugins update` 指令會列印預期和實際雜湊值，並在繼續之前要求確認。非互動式更新輔助程式會以失敗閉合處理，除非呼叫者提供明確的繼續策略。

  </Accordion>
  <Accordion title="更新時的 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 也可在 `plugins update` 上使用，作為緊急覆寫選項，用於解決外掛程式更新期間內建危險程式碼掃描誤報的問題。它仍然不會繞過外掛程式 `before_install` 策略封鎖或掃描失敗封鎖，並且僅適用於外掛程式更新，不適用於 hook-pack 更新。
  </Accordion>
</AccordionGroup>

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

檢查 會顯示識別碼、載入狀態、來源、清單功能、策略標誌、診斷、安裝元數據、捆綁包功能以及任何偵測到的 MCP 或 LSP 伺服器支援，且預設不匯入外掛程式執行時。新增 `--runtime` 以載入外掛程式模組並包含已註冊的 hooks、工具、指令、服務、gateway 方法和 HTTP 路由。執行時檢查會直接回報遺失的外掛程式相依性；安裝和修復作業則保留在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中。

外掛程式擁有的 CLI 指令通常安裝為根 `openclaw` 指令群組，但外掛程式也可能在核心父項（例如 `openclaw nodes`）下註冊巢狀指令。在 `inspect --runtime` 顯示 `cliCommands` 下的指令後，請在列出的路徑執行它；例如，註冊了 `demo-git` 的外掛程式可以使用 `openclaw demo-git ping` 進行驗證。

每個外掛程式都會根據其在執行時實際註冊的內容進行分類：

- **plain-capability** — 一種功能類型（例如僅提供者外掛程式）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 影像）
- **hook-only** — 只有 hook，沒有功能或 surface
- **non-capability** — 工具/指令/服務但沒有功能

請參閱 [Plugin shapes](/zh-Hant/plugins/architecture#plugin-shapes) 以進一步瞭解功能模型。

<Note>`--json` 標誌會輸出適合於腳本編寫和稽核的機器可讀報告。`inspect --all` 會呈現一個全範圍的表格，其中包含形狀、功能類型、相容性注意事項、綑綁功能以及 hook 摘要欄。`info` 是 `inspect` 的別名。</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 會回報外掛程式載入錯誤、資訊清單/探索診斷、相容性注意事項，以及過期的外掛程式設定參照（例如遺失的外掛程式插槽）。當安裝樹和外掛程式設定乾淨時，它會列印 `No plugin issues detected.`。如果過期的設定仍然存在但安裝樹在其他方面是健康的，摘要會說明這一點，而不是暗示外掛程式完全健康。

如果設定的外掛程式存在於磁碟上，但被載入器的路徑安全檢查封鎖，設定驗證會保留外掛程式條目並將其回報為 `present but blocked`。請修正前面的外掛程式封鎖診斷（例如路徑擁有權或全世界可寫入權限），而不是移除 `plugins.entries.<id>` 或 `plugins.allow` 設定。

對於模組形狀失敗（例如缺少 `register`/`activate` 匯出），請使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新執行，以便在診斷輸出中包含緊湊的匯出形狀摘要。

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本機外掛程式註冊表是 OpenClaw 針對已安裝外掛程式身分識別、啟用狀態、來源中繼資料和貢獻擁有權的持久化冷讀取模型。正常啟動、提供者擁有者查詢、通道設定分類和外掛程式清查皆可在不匯入外掛程式執行階段模組的情況下讀取它。

使用 `plugins registry` 來檢查持久化的註冊表是否存在、為最新或是過時。使用 `--refresh` 從持久化的外掛程式索引、設定原則以及 manifest/package 中繼資料重建它。這是一條修復路徑，而非執行階段啟用路徑。

`openclaw doctor --fix` 也會修復註冊表相關的受控 npm 偏移：如果在受控外掛程式 npm 根目錄下的孤立或已復原的 `@openclaw/*` 套件遮蔽了打包的外掛程式，doctor 會移除該過時套件並重建註冊表，使啟動時能對打包的 manifest 進行驗證。Doctor 也會重新將主機 `openclaw` 套件連結至宣告 `peerDependencies.openclaw` 的受控 npm 外掛程式中，以便像 `openclaw/plugin-sdk/*` 這類套件本機執行階段匯入在更新或 npm 修復後能正確解析。

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一個已淘汰的緊急相容性開關，用於註冊表讀取失敗。建議優先使用 `plugins registry --refresh` 或 `openclaw doctor --fix`；此環境變數後備方案僅供遷移推出時的緊急啟動恢復使用。</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace 清單接受本機 marketplace 路徑、`marketplace.json` 路徑、GitHub 簡寫（如 `owner/repo`）、GitHub 存放庫 URL 或 git URL。`--json` 會列印已解析的來源標籤以及已解析的 marketplace manifest 和外掛程式項目。

## 相關

- [Building plugins](/zh-Hant/plugins/building-plugins)
- [CLI reference](/zh-Hant/cli)
- [ClawHub](/zh-Hant/clawhub)
