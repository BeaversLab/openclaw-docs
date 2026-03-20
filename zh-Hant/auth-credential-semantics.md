---
title: "Auth Credential Semantics"
summary: "用於 auth profiles 的 canonical credential eligibility and resolution semantics"
read_when:
  - 正在處理 auth profile 解析或 credential 路由
  - 偵錯 model auth 失敗或 profile 順序
---

# Auth Credential Semantics

本文件定義了用於以下內容的 canonical credential eligibility and resolution semantics：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目標是保持選擇時間和執行階段的行為一致。

## Stable Reason Codes

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

## Token Credentials

Token 憑證 (`type: "token"`) 支援內聯 `token` 和/或 `tokenRef`。

### Eligibility rules

1. 當同時缺少 `token` 和 `tokenRef` 時，token profile 為不符合資格。
2. `expires` 為選用。
3. 如果存在 `expires`，它必須是大於 `0` 的有限數字。
4. 如果 `expires` 無效（`NaN`、`0`、負數、非有限值或類型錯誤），則 profile 不符合資格，並帶有 `invalid_expires`。
5. 如果 `expires` 已過去，則 profile 不符合資格，並帶有 `expired`。
6. `tokenRef` 不會略過 `expires` 驗證。

### Resolution rules

1. 解析器語義符合 `expires` 的資格語義。
2. 對於符合資格的 profile，token 材質可以從內聯值或 `tokenRef` 解析。
3. 無法解析的參照會在 `models status --probe` 輸出中產生 `unresolved_ref`。

## Legacy-Compatible Messaging

為了腳本相容性，probe 錯誤會保持第一行不變：

`Auth profile credentials are missing or expired.`

後續行可以加入人類可讀的詳細資訊和穩定的原因代碼。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
