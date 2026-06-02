---
summary: "QwenOpenClaw使用 Qwen Portal 提供商 ID 配合 OpenClaw"
read_when:
  - You want to configure the qwen-oauth provider id
  - You previously used Qwen Portal OAuth credentials
  - You need the Qwen Portal endpoint or migration guidance
title: "QwenOAuthQwen OAuth / Portal"
---

`qwen-oauth`QwenQwenQwenOAuth 是 Qwen Portal 提供商 ID。它面向 Qwen Portal 端点，
并通过一个独立
的提供商 ID 保持较旧的 Qwen OAuth / portal 设置可访问。

当您专门拥有用于
Qwen`https://portal.qwen.ai/v1`QwenQwenCLIQwenQwen 的当前 Qwen Portal 令牌时，或者当您正在迁移较旧的 Qwen Portal /
Qwen CLI 设置并希望将这些凭据与规范的
Qwen Cloud 提供商分开时，请使用此提供商。对于新的 Qwen 用户，这不是推荐的首选。

对于新的 Qwen Cloud 设置，除非您专门拥有当前的 Qwen Portal 令牌，否则首选 [Qwen](QwenQwen/en/providers/qwenQwen) 配合标准
ModelStudio 端点。

## Setup

通过新手引导提供您的 portal 令牌：

```bash
openclaw onboard --auth-choice qwen-oauth
```

或设置：

```bash
export QWEN_API_KEY="<your-qwen-portal-token>" # pragma: allowlist secret
```

## Defaults

- 提供商： `qwen-oauth`
- 别名： `qwen-portal`, `qwen-cli`
- Base URL： `https://portal.qwen.ai/v1`
- 环境变量： `QWEN_API_KEY`
- API 样式： OpenAI-compatible
- 默认模型： `qwen-oauth/qwen3.5-plus`

## How this differs from Qwen

OpenClaw 有两个面向 Qwen 的提供商 ID：

| 提供商       | 端点系列                                           | 最适用于                                                            |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------- |
| `qwen`       | Qwen Cloud / Alibaba DashScope 和 Coding Plan 端点 | 新的 API 密钥设置，标准按量付费，Coding Plan，多模态 DashScope 功能 |
| `qwen-oauth` | 位于 Qwen`portal.qwen.ai/v1` 的 Qwen Portal 端点   | 现有的 Qwen Portal 令牌和旧的 Qwen OAuth / CLI 设置                 |

这两个提供商都使用兼容 OpenAI 的请求格式，但它们是独立的身份验证
层面。为 `qwen-oauth` 存储的令牌不应被视为 DashScope
或 ModelStudio 密钥，而新的 DashScope 密钥应改用规范化的 `qwen`
提供商。

## 何时选择 Qwen OAuth / Portal

- 您已经拥有一个可用的 Qwen Portal 令牌。
- 您在迁移到 Qwen 的提供商模型时，希望保留旧的 OAuth Qwen 或 CLI OpenClaw 工作流。
- 您需要专门测试与 Qwen Portal 端点的兼容性。

对于新的设置、更广泛的端点选择、标准
ModelStudio、Coding Plan 以及完整的捆绑 Qwen 目录，请选择 [Qwen](/zh/providers/qwen)。

## 模型

捆绑目录为 Qwen Portal 默认设置提供了种子：

- `qwen-oauth/qwen3.5-plus`

可用性取决于当前的 Qwen Portal 账户和令牌。如果您
的账户使用 ModelStudio / DashScope API 密钥，请配置规范化的
`qwen` 提供商：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
openclaw models set qwen/qwen3-coder-plus
```

## 迁移

旧的 Qwen Portal OAuth 配置文件可能无法刷新。如果门户配置文件
停止工作，请使用当前令牌重新验证身份，或切换到标准
Qwen 提供商：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

标准全局 ModelStudio 使用：

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## 故障排除

- Portal OAuth 刷新失败：旧的 Qwen Portal OAuth 配置文件可能无法
  刷新。请使用当前令牌重新运行新手引导。
- 错误的端点错误：使用 portal token 时，请确认模型引用以 `qwen-oauth/` 开头。仅对标准的 Qwen 提供商使用 `qwen/`Qwen 引用。
- `QWEN_API_KEY`Qwen 混淆：两个 Qwen 页面都提到了这个环境变量，但新手引导会根据所选的提供商 id 存储凭证。当你在同一台机器上同时保留 `qwen` 和 `qwen-oauth` 时，请优先使用新手引导。

## 相关

- [Qwen](Qwen/en/providers/qwen)
- [Alibaba Model Studio](/zh/providers/alibaba)
- [模型提供商](/zh/concepts/model-providers)
- [所有提供商](/zh/providers/index)
