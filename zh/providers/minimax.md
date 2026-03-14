---
summary: "在 OpenClaw 中使用 MiniMax M2.5"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

MiniMax 是一家构建 **M2/M2.5** 模型系列的 AI 公司。当前专注于编码的版本是 **MiniMax M2.5**（2025年12月23日发布），专为现实世界的复杂任务而构建。

来源：[MiniMax M2.5 发布说明](https://www.minimax.io/news/minimax-m25)

## 模型概览 (M2.5)

MiniMax 重点强调了 M2.5 中的这些改进：

- 更强大的 **多语言编码**（Rust、Java、Go、C++、Kotlin、Objective-C、TS/JS）。
- 更出色的 **Web/应用开发** 和美观的输出质量（包括原生移动应用）。
- 改进了针对办公式工作流的 **复合指令** 处理，建立在交错思维和集成约束执行的基础上。
- **更简洁的回复**，具有更低的令牌使用量和更快的迭代循环。
- 更强的 **工具/代理框架** 兼容性和上下文管理（Claude Code、Droid/Factory AI、Cline、Kilo Code、Roo Code、BlackBox）。
- 更高质量的 **对话和技术写作** 输出。

## MiniMax M2.5 与 MiniMax M2.5 Highspeed 对比

- **速度：** `MiniMax-M2.5-highspeed` 是 MiniMax 文档中的官方快速层级。
- **成本：** MiniMax 价格表列出了相同的输入成本，而高速版的输出成本更高。
- **当前模型 ID：** 使用 `MiniMax-M2.5` 或 `MiniMax-M2.5-highspeed`。

## 选择设置

### MiniMax OAuth（Coding Plan）— 推荐

**最适合：** 通过 OAuth 使用 MiniMax Coding Plan 进行快速设置，无需 API 密钥。

启用随附的 OAuth 插件并进行身份验证：

```bash
openclaw plugins enable minimax-portal-auth  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系统将提示您选择端点：

- **Global** - 国际用户 (`api.minimax.io`)
- **CN** - 中国用户 (`api.minimaxi.com`)

详情请参阅 [MiniMax OAuth 插件自述文件](https://github.com/openclaw/openclaw/tree/main/extensions/minimax-portal-auth)。

### MiniMax M2.5 (API 密钥)

**最适合：** 托管 MiniMax，使用兼容 Anthropic 的 API。

通过 CLI 配置：

- 运行 `openclaw configure`
- 选择 **模型/认证**
- 选择 **MiniMax M2.5**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.5" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5-highspeed",
            name: "MiniMax M2.5 Highspeed",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### MiniMax M2.5 作为后备（示例）

**最适合：** 将您最强大的最新一代模型设为主模型，在失败时回退到 MiniMax M2.5。
下面的示例使用 Opus 作为具体的主模型；您可以将其替换为您偏好的最新一代主模型。

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.5": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.5"],
      },
    },
  },
}
```

### 可选：通过 LM Studio 本地运行（手动）

**最适合：** 使用 LM Studio 进行本地推理。
我们在使用 LM Studio 的本地服务器时，在强大的硬件（例如桌面/服务器）上运行 MiniMax M2.5 取得了显著的效果。

通过 `openclaw.json` 手动配置：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 通过 `openclaw configure` 配置

使用交互式配置向导来设置 MiniMax，而无需编辑 JSON：

1. 运行 `openclaw configure`。
2. 选择 **Model/auth**。
3. 选择 **MiniMax M2.5**。
4. 在提示时选择您的默认模型。

## 配置选项

- `models.providers.minimax.baseUrl`：首选 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 对于 OpenAI 兼容负载是可选的。
- `models.providers.minimax.api`: 首选 `anthropic-messages`; `openai-completions` 对于 OpenAI 兼容负载是可选的。
- `models.providers.minimax.apiKey`：MiniMax API 密钥（`MINIMAX_API_KEY`）。
- `models.providers.minimax.models`: 定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`: 为允许列表中的模型添加别名。
- `models.mode`：如果您想将 MiniMax 与内置项一起添加，请保留 `merge`。

## 注

- 模型引用是 `minimax/<model>`。
- 推荐的模型 ID：`MiniMax-M2.5` 和 `MiniMax-M2.5-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan 密钥）。
- 如果您需要精确的成本跟踪，请更新 `models.json` 中的定价值。
- MiniMax Coding Plan 的推荐链接（9折）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 有关提供商规则，请参阅 [/concepts/模型-providers](/zh/concepts/model-providers)。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.5` 进行切换。

## 故障排除

### “Unknown 模型: minimax/MiniMax-M2.5”

这通常意味着 **MiniMax 提供商未配置**（未找到提供商条目
且未找到 MiniMax 认证配置文件/环境密钥）。针对此检测的修复包含在
**2026.1.12** 版本中（撰写时尚未发布）。解决方法：

- 升级到 **2026.1.12** (或从源 `main` 运行)，然后重启网关。
- 运行 `openclaw configure` 并选择 **MiniMax M2.5**，或
- 手动添加 `models.providers.minimax` 代码块，或者
- 设置 `MINIMAX_API_KEY`（或 MiniMax 认证配置文件），以便提供商可以被注入。

请确保模型 ID **区分大小写**：

- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

然后使用以下命令重新检查：

```bash
openclaw models list
```

import zh from '/components/footer/zh.mdx';

<zh />
