---
summary: "用于浏览器自动化的手动登录 + X/Twitter 发布"
read_when:
  - 您需要登录站点以进行浏览器自动化
  - 您想要向 X/Twitter 发布更新
title: "浏览器登录"
---

# 浏览器登录 + X/Twitter 发布

## 手动登录（推荐）

当站点需要登录时，请在 **宿主** 浏览器配置文件（即 openclaw 浏览器）中**手动登录**。

请**勿**将您的凭据提供给模型。自动登录经常会触发反机器人防御措施，并可能导致帐户被锁定。

返回主浏览器文档：[Browser](/zh/tools/browser)。

## 使用的是哪个 Chrome 配置文件？

OpenClaw 控制一个 **专用 Chrome 配置文件**（名为 `openclaw`，橙色 UI）。这与您的日常浏览器配置文件是分开的。

对于代理浏览器工具调用：

- 默认选择：代理应使用其隔离的 `openclaw` 浏览器。
- 仅当现有的登录会话很重要且用户在计算机旁边点击/批准任何附加提示时，才使用 `profile="user"`。
- 如果您有多个用户浏览器配置文件，请明确指定配置文件而不是猜测。

有两种简单的方法可以访问它：

1. **让代理打开浏览器**，然后您自己登录。
2. **通过 CLI 打开它**：

```bash
openclaw browser start
openclaw browser open https://x.com
```

如果您有多个配置文件，请传递 `--browser-profile <name>`（默认为 `openclaw`）。

## X/Twitter：推荐流程

- **阅读/搜索/话题：** 使用 **主机** 浏览器（手动登录）。
- **发布更新：** 使用 **主机** 浏览器（手动登录）。

## 沙箱隔离 + 主机浏览器访问

沙箱隔离的浏览器会话 **更有可能** 触发机器人检测。对于 X/Twitter（和其他严格的站点），首选 **主机** 浏览器。

如果代理是沙箱隔离的，浏览器工具默认使用沙箱。要允许主机控制：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

然后定位主机浏览器：

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

或者为发布更新的代理禁用沙箱隔离。

import zh from "/components/footer/zh.mdx";

<zh />
