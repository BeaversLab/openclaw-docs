---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

OpenClaw 的 MiniMax 提供商默认使用 **MiniMax M2.7**，并为了兼容性在目录中保留了
**MiniMax M2.5**。

## 模型系列

- `MiniMax-M2.7`：默认的托管文本模型。
- `MiniMax-M2.7-highspeed`：更快的 M2.7 文本层级。
- `MiniMax-M2.5`：上一代文本模型，在 MiniMax 目录中仍然可用。
- `MiniMax-M2.5-highspeed`：更快的 M2.5 文本层级。
- `MiniMax-VL-01`：用于文本 + 图像输入的视觉模型。

## 选择设置

### MiniMax OAuth (Coding Plan) - 推荐

**最适用于：** 通过 OAuth 快速设置 MiniMax Coding Plan，无需 API 密钥。

启用随附的 OAuth 插件并进行身份验证：

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系统将提示您选择一个端点：

- **Global** - 国际用户 (`api.minimax.io`)
- **CN** - 中国用户 (`api.minimaxi.com`)

有关详细信息，请参阅 [MiniMax plugin README](https://github.com/openclaw/openclaw/tree/main/extensions/minimax)。

### MiniMax M2.7 (API 密钥)

**最适用于：** 兼容 Anthropic API 的托管 MiniMax。

通过 CLI 配置：

- 运行 `openclaw configure`
- 选择 **Model/auth**
- 选择一个 **MiniMax** 身份验证选项

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
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

### MiniMax M2.7 作为后备 (示例)

**最适用于：** 将您最强大的最新一代模型作为主要模型，并在失败时切换到 MiniMax M2.7。
下面的示例使用 Opus 作为具体的主要模型；您可以将其替换为您首选的最新一代主要模型。

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

### 可选：通过 LM Studio 本地运行 (手动)

**最适用于：** 使用 LM Studio 进行本地推理。
我们在使用 LM Studio 本地服务器的强大硬件（例如台式机/服务器）上测试 MiniMax M2.5 时看到了出色的效果。

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
3. 选择一个 **MiniMax** 身份验证选项。
4. 当系统提示时，选择您的默认模型。

## 配置选项

- `models.providers.minimax.baseUrl`：首选 `https://api.minimax.io/anthropic` (兼容 Anthropic)；`https://api.minimax.io/v1` 是兼容 OpenAI 负载的可选项。
- `models.providers.minimax.api`：优先使用 `anthropic-messages`；对于 OpenAI 兼容的负载，`openai-completions` 是可选的。
- `models.providers.minimax.apiKey`：MiniMax API 密钥（`MINIMAX_API_KEY`）。
- `models.providers.minimax.models`：定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：为您希望在允许列表中的模型设置别名。
- `models.mode`：如果您想将 MiniMax 与内置模型一起添加，请保留 `merge`。

## 注意事项

- 模型引用为 `minimax/<model>`。
- 默认文本模型：`MiniMax-M2.7`。
- 备用文本模型：`MiniMax-M2.7-highspeed`、`MiniMax-M2.5`、`MiniMax-M2.5-highspeed`。
- 编码计划使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要编码计划密钥）。
- 如果您需要精确的成本跟踪，请更新 `models.json` 中的定价值。
- MiniMax 编码计划的推荐链接（10% 折扣）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 请参阅 [/concepts/模型-providers](/zh/concepts/model-providers) 了解提供商规则。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.7` 进行切换。

## 故障排除

### "未知模型：minimax/MiniMax-M2.7"

这通常意味着 **未配置 MiniMax 提供商**（未找到提供商条目，也未找到 MiniMax 认证配置文件/环境密钥）。针对此检测的修复包含在 **2026.1.12** 版本中（撰写时尚未发布）。修复方法：

- 升级到 **2026.1.12**（或从源代码运行 `main`），然后重启网关。
- 运行 `openclaw configure` 并选择一个 **MiniMax** 认证选项，或者
- 手动添加 `models.providers.minimax` 块，或者
- 设置 `MINIMAX_API_KEY`（或 MiniMax 认证配置文件），以便注入提供商。

确保模型 ID **区分大小写**：

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`
- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

然后使用以下命令重新检查：

```bash
openclaw models list
```

import zh from "/components/footer/zh.mdx";

<zh />
