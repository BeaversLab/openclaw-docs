---
summary: "安全更新 OpenClaw（全域安裝或原始碼），以及回滾策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

保持 OpenClaw 為最新版本。

## 建議使用：`openclaw update`

最快的更新方式。它會偵測您的安裝類型（npm 或 git），取得最新版本，執行 `openclaw doctor`，並重新啟動閘道。

```bash
openclaw update
```

若要切換通道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` 偏好 beta 版，但在 beta 標籤缺失或比最新穩定版舊時，執行階段會回退至 stable/latest。若您想要一次性套件更新的原始 npm beta dist-tag，請使用 `--tag beta`。

請參閱 [Development channels](/zh-Hant/install/development-channels) 以了解頻道語意。

## 替代方案：重新執行安裝程式

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

新增 `--no-onboard` 以跳過入門引導。若是原始碼安裝，請傳遞 `--install-method git --no-onboard`。

## 替代方案：手動使用 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Root 擁有的全域 npm 安裝

部分 Linux npm 設定會在 root 擁有的目錄下安裝全域套件，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 支援該配置：已安裝的套件在執行時會被視為唯讀，且外掛執行階段的相依性會被部署至可寫入的執行階段目錄，而非直接修改套件樹。

對於強化的 systemd 單元，請設定一個包含在 `ReadWritePaths` 中的可寫入暫存目錄：

```ini
Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
```

若未設定 `OPENCLAW_PLUGIN_STAGE_DIR`，OpenClaw 在 systemd 提供時會使用 `$STATE_DIRECTORY`，否則會回退至 `~/.openclaw/plugin-runtime-deps`。

## 自動更新程式

自動更新程式預設為關閉。請在 `~/.openclaw/openclaw.json` 中啟用它：

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| 頻道     | 行為                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| `stable` | 等待 `stableDelayHours`，然後在 `stableJitterHours` 內套用決定性抖動（分階段推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 檢查一次（預設：每小時）並立即套用。                   |
| `dev`    | 不自動套用。請手動使用 `openclaw update`。                                           |

閘道也會在啟動時記錄更新提示（可用 `update.checkOnStart: false` 停用）。

## 更新後

<Steps>

### 執行 doctor

```bash
openclaw doctor
```

遷移設定、稽核 DM 策略，並檢查閘道健康狀態。詳情：[Doctor](/zh-Hant/gateway/doctor)

### 重新啟動閘道

```bash
openclaw gateway restart
```

### 驗證

```bash
openclaw health
```

</Steps>

## 還原

### 鎖定版本 (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

提示：`npm view openclaw version` 顯示當前發佈的版本。

### 鎖定提交

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

若要返回最新版本：`git checkout main && git pull`。

## 如果您遇到問題

- 再次執行 `openclaw doctor` 並仔細閱讀輸出內容。
- 對於原始碼結帳中的 `openclaw update --channel dev`，更新程式會在需要時自動引導 `pnpm`。如果您看到 pnpm/corepack 引導錯誤，請手動安裝 `pnpm`（或重新啟用 `corepack`）並重新執行更新。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中提問：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相關

- [安裝概覽](/zh-Hant/install) — 所有安裝方式
- [Doctor](/zh-Hant/gateway/doctor) — 更新後的健康檢查
- [遷移](/zh-Hant/install/migrating) — 主要版本遷移指南
