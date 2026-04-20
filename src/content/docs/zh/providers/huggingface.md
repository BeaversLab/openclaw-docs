---
summary: "Hugging Face 推理设置（身份验证 + 模型选择）"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (推理)"
---

# Hugging Face（推理）

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) 通过单一路由 OpenAI 提供 API 兼容的聊天补全功能。您可以使用一个令牌访问许多模型（DeepSeek、Llama 等）。OpenClaw 使用 **OpenAI 兼容端点**（仅限聊天补全）；对于文本生成图像、嵌入或语音，请直接使用 [HF inference clients](https://huggingface.co/docs/api-inference/quicktour)。

- 提供商：`huggingface`
- 认证：`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（具有 **Make calls to Inference Providers** 权限的细粒度令牌）
- API：OpenAI 兼容 (`https://router.huggingface.co/v1`)
- 计费：单一 HF 令牌；[定价](https://huggingface.co/docs/inference-providers/pricing) 遵循提供商费率并提供免费层级。

## 入门指南

<Steps>
  <Step title="创建细粒度令牌">
    前往 [Hugging Face Settings Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 并创建一个新的细粒度令牌。

    <Warning>
    令牌必须启用 **Make calls to Inference Providers** 权限，否则 API 请求将被拒绝。
    </Warning>

  </Step>
  <Step title="运行新手引导">
    在提供商下拉菜单中选择 **Hugging Face**，然后在提示时输入您的 API 密钥：

    ```bash
    openclaw onboard --auth-choice huggingface-api-key
    ```

  </Step>
  <Step title="选择默认模型">
    在 **Default Hugging Face 模型** 下拉菜单中，选择您想要的模型。当您拥有有效令牌时，列表将从 Inference API 加载；否则将显示内置列表。您的选择将被保存为默认模型。

    您也可以稍后在配置中设置或更改默认模型：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型可用">
    ```bash
    openclaw models list --provider huggingface
    ```
  </Step>
</Steps>

### 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

这将把 `huggingface/deepseek-ai/DeepSeek-R1` 设置为默认模型。

## 模型 ID

模型引用采用 `huggingface/<org>/<model>` 格式（Hub 风格 ID）。以下列表来自 **GET** `https://router.huggingface.co/v1/models`；您的目录可能包含更多内容。

| 模型                   | 引用（前缀为 `huggingface/`）       |
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

<Tip>您可以将 `:fastest` 或 `:cheapest` 附加到任何模型 ID。在 [推理提供商设置](https://hf.co/settings/inference-providers) 中设置您的默认顺序；有关完整列表，请参阅 [推理提供商](https://huggingface.co/docs/inference-providers) 和 **GET** `https://router.huggingface.co/v1/models`。</Tip>

## 高级详细信息

<AccordionGroup>
  <Accordion title="模型发现和入门下拉菜单">
    OpenClaw 通过直接调用 **推理端点** 来发现模型：

    ```bash
    GET https://router.huggingface.co/v1/models
    ```

    （可选：发送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 以获取完整列表；某些端点未经授权会返回子集。）响应是 OpenAI 风格的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

    当您配置 Hugging Face API 密钥时（通过 新手引导、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`），OpenClaw 使用此 GET 来发现可用的聊天补全模型。在 **交互式设置** 期间，输入您的令牌后，您会看到一个 **默认 Hugging Face 模型** 下拉列表，该列表填充自该列表（如果请求失败，则填充内置目录）。在运行时（例如 Gateway(网关) 启动时），如果存在密钥，OpenClaw 会再次调用 **GET** `https://router.huggingface.co/v1/models` 来刷新目录。该列表与内置目录合并（用于上下文窗口和成本等元数据）。如果请求失败或未设置密钥，则仅使用内置目录。

  </Accordion>

  <Accordion title="模型名称、别名和策略后缀">
    - **来自 API 的名称：** 当 API 返回 `name`、`title` 或 `display_name` 时，模型显示名称是 **从 GET /v1/models 获取的**；否则它源自模型 id（例如 `deepseek-ai/DeepSeek-R1` 变为“DeepSeek R1”）。
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

    - **策略后缀：** OpenClaw 捆绑的 Hugging Face 文档和助手目前将这两个后缀视为内置策略变体：
      - **`:fastest`** — 最高吞吐量。
      - **`:cheapest`** — 每个输出令牌的最低成本。

      您可以将这些作为单独的条目添加到 `models.providers.huggingface.models` 中，或者使用该后缀设置 `model.primary`。您还可以在 [推理提供商设置](https://hf.co/settings/inference-providers) 中设置您的默认提供商顺序（无后缀 = 使用该顺序）。

    - **配置合并：** 合并配置时会保留 `models.providers.huggingface.models` 中的现有条目（例如在 `models.json` 中）。因此您在那里设置的任何自定义 `name`、`alias` 或模型选项都会被保留。

  </Accordion>

  <Accordion title="环境和守护程序设置">
    如果 Gateway(网关) 作为守护程序（launchd/systemd）运行，请确保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Note>
    OpenClaw 接受 `HUGGINGFACE_HUB_TOKEN` 和 `HF_TOKEN` 作为环境变量的别名。两者均可使用；如果两者都已设置，则 `HUGGINGFACE_HUB_TOKEN` 优先。
    </Note>

  </Accordion>

  <Accordion title="配置：DeepSeek R1 并带有 Qwen 回退">
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
  </Accordion>

  <Accordion title="配置：最便宜且最快的 Qwen 变体">
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
  </Accordion>

  <Accordion title="配置：使用别名的 DeepSeek + Llama + GPT-OSS">
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
  </Accordion>

  <Accordion title="配置：带有策略后缀的多个 Qwen 和 DeepSeek">
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
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/en/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
  <Card title="模型选择" href="/en/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="推理提供商文档" href="https://huggingface.co/docs/inference-providers" icon="book">
    Hugging Face 推理提供商官方文档。
  </Card>
  <Card title="配置" href="/en/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
