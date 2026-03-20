---
summary: "macOS Skills 设置 UI 和网关支持的状态"
read_when:
  - 更新 macOS Skills 设置 UI
  - 更改 Skills 控制或安装行为
title: "Skills (macOS)"
---

# Skills (macOS)

macOS 应用通过网关展示 OpenClaw Skills；它不会在本地解析 Skills。

## 数据源

- `skills.status` (gateway) 返回所有 Skills 以及资格和缺失要求
  （包括捆绑 Skills 的允许列表块）。
- 需求源自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义安装选项 (brew/node/go/uv)。
- 应用调用 `skills.install` 以在网关主机上运行安装程序。
- 当提供多个安装程序时，网关仅显示一个首选安装程序
  （优先 brew，否则为来自 `skills.install` 的 node 管理器，默认 npm）。

## Env/API keys

- 应用将密钥存储在 `skills.entries.<skillKey>` 下的 `~/.openclaw/openclaw.json` 中。
- `skills.update` 会修补 `enabled`、`apiKey` 和 `env`。

## 远程模式

- 安装 + 配置更新发生在网关主机上（而非本地 Mac）。

import en from "/components/footer/en.mdx";

<en />
