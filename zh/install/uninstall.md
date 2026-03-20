---
summary: "完全卸载 OpenClaw (CLI, service, state, workspace)"
read_when:
  - 您想从机器上移除 OpenClaw
  - 卸载后网关服务仍在运行
title: "卸载"
---

# 卸载

两种方式：

- **简单路径**，如果 `openclaw` 仍然安装。
- **手动移除服务**，如果 CLI 已消失但服务仍在运行。

## 简单路径 (CLI 仍已安装)

推荐：使用内置卸载程序：

```bash
openclaw uninstall
```

非交互式 (自动化 / npx)：

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

手动步骤 (结果相同)：

1. 停止网关服务：

```bash
openclaw gateway stop
```

2. 卸载网关服务 (launchd/systemd/schtasks)：

```bash
openclaw gateway uninstall
```

3. 删除状态 + 配置：

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

如果您将 `OPENCLAW_CONFIG_PATH` 设置为状态目录之外的自定义位置，请也删除该文件。

4. 删除您的工作区 (可选，移除代理文件)：

```bash
rm -rf ~/.openclaw/workspace
```

5. 移除 CLI 安装 (选择您使用的那一个)：

```bash
npm rm -g openclaw
pnpm remove -g openclaw
bun remove -g openclaw
```

6. 如果您安装了 macOS 应用程序：

```bash
rm -rf /Applications/OpenClaw.app
```

说明：

- 如果您使用了配置文件 (`--profile` / `OPENCLAW_PROFILE`)，请对每个状态目录重复步骤 3 (默认为 `~/.openclaw-<profile>`)。
- 在远程模式下，状态目录位于 **网关主机** 上，因此请也在那里运行步骤 1-4。

## 手动移除服务 (CLI 未安装)

如果网关服务持续运行但 `openclaw` 缺失，请使用此方法。

### macOS (launchd)

默认标签为 `ai.openclaw.gateway` (或 `ai.openclaw.<profile>`；旧的 `com.openclaw.*` 可能仍然存在)：

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

如果您使用了配置文件，请将标签和 plist 名称替换为 `ai.openclaw.<profile>`。如果存在，请删除任何旧的 `com.openclaw.*` plist。

### Linux (systemd user unit)

默认单元名称为 `openclaw-gateway.service` (或 `openclaw-gateway-<profile>.service`)：

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

默认任务名称为 `OpenClaw Gateway` (或 `OpenClaw Gateway (<profile>)`)。
任务脚本位于您状态目录下。

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

如果您使用了配置文件，请删除匹配的任务名称和 `~\.openclaw-<profile>\gateway.cmd`。

## 正常安装与源代码检出

### 正常安装 (install.sh / npm / pnpm / bun)

如果您使用了 `https://openclaw.ai/install.sh` 或 `install.ps1`，则 CLI 是通过 `npm install -g openclaw@latest` 安装的。
请使用 `npm rm -g openclaw` 将其移除（如果您是通过该方式安装的，也可以使用 `pnpm remove -g` / `bun remove -g`）。

### Source checkout (git clone)

如果您是从仓库检出运行的（`git clone` + `openclaw ...` / `bun run openclaw ...`）：

1. 在删除仓库**之前**卸载网关服务（使用上面的简单路径或手动移除服务）。
2. 删除仓库目录。
3. 如上所示移除状态和工作区。

import en from "/components/footer/en.mdx";

<en />
