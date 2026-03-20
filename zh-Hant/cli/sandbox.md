---
title: Sandbox CLI
summary: "Manage sandbox runtimes and inspect effective sandbox policy"
read_when: "You are managing sandbox runtimes or debugging sandbox/tool-policy behavior."
status: active
---

# Sandbox CLI

Manage sandbox runtimes for isolated agent execution.

## Overview

OpenClaw can run agents in isolated sandbox runtimes for security. The `sandbox` commands help you inspect and recreate those runtimes after updates or configuration changes.

Today that usually means:

- Docker sandbox containers
- SSH sandbox runtimes when `agents.defaults.sandbox.backend = "ssh"`
- OpenShell sandbox runtimes when `agents.defaults.sandbox.backend = "openshell"`

For `ssh` and OpenShell `remote`, recreate matters more than with Docker:

- the remote workspace is canonical after the initial seed
- `openclaw sandbox recreate` 會刪除所選範圍的該標準遠端工作區
- 下次使用時會從目前的本機工作區重新植入

## 指令

### `openclaw sandbox explain`

檢查 **有效** 的沙箱模式/範圍/工作區存取權、沙箱工具原則以及提升的閘道（含 fix-it 設定鍵路徑）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙箱執行時及其狀態與設定。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**輸出包含：**

- 執行時名稱與狀態
- 後端 (`docker`、 `openshell` 等)
- 設定標籤及其是否符合目前的設定
- 建立時間長度（自建立至今的時間）
- 閒置時間（自上次使用至今的時間）
- 關聯的工作階段/代理程式

### `openclaw sandbox recreate`

移除沙箱執行時以強制使用更新後的設定重新建立。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**選項：**

- `--all`：重新建立所有沙箱容器
- `--session <key>`：重新建立特定工作階段的容器
- `--agent <id>`：重新建立特定代理程式的容器
- `--browser`：僅重新建立瀏覽器容器
- `--force`：略過確認提示

**重要：** 當代理程式下次被使用時，執行時期會自動重新建立。

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

### 變更沙箱組態之後

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
openclaw sandbox recreate --all
```

### 變更 SSH 目標或 SSH 驗證資料之後

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

對於核心 `ssh` 後端，recreate 會刪除 SSH 目標上每個作用域的遠端工作區根目錄。下次運行時會從本地工作區重新初始化它。

### 變更 OpenShell 來源、政策或模式後

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

對於 OpenShell `remote` 模式，recreate 會刪除該作用域的標準遠端工作區。下次運行時會從本地工作區重新初始化它。

### 變更 setupCommand 後

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

## 為何需要此操作？

**問題：** 當您更新沙箱配置時：

- 現有的執行環境會繼續以舊設定運行
- 執行環境僅在非活動 24 小時後才會被修剪
- 定期使用的代理程式會讓舊的執行環境無限期保持運作

**解決方案：** 使用 `openclaw sandbox recreate` 強制移除舊的執行環境。當下次需要時，它們會以當前設定自動重新建立。

提示：優先使用 `openclaw sandbox recreate` 而非手動的後端特定清理。
它使用 Gateway 的執行環境註冊表，並在作用域/會話金鑰變更時避免不匹配。

## 配置

沙箱設定位於 `~/.openclaw/openclaw.json` 下的 `agents.defaults.sandbox` 中（每個代理程式的覆寫設定則放在 `agents.list[].sandbox` 中）：

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

- [沙箱文件](/zh-Hant/gateway/sandboxing)
- [代理程式配置](/zh-Hant/concepts/agent-workspace)
- [Doctor 指令](/zh-Hant/gateway/doctor) - 檢查沙箱設定

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
