---
summary: "针对 Hy3 预览版配置腾讯云 TokenHub"
title: "腾讯云 (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview with OpenClaw
  - You need the TokenHub API key setup
---

# 腾讯云 TokenHub

腾讯云作为 OpenClaw 中的 **捆绑提供商插件** (bundled 提供商 plugin) 提供。它通过 TokenHub 端点 (`tencent-tokenhub`) 提供对腾讯 Hy3 预览版的访问权限。

该提供商使用与 OpenAI 兼容的 API。

| 属性     | 值                                         |
| -------- | ------------------------------------------ |
| 提供商   | `tencent-tokenhub`                         |
| 默认模型 | `tencent-tokenhub/hy3-preview`             |
| 身份验证 | `TOKENHUB_API_KEY`                         |
| API      | OpenAI 兼容的聊天补全                      |
| 基础 URL | `https://tokenhub.tencentmaas.com/v1`      |
| 全球 URL | `https://tokenhub-intl.tencentmaas.com/v1` |

## 快速开始

<Steps>
  <Step title="创建 TokenHub API 密钥">在腾讯云 TokenHub 中创建 API 密钥。如果您为密钥选择了有限的访问范围，请在允许的模型中包含 **Hy3 预览版**。</Step>
  <Step title="运行新手引导">```bash openclaw onboard --auth-choice tokenhub-api-key ```</Step>
  <Step title="验证模型">```bash openclaw models list --provider tencent-tokenhub ```</Step>
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

| 模型引用                       | 名称                  | 输入 | 上下文  | 最大输出 | 备注           |
| ------------------------------ | --------------------- | ---- | ------- | -------- | -------------- |
| `tencent-tokenhub/hy3-preview` | Hy3 预览版 (TokenHub) | 文本 | 256,000 | 64,000   | 默认；支持推理 |

Hy3 预览版是腾讯混元 (Hunyuan) 用于推理、长上下文指令遵循、代码和智能体工作流的大型 MoE 语言模型。腾讯的 OpenAI 兼容示例使用 `hy3-preview` 作为模型 ID，并支持标准的聊天补全工具调用以及 `reasoning_effort`。

<Tip>模型 ID 是 `hy3-preview`。请勿将其与腾讯的 `HY-3D-*` 模型混淆，后者是 3D 生成 API，并非由此提供商配置的 OpenClaw 聊天模型。</Tip>

## 端点覆盖

OpenClaw 默认使用腾讯云的 `https://tokenhub.tencentmaas.com/v1` 端点。腾讯还记录了一个国际版 TokenHub 端点：

```bash
openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
```

仅当您的 TokenHub 账户或区域需要时才覆盖端点。

## 备注

- TokenHub 模型引用使用 `tencent-tokenhub/<modelId>`。
- 内置目录目前包括 `hy3-preview`。
- 该插件将 Hy3 预览版标记为具备推理能力和流式使用能力。
- 该插件附带了分级的 Hy3 定价元数据，因此无需手动覆盖定价即可填充成本估算。
- 仅在必要时在 `models.providers` 中覆盖定价、上下文或端点元数据。

## 环境说明

如果 Gateway(网关) 作为守护进程运行，请确保 `TOKENHUB_API_KEY`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 相关文档

- [OpenClaw 配置](/zh/gateway/configuration)
- [模型提供商](/zh/concepts/model-providers)
- [Tencent TokenHub 产品页面](https://cloud.tencent.com/product/tokenhub)
- [Tencent TokenHub 文本生成](https://cloud.tencent.com/document/product/1823/130079)
- [Tencent TokenHub Cline Hy3 预览版设置](https://cloud.tencent.com/document/product/1823/130932)
- [Tencent Hy3 预览版模型卡片](https://huggingface.co/tencent/Hy3-preview)
