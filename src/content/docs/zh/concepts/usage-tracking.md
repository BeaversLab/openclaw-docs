---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Usage Tracking"
---

# 使用情况跟踪

## 它是什么

- 直接从提供商的使用情况端点拉取提供商的使用情况/配额。
- 无估算费用；仅限提供商报告的窗口。
- 人类可读的状态输出被规范化为 `X% left`，即使上游 API 报告的是已用配额、剩余配额或仅原始计数。
- 当实时会话快照稀疏时，会话级别的 `/status` 和 `session_status` 可以回退到最新的逐字稿使用条目。该回退会填充缺失的令牌/缓存计数器，可以恢复活动运行时模型标签，并且在会话元数据缺失或较小时，优先选择较大的面向提示的总数。现有的非零实时值仍然优先。

## 显示位置

- 聊天中的 `/status`：包含会话令牌 + 预估成本（仅限 API 密钥）的丰富表情符号状态卡。提供商使用情况在可用时以规范化的 `X% left` 窗口显示 **当前模型提供商** 的数据。
- 聊天中的 `/usage off|tokens|full`：每次响应的使用情况页脚（OAuth 仅显示令牌）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志聚合的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的按提供商细分的列表。
- CLI：`openclaw channels list` 在提供商配置旁边打印相同的使用情况快照（使用 `--no-usage` 跳过）。
- macOS 菜单栏：上下文下的“使用情况”部分（仅在可用时）。

## 提供商 + 凭据

- **Anthropic (Claude)**：身份验证配置文件中的 OAuth 令牌。
- **GitHub Copilot**：身份验证配置文件中的 OAuth 令牌。
- **Gemini CLI**：身份验证配置文件中的 OAuth 令牌。
  - JSON 使用情况回退到 `stats`；`stats.cached` 被规范化为 `cacheRead`。
- **OpenAI Codex**：身份验证配置文件中的 OAuth 令牌（存在时使用 accountId）。
- **MiniMax**：API 密钥或 MiniMax OAuth 身份验证配置文件。OpenClaw 将
  `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额
  界面，如果存在存储的 MiniMax OAuth 则优先使用，否则回退到
  `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示**剩余**
  配额，因此 OpenClaw 在显示之前会将其反转；当存在基于计数的字段时，优先采用这些字段。
  - Coding-plan 窗口标签源自提供商的小时/分钟字段（如果存在），
    否则回退到 `start_time` / `end_time` 范围。
  - 如果 coding-plan 端点返回 `model_remains`，OpenClaw 会优先
    使用 chat-模型 条目，当显式的 `window_hours` / `window_minutes` 字段缺失时，根据时间戳推导窗口标签，并在计划标签中包含模型
    名称。
- **Xiaomi MiMo**：通过 env/config/auth store 获取 API 密钥（`XIAOMI_API_KEY`）。
- **z.ai**：通过 env/config/auth store 获取 API 密钥。

当无法解析可用的提供商使用情况身份验证时，使用情况会被隐藏。提供商
可以提供特定于插件的使用情况身份验证逻辑；否则 OpenClaw 会回退到
从身份验证配置文件、环境变量或配置中匹配的 OAuth/API 密钥凭据。
