---
summary: "在OpenClaw中通过API密钥或setup-token使用Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
  - You want setup-token instead of API keys
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic构建了**Claude**模型系列并通过API提供访问。在OpenClaw中，您可以使用API密钥或**setup-token**进行身份验证。

## 选项A: Anthropic API密钥

**最适合:** 标准API访问和基于使用量的计费。在Anthropic控制台中创建您的API密钥。

### CLI设置

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### 配置片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## 提示缓存 (Anthropic API)

OpenClaw支持Anthropic的提示缓存功能。这**仅限API**；订阅认证不遵守缓存设置。

### 配置

在您的模型配置中使用`cacheRetention`参数:

| 值     | 缓存时长   | 描述                     |
| ------ | ---------- | ------------------------ |
| `none` | 无缓存     | 禁用提示缓存             |
| `short` | 5分钟      | API密钥认证的默认值      |
| `long`  | 1小时      | 扩展缓存(需要beta标志)   |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

### 默认值

使用Anthropic API密钥身份验证时，OpenClaw会自动为所有Anthropic模型应用`cacheRetention: "short"`(5分钟缓存)。您可以通过在配置中显式设置`cacheRetention`来覆盖此设置。

### 旧版参数

旧的`cacheControlTtl`参数仍受支持以保持向后兼容:

- `"5m"` 映射为 `short`
- `"1h"` 映射为 `long`

我们建议迁移到新的`cacheRetention`参数。

OpenClaw为Anthropic API请求包含`extended-cache-ttl-2025-04-11` beta标志；如果您覆盖provider标头，请保留它(参见[/gateway/configuration](/zh/gateway/configuration))。

## 选项B: Claude setup-token

**最适合:** 使用您的Claude订阅。

### 获取setup-token的位置

Setup-token由**Claude Code CLI**创建，而非Anthropic控制台。您可以在**任何机器**上运行此命令:

```bash
claude setup-token
```

将token粘贴到OpenClaw(向导: **Anthropic token (paste setup-token)**)，或在gateway主机上运行:

```bash
openclaw models auth setup-token --provider anthropic
```

如果您在不同机器上生成了token，请粘贴它:

```bash
openclaw models auth paste-token --provider anthropic
```

### CLI设置

```bash
# Paste a setup-token during onboarding
openclaw onboard --auth-choice setup-token
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## 注意事项

- 使用`claude setup-token`生成setup-token并粘贴它，或在gateway主机上运行`openclaw models auth setup-token`。
- 如果您在Claude订阅上看到"OAuth token refresh failed …"，请使用setup-token重新进行身份验证。参见[/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/zh/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription)。
- 身份验证详情+重用规则在[/concepts/oauth](/zh/concepts/oauth)中。

## 故障排除

**401错误/token突然无效**

- Claude订阅身份验证可能过期或被撤销。重新运行`claude setup-token`并将其粘贴到**gateway主机**中。
- 如果Claude CLI登录位于不同的机器上，请在gateway主机上使用`openclaw models auth paste-token --provider anthropic`。

**未找到provider "anthropic" 的API密钥**

- 身份验证是**按agent进行的**。新agent不会继承主agent的密钥。
- 为该agent重新运行入职，或在gateway主机上粘贴setup-token/API密钥，然后使用`openclaw models status`进行验证。

**未找到profile `anthropic:default` 的凭据**

- 运行`openclaw models status`以查看哪个身份验证profile处于活动状态。
- 重新运行入职，或为该profile粘贴setup-token/API密钥。

**没有可用的身份验证profile(全部处于冷却/不可用状态)**

- 检查`openclaw models status --json`中的`auth.unusableProfiles`。
- 添加另一个Anthropic profile或等待冷却结束。

更多信息: [/gateway/troubleshooting](/zh/gateway/troubleshooting) 和 [/help/faq](/zh/help/faq)。
