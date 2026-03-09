---
summary: "使用跟踪界面和凭证要求"
read_when:
  - "You are wiring provider usage/quota surfaces"
  - "You need to explain usage tracking behavior or auth requirements"
title: "使用跟踪"
---

# 使用跟踪

## 功能说明

- 直接从提供商的使用端点提取使用量/配额。
- 无估算成本；仅显示提供商报告的时间窗口。

## 显示位置

- 聊天中的 `/status`：包含会话令牌 + 估算成本的表情符号丰富状态卡（仅 API 密钥）。提供商使用量在可用时显示**当前模型提供商**的数据。
- 聊天中的 `/usage off|tokens|full`：每响应使用量页脚（OAuth 仅显示令牌）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志聚合的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的按提供商细分。
- CLI：`openclaw channels list` 打印相同的使用快照以及提供商配置（使用 `--no-usage` 跳过）。
- macOS 菜单栏：Context 下的”使用量”部分（仅在可用时）。

## 提供商 + 凭证

- **Anthropic (Claude)**：认证配置文件中的 OAuth 令牌。
- **GitHub Copilot**：认证配置文件中的 OAuth 令牌。
- **Gemini CLI**：认证配置文件中的 OAuth 令牌。
- **Antigravity**：认证配置文件中的 OAuth 令牌。
- **OpenAI Codex**：认证配置文件中的 OAuth 令牌（存在时使用 accountId）。
- **MiniMax**：API 密钥（编码计划密钥；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小时编码计划窗口。
- **z.ai**：通过环境变量/配置/认证存储的 API 密钥。

如果不存在匹配的 OAuth/API 凭证，使用量将被隐藏。
