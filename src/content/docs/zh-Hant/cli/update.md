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
更新會透過 [更新](/zh-Hant/install/updating) 中的套件管理器流程進行。

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
  當核心更新成功後需要修復損壞或無法載入的受管理外掛時的 `postUpdate.plugins.warnings`、
  當外掛沒有 beta 版本時的 beta 頻道外掛回退細節，以及
  在更新後外掛同步期間偵測到 npm 外掛產品漂移時的 `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每步驟的逾時時間（預設為 1800 秒）。
- `--yes`：跳過確認提示（例如降級確認）。

`openclaw update` 沒有 `--verbose` 標誌。使用 `--dry-run` 來預覽
計劃的 channel/tag/install/restart 動作，使用 `--json` 取得機器可讀取的
結果，並在您只需要 channel 和
可用性詳細資訊時使用 `openclaw update status --json`。如果您正在更新周圍的 Gateway 日誌進行除錯，
console verbosity 和檔案 log level 是分開的：Gateway `--verbose` 影響
終端機/WebSocket 輸出，而檔案日誌則需要設定中的 `logging.level: "debug"` 或
`"trace"`。請參閱 [Gateway logging](/zh-Hant/gateway/logging)。

<Note>在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，會變動的 `openclaw update` 執行作業已停用。請改為更新此安裝的 Nix source 或 flake input；對於 nix-openclaw，請使用以 agent 為主的 [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。`openclaw update status` 和 `openclaw update --dry-run` 保持唯讀。</Note>

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

Gateway 核心自動更新程式（當透過設定啟用時）會在即時 Gateway 請求處理程序之外啟動 CLI 更新路徑。
Control-plane `update.run` 套件管理器更新也使用受管理服務的移交，而不是在
即時 Gateway 程序內替換套件樹。Gateway 會啟動一個 detached helper，然後退出，
helper 會從 Gateway 程序樹外部執行正常的 `openclaw update --yes --json` CLI 路徑。
如果該移交不可用，`update.run` 會傳回結構化回應，其中包含要手動執行的安全 shell 指令。

對於透過套件管理器安裝的情況，`openclaw update` 會在呼叫套件管理器之前解析目標套件版本。npm 全域安裝使用分階段安裝：OpenClaw 會將新套件安裝到暫時的 npm 前綴路徑，驗證其中的已封裝 `dist` 清單，然後將該乾淨的套件樹交換到真正的全域前綴路徑中。如果驗證失敗，更新後的診斷、外掛同步與重啟作業將不會從可疑的套件樹執行。即使安裝的版本已經符合目標，該指令仍會重新整理全域套件安裝，接著執行外掛同步、核心指令補完重新整理，以及重啟作業。這能讓已封裝的 Sidecar 與頻道擁有的外掛紀錄與已安裝的 OpenClaw 版本保持一致，至於完整的外掛指令補完重建則留給明確的 `openclaw completion --write-state` 執行來處理。

當安裝了本機管理的 Gateway 服務並啟用重啟功能時，套件管理器更新會在替換套件樹之前停止執行中的服務，接著從更新後的安裝重新整理服務中繼資料，重新啟動服務，並在回報 `Gateway: restarted and verified.` 之前驗證重新啟動的 Gateway 是否回報預期版本。在 macOS 上，更新後的檢查也會驗證 LaunchAgent 是否已針對現用設定檔載入/執行，以及設定的迴路連接埠是否健康。如果 plist 已安裝但 launchd 未監管它，OpenClaw 會自動重新啟動 LaunchAgent，然後重新執行健康狀態/版本/頻道就緒檢查。全新的啟動程序會直接載入 RunAtLoad 工作，因此更新修復不會立即 `kickstart -k` 新產生的 Gateway。如果 Gateway 仍未恢復健康狀態，指令會以非零值結束，並列印重啟日誌路徑以及明確的重啟、重新安裝與套件還原指示。如果無法執行重啟，指令會列印 `Gateway: restart skipped (...)` 或 `Gateway: restart failed: ...`，並附上手動 `openclaw gateway restart` 提示。若使用 `--no-restart`，套件替換仍會執行，但受管理的服務不會被停止或重新啟動，因此執行中的 Gateway 可能會保留舊程式碼，直到您手動重新啟動它。

### Control-plane 回傳結構

當透過 Gateway 控制平面在套件管理器安裝上呼叫 `update.run` 時，處理程序會分別回報移交啟動與 Gateway 退出後持續進行的 CLI 更新：

- `ok: true`、`result.status: "skipped"`、
  `result.reason: "managed-service-handoff-started"` 和
  `handoff.status: "started"` 表示 Gateway 已建立受管理服務移交並排程了自己的重新啟動，以便分離的輔助程式能在即時服務程序之外執行 `openclaw update --yes --json`。
- `ok: false`、`result.reason: "managed-service-handoff-unavailable"` 和
  `handoff.status: "unavailable"` 表示 OpenClaw 無法找到安全的監督服務邊界以進行移交。回應包含 `handoff.command`，即從 Gateway 外部執行的 shell 指令。
- `ok: false`、`result.reason: "managed-service-handoff-failed"` 表示
  Gateway 嘗試建立移交但無法產生分離的輔助程式。

`sentinel` 有效負載仍會在 Gateway 退出前寫入，且在受管理服務重新啟動健康檢查完成後，CLI 會更新相同的重新啟動哨兵。在移交期間，哨兵可能攜帶 `stats.reason: "restart-health-pending"` 而沒有成功延續；重新啟動的 Gateway 會持續輪詢它，並僅在 CLI 驗證服務健康狀態並以最終的 `ok` 結果重寫哨兵後才觸發延續。當該哨兵處於擱置或失敗狀態時，`openclaw status` 和 `openclaw status --all` 會顯示 `Update restart` 列，而 `update.status` 則會傳回最新的快取哨兵。

## Git checkout 流程

### 頻道選擇

- `stable`：checkout 最新的非 beta 標籤，然後建置與檢查。
- `beta`：優先使用最新的 `-beta` 標籤，但在 beta 缺失或較舊時則退回至最新的穩定版標籤。
- `dev`：checkout `main`，然後 fetch 和 rebase。

### 更新步驟

<Steps>
  <Step title="驗證乾淨的工作目錄">需要沒有未提交的變更。</Step>
  <Step title="切換頻道">切換至選取的頻道 (標籤或分支)。</Step>
  <Step title="取得上游">僅限 Dev。</Step>
  <Step title="預檢建構 (僅限 dev)">在臨時工作樹中執行 TypeScript 建構。如果最新提交失敗，會向上回溯最多 10 個提交以尋找最新可建構的提交。設定 `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` 可在此預檢期間同時執行 lint；由於用戶更新主機通常小於 CI 執行器，lint 會在受限的序列模式中執行。</Step>
  <Step title="變基重整">對選取的提交進行變基重整 (僅限 dev)。</Step>
  <Step title="安裝相依套件">使用儲存庫套件管理員。對於 pnpm 檢出，更新程式會按需啟動引導 `pnpm` (先透過 `corepack`，然後是暫時的 `npm install pnpm@11` 後備方案)，而不是在 pnpm 工作區內執行 `npm run build`。</Step>
  <Step title="建構 Control UI">建構閘道與 Control UI。</Step>
  <Step title="執行醫生">`openclaw doctor` 作為最終的安全更新檢查執行。</Step>
  <Step title="同步外掛">將外掛同步至啟用中的頻道。Dev 使用打包的外掛；stable 和 beta 使用 npm。更新已追蹤的外掛安裝。</Step>
</Steps>

在 beta 更新頻道上，追蹤遵循 default/latest 版線的 npm 和 ClawHub 外掛安裝會先嘗試外掛的 `@beta` 版本。如果外掛沒有 beta 版本，OpenClaw 會退回到記錄的 default/latest 規格並將其報告為警告。對於 npm 外掛，如果 beta 套件存在但安裝驗證失敗，OpenClaw 也會退回。這些外掛退回警告不會導致核心更新失敗。確切版本和明確標籤不會被重寫。

<Warning>如果精確鎖定的 npm 插件更新解析為其完整性與存儲的安裝記錄不同的工件，`openclaw update` 將中止該插件工件的更新而不是安裝它。僅在您驗證信任新工件後，才重新安裝或顯式更新該插件。</Warning>

<Note>
核心更新成功後，若針對受管理外掛且同步路徑可繞道的更新後外掛同步失敗（例如非必要外掛的 npm registry 無法連線），將以警告形式回報。JSON 結果會保留頂層更新 `status: "ok"` 並回報 `postUpdate.plugins.status: "warning"`，附帶 `openclaw doctor --fix` 與 `openclaw plugins inspect <id> --runtime --json` 的指引。未預期的更新程式或同步例外仍會導致更新結果失敗。請修正外掛安裝或更新錯誤，然後重新執行 `openclaw doctor --fix` 或 `openclaw update`。

在逐個外掛的同步步驟之後，`openclaw update` 會在重新啟動閘道之前執行強制的 **後核心收斂（post-core convergence）** 通過檢查：它會修復遺失的已設定外掛內容、驗證磁碟上每一個「使用中」的追蹤安裝記錄，並靜態驗證其 `package.json` 可解析（且任何明確宣告的 `main` 都存在）。此通過檢查的失敗——以及無效的 OpenClaw 設定快照——會回傳 `postUpdate.plugins.status: "error"` 並將頂層更新 `status` 切換為 `"error"`，因此 `openclaw update` 會以非零狀態碼結束，且閘道「不會」以未驗證的外掛集重新啟動。錯誤訊息包含結構化的 `postUpdate.plugins.warnings[].guidance` 行，指向 `openclaw doctor --fix` 與 `openclaw plugins inspect <id> --runtime --json` 以供後續跟進。已停用的外掛條目以及非信任來源連結的官方同步目標記錄會在此處略過，映照遺失內容檢查所採用的 `skipDisabledPlugins` 原則，因此過期的停用外掛記錄不會阻擋其餘有效的更新。

當更新後的 Gateway 啟動時，外掛載入僅做驗證：啟動過程不會執行套件管理員或修改依賴樹。套件管理員 `update.run` 的重新啟動會交給 CLI 的受管理服務路徑，因此套件置換會在舊 Gateway 程序之外發生，並由服務健康檢查決定更新是否能回報為完成。

若 pnpm bootstrap 仍然失敗，更新程式會提早停止並回報套件管理員專屬錯誤，而不會嘗試在 checkout 內執行 `npm run build`。

</Note>

## `--update` 簡寫

`openclaw --update` 重寫為 `openclaw update`（適用於 shell 和啟動器腳本）。

## 相關

- `openclaw doctor`（在 git checkout 時提供先執行 update）
- [開發頻道](/zh-Hant/install/development-channels)
- [更新](/zh-Hant/install/updating)
- [CLI 參考](/zh-Hant/cli)
