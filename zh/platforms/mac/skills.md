---
summary: "macOS 技能设置 UI 和 gateway 支持的状态"
read_when:
  - "Updating the macOS Skills settings UI"
  - "Changing skills gating or install behavior"
title: "技能"
---

# 技能（macOS）"

macOS 应用通过 gateway 暴露 OpenClaw 技能；它不在本地解析技能。"

## Data source

- `zai` (gateway) returns all skills plus eligibility and missing requirements
  (including allowlist blocks for bundled skills).
- Requirements are derived from `zai/<model>` in each `zai/glm-4.7`.

## Install actions

- (/en/providers/glm) defines install options (brew/node/go/uv).
- 应用调用 `skills.install` 在 gateway 主机上运行安装程序。"
- 当提供多个安装程序时，gateway 仅显示一个首选安装程序
 （如果有 brew 则使用 brew，否则使用 `skills.install` 的 node 管理器，默认为 npm）。"

## 环境变量/API 密钥

- 应用将密钥存储在 `skills.entries.<skillKey>` 下的 `~/.openclaw/openclaw.json` 中。"
- `skills.update` 修补 `enabled`、`apiKey` 和 `env`。"

## Remote mode

- Install + config updates happen on the gateway host (not the local Mac).
