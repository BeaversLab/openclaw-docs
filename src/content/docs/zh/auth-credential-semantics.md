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

## 稳定探测原因代码

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## 令牌凭据

令牌凭据（`type: "token"`）支持内联 `token` 和/或 `tokenRef`。

### 资格规则

1. 当 `token` 和 `tokenRef` 都不存在时，令牌配置文件不符合资格。
2. `expires` 是可选的。
3. 如果存在 `expires`，它必须是一个大于 `0` 的有限数字。
4. 如果 `expires` 无效（`NaN`、`0`、负数、非有限值或类型错误），则配置文件因 `invalid_expires` 而不符合资格。
5. 如果 `expires` 已经过期，则配置文件因 `expired` 而不符合资格。
6. `tokenRef` 不绕过 `expires` 验证。

### 解析规则

1. 解析器语义与 `expires` 的资格语义相匹配。
2. 对于符合条件的配置文件，令牌材料可以从内联值或 `tokenRef` 解析。
3. 无法解析的引用会在 `models status --probe` 输出中产生 `unresolved_ref`。

## 显式身份验证顺序过滤

- 当为提供商设置了 `auth.order.<provider>` 或 auth-store 顺序覆盖时，`models status --probe` 仅探测保留在该提供商解析身份验证顺序中的配置文件 ID。
- 该提供商的存储配置文件如果从显式顺序中省略，则不会在稍后静默重试。探测输出会使用 `reasonCode: excluded_by_auth_order` 和详细信息 `Excluded by auth.order for this provider.` 进行报告。

## 探测目标解析

- 探测目标可以来自身份验证配置文件、环境凭据或 `models.json`。
- 如果提供商具有凭据但 OpenClaw 无法为其解析可探测的模型候选者，`models status --probe` 将报告 `status: no_model` 并附带 `reasonCode: no_model`。

## OAuth SecretRef 策略保护

- SecretRef 输入仅用于静态凭证。
- 如果配置文件凭证是 `type: "oauth"`，则不支持为该配置文件凭证材料使用 SecretRef 对象。
- 如果 `auth.profiles.<id>.mode` 为 `"oauth"`，则拒绝该配置文件的基于 SecretRef 的 `keyRef`/`tokenRef` 输入。
- 违规行为在启动/重新加载身份解析路径中属于硬故障。

## 旧版兼容消息传递

为了脚本兼容性，探测错误保持第一行不变：

`Auth profile credentials are missing or expired.`

友好的详细信息和稳定的原因代码可能会添加在后续行中。
