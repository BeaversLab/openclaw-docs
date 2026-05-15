---
summary: "ClawDock shell helpers for Docker-based OpenClaw installs"
read_when:
  - You run OpenClaw with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "ClawDock"
---

ClawDock 是一個小型 Shell 輔助層，適用於基於 Docker 的 OpenClaw 安裝。

它提供了諸如 `clawdock-start`、`clawdock-dashboard` 和 `clawdock-fix-token` 等簡短指令，而非冗長的 `docker compose ...` 呼叫。

如果您尚未設定 Docker，請從 [Docker](/zh-Hant/install/docker) 開始。

## 安裝

使用標準輔助路徑：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您先前是從 `scripts/shell-helpers/clawdock-helpers.sh` 安裝 ClawDock，請從新的 `scripts/clawdock/clawdock-helpers.sh` 路徑重新安裝。舊的原始 GitHub 路徑已被移除。

## 功能概覽

### 基本操作

| 指令               | 說明         |
| ------------------ | ------------ |
| `clawdock-start`   | 啟動閘道     |
| `clawdock-stop`    | 停止閘道     |
| `clawdock-restart` | 重新啟動閘道 |
| `clawdock-status`  | 檢查容器狀態 |
| `clawdock-logs`    | 追蹤閘道日誌 |

### 容器存取

| 指令                      | 說明                               |
| ------------------------- | ---------------------------------- |
| `clawdock-shell`          | 在閘道容器內開啟 Shell             |
| `clawdock-cli <command>`  | 在 Docker 中執行 OpenClaw CLI 指令 |
| `clawdock-exec <command>` | 在容器中執行任意指令               |

### Web UI 與配對

| 指令                    | 說明                 |
| ----------------------- | -------------------- |
| `clawdock-dashboard`    | 開啟控制 UI URL      |
| `clawdock-devices`      | 列出待處理的裝置配對 |
| `clawdock-approve <id>` | 核准配對請求         |

### 設定與維護

| 指令                 | 說明                 |
| -------------------- | -------------------- |
| `clawdock-fix-token` | 在容器內設定閘道權杖 |
| `clawdock-update`    | 拉取、重建並重新啟動 |
| `clawdock-rebuild`   | 僅重建 Docker 映像檔 |
| `clawdock-clean`     | 移除容器與磁碟區     |

### 公用程式

| 指令                   | 說明                     |
| ---------------------- | ------------------------ |
| `clawdock-health`      | 執行閘道健康檢查         |
| `clawdock-token`       | 列印閘道權杖             |
| `clawdock-cd`          | 跳轉至 OpenClaw 專案目錄 |
| `clawdock-config`      | 開啟 `~/.openclaw`       |
| `clawdock-show-config` | 列印含有修訂值的設定檔   |
| `clawdock-workspace`   | 開啟工作區目錄           |

## 首次使用流程

```bash
clawdock-start
clawdock-fix-token
clawdock-dashboard
```

如果瀏覽器顯示需要配對：

```bash
clawdock-devices
clawdock-approve <request-id>
```

## 設定與機密

ClawDock 適用於 [Docker](/zh-Hant/install/docker) 中描述的相同 Docker 設定分割：

- `<project>/.env` 用於 Docker 特定的值，例如映像檔名稱、連接埠和閘道權杖
- `~/.openclaw/.env` 用於基於環境變數的提供者金鑰和 Bot 權杖
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 用於已儲存的提供者 OAuth/API 金鑰驗證
- `~/.openclaw/openclaw.json` 用於行為設定

當您想要快速檢查 `.env` 檔案和 `openclaw.json` 時，請使用 `clawdock-show-config`。它會在其列印輸出中編輯 `.env` 值。

## 相關

<CardGroup cols={2}>
  <Card title="Docker" href="/zh-Hant/install/docker" icon="docker">
    OpenClaw 的標準 Docker 安裝。
  </Card>
  <Card title="Docker VM 執行時環境" href="/zh-Hant/install/docker-vm-runtime" icon="cube">
    用於強化隔離的 Docker 管理的 VM 執行時環境。
  </Card>
  <Card title="更新" href="/zh-Hant/install/updating" icon="arrow-up-right-from-square">
    更新 OpenClaw 套件和受管理的服務。
  </Card>
</CardGroup>
