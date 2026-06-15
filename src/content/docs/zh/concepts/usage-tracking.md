---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Usage tracking"
---

## 它是什么

- 直接从提供商的使用情况端点拉取提供商使用量/配额。
- 无估算费用；仅显示提供商报告的配额窗口或账户状态摘要。
- 人类可读的配额窗口状态输出会被规范化为 `X% left`，即使上游 API 报告的是已用配额、剩余配额或仅原始计数。没有可重置配额窗口的提供商可以改为显示提供商摘要文本，例如余额。
- 当实时会话快照稀疏时，会话级别的 `/status` 和 `session_status` 可以回退到最新的转录使用记录。该回退会填充缺失的令牌/缓存计数器，可以恢复活跃的运行时模型标签，并且当会话元数据缺失或较小时，更倾向于使用较大的面向提示词的总数。现有的非零实时值仍然优先。

## 它显示在哪里

- 聊天中的 `/status`：带有会话令牌和估算费用（仅限 API 密钥）的丰富表情符号状态卡。如果可用，提供商使用情况会以规范化的 `X% left` 窗口或提供商摘要文本的形式显示**当前模型提供商**的信息。
- 聊天中的 `/usage off|tokens|full`：每次响应的使用情况页脚（OAuth 仅显示令牌）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志聚合的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的按提供商分类的明细。
- CLI：`openclaw channels list` 打印相同的使用情况快照以及提供商配置（使用 `--no-usage` 跳过）。
- macOS 菜单栏：Context（上下文）下的“Usage”（使用情况）部分（仅在可用时显示）。

## 提供商 + 凭据

- **Anthropic (Claude)**：配置文件中的 OAuth 令牌。
- **GitHub Copilot**：配置文件中的 OAuth 令牌。
- **Gemini CLI**：配置文件中的 OAuth 令牌。
  - JSON 使用情况回退到 `stats`；`stats.cached` 被标准化为 `cacheRead`。
- **OpenAI Codex**：配置文件中的 OAuth 令牌（如果存在则使用 accountId）。
- **MiniMax**：API 密钥或 MiniMax OAuth 身份验证配置文件。OpenClaw 将
  `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额
  界面，优先使用存储的 MiniMax OAuth（如果存在），否则回退
  到 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  使用情况轮询从 `models.providers.minimax-portal.baseUrl`
  或 `models.providers.minimax.baseUrl` 推导编码计划主机（如果已配置），否则使用
  MiniMax CN 主机。
  MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示**剩余**
  配额，因此 OpenClaw 会在显示前将其反转；如果存在基于计数的字段，则优先使用这些字段。
  - 编码计划窗口标签来自提供商的小时/分钟字段（如果
    存在），然后回退到 `start_time` / `end_time` 跨度。
  - 如果编码计划端点返回 `model_remains`，OpenClaw 优先选择
    聊天模型条目，当缺少显式的
    `window_hours` / `window_minutes` 字段时，从时间戳推导窗口标签，并在计划标签中包含模型
    名称。
- **Xiaomi MiMo**：通过 env/config/auth store（环境变量/配置/身份验证存储）使用 API 密钥（`XIAOMI_API_KEY`）。
- **z.ai**: 通过环境变量/配置/认证存储的 API 密钥。
- **DeepSeek**：通过环境变量/配置文件/身份验证存储（`DEEPSEEK_API_KEY`）提供的 API 密钥。OpenClaw 调用 DeepSeek 的余额端点，并将提供商报告的余额显示为文本，而不是剩余百分比配额窗口。

当无法解析可用的提供商使用身份验证时，使用情况会被隐藏。提供商可以提供特定于插件的使用身份验证逻辑；否则 OpenClaw 将回退到从身份验证配置文件、环境变量或配置文件中匹配 OAuth/API 密钥凭据。

## 相关内容

- [Token use and costs](/zh/reference/token-use)
- [API usage and costs](/zh/reference/api-usage-costs)
- [Prompt caching](/zh/reference/prompt-caching)
