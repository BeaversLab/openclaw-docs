---
summary: "安全地更新 OpenClaw（全域安裝或原始碼），以及回滾策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

保持 OpenClaw 為最新版本。

## 建議使用：`openclaw update`

最快的更新方式。它會偵測您的安裝類型（npm 或 git），擷取最新版本，執行 `openclaw doctor`，並重新啟動閘道。

```bash
openclaw update
```

若要切換通道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

請參閱 [開發通道](/en/install/development-channels) 以了解通道語意。

## 替代方案：重新執行安裝程式

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

加入 `--no-onboard` 以略過上手引導。若是原始碼安裝，請傳遞 `--install-method git --no-onboard`。

## 替代方案：手動使用 npm 或 pnpm

```bash
npm i -g openclaw@latest
```

```bash
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

| 通道     | 行為                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| `stable` | 等待 `stableDelayHours`，然後在 `stableJitterHours` 內套用決定性抖動（漸進式推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 檢查一次（預設：每小時）並立即套用。                   |
| `dev`    | 不自動套用。請手動使用 `openclaw update`。                                           |

閘道也會在啟動時記錄更新提示（使用 `update.checkOnStart: false` 停用）。

## 更新後

<Steps>

### 執行醫生程式

```bash
openclaw doctor
```

遷移設定、稽核 DM 原則並檢查閘道健康狀況。詳細資訊：[醫生程式](/en/gateway/doctor)

### 重新啟動閘道

```bash
openclaw gateway restart
```

### 驗證

```bash
openclaw health
```

</Steps>

## 回滾

### 鎖定版本

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

提示：`npm view openclaw version` 會顯示目前發布的版本。

### 鎖定提交

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

若要回到最新版本：`git checkout main && git pull`。

## 如果您遇到困難

- 再次執行 `openclaw doctor` 並仔細閱讀輸出內容。
- 檢查：[疑難排解](/en/gateway/troubleshooting)
- 在 Discord 中提問：[https://discord.gg/clawd](https://discord.gg/clawd)
