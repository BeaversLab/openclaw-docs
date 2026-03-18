# 驗證憑證語意

本文定義了以下範圍使用的標準憑證資格判定與解析語意：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目標是保持選取時間與執行時期的行為一致。

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
3. 如果存在 `expires`，則其必須是大於 `0` 的有限數字。
4. 如果 `expires` 無效（`NaN`、`0`、負數、非有限值或類型錯誤），則該設定檔因 `invalid_expires` 而不符合資格。
5. 如果 `expires` 已過去，則該設定檔因 `expired` 而不符合資格。
6. `tokenRef` 不會略過 `expires` 驗證。

### 解析規則

1. 解析器語意與 `expires` 的資格判定語意相符。
2. 對於符合資格的設定檔，可以從內聯值或 `tokenRef` 解析權杖素材。
3. 無法解析的參照會在 `models status --probe` 輸出中產生 `unresolved_ref`。

## 相容舊版的訊息傳遞

為了與腳本相容，探錯訊息會保留第一行不變：

`Auth profile credentials are missing or expired.`

人類易讀的詳細資訊與穩定原因代碼可以新增在後續行中。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
