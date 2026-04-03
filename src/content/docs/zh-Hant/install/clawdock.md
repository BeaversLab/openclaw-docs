---
summary: "ClawDock shell helpers for Docker-based OpenClaw installs"
read_when:
  - You run OpenClaw with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "ClawDock"
---

# ClawDock

ClawDock 是一個用於基於 Docker 的 OpenClaw 安裝的小型 shell 輔助層。

它提供像是 `clawdock-start`、`clawdock-dashboard` 和 `clawdock-fix-token` 這樣的簡短指令，而不是較長的 `docker compose ...` 呼叫。

如果您尚未設定 Docker，請從 [Docker](/en/install/docker) 開始。

## 安裝

使用標準輔助路徑：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您之前是從 `scripts/shell-helpers/clawdock-helpers.sh` 安裝 ClawDock，請從新的 `scripts/clawdock/clawdock-helpers.sh` 路徑重新安裝。舊的 GitHub raw 路徑已被移除。

## 您將獲得

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
| `clawdock-shell`          | 在閘道容器內開啟 shell             |
| `clawdock-cli <command>`  | 在 Docker 中執行 OpenClaw CLI 指令 |
| `clawdock-exec <command>` | 在容器中執行任意指令               |

### Web UI 和配對

| 指令                    | 說明                 |
| ----------------------- | -------------------- |
| `clawdock-dashboard`    | 開啟 Control UI URL  |
| `clawdock-devices`      | 列出待處理的裝置配對 |
| `clawdock-approve <id>` | 批准配對請求         |

### 設定與維護

| 指令                 | 說明                   |
| -------------------- | ---------------------- |
| `clawdock-fix-token` | 設定容器內的閘道 token |
| `clawdock-update`    | 拉取、重建並重新啟動   |
| `clawdock-rebuild`   | 僅重建 Docker 映像檔   |
| `clawdock-clean`     | 移除容器和磁碟區       |

### 公用程式

| 指令                   | 說明                     |
| ---------------------- | ------------------------ |
| `clawdock-health`      | 執行閘道健康檢查         |
| `clawdock-token`       | 列印閘道 token           |
| `clawdock-cd`          | 跳至 OpenClaw 專案目錄   |
| `clawdock-config`      | 開啟 `~/.openclaw`       |
| `clawdock-show-config` | 輸出帶有隱藏值的配置文件 |
| `clawdock-workspace`   | 打開工作區目錄           |

## 首次使用流程

```bash
clawdock-start
clawdock-fix-token
clawdock-dashboard
```

如果瀏覽器提示需要配對：

```bash
clawdock-devices
clawdock-approve <request-id>
```

## 配置與密鑰

ClawDock 使用與 [Docker](/en/install/docker) 中描述的相同的 Docker 配置拆分：

- `<project>/.env` 用於 Docker 特定的值，如映像名稱、端口和網關令牌
- `~/.openclaw/.env` 用於提供商金鑰和機器人令牌
- `~/.openclaw/openclaw.json` 用於行為配置

當您想要快速檢查這些文件時，請使用 `clawdock-show-config`。它會在其輸出中隱藏 `.env` 值。

## 相關頁面

- [Docker](/en/install/docker)
- [Docker VM 運行環境](/en/install/docker-vm-runtime)
- [更新](/en/install/updating)
