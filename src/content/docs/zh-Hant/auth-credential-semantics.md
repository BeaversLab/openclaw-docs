---
title: "認證憑證語意"
summary: "用於認證設定檔的規範憑證資格與解析語意"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

# 認證憑證語意

本文件定義了以下範圍中使用的規範憑證資格與解析語意：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目標是保持選擇時間與執行階段的行為一致。

## 穩定原因代碼

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

## 權杖憑證

權杖憑證 (`type: "token"`) 支援內聯 `token` 和/或 `tokenRef`。

### 資格規則

1. 當同時缺少 `token` 和 `tokenRef` 時，權杖設定檔不符合資格。
2. `expires` 為選用。
3. 如果存在 `expires`，它必須是大於 `0` 的有限數字。
4. 如果 `expires` 無效（`NaN`、`0`、負數、非有限數字或類型錯誤），則該設定檔因 `invalid_expires` 而不符合資格。
5. 如果 `expires` 已過期，則該設定檔因 `expired` 而不符合資格。
6. `tokenRef` 並不繞過 `expires` 驗證。

### 解析規則

1. 解析器語意符合 `expires` 的資格語意。
2. 對於符合資格的設定檔，權杖內容可以從內聯值或 `tokenRef` 解析。
3. 無法解析的參照會在 `models status --probe` 輸出中產生 `unresolved_ref`。

## 舊版相容訊息

為了與腳本相容，探錯錯誤會保留第一行不變：

`Auth profile credentials are missing or expired.`

後續行可以加入人類可讀的詳細資訊和穩定的原因代碼。
