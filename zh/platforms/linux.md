---
summary: "Linux 支持与配套应用状态"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
title: "Linux 应用"
---

# Linux 应用

Gateway 网关 在 Linux 上受到完全支持。**Node 是推荐的运行时**。
不推荐将 Bun 用于 Gateway 网关（WhatsApp/Telegram 存在 Bug）。

原生 Linux 配套应用已在计划中。如果您愿意协助构建，欢迎贡献代码。

## 新手快速入门 (VPS)

1. 安装 Node 24（推荐；Node 22 LTS，目前为 `22.16+`，出于兼容性考虑仍然可用）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 在您的笔记本电脑上：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/` 并粘贴您的令牌

VPS 分步指南：[exe.dev](/en/install/exe-dev)

## 安装

- [入门指南](/en/start/getting-started)
- [安装与更新](/en/install/updating)
- 可选流程：[Bun（实验性）](/en/install/bun)、[Nix](/en/install/nix)、[Docker](/en/install/docker)

## Gateway 网关

- [Gateway(网关) 运维手册](/en/gateway)
- [配置](/en/gateway/configuration)

## Gateway 网关 服务安装 (CLI)

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

当系统提示时，选择 **Gateway 网关 service**。

修复/迁移：

```
openclaw doctor
```

## 系统控制

OpenClaw 默认安装 systemd **用户** 服务。对于共享或全天候运行的服务器，请使用 **系统**
服务。完整的 unit 示例和指南位于 [Gateway runbook](/en/gateway)。

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

[Install]
WantedBy=default.target
```

启用它：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

import zh from "/components/footer/zh.mdx";

<zh />
