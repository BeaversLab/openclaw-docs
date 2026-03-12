---
summary: “`secrets apply` 计划的合约：目标验证、路径匹配和 `auth-profiles.json` 目标范围”
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: “Secrets Apply Plan 合约”
---

# Secrets 应用计划合约

本页定义了由 `openclaw secrets apply` 强制执行的严格合约。

如果目标不匹配这些规则，应用将在修改配置之前失败。

## 计划文件形状

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

以下位置中支持的凭据路径接受计划目标：

- [SecretRef 凭据表面](/zh/en/reference/secretref-credential-surface)

## 目标类型行为

通用规则：

- `target.type` 必须被识别，并且必须匹配规范化的 `target.path` 形状。

现有计划仍然接受兼容性别名：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路径验证规则

每个目标都通过以下所有方式进行验证：

- `type` 必须是已识别的目标类型。
- `path` 必须是非空的点路径。
- `pathSegments` 可以省略。如果提供，它必须规范化为与 `path` 完全相同的路径。
- 禁止的段将被拒绝：`__proto__`、`prototype`、`constructor`。
- 规范化路径必须匹配目标类型的注册路径形状。
- 如果设置了 `providerId` 或 `accountId`，它必须匹配路径中编码的 id。
- `auth-profiles.json` 目标需要 `agentId`。
- 创建新的 `auth-profiles.json` 映射时，请包含 `authProfileProvider`。

## 失败行为

如果目标验证失败，应用将退出并显示类似以下的错误：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

对于无效的计划，不会提交任何写入操作。

## 运行时和审计范围说明

- 仅引用的 `auth-profiles.json` 条目（`keyRef`/`tokenRef`）包含在运行时解析和审计覆盖范围内。
- `secrets apply` 写入支持的 `openclaw.json` 目标、支持的 `auth-profiles.json` 目标以及可选的清理目标。

## 操作员检查

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
```

如果应用失败并显示无效目标路径消息，请使用 `openclaw secrets configure` 重新生成计划，或者将目标路径修复为上述支持的格式。

## 相关文档

- [Secrets Management](/zh/en/gateway/secrets)
- [CLI `secrets`](/zh/en/cli/secrets)
- [SecretRef Credential Surface](/zh/en/reference/secretref-credential-surface)
- [Configuration Reference](/zh/en/gateway/configuration-reference)
