---
summary: "`secrets apply` 計劃的合約：目標驗證、路徑比對以及 `auth-profiles.json` 目標範圍"
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: "Secrets 應用計劃合約"
---

# Secrets 應用計劃合約

此頁面定義了 `openclaw secrets apply` 執行的嚴格合約。

如果目標不符合這些規則，apply 將在變更設定前失敗。

## 計劃檔案結構

`openclaw secrets apply --from <plan.json>` 預期一個 `targets` 陣列作為計劃目標：

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

計劃目標在以下支援的憑證路徑中被接受：

- [SecretRef 憑證範圍](/zh-Hant/reference/secretref-credential-surface)

## 目標類型行為

一般規則：

- `target.type` 必須被識別，且必須符合標準化的 `target.path` 結構。

相容性別名對於現有計劃仍然被接受：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路徑驗證規則

每個目標都會使用以下所有規則進行驗證：

- `type` 必須是可識別的目標類型。
- `path` 必須是非空白的點分隔路徑。
- `pathSegments` 可以省略。如果提供，它必須標準化為與 `path` 完全相同的路徑。
- 禁止的區段會被拒絕：`__proto__`、`prototype`、`constructor`。
- 標準化路徑必須符合目標類型註冊的路徑結構。
- 如果設定了 `providerId` 或 `accountId`，它必須符合路徑中編碼的 id。
- `auth-profiles.json` 目標需要 `agentId`。
- 建立新的 `auth-profiles.json` 對應時，請包含 `authProfileProvider`。

## 失敗行為

如果目標驗證失敗，apply 將會退出並顯示如下錯誤：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

無效的計劃不會提交任何寫入。

## Exec 提供者同意行為

- `--dry-run` 預設會跳過 exec SecretRef 檢查。
- 包含 exec SecretRefs/提供者的計劃會在寫入模式下被拒絕，除非設定了 `--allow-exec`。
- 在驗證/套用包含 exec 的計劃時，請在 dry-run 和 write 指令中傳遞 `--allow-exec`。

## 執行階段和稽核範圍注意事項

- 僅限參照 (`keyRef`/`tokenRef`) 的 `auth-profiles.json` 項目包含在執行階段解析和稽核範圍內。
- `secrets apply` 會寫入受支援的 `openclaw.json` 目標、受支援的 `auth-profiles.json` 目標以及選用的清除目標。

## 操作員檢查

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# For exec-containing plans, opt in explicitly in both modes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

如果套用失敗並顯示無效的目標路徑訊息，請使用 `openclaw secrets configure` 重新產生計劃，或是將目標路徑修正為上述支援的格式。

## 相關文件

- [Secrets Management](/zh-Hant/gateway/secrets)
- [CLI `secrets`](/zh-Hant/cli/secrets)
- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- [Configuration Reference](/zh-Hant/gateway/configuration-reference)
