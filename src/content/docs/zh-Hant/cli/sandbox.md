---
summary: "管理沙盒運行時並檢查有效的沙盒策略"
title: Sandbox CLI
read_when: "您正在管理沙盒執行環境或偵錯沙盒/工具原則行為。"
status: active
---

管理用於隔離 Agent 執行的沙盒運行時。

## 概覽

OpenClaw 可以在隔離的沙盒運行時中執行 Agent 以確保安全。`sandbox` 指令可協助您在更新或變更設定後檢查並重新建立這些運行時。

目前這通常意味著：

- Docker 沙盒容器
- 當 `agents.defaults.sandbox.backend = "ssh"` 時的 SSH 沙盒運行時
- 當 `agents.defaults.sandbox.backend = "openshell"` 時的 OpenShell 沙盒運行時

對於 `ssh` 和 OpenShell `remote`，重新建立比 Docker 更重要：

- 遠端工作區在初始種子之後具有權威性
- `openclaw sandbox recreate` 會刪除所選範圍的那個權威性遠端工作區
- 下一次使用時會從當前本地工作區再次進行種子化

## 指令

### `openclaw sandbox explain`

檢查**有效**的沙盒模式/範圍/工作區存取權、沙盒工具策略以及提升的閘道（附修復設定索引鍵路徑）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙盒運行時及其狀態和設定。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**輸出包含：**

- 運行時名稱與狀態
- 後端 (`docker`, `openshell`, 等)
- 設定標籤以及是否符合目前設定
- 建立時間（自建立以來的時間）
- 閒置時間（自上次使用以來的時間）
- 關聯的作業階段/Agent

### `openclaw sandbox recreate`

移除沙盒運行時以強制使用更新後的設定重新建立。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**選項：**

- `--all`: 重新建立所有沙盒容器
- `--session <key>`: 重新建立特定作業階段的容器
- `--agent <id>`: 重新建立特定 Agent 的容器
- `--browser`: 僅重新建立瀏覽器容器
- `--force`: 略過確認提示

<Note>當下次使用 Agent 時，運行時會自動重新建立。</Note>

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

對於核心 `ssh` 後端，recreate 會刪除 SSH 目標上每個範圍的遠端工作區根目錄。下一次執行時會從本地工作區重新種入。

### 變更 OpenShell 來源、原則或模式後

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

對於 OpenShell `remote` 模式，recreate 會刪除該範圍的標準遠端工作區。下一次執行時會從本地工作區重新種入。

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

## 為何需要此步驟

當您更新沙箱配置時：

- 現有的運行環境會繼續以舊設定運作。
- 運行環境僅在閒置 24 小時後才會被清除。
- 經常使用的 Agent 會無限期保留舊的運行環境。

使用 `openclaw sandbox recreate` 強制移除舊的運行環境。當下次需要時，它們會以目前的設定自動重建。

<Tip>建議優先使用 `openclaw sandbox recreate` 而非手動進行特定後端的清理。它會使用 Gateway 的運行環境註冊表，並避免當範圍或會話金鑰變更時發生不一致的情況。</Tip>

## 配置

沙箱設定位於 `~/.openclaw/openclaw.json` 下的 `agents.defaults.sandbox` 中（每個 Agent 的覆寫則放在 `agents.list[].sandbox` 中）：

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

## 相關連結

- [CLI 參考資料](/zh-Hant/cli)
- [沙箱機制](/zh-Hant/gateway/sandboxing)
- [Agent 工作區](/zh-Hant/concepts/agent-workspace)
- [Doctor](/zh-Hant/gateway/doctor)：檢查沙箱設定。
