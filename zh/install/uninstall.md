> [!NOTE]
> 本页正在翻译中。

---
summary: "彻底卸载 OpenClaw（CLI、服务、state、workspace）"
read_when:
  - 你想从机器上移除 OpenClaw
  - 卸载后 gateway 服务仍在运行
---

# Uninstall

两条路径：
- **简便路径**（`openclaw` 仍可用）
- **手动移除服务**（CLI 已不在但服务还在跑）

## 简便路径（CLI 仍已安装）

推荐：使用内置卸载器：

```bash
openclaw uninstall
```

非交互（自动化 / npx）：

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

手动步骤（同样效果）：

1) 停止 gateway 服务：

```bash
openclaw gateway stop
```

2) 卸载 gateway 服务（launchd/systemd/schtasks）：

```bash
openclaw gateway uninstall
```

3) 删除 state + config：

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

如果你把 `OPENCLAW_CONFIG_PATH` 指向了 state 目录之外的自定义位置，也要删除该文件。

4) 删除 workspace（可选，会移除 agent 文件）：

```bash
rm -rf ~/.openclaw/workspace
```

5) 移除 CLI 安装（选你实际使用的包管理器）：

```bash
npm rm -g openclaw
pnpm remove -g openclaw
bun remove -g openclaw
```

6) 如果你安装了 macOS app：

```bash
rm -rf /Applications/OpenClaw.app
```

注意：
- 如果你使用了 profiles（`--profile` / `OPENCLAW_PROFILE`），对每个 state 目录重复第 3 步（默认 `~/.openclaw-<profile>`）。
- 远程模式下，state 目录在**gateway 主机**上，因此步骤 1-4 也要在那台机器上执行。

## 手动移除服务（CLI 不在）

当 gateway 服务仍在跑但 `openclaw` 不在时，用这个。

### macOS（launchd）

默认 label 为 `bot.molt.gateway`（或 `bot.molt.<profile>`；旧的 `com.openclaw.*` 可能仍在）：

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

如果你使用了 profile，把 label 与 plist 名改为 `bot.molt.<profile>`。如果存在旧的 `com.openclaw.*` plist 也应移除。

### Linux（systemd 用户单元）

默认 unit 名为 `openclaw-gateway.service`（或 `openclaw-gateway-<profile>.service`）：

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows（计划任务）

默认任务名是 `OpenClaw Gateway`（或 `OpenClaw Gateway (<profile>)`）。
任务脚本位于 state 目录下。

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

如果使用了 profile，请删除对应的任务名与 `~\.openclaw-<profile>\gateway.cmd`。

## 普通安装 vs 源码 checkout

### 普通安装（install.sh / npm / pnpm / bun）

如果你使用 `https://openclaw.bot/install.sh` 或 `install.ps1`，CLI 是通过 `npm install -g openclaw@latest` 安装的。
用 `npm rm -g openclaw` 删除（或 `pnpm remove -g` / `bun remove -g`）。

### 源码 checkout（git clone）

如果你从仓库 checkout 运行（`git clone` + `openclaw ...` / `bun run openclaw ...`）：

1) 在删除仓库之前**先卸载 gateway 服务**（用上面的简便路径或手动移除服务）。
2) 删除仓库目录。
3) 按上文删除 state + workspace。
