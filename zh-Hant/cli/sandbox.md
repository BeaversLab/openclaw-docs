---
title: Sandbox CLI
summary: "管理沙盒執行時並檢查有效的沙盒原則"
read_when: "您正在管理沙盒執行時或調試沙盒/工具原則行為。"
status: active
---

# Sandbox CLI

管理沙盒執行時以進行隔離的代理程式執行。

## 概觀

OpenClaw 可以在隔離的沙盒執行時中執行代理程式以確保安全性。`sandbox` 指令可協助您在更新或設定變更後檢查並重建這些執行時。

目前通常指：

- Docker 沙盒容器
- 當 `agents.defaults.sandbox.backend = "ssh"` 時的 SSH 沙盒執行時
- 當 `agents.defaults.sandbox.backend = "openshell"` 時的 OpenShell 沙盒執行時

對於 `ssh` 和 OpenShell `remote`，重建的重要性比 Docker 更高：

- 在初始種子之後，遠端工作區是規範性的
- `openclaw sandbox recreate` 會刪除所選範圍的那個規範性遠端工作區
- 下次使用時會從當前本地工作區重新進行種子設定

## 指令

### `openclaw sandbox explain`

檢查**有效的**沙箱模式/範圍/工作區存取權、沙箱工具策略以及提升的閘道（包含修復配置金鑰路徑）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙箱執行時及其狀態和配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**輸出包含：**

- 執行時名稱和狀態
- 後端 (`docker`, `openshell` 等)
- 配置標籤及其是否符合當前配置
- 建立時間（自建立以來的時間）
- 閒置時間（自上次使用以來的時間）
- 關聯的工作階段/代理程式

### `openclaw sandbox recreate`

移除沙箱執行時以強制使用更新後的配置重新建立。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**選項：**

- `--all`：重新建立所有沙箱容器
- `--session <key>`：重新建立特定 session 的容器
- `--agent <id>`：重新建立特定 agent 的容器
- `--browser`：僅重新建立瀏覽器容器
- `--force`：略過確認提示

**重要提示：** Runtime 會在下次使用 agent 時自動重新建立。

## 使用案例

### 更新 Docker 映像檔後

```bash
# Pull new image
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# Update config to use new image
# Edit config: agents.defaults.sandbox.docker.image (or agents.list[].sandbox.docker.image)

# Recreate containers
openclaw sandbox recreate --all
```

### 變更沙箱設定後

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
openclaw sandbox recreate --all
```

### 變更 SSH 目標或 SSH 認證資料後

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

對於核心 `ssh` 後端，重新建立會刪除 SSH 目標上
每個 scope 的遠端工作區根目錄。下次執行時會從本機工作區重新播種。

### 變更 OpenShell 來源、原則或模式後

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

對於 OpenShell `remote` 模式，recreate 會刪除該範圍的標準遠端工作區。下次執行會從本機工作區再次為其設定種子。

### 變更 setupCommand 之後

```bash
openclaw sandbox recreate --all
# or just one agent:
openclaw sandbox recreate --agent family
```

### 僅針對特定代理程式

```bash
# Update only one agent's containers
openclaw sandbox recreate --agent alfred
```

## 為何需要這樣做？

**問題：** 當您更新沙箱組態時：

- 現有執行時會繼續使用舊設定執行
- 執行時僅在閒置 24 小時後才會被修剪
- 經常使用的代理程式會無限期地保持舊執行時運作

**解決方案：** 使用 `openclaw sandbox recreate` 強制移除舊執行時。下次需要時，它們會以目前的設定自動重新建立。

提示：優先使用 `openclaw sandbox recreate` 而非手動進行特定後端的清理。它會使用 Gateway 的執行時登錄表，並在範圍/工作階段金鑰變更時避免不一致。

## 組態

Sandbox 設定位於 `agents.defaults.sandbox` 下的 `~/.openclaw/openclaw.json` 中（每個 Agent 的覆寫設定放在 `agents.list[].sandbox`）：

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

## 另請參閱

- [Sandbox 文件](/zh-Hant/gateway/sandboxing)
- [Agent 設定](/zh-Hant/concepts/agent-workspace)
- [Doctor 指令](/zh-Hant/gateway/doctor) - 檢查 Sandbox 設定

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
