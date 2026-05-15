---
summary: "Linux 支持和配套应用状态"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
  - Debugging Linux OOM kills or exit 137 on a VPS or container
title: "Linux 应用"
---

Gateway(网关) 在 Linux 上得到完全支持。**Node 是推荐的运行时**。
不建议在 Gateway(网关) 上使用 Bun（WhatsApp/Telegram bug）。

原生 Linux 伴侣应用已在计划中。如果您愿意帮助构建，欢迎贡献。

## 新手快速路径 (VPS)

1. 安装 Node 24（推荐；Node 22 LTS，目前为 `22.16+`，为了兼容性仍然有效）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 从您的笔记本电脑： `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/` 并使用配置的共享密钥进行身份验证（默认为 token；如果您设置了 `gateway.auth.mode: "password"`，则为密码）

完整的 Linux 服务器指南：[Linux Server](/zh/vps)。逐步 VPS 示例：[exe.dev](/zh/install/exe-dev)

## 安装

- [入门指南](/zh/start/getting-started)
- [安装与更新](/zh/install/updating)
- 可选流程：[Bun (实验性)](/zh/install/bun), [Nix](/zh/install/nix), [Docker](/zh/install/docker)

## Gateway(网关)

- [Gateway(网关) 运维手册](/zh/gateway)
- [配置](/zh/gateway/configuration)

## Gateway(网关) 服务安装 (CLI)

使用以下选项之一：

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

提示时选择 **Gateway(网关) 服务**。

修复/迁移：

```
openclaw doctor
```

## 系统控制 (systemd 用户单元)

OpenClaw 默认安装一个 systemd **用户** 服务。为共享或永久在线的服务器使用 **系统**
服务。 `openclaw gateway install` 和
`openclaw onboard --install-daemon` 已经为您呈现了当前的规范单元；
仅当您需要自定义系统/服务管理器设置时才手动编写。完整的服务指南位于 [Gateway(网关) 运维手册](/zh/gateway)。

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

## 内存压力与 OOM 终止

在 Linux 上，当主机、虚拟机或容器 cgroup
内存不足时，内核会选择一个 OOM 受害者。Gateway(网关) 可能是一个糟糕的受害者，因为它拥有长期存在的
会话和渠道连接。因此，OpenClaw 尽可能偏向于将瞬时子
进程在 Gateway(网关) 之前终止。

对于符合条件的 Linux 子进程，OpenClaw 会通过一个简短的 `/bin/sh` 包装器来启动子进程，该包装器会将子进程自身的 `oom_score_adj` 提升至 `1000`，然后 `exec` 实际命令。这是一个无特权操作，因为子进程只是增加了其自身的 OOM 终止可能性。

涵盖的子进程表面包括：

- 由监管器管理的命令子进程，
- PTY Shell 子进程，
- MCP stdio 服务器子进程，
- 由 OpenClaw 启动的浏览器/Chrome 进程。

该包装器仅适用于 Linux，当 `/bin/sh` 不可用时将被跳过。如果子进程环境设置了 `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`、`false`、`no` 或 `off`，它也会被跳过。

要验证子进程：

```bash
cat /proc/<child-pid>/oom_score_adj
```

对于涵盖的子进程，预期值为 `1000`。Gateway(网关) 进程应保持其正常分数，通常为 `0`。

这不能替代正常的内存调优。如果 VPS 或容器反复终止子进程，请增加内存限制、减少并发性，或添加更强的资源控制，例如 systemd `MemoryMax=` 或容器级内存限制。

## 相关

- [安装概述](/zh/install)
- [Linux 服务器](/zh/vps)
- [Raspberry Pi](/zh/platforms/raspberry-pi)
