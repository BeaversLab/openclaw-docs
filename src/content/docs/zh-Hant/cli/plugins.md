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

若安裝、檢查、解除安裝或登錄檔重新整理的速度緩慢，請使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 執行指令。追蹤會將階段計時寫入 stderr，並保持 JSON 輸出可解析。請參閱 [除錯](/zh-Hant/help/debugging#plugin-lifecycle-trace)。

<Note>在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 中，外掛程式生命週期 mutator 會停用。請使用 Nix 來源進行此安裝，而不是 `plugins install`、`plugins update`、`plugins uninstall`、`plugins enable` 或 `plugins disable`；針對 nix-openclaw，請使用代理程式優先的 [快速入門](https://github.com/openclaw/nix-openclaw#quick-start)。</Note>

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

測試設定時安裝的維護者可以使用受防護的環境變數覆寫自動外掛程式安裝來源。請參閱
[外掛程式安裝覆寫](/zh-Hant/plugins/install-overrides)。

<Warning>
在啟動切換期間，裸套件名稱預設會從 npm 安裝。針對 ClawHub，請使用 `clawhub:<package>`。請將外掛程式安裝視為執行程式碼。優先使用鎖定版本。
</Warning>

`plugins search` 會查詢 ClawHub 以尋找可安裝的外掛程式套件，並列印
準備安裝的套件名稱。它會搜尋 code-plugin 和 bundle-plugin 套件，
而不搜尋技能。請使用 `openclaw skills search` 查詢 ClawHub 技能。

<Note>ClawHub 是大多數外掛程式的主要發佈和探索介面。Npm 仍然是支援的備援方案和直接安裝路徑。OpenClaw 擁有的 `@openclaw/*` 外掛程式套件再次發佈於 npm；請參閱 [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 上的目前清單或 [外掛程式清單](/zh-Hant/plugins/plugin-inventory)。穩定安裝使用 `latest`。 Beta 頻道安裝和更新在該標籤可用時偏好 npm `beta` dist-tag，然後再回退到 `latest`。</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    如果您的 `plugins` 區段由單一檔案 `$include` 支援，`plugins install/update/enable/disable/uninstall` 將直接寫入該包含的檔案，並保持 `openclaw.json` 不變。根層級引入、引入陣列以及具有同層級覆寫的引入將會以封閉式失敗，而不是扁平化處理。請參閱 [Config includes](/zh-Hant/gateway/configuration) 以了解支援的格式。

    如果在安裝期間設定無效，`plugins install` 通常會以封閉式失敗並告訴您先執行 `openclaw doctor --fix`。在 Gateway 啟動和熱重載期間，無效的外掛程式設定會像其他無效設定一樣以封閉式失敗；`openclaw doctor --fix` 可以隔離無效的外掛程式項目。唯一記載的安裝時期例外情況，是針對明確選擇加入 `openclaw.install.allowInvalidConfigRecovery` 的外掛程式的一個狹險的套件外掛程式復原路徑。

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` 會重複使用現有的安裝目標，並就地覆寫已安裝的外掛或 hook pack。當您打算從新的本機路徑、壓縮檔、ClawHub 套件或 npm 成件重新安裝相同的 id 時，請使用此選項。對於已追蹤的 npm 外掛的常規升級，建議優先使用 `openclaw plugins update <id-or-npm-spec>`。

    如果您對已安裝的外掛 id 執行 `plugins install`，OpenClaw 會停止並指引您使用 `plugins update <id-or-npm-spec>` 進行一般升級，或者當您確實想從不同的來源覆寫當前安裝時，則使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` 僅適用於 npm 安裝。它不支援 `git:` 安裝；當您需要固定來源時，請使用明確的 git ref（例如 `git:github.com/acme/plugin@v1.2.3`）。它不支援 `--marketplace`，因為市集安裝會保存市集來源詮釋資料，而不是 npm 規格。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是一個針對內建危險代碼掃描器誤報的緊急選項。它允許安裝在內建掃描器報告 `critical` 發現時繼續進行，但它**不會**繞過外掛程式 `before_install` 掛鈎原則封鎖，也**不會**繞過掃描失敗。

    此 CLI 旗標適用於外掛程式安裝/更新流程。Gateway 支援的技能相依性安裝使用匹配的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則保持為單獨的 ClawHub 技能下載/安裝流程。

    如果您在 ClawHub 上發布的外掛程式被隱藏或被登錄檔掃描封鎖，請使用 [ClawHub publishing](/zh-Hant/clawhub/publishing) 中的發布者步驟。`--dangerously-force-unsafe-install` 僅影響您自己機器上的安裝；它不會要求 ClawHub 重新掃描外掛程式或將被封鎖的發行版本公開。

  </Accordion>
  <Accordion title="Hook packs and npm specs">
    `plugins install` 也是暴露於 `package.json` 中 `openclaw.hooks` 的 Hook 套件的安裝介面。請使用 `openclaw hooks` 來進行過濾的 Hook 可見性和個別啟用，而非用於套件安裝。

    npm 規格僅限於 **registry-only**（套件名稱 + 可選的 **確切版本** 或 **dist-tag**）。Git/URL/檔案規格和 semver 範圍會被拒絕。為了安全起見，相依性安裝會以 `--ignore-scripts` 在專案本機執行，即使您的 shell 具有全域 npm 安裝設定。受管理的 npm 套件根目錄會繼承 OpenClaw 的套件層級 npm `overrides`，因此主機安全性釘選也適用於提升的插件相依性。

    當您希望明確指定 npm 解析時，請使用 `npm:<package>`。簡單套件規格也會在啟動切換期間直接從 npm 安裝。

    簡單規格和 `@latest` 會保持在穩定軌道上。OpenClaw 日期標記的修正版本（例如 `2026.5.3-1`）屬於此檢查的穩定版本。如果 npm 將這兩者解析為搶先體驗版，OpenClaw 會停止並要求您明確加入，使用諸如 `@beta`/`@rc` 的搶先體驗標籤或諸如 `@1.2.3-beta.4` 的確切搶先體驗版本。

    如果簡單安裝規格符合官方插件 ID（例如 `diffs`），OpenClaw 會直接安裝目錄項目。若要安裝同名的 npm 套件，請使用明確的範圍規格（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git 儲存庫">
    使用 `git:<repo>` 直接從 git 儲存庫安裝。支援的形式包括 `git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://` 和 `git@host:owner/repo.git` 克隆 URL。新增 `@<ref>` 或 `#<ref>` 以在安裝前簽出分支、標籤或提交。

    Git 安裝會將專案克隆到臨時目錄，在存在請求的參照時進行簽出，然後使用標準的外掛程式目錄安裝程式。這意味著清單驗證、危險程式碼掃描、套件管理器安裝工作以及安裝記錄的行為都像 npm 安裝一樣。記錄的 git 安裝包含來源 URL/參照以及解析的提交，因此 `openclaw plugins update` 可以稍後重新解析來源。

    從 git 安裝後，使用 `openclaw plugins inspect <id> --runtime --json` 來驗證執行時期註冊，例如閘道方法和 CLI 指令。如果外掛程式使用 `api.registerCli` 註冊了 CLI 根目錄，請透過 OpenClaw 根 CLI 直接執行該指令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="壓縮檔">
    支援的壓縮檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 外掛程式壓縮檔必須在解壓縮的外掛程式根目錄中包含有效的 `openclaw.plugin.json`；僅包含 `package.json` 的壓縮檔會在 OpenClaw 寫入安裝記錄之前被拒絕。

    當檔案是 npm 打包的 tarball 並且您想要測試註冊表安裝所使用的相同受管理 npm 根安裝路徑（包括 `package-lock.json` 驗證、提升依賴項掃描和 npm 安裝記錄）時，請使用 `npm-pack:<path.tgz>`。純壓縮檔路徑仍然會作為本機壓縮檔安裝在外掛程式擴充功能根目錄下。

    也支援 Claude 市場安裝。

  </Accordion>
</AccordionGroup>

ClawHub 安裝使用明確的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

裸露的 npm 安全外掛規格預設在啟動切換期間從 npm 安裝：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 以明確僅使用 npm 解析：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 會在安裝前檢查公告的插件 API / 最小 Gateway 相容性。當選定的 ClawHub 版本發布 ClawPack 構件時，OpenClaw 會下載版本化的 npm-pack `.tgz`，驗證 ClawHub 摘要標頭和構件摘要，然後透過一般存檔路徑進行安裝。沒有 ClawPack 元數據的較舊 ClawHub 版本仍透過舊版套件存檔驗證路徑進行安裝。記錄的安裝會保留其 ClawHub 來源元數據、構件種類、npm 完整性、npm shasum、tarball 名稱和 ClawPack 摘要事實，以便後續更新。
未版本化的 ClawHub 安裝會保留未版本化的記錄規格，以便 `openclaw plugins update` 能跟隨較新的 ClawHub 版本；明確的版本或標籤選擇器（例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）則會保持固定在該選擇器上。

#### 市集簡寫

當市集名稱存在於 Claude 本機註冊表快取的 `~/.claude/plugins/known_marketplaces.json` 時，請使用 `plugin@marketplace` 簡寫：

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
  <Tab title="Marketplace sources">
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

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設的 Claude 元件佈局)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

<Note>相容套件會安裝至一般的外掛程式根目錄，並參與相同的 list/info/enable/disable 流程。目前，支援 bundle skills、Claude command-skills、Claude `settings.json` defaults、Claude `.lsp.json` / manifest-declared `lspServers` defaults、Cursor command-skills，以及相容的 Codex hook 目錄；其他偵測到的 bundle 功能會顯示在診斷/資訊中，但尚未連接到執行階段執行。</Note>

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
`plugins list` 會先讀取持續化的本機外掛程式登錄檔，當登錄檔遺失或無效時，則回退至僅依資訊清單 的衍生方式。這適用於檢查外掛程式是否已安裝、已啟用，以及對冷啟動計劃可見，但它並非對正在執行的 Gateway 程序的即時執行階段偵測。在變更外掛程式碼、啟用狀態、Hook 原則或 `plugins.load.paths` 後，請重新啟動服務該通道的 Gateway，然後再預期新的 `register(api)` 程式碼或 hooks 會執行。對於遠端/容器部署，請驗證您正在重新啟動實際的 `openclaw gateway run` 子程序，而不僅是包裝程序。

`plugins list --json` 包含每個外掛程式來自 `package.json`
`dependencies` 和 `optionalDependencies` 的 `dependencyStatus`。OpenClaw 會檢查這些套件
名稱是否存在於外掛程式的正常 Node `node_modules` 查閱路徑中；它
不會匯入外掛程式執行階段碼、執行套件管理員，或修復遺失的
相依項目。

</Note>

`plugins search` 是遠端 ClawHub 目錄查閱。它不會檢查本機
狀態、修改設定、安裝套件，或載入外掛程式執行階段碼。搜尋
結果包含 ClawHub 套件名稱、系列、通道、版本、摘要，以及
安裝提示，例如 `openclaw plugins install clawhub:<package>`。

若要在打包的 Docker 映像中進行捆綁插件工作，請將插件來源目錄綁定掛載到對應的打包來源路徑上，例如 `/app/extensions/synology-chat`。OpenClaw 會在 `/app/dist/extensions/synology-chat` 之前發現該掛載的來源疊加層；單純複製的來源目錄將保持不活躍，因此正常的打包安裝仍會使用編譯後的 dist。

若要進行運行時間掛鉤偵錯：

- `openclaw plugins inspect <id> --runtime --json` 顯示從模組載入檢查過程中註冊的掛鉤和診斷資訊。執行時檢查從不安裝相依項；請使用 `openclaw doctor --fix` 來清理舊版相依項狀態或還原設定中參照的遺失可下載插件。
- `openclaw gateway status --deep --require-rpc` 確認可連線的 Gateway、服務/程序提示、設定路徑和 RPC 健康狀況。
- 非捆綁的對話掛鉤（`llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 以避免複製本機目錄（會新增至 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不支援與 `--link` 搭配使用，因為連結安裝會重複使用來源路徑，而不是複製到受管理的安裝目標。

在 npm 安裝上使用 `--pin`，以將解析的確切規格（`name@version`）儲存在受管理的插件索引中，同時保持預設行為未固定。

</Note>

### 插件索引

插件安裝中繼資料是機器管理的狀態，而非使用者設定。安裝和更新會將其寫入至作用中 OpenClaw 狀態目錄下的 `plugins/installs.json`。其頂層 `installRecords` 對映是安裝中繼資料的持久來源，包括損壞或遺失插件資訊清單的記錄。`plugins` 陣列是衍生自資訊清單的冷註冊表快取。該檔案包含請勿編輯的警告，並由 `openclaw plugins update`、解除安裝、診斷和冷插件註冊表使用。

當 OpenClaw 在設定中看到已交付的舊版 `plugins.installs` 記錄時，執行時期讀取會將其視為相容性輸入，而不重寫 `openclaw.json`。明確的外掛程式寫入和 `openclaw doctor --fix` 會將這些記錄移至外掛程式索引，並在允許設定寫入時移除設定金鑰；如果任一寫入失敗，將保留設定記錄，以免安裝中繼資料遺失。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`（持久化的外掛程式索引）、外掛程式允許/拒絕清單項目，以及適用時連結的 `plugins.load.paths` 項目中移除外掛程式記錄。除非設定了 `--keep-files`，否則解除安裝也會在受控安裝目錄位於 OpenClaw 的外掛程式擴充功能根目錄內時，一併移除該目錄。對於使用中的記憶體外掛程式，記憶體插槽會重設為 `memory-core`。

<Note>`--keep-config` 支援作為 `--keep-files` 的已棄用別名。</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新會套用至受控外掛程式索引中追蹤的外掛程式安裝，以及 `hooks.internal.installs` 中追蹤的 hook-pack 安裝。

<AccordionGroup>
  <Accordion title="解析外掛程式 ID 與 npm 規格">
    當您傳遞外掛程式 ID 時，OpenClaw 會重複使用該外掛程式的記錄安裝規格。這意味著先前儲存的發行標籤（例如 `@beta`）和確切釘選版本會繼續在後續的 `update <id>` 執行中使用。

    對於 npm 安裝，您也可以傳遞包含發行標籤或確切版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回追蹤的外掛程式記錄，更新該已安裝的外掛程式，並記錄新的 npm 規格以供未來基於 ID 的更新使用。

    傳遞不含版本或標籤的 npm 套件名稱也會解析回追蹤的外掛程式記錄。當外掛程式被釘選至確切版本，而您想將其移回登錄庫的預設發行版本線時，請使用此方式。

  </Accordion>
  <Accordion title="Beta channel updates">
    `openclaw plugins update` 會重用追蹤的外掛規格，除非您傳遞了新的規格。`openclaw update` 還會知道目前作用中的 OpenClaw 更新頻道：在 Beta 頻道上，預設層級的 npm 和 ClawHub 外掛記錄會先嘗試 `@beta`，如果不存在外掛 Beta 版本，則回退到記錄的預設/最新規格。該回退會被回報為警告，並且不會導致核心更新失敗。確切版本和明確標籤會保持固定在該選擇器上。

  </Accordion>
  <Accordion title="Version checks and integrity drift">
    在進行實際 npm 更新之前，OpenClaw 會檢查已安裝的套件版本與 npm 註冊表元資料。如果已安裝的版本和記錄的工件身分已經符合解析目標，則會跳過更新，而不會下載、重新安裝或重寫 `openclaw.json`。

    當儲存的完整性雜湊存在並且擷取的工件雜湊發生變化時，OpenClaw 將其視為 npm 工件漂移。互動式 `openclaw plugins update` 指令會列印預期和實際雜湊，並在繼續之前要求確認。非互動式更新輔助程式會以封閉式失敗處理，除非呼叫者提供明確的繼續策略。

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install on update">
    `--dangerously-force-unsafe-install` 也可在 `plugins update` 上作為一種緊急覆寫選項，用於在外掛更新期間處理內建危險代碼掃描的誤報。它仍然不會繞過外掛 `before_install` 策略封鎖或掃描失敗封鎖，並且僅適用於外掛更新，不適用於 hook-pack 更新。
  </Accordion>
</AccordionGroup>

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect 會顯示身分、載入狀態、來源、清單功能、原則標誌、診斷資訊、安裝中繼資料、套件組合功能，以及偵測到的任何 MCP 或 LSP 伺服器支援，且預設不會匯入外掛執行時期。請新增 `--runtime` 以載入外掛模組，並包含已註冊的 Hooks、工具、命令、服務、Gateway 方法與 HTTP 路由。執行時期檢查會直接回報遺失的外掛相依性；安裝與修復作業會保留在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中。

外掛擁有的 CLI 命令通常會安裝為根 `openclaw` 命令群組，但外掛也可能在核心父項（例如 `openclaw nodes`）下註冊巢狀命令。當 `inspect --runtime` 顯示 `cliCommands` 下的命令時，請在列出的路徑執行它；舉例來說，註冊 `demo-git` 的外掛可以使用 `openclaw demo-git ping` 進行驗證。

每個外掛程式都會根據它在執行時期實際註冊的內容進行分類：

- **plain-capability** — 單一功能類型（例如僅提供者的外掛程式）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 影像）
- **hook-only** — 僅包含鉤子，沒有功能或介面
- **non-capability** — 包含工具/指令/服務但沒有功能

請參閱 [Plugin shapes](/zh-Hant/plugins/architecture#plugin-shapes) 以進一步瞭解功能模型。

<Note>`--json` 標誌會輸出適合於腳本與稽核的機器可讀報告。`inspect --all` 會呈現包含形狀、功能種類、相容性注意事項、套件組合功能與 Hook 摘要欄位的全站台表格。`info` 是 `inspect` 的別名。</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 會回報外掛載入錯誤、清單/探索診斷資訊，以及相容性注意事項。當一切正常時，它會列印 `No plugin issues detected.`

若設定的外掛位於磁碟上，但因載入器的路徑安全性檢查而被封鎖，設定驗證會保留此外掛項目並將其回報為 `present but blocked`。請修正先前被封鎖之外掛的診斷問題（例如路徑擁有權或全世界可寫入權限），而不要移除 `plugins.entries.<id>` 或 `plugins.allow` 設定。

針對缺少 `register`/`activate` 匯出等模組形狀失敗，請使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新執行，以便在診斷輸出中包含簡潔的匯出形狀摘要。

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本機外掛程式登錄檔是 OpenClaw 用於已安裝外掛程式身分識別、啟用狀態、來源中繼資料和貢獻所有權的持久化冷讀取模型。正常啟動、提供者擁有者查詢、通道設定分類和外掛程式清單可以在不匯入外掛程式執行時間模組的情況下讀取它。

使用 `plugins registry` 檢查持久化的註冊表是否存在、是否為最新或已過時。使用 `--refresh` 根據持久化的外掛程式索引、設定原則以及 manifest/package 元資料來重建它。這是一條修復路徑，而非執行時啟用路徑。

`openclaw doctor --fix` 也會修復與註冊表相關的受管理 npm 漂移：如果受管理外掛程式 npm 根目錄下的孤立或已復原 `@openclaw/*` 套件遮蔽了捆綁的外掛程式，doctor 會移除該過時套件並重建註冊表，以便啟動時針對捆綁的 manifest 進行驗證。Doctor 還會將主機 `openclaw` 套件重新連結到宣告 `peerDependencies.openclaw` 的受管理 npm 外掛程式中，以便在更新或 npm 修復後，諸如 `openclaw/plugin-sdk/*` 的套件本機執行時匯入能夠正確解析。

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一個已被棄用的緊急相容性開關，用於處理註冊表讀取失敗。建議優先使用 `plugins registry --refresh` 或 `openclaw doctor --fix`；該環境變數後援方案僅用於遷移推出期間的緊急啟動修復。</Warning>

### 市集

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace list 接受本地 marketplace 路徑、`marketplace.json` 路徑、類似 `owner/repo` 的 GitHub 簡寫、GitHub 儲存庫 URL 或 git URL。`--json` 會列印解析後的來源標籤以及解析出的 marketplace manifest 和外掛程式項目。

## 相關

- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [CLI 參考資料](/zh-Hant/cli)
- [ClawHub](/zh-Hant/clawhub)
