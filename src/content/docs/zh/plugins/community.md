---
summary: "社区维护的 OpenClaw 插件：浏览、安装并提交您自己的插件"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "社区插件"
---

# 社区插件

社区插件是由社区构建和维护的第三方软件包，它们通过新的渠道、工具、提供商或其他功能扩展 OpenClaw。它们发布在 [ClawHub](/zh/tools/clawhub) 或 npm 上，并且可以通过单个命令安装。

ClawHub 是社区插件的官方发现平台。不要为了仅在此处添加您的插件以增加可见性而仅提交文档相关的 PR；请将其发布到 ClawHub。

```bash
openclaw plugins install <package-name>
```

OpenClaw 会首先检查 ClawHub 并自动回退到 npm。

## 已列出的插件

### Apify

使用 20,000 多个现成的爬虫从任何网站抓取数据。让您的智能体从 Instagram、Facebook、TikTok、YouTube、Google 地图、Google 搜索、电子商务网站等提取数据——只需发问即可。

- **npm:** `@apify/apify-openclaw-plugin`
- **repo:** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

用于 Codex App Server 对话的独立 OpenClaw 网桥。将聊天绑定到 Codex 线程，使用纯文本与其对话，并使用聊天原生命令控制它，以进行恢复、规划、审查、模型选择、压缩等操作。

- **npm:** `openclaw-codex-app-server`
- **repo:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

使用流模式的企业机器人集成。通过任何钉钉客户端支持文本、图片和文件消息。

- **npm:** `@largezhou/ddingtalk`
- **repo:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

用于 OpenClaw 的无损上下文管理插件。基于 DAG 的对话摘要与增量压缩——在减少令牌使用的同时保持完整的上下文保真度。

- **npm:** `@martian-engineering/lossless-claw`
- **repo:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

将智能体跟踪导出到 Opik 的官方插件。监控智能体行为、成本、令牌、错误等。

- **npm:** `@opik/opik-openclaw`
- **repo:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

为您的 OpenClaw 代理配备 Live2D 虚拟形象，支持实时口型同步、表情表达和文本转语音。包含用于 AI 资产生成的创建者工具，以及一键部署到 Prometheus Marketplace 的功能。目前处于 alpha 阶段。

- **npm：** `@prometheusavatar/openclaw-plugin`
- **repo：** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

通过 QQ Bot OpenClaw 将 API 连接到 QQ。支持私聊、群组提及、渠道消息，以及语音、图片、视频和文件等富媒体。

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

## 提交您的插件

我们欢迎有用、有文档记录且安全运行社区插件。

<Steps>
  <Step title="发布到 ClawHub 或 npm">
    您的插件必须能够通过 `openclaw plugins install \<package-name\>` 安装。
    发布到 [ClawHub](/zh/tools/clawhub)（首选）或 npm。
    参阅[构建插件](/zh/plugins/building-plugins)获取完整指南。

  </Step>

  <Step title="托管在 GitHub 上">
    源代码必须位于包含设置文档和问题跟踪器的公共存储库中。

  </Step>

  <Step title="文档 PR 仅用于源文档更改">
    您不需要仅仅为了让插件被发现而提交文档 PR。请将其发布到 ClawHub。

    仅当 OpenClaw 的源文档需要实际的内容更改时，例如更正安装指南或添加属于主文档集的跨存储库文档时，才打开文档 PR。

  </Step>
</Steps>

## 质量门槛

| 要求                    | 原因                                         |
| ----------------------- | -------------------------------------------- |
| 已发布到 ClawHub 或 npm | 用户需要 `openclaw plugins install` 才能工作 |
| 公共 GitHub 仓库        | 源代码审查、问题跟踪、透明度                 |
| 安装与使用文档          | 用户需要知道如何进行配置                     |
| 积极维护                | 近期有更新或对 Issue 处理及时                |

低质量的封装、所有权不明确或无人维护的软件包可能会被拒绝。

## 相关

- [安装和配置插件](/zh/tools/plugin) — 如何安装任何插件
- [构建插件](/zh/plugins/building-plugins) — 创建你自己的插件
- [插件清单](/zh/plugins/manifest) — 清单架构
