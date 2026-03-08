---
summary: "Linux 支持和配套应用状态"
read_when:
  - "查找 Linux 配套应用状态"
  - "规划平台覆盖或贡献"
title: "Linux 应用"
---

# Linux 应用

网关在 Linux 上完全支持。**Node 是推荐的运行时**。
不建议为网关使用 Bun（WhatsApp/Telegram 错误）。

原生 Linux 配套应用正在计划中。如果您想帮助构建一个，欢迎贡献。

## 初学者快速路径（VPS）

1. 安装 Node 22+
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 从您的笔记本电脑：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/` 并粘贴您的令牌

分步 VPS 指南：[exe.dev](/zh/platforms/exe-dev)

## 安装

- [入门](/zh/start/getting-started)
- [安装和更新](/zh/install/updating)
- 可选流程：[Bun (/en/install/bun)](/zh/install/bun)、[Nix](/zh/install/nix)、[Docker](/zh/install/docker)

## 网关

- [网关运行手册](/zh/gateway)
- [配置](/zh/gateway/configuration)

## 网关服务安装（CLI）

使用以下任一方式：

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

提示时选择**网关服务**。

修复/迁移：

```
openclaw doctor
```

## 系统控制（systemd 用户单元）

OpenClaw 默认安装 systemd **用户**服务。对于共享或始终在线的服务器，使用**系统**服务。完整的单元示例和指南位于[网关运行手册](/zh/gateway)。

最小设置：

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
