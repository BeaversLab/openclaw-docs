---
summary: "社区维护的 OpenClaw 插件：浏览、安装和提交您自己的插件"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "社区插件"
---

社区插件是由社区构建和维护的第三方软件包，它们通过新的渠道、工具、提供商或其他功能来扩展 OpenClaw。它们通常发布在 [ClawHub](/zh/clawhub) 上，并且可以通过一条命令安装。在 ClawHub pack 安装包推出之际，npm 仍然是裸包规范的默认启动方式。

ClawHub 是社区插件的权威发现平台。不要为了在此处提高可见性而仅提交文档相关的 PR；请将其发布到 ClawHub 上。

```bash
openclaw plugins install clawhub:<package-name>
```

对于托管在 npm 上的包，请使用 `openclaw plugins install <package-name>`。

## 列出的插件

### Apify

利用 20,000 多个现成的爬虫从任何网站抓取数据。只需通过简单的指令，即可让您的 Agent 从 Instagram、Facebook、TikTok、YouTube、Google Maps、Google 搜索、电商网站等提取数据。

- **npm：** `@apify/apify-openclaw-plugin`
- **repo：** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

用于 Codex App Server 对话的独立 OpenClaw 桥接器。将聊天绑定到 Codex 线程，使用纯文本与其对话，并使用聊天原生命令控制其恢复、规划、审查、模型选择、压缩等操作。

- **npm：** `openclaw-codex-app-server`
- **repo：** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

使用流模式的企业级机器人集成。通过任何钉钉客户端支持文本、图片和文件消息。

- **npm：** `@largezhou/ddingtalk`
- **repo：** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

OpenClaw 的无损上下文管理插件。基于 DAG 的对话摘要，采用增量压缩 —— 在减少 token 使用的同时保留完整的上下文保真度。

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

### Prometheus Avatar

为您的 OpenClaw 代理提供具有实时口型同步、表情表达和文本转语音功能的 Live2D 头像。包括用于 AI 资产生成的创作者工具以及一键部署到 Prometheus 市场。目前处于 Alpha 阶段。

- **npm：** `@prometheusavatar/openclaw-plugin`
- **repo：** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

通过 QQ Bot OpenClaw 将 API 连接到 QQ。支持私聊、群提及、渠道消息以及包括语音、图片、视频和文件在内的富媒体。

当前的 OpenClaw 发行版已包含 QQ Bot。对于正常安装，请使用 [QQ Bot](/zh/channels/qqbot) 中的内置设置；仅当您有意使用腾讯维护的独立软件包时，才此外部插件。

- **npm：** `@tencent-connect/openclaw-qqbot`
- **repo：** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

由腾讯企业微信团队为 OpenClaw 开发的企业微信渠道插件。基于企业微信 Bot WebSocket 持久连接，支持直接消息与群聊、流式回复、主动消息、图片/文件处理、Markdown 格式、内置访问控制，以及文档/会议/消息技能。

- **npm：** `@wecom/wecom-openclaw-plugin`
- **repo：** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

### Yuanbao

由腾讯 Yuanbao 团队开发的 OpenClaw Yuanbao 渠道插件。基于 WebSocket 持久连接，支持私信与群聊、流式回复、主动消息、图片/文件/音频/视频处理、Markdown 格式化、内置访问控制以及斜杠命令菜单。

- **npm：** `openclaw-plugin-yuanbao`
- **repo：** [github.com/YuanbaoTeam/yuanbao-openclaw-plugin](https://github.com/YuanbaoTeam/yuanbao-openclaw-plugin)

```bash
openclaw plugins install openclaw-plugin-yuanbao
```

## 提交您的插件

我们欢迎实用、有文档且安全可运行的社区插件。

<Steps>
  <Step title="ClawHubnpm发布到 ClawHub 或 npm">
    您的插件必须可以通过 `openclaw plugins install \<package-name\>`ClawHub 安装。
    除非您特别需要仅通过 npm 分发，否则请发布到 [ClawHub](/zh/clawhubnpm)。
    请参阅 [构建插件](/zh/plugins/building-plugins) 获取完整指南。

  </Step>

  <Step title="托管在 GitHub">
    源代码必须位于包含设置文档和问题跟踪器的公共仓库中。

  </Step>

  <Step title="Use docs PRs only for source-doc changes">
    您无需仅仅为了提高插件的可见性而提交文档 PR。请将其发布到
    ClawHub 上。

    仅当 OpenClaw 的源文档需要进行实际的内容更改时，
    才提交文档 PR，例如修正安装指南或添加属于主文档集的跨仓库文档。

  </Step>
</Steps>

## 质量门槛

| 要求                    | 原因                                             |
| ----------------------- | ------------------------------------------------ |
| 已发布于 ClawHub 或 npm | 用户需要 `openclaw plugins install` 才能正常工作 |
| 公开的 GitHub 仓库      | 源代码审查、问题跟踪、透明度                     |
| 设置和使用文档          | 用户需要知道如何进行配置                         |
| 积极维护                | 最近有更新或积极处理问题                         |

低质量的封装、所有权不明确或未维护的包可能会被拒绝。

## 相关内容

- [安装和配置插件](/zh/tools/plugin) — 如何安装任何插件
- [构建插件](/zh/plugins/building-plugins) — 创建您自己的插件
- [插件清单](/zh/plugins/manifest) — 清单架构
