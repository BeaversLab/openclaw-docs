---
summary: "用於 `secrets apply` 計畫的合約：目標驗證、路徑比對以及 `auth-profiles.json` 目標範圍"
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: "Secrets Apply Plan Contract"
---

# Secrets 套用計畫合約

本頁面定義了由 `openclaw secrets apply` 強制執行的嚴格合約。

如果目標不符合這些規則，則會在變更配置之前導致應用失敗。

## 計畫檔案結構

`openclaw secrets apply --from <plan.json>` 預期一個包含計畫目標的 `targets` 陣列：

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

計畫目標被接受用於以下支援的憑證路徑：

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
- `path` 必須是非空的點路徑。
- `pathSegments` 可以省略。如果提供，則必須正規化為與 `path` 完全相同的路徑。
- 禁止的區段會被拒絕：`__proto__`、`prototype`、`constructor`。
- 正規化路徑必須符合目標類型的註冊路徑形狀。
- 如果設定了 `providerId` 或 `accountId`，它必須與路徑中編碼的相符。
- `auth-profiles.json` 目標需要 `agentId`。
- 建立新的 `auth-profiles.json` 對應時，請包含 `authProfileProvider`。

## 失敗行為

如果目標驗證失敗，apply 會以類似以下的錯誤結束：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

無效的計畫不會提交任何寫入。

## Exec 提供者同意行為

- `--dry-run` 預設會跳過 exec SecretRef 檢查。
- 除非設定了 `--allow-exec`，否則包含 exec SecretRefs/提供者的計畫會在寫入模式下被拒絕。
- 驗證/套用包含 exec 的計畫時，請在 dry-run 和寫入指令中傳遞 `--allow-exec`。

## Runtime 和稽核範圍注意事項

- 僅引用 `auth-profiles.json` 項目 (`keyRef`/`tokenRef`) 包含在執行時期解析和稽核涵蓋範圍內。
- `secrets apply` 會寫入支援的 `openclaw.json` 目標、支援的 `auth-profiles.json` 目標以及選用的清理目標。

## 操作員檢查

```exec
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# For exec-containing plans, opt in explicitly in both modes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

如果 apply 失敗並顯示無效的目標路徑訊息，請使用 `openclaw secrets configure` 重新產生計畫，或將目標路徑修正為上述支援的格式。

## 相關文件

- [Secrets Management](/zh-Hant/gateway/secrets)
- [CLI `secrets`](/zh-Hant/cli/secrets)
- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- [Configuration Reference](/zh-Hant/gateway/configuration-reference)
