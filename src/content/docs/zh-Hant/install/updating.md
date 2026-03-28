---
summary: "安全更新 OpenClaw（全域安裝或原始碼），以及還原策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

保持 OpenClaw 為最新狀態。

## 建議：`openclaw update`

最快的更新方式。它會偵測您的安裝類型（npm 或 git）、擷取最新版本、執行 `openclaw doctor`，然後重新啟動閘道。

```exec
openclaw update
```

若要切換通道或指定特定版本：

```exec
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

請參閱 [開發通道](/zh-Hant/install/development-channels) 以了解通道語意。

## 替代方案：重新執行安裝程式

```exec
curl -fsSL https://openclaw.ai/install.sh | bash
```

加入 `--no-onboard` 以跳過新手引導。若為原始碼安裝，請傳入 `--install-method git --no-onboard`。

## 替代方案：手動 npm 或 pnpm

```exec
npm i -g openclaw@latest
```

```exec
pnpm add -g openclaw@latest
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

| 通道     | 行為                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然後在 `stableJitterHours` 內應用確定性抖動（分批推出）。 |
| `beta`   | 每 `betaCheckIntervalHours` 檢查一次（預設：每小時）並立即應用。                   |
| `dev`    | 不自動應用。請手動使用 `openclaw update`。                                         |

閘道也會在啟動時記錄更新提示（使用 `update.checkOnStart: false` 停用）。

## 更新後

<Steps>

### 執行檢查工具

```exec
openclaw doctor
```

遷移設定、稽核 DM 原則並檢查閘道健康狀況。詳細資訊：[Doctor](/zh-Hant/gateway/doctor)

### 重新啟動閘道

```exec
openclaw gateway restart
```

### 驗證

```exec
openclaw health
```

</Steps>

## 還原

### 鎖定版本 (npm)

```exec
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

提示：`npm view openclaw version` 會顯示目前發布的版本。

### 鎖定提交 (source)

```exec
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

若要回到最新版本：`git checkout main && git pull`。

## 如果您遇到困難

- 再次執行 `openclaw doctor` 並仔細閱讀輸出內容。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中提問：[https://discord.gg/clawd](https://discord.gg/clawd)
