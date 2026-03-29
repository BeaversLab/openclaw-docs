---
title: Sandbox CLI
summary: "管理沙盒執行環境並檢視有效的沙盒原則"
read_when: "您正在管理沙盒執行環境或偵錯沙盒/工具原則行為。"
status: active
---

# Sandbox CLI

管理用於隔離代理程式執行的沙盒執行環境。

## 概覽

OpenClaw 可以在隔離的沙盒執行環境中執行代理程式以確保安全性。`sandbox` 指令可協助您在更新或變更設定後檢視並重新建立這些執行環境。

目前通常是指：

- Docker 沙盒容器
- 當 `agents.defaults.sandbox.backend = "ssh"` 時的 SSH 沙盒執行環境
- 當 `agents.defaults.sandbox.backend = "openshell"` 時的 OpenShell 沙盒執行環境

對於 `ssh` 和 OpenShell `remote`，重新建立的重要性比 Docker 高：

- 初始種子之後，遠端工作區是標準來源
- `openclaw sandbox recreate` 會刪除所選範圍的該標準遠端工作區
- 下次使用時會從目前的本機工作區再次進行種子設定

## 指令

### `openclaw sandbox explain`

檢視**有效**的沙盒模式/範圍/工作區存取權、沙盒工具原則，以及提升的閘道（包含修復設定金鑰路徑）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙盒執行環境及其狀態和設定。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**輸出包含：**

- 執行環境名稱和狀態
- 後端 (`docker`、`openshell` 等)
- 設定標籤以及是否符合目前設定
- 存在時間（建立後經過的時間）
- 閒置時間（上次使用後經過的時間）
- 關聯的工作階段/代理程式

### `openclaw sandbox recreate`

移除沙盒執行環境以強制使用更新後的設定進行重新建立。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**選項：**

- `--all`：重新建立所有沙盒容器
- `--session <key>`：重新建立特定工作階段的容器
- `--agent <id>`：重新建立特定代理程式的容器
- `--browser`：僅重新建立瀏覽器容器
- `--force`：跳過確認提示

**重要：** 當下次使用代理程式時，執行環境會自動重新建立。

## 使用案例

### 更新 Docker 映像檔之後

```bash
# Pull new image
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# Update config to use new image
# Edit config: agents.defaults.sandbox.docker.image (or agents.list[].sandbox.docker.image)

# Recreate containers
openclaw sandbox recreate --all
```

### 變更沙盒設定之後

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
openclaw sandbox recreate --all
```

### 變更 SSH 目標或 SSH 驗證資料後

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

對於核心 `ssh` 後端，recreate 會刪除 SSH 目標上每個範圍 (per-scope) 的遠端工作區根目錄。下次執行時會從本機工作區重新進行初始化 (seed)。

### 變更 OpenShell 來源、原則或模式後

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

對於 OpenShell `remote` 模式，recreate 會刪除該範圍的標準遠端工作區。下次執行時會從本機工作區重新進行初始化。

### 變更 setupCommand 後

```bash
openclaw sandbox recreate --all
# or just one agent:
openclaw sandbox recreate --agent family
```

### 僅針對特定 Agent

```bash
# Update only one agent's containers
openclaw sandbox recreate --agent alfred
```

## 為何需要此操作？

**問題：** 當您更新沙箱設定時：

- 現有的執行時 (runtimes) 會繼續使用舊設定執行
- 執行時只有在閒置 24 小時後才會被清除
- 經常使用的 Agent 會讓舊的執行時無限期保持運作

**解決方案：** 使用 `openclaw sandbox recreate` 強制移除舊的執行時。當下次需要時，它們會自動以目前的設定重新建立。

提示：比起手動針對特定後端進行清理，建議優先使用 `openclaw sandbox recreate`。
它使用 Gateway 的執行時註冊表，並可避免當範圍/工作階段金鑰變更時發生不一致。

## 設定

沙箱設定位於 `~/.openclaw/openclaw.json` 下的 `agents.defaults.sandbox` 中 (每個 Agent 的覆寫值放在 `agents.list[].sandbox`)：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "backend": "docker", // docker, ssh, openshell
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24, // Auto-prune after 24h idle
          "maxAgeDays": 7, // Auto-prune after 7 days
        },
      },
    },
  },
}
```

## 參見

- [沙箱文件](/en/gateway/sandboxing)
- [Agent 設定](/en/concepts/agent-workspace)
- [Doctor 指令](/en/gateway/doctor) - 檢查沙箱設定
