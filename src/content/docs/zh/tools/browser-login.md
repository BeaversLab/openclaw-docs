---
summary: "用于浏览器自动化的手动登录 + X/Twitter 发布"
read_when:
  - You need to log into sites for browser automation
  - You want to post updates to X/Twitter
title: "浏览器登录"
---

# 浏览器登录 + X/Twitter 发帖

## 手动登录（推荐）

当站点需要登录时，请在**主机**浏览器配置文件（openclaw 浏览器）中**手动登录**。

请**勿**向模型提供您的凭据。自动登录通常会触发反机器人防御措施，并可能导致账户被锁定。

返回主浏览器文档：[浏览器](/zh/tools/browser)。

## 使用的是哪个 Chrome 配置文件？

OpenClaw 控制一个**专用的 Chrome 配置文件**（名为 `openclaw`，橙色 UI）。这与您日常使用的浏览器配置文件是分开的。

对于代理浏览器工具调用：

- 默认选择：代理应使用其隔离的 `openclaw` 浏览器。
- 仅当现有的登录会话很重要且用户在计算机旁可以点击/批准任何附加提示时，才使用 `profile="user"`。
- 如果您有多个用户浏览器配置文件，请明确指定配置文件，而不是猜测。

访问它的两种简单方法：

1. **让代理打开浏览器**，然后您自己登录。
2. **通过 CLI 打开**：

```exec
openclaw browser start
openclaw browser open https://x.com
```

如果您有多个配置文件，请传递 `--browser-profile <name>`（默认为 `openclaw`）。

## X/Twitter：推荐流程

- **阅读/搜索/话题串**：使用 **主机** 浏览器（手动登录）。
- **发布更新**：使用 **主机** 浏览器（手动登录）。

## 沙箱隔离 + 主机浏览器访问

沙箱隔离的浏览器会话 **更有可能** 触发机器人检测。对于 X/Twitter（以及其他严格的站点），首选使用 **主机** 浏览器。

如果代理处于沙箱隔离状态，浏览器工具默认使用沙箱。要允许主机控制：

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

```exec
openclaw browser open https://x.com --browser-profile openclaw --target host
```

或为发布更新的代理禁用沙箱隔离。
