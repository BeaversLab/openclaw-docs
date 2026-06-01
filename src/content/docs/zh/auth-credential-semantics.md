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

## Agent 副本可移植性

Agent 身份验证继承是透传的。当 Agent 没有本地配置文件时，它可以在运行时从默认/主 Agent 存储解析配置文件，而无需将机密材料复制到其自己的 `auth-profiles.json` 中。

显式复制流程（例如 `openclaw agents add`）使用此可移植性策略：

- `api_key` 配置文件是可移植的，除非 `copyToAgents: false`。
- `token` 配置文件是可移植的，除非 `copyToAgents: false`。
- `oauth` 配置文件默认不可移植，因为刷新令牌可能是单次使用的或对轮换敏感的。
- 提供商拥有的 OAuth 流程只有在跨 Agent 复制刷新材料已知安全的情况下，才能通过 `copyToAgents: true` 选择加入。

不可移植的配置文件通过透传继承保持可用，除非目标 Agent 单独登录并创建其自己的本地配置文件。

## 仅配置的身份验证路由

带有 `mode: "aws-sdk"` 的 `auth.profiles` 条目是路由元数据，而非存储的凭据。当目标提供商使用 `models.providers.<id>.auth: "aws-sdk"`Amazon Bedrock 或插件拥有的 Amazon Bedrock 设置 AWS SDK 路由时，这些条目是有效的。即使在 `auth-profiles.json` 中不存在匹配的条目，这些配置文件 ID 也可能出现在 `auth.order` 和会话覆盖中。

不要将 `type: "aws-sdk"` 写入 `auth-profiles.json`。如果旧版安装存在此类标记，`openclaw doctor --fix` 会将其移动到 `auth.profiles` 并从凭据存储中删除该标记。

## 显式身份验证顺序筛选

- 当为提供商设置了 `auth.order.<provider>` 或身份验证存储顺序覆盖时，`models status --probe` 仅探测保留在该提供商的已解析身份验证顺序中的配置文件 ID。
- 从显式顺序中省略的该提供商的存储配置文件不会在稍后静默尝试。探测输出会使用 `reasonCode: excluded_by_auth_order` 和详细信息 `Excluded by auth.order for this provider.` 对其进行报告。

## 探测目标解析

- 探测目标可以来自身份验证配置文件、环境凭据或 `models.json`。
- 如果提供商拥有凭据，但 OpenClaw 无法为其解析可探测的模型候选项，OpenClaw`models status --probe` 会报告 `status: no_model` 并附带 `reasonCode: no_model`。

## 外部 CLI 凭据发现

- 仅当提供商、运行时或身份验证配置文件在当前操作范围内时，或者当该外部源的已存储本地配置文件已存在时，才会发现由外部 CLI 拥有的仅运行时凭据。
- Auth-store 调用者应选择一种显式的外部 CLI 发现模式：CLI`none` 用于仅持久化/插件身份验证，`existing`CLI 用于刷新已存储的外部 CLI 配置文件，或 `scoped` 用于具体的提供商/配置文件集。
- 只读/状态路径传递 `allowKeychainPrompt: false`CLImacOS；它们仅使用文件支持的外部 CLI 凭据，并且不读取或重用 macOS 钥匙串结果。

## OAuth SecretRef 策略守卫

- SecretRef 输入仅适用于静态凭据。
- 如果配置文件凭据是 `type: "oauth"`，则不支持该配置文件凭据材料的 SecretRef 对象。
- 如果 `auth.profiles.<id>.mode` 为 `"oauth"`，则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。
- 违规行为在启动/重新加载身份验证解析路径中属于硬失败。

## 兼容旧版的消息传递

为了脚本兼容性，探测错误保持第一行不变：

`Auth profile credentials are missing or expired.`

人类可读的详细信息以及稳定的原因代码可能会在后续行中添加。

## 相关

- [密钥管理](/zh/gateway/secrets)
- [身份验证存储](/zh/concepts/oauth)
