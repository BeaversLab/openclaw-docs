---
summary: "安全更新 OpenClaw（全域安裝或原始碼），以及回滾策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

保持 OpenClaw 為最新版本。

## 建議：`openclaw update`

最快的更新方式。它會偵測您的安裝類型（npm 或 git），擷取最新版本，執行 `openclaw doctor`，並重新啟動 gateway。

```bash
openclaw update
```

若要切換通道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` 偏好 beta，但當 beta 標籤遺失或比最新穩定版舊時，執行時會退回至穩定版/最新版。如果您想要一次性套用原始的 npm beta dist-tag，請使用 `--tag beta`。

關於版本通道的語意，請參閱[開發通道](/zh-Hant/install/development-channels)。

## 替代方案：重新執行安裝程式

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

新增 `--no-onboard` 以跳過入門引導。若是從原始碼安裝，請傳入 `--install-method git --no-onboard`。

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

## 自動更新程式

自動更新程式預設為關閉。在 `~/.openclaw/openclaw.json` 中啟用它：

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

| 通道     | 行為                                                                                       |
| -------- | ------------------------------------------------------------------------------------------ |
| `stable` | 等待 `stableDelayHours`，然後套用並在 `stableJitterHours` 之間加上決定性抖動（分批推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 檢查一次（預設：每小時）並立即套用。                         |
| `dev`    | 不自動套用。請手動使用 `openclaw update`。                                                 |

Gateway 也會在啟動時記錄更新提示（使用 `update.checkOnStart: false` 停用）。

## 更新後

<Steps>

### 執行 doctor

```bash
openclaw doctor
```

遷移設定、稽核 DM 原則，並檢查 Gateway 健康狀態。詳情：[Doctor](/zh-Hant/gateway/doctor)

### 重新啟動 Gateway

```bash
openclaw gateway restart
```

### 驗證

```bash
openclaw health
```

</Steps>

## 回滾

### 釘選版本 (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

提示：`npm view openclaw version` 會顯示當前發布的版本。

### 釘選提交 (source)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

若要回到最新版：`git checkout main && git pull`。

## 如果您遇到困難

- 再次執行 `openclaw doctor` 並仔細閱讀輸出內容。
- 對於原始碼檢出上的 `openclaw update --channel dev`，更新程式會在需要時自動引導 `pnpm`。如果您看到 pnpm/corepack 引導錯誤，請手動安裝 `pnpm`（或重新啟用 `corepack`）並重新執行更新。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中詢問：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相關

- [安裝概覽](/zh-Hant/install) — 所有安裝方法
- [醫生工具](/zh-Hant/gateway/doctor) — 更新後的健康檢查
- [遷移](/zh-Hant/install/migrating) — 主要版本遷移指南
