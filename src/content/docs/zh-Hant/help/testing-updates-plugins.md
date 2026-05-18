---
summary: "OpenClaw 如何驗證更新路徑、套件遷移以及外掛安裝/更新行為"
read_when:
  - Changing OpenClaw update, doctor, package acceptance, or plugin install behavior
  - Preparing or approving a release candidate
  - Debugging package update, plugin dependency cleanup, or plugin install regressions
title: "測試：更新與外掛"
sidebarTitle: "更新與外掛測試"
---

這是專用於更新與外掛驗證的檢查清單。目標很簡單：證明可安裝的套件能夠更新真實的使用者狀態，透過 `doctor` 修復過時的舊版狀態，並且仍然能從支援的來源安裝、載入、更新及解除安裝外掛。

若要查看更廣泛的測試執行器地圖，請參閱 [測試](/zh-Hant/help/testing)。若要查看即時提供者金鑰和涉及網路的測試套件，請參閱 [即時測試](/zh-Hant/help/testing-live)。

## 我們保護的內容

更新與外掛測試保護了以下契約：

- 套件壓縮檔 是完整的，具有有效的 `dist/postinstall-inventory.json`，且不依賴未解壓縮的 repo 檔案。
- 使用者可以從較舊的已發布套件移轉到候選套件，而不會遺失設定、代理程式、工作階段、工作區、外掛允許清單或通道設定。
- `openclaw doctor --fix --non-interactive` 擁有舊版清理和修復路徑。啟動程序不應為過時的外掛狀態增加隱藏的相容性遷移。
- 外掛安裝可從本機目錄、 git 儲存庫、 npm 套件以及 ClawHub 註冊表路徑運作。
- 外掛 npm 相依性會安裝在受管理的 npm 根目錄中，在信任前進行掃描，並在解除安裝期間透過 npm 移除，以免提升的 相依性殘留。
- 當沒有任何變更時，外掛更新是穩定的：安裝記錄、已解析的來源、已安裝的相依性佈局和啟用狀態保持不變。

## 開發期間的本機驗證

從小處著手：

```bash
pnpm changed:lanes --json
pnpm check:changed
pnpm test:changed
```

對於外掛安裝、解除安裝、相依性或套件清單的變更，還要執行涵蓋編輯縫合處 的專注測試：

```bash
pnpm test src/plugins/uninstall.test.ts src/infra/package-dist-inventory.test.ts test/scripts/package-acceptance-workflow.test.ts
```

在任何套件 Docker 通道消耗壓縮檔之前，先驗證套件成品：

```bash
pnpm release:check
```

`release:check` 會執行設定/文件/API 偏差檢查，寫入套件 dist 清單，執行 `npm pack --dry-run`，拒絕禁止的打包檔案，將壓縮檔安裝到暫時前綴，執行 postinstall，並對捆綁的通道進入點進行冒煙測試。

## Docker 通道

Docker 軌道是產品級別的驗證。它們會在 Linux 容器內安裝或更新真實的套件，並透過 CLI 指令、Gateway 啟動、HTTP 探測、RPC 狀態和檔案系統狀態來斷言行為。

在反覆運算時使用專注的軌道：

```bash
pnpm test:docker:plugins
pnpm test:docker:plugin-lifecycle-matrix
pnpm test:docker:plugin-update
pnpm test:docker:upgrade-survivor
pnpm test:docker:published-upgrade-survivor
pnpm test:docker:update-restart-auth
pnpm test:docker:update-migration
```

重要軌道：

- `test:docker:plugins` 驗證外掛安裝冒煙測試、本地資料夾安裝、本地資料夾更新略過行為、具有預先安裝相依性的本地資料夾、`file:` 套件安裝、具有 CLI 執行的 git 安裝、git 移動引用更新、具有提升傳遞性相依性的 npm 登錄安裝、npm 更新無操作 (no-ops)、格式錯誤的 npm 套件元資料拒絕、本地 ClawHub 安裝工具 (fixture) 安裝與更新無操作、市集更新行為，以及 Claude-bundle 啟用/檢查。設定 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以保持 ClawHub 區塊獨立/離線。
- `test:docker:plugin-lifecycle-matrix` 在裸機容器中安裝候選套件，透過安裝、檢查、停用、啟用、明確升級、明確降級以及在刪除外掛程式碼後執行卸載來運行 npm 外掛。它會記錄每個階段的 RSS 和 CPU 指標。
- `test:docker:plugin-update` 驗證未變更的已安裝外掛在 `openclaw plugins update` 期間不會重新安裝或遺失安裝中繼資料。
- `test:docker:upgrade-survivor` 在髒舊使用者 fixture 上安裝候選 tarball，執行套件更新加上非互動式 doctor，然後啟動回環 Gateway 並檢查狀態保留。
- `test:docker:published-upgrade-survivor` 首先安裝已發布的基準，透過內建的 `openclaw config set` 食譜進行設定，將其更新為候選 tarball，執行 doctor，檢查舊版清理，啟動 Gateway，並探測 `/healthz`、`/readyz` 和 RPC 狀態。
- `test:docker:update-restart-auth` 安裝候選套件，啟動受管理的 token-auth Gateway，針對 `openclaw update --yes --json` 取消設定呼叫端 gateway auth 環境變數，並要求候選更新指令在正常探測之前重新啟動 Gateway。
- `test:docker:update-migration` 是以清理為重的已發布更新通道。它
  從配置的 Discord/Telegram 風格使用者狀態開始，執行基準
  doctor 讓已配置的外掛相依性有機會具體化，為已配置的打包外掛
  播種舊版外掛相依性殘留，更新到候選 tarball，並要求更新後的
  doctor 移除舊版相依性根目錄。

有用的已發布升級存留變體：

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.4.23 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor
```

可用的情境包括 `base`、`feishu-channel`、`bootstrap-persona`、
`plugin-deps-cleanup`、`configured-plugin-installs`、
`stale-source-plugin-shadow`、`tilde-log-path` 和 `versioned-runtime-deps`。在彙總執行中，
`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 會展開為所有回報的
問題型情境，包括已配置外掛的安裝遷移。

完整更新遷移刻意與完整發行版 CI 分開。當發行問題是「從 2026.4.23 起的
每個已發布穩定版本是否能更新到此候選版本並
清理外掛相依性殘留？」時，請使用手動 `Update Migration` 工作流程：

```bash
gh workflow run update-migration.yml \
  --ref main \
  -f workflow_ref=main \
  -f package_ref=main \
  -f baselines=all-since-2026.4.23 \
  -f scenarios=plugin-deps-cleanup
```

## 套件驗收

套件驗收是 GitHub 原生的套件閘道。它將一個候選套件解析為 `package-under-test` tarball，
記錄版本和 SHA-256，然後針對該確切的 tarball 執行可重複使用的 Docker E2E 通道。
工作流程 harness ref 與套件來源 ref 分離，因此目前的測試邏輯可以驗證
較舊的受信任發行版本。

候選來源：

- `source=npm`：驗證 `openclaw@beta`、`openclaw@latest` 或精確的
  已發布版本。
- `source=ref`：使用選定的目前 harness 打包受信任的分支、標籤或提交。
- `source=url`：驗證具有所需 `package_sha256` 的 HTTPS tarball。
- `source=artifact`：重複使用由另一個 Actions 執行上傳的 tarball。

完整發行驗證預設使用 `source=artifact`，它是從解析的發行 SHA 建構的。
若要進行發布後證明，請傳遞
`package_acceptance_package_spec=openclaw@YYYY.M.D`，讓相同的升級矩陣
改為鎖定已發布的 npm 套件。

版本檢查會使用 package/update/restart/plugin 設定來呼叫 Package Acceptance（套件驗收）：

```text
doctor-switch update-channel-switch update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update
```

當啟用發布浸泡（release soak）時，它們還會傳入：

```text
published_upgrade_survivor_baselines=last-stable-4 2026.4.23 2026.5.2 2026.4.15
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

這能讓套件遷移、更新通道切換、損壞的受管理外掛程式容忍度、過時的外掛程式相依性清理、離線外掛程式覆蓋率、外掛程式更新行為以及 Telegram 套件 QA 都在同一個解析出的構件上進行，而不必讓預設的發布套件閘門遍歷每個已發布的版本。

`last-stable-4` 會解析為四個最新的穩定版 npm 發布 OpenClaw 版本。發布套件驗收會將 `2026.4.23` 固定為第一個外掛程式更新相容性邊界，`2026.5.2` 固定為外掛程式架構變動邊界，並將 `2026.4.15` 固定為較舊的 2026.4.1x 已發布更新基準；解析器會重複移除已經在最新四個版本中的固定項。若要進行完整的已發布更新遷移覆蓋，請在個別的 Update Migration 工作流程中使用 `all-since-2026.4.23`，而不是完整發布 CI。當您同時需要舊版日期錨點時，`release-history` 仍可用於手動更廣泛的採樣。

當選擇多個已發布升級存活者基準時，可重複使用的 Docker 工作流程會將每個基準分片到其自己的目標執行器工作中。每個基準分片仍然會執行選定的情境集，但日誌和構件會保持每個基準獨立，並且牆上時間會受限於最慢的分片，而不是一個大型序列工作。

在發布前驗證候選版本時，請手動執行套件設定檔：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=package \
  -f published_upgrade_survivor_baselines="last-stable-4 2026.4.23 2026.5.2 2026.4.15" \
  -f published_upgrade_survivor_scenarios=reported-issues \
  -f telegram_mode=mock-openai
```

當發布問題包含 MCP 通道、cron/subagent 清理、OpenAI 網頁搜尋或 OpenWebUI 時，請使用 `suite_profile=product`。僅在您需要完整的 Docker 發布路徑覆蓋率時才使用 `suite_profile=full`。

## 發布預設

對於發布候選版本，預設的驗證堆疊為：

1. `pnpm check:changed` 和 `pnpm test:changed` 用於原始碼層級的回歸測試。
2. `pnpm release:check` 用於套件構件完整性。
3. Package Acceptance `package` 設定檔或 release-check 自訂套件通道，用於安裝/更新/重新啟動/外掛程式合約。
4. 跨作業系統發布檢查，用於特定作業系統的安裝程式、上線和平台行為。
5. 僅當變更範圍涉及提供者或託管服務行為時，才執行 Live suites。

在維護者的機器上，廣泛的閘道和 Docker/套件產品驗證應在 Testbox 中執行，除非明確進行本地驗證。

## 舊版相容性

相容性寬容度很窄且有時間限制：

- 透過 `2026.4.25` 的套件（包括 `2026.4.25-beta.*`）在套件驗收中可能會容忍已發佈的套件元資料缺口。
- 已發佈的 `2026.4.26` 套件可能會針對已發佈的本地建置元資料戳記檔案發出警告。
- 後續的套件必須滿足現代合約。相同的缺口將導致失敗，而不是警告或跳過。

請勿為這些舊格式新增啟動遷移。新增或擴充 doctor 修復，然後當更新指令擁有重啟權時，使用 `upgrade-survivor`、`published-upgrade-survivor` 或 `update-restart-auth` 進行驗證。

## 新增覆蓋率

變更更新或外掛行為時，在可能因正確原因而失敗的最低層級新增覆蓋率：

- 純路徑或元資料邏輯：在原始碼旁新增單元測試。
- 套件清單或打包檔案行為：`package-dist-inventory` 或 tarball 檢查器測試。
- CLI 安裝/更新行為：Docker lane 斷言或 fixture。
- 已發佈版本的遷移行為：`published-upgrade-survivor` 情境。
- 更新擁有的重啟行為：`update-restart-auth`。
- 註冊表/套件來源行為：`test:docker:plugins` fixture 或 ClawHub fixture 伺服器。
- 相依性佈局或清理行為：同時斷言執行時期執行和檔案系統邊界。npm 相依性可能會被提升至受管理的 npm 根目錄下，因此測試應證明掃描/清理的是根目錄，而不是假設套件本地的 `node_modules` 樹狀結構。

預設情況下，保持新的 Docker fixtures 為隔離狀態。使用本地 fixture 註冊表和虛假套件，除非測試的目的是即時註冊表行為。

## 故障分診

從成品身分開始：

- 套件驗收 `resolve_package` 摘要：來源、版本、SHA-256 和成品名稱。
- Docker 成品：`.artifacts/docker-tests/**/summary.json`、
  `failures.json`、lane 日誌和重新執行指令。
- 升級存活者摘要：`.artifacts/upgrade-survivor/summary.json`，包括基線版本、候選版本、場景、階段計時和配方步驟。

優先使用相同的軟體包成品重新執行失敗的確切通道，而不是重新執行整個發行大綱。
