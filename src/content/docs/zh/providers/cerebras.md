---
summary: "Cerebras 设置（身份验证 + 模型选择）"
title: "Cerebras"
read_when:
  - You want to use Cerebras with OpenClaw
  - You need the Cerebras API key env var or CLI auth choice
---

[Cerebras](https://www.cerebras.ai) 在自定义推理硬件上提供高速的 OpenAI 兼容推理。OpenClaw 包含一个捆绑的 Cerebras 提供商插件，具有静态的四模型目录。

| 属性             | 值                                 |
| ---------------- | ---------------------------------- |
| 提供商 ID        | `cerebras`                         |
| 插件             | 已捆绑，`enabledByDefault: true`   |
| 身份验证环境变量 | `CEREBRAS_API_KEY`                 |
| 新手引导标志     | `--auth-choice cerebras-api-key`   |
| 直接 CLI 标志    | `--cerebras-api-key <key>`         |
| API              | OpenAI 兼容 (`openai-completions`) |
| 基础 URL         | `https://api.cerebras.ai/v1`       |
| 默认模型         | `cerebras/zai-glm-4.7`             |

## 入门指南

<Steps>
  <Step title="获取 API 密钥">
    在 [Cerebras Cloud Console](https://cloud.cerebras.ai) 中创建 API 密钥。
  </Step>
  <Step title="运行新手引导">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice cerebras-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

```bash Env only
export CEREBRAS_API_KEY=csk-...
```

    </CodeGroup>

  </Step>
  <Step title="验证模型可用">
    ```bash
    openclaw models list --provider cerebras
    ```

    该列表应包含所有四个捆绑模型。如果 `CEREBRAS_API_KEY` 未解析，`openclaw models status --json` 将在 `auth.unusableProfiles` 下报告缺少凭据。

  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## 内置目录

OpenClaw 附带了一个静态 Cerebras 目录，该目录镜像了公共 OpenAI 兼容端点。所有四个模型共享 128k 上下文和 8,192 最大输出令牌。

| 模型参考                                  | 名称                 | 推理 | 备注                   |
| ----------------------------------------- | -------------------- | ---- | ---------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | 是   | 默认模型；预览推理模型 |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | 是   | 生产推理模型           |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | 否   | 预览非推理模型         |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | 否   | 注重生产环境速度的模型 |

<Warning>Cerebras 将 `zai-glm-4.7` 和 `qwen-3-235b-a22b-instruct-2507` 标记为预览模型，并且 `llama3.1-8b` 和 `qwen-3-235b-a22b-instruct-2507` 已记录将于 2026 年 5 月 27 日弃用。在生产工作负载中依赖它们之前，请查看 Cerebras 的 supported-models 页面。</Warning>

## 手动配置

由于捆绑了插件，通常您只需要 API 密钥。当您想要覆盖模型元数据或针对静态目录在 `mode: "merge"` 中运行时，请使用显式的 `models.providers.cerebras` 配置：

```json5
{
  env: { CEREBRAS_API_KEY: "csk-..." },
  agents: {
    defaults: {
      model: { primary: "cerebras/zai-glm-4.7" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "Z.ai GLM 4.7" },
          { id: "gpt-oss-120b", name: "GPT OSS 120B" },
        ],
      },
    },
  },
}
```

<Note>如果 Gateway(网关) 作为守护进程（launchd、systemd、Docker）运行，请确保 `CEREBRAS_API_KEY` 对该进程可用——例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`。仅在交互式 shell 中导出的密钥对托管服务没有帮助，除非单独导入环境变量。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="思维模式" href="/zh/tools/thinking" icon="brain">
    两种具备推理能力的 Cerebras 模型的推理努力级别。
  </Card>
  <Card title="配置参考" href="/zh/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
  <Card title="模型常见问题" href="/zh/help/faq-models" icon="circle-question">
    身份验证配置文件、切换模型以及解决“no profile”错误。
  </Card>
</CardGroup>
