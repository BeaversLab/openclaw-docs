---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Usage tracking"
---

## 它是什么

- 直接从提供商的使用情况端点拉取提供商使用量/配额。
- 无估算成本；仅限提供商报告的窗口。
- 人类可读的状态输出被标准化为 `X% left`，即使上游 API 报告的是已消耗配额、剩余配额或仅原始计数。
- 当实时会话快照稀疏时，会话级别的 `/status` 和 `session_status` 可以回退到最新的转录使用记录。该回退会填充缺失的令牌/缓存计数器，可以恢复活跃的运行时模型标签，并且当会话元数据缺失或较小时，更倾向于使用较大的面向提示词的总数。现有的非零实时值仍然优先。

## 它显示在哪里

- 聊天中的 `/status`：包含会话令牌 + 估算成本（仅限 API 密钥）的表情符号丰富状态卡。提供商使用情况显示**当前模型提供商**，如果有可用的话，显示为标准化的 `X% left` 窗口。
- 聊天中的 `/usage off|tokens|full`：每次响应的使用情况页脚（OAuth 仅显示令牌）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志聚合的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的按提供商分类的明细。
- CLI：`openclaw channels list` 打印相同的使用情况快照以及提供商配置（使用 `--no-usage` 跳过）。
- macOS 菜单栏：上下文下的“使用情况”部分（如果可用）。

## 提供商 + 凭据

- **Anthropic (Claude)**：配置文件中的 OAuth 令牌。
- **GitHub Copilot**：配置文件中的 OAuth 令牌。
- **Gemini CLI**：配置文件中的 OAuth 令牌。
  - JSON 使用情况回退到 `stats`；`stats.cached` 被标准化为 `cacheRead`。
- **OpenAI Codex**：配置文件中的 OAuth 令牌（如果存在则使用 accountId）。
- **MiniMax**: API 密钥或 MiniMax OAuth 认证配置文件。OpenClaw 将
  `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额
  表面，如果存在存储的 MiniMax OAuth 则优先使用，否则回退
  到 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示**剩余**
  配额，因此 OpenClaw 在显示之前会将其反转；当存在基于计数的字段时，优先使用它们。
  - Coding-plan 窗口标签首先来自提供商的小时/分钟字段（如果
    存在），然后回退到 `start_time` / `end_time` 跨度。
  - 如果 coding-plan 端点返回 `model_remains`，OpenClaw 会优先
    选择聊天模型条目，当缺少显式的 `window_hours` / `window_minutes` 字段时，从时间戳推导窗口标签，并在计划标签中包含模型
    名称。
- **Xiaomi MiMo**: 通过环境变量/配置/认证存储的 API 密钥 (`XIAOMI_API_KEY`)。
- **z.ai**: 通过环境变量/配置/认证存储的 API 密钥。

当无法解析可用的提供商使用情况认证时，使用情况会被隐藏。提供商
可以提供特定于插件的使用情况认证逻辑；否则 OpenClaw 会回退
到从认证配置文件、环境变量
或配置中匹配的 OAuth/API 密钥凭据。

## 相关

- [Token 使用和成本](/zh/reference/token-use)
- [API 使用和成本](/zh/reference/api-usage-costs)
- [提示词缓存](/zh/reference/prompt-caching)
