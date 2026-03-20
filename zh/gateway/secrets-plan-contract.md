---
summary: "`secrets apply` 计划的合约：目标验证、路径匹配和 `auth-profiles.json` 目标范围"
read_when:
  - 生成或审查 `openclaw secrets apply` 计划
  - 调试 `Invalid plan target path` 错误
  - 了解目标类型和路径验证行为
title: "Secrets Apply Plan Contract"
---

# Secrets apply plan contract

本页定义了由 `openclaw secrets apply` 强制执行的严格合约。

如果目标不符合这些规则，应用将在更改配置之前失败。

## Plan file shape

`openclaw secrets apply --from <plan.json>` 期望一个 `targets` 类型的计划目标数组：

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

## Supported target scope

在以下位置支持的目标凭据路径接受计划目标：

- [SecretRef Credential Surface](/zh/reference/secretref-credential-surface)

## Target type behavior

General rule:

- `target.type` 必须被识别，并且必须匹配标准化的 `target.path` 形状。

现有计划仍然接受兼容性别名：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## Path validation rules

每个目标都使用以下所有内容进行验证：

- `type` 必须是可识别的目标类型。
- `path` 必须是非空的点路径。
- `pathSegments` 可以省略。如果提供，它必须标准化为与 `path` 完全相同的路径。
- 禁止的段将被拒绝：`__proto__`、`prototype`、`constructor`。
- 标准化路径必须匹配目标类型的注册路径形状。
- 如果设置了 `providerId` 或 `accountId`，它必须匹配路径中编码的 ID。
- `auth-profiles.json` 目标需要 `agentId`。
- 创建新的 `auth-profiles.json` 映射时，请包含 `authProfileProvider`。

## Failure behavior

如果目标验证失败，应用将退出并显示如下错误：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

无效的计划不会提交任何写入操作。

## Exec 提供商 consent behavior

- `--dry-run` 默认跳过 exec SecretRef 检查。
- 在写入模式下，除非设置了 `--allow-exec`，否则包含 exec SecretRefs/providers 的计划将被拒绝。
- 在验证/应用包含 exec 的计划时，请在 dry-run 和 write 命令中传递 `--allow-exec`。

## 运行时和审计范围说明

- 仅限引用的 `auth-profiles.json` 条目（`keyRef`/`tokenRef`）包含在运行时解析和审计覆盖范围内。
- `secrets apply` 会写入支持的 `openclaw.json` 目标、支持的 `auth-profiles.json` 目标以及可选的清理目标。

## 操作员检查

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# For exec-containing plans, opt in explicitly in both modes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

如果应用失败并显示无效的目标路径消息，请使用 `openclaw secrets configure` 重新生成计划，或将目标路径修复为上述支持的形状。

## 相关文档

- [机密管理](/zh/gateway/secrets)
- [CLI `secrets`](/zh/cli/secrets)
- [SecretRef 凭据面](/zh/reference/secretref-credential-surface)
- [配置参考](/zh/gateway/configuration-reference)

import en from "/components/footer/en.mdx";

<en />
