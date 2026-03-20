---
summary: "Hugging Face Inference setup (auth + 模型 selection)"
read_when:
  - 您想将 Hugging Face Inference 与 OpenClaw 结合使用
  - 您需要 HF token 环境变量或 CLI 身份验证选择
title: "Hugging Face (Inference)"
---

# Hugging Face (Inference)

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) 通过单个路由器 OpenAI 提供与 API 兼容的聊天补全功能。您可以凭借一个 token 访问许多模型（DeepSeek、Llama 等）。OpenClaw 使用 **OpenAI-compatible endpoint**（仅限聊天补全）；对于文本生成图像、嵌入或语音，请直接使用 [HF inference clients](https://huggingface.co/docs/api-inference/quicktour)。

- 提供商: `huggingface`
- 身份验证: `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN` (具有 **Make calls to Inference Providers** 权限的细粒度 token)
- API: OpenAI-compatible (`https://router.huggingface.co/v1`)
- 计费: 单个 HF token；[pricing](https://huggingface.co/docs/inference-providers/pricing) 遵循提供商费率并提供免费层级。

## 快速开始

1. 在 [Hugging Face → Settings → Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 处创建一个具有 **Make calls to Inference Providers** 权限的细粒度 token。
2. 运行新手引导并在提供商下拉列表中选择 **Hugging Face**，然后在提示时输入您的 API 密钥：

```bash
openclaw onboard --auth-choice huggingface-api-key
```

3. 在 **Default Hugging Face 模型** 下拉列表中，选择您想要的模型（当您拥有有效的 token 时，列表会从 Inference API 加载；否则将显示内置列表）。您的选择将保存为默认模型。
4. 您也可以稍后在配置中设置或更改默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

这会将 `huggingface/deepseek-ai/DeepSeek-R1` 设置为默认模型。

## 环境说明

如果 Gateway(网关) 作为守护进程 运行，请确保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 模型发现与新手引导下拉列表

OpenClaw 通过直接调用 **Inference endpoint** 来发现模型：

```bash
GET https://router.huggingface.co/v1/models
```

（可选：发送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 以获取完整列表；某些端点在未经身份验证时返回子集。）响应为 OpenAI 风格的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

当您配置 Hugging Face API 密钥时（通过新手引导、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`），OpenClaw 会使用此 GET 请求来发现可用的聊天完成模型。在**交互式设置**期间，输入您的令牌后，您会看到一个**默认 Hugging Face 模型**下拉菜单，其中填充了该列表中的模型（如果请求失败，则使用内置目录）。在运行时（例如 Gateway(网关) 启动时），如果存在密钥，OpenClaw 会再次调用 **GET** `https://router.huggingface.co/v1/models` 来刷新目录。该列表会与内置目录合并（用于上下文窗口和成本等元数据）。如果请求失败或未设置密钥，则仅使用内置目录。

## 模型名称和可编辑选项

- **来自 API 的名称：** 当 API 返回 `name`、`title` 或 `display_name` 时，模型显示名称会**从 GET /v1/models 填充**；否则，它源自模型 ID（例如 `deepseek-ai/DeepSeek-R1` → “DeepSeek R1”）。
- **覆盖显示名称：** 您可以在配置中为每个模型设置自定义标签，使其在 CLI 和 UI 中按您想要的方式显示：

```json5
{
  agents: {
    defaults: {
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1 (fast)" },
        "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1 (cheap)" },
      },
    },
  },
}
```

- **提供商 / 策略选择：** 在**模型 ID** 后附加后缀，以选择路由器如何挑选后端：
  - **`:fastest`** — 最高吞吐量（路由器选择；提供商选择被**锁定** — 无交互式后端选择器）。
  - **`:cheapest`** — 每个输出令牌的最低成本（路由器选择；提供商选择被**锁定**）。
  - **`:provider`** — 强制使用特定的后端（例如 `:sambanova`、`:together`）。

  当您选择 **:cheapest** 或 **:fastest** 时（例如在新手引导模型下拉菜单中），提供商会被锁定：路由器根据成本或速度决定，并且不显示可选的“首选特定后端”步骤。您可以将这些作为单独的条目添加到 `models.providers.huggingface.models` 或使用该后缀设置 `model.primary`。您也可以在 [Inference Provider settings](https://hf.co/settings/inference-providers) 中设置您的默认顺序（无后缀 = 使用该顺序）。

- **配置合并：** 当合并配置时，会保留 `models.providers.huggingface.models` 中的现有条目（例如 `models.json` 中的）。因此，您在那里设置的任何自定义 `name`、`alias` 或模型选项都会被保留。

## 模型 ID 和配置示例

模型引用使用 `huggingface/<org>/<model>` 格式（Hub 风格的 ID）。以下列表来自 **GET** `https://router.huggingface.co/v1/models`；您的目录可能包含更多内容。

**示例 ID（来自推理端点）：**

| 模型                  | Ref（前缀为 `huggingface/`）    |
| ---------------------- | ----------------------------------- |
| DeepSeek R1            | `deepseek-ai/DeepSeek-R1`           |
| DeepSeek V3.2          | `deepseek-ai/DeepSeek-V3.2`         |
| Qwen3 8B               | `Qwen/Qwen3-8B`                     |
| Qwen2.5 7B Instruct    | `Qwen/Qwen2.5-7B-Instruct`          |
| Qwen3 32B              | `Qwen/Qwen3-32B`                    |
| Llama 3.3 70B Instruct | `meta-llama/Llama-3.3-70B-Instruct` |
| Llama 3.1 8B Instruct  | `meta-llama/Llama-3.1-8B-Instruct`  |
| GPT-OSS 120B           | `openai/gpt-oss-120b`               |
| GLM 4.7                | `zai-org/GLM-4.7`                   |
| Kimi K2.5              | `moonshotai/Kimi-K2.5`              |

您可以将 `:fastest`、`:cheapest` 或 `:provider`（例如 `:together`、`:sambanova`）附加到模型 ID。在 [Inference Provider settings](https://hf.co/settings/inference-providers) 中设置您的默认顺序；有关完整列表，请参阅 [Inference Providers](https://huggingface.co/docs/inference-providers) 和 **GET** `https://router.huggingface.co/v1/models`。

### 完整配置示例

**主要 DeepSeek R1，备选 Qwen：**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-R1",
        fallbacks: ["huggingface/Qwen/Qwen3-8B"],
      },
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
        "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
      },
    },
  },
}
```

**默认 Qwen，包含 :cheapest 和 :fastest 变体：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/Qwen/Qwen3-8B" },
      models: {
        "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
        "huggingface/Qwen/Qwen3-8B:cheapest": { alias: "Qwen3 8B (cheapest)" },
        "huggingface/Qwen/Qwen3-8B:fastest": { alias: "Qwen3 8B (fastest)" },
      },
    },
  },
}
```

**DeepSeek + Llama + GPT-OSS 带别名：**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
        fallbacks: [
          "huggingface/meta-llama/Llama-3.3-70B-Instruct",
          "huggingface/openai/gpt-oss-120b",
        ],
      },
      models: {
        "huggingface/deepseek-ai/DeepSeek-V3.2": { alias: "DeepSeek V3.2" },
        "huggingface/meta-llama/Llama-3.3-70B-Instruct": { alias: "Llama 3.3 70B" },
        "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
      },
    },
  },
}
```

**使用 :提供商 强制指定后端：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1:together" },
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1:together": { alias: "DeepSeek R1 (Together)" },
      },
    },
  },
}
```

**多个 Qwen 和 DeepSeek 模型带策略后缀：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest" },
      models: {
        "huggingface/Qwen/Qwen2.5-7B-Instruct": { alias: "Qwen2.5 7B" },
        "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest": { alias: "Qwen2.5 7B (cheap)" },
        "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1 (fast)" },
        "huggingface/meta-llama/Llama-3.1-8B-Instruct": { alias: "Llama 3.1 8B" },
      },
    },
  },
}
```

import en from "/components/footer/en.mdx";

<en />
