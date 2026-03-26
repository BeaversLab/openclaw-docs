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

權杖憑證 (`type: "token"`) 支援行內 `token` 和/或 `tokenRef`。

### 資格規則

1. 當同時缺少 `token` 和 `tokenRef` 時，權杖設定檔不符合資格。
2. `expires` 是選用的。
3. 如果存在 `expires`，它必須是大於 `0` 的有限數值。
4. 如果 `expires` 無效（`NaN`、`0`、負數、非有限數或類型錯誤），則該設定檔因 `invalid_expires` 而不符合資格。
5. 如果 `expires` 在過去，則該設定檔因 `expired` 而不符合資格。
6. `tokenRef` 並不繞過 `expires` 驗證。

### 解析規則

1. 解析器語義與 `expires` 的資格語義相符。
2. 對於符合資格的設定檔，token 內容可以從內嵌值或 `tokenRef` 解析。
3. 無法解析的引用會在 `models status --probe` 輸出中產生 `unresolved_ref`。

## 舊版相容訊息

為了與腳本相容，探測錯誤會將第一行保持不變：

`Auth profile credentials are missing or expired.`

人類可讀的詳細資訊和穩定的原因代碼可能會在後續行中新增。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
