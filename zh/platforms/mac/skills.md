---
summary: "macOS Skills 设置界面和网关支持的状态"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills"
---

# Skills (macOS)

macOS 应用程序通过网关展示 OpenClaw skills；它不在本地解析 skills。

## 数据源

- `skills.status` (gateway) 返回所有 skills 以及资格条件和缺失的需求
  （包括捆绑 skills 的允许列表块）。
- 需求源自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义了安装选项。
- 应用程序调用 `skills.install` 在网关主机上运行安装程序。
- 当提供多个安装程序时，网关仅显示一个首选安装程序
  （如果有 brew 则优先使用，否则使用来自 `skills.install` 的 node 管理器，默认为 npm）。

## 环境变量/API 密钥

- 应用程序将密钥存储在 `skills.entries.<skillKey>` 下的 `~/.openclaw/openclaw.json` 中。
- `skills.update` 补丁 `enabled`、`apiKey` 和 `env`。

## 远程模式

- 安装 + 配置更新发生在网关主机上（而非本地 Mac）。

import zh from '/components/footer/zh.mdx';

<zh />
