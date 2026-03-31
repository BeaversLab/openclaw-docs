---
summary: "在 MiniMax 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

OpenClaw 的 MiniMax 提供商默认为 **MiniMax M2.7**。

## 模型系列

- `MiniMax-M2.7`：默认的托管文本模型。
- `MiniMax-M2.7-highspeed`：更快的 M2.7 文本层级。

## 选择设置

### MiniMax OAuth（Coding Plan）- 推荐

**适用于：** 通过 OAuth 快速设置 MiniMax Coding Plan，无需 API 密钥。

启用捆绑的 OAuth 插件并进行身份验证：

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系统将提示您选择一个端点：

- **Global** - 国际用户 (`api.minimax.io`)
- **CN** - 中国用户 (`api.minimaxi.com`)

详情请参见 [MiniMax 插件 README](https://github.com/openclaw/openclaw/tree/main/extensions/minimax)。

### MiniMax M2.7 (API 密钥)

**适用于：** 使用兼容 Anthropic 的 API 托管 MiniMax。

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
        ],
      },
    },
  },
}
```

### MiniMax M2.7 作为备用（示例）

**适用于：** 将您最强的最新一代模型作为主要模型，故障转移到 MiniMax M2.7。
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

## 通过 `openclaw configure` 配置

使用交互式配置向导来设置 MiniMax，无需编辑 JSON：

1. 运行 `openclaw configure`。
2. 选择 **Model/auth**。
3. 选择一个 **MiniMax** 身份验证选项。
4. 提示时选择您的默认模型。

## 配置选项

- `models.providers.minimax.baseUrl`：首选 `https://api.minimax.io/anthropic`（兼容 Anthropic）；`https://api.minimax.io/v1` 对于兼容 OpenAI 的有效负载是可选的。
- `models.providers.minimax.api`：首选 `anthropic-messages`；`openai-completions` 对于兼容 OpenAI 的有效负载是可选的。
- `models.providers.minimax.apiKey`：MiniMax API 密钥 (`MINIMAX_API_KEY`)。
- `models.providers.minimax.models`：定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：为允许列表中的模型设置别名。
- `models.mode`: 如果您想在内置提供商旁边添加 MiniMax，请保留 `merge`。

## 注意事项

- 模型引用为 `minimax/<model>`。
- 默认文本模型：`MiniMax-M2.7`。
- 备用文本模型：`MiniMax-M2.7-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan key）。
- 如果您需要精确的成本跟踪，请在 `models.json` 中更新定价值。
- MiniMax Coding Plan 的推荐链接（9折优惠）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 有关提供商规则，请参阅 [/concepts/模型-providers](/en/concepts/model-providers)。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.7` 进行切换。

## 故障排除

### "Unknown 模型: minimax/MiniMax-M2.7"

这通常意味着 **未配置 MiniMax 提供商**（未找到提供商条目
且未找到 MiniMax 认证配置文件/环境密钥）。此检测的修复内容位于
**2026.1.12** 中。修复方法：

- 升级到 **2026.1.12**（或从源码 `main` 运行），然后重启网关。
- 运行 `openclaw configure` 并选择一个 **MiniMax** 认证选项，或者
- 手动添加 `models.providers.minimax` 块，或者
- 设置 `MINIMAX_API_KEY`（或一个 MiniMax 认证配置文件），以便注入提供商。

请确保模型 ID 区分**大小写**：

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

然后使用以下命令重新检查：

```bash
openclaw models list
```
