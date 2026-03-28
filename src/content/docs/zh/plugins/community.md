---
summary: "社区维护的 OpenClaw 插件：浏览、安装并提交您自己的插件"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "社区插件"
---

# 社区插件

社区插件是第三方软件包，通过新的渠道、工具、提供商或其他功能来扩展 OpenClaw。它们由社区构建和维护，发布在 [ClawHub](/zh/tools/clawhub) 或 npm 上，并可通过单条命令安装。

```bash
openclaw plugins install <package-name>
```

OpenClaw 会首先检查 ClawHub，并自动回退到 npm。

## 列出的插件

### Codex App Server Bridge

用于 Codex App Server 对话的独立 OpenClaw 桥接器。将聊天绑定到 Codex 线程，使用纯文本与其交谈，并通过聊天原生命令对其进行恢复、规划、审查、模型选择、压缩等控制。

- **npm：** `openclaw-codex-app-server`
- **repo：** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

使用 Stream 模式的企业机器人集成。支持通过任何钉钉客户端发送文本、图片和文件消息。

- **npm：** `@largezhou/ddingtalk`
- **repo：** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

OpenClaw 的无损上下文管理插件。基于 DAG 的对话摘要，具有增量压缩功能 — 在减少 token 使用的同时保持完整的上下文保真度。

- **npm：** `@martian-engineering/lossless-claw`
- **repo：** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

将 agent 追踪数据导出到 Opik 的官方插件。监控 agent 行为、成本、token、错误等。

- **npm：** `@opik/opik-openclaw`
- **repo：** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### QQbot

通过 QQ Bot API 将 OpenClaw 连接到 QQ。支持私聊、群提及、渠道消息以及包括语音、图片、视频和文件在内的富媒体。

- **npm：** `@sliverp/qqbot`
- **repo：** [github.com/sliverp/qqbot](https://github.com/sliverp/qqbot)

```bash
openclaw plugins install @sliverp/qqbot
```

### wecom

OpenClaw 企业微信通道插件。
一个由企业微信 AI Bot WebSocket 持久连接驱动的机器人插件，支持私信与群聊、流式回复和主动消息。

- **npm：** `@wecom/wecom-openclaw-plugin`
- **repo：** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## 提交您的插件

我们欢迎实用、有文档且运行安全的社区插件。

<Steps>
  <Step title="发布到 ClawHub 或 npm">
    您的插件必须可以通过 `openclaw plugins install \<package-name\>` 安装。
    发布到 [ClawHub](/zh/tools/clawhub)（首选）或 npm。
    请参阅 [构建插件](/zh/plugins/building-plugins) 了解完整指南。

  </Step>

  <Step title="托管在 GitHub">
    源代码必须位于包含设置文档和问题跟踪器的公共仓库中。

  </Step>

  <Step title="打开 PR">
    使用以下信息将您的插件添加到此页面：

    - 插件名称
    - npm 包名称
    - GitHub 仓库 URL
    - 一行描述
    - 安装命令

  </Step>
</Steps>

## 质量门槛

| 要求                  | 原因                                         |
| --------------------- | -------------------------------------------- |
| 发布于 ClawHub 或 npm | 用户需要 `openclaw plugins install` 才能工作 |
| 公共 GitHub 仓库      | 源代码审查、问题跟踪、透明度                 |
| 设置和使用文档        | 用户需要知道如何配置它                       |
| 积极维护              | 最近的更新或响应迅速的问题处理               |

低投入的封装、所有权不明确或无人维护的包可能会被拒绝。

## 相关

- [安装和配置插件](/zh/tools/plugin) — 如何安装任何插件
- [构建插件](/zh/plugins/building-plugins) — 创建您自己的插件
- [插件清单](/zh/plugins/manifest) — 清单架构
