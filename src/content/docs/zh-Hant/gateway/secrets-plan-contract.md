---
summary: "`secrets apply` 計劃的合約：目標驗證、路徑比對以及 `auth-profiles.json` 目標範圍"
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: "Secrets apply plan contract"
---

本頁定義了由 `openclaw secrets apply` 強制執行的嚴格合約。

如果目標不符合這些規則，在變更配置之前，apply 將會失敗。

## 計畫檔案形狀

`openclaw secrets apply --from <plan.json>` 預期一個計畫目標的 `targets` 陣列：

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

以下支援的憑證路徑接受計畫目標：

- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)

## 目標類型行為

一般規則：

- `target.type` 必須被識別，且必須符合標準化的 `target.path` 形狀。

相容性別名仍被現有計畫接受：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路徑驗證規則

每個目標都會使用以下所有項目進行驗證：

- `type` 必須是可識別的目標類型。
- `path` 必須是非空點路徑。
- `pathSegments` 可以省略。如果提供，它必須標準化為與 `path` 完全相同的路徑。
- 禁止的區段會被拒絕：`__proto__`、`prototype`、`constructor`。
- 標準化路徑必須符合目標類型的註冊路徑形狀。
- 如果設定了 `providerId` 或 `accountId`，它必須符合路徑中編碼的 id。
- `auth-profiles.json` 目標需要 `agentId`。
- 建立新的 `auth-profiles.json` 對應時，請包含 `authProfileProvider`。

## 失敗行為

如果目標驗證失敗，apply 將會顯示類似以下的錯誤並退出：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

無效的計畫不會提交任何寫入操作。

## Exec 提供者同意行為

- `--dry-run` 預設會跳過 exec SecretRef 檢查。
- 除非設定了 `--allow-exec`，否則在寫入模式下會拒絕包含 exec SecretRef/提供者的計畫。
- 當驗證/套用包含 exec 的計畫時，請在 dry-run 和寫入命令中傳遞 `--allow-exec`。

## 執行時段和稽核範圍備註

- 僅參照（Ref-only）`auth-profiles.json` 項目 (`keyRef`/`tokenRef`) 包含在執行時期解析與稽核範圍中。
- `secrets apply` 會寫入支援的 `openclaw.json` 目標、支援的 `auth-profiles.json` 目標，以及選用的清理（scrub）目標。

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

如果 apply 因無效的目標路徑訊息而失敗，請使用 `openclaw secrets configure` 重新產生計劃，或將目標路徑修正為上述支援的格式。

## 相關文件

- [機密管理](/zh-Hant/gateway/secrets)
- [CLI `secrets`](/zh-Hant/cli/secrets)
- [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface)
- [組態參考](/zh-Hant/gateway/configuration-reference)
