---
summary: "使用情况跟踪界面和凭据要求"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "使用情况跟踪"
---

# 使用情况跟踪

## 它是什么

- 直接从提供商的使用情况端点拉取提供商的使用情况/配额。
- 无估算费用；仅限提供商报告的窗口。

## 显示位置

- `/status` 在聊天中：包含会话令牌 + 估算费用（仅限 API 密钥）的丰富表情符号状态卡。提供商使用情况显示当前的模型提供商（如果可用）。
- `/usage off|tokens|full` 在聊天中：每次响应的使用情况页脚（OAuth 仅显示令牌）。
- `/usage cost` 在聊天中：从 OpenClaw 会话日志汇总的本地费用摘要。
- CLI：`openclaw status --usage` 打印完整的按提供商细分。
- CLI：`openclaw channels list` 在提供商配置旁边打印相同的使用情况快照（使用 `--no-usage` 跳过）。
- macOS 菜单栏：上下文下的“使用情况”部分（仅在可用时）。

## 提供商 + 凭据

- **Anthropic (Claude)**：配置文件中的 OAuth 令牌。
- **GitHub Copilot**：配置文件中的 OAuth 令牌。
- **Gemini CLI**：配置文件中的 OAuth 令牌。
- **Antigravity**：配置文件中的 OAuth 令牌。
- **OpenAI Codex**：配置文件中的 OAuth 令牌（存在时使用 accountId）。
- **MiniMax**：API 密钥（编码计划密钥；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小时编码计划窗口。
- **z.ai**：通过 env/config/auth store 提供的 API 密钥。

如果不存在匹配的 OAuth/API 凭据，使用情况将被隐藏。

import zh from '/components/footer/zh.mdx';

<zh />
