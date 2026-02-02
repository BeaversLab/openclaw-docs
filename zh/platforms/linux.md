---
title: "Linux App"
summary: "Linux 支持 + 伴侣应用状态"
read_when:
  - 查看 Linux 伴侣应用状态
  - 规划平台覆盖或贡献
---
# Linux App

Gateway 在 Linux 上完全支持。**推荐运行时是 Node**。
不推荐用 Bun 作为 Gateway 运行时（WhatsApp/Telegram 有 bug）。

原生 Linux 伴侣应用在规划中。如果你愿意参与建设，欢迎贡献。

## 新手快速路径（VPS）

1) 安装 Node 22+  
2) `npm i -g openclaw@latest`  
3) `openclaw onboard --install-daemon`  
4) 在笔记本上：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`  
5) 打开 `http://127.0.0.1:18789/` 并粘贴 token

VPS 逐步指南：[exe.dev](/zh/platforms/exe-dev)

## 安装
- [Getting Started](/zh/start/getting-started)
- [Install & updates](/zh/install/updating)
- 可选流程：[Bun（实验性）](/zh/install/bun)、[Nix](/zh/install/nix)、[Docker](/zh/install/docker)

## Gateway
- [Gateway runbook](/zh/gateway)
- [Configuration](/zh/gateway/configuration)

## Gateway 服务安装（CLI）

使用以下方式之一：

```
openclaw onboard --install-daemon
```

或：

```
openclaw gateway install
```

或：

```
openclaw configure
```

提示时选择 **Gateway service**。

修复/迁移：

```
openclaw doctor
```

## 系统控制（systemd user unit）

OpenClaw 默认安装 systemd **user** 服务。共享或常驻服务器建议改用 **system** 服务。
完整 unit 示例与指导见 [Gateway runbook](/zh/gateway)。

最小配置：

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

启用：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```
