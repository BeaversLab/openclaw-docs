---
title: "Auth Credential Semantics"
summary: "Canonical credential eligibility and resolution semantics for auth profiles"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

# Auth Credential Semantics

This document defines the canonical credential eligibility and resolution semantics used across:

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

The goal is to keep selection-time and runtime behavior aligned.

## Stable Reason Codes

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

## Token Credentials

Token credentials (`type: "token"`) support inline `token` and/or `tokenRef`.

### Eligibility rules

1. A token profile is ineligible when both `token` and `tokenRef` are absent.
2. `expires` is optional.
3. If `expires` is present, it must be a finite number greater than `0`.
4. If `expires` is invalid (`NaN`, `0`, negative, non-finite, or wrong type), the profile is ineligible with `invalid_expires`.
5. If `expires` is in the past, the profile is ineligible with `expired`.
6. `tokenRef` does not bypass `expires` validation.

### Resolution rules

1. Resolver semantics match eligibility semantics for `expires`.
2. For eligible profiles, token material may be resolved from inline value or `tokenRef`.
3. Unresolvable refs produce `unresolved_ref` in `models status --probe` output.

## OAuth SecretRef 策略守卫

- SecretRef 输入仅用于静态凭据。
- 如果配置文件凭据是 `type: "oauth"`，则该配置文件凭据材料不支持 SecretRef 对象。
- 如果 `auth.profiles.<id>.mode` 为 `"oauth"`，则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。
- 违规行为在启动/重新加载身份验证解析路径中属于硬性失败。

## 旧版兼容消息

出于脚本兼容性考虑，探测错误会保持第一行不变：

`Auth profile credentials are missing or expired.`

人类可读的详细信息和稳定的原因代码可能会添加在后续行中。
