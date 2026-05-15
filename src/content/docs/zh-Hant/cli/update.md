---
summary: "`openclaw update` 的 CLI 參考資料（相對安全的來源更新 + 閘道自動重新啟動）"
read_when:
  - You want to update a source checkout safely
  - You are debugging `openclaw update` output or options
  - You need to understand `--update` shorthand behavior
title: "更新"
---

# `openclaw update`

安全地更新 OpenClaw 並在穩定版/測試版/開發版之間切換。

如果您是透過 **npm/pnpm/bun** 安裝（全域安裝，無 git 元資料），
更新會透過 [更新](/zh-Hant/install/updating) 中的套件管理員流程進行。

## 使用方式

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --json
openclaw --update
```

## 選項

- `--no-restart`：在成功更新後跳過重新啟動 Gateway 服務。會重新啟動 Gateway 的套件管理員更新會在命令成功前，驗證重新啟動的服務回報了預期的更新版本。
- `--channel <stable|beta|dev>`：設定更新頻道（git + npm；會持久化儲存在設定中）。
- `--tag <dist-tag|version|spec>`：僅針對此更新覆寫套件目標。對於套件安裝，`main` 對應到 `github:openclaw/openclaw#main`。
- `--dry-run`：預覽計畫的更新動作（頻道/標籤/目標/重新啟動流程），而不寫入設定、安裝、同步外掛或重新啟動。
- `--json`：列印機器可讀取的 `UpdateRunResult` JSON，包括
  當損壞或無法載入的受管理外掛需要在核心更新成功後修復時的 `postUpdate.plugins.warnings`，以及在更新後外掛同步期間偵測到 npm 外掛成品漂移時的 `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每步驟的逾時時間（預設為 1800 秒）。
- `--yes`：跳過確認提示（例如降級確認）。

`openclaw update` 沒有 `--verbose` 標誌。使用 `--dry-run` 來預覽
計畫的頻道/標籤/安裝/重新啟動動作，使用 `--json` 來取得機器可讀取
的結果，並在您只需要頻道和可用性詳細資訊時使用 `openclaw update status --json`。如果您正在除錯更新周圍的 Gateway 記錄，
控制台詳細程度和檔案記錄層級是分開的：Gateway `--verbose` 影響
終端機/WebSocket 輸出，而檔案記錄需要在設定中使用 `logging.level: "debug"` 或
`"trace"`。請參閱 [Gateway 記錄](/zh-Hant/gateway/logging)。

<Note>在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，變更 `openclaw update` 執行已被停用。請改為更新此安裝的 Nix 來源或 flake input；對於 nix-openclaw，請使用 agent-first [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。`openclaw update status` 和 `openclaw update --dry-run` 保持唯讀。</Note>

<Warning>降級需要確認，因為較舊的版本可能會破壞設定。</Warning>

## `update status`

顯示目前啟用的更新頻道 + git tag/branch/SHA (針對來源 checkout)，以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

選項：

- `--json`：列印機器可讀的狀態 JSON。
- `--timeout <seconds>`：檢查逾時 (預設為 3s)。

## `update wizard`

互動式流程，用於選擇更新頻道並確認更新後是否重新啟動 Gateway
(預設為重新啟動)。如果您在沒有 git checkout 的情況下選擇 `dev`，它
會提議建立一個。

選項：

- `--timeout <seconds>`：每個更新步驟的逾時 (預設 `1800`)

## 運作方式

當您明確切換頻道 (`--channel ...`) 時，OpenClaw 也會保持
安裝方法的一致性：

- `dev` → 確保擁有 git checkout (預設：`~/openclaw`，可使用 `OPENCLAW_GIT_DIR` 覆寫)，
  更新它，並從該 checkout 安裝全域 CLI。
- `stable` → 使用 `latest` 從 npm 安裝。
- `beta` → 優先使用 npm dist-tag `beta`，但當 beta
  遺失或比目前的穩定版本舊時，則會退回至 `latest`。

Gateway 核心自動更新程式 (當透過設定啟用時) 會在即時 Gateway 請求處理程序之外
啟動 CLI 更新路徑。控制平面 `update.run` 套件管理器
更新會在套件交換後強制執行非延遲、無冷卻的更新重新啟動，
因為舊的 Gateway 程序可能仍擁有指向
新套件所移除檔案的記憶體區塊。

對於透過套件管理器安裝的版本，`openclaw update` 會在呼叫套件管理器之前解析目標套件版本。npm 全域安裝使用分段安裝：OpenClaw 會將新套件安裝到暫時的 npm 前綴目錄，驗證該處打包的 `dist` 清單，然後將那個乾淨的套件樹交換到真實的全域前綴目錄中。如果驗證失敗，更新後的 doctor、plugin 同步以及重啟作業將不會從可疑的套件樹執行。即使已安裝的版本已經符合目標，該指令也會重新整理全域套件安裝，然後執行 plugin 同步、核心指令補完重新整理以及重啟作業。這能讓打包的 sidecar 和管道擁有的 plugin 記錄與已安裝的 OpenClaw 版本保持一致，同時將完整的 plugin 指令補完重建留給明確的 `openclaw completion --write-state` 執行。

當安裝了本機受管理的 Gateway 服務並啟用重啟功能時，套件管理器更新會在替換套件樹之前停止執行中的服務，然後從更新後的安裝重新整理服務中繼資料，重新啟動服務，並在報告成功前驗證重新啟動的 Gateway 回報了預期的版本。在 macOS 上，更新後的檢查還會驗證 LaunchAgent 是否已針對啟用的設定檔載入/執行，以及設定的 loopback 連接埠是否健全。如果 plist 已安裝但 launchd 未監督它，OpenClaw 會自動重新啟動 LaunchAgent，然後重新執行健全狀態/版本/管道就緒檢查。全新的啟動會直接載入 RunAtLoad 任務，因此更新復原不會立即 `kickstart -k` 新產生的 Gateway。如果 Gateway 仍然無法變為健全狀態，該指令會以非零狀態碼結束，並印出重啟日誌路徑以及明確的重啟、重新安裝和套件回滾指示。使用 `--no-restart` 時，套件替換仍會執行，但受管理的服務不會被停止或重新啟動，因此執行中的 Gateway 可能會保留舊程式碼，直到您手動重新啟動它為止。

## Git checkout 流程

### 管道選擇

- `stable`：checkout 最新的非 beta 標籤，然後建置並執行 doctor。
- `beta`：偏好最新的 `-beta` 標籤，但在 beta 缺失或較舊時回退到最新的穩定版標籤。
- `dev`：切換至 `main`，然後獲取並變基。

### 更新步驟

<Steps>
  <Step title="驗證乾淨的工作樹">要求沒有未提交的變更。</Step>
  <Step title="切換頻道">切換至選定的頻道（標籤或分支）。</Step>
  <Step title="獲取上游">僅限開發版。</Step>
  <Step title="預檢構建（僅限開發版）">在臨時工作樹中執行 TypeScript 構建。如果頂端提交失敗，則最多回溯 10 個提交以尋找最新的可構建提交。設定 `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` 可在此預檢期間同時執行 lint；由於用戶更新主機通常小於 CI 執行器，lint 將在受約束的序列模式下執行。</Step>
  <Step title="變基">變基至選定的提交（僅限開發版）。</Step>
  <Step title="安裝依賴">使用倉庫套件管理器。對於 pnpm 檢出，更新程式會按需自舉 `pnpm`（先透過 `corepack`，然後是臨時的 `npm install pnpm@10` 備選方案），而不是在 pnpm 工作區內執行 `npm run build`。</Step>
  <Step title="構建控制 UI">構建閘道和控制 UI。</Step>
  <Step title="執行診斷">`openclaw doctor` 作為最終的安全更新檢查執行。</Step>
  <Step title="同步外掛">將外掛同步至啟用頻道。開發版使用捆綁外掛；穩定版和 Beta 版使用 npm。更新已追蹤的外掛安裝。</Step>
</Steps>

在 beta 更新頻道上，追蹤並跟隨 default/latest 路線的 npm 和 ClawHub 外掛安裝會先嘗試外掛的 `@beta` 版本。如果該外掛沒有 beta 版本，OpenClaw 會退回到記錄的 default/latest 規格。對於 npm 外掛，如果 beta 套件存在但安裝驗證失敗，OpenClaw 也會退回。確切版本和明確標籤不會被重寫。

<Warning>如果確切鎖定的 npm 外掛更新解析到的構件完整性與儲存的安裝記錄不同，`openclaw update` 將中止該外掛構件的更新，而不是安裝它。請在確認您信任新構件後，才重新安裝或明確更新該外掛。</Warning>

<Note>
限於受管理外掛的更新後外掛同步失敗，會在核心更新成功後以警告形式回報。JSON 結果會保持頂層更新 `status: "ok"`，並報告 `postUpdate.plugins.status: "warning"`，同時附上 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 的指引。非預期的更新程式或同步異常仍會導致更新結果失敗。請修正外掛安裝或更新錯誤，然後重新執行 `openclaw doctor --fix` 或 `openclaw update`。

當更新後的 Gateway 啟動時，外掛載入僅進行驗證：啟動過程不會執行套件管理器或修改相依性樹。套件管理器 `update.run` 重新啟動會在套件樹交換後，略過正常的閒置延遲和重新啟動冷卻，因此舊程序無法繼續延遲載入已移除的區塊。

如果 pnpm bootstrap 仍然失敗，更新程式會提前停止並顯示套件管理器特定的錯誤，而不是在 checkout 內嘗試 `npm run build`。

</Note>

## `--update` 簡寫

`openclaw --update` 會重寫為 `openclaw update` （適用於 shell 和啟動器腳本）。

## 相關

- `openclaw doctor` （在 git checkout 時提議先執行更新）
- [開發頻道](/zh-Hant/install/development-channels)
- [更新](/zh-Hant/install/updating)
- [CLI 參考](/zh-Hant/cli)
