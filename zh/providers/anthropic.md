---
title: "Anthropic（Claude）"
summary: "在 OpenClaw 中通过 API key 或 setup-token 使用 Anthropic Claude"
read_when:
  - 想在 OpenClaw 中使用 Anthropic 模型
  - 想用 setup-token 替代 API key
---
# Anthropic（Claude）

Anthropic 构建 **Claude** 模型家族，并提供 API 访问。在 OpenClaw 中你可以使用 API key 或 **setup-token** 认证。

## 方案 A：Anthropic API key

**适用：** 标准 API 访问与按量计费。
在 Anthropic Console 中创建 API key。

### CLI 设置

```bash
openclaw onboard
# 选择：Anthropic API key

# 或非交互式
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### 配置片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## 提示词缓存（Anthropic API）

除非你设置，OpenClaw **不会** 覆盖 Anthropic 默认的缓存 TTL。
这 **仅适用于 API**；订阅认证不支持 TTL 设置。

要为每个模型设置 TTL，请在模型 `params` 中使用 `cacheControlTtl`：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": {
          params: { cacheControlTtl: "5m" } // 或 "1h"
        }
      }
    }
  }
}
```

OpenClaw 会在 Anthropic API 请求中包含 `extended-cache-ttl-2025-04-11` beta 标记；
如你覆盖 provider headers，请保留它（见 [/gateway/configuration](/zh/gateway/configuration)）。

## 方案 B：Claude setup-token

**适用：** 使用你的 Claude 订阅。

### 获取 setup-token

Setup-token 由 **Claude Code CLI** 创建，而不是 Anthropic Console。可在 **任何机器** 上执行：

```bash
claude setup-token
```

将 token 粘贴到 OpenClaw（向导：**Anthropic token (paste setup-token)**），或在 gateway 主机上运行：

```bash
openclaw models auth setup-token --provider anthropic
```

如果 token 在另一台机器上生成，可用以下命令粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

### CLI 设置

```bash
# 在 onboarding 时粘贴 setup-token
openclaw onboard --auth-choice setup-token
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## 说明

- 使用 `claude setup-token` 生成并粘贴，或在 gateway 主机上运行 `openclaw models auth setup-token`。
- 若 Claude 订阅出现 “OAuth token refresh failed …”，请用 setup-token 重新认证。参见 [/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/zh/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription)。
- 认证细节与复用规则见 [/concepts/oauth](/zh/concepts/oauth)。

## 故障排查

**401 错误 / token 突然失效**
- Claude 订阅认证可能过期或被撤销。重新执行 `claude setup-token` 并粘贴到 **gateway 主机**。
- 如果 Claude CLI 登录在另一台机器上，请在 gateway 主机上执行
  `openclaw models auth paste-token --provider anthropic`。

**No API key found for provider "anthropic"**
- 认证是 **按代理** 绑定的。新代理不会继承主代理的 key。
- 为该代理重新 onboarding，或在 gateway 主机上粘贴 setup-token / API key，然后用 `openclaw models status` 验证。

**No credentials found for profile `anthropic:default`**
- 运行 `openclaw models status` 查看活跃的认证 profile。
- 重新 onboarding，或为该 profile 粘贴 setup-token / API key。

**No available auth profile (all in cooldown/unavailable)**
- 运行 `openclaw models status --json` 查看 `auth.unusableProfiles`。
- 添加另一个 Anthropic profile 或等待 cooldown。

更多：[/gateway/troubleshooting](/zh/gateway/troubleshooting) 与 [/help/faq](/zh/help/faq)。
