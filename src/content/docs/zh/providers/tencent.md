---
summary: "Tencent Cloud TokenHub 设置用于 Hy3 预览"
title: "Tencent Cloud (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview with OpenClaw
  - You need the TokenHub API key setup
---

Tencent Cloud 作为捆绑的提供商插件内置于 OpenClaw 中。它通过 TokenHub 端点 (`tencent-tokenhub`) 使用兼容 OpenAI 的 API 提供对 Tencent Hy3 预览的访问。

| 属性          | 值                                                |
| ------------- | ------------------------------------------------- |
| 提供商 ID     | `tencent-tokenhub`                                |
| 插件          | 内置, `enabledByDefault: true`                    |
| 认证环境变量  | `TOKENHUB_API_KEY`                                |
| 新手引导标志  | `--auth-choice tokenhub-api-key`                  |
| 直接 CLI 标志 | `--tokenhub-api-key <key>`                        |
| API           | 兼容 OpenAI (`openai-completions`)                |
| 默认基础 URL  | `https://tokenhub.tencentmaas.com/v1`             |
| 全局基础 URL  | `https://tokenhub-intl.tencentmaas.com/v1` (覆盖) |
| 默认模型      | `tencent-tokenhub/hy3-preview`                    |

## 快速开始

<Steps>
  <Step title="创建 TokenHub API 密钥">
    在 Tencent Cloud TokenHub 中创建 API 密钥。如果您为密钥选择受限的访问范围，请确保在允许的模型中包含 **Hy3 preview**。
  </Step>
  <Step title="运行新手引导">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice tokenhub-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY"
```

```bash Env only
export TOKENHUB_API_KEY=...
```

    </CodeGroup>

  </Step>
  <Step title="Verify the model">
    ```bash
    openclaw models list --provider tencent-tokenhub
    ```
  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## 内置目录

| 模型引用                       | 名称                   | 输入 | 上下文  | 最大输出 | 备注           |
| ------------------------------ | ---------------------- | ---- | ------- | -------- | -------------- |
| `tencent-tokenhub/hy3-preview` | Hy3 preview (TokenHub) | 文本 | 256,000 | 64,000   | 默认；启用推理 |

Hy3 preview 是腾讯混元用于推理、长上下文指令遵循、代码和代理工作流的大型 MoE 语言模型。腾讯兼容 OpenAI 的示例使用 `hy3-preview` 作为模型 ID，并支持标准聊天补全工具调用以及 `reasoning_effort`。

<Tip>模型 ID 为 `hy3-preview`。请勿将其与腾讯的 `HY-3D-*` 模型混淆，后者是 3D 生成 API，并非由此提供商配置的 OpenClaw 聊天模型。</Tip>

## 分级定价

内置目录附带了随输入窗口长度缩放的分层成本元数据，因此无需手动覆盖即可填充成本估算。

| 输入 Token 范围 | 输入费率 | 输出费率 | 缓存读取 |
| --------------- | -------- | -------- | -------- |
| 0 - 16,000      | 0.176    | 0.587    | 0.059    |
| 16,000 - 32,000 | 0.235    | 0.939    | 0.088    |
| 32,000+         | 0.293    | 1.173    | 0.117    |

费率为腾讯公布的每百万 Token 美元价格。仅当您需要使用不同的界面时，才在 `models.providers.tencent-tokenhub` 下覆盖定价。

## 高级配置

<AccordionGroup>
  <Accordion title="Endpoint override"OpenClaw>
    OpenClaw 默认使用腾讯云的 `https://tokenhub.tencentmaas.com/v1` 端点。腾讯还记录了一个国际 TokenHub 端点：

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
    ```

    仅当您的 TokenHub 账户或区域需要时，才覆盖端点。

  </Accordion>

  <Accordion title="Environment availability for the daemon">
    如果 Gateway(网关) 作为托管服务（launchd、systemd、Docker）运行，则该进程必须能够看到 `TOKENHUB_API_KEY`。请在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 进行设置，以便 launchd、systemd 或 Docker exec 环境可以读取它。

    <Warning>
      仅在交互式 Shell 中导出的密钥对于托管 Gateway(网关) 进程是不可见的。请使用环境变量文件或配置接缝以确保持久可用性。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration" icon="gear">
    包含提供商设置的完整配置架构。
  </Card>
  <Card title="Tencent TokenHub" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    腾讯云的 TokenHub 产品页面。
  </Card>
  <Card title="Hy3 预览模型卡片" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    Tencent Hunyuan Hy3 预览详情和基准测试。
  </Card>
</CardGroup>
