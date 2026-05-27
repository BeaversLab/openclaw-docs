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

如果您透過 **npm/pnpm/bun** 安裝（全域安裝，無 git 中繼資料），
更新會透過 [Updating](/zh-Hant/install/updating) 中的套件管理員流程進行。

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
- `--tag <dist-tag|version|spec>`：僅針對此次更新覆寫套件目標。對於套件安裝，`main` 對應至 `github:openclaw/openclaw#main`；在暫存的全域 npm 安裝之前，GitHub/git 來源規格會被打包成臨時 tarball。
- `--dry-run`：預覽計畫的更新動作（頻道/標籤/目標/重新啟動流程），而不寫入設定、安裝、同步外掛或重新啟動。
- `--json`：列印機器可讀取的 `UpdateRunResult` JSON，包括
  當核心更新成功後需要修復損壞或無法載入的受管理外掛時的 `postUpdate.plugins.warnings`、
  當外掛沒有 beta 版本時的 beta 頻道外掛回退細節，以及
  在更新後外掛同步期間偵測到 npm 外掛產品漂移時的 `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每步驟的逾時時間（預設為 1800 秒）。
- `--yes`：跳過確認提示（例如降級確認）。

`openclaw update` 沒有 `--verbose` 標誌。使用 `--dry-run` 預覽
計劃的 channel/tag/install/restart 動作，使用 `--json` 取得機器可讀
結果，並在您只需要 channel 和
可用性詳情時使用 `openclaw update status --json`。如果您正在針對更新進行 Gateway 日誌的偵錯，
主機詳細程度和檔案日誌等級是分開的：Gateway `--verbose` 影響
終端機/WebSocket 輸出，而檔案日誌則需要在設定中設定 `logging.level: "debug"` 或
`"trace"`。請參閱 [Gateway logging](/zh-Hant/gateway/logging)。

<Note>在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，會停用變更 `openclaw update` 執行。請改為更新此安裝的 Nix 來源或 flake input；對於 nix-openclaw，請使用以 agent 為主的 [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。`openclaw update status` 和 `openclaw update --dry-run` 保持唯讀狀態。</Note>

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

- `dev` → 確保 git checkout (預設值：`~/openclaw`，或在設定
  `OPENCLAW_HOME` 時為 `$OPENCLAW_HOME/openclaw`；可用 `OPENCLAW_GIT_DIR` 覆寫)，
  對其進行更新，並從該 checkout 安裝全域 CLI。
- `stable` → 使用 `latest` 從 npm 安裝。
- `beta` → 優先使用 npm dist-tag `beta`，但在 beta
  遺失或比目前的穩定版舊時，會退回至 `latest`。

Gateway 核心自動更新程式（透過設定啟用時）會在即時 Gateway 請求處理程序之外啟動 CLI 更新路徑。控制平面 `update.run` 套件管理員更新也會使用受控服務移交，而不是取代即時 Gateway 程序內的套件樹。Gateway 會啟動一個分離的協助程式，然後退出，該協助程式會在 Gateway 程序樹之外執行正常的 `openclaw update --yes --json` CLI 路徑。如果該移交不可用，`update.run` 會傳回一個包含可手動執行的安全 shell 指令的結構化回應。

對於套件管理員安裝，`openclaw update` 會在叫用套件管理員之前解析目標套件版本。npm 全域安裝使用暫存安裝：OpenClaw 會將新套件安裝到臨時 npm 前綴中，在那裡驗證打包的 `dist` 清單，然後將乾淨的套件樹交換到真實的全域前綴中。如果驗證失敗，更新後的診斷、外掛同步和重新啟動工作將不會從可疑樹中執行。即使安裝的版本已經符合目標，該指令也會重新整理全域套件安裝，然後執行外掛同步、核心指令完成重新整理和重新啟動工作。這可以保持打包的 sidecar 和通道擁有的外掛記錄與安裝的 OpenClaw 組建同步，同時將完整的外掛指令完成重新建置留給明確的 `openclaw completion --write-state` 執行。

當安裝了本機受管理的 Gateway 服務並啟用重新啟動時，套件管理程式更新會在替換套件樹之前停止執行中的服務，然後從更新的安裝中重新整理服務中繼資料，重新啟動服務，並在回報 `Gateway: restarted and verified.` 之前驗證重新啟動的 Gateway 回報了預期的版本。在 macOS 上，更新後檢查還會驗證 LaunchAgent 已針對作用中的設定檔載入/執行，且設定的 loopback 連接埠健康。如果 plist 已安裝但 launchd 未監督它，OpenClaw 會自動重新啟動 LaunchAgent，然後重新執行健康狀態/版本/通道就緒檢查。全新的啟動會直接載入 RunAtLoad 工作，因此更新修復不會立即 `kickstart -k` 新產生的 Gateway。如果 Gateway 仍未變為健康狀態，該指令會以非零值結束並列印重新啟動日誌路徑，加上明確的重新啟動、重新安裝和套件還原指示。如果重新啟動無法執行，該指令會列印 `Gateway: restart skipped (...)` 或 `Gateway: restart failed: ...` 並附上手動 `openclaw gateway restart` 提示。使用 `--no-restart` 時，套件替換仍會執行，但受管理的服務不會停止或重新啟動，因此執行中的 Gateway 可能會保留舊程式碼，直到您手動重新啟動它。

### Control-plane 回傳結構

當在套件管理程式安裝上透過 Gateway 控制平面叫用 `update.run` 時，處理程式會分別回報移交啟動與在 Gateway 退出後繼續的 CLI 更新：

- `ok: true`、`result.status: "skipped"`、
  `result.reason: "managed-service-handoff-started"` 和
  `handoff.status: "started"` 表示 Gateway 建立了受管理服務
  移交並排定了自己的重新啟動，以便卸離的協助程式可以在即時服務程序之外執行
  `openclaw update --yes --json`。
- `ok: false`、`result.reason: "managed-service-handoff-unavailable"` 和
  `handoff.status: "unavailable"` 表示 OpenClaw 找不到監督
  服務邊界以進行安全移交。回應包含
  `handoff.command`，這是從 Gateway 外部執行的 Shell 指令。
- `ok: false`，`result.reason: "managed-service-handoff-failed"` 表示
  Gateway 嘗試建立交接（handoff）但無法啟動分離的協助程式。

在 Gateway 退出之前仍會寫入 `sentinel` 載荷，且 CLI
交接會在受控服務重新啟動的健康檢查完成後更新相同的重啟哨兵（restart sentinel）。在交接期間，哨兵可以攜帶
`stats.reason: "restart-health-pending"` 而沒有成功的接續操作；
重新啟動的 Gateway 會持續輪詢它，並且只有在 CLI
驗證服務健康狀態並用最終的 `ok`
結果重寫哨兵後才會觸發接續操作。`openclaw status` 和 `openclaw status --all` 在該哨兵待處理或失敗時會顯示 `Update restart`
列，而 `update.status` 則會傳回
最新的快取哨兵。

## Git checkout 流程

### 頻道選擇

- `stable`：checkout 最新的非 beta 標籤，然後建置和執行 doctor。
- `beta`：優先使用最新的 `-beta` 標籤，但在 beta 缺失或較舊時回退到最新的 stable 標籤。
- `dev`：checkout `main`，然後 fetch 和 rebase。

### 更新步驟

<Steps>
  <Step title="驗證乾淨的工作目錄">需要沒有未提交的變更。</Step>
  <Step title="切換頻道">切換至選取的頻道 (標籤或分支)。</Step>
  <Step title="取得上游">僅限 Dev。</Step>
  <Step title="預檢建置（僅限 dev）">在臨時工作樹中執行 TypeScript 建置。如果尖端（tip）失敗，會往回檢查最多 10 個提交以找到最新的可建置提交。設定 `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` 也可在此預檢期間執行 lint；由於使用者更新主機通常小於 CI 執行器，lint 會以受限序列模式執行。</Step>
  <Step title="變基重整">對選取的提交進行變基重整 (僅限 dev)。</Step>
  <Step title="安裝相依項">使用 repo 的套件管理器。對於 pnpm checkout，更新程式會按需自舉 `pnpm`（先透過 `corepack`，然後是臨時的 `npm install pnpm@11` 後備方案），而不是在 pnpm 工作區內執行 `npm run build`。</Step>
  <Step title="建構 Control UI">建構閘道與 Control UI。</Step>
  <Step title="執行 doctor">`openclaw doctor` 作為最終的安全更新檢查執行。</Step>
  <Step title="同步外掛">將外掛同步至啟用中的頻道。Dev 使用打包的外掛；stable 和 beta 使用 npm。更新已追蹤的外掛安裝。</Step>
</Steps>

在 beta 更新頻道上，遵循 default/latest 路徑的被追蹤 npm 和 ClawHub 外掛安裝會先嘗試外掛 `@beta` 發行版本。如果該外掛沒有 beta 發行版本，OpenClaw 會回退到記錄的 default/latest 規格並將其報告為警告。對於 npm 外掛，當 beta 套件存在但安裝驗證失敗時，OpenClaw 也會回退。這些外掛回退警告不會導致核心更新失敗。確切版本和明確標籤不會被重寫。

<Warning>如果確切鎖定的 npm 外掛更新解析為一個完整性與儲存安裝記錄不同的構件，`openclaw update` 會中止該外掛構件更新而不是安裝它。僅在驗證您信任新構件後，才明確地重新安裝或更新該外掛。</Warning>

<Note>
如果更新后的插件同步失败僅限於受管理的插件，且同步路徑可以繞過（例如非必要插件無法存取的 npm 註冊表），則會在核心更新成功後將其報告為警告。JSON 結果會保留頂層的更新 `status: "ok"`，並提供 `postUpdate.plugins.status: "warning"` 以及 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 的指引。未預期的更新程式或同步異常仍會導致更新結果失敗。請修正外掛程式安裝或更新錯誤，然後重新執行 `openclaw doctor --fix` 或 `openclaw update`。

在每個外掛程式的同步步驟之後，`openclaw update` 會在重新啟動閘道之前執行強制的 **核心後收斂 (post-core convergence)** 傳遞：它會修復遺失的已設定外掛程式內容，驗證磁碟上的每個*作用中*追蹤安裝記錄，並靜態驗證其 `package.json` 是否可解析（以及任何明確宣告的 `main` 是否存在）。來自此傳遞的失敗——以及無效的 OpenClaw 設定快照——會傳回 `postUpdate.plugins.status: "error"` 並將頂層更新 `status` 翻轉為 `"error"`，因此 `openclaw update` 會以非零狀態碼退出，且閘道*不會*使用未驗證的外掛程式集重新啟動。錯誤包含結構化的 `postUpdate.plugins.warnings[].guidance` 行，指向 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 以供後續處理。已停用的外掛程式項目和未連結至信任來源的官方同步目標的記錄會在此處跳過，反映遺失內容檢查所使用的 `skipDisabledPlugins` 原則，因此過時的已停用外掛程式記錄無法阻擋其他有效的更新。

當更新後的 Gateway 啟動時，外掛程式載入僅限於驗證：啟動過程不會執行套件管理器或變更相依性樹。套件管理器 `update.run` 重新啟動會交給 CLI 管理服務路徑，因此套件交換作業發生在舊 Gateway 程序之外，且服務健康檢查會決定更新是否可回報為完成。

如果 pnpm bootstrap 仍然失敗，更新程式會提早停止，並顯示套件管理器特定的錯誤，而不是嘗試在 checkout 內執行 `npm run build`。

</Note>

## `--update` 簡寫

`openclaw --update` 會重寫為 `openclaw update`（對 shell 和啟動腳本很有用）。

## 相關

- `openclaw doctor`（在 git checkout 時提議先執行 update）
- [開發頻道](/zh-Hant/install/development-channels)
- [更新](/zh-Hant/install/updating)
- [CLI 參考](/zh-Hant/cli)
