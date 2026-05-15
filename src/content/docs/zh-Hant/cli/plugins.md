---
summary: "CLI 參考資料，用於 `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "外掛程式"
sidebarTitle: "外掛程式"
---

管理 Gateway 外掛程式、hook 套件及相容的套件組合。

<CardGroup cols={2}>
  <Card title="外掛程式系統" href="/zh-Hant/tools/plugin">
    安裝、啟用以及疑難排解外掛程式的終端使用者指南。
  </Card>
  <Card title="管理外掛程式" href="/zh-Hant/plugins/manage-plugins">
    安裝、列出、更新、解除安裝和發布的快速範例。
  </Card>
  <Card title="外掛程式套件組合" href="/zh-Hant/plugins/bundles">
    套件組合相容性模型。
  </Card>
  <Card title="外掛程式清單" href="/zh-Hant/plugins/manifest">
    清單欄位與設定架構。
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
```

若要調查緩慢的安裝、檢查、解除安裝或登錄重新整理，請使用
`OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 執行指令。追蹤會將階段計時寫入
至 stderr 並保持 JSON 輸出可解析。請參閱 [除錯](/zh-Hant/help/debugging#plugin-lifecycle-trace)。

<Note>在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，外掛程式生命週期變異器已停用。請使用 Nix 來源進行此安裝，而不是使用 `plugins install`、`plugins update`、`plugins uninstall`、`plugins enable` 或 `plugins disable`；若為 nix-openclaw，請使用以代理程式為主的 [快速入門](https://github.com/openclaw/nix-openclaw#quick-start)。</Note>

<Note>
隨附的外掛程式隨 OpenClaw 一起出貨。部分外掛程式預設為啟用 (例如隨附的模型提供者、隨附的語音提供者，以及隨附的瀏覽器外掛程式)；其他則需要 `plugins enable`。

原生 OpenClaw 外掛程式必須隨附內嵌 JSON 架構的 `openclaw.plugin.json` (`configSchema`，即使為空亦然)。相容的套件組合則改用自己的套件組合資訊清單。

`plugins list` 會顯示 `Format: openclaw` 或 `Format: bundle`。詳細清單/資訊輸出也會顯示套件組合子類型 (`codex`、`claude` 或 `cursor`) 以及偵測到的套件組合功能。

</Note>

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

正在測試安裝時間設定的維護者可以使用受保護的環境變數來覆寫自動外掛程式安裝來源。請參閱
[外掛程式安裝覆寫](/zh-Hant/plugins/install-overrides)。

<Warning>
在啟動切換期間，裸套件名稱預設會從 npm 安裝。針對 ClawHub，請使用 `clawhub:<package>`。請將外掛程式安裝視為執行程式碼。優先使用鎖定版本。
</Warning>

`plugins search` 會查詢 ClawHub 以尋找可安裝的外掛程式套件，並列印
準備安裝的套件名稱。它會搜尋 code-plugin 和 bundle-plugin 套件，
而不搜尋技能。請使用 `openclaw skills search` 查詢 ClawHub 技能。

<Note>
  ClawHub 是大多數外掛程式的主要發行和探索介面。Npm 仍然是一個受支援的備援方案和直接安裝途徑。OpenClaw 擁有的 `@openclaw/*` 外掛程式套件會再次發佈到 npm；請在 [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 或 [外掛程式清單](/zh-Hant/plugins/plugin-inventory) 上查看目前的清單。 穩定安裝使用 `latest`。 Beta 頻道安裝和更新優先使用 npm `beta` dist-tag（當該標籤可用時）， 然後再回退到
  `latest`。
</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    如果您的 `plugins` 部分由單一檔案 `$include` 支援，`plugins install/update/enable/disable/uninstall` 將直接寫入該包含的檔案，並保持 `openclaw.json` 不變。根層級包含、包含陣列以及具有同層級覆寫的包含將會「失敗關閉（fail closed）」而不是扁平化。請參閱 [Config includes](/zh-Hant/gateway/configuration) 以了解支援的格式。

    如果安裝期間設定無效，`plugins install` 通常會「失敗關閉」並告訴您先執行 `openclaw doctor --fix`。在 Gateway 啟動和熱重載期間，無效的外掛設定會像其他無效設定一樣「失敗關閉」；`openclaw doctor --fix` 可以隔離無效的外掛條目。唯一記錄的安裝時期例外情況，是一個針對明確選擇加入 `openclaw.install.allowInvalidConfigRecovery` 之外掛的狹隘打包外掛復原路徑。

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` 會重複使用現有的安裝目標，並就地覆寫已安裝的外掛或 hook pack。當您打算從新的本機路徑、壓縮檔、ClawHub 套件或 npm 成件重新安裝相同的 id 時，請使用此選項。對於已追蹤的 npm 外掛的常規升級，建議優先使用 `openclaw plugins update <id-or-npm-spec>`。

    如果您對已安裝的外掛 id 執行 `plugins install`，OpenClaw 會停止並指引您使用 `plugins update <id-or-npm-spec>` 進行一般升級，或者當您確實想從不同的來源覆寫當前安裝時，則使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` 僅適用於 npm 安裝。它不支援 `git:` 安裝；當您需要固定來源時，請使用明確的 git ref（例如 `git:github.com/acme/plugin@v1.2.3`）。它不支援 `--marketplace`，因為市集安裝會保存市集來源詮釋資料，而不是 npm 規格。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是內建危險程式碼掃描器誤報的緊急應變選項。它允許安裝繼續進行，即使內建掃描器回報 `critical` 發現，但它**不會**繞過外掛 `before_install` hook 政策封鎖，也**不會**繞過掃描失敗。

    此 CLI 標誌適用於外掛安裝/更新流程。Gateway 支援的技能相依性安裝使用相符的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則維持為獨立的 ClawHub 技能下載/安裝流程。

    如果您在 ClawHub 上發布的外掛被登錄掃描封鎖，請使用 [ClawHub](/zh-Hant/clawhub/security) 中的發布者步驟。

  </Accordion>
  <Accordion title="Hook packs and npm specs">
    `plugins install` 也是在 `package.json` 中公開 `openclaw.hooks` 的 Hook 套件的安裝介面。請使用 `openclaw hooks` 來篩選 Hook 可見性及個別啟用 Hook，而不是用於安裝套件。

    npm 規格**僅限註冊表**（套件名稱 + 可選的**確切版本**或 **dist-tag**）。Git/URL/檔案規格和 semver 範圍都會被拒絕。為了安全起見，相依性安裝會使用 `--ignore-scripts` 在專案本機執行，即使您的 shell 設定了全域 npm 安裝選項。受管理的外掛 npm 根目錄會繼承 OpenClaw 的套件層級 npm `overrides`，因此主機安全性鎖定也會套用至被提升的外掛相依性。

    當您想要明確指定 npm 解析方式時，請使用 `npm:<package>`。在啟動切換期間，純套件規格也會直接從 npm 安裝。

    純規格和 `@latest` 會保持在穩定追蹤。OpenClaw 的日期標記更正版本（例如 `2026.5.3-1`）屬於此檢查的穩定版本。如果 npm 將這兩者解析為發行前版本，OpenClaw 會停止並要求您明確選擇加入，使用諸如 `@beta`/`@rc` 的發行前標籤或諸如 `@1.2.3-beta.4` 的確切發行前版本。

    如果純安裝規格符合官方外掛 ID（例如 `diffs`），OpenClaw 會直接安裝目錄項目。若要安裝同名的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git 儲存庫">
    使用 `git:<repo>` 直接從 git 儲存庫安裝。支援的形式包括 `git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://` 以及 `git@host:owner/repo.git` clone URL。加入 `@<ref>` 或 `#<ref>` 以在安裝前簽出分支、標籤或提交。

    Git 安裝會將儲存庫複製到暫存目錄，當存在請求的 ref 時進行簽出，然後使用一般的外掛程式目錄安裝程式。這代表資訊清單驗證、危險代碼掃描、套件管理員安裝作業以及安裝記錄的行為都如同 npm 安裝。記錄的 git 安裝包含來源 URL/ref 與解析出的提交，因此 `openclaw plugins update` 可以在稍後重新解析來源。

    從 git 安裝後，使用 `openclaw plugins inspect <id> --runtime --json` 來驗證執行時期註冊項目，例如 Gateway 方法和 CLI 指令。如果外掛程式使用 `api.registerCli` 註冊了 CLI 根目錄，請直接透過 OpenClaw 根 CLI 執行該指令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="封存檔">
    支援的封存檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 外掛程式封存檔必須在解壓縮後的外掛程式根目錄中包含有效的 `openclaw.plugin.json`；僅包含 `package.json` 的封存檔會在 OpenClaw 寫入安裝記錄之前被拒絕。

    當檔案是 npm-pack tarball 且您想要測試註冊表安裝所使用的相同受控 npm-root 安裝路徑時（包括 `package-lock.json` 驗證、提升依賴項掃描和 npm 安裝記錄），請使用 `npm-pack:<path.tgz>`。純封存檔路徑仍會作為本機封存檔安裝在外掛程式擴充功能根目錄下。

    也支援從 Claude 市集安裝。

  </Accordion>
</AccordionGroup>

ClawHub 安裝使用顯式的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

裸露的 npm 安全外掛規格預設在啟動切換期間從 npm 安裝：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 以明確指定僅使用 npm 解析：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 會在安裝前檢查公告的外掛 API / 最低閘道相容性。當選定的 ClawHub 版本發布 ClawPack 檔案時，OpenClaw 會下載版本化的 npm 套件 `.tgz`，驗證 ClawHub 摘要標頭和檔案摘要，然後透過正常封存路徑進行安裝。沒有 ClawPack 元數據的較舊 ClawHub 版本仍會透過傳統套件封存驗證路徑進行安裝。已記錄的安裝會保留其 ClawHub 來源元數據、檔案種類、npm 完整性、npm shasum、tarball 名稱和 ClawPack 摘要事實，以便後續更新。
未指定版本的 ClawHub 安裝會保留未指定版本的已記錄規格，以便 `openclaw plugins update` 能追蹤較新的 ClawHub 發布版本；顯式的版本或標籤選擇器（例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）則會保持固定在該選擇器。

#### 市集簡寫

當市集名稱存在於 Claude 的本機登錄快取 `~/.claude/plugins/known_marketplaces.json` 時，請使用 `plugin@marketplace` 簡寫：

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
  <Tab title="遠端市集規則">
    對於從 GitHub 或 git 載入的遠端市集，外掛項目必須保留在複製的市集存儲庫內。OpenClaw 接受來自該存儲庫的相對路徑來源，並會拒絕來自遠端清單的 HTTP(S)、絕對路徑、git、 GitHub 和其他非路徑外掛來源。
  </Tab>
</Tabs>

對於本機路徑和封存，OpenClaw 會自動偵測：

- 原生 OpenClaw 外掛 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設的 Claude 元件佈局)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

<Note>相容套件會安裝至一般的外掛根目錄，並參與相同的 list/info/enable/disable 流程。目前支援套件技能、Claude command-skills、Claude `settings.json` 預設值、Claude `.lsp.json` / manifest-declared `lspServers` 預設值、Cursor command-skills，以及相容的 Codex hook 目錄；其他偵測到的套件功能會顯示在 diagnostics/info 中，但尚未連接至執行階段執行。</Note>

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
  僅顯示已啟用的外掛。
</ParamField>
<ParamField path="--verbose" type="boolean">
  從表格檢視切換至每個外掛的詳細行，其中包含來源/來處/版本/啟用元資料。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀的庫存，加上登錄診斷和套件相依性安裝狀態。
</ParamField>

<Note>
`plugins list` 會先讀取持久化的本機外掛程式登錄檔，當登錄檔遺失或無效時，則使用僅清單的衍生後援。這適用於檢查外掛程式是否已安裝、已啟用，並可見於冷啟動規劃，但它並非對正在執行的 Gateway 程序即時運行時間的探測。在變更外掛程式程式碼、啟用狀態、掛鉤原則或 `plugins.load.paths` 後，若預期新的 `register(api)` 程式碼或掛鉤能執行，請先重新啟動提供該通道的 Gateway。對於遠端/容器部署，請確認您正在重新啟動實際的 `openclaw gateway run` 子程序，而不僅是包裝程序。

`plugins list --json` 包含每個外掛程式來自 `package.json`
`dependencies` 和 `optionalDependencies` 的 `dependencyStatus`。OpenClaw 會檢查這些套件名稱是否存在於外掛程式的正常 Node `node_modules` 查閱路徑中；它不會匯入外掛程式運行時間程式碼、執行套件管理員或修復遺失的相依性。

</Note>

`plugins search` 是遠端 ClawHub 目錄查閱。它不會檢查本機狀態、修改設定、安裝套件或載入外掛程式運行時間程式碼。搜尋結果包括 ClawHub 套件名稱、系列、通道、版本、摘要，以及安裝提示，例如 `openclaw plugins install clawhub:<package>`。

若要在打包的 Docker 映像檔內進行套件外掛程式開發，請將外掛程式來源目錄繫結掛載到對應的打包來源路徑上，例如 `/app/extensions/synology-chat`。OpenClaw 會在 `/app/dist/extensions/synology-chat` 之前探索該掛載的來源疊加層；單純複製的來源目錄將保持不活動，因此正常的打包安裝仍會使用已編譯的 dist。

若要進行運行時間掛鉤偵錯：

- `openclaw plugins inspect <id> --runtime --json` 顯示來自模組載入檢查過程的已註冊掛鉤和診斷資訊。運行時間檢查從不安裝相依性；請使用 `openclaw doctor --fix` 來清理舊版相依性狀態，或復原設定中參照的遺失可下載外掛程式。
- `openclaw gateway status --deep --require-rpc` 確認可連線的 Gateway、服務/程序提示、設定路徑和 RPC 健康狀態。
- 未捆綁的交談掛鉤（`llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 以避免複製本機目錄（會新增至 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不支援與 `--link` 搭配使用，因為連結安裝會重複使用來源路徑，而不是複製到受管理的安裝目標。

在 npm 安裝上使用 `--pin`，以將解析的確切規格（`name@version`）儲存在受管理的插件索引中，同時保持預設行為未固定。

</Note>

### 插件索引

插件安裝中繼資料是機器管理的狀態，而非使用者設定。安裝和更新會將其寫入至使用中 OpenClaw 狀態目錄下的 `plugins/installs.json`。其頂層 `installRecords` 對映是安裝中繼資料的持久來源，包括損壞或遺失插件清單的記錄。`plugins` 陣列是衍生自清單的冷註冊表快取。該檔案包含請勿編輯的警告，並由 `openclaw plugins update`、解除安裝、診斷和冷插件註冊表使用。

當 OpenClaw 在設定中看到隨附的舊版 `plugins.installs` 記錄時，執行時期讀取會將其視為相容性輸入，而不重寫 `openclaw.json`。明確的插件寫入和 `openclaw doctor --fix` 會將這些記錄移至插件索引，並在允許設定寫入時移除設定金鑰；如果任一寫入失敗，則會保留設定記錄，以免遺失安裝中繼資料。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`（持久化的插件索引）、插件允許/拒絕清單條目以及適用時連結的 `plugins.load.paths` 條目中移除插件記錄。除非設定了 `--keep-files`，否則當受管理的安裝目錄位於 OpenClaw 的插件延伸模組根目錄內時，解除安裝也會將該目錄一併移除。對於使用中的記憶體插件，記憶體槽位會重設為 `memory-core`。

<Note>`--keep-config` 作為 `--keep-files` 的已棄用別名受到支援。</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新套用於受管理插件索引中已追蹤的插件安裝，以及 `hooks.internal.installs` 中已追蹤的 hook-pack 安裝。

<AccordionGroup>
  <Accordion title="解析 plugin id 與 npm 規格">
    當您傳遞一個 plugin id 時，OpenClaw 會重用該插件的已記錄安裝規格。這表示先前儲存的 dist-tags（例如 `@beta`）和精確釘選的版本會在之後的 `update <id>` 執行中繼續被使用。

    對於 npm 安裝，您也可以傳遞一個帶有 dist-tag 或精確版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回已追蹤的插件記錄，更新該已安裝的插件，並記錄新的 npm 規格以供日後基於 id 的更新使用。

    傳遞不帶有版本或標籤的 npm 套件名稱也會解析回已追蹤的插件記錄。當某個插件被釘選到特定版本，而您想將其還原至註冊表的預設發佈行時，請使用此方式。

  </Accordion>
  <Accordion title="Beta 頻道更新">
    `openclaw plugins update` 會重用已追蹤的插件規格，除非您傳遞了一個新的規格。`openclaw update` 另外也知道目前的 OpenClaw 更新頻道：在 beta 頻道上，預設行的 npm 和 ClawHub 插件記錄會先嘗試 `@beta`，如果不存在插件 beta 版本，則回退到已記錄的 default/latest 規格。精確版本和明確標籤會保持釘選到該選擇器。

  </Accordion>
  <Accordion title="版本檢查與完整性偏移">
    在執行即時 npm 更新之前，OpenClaw 會將已安裝的套件版本與 npm 登錄檔的中繼資料進行比對。如果已安裝的版本和記錄的產品識別碼已經符合解析出的目標，則會跳過更新，而不會下載、重新安裝或重寫 `openclaw.json`。

    當存在儲存的完整性雜湊值且擷取的產品雜湊值發生變更時，OpenClaw 會將其視為 npm 產品偏移。互動式 `openclaw plugins update` 指令會列印預期與實際的雜湊值，並在繼續之前要求確認。除非呼叫者提供明確的接續原則，否則非互動式更新輔助程式會以封閉式失敗處理。

  </Accordion>
  <Accordion title="更新時使用 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 也可用於 `plugins update`，作為在插件更新期間針對內建危險代碼掃描誤報的緊急覆寫機制。它仍然不會繞過插件 `before_install` 政策封鎖或掃描失敗封鎖，且僅適用於插件更新，不適用於掛鉤包更新。
  </Accordion>
</AccordionGroup>

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect 會顯示識別碼、載入狀態、來源、清單功能、政策標誌、診斷、安裝中繼資料、套件組合功能，以及任何偵測到的 MCP 或 LSP 伺服器支援，且預設不匯入插件執行時。新增 `--runtime` 以載入插件模組並包含已註冊的掛鉤、工具、指令、服務、閘道方法和 HTTP 路由。執行時檢查會直接回報遺失的插件相依性；安裝和修復作業會保留在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中。

外掛程式擁有的 CLI 指令通常會安裝為根 `openclaw` 指令群組，但外掛程式也可以在核心父級下註冊巢狀指令，例如 `openclaw nodes`。當 `inspect --runtime` 在 `cliCommands` 下顯示指令後，請在列出的路徑執行它；例如，註冊了 `demo-git` 的外掛程式可以使用 `openclaw demo-git ping` 進行驗證。

每個外掛程式都會根據它在執行時期實際註冊的內容進行分類：

- **plain-capability** — 單一功能類型（例如僅提供者的外掛程式）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 影像）
- **hook-only** — 僅包含鉤子，沒有功能或介面
- **non-capability** — 包含工具/指令/服務但沒有功能

關於功能模型的更多資訊，請參閱 [Plugin shapes](/zh-Hant/plugins/architecture#plugin-shapes)。

<Note>`--json` 標誌會輸出適合於腳本和稽核的機器可讀報告。`inspect --all` 會呈現一個範圍涵蓋整個機群的表格，其中包含形狀、功能類型、相容性注意事項、綑綁功能以及鉤子摘要欄位。`info` 是 `inspect` 的別名。</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 會回報外掛程式載入錯誤、清單/探索診斷以及相容性注意事項。當一切正常時，它會列印 `No plugin issues detected.`

如果設定的外掛程式存在於磁碟上，但被載入器的路徑安全檢查所封鎖，設定驗證會保留該外掛程式條目並將其回報為 `present but blocked`。請修正先前的封鎖外掛程式診斷（例如路徑所有權或任何人可寫入的權限），而不是移除 `plugins.entries.<id>` 或 `plugins.allow` 設定。

對於模組形狀失敗，例如缺少 `register`/`activate` 匯出，請使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新執行，以便在診斷輸出中包含簡潔的匯出形狀摘要。

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本機外掛程式登錄檔是 OpenClaw 用於已安裝外掛程式身分識別、啟用狀態、來源中繼資料和貢獻所有權的持久化冷讀取模型。正常啟動、提供者擁有者查詢、通道設定分類和外掛程式清單可以在不匯入外掛程式執行時間模組的情況下讀取它。

使用 `plugins registry` 檢查持久化登錄檔是否存在、是最新還是過期。使用 `--refresh` 從持久化外掛程式索引、設定原則以及清單/套件中繼資料重建它。這是一條修復路徑，而非執行時間啟用路徑。

`openclaw doctor --fix` 也會修復與登錄檔相關的受管理 npm 漂移：如果受管理外掛程式 npm 根目錄下的孤立或復原 `@openclaw/*` 套件遮蔽了套件組合外掛程式，doctor 會移除該過期套件並重建登錄檔，以便啟動時對套件組合清單進行驗證。

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一個已棄用的緊急相容性開關，用於登錄檔讀取失敗的情況。優先使用 `plugins registry --refresh` 或 `openclaw doctor --fix`；環境變數後備機制僅適用於遷移推出期間的緊急啟動修復。</Warning>

### 市集

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

市集清單接受本機市集路徑、`marketplace.json` 路徑、GitHub 簡寫（如 `owner/repo`）、GitHub 存儲庫 URL 或 git URL。`--json` 會列印解析後的來源標籤以及解析後的市集清單和外掛程式項目。

## 相關

- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [CLI 參考](/zh-Hant/cli)
- [ClawHub](/zh-Hant/clawhub)
