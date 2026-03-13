# Auth Credential Semantics

本文档定义了跨以下内容使用的标准凭据资格和解析语义：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目标是保持选择时和运行时的行为一致。

## Stable Reason Codes

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

## Token Credentials

令牌凭据 (`type: "token"`) 支持内联 `token` 和/或 `tokenRef`。

### Eligibility rules

1. 当 `token` 和 `tokenRef` 均不存在时，令牌配置文件不符合资格。
2. `expires` 是可选的。
3. 如果存在 `expires`，它必须是一个大于 `0` 的有限数字。
4. 如果 `expires` 无效（`NaN`、`0`、负数、非有限值或类型错误），则该配置文件不符合资格，原因为 `invalid_expires`。
5. 如果 `expires` 已经过去，则该配置文件不符合资格，原因为 `expired`。
6. `tokenRef` 不会绕过 `expires` 验证。

### Resolution rules

1. 解析器语义与 `expires` 的资格语义相匹配。
2. 对于符合资格的配置文件，令牌材料可以从内联值或 `tokenRef` 解析。
3. 无法解析的引用会在 `models status --probe` 输出中产生 `unresolved_ref`。

## Legacy-Compatible Messaging

为了脚本兼容性，探测错误保持第一行不变：

`Auth profile credentials are missing or expired.`

人类可读的详细信息以及稳定的原因代码可以在后续行中添加。

import zh from '/components/footer/zh.mdx';

<zh />
