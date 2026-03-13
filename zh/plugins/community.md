---
summary: "社区插件：质量标准、托管要求和 PR 提交流程"
read_when:
  - You want to publish a third-party OpenClaw plugin
  - You want to propose a plugin for docs listing
title: "社区插件"
---

# 社区插件

本页面跟踪适用于 OpenClaw 的高质量**社区维护插件**。

当社区插件符合质量标准时，我们接受将其添加到此处的 PR。

## 列入列表的要求

- 插件包发布在 npmjs 上（可通过 `openclaw plugins install <npm-spec>` 安装）。
- 源代码托管在 GitHub（公共仓库）。
- 仓库包含设置/使用文档和问题追踪器。
- 插件具有明确的维护信号（活跃的维护者、最近的更新或响应迅速的问题处理）。

## 如何提交

打开一个 PR，将您的插件添加到此页面，并提供：

- 插件名称
- npm 包名
- GitHub 仓库 URL
- 一句话描述
- 安装命令

## 审核标准

我们更倾向于实用、文档齐全且运行安全的插件。
低质量的封装、所有权不明确或无人维护的包可能会被拒绝。

## 候选格式

添加条目时使用此格式：

- **插件名称** — 简短描述
  npm: `@scope/package`
  repo: `https://github.com/org/repo`
  install: `openclaw plugins install @scope/package`

## 已列出的插件

- **WeChat** — 通过 WeChatPadPro（iPad 协议）将 OpenClaw 连接到微信个人账号。支持文本、图片和文件交换，以及关键词触发的对话。
  npm: `@icesword760/openclaw-wechat`
  repo: `https://github.com/icesword0760/openclaw-wechat`
  install: `openclaw plugins install @icesword760/openclaw-wechat`

import zh from '/components/footer/zh.mdx';

<zh />
