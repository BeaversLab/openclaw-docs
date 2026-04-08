---
summary: "Hugging Face Inference 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (Inference)"
---

# Hugging Face（推理）

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) 通过单一路由器 OpenAI 提供 API 兼容的聊天补全。您可以使用一个令牌访问许多模型（DeepSeek、Llama 等）。OpenClaw 使用 **OpenAI 兼容端点**（仅限聊天补全）；对于文本生成图像、嵌入或语音，请直接使用 [HF inference clients](https://huggingface.co/docs/api-inference/quicktour)。

- 提供商： `huggingface`
- 身份验证： `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN` （具有 **Make calls to Inference Providers** 权限的细粒度令牌）
- API： OpenAI 兼容 (`https://router.huggingface.co/v1`)
- 计费：单个 HF 令牌；[pricing](https://huggingface.co/docs/inference-providers/pricing) 遵循提供商费率并提供免费层。

## 快速开始

1. 在 [Hugging Face → Settings → Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 创建一个具有 **Make calls to Inference Providers** 权限的细粒度令牌。
2. 运行入职向导并在提供商下拉菜单中选择 **Hugging Face**，然后在出现提示时输入您的 API 密钥：

```bash
openclaw onboard --auth-choice huggingface-api-key
```

3. 在 **Default Hugging Face 模型** 下拉菜单中，选择您想要的模型（当您拥有有效令牌时，列表将从推理 API 加载；否则将显示内置列表）。您的选择将被保存为默认模型。
4. 您也可以稍后在配置文件中设置或更改默认模型：

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

这将把 `huggingface/deepseek-ai/DeepSeek-R1` 设置为默认模型。

## 环境说明

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 模型发现和入职下拉菜单

OpenClaw 通过直接调用 **推理端点** 来发现模型：

```bash
GET https://router.huggingface.co/v1/models
```

（可选：发送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 以获取完整列表；某些端点在未经身份验证的情况下返回子集。）响应采用 OpenAI 风格的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

当您配置 Hugging Face API 密钥（通过新手引导、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`）时，OpenClaw 使用此 GET 请求来发现可用的聊天补全模型。在**交互式设置**期间，输入您的令牌后，您会看到一个从该列表填充的**默认 Hugging Face 模型**下拉菜单（如果请求失败，则使用内置目录）。在运行时（例如 Gateway(网关) 启动），当存在密钥时，OpenClaw 再次调用 **GET** `https://router.huggingface.co/v1/models` 以刷新目录。该列表与内置目录合并（用于上下文窗口和成本等元数据）。如果请求失败或未设置密钥，则仅使用内置目录。

## 模型名称和可编辑选项

- **来自 API 的名称：** 当 API 返回 `name`、`title` 或 `display_name` 时，模型显示名称**从 GET /v1/models 填充**；否则它是从模型 id 派生的（例如 `deepseek-ai/DeepSeek-R1` → “DeepSeek R1”）。
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

- **策略后缀：** OpenClaw 捆绑的 Hugging Face 文档和帮助程序目前将这两个后缀视为内置策略变体：
  - **`:fastest`** — 最高吞吐量。
  - **`:cheapest`** — 每个输出令牌的最低成本。

  您可以在 `models.providers.huggingface.models` 中将这些作为单独的条目添加，或使用后缀设置 `model.primary`。您还可以在 [推理提供商设置](https://hf.co/settings/inference-providers) 中设置默认提供商顺序（无后缀 = 使用该顺序）。

- **配置合并：** 合并配置时，将保留 `models.providers.huggingface.models`（例如在 `models.json` 中）中的现有条目。因此，您在那里设置的任何自定义 `name`、`alias` 或模型选项都将被保留。

## 模型 ID 和配置示例

模型引用使用 `huggingface/<org>/<model>` 的形式（Hub 风格 ID）。下面的列表来自 **GET** `https://router.huggingface.co/v1/models`；您的目录可能包含更多内容。

**示例 ID（来自推理端点）：**

| 模型                   | 引用（加上 `huggingface/` 前缀）    |
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

您可以将 `:fastest` 或 `:cheapest` 附加到模型 ID。在 [推理提供商设置](https://hf.co/settings/inference-providers) 中设置您的默认顺序；有关完整列表，请参阅 [推理提供商](https://huggingface.co/docs/inference-providers) 和 **GET** `https://router.huggingface.co/v1/models`。

### 完整配置示例

**主要 DeepSeek R1，Qwen 作为备用：**

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

**Qwen 作为默认值，包含 :cheapest 和 :fastest 变体：**

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

**DeepSeek + Llama + GPT-OSS 以及别名：**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
        fallbacks: ["huggingface/meta-llama/Llama-3.3-70B-Instruct", "huggingface/openai/gpt-oss-120b"],
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

**多个 Qwen 和 DeepSeek 模型以及策略后缀：**

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
