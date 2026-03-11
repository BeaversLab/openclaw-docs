---
summary: "`secrets apply` 计划的合约：目标验证、路径匹配和 `auth-profiles.json` 目标范围"
read_when:
  - "Generating or reviewing `openclaw secrets apply` plans"
  - "Debugging `Invalid plan target path` errors"
  - "Understanding target type and path validation behavior"
title: "密钥应用计划合约"
---

# 密钥应用计划合约

本页面定义了 `openclaw secrets apply` 强制执行的严格合约。

如果目标不符合这些规则，应用将在更改配置之前失败。

## 计划文件结构

`openclaw secrets apply --from <plan.json>` 期望一个 `targets` 计划目标数组：

```json5
{
  version: 1,
  protocolVersion: 1,
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.openai.apiKey",
      pathSegments: ["models", "providers", "openai", "apiKey"],
      providerId: "openai",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
    {
      type: "auth-profiles.api_key.key",
      path: "profiles.openai:default.key",
      pathSegments: ["profiles", "openai:default", "key"],
      agentId: "main",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
  ],
}
```

## 支持的目标范围

计划目标被接受用于以下支持的身份验证路径：

- [SecretRef Credential Surface](/zh/reference/secretref-credential-surface)

## 目标类型行为

通用规则：

- `target.type` 必须被识别，并且必须匹配规范的 `target.path` 结构。

现有计划仍接受兼容性别名：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路径验证规则

每个目标都使用以下所有规则进行验证：

- `type` 必须是已识别的目标类型。
- `path` 必须是非空点路径。
- `pathSegments` 可以省略。如果提供，它必须规范化为与 `path` 完全相同的路径。
- 禁止的段被拒绝：`__proto__`、`prototype`、`constructor`。
- 规范化路径必须匹配目标类型的注册路径结构。
- 如果设置了 `providerId` 或 `accountId`，它必须匹配路径中编码的 id。
- `auth-profiles.json` 目标需要 `agentId`。
- 创建新的 `auth-profiles.json` 映射时，包含 `authProfileProvider`。

## 失败行为

如果目标验证失败，应用将退出并显示如下错误：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

对于无效计划，不会提交任何写入操作。

## 运行时和审计范围注意事项

- 仅引用的 `auth-profiles.json` 条目（`keyRef`/`tokenRef`）包含在运行时解析和审计覆盖中。
- `secrets apply` 写入支持的 `openclaw.json` 目标、支持的 `auth-profiles.json` 目标和可选的擦除目标。

## 操作员检查

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
```

如果应用因无效目标路径消息而失败，请使用 `openclaw secrets configure` 重新生成计划或将目标路径修复为上述支持的形状。

## 相关文档

- [Secrets Management](/zh/gateway/secrets)
- [CLI `secrets`](/zh/cli/secrets)
- [SecretRef Credential Surface](/zh/reference/secretref-credential-surface)
- [Configuration Reference](/zh/gateway/configuration-reference)
