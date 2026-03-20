---
summary: "社区插件：质量门槛、托管要求和 PR 提交路径"
read_when:
  - 您想发布第三方 OpenClaw 插件
  - 您想提议将插件列入文档列表
title: "社区插件"
---

# 社区插件

本页面追踪 OpenClaw 的高质量**社区维护插件**。

当社区插件符合质量标准时，我们接受将其添加到此处的 PR。

## 列入要求

- 插件包已发布在 npmjs 上（可通过 `openclaw plugins install <npm-spec>` 安装）。
- 源代码托管在 GitHub（公共仓库）上。
- 仓库包含设置/使用文档和问题跟踪器。
- 插件有明确的维护信号（活跃的维护者、最近的更新或响应迅速的问题处理）。

## 如何提交

打开一个 PR 将您的插件添加到此页面，需包含：

- 插件名称
- npm 包名称
- GitHub 仓库 URL
- 一句话描述
- 安装命令

## 审核标准

我们更喜欢有用、有文档且运行安全的插件。
低质量的封装、所有权不清或无人维护的包可能会被拒绝。

## 候选格式

添加条目时请使用此格式：

- **插件名称** — 简短描述
  npm: `@scope/package`
  repo: `https://github.com/org/repo`
  install: `openclaw plugins install @scope/package`

## 已列出插件

- **WeChat** — 通过 WeChatPadPro（iPad 协议）将 OpenClaw 连接到微信个人账号。支持文本、图像和文件交换以及关键词触发的对话。
  npm: `@icesword760/openclaw-wechat`
  repo: `https://github.com/icesword0760/openclaw-wechat`
  install: `openclaw plugins install @icesword760/openclaw-wechat`

import zh from "/components/footer/zh.mdx";

<zh />
