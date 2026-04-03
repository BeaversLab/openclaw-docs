---
summary: "在 OpenClaw 中使用 MiniMax 模型"
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
- `image-01`：图像生成模型（生成和图生图编辑）。

## 图像生成

MiniMax 插件为 `image_generate` 工具注册了 `image-01` 模型。它支持：

- **文生图生成**，支持宽高比控制。
- **图生图编辑**（主体参考），支持宽高比控制。
- 支持的宽高比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`。

要使用 MiniMax 进行图像生成，请将其设置为图像生成提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

该插件使用与文本模型相同的 `MINIMAX_API_KEY` 或 OAuth 身份验证。如果 MiniMax 已设置，则无需额外配置。

## 选择设置

### MiniMax OAuth（编码计划）- 推荐

**最适用于：** 通过 OAuth 快速设置 MiniMax 编码计划，无需 API 密钥。

启用捆绑的 OAuth 插件并进行身份验证：

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系统将提示您选择一个端点：

- **Global** - 国际用户（`api.minimax.io`）
- **CN** - 中国用户（`api.minimaxi.com`）

详情请参阅 OpenClaw 仓库中的 MiniMax 插件包 README。

### MiniMax M2.7（API 密钥）

**最适用于：** 托管的 MiniMax，具有 Anthropic 兼容的 API。

通过 CLI 配置：

- 运行 `openclaw configure`
- 选择 **模型/身份验证 (Model/auth)**
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

### MiniMax M2.7 作为回退（示例）

**最适用于：** 将您最强大的最新一代模型保留为主模型，故障转移到 MiniMax M2.7。
下面的示例使用 Opus 作为具体的主模型；您可以将其替换为您偏好的最新一代主模型。

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

使用交互式配置向导设置 MiniMax，无需编辑 JSON：

1. 运行 `openclaw configure`。
2. 选择 **模型/身份验证 (Model/auth)**。
3. 选择一个 **MiniMax** 身份验证选项。
4. 系统提示时选择您的默认模型。

## 配置选项

- `models.providers.minimax.baseUrl`：首选 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 对于 OpenAI 兼容的载荷是可选的。
- `models.providers.minimax.api`：优先使用 `anthropic-messages`；对于与 OpenAI 兼容的负载，`openai-completions` 是可选的。
- `models.providers.minimax.apiKey`：MiniMax API 密钥 (`MINIMAX_API_KEY`)。
- `models.providers.minimax.models`：定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：为您希望在允许列表中的模型创建别名。
- `models.mode`：如果您想在内置选项之外添加 MiniMax，请保留 `merge`。

## 备注

- 模型引用是 `minimax/<model>`。
- 默认文本模型：`MiniMax-M2.7`。
- 备用文本模型：`MiniMax-M2.7-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要一个 Coding Plan 密钥）。
- 如果您需要精确的成本跟踪，请更新 `models.json` 中的定价值。
- MiniMax Coding Plan 的推荐链接（10% 折扣）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 请参阅 [/concepts/模型-providers](/en/concepts/model-providers) 了解提供商规则。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.7` 进行切换。

## 故障排除

### "未知模型：minimax/MiniMax-M2.7"

这通常意味着 **MiniMax 提供商未配置**（未找到提供商条目
且未找到 MiniMax 认证配置文件/环境密钥）。针对此检测的修复位于
**2026.1.12** 中。修复方法：

- 升级到 **2026.1.12**（或从源码运行 `main`），然后重启网关。
- 运行 `openclaw configure` 并选择 **MiniMax** 认证选项，或者
- 手动添加 `models.providers.minimax` 块，或者
- 设置 `MINIMAX_API_KEY`（或 MiniMax 认证配置文件），以便注入提供商。

确保模型 id **区分大小写**：

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

然后使用以下命令重新检查：

```bash
openclaw models list
```
