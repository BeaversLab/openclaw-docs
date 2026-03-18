---
summary: "安全地更新 OpenClaw（全域安裝或從原始碼），以及回滾策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

OpenClaw 發展迅速（「1.0」版本之前）。請像處理基礎設施部署一樣對待更新：更新 → 執行檢查 → 重新啟動（或使用 `openclaw update`，它會重新啟動）→ 驗證。

## 建議：重新執行網站安裝程式（原地升級）

**首選**的更新方式是從網站重新執行安裝程式。它會偵測現有的安裝，進行原地升級，並在需要時執行 `openclaw doctor`。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

備註：

- 如果您不希望再次執行入門引導，請新增 `--no-onboard`。
- 對於**從原始碼安裝**，請使用：

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  只有在儲存庫乾淨時，安裝程式才會 `git pull --rebase`。

- 對於**全域安裝**，該腳本在底層使用 `npm install -g openclaw@latest`。
- 舊版備註：`clawdbot` 作為相容性填充層仍然可用。

## 更新之前

- 確認您的安裝方式：**全域** (npm/pnpm) vs **從原始碼** (git clone)。
- 確認您的 Gateway 執行方式：**前景終端機** vs **監控服務** (launchd/systemd)。
- 對您的設定進行快照：
  - 設定：`~/.openclaw/openclaw.json`
  - 憑證：`~/.openclaw/credentials/`
  - 工作區：`~/.openclaw/workspace`

## 更新（全域安裝）

全域安裝（任選其一）：

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

我們**不**推薦將 Bun 用於 Gateway 執行時（WhatsApp/Telegram 錯誤）。

若要切換更新頻道（git + npm 安裝）：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

使用 `--tag <dist-tag|version|spec>` 以進行一次性套件目標覆蓋。

若要透過套件管理員安裝目前的 GitHub `main` head：

```bash
openclaw update --tag main
```

手動對等指令：

```bash
npm i -g github:openclaw/openclaw#main
```

```bash
pnpm add -g github:openclaw/openclaw#main
```

您也可以將明確的套件規格傳遞給 `--tag` 以進行一次性更新（例如 GitHub 參照或 tarball URL）。

請參閱[開發頻道](/zh-Hant/install/development-channels)以了解頻道語義和發行說明。

備註：在 npm 安裝上，Gateway 會在啟動時記錄更新提示（檢查目前的頻道標籤）。透過 `update.checkOnStart: false` 停用。

### 核心自動更新器（選用）

自動更新器**預設關閉**，這是核心 Gateway 功能（不是外掛程式）。

```json
{
  "update": {
    "channel": "stable",
    "auto": {
      "enabled": true,
      "stableDelayHours": 6,
      "stableJitterHours": 12,
      "betaCheckIntervalHours": 1
    }
  }
}
```

行為：

- `stable`：當看到新版本時，OpenClaw 會等待 `stableDelayHours`，然後在 `stableJitterHours` 中套用針對每次安裝的確定性抖動（分階段推出）。
- `beta`：按 `betaCheckIntervalHours` 頻率（預設：每小時）檢查，並在有更新可用時套用。
- `dev`：不自動套用；請使用手動 `openclaw update`。

在啟用自動化之前，請使用 `openclaw update --dry-run` 預覽更新動作。

然後：

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

注意：

- 如果您的 Gateway 作為服務執行，`openclaw gateway restart` 比終止 PID 更好。
- 如果您被鎖定在特定版本，請參閱下方的「回滾 / 鎖定」。

## 更新 (`openclaw update`)

對於 **來源安裝**（git checkout），建議：

```bash
openclaw update
```

它執行一個相對安全的更新流程：

- 需要乾淨的工作樹。
- 切換到選定的通道（標籤或分支）。
- 針對配置的上游（dev 通道）進行擷取 + 變基。
- 安裝依賴、建置、建置 Control UI，並執行 `openclaw doctor`。
- 預設會重新啟動 gateway（使用 `--no-restart` 跳過）。

如果您是透過 **npm/pnpm** 安裝（沒有 git 中繼資料），`openclaw update` 將嘗試透過您的套件管理員更新。如果它無法偵測安裝，請改用「更新 (全域安裝)」。

## 更新 (Control UI / RPC)

Control UI 具有 **更新並重新啟動**（RPC：`update.run`）。它會：

1. 執行與 `openclaw update` 相同的來源更新流程（僅限 git checkout）。
2. 寫入一個帶有結構化報告的重新啟動標記（stdout/stderr tail）。
3. 重新啟動 gateway 並將報告 ping 給最後一個使用中的 session。

如果變基失敗，gateway 將中止並重新啟動而不套用更新。

## 更新 (從來源)

從 repo checkout：

建議：

```bash
openclaw update
```

手動（大致等同）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health
```

注意：

- `pnpm build` 在您執行封裝的 `openclaw` 執行檔（[`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)）或使用 Node 執行 `dist/` 時很重要。
- 如果您透過 repo checkout 執行而未進行全域安裝，請使用 `pnpm openclaw ...` 執行 CLI 指令。
- 如果您直接從 TypeScript 執行（`pnpm openclaw ...`），通常不需要重新建置，但 **組態遷移仍然適用** → 請執行 doctor。
- 在全域安裝和 git 安裝之間切換很簡單：安裝另一個版本，然後執行 `openclaw doctor`，以便將 gateway 服務進入點重寫為當前安裝。

## 始終執行：`openclaw doctor`

Doctor 是「安全更新」指令。它特意設計得很單調：修復 + 遷移 + 警告。

注意：如果您使用的是 **來源安裝** (git checkout)，`openclaw doctor` 將會提議先執行 `openclaw update`。

它通常會執行以下操作：

- 遷移已棄用的組態金鑰 / 舊版組態檔案位置。
- 稽核 DM 政策並在有風險的「開放」設定上發出警告。
- 檢查 Gateway 健康狀況並可提議重新啟動。
- 偵測並將較舊的 gateway 服務 (launchd/systemd；legacy schtasks) 遷移至目前的 OpenClaw 服務。
- 在 Linux 上，確保 systemd user lingering (如此 Gateway 才能在登出後繼續運行)。

詳細資訊：[Doctor](/zh-Hant/gateway/doctor)

## 啟動 / 停止 / 重新啟動 Gateway

CLI (適用於任何作業系統)：

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow
```

如果您受管理：

- macOS launchd (應用程式套件捆綁的 LaunchAgent)：`launchctl kickstart -k gui/$UID/ai.openclaw.gateway` (使用 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 仍然有效)
- Linux systemd 使用者服務：`systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows (WSL2)：`systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` 僅在已安裝服務時有效；否則請執行 `openclaw gateway install`。

操作手冊 + 確切的服務標籤：[Gateway runbook](/zh-Hant/gateway)

## 還原 / 釘選 (當發生問題時)

### 釘選 (全域安裝)

安裝已知正常的版本 (將 `<version>` 替換為最後一個可用的版本)：

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

提示：若要查看當前發布的版本，請執行 `npm view openclaw version`。

然後重新啟動 + 重新執行 doctor：

```bash
openclaw doctor
openclaw gateway restart
```

### 按日期釘選 (來源)

從特定日期選擇一個提交 (範例：「2026-01-01 時 main 的狀態」)：

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

然後重新安裝相依項 + 重新啟動：

```bash
pnpm install
pnpm build
openclaw gateway restart
```

如果您稍後想回到最新版本：

```bash
git checkout main
git pull
```

## 如果您卡住了

- 再次執行 `openclaw doctor` 並仔細閱讀輸出 (它通常會告訴您修復方法)。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中詢問：[https://discord.gg/clawd](https://discord.gg/clawd)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
