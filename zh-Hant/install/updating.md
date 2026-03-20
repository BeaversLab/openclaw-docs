---
summary: "安全地更新 OpenClaw（全局安裝或原始碼），以及回滾策略"
read_when:
  - 更新 OpenClaw
  - 更新後發生問題
title: "更新"
---

# 更新

OpenClaw 發展迅速（“1.0”之前）。請將更新視為發布基礎架構：更新 → 執行檢查 → 重新啟動（或使用 `openclaw update`，其中包含重新啟動）→ 驗證。

## 建議：重新執行網站安裝程式（原地升級）

**首選**的更新方式是從網站重新執行安裝程式。它會
偵測現有的安裝，原地升級，並在
需要時執行 `openclaw doctor`。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

備註：

- 如果您不希望再次執行入門引導，請新增 `--no-onboard`。
- 對於 **從原始碼安裝**，請使用：

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  只有在 repo 乾淨時，安裝程式才會 `git pull --rebase`。

- 對於 **全域安裝**，該腳本底層使用 `npm install -g openclaw@latest`。
- 舊版備註：`clawdbot` 作為相容性 shim 仍然可用。

## 更新前

- 了解您的安裝方式：**全域**（npm/pnpm）與 **從原始碼**（git clone）。
- 了解您的 Gateway 執行方式：**前景終端機** 與 **監控服務**（launchd/systemd）。
- 對您的設定進行快照：
  - 設定：`~/.openclaw/openclaw.json`
  - 憑證：`~/.openclaw/credentials/`
  - 工作區：`~/.openclaw/workspace`

## 更新（全域安裝）

全域安裝（擇一）：

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

我們**不**建議在 Gateway 執行時期使用 Bun（WhatsApp/Telegram 錯誤）。

若要切換更新頻道（git + npm 安裝）：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

使用 `--tag <dist-tag|version|spec>` 進行一次性套件目標覆蓋。

若要透過套件管理器安裝取得目前的 GitHub `main` head：

```bash
openclaw update --tag main
```

手動對等操作：

```bash
npm i -g github:openclaw/openclaw#main
```

```bash
pnpm add -g github:openclaw/openclaw#main
```

您也可以傳遞明確的套件規格給 `--tag` 以進行一次性更新（例如 GitHub ref 或 tarball URL）。

請參閱[開發頻道](/zh-Hant/install/development-channels)以了解頻道語意和發布說明。

注意：在 npm 安裝上，gateway 會在啟動時記錄更新提示（檢查目前的頻道標籤）。透過 `update.checkOnStart: false` 停用。

### 核心自動更新程式（可選）

自動更新程式**預設為關閉**，這是一個核心 Gateway 功能（不是外掛）。

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

- `stable`：當發現新版本時，OpenClaw 會等待 `stableDelayHours`，然後在 `stableJitterHours` 內套用確定性個別安裝抖動（分階段推出）。
- `beta`：依 `betaCheckIntervalHours` 週期檢查（預設：每小時）並在有更新時套用。
- `dev`：不自動套用；使用手動 `openclaw update`。

使用 `openclaw update --dry-run` 在啟用自動化之前預覽更新動作。

接著：

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

備註：

- 如果您的 Gateway 以服務形式執行，建議優先使用 `openclaw gateway restart` 而非終止 PID。
- 如果您鎖定了特定版本，請參閱下方的「回滾 / 鎖定」。

## 更新 (`openclaw update`)

對於 **原始碼安裝**（git checkout），建議：

```bash
openclaw update
```

它執行一個相對安全的更新流程：

- 需要乾淨的工作樹 (worktree)。
- 切換至選定的通道 (tag 或 branch)。
- 對設定的上游進行 fetch 和 rebase (dev channel)。
- 安裝相依套件、建置、建置 Control UI，並執行 `openclaw doctor`。
- 預設會重新啟動 gateway（使用 `--no-restart` 以跳過）。

如果您是透過 **npm/pnpm** 安裝（無 git 元資料），`openclaw update` 將嘗試透過您的套件管理員進行更新。如果無法偵測安裝，請改用「更新 (全域安裝)」。

## 更新 (Control UI / RPC)

Control UI 具有 **更新並重新啟動** 功能（RPC：`update.run`）。它會：

1. 執行與 `openclaw update` 相同的原始碼更新流程（僅限 git checkout）。
2. 寫入包含結構化報告 (stdout/stderr 結尾) 的重新啟動標記。
3. 重新啟動 gateway 並將報告傳送至最後一個作用中的 session。

如果 rebase 失敗，gateway 將中止並重新啟動而不套用更新。

## 更新 (從原始碼)

從 repo checkout：

建議：

```bash
openclaw update
```

手動（約略同等）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health
```

備註：

- `pnpm build` 在您執行打包的 `openclaw` 二進位檔 ([`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)) 或使用 Node 執行 `dist/` 時很重要。
- 如果您從 repo checkout 執行但未全域安裝，請使用 `pnpm openclaw ...` 來執行 CLI 指令。
- 如果您直接從 TypeScript 執行 (`pnpm openclaw ...`)，通常不需要重新建置，但 **組態遷移仍然適用** → 請執行 doctor。
- 在全域安裝和 git 安裝之間切換很簡單：先安裝另一種版本，然後執行 `openclaw doctor`，以便將 Gateway 服務進入點重寫為目前的安裝。

## 始終執行：`openclaw doctor`

Doctor 是「安全更新」指令。它特意設計得很無聊：修復 + 遷移 + 警告。

注意：如果您使用的是 **原始碼安裝** (git checkout)，`openclaw doctor` 會建議先執行 `openclaw update`。

它通常會執行以下操作：

- 遷移已棄用的組態鍵 / 舊版組態檔案位置。
- 稽核 DM 原則並針對有風險的「開放」設定發出警告。
- 檢查 Gateway 健康狀況並可建議重新啟動。
- 偵測並將較舊的 Gateway 服務 (launchd/systemd; 舊版 schtasks) 遷移至目前的 OpenClaw 服務。
- 在 Linux 上，確保 systemd 使用者持續性 (lingering) (以便 Gateway 在登出後仍能運作)。

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

如果您是在受監督模式下：

- macOS launchd (應用程式套件組合的 LaunchAgent)：`launchctl kickstart -k gui/$UID/ai.openclaw.gateway` (使用 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 仍然有效)
- Linux systemd 使用者服務：`systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows (WSL2)：`systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` 僅在已安裝服務時有效；否則請執行 `openclaw gateway install`。

手冊 + 確切服務標籤：[Gateway 手冊](/zh-Hant/gateway)

## 還原 / 釘選版本 (當發生問題時)

### 釘選版本 (全域安裝)

安裝已知良好的版本 (將 `<version>` 替換為最後一個可運作的版本)：

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

提示：若要查看目前發布的版本，請執行 `npm view openclaw version`。

然後重新啟動 + 重新執行 doctor：

```bash
openclaw doctor
openclaw gateway restart
```

### 依日期釘選版本 (原始碼)

從特定日期選擇一個提交 (例如：「截至 2026-01-01 的 main 狀態」)：

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

然後重新安裝相依套件 + 重新啟動：

```bash
pnpm install
pnpm build
openclaw gateway restart
```

如果您之後想回到最新版本：

```bash
git checkout main
git pull
```

## 如果您遇到困難

- 請再次執行 `openclaw doctor` 並仔細閱讀輸出內容 (它通常會告訴您解決方法)。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中詢問：[https://discord.gg/clawd](https://discord.gg/clawd)

import en from "/components/footer/en.mdx";

<en />
