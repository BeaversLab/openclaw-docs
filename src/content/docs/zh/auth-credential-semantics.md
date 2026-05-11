---
summary: "Auth profiles 的规范凭据资格和解析语义"
title: "Auth credential semantics"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

本文档定义了以下内容中使用的规范凭据资格和解析语义：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目标是保持选择时和运行时的行为一致。

## Stable probe reason codes

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## Token credentials

Token credentials (`type: "token"`) 支持内联 `token` 和/或 `tokenRef`。

### Eligibility rules

1. 当同时缺少 `token` 和 `tokenRef` 时，token profile 不具备资格。
2. `expires` 是可选的。
3. 如果存在 `expires`，它必须是大于 `0` 的有限数字。
4. 如果 `expires` 无效（`NaN`、`0`、负数、非有限或类型错误），则该 profile 不具备资格，原因为 `invalid_expires`。
5. 如果 `expires` 已过期，则该 profile 不具备资格，原因为 `expired`。
6. `tokenRef` 不会绕过 `expires` 验证。

### Resolution rules

1. 对于 `expires`，解析器语义与资格语义匹配。
2. 对于具备资格的 profile，可以从内联值或 `tokenRef` 解析 token material。
3. 无法解析的引用会在 `models status --probe` 输出中产生 `unresolved_ref`。

## Explicit auth order filtering

- 当为提供商设置了 `auth.order.<provider>` 或 auth-store 顺序覆盖时，`models status --probe` 仅探测该提供商解析出的认证顺序中剩余的配置文件 ID。
- 该提供商的存储配置文件如果从显式顺序中省略，则不会在后续静默尝试。探测输出将使用 `reasonCode: excluded_by_auth_order` 和详细信息 `Excluded by auth.order for this provider.` 进行报告。

## 探测目标解析

- 探测目标可以来自认证配置文件、环境凭据或 `models.json`。
- 如果提供商拥有凭据但 OpenClaw 无法为其解析出可探测的模型候选者，`models status --probe` 将报告 `status: no_model` 并附带 `reasonCode: no_model`。

## OAuth SecretRef 策略守卫

- SecretRef 输入仅适用于静态凭据。
- 如果配置文件凭据是 `type: "oauth"`，则不支持该配置文件凭据材料的 SecretRef 对象。
- 如果 `auth.profiles.<id>.mode` 为 `"oauth"`，则拒绝该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入。
- 违规操作在启动/重新加载认证解析路径中属于硬故障。

## 传统兼容消息传递

为了脚本兼容性，探测错误保持第一行不变：

`Auth profile credentials are missing or expired.`

人类友好的详细信息和稳定的原因代码可以在后续行中添加。

## 相关

- [密钥管理](/zh/gateway/secrets)
- [认证存储](/zh/concepts/oauth)
