---
summary: "Zalo Personal 插件：通过原生 zca-js 实现 QR 登录 + 消息发送（插件安装 + 通道配置 + 工具）"
read_when:
  - You want Zalo Personal (unofficial) support in OpenClaw
  - You are configuring or developing the zalouser plugin
title: "Zalo Personal 插件"
---

# Zalo Personal（插件）

通过插件为 OpenClaw 提供 Zalo Personal 支持，使用原生 `zca-js` 来自动化普通的 Zalo 用户账号。

> **警告：** 非官方自动化可能会导致账户暂停/封禁。使用风险自负。

## 命名

通道 ID 为 `zalouser`，以明确表明这是自动化 **个人 Zalo 账号**（非官方）。我们将 `zalo` 保留给潜在的未来官方 Zalo API 集成。

## 运行位置

此插件在 **Gateway 进程内部** 运行。

如果您使用远程 Gateway，请在 **运行 Gateway 的机器** 上安装/配置它，然后重启 Gateway。

不需要外部的 `zca`/`openzca` CLI 二进制文件。

## 安装

### 选项 A：从 npm 安装

```bash
openclaw plugins install @openclaw/zalouser
```

之后重启 Gateway。

### 选项 B：从本地文件夹安装（开发）

```bash
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

之后重启 Gateway。

## 配置

通道配置位于 `channels.zalouser` 下（而非 `plugins.entries.*`）：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"
```

## Agent 工具

工具名称：`zalouser`

动作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`

通道消息动作还支持 `react` 用于消息反应。

import zh from '/components/footer/zh.mdx';

<zh />
