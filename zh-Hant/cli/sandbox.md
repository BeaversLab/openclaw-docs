---
title: Sandbox CLI
summary: "管理沙盒執行時並檢查有效的沙盒原則"
read_when: "您正在管理沙盒執行時或對沙盒/工具原則行為進行除錯。"
status: active
---

# Sandbox CLI

管理用於隔離代理程式執行的沙盒執行時。

## 概覽

OpenClaw 可以在隔離的沙盒執行時中執行代理程式以確保安全性。`sandbox` 指令可協助您在更新或變更設定後檢查並重建那些執行時。

目前通常指的是：

- Docker 沙盒容器
- 啟用 `agents.defaults.sandbox.backend = "ssh"` 時的 SSH 沙盒執行時
- 啟用 `agents.defaults.sandbox.backend = "openshell"` 時的 OpenShell 沙盒執行時

對於 `ssh` 和 OpenShell `remote`，重建的重要性高於 Docker：

- 在初始植入後，遠端工作區是基準
- `openclaw sandbox recreate` 會刪除所選範圍的基準遠端工作區
- 下次使用時會從當地端工作區再次植入

## 指令

### `openclaw sandbox explain`

檢查**有效**的沙盒模式/範圍/工作區存取權、沙盒工具原則以及提升權限的閘道（含修復組態鍵路徑）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙盒執行時及其狀態和組態。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**輸出包含：**

- 執行時名稱和狀態
- 後端 (`docker`、`openshell` 等)
- 組態標籤以及是否符合目前組態
- 建立時間（自建立以來的時間）
- 閒置時間（自上次使用以來的時間）
- 關聯的 session/agent

### `openclaw sandbox recreate`

移除沙盒執行時以強制使用更新後的組態重建。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**選項：**

- `--all`：重建所有沙盒容器
- `--session <key>`：重建特定 session 的容器
- `--agent <id>`：重建特定代理程式的容器
- `--browser`：僅重建瀏覽器容器
- `--force`：跳過確認提示

**重要：** 當代理程式下次被使用時，執行時會自動重建。

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

### 變更沙盒組態之後

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

對於核心 `ssh` 後端，recreate 會刪除 SSH 目標上各範圍的遠端工作區根目錄。下次執行時會從本機工作區重新播種。

### 變更 OpenShell 來源、原則或模式後

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

對於 OpenShell `remote` 模式，recreate 會刪除該範圍的標準遠端工作區。下次執行時會從本機工作區重新播種。

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

## 為何需要此步驟？

**問題：** 當您更新沙箱配置時：

- 現有執行階段會繼續使用舊設定執行
- 執行階段僅會在閒置 24 小時後被修剪
- 定期使用的代理程式會讓舊執行階段無限期保持運作

**解決方案：** 使用 `openclaw sandbox recreate` 強制移除舊執行階段。它們會在下次需要時以目前的設定自動重建。

提示：優先選擇 `openclaw sandbox recreate` 而非手動後端專屬的清理。
它會使用 Gateway 的執行階段登錄表，並避免在範圍/工作階段金鑰變更時發生不一致。

## 配置

沙箱設定位於 `agents.defaults.sandbox` 下的 `~/.openclaw/openclaw.json` 中（各代理程式的覆寫值位於 `agents.list[].sandbox` 中）：

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

## 參閱

- [沙箱文件](/zh-Hant/gateway/sandboxing)
- [代理程式配置](/zh-Hant/concepts/agent-workspace)
- [Doctor 指令](/zh-Hant/gateway/doctor) - 檢查沙箱設定

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
