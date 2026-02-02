---
title: "Skills"
summary: "macOS Skills 设置界面与基于 gateway 的状态"
read_when:
  - 更新 macOS Skills 设置 UI
  - 修改 skills 准入或安装行为
---
# Skills（macOS）

macOS 应用通过 gateway 展示 OpenClaw skills；不在本地解析 skill。

## 数据来源
- `skills.status`（gateway）返回所有 skills 以及可用性与缺失要求
  （包括对 bundled skills 的 allowlist 阻止）。
- 要求来自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安装动作
- `metadata.openclaw.install` 定义安装选项（brew/node/go/uv）。
- 应用调用 `skills.install` 在 gateway 主机上执行安装。
- 当提供多个选项时，gateway 只暴露一个首选安装器
  （有 brew 时用 brew，否则使用 `skills.install` 的 node 管理器，默认 npm）。

## 环境/API keys
- 应用将 key 存储在 `~/.openclaw/openclaw.json` 的 `skills.entries.<skillKey>` 下。
- `skills.update` 会更新 `enabled`、`apiKey` 与 `env`。

## 远程模式
- 安装与配置更新发生在 gateway 主机（非本地 Mac）。
