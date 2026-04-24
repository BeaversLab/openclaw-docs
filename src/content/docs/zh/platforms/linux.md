---
summary: "Linux 支持和配套应用状态"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
  - Debugging Linux OOM kills or exit 137 on a VPS or container
title: "Linux 应用"
---

# Linux 应用

Gateway(网关) 网关 在 Linux 上受到完全支持。**Node 是推荐的运行时**。
不推荐将 Bun 用于 Gateway(网关) 网关（WhatsApp/Telegram 存在 Bug）。

原生 Linux 配套应用已在计划中。如果您愿意协助构建，欢迎贡献代码。

## 新手快速入门 (VPS)

1. 安装 Node 24（推荐；Node 22 LTS，目前 `22.14+`，仍可兼容使用）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 从你的笔记本电脑执行：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/` 并使用配置的共享密钥进行身份验证（默认为 token；如果设置了 `gateway.auth.mode: "password"` 则使用密码）

完整的 Linux 服务器指南：[Linux Server](/zh/vps)。分步 VPS 示例：[exe.dev](/zh/install/exe-dev)

## 安装

- [入门指南](/zh/start/getting-started)
- [安装与更新](/zh/install/updating)
- 可选流程：[Bun（实验性）](/zh/install/bun)、[Nix](/zh/install/nix)、[Docker](/zh/install/docker)

## Gateway(网关) 网关

- [Gateway(网关) 运维手册](/zh/gateway)
- [配置](/zh/gateway/configuration)

## Gateway(网关) 网关 服务安装 (CLI)

使用以下命令之一：

```
openclaw onboard --install-daemon
```

或者：

```
openclaw gateway install
```

或者：

```
openclaw configure
```

当系统提示时，选择 **Gateway(网关) 网关 service**。

修复/迁移：

```
openclaw doctor
```

## 系统控制

OpenClaw 默认安装一个 systemd **用户**服务。为共享或始终在线的服务器使用 **系统** 服务。`openclaw gateway install` 和 `openclaw onboard --install-daemon` 已经为您呈现了当前的规范单元；仅在需要自定义系统/服务管理器设置时才手动编写一个。完整的服务指南位于 [Gateway(网关) 运维手册](/zh/gateway) 中。

最小化设置：

创建 `~/.config/systemd/user/openclaw-gateway[-<profile>].service`：

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

启用它：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

## 内存压力和 OOM 终止

在 Linux 上，当主机、虚拟机或容器 cgroup
耗尽内存时，内核会选择一个 OOM 受害者。The Gateway(网关) 可能是一个糟糕的受害者，因为它拥有长期存在的
会话和渠道连接。OpenClaw 因此倾向于优先杀死瞬态子
进程，而不是 Gateway(网关)。

对于符合条件的 Linux 子衍生进程，OpenClaw 通过一个简短的
`/bin/sh` 包装器启动子进程，该包装器将子进程自己的 `oom_score_adj` 提高到 `1000`，然后
`exec` 真正的命令。这是一个无特权操作，因为子进程
只是增加了自己的 OOM 杀死可能性。

覆盖的子进程表面包括：

- 由监管器管理的命令子进程，
- PTY shell 子进程，
- MCP stdio 服务器子进程，
- 由 OpenClaw 启动的浏览器/Chrome 进程。

该包装器仅适用于 Linux，当 `/bin/sh` 不可用时会跳过。如果子环境设置了 `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`、`false`、`no` 或 `off`，也会跳过它。

要验证子进程：

```bash
cat /proc/<child-pid>/oom_score_adj
```

受保护的子进程的预期值为 `1000`。Gateway(网关) 进程应保持其正常分数，通常为 `0`。

这不能替代正常的内存调优。如果 VPS 或容器反复终止子进程，请增加内存限制、减少并发数，或添加更强的资源控制，例如 systemd `MemoryMax=` 或容器级别的内存限制。
