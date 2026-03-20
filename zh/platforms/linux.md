---
summary: "Linux 支持 + 伴生应用状态"
read_when:
  - 查找 Linux 伴生应用状态
  - 规划平台覆盖范围或贡献
title: "Linux 应用"
---

# Linux 应用

Gateway(网关)在 Linux 上得到完全支持。**Node 是推荐的运行时**。
Bun 不推荐用于 Gateway(网关)（WhatsApp/Telegram 错误）。

正在计划原生 Linux 伴生应用。如果您想帮助构建一个，欢迎贡献。

## 新手快速路径 (VPS)

1. 安装 Node 24（推荐；Node 22 LTS，目前为 `22.16+`，为了兼容性仍然有效）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 从您的笔记本电脑：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/` 并粘贴您的令牌

分步 VPS 指南：[exe.dev](/zh/install/exe-dev)

## 安装

- [入门指南](/zh/start/getting-started)
- [安装与更新](/zh/install/updating)
- 可选流程：[Bun (实验性)](/zh/install/bun)、[Nix](/zh/install/nix)、[Docker](/zh/install/docker)

## Gateway(网关)

- [Gateway(网关) 运维手册](/zh/gateway)
- [配置](/zh/gateway/configuration)

## Gateway(网关) 服务安装 (CLI)

使用以下之一：

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

当被提示时，选择 **Gateway(网关) 服务**。

修复/迁移：

```
openclaw doctor
```

## 系统控制 (systemd 用户单元)

OpenClaw 默认安装一个 systemd **用户** 服务。为共享或常开服务器使用**系统**
服务。完整的单元示例和指南位于 [Gateway(网关) 运维手册](/zh/gateway)。

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

import en from "/components/footer/en.mdx";

<en />
