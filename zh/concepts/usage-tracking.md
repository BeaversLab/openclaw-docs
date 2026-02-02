---
summary: "用量追踪界面与凭据要求"
read_when:
  - 正在接入 provider 的使用量/配额界面
  - 需要解释用量追踪行为或认证要求
title: "Usage Tracking"
---
# 用量追踪

## 是什么
- 直接从 provider 的 usage 端点拉取用量/配额。
- 不估算成本；只显示 provider 报告的窗口。

## 展示位置
- 聊天中的 `/status`：带 emoji 的状态卡（会话 tokens + 估算成本，仅 API key）。当可用时显示**当前模型 provider**的 usage。
- 聊天中的 `/usage off|tokens|full`：每条回复的用量脚注（OAuth 仅显示 tokens）。
- 聊天中的 `/usage cost`：OpenClaw 会话日志聚合的本地成本摘要。
- CLI：`openclaw status --usage` 输出按 provider 的完整拆解。
- CLI：`openclaw channels list` 会在 provider 配置旁打印同一 usage 快照（用 `--no-usage` 跳过）。
- macOS 菜单栏：Context 下的 “Usage” 区域（仅在可用时）。

## Providers + 凭据
- **Anthropic (Claude)**：auth profiles 中的 OAuth tokens。
- **GitHub Copilot**：auth profiles 中的 OAuth tokens。
- **Gemini CLI**：auth profiles 中的 OAuth tokens。
- **Antigravity**：auth profiles 中的 OAuth tokens。
- **OpenAI Codex**：auth profiles 中的 OAuth tokens（若存在则使用 accountId）。
- **MiniMax**：API key（coding plan key；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小时 coding plan 窗口。
- **z.ai**：通过 env/config/auth store 的 API key。

若无匹配的 OAuth/API 凭据，用量信息将被隐藏。
