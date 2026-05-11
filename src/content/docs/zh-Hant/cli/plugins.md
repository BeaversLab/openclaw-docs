---
summary: "`openclaw plugins` 的 CLI 參考（list、install、marketplace、uninstall、enable/disable、doctor）"
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
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
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

<Note>
隨附的外掛程式隨 OpenClaw 一起發布。部分預設為啟用（例如隨附的模型提供者、隨附的語音提供者以及隨附的瀏覽器外掛程式）；其他則需要 `plugins enable`。

原生的 OpenClaw 外掛程式必須隨附 `openclaw.plugin.json` 並包含內嵌 JSON Schema（`configSchema`，即使為空）。相容的套件則改用其自己的套件清單。

`plugins list` 會顯示 `Format: openclaw` 或 `Format: bundle`。詳細的列表/資訊輸出也會顯示套件子類型（`codex`、`claude` 或 `cursor`）以及偵測到的套件功能。

</Note>

### 安裝

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install npm:<package>                  # npm only
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

<Warning>裸套件名稱會先檢查 ClawHub，然後再檢查 npm。請將外掛程式安裝視為執行程式碼。建議優先使用鎖定版本。</Warning>

<AccordionGroup>
  <Accordion title="設定檔引入與無效設定檔復原">
    如果您的 `plugins` 區段是基於單一檔案的 `$include`，`plugins install/update/enable/disable/uninstall` 將直接寫入該引入的檔案，並保持 `openclaw.json` 不變。根層級引入、引入陣列，以及帶有同層級覆寫的引入會採取「封閉失敗」（fail closed）而非扁平化。請參閱 [設定檔引入](/zh-Hant/gateway/configuration) 以了解支援的結構。

    如果安裝期間設定檔無效，`plugins install` 通常會採取封閉失敗並告訴您先執行 `openclaw doctor --fix`。在 Gateway 啟動期間，單一外掛的無效設定會被隔離在該外掛內，以便其他通道和外掛繼續執行；`openclaw doctor --fix` 可以隔離無效的外掛項目。唯一有記載的安裝時期例外情況，是一條針對明確選擇加入 `openclaw.install.allowInvalidConfigRecovery` 的外掛的狹隘套件外掛復原路徑。

  </Accordion>
  <Accordion title="--force 與重新安裝對比更新">
    `--force` 會重複使用現有的安裝目標，並直接就地覆寫已安裝的外掛或 hook pack。當您刻意從新的本機路徑、封存檔、ClawHub 套件或 npm 構件重新安裝相同的 id 時使用此選項。對於已追蹤的 npm 外掛的常規升級，建議使用 `openclaw plugins update <id-or-npm-spec>`。

    如果您對已安裝的外掛 id 執行 `plugins install`，OpenClaw 會停止並指引您使用 `plugins update <id-or-npm-spec>` 進行正常升級，或當您確實想要從不同來源覆寫目前的安裝時，使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin 範圍">
    `--pin` 僅適用於 npm 安裝。它不支援 `--marketplace`，因為市集安裝會保存市集來源中繼資料而非 npm 規格。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是內建危險程式碼掃描器誤報時的緊急選項。即使內建掃描器回報 `critical` 發現結果，它仍允許安裝繼續，但它**不會**繞過外掛程式 `before_install` 掛鉤原則封鎖，也**不會**繞過掃描失敗。

    此 CLI 標誌適用於外掛程式安裝/更新流程。Gateway 支援的技能相依性安裝使用相符的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則維持為單獨的 ClawHub 技能下載/安裝流程。

  </Accordion>
  <Accordion title="Hook packs and npm specs">
    `plugins install` 也是在 `package.json` 中公開 `openclaw.hooks` 的掛鉤套件安裝介面。請使用 `openclaw hooks` 進行篩選的掛鉤可視性及個別掛鉤啟用，而非用於套件安裝。

    Npm 規格僅限於 **registry-only** (套件名稱 + 選用的 **確切版本** 或 **dist-tag**)。Git/URL/檔案規格和 semver 範圍都會被拒絕。為了安全起見，相依性安裝會以 `--ignore-scripts` 在專本機執行，即使您的 Shell 具有全域 npm 安裝設定。

    當您想要略過 ClawHub 查詢並直接從 npm 安裝時，請使用 `npm:<package>`。純套件規格仍偏好 ClawHub，並且只有在 ClawHub 沒有該套件或版本時才會後備至 npm。

    純規格和 `@latest` 會保持在穩定追蹤。如果 npm 將其中任何一個解析為發行前版本，OpenClaw 會停止並要求您使用發行前版本標籤 (例如 `@beta`/`@rc`) 或確切的發行前版本 (例如 `@1.2.3-beta.4`) 明確加入。

    如果純安裝規格符合隨附外掛程式 ID (例如 `diffs`)，OpenClaw 會直接安裝隨附外掛程式。若要安裝同名的 npm 套件，請使用明確的範圍規格 (例如 `@scope/diffs`)。

  </Accordion>
  <Accordion title="Archives">
    支援的壓縮檔：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 外掛壓縮檔必須在解壓縮後的外掛根目錄中包含有效的 `openclaw.plugin.json`；僅包含 `package.json` 的壓縮檔會在 OpenClaw 寫入安裝記錄之前被拒絕。

    也支援 Claude marketplace 安裝。

  </Accordion>
</AccordionGroup>

ClawHub 安裝使用明確的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 現在也針對純 npm 相容外掛規格優先使用 ClawHub。只有在 ClawHub 沒有該套件或版本時才會退回使用 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 強制僅使用 npm 解析，例如當無法連線至 ClawHub 或您知道該套件僅存在於 npm 上時：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 從 ClawHub 下載套件壓縮檔，檢查公告的外掛 API / 最低 Gateway 相容性，然後透過一般壓縮檔路徑進行安裝。記錄的安裝會保留其 ClawHub 來源元資料以供後續更新。
未指定版本的 ClawHub 安裝會保留未指定版本的記錄規格，以便 `openclaw plugins update` 能夠追蹤較新的 ClawHub 版本；明確的版本或標籤選擇器（例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）則會保持固定該選擇器。

#### Marketplace 簡寫

當 marketplace 名稱存在於 Claude 本機註冊表快取中的 `~/.claude/plugins/known_marketplaces.json` 時，請使用 `plugin@marketplace` 簡寫：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

當您想要明確傳遞 marketplace 來源時，請使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Marketplace sources">- 來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名稱 - 本機 marketplace 根目錄或 `marketplace.json` 路徑 - GitHub repo 簡寫，例如 `owner/repo` - GitHub repo URL，例如 `https://github.com/owner/repo` - git URL</Tab>
  <Tab title="Remote marketplace rules">對於從 GitHub 或 git 載入的遠端市集，外掛條目必須保留在複製的市集儲存庫內。OpenClaw 接受來自該儲存庫的相對路徑來源，並拒絕來自遠端清單的 HTTP(S)、絕對路徑、git、GitHub 和其他非路徑的外掛來源。</Tab>
</Tabs>

對於本機路徑和歸檔，OpenClaw 會自動偵測：

- 原生 OpenClaw 外掛 (`openclaw.plugin.json`)
- Codex 相容套件 (`.codex-plugin/plugin.json`)
- Claude 相容套件 (`.claude-plugin/plugin.json` 或預設的 Claude 元件佈局)
- Cursor 相容套件 (`.cursor-plugin/plugin.json`)

<Note>相容套件會安裝到一般的外掛根目錄，並參與相同的 list/info/enable/disable 流程。目前，支援套件技能、Claude command-skills、Claude `settings.json` defaults、Claude `.lsp.json` / manifest-declared `lspServers` defaults、Cursor command-skills 和相容的 Codex hook 目錄；其他偵測到的套件功能會顯示在診斷/資訊中，但尚未連結到執行階段執行。</Note>

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

<ParamField path="--enabled" type="boolean">
  僅顯示已啟用的外掛。
</ParamField>
<ParamField path="--verbose" type="boolean">
  從表格檢視切換到每個外掛的詳細資料行，包含來源/來處/版本/啟用中繼資料。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀的清單以及登錄診斷。
</ParamField>

<Note>
  `plugins list` 首先讀取已保存的本地插件註冊表，當註冊表缺失或無效時，則退回到僅從清單推導的後備方案。這對於檢查插件是否已安裝、啟用以及對冷啟動規劃可見很有用，但它並不是對正在運行的 Gateway 程序的實時運行時探測。更改插件代碼、啟用狀態、掛鉤策略或 `plugins.load.paths` 後，請重啟提供該通道的 Gateway，然後再預期新的 `register(api)` 代碼或掛鉤會運行。對於遠程/容器部署，請驗證您正在重啟實際的
  `openclaw gateway run` 子進程，而不僅僅是包裝程序。
</Note>

對於打包 Docker 映像中的捆綁插件工作，請將插件源目錄綁定掛載到匹配的打包源路徑上，例如 `/app/extensions/synology-chat`。OpenClaw 將在 `/app/dist/extensions/synology-chat` 之前發現那個已掛載的源疊加層；普通複製的源目錄將保持不活動狀態，因此正常的打包安裝仍然會使用編譯好的 dist。

對於運行時掛鉤調試：

- `openclaw plugins inspect <id> --json` 顯示來自模塊加載檢查階段的已註冊掛鉤和診斷信息。
- `openclaw gateway status --deep --require-rpc` 確認可達的 Gateway、服務/進程提示、配置路徑和 RPC 健康狀況。
- 非捆綁的對話掛鉤（`llm_input`、`llm_output`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 以避免複製本地目錄（會添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不支援與 `--link` 搭配使用，因為鏈接安裝會重用源路徑，而不是複製到受管理的安裝目標。

在 npm 安裝上使用 `--pin`，將已解析的確切規格（`name@version`）保存在受管理的插件索引中，同時保持預設行為為未固定。

</Note>

### 插件索引

外掛程式安裝中繼資料是機器管理的狀態，而非使用者設定。安裝和更新會將其寫入到作用中 OpenClaw 狀態目錄下的 `plugins/installs.json`。其頂層 `installRecords` 映射是安裝中繼資料的持久來源，包括損壞或遺失外掛程式清單的記錄。`plugins` 陣列是衍生自清單的冷登錄快取。該檔案包含禁止編輯的警告，並被 `openclaw plugins update`、解除安裝、診斷以及冷外掛程式登錄使用。

當 OpenClaw 在設定中看到已出貨的舊版 `plugins.installs` 記錄時，它會將其移動到外掛程式索引中並移除設定金鑰；如果任何寫入失敗，則會保留設定記錄以免安裝中繼資料遺失。

### 解除安裝

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 會從 `plugins.entries`（持續性外掛程式索引）、外掛程式允許/拒絕清單項目，以及適用時相關聯的 `plugins.load.paths` 項目中移除外掛程式記錄。除非設定了 `--keep-files`，否則解除安裝也會在受追蹤的受管理安裝目錄位於 OpenClaw 外掛程式擴充功能根目錄內時將其移除。對於作用中的記憶體外掛程式，記憶體槽會重設為 `memory-core`。

<Note>`--keep-config` 受支援為 `--keep-files` 的已棄用別名。</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新套用於受管理外掛程式索引中受追蹤的外掛程式安裝，以及 `hooks.internal.installs` 中受追蹤的 hook-pack 安裝。

<AccordionGroup>
  <Accordion title="解析外掛程式 ID 與 npm 規格">
    當您傳遞一個外掛程式 ID 時，OpenClaw 會重用為該外掛程式記錄的安裝規格。這意味著先前儲存的 dist-tags（例如 `@beta`）和精確固定的版本會在後續的 `update <id>` 執行中繼續被使用。

    對於 npm 安裝，您也可以傳遞帶有 dist-tag 或精確版本的明確 npm 套件規格。OpenClaw 會將該套件名稱解析回追蹤的外掛程式記錄，更新已安裝的外掛程式，並記錄新的 npm 規格以供未來基於 ID 的更新使用。

    傳遞不含版本或標籤的 npm 套件名稱也會解析回追蹤的外掛程式記錄。當外掛程式被固定為精確版本而您想將其移回登錄檔的預設發布線時，請使用此方式。

  </Accordion>
  <Accordion title="版本檢查與完整性偏移">
    在進行實際的 npm 更新之前，OpenClaw 會檢查已安裝的套件版本與 npm 登錄檔元資料。如果已安裝的版本和記錄的工件身分已符合解析的目標，則會跳過更新，而不進行下載、重新安裝或重寫 `openclaw.json`。

    當存在儲存的完整性雜湊值並且抓取的工件雜湊值發生變化時，OpenClaw 會將其視為 npm 工件偏移。互動式 `openclaw plugins update` 指令會列印預期和實際的雜湊值，並在繼續之前要求確認。非互動式更新輔助程式會以封閉模式失敗，除非呼叫者提供明確的繼續策略。

  </Accordion>
  <Accordion title="更新時使用 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 也可在 `plugins update` 上使用，作為一種緊急覆寫措施，用於解決外掛程式更新期間內建危險程式碼掃描的誤報。它仍然不會繞過外掛程式 `before_install` 策略封鎖或掃描失敗封鎖，並且僅適用於外掛程式更新，不適用於 hook-pack 更新。
  </Accordion>
</AccordionGroup>

### 檢查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

對單個外掛程式進行深度檢查。顯示身分、載入狀態、來源、註冊的功能、hooks、工具、命令、服務、閘道方法、HTTP 路由、原則旗標、診斷、安裝中繼資料、套件組合功能，以及任何偵測到的 MCP 或 LSP 伺服器支援。

每個外掛程式會根據它在執行時期實際註冊的內容進行分類：

- **plain-capability** — 一種功能類型（例如僅提供者的外掛程式）
- **hybrid-capability** — 多種功能類型（例如文字 + 語音 + 影像）
- **hook-only** — 僅有 hooks，沒有功能或介面
- **non-capability** — 有工具/命令/服務但沒有功能

請參閱 [Plugin shapes](/zh-Hant/plugins/architecture#plugin-shapes) 以進一步瞭解功能模型。

<Note>`--json` 旗標會輸出適合腳本和稽核的機器可讀報表。`inspect --all` 會呈現一個整個範圍的表格，其中包含形狀、功能種類、相容性注意事項、套件組合功能以及 hook 摘要欄。`info` 是 `inspect` 的別名。</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 會回報外掛程式載入錯誤、清單/探索診斷以及相容性注意事項。當一切正常時，它會列印 `No plugin issues detected.`

針對模組形狀失敗（例如缺少 `register`/`activate` 匯出），請使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新執行，以便在診斷輸出中包含簡潔的匯出形狀摘要。

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本機外掛程式登錄檔是 OpenClaw 的持續性冷讀取模型，用於處理已安裝外掛程式的身分、啟用狀態、來源中繼資料和貢獻擁有權。一般啟動、提供者擁有者查詢、通道設定分類和外掛程式清查都可以讀取它，而不需要匯入外掛程式執行時期模組。

使用 `plugins registry` 來檢查持續性登錄檔是否存在、是否為最新或已過時。使用 `--refresh` 從持續性外掛程式索引、設定原則以及清單/套件中繼資料重建它。這是一個修復路徑，而不是執行時期啟動路徑。

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一個已棄用的緊急相容性開關，用於登錄表讀取失敗的情況。建議優先使用 `plugins registry --refresh` 或 `openclaw doctor --fix`；環境變數後備方案僅用於遷移推出時的緊急啟動恢復。</Warning>

### 市集

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace list 接受本地市集路徑、`marketplace.json` 路徑、GitHub 簡寫（如 `owner/repo`）、GitHub 儲存庫 URL 或 git URL。`--json` 會列印解析後的來源標籤以及解析出的市集清單和外掛程式項目。

## 相關

- [建構外掛](/zh-Hant/plugins/building-plugins)
- [CLI 參考資料](/zh-Hant/cli)
- [社群外掛](/zh-Hant/plugins/community)
