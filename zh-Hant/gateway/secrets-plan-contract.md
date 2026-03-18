---
summary: "`secrets apply` 計劃的合約：目標驗證、路徑匹配，以及 `auth-profiles.json` 目標範圍"
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: "Secrets Apply Plan Contract"
---

# Secrets apply plan contract

此頁面定義了由 `openclaw secrets apply` 執行的嚴格合約。

如果目標不符合這些規則，apply 將在變更設定之前失敗。

## 計畫檔案形狀

`openclaw secrets apply --from <plan.json>` 預期一個 `targets` 計畫目標陣列：

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

## 支援的目標範圍

針對以下項目中支援的憑證路徑接受計畫目標：

- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)

## 目標類型行為

一般規則：

- `target.type` 必須被識別，且必須符合標準化的 `target.path` 形狀。

相容性別名仍被現有計畫接受：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路徑驗證規則

每個目標都會使用以下所有規則進行驗證：

- `type` 必須是已識別的目標類型。
- `path` 必須是非空點路徑。
- `pathSegments` 可以省略。如果提供，其標準化後的路徑必須與 `path` 完全相同。
- 禁止的區段會被拒絕：`__proto__`、`prototype`、`constructor`。
- 標準化路徑必須符合該目標類型的註冊路徑形狀。
- 如果設定了 `providerId` 或 `accountId`，它必須符合路徑中編碼的 id。
- `auth-profiles.json` 目標需要 `agentId`。
- 建立新的 `auth-profiles.json` 對應時，請包含 `authProfileProvider`。

## 失敗行為

如果目標驗證失敗，apply 將退出並顯示類似以下的錯誤：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

無效的計畫不會執行任何寫入操作。

## Runtime and audit scope notes

- 僅參照的 `auth-profiles.json` 條目（`keyRef`/`tokenRef`）包含在運行時解析和審計範圍內。
- `secrets apply` 會寫入受支援的 `openclaw.json` 目標、受支援的 `auth-profiles.json` 目標以及選用的 scrub 目標。

## Operator 檢查

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
```

如果 apply 失敗並顯示無效目標路徑訊息，請使用 `openclaw secrets configure` 重新生成計劃，或將目標路徑修正為上述受支援的形狀。

## 相關文件

- [Secrets 管理](/zh-Hant/gateway/secrets)
- [CLI `secrets`](/zh-Hant/cli/secrets)
- [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface)
- [組態參考](/zh-Hant/gateway/configuration-reference)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
