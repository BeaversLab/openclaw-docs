---
summary: "`openclaw update` 的 CLI 參考資料（相對安全的來源更新 + 閘道自動重新啟動）"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "更新"
---

# `openclaw update`

安全地更新 OpenClaw 並在穩定版/測試版/開發版之間切換。

如果您是透過 **npm/pnpm/bun** 安裝（全域安裝，無 git 元資料），
更新會透過[更新](/zh-Hant/install/updating)中的套件管理員流程進行。

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

- `--no-restart`：在成功更新後略過重新啟動閘道服務。會重新啟動閘道的套件管理員更新會驗證重新啟動的服務回報預期的更新版本，然後指令才會成功。
- `--channel <stable|beta|dev>`：設定更新頻道（git + npm；持久化於設定中）。
- `--tag <dist-tag|version|spec>`：僅針對此次更新覆寫套件目標。對於套件安裝，`main` 對應至 `github:openclaw/openclaw#main`。
- `--dry-run`：預覽計劃的更新動作（頻道/標籤/目標/重新啟動流程），而不寫入設定、安裝、同步外掛或重新啟動。
- `--json`：列印機器可讀取的 `UpdateRunResult` JSON，包括當
  在更新後外掛同步期間偵測到 npm 外掛成品
  漂移時的 `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每步驟逾時（預設為 1800s）。
- `--yes`：略過確認提示（例如降級確認）。

<Warning>降級需要確認，因為較舊的版本可能會導致設定檔損壞。</Warning>

## `update status`

顯示目前的更新頻道 + git 標籤/分支/SHA（針對原始碼簽出），以及是否有可用更新。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

選項：

- `--json`：列印機器可讀取的狀態 JSON。
- `--timeout <seconds>`：檢查逾時（預設為 3s）。

## `update wizard`

互動式流程以選擇更新頻道並確認更新後是否重新啟動閘道
（預設為重新啟動）。如果您在沒有 git checkout 的情況下選擇 `dev`，它
會提供建立一個。

選項：

- `--timeout <seconds>`：每個更新步驟的逾時（預設 `1800`）

## 運作方式

當您明確切換頻道 (`--channel ...`) 時，OpenClaw 也會保持
安裝方法一致：

- `dev` → 確保是 git checkout (預設：`~/openclaw`，可透過 `OPENCLAW_GIT_DIR` 覆蓋)，
  更新它，並從該 checkout 安裝全域 CLI。
- `stable` → 使用 `latest` 從 npm 安裝。
- `beta` → 偏好 npm dist-tag `beta`，但當 beta
  遺失或比目前的穩定版舊時，會退回到 `latest`。

Gateway 核心自動更新程式（透過設定啟用時）會重複使用此相同的更新路徑。

對於套件管理器安裝，`openclaw update` 會在呼叫套件管理器之前解析目標套件
版本。npm 全域安裝使用分階段安裝：OpenClaw 將新套件安裝到暫時的 npm 前綴，驗證
那裡打包的 `dist` 清單，然後將該乾淨的套件樹交換到
真實的全域前綴中。如果驗證失敗，更新後的診斷、外掛同步和
重啟工作不會從可疑的樹執行。即使已安裝的版本
已經符合目標，該指令也會重新整理全域套件安裝，
然後執行外掛同步、核心指令補齊重新整理以及重啟工作。這
能保持打包的 sidecar 和頻道擁有的外掛記錄與
已安裝的 OpenClaw 版本一致，同時將完整的外掛指令補齊重建留給
明確的 `openclaw completion --write-state` 執行。

## Git 檢出流程

### 頻道選擇

- `stable`：checkout 最新的非 beta tag，然後建置和診斷。
- `beta`：偏好最新的 `-beta` tag，但當 beta 遺失或較舊時退回到最新的穩定 tag。
- `dev`：checkout `main`，然後 fetch 和 rebase。

### 更新步驟

<Steps>
  <Step title="驗證乾淨的工作區">需要沒有未提交的變更。</Step>
  <Step title="切換頻道">切換到選定的頻道 (tag 或 branch)。</Step>
  <Step title="取得上游">僅限開發版本。</Step>
  <Step title="預先建構（僅限開發版）">在臨時工作樹中執行 lint 和 TypeScript 建構。如果最新版本失敗，會回溯最多 10 個 commit 以尋找最新的乾淨建構。</Step>
  <Step title="變基">對選定的 commit 進行變基（僅限開發版）。</Step>
  <Step title="安裝相依套件">使用專案套件管理器。對於 pnpm 檢出，更新程式會按需引導 `pnpm`（首先透過 `corepack`，然後是臨時的 `npm install pnpm@10` 後援），而不是在 pnpm workspace 中執行 `npm run build`。</Step>
  <Step title="建構控制 UI">建構 gateway 和控制 UI。</Step>
  <Step title="執行 doctor">`openclaw doctor` 作為最終的安全更新檢查執行。</Step>
  <Step title="同步外掛程式">將外掛程式同步至使用中頻道。開發版使用內建外掛程式；穩定版和測試版使用 npm。更新透過 npm 安裝的外掛程式。</Step>
</Steps>

<Warning>如果精確鎖定的 npm 外掛程式更新解析出的構件完整性與儲存的安裝記錄不同，`openclaw update` 將中止該外掛程式構件的更新，而不是安裝它。僅在驗證您信任新構件後，才明確重新安裝或更新外掛程式。</Warning>

<Note>
更新後的外掛程式同步失敗會導致更新結果失敗，並停止後續的重啟工作。修復外掛程式安裝或更新錯誤，然後重新執行 `openclaw update`。

當更新後的 Gateway 啟動時，已啟用的內建外掛程式執行階段相依項會在外掛程式啟動之前進行暫存。更新觸發的重啟會在關閉 Gateway 之前清空所有進行中的執行階段相依項暫存，因此服務管理器重啟不會中斷正在進行的 npm 安裝。

如果 pnpm 引導仍然失敗，更新程式會提前停止並顯示套件管理器特定的錯誤，而不是在檢出中嘗試 `npm run build`。

</Note>

## `--update` 簡寫

`openclaw --update` 重寫為 `openclaw update`（對 shell 和啟動器腳本很有用）。

## 相關

- `openclaw doctor`（在 git checkout 上提供先執行 update）
- [開發頻道](/zh-Hant/install/development-channels)
- [更新](/zh-Hant/install/updating)
- [CLI 參考](/zh-Hant/cli)
