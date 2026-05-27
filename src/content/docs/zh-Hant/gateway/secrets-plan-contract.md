---
summary: "`secrets apply` 方案的合約：目標驗證、路徑匹配以及 `auth-profiles.json` 目標範圍"
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: "Secrets apply plan contract"
---

本頁定義了 `openclaw secrets apply` 執行的嚴格合約。

如果目標不符合這些規則，在變更配置之前，apply 將會失敗。

## 計畫檔案形狀

`openclaw secrets apply --from <plan.json>` 預期一個 `targets` 方案目標陣列：

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

## Provider 更新與刪除

方案也可以包含兩個可選的頂層欄位，這些欄位會隨著每個目標的寫入操作一起變更 `secrets.providers` 映射：

- `providerUpserts` — 一個以 provider 別名為鍵的物件。每個值都是
  provider 定義（與 `secrets.providers.<alias>` 中 `openclaw.json` 下接受的形狀相同，例如 `exec` 或 `file`
  provider）。
- `providerDeletes` — 要移除的 provider 別名陣列。

`providerUpserts` 在 `targets` 之前執行，因此 `target.ref.provider` 可以
引用同一方案在 `providerUpserts` 中引入的 provider 別名。如果沒有這一點，引用尚未在 `openclaw.json` 中配置的別名的方案將會失敗，並顯示 `provider "<alias>" is not
configured`。

```json5
{
  version: 1,
  protocolVersion: 1,
  providerUpserts: {
    onepassword_anthropic: {
      source: "exec",
      command: "/usr/bin/op",
      args: ["read", "op://Vault/Anthropic/credential"],
    },
  },
  providerDeletes: ["legacy_unused_alias"],
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.anthropic.apiKey",
      pathSegments: ["models", "providers", "anthropic", "apiKey"],
      providerId: "anthropic",
      ref: { source: "exec", provider: "onepassword_anthropic", id: "credential" },
    },
  ],
}
```

透過 `providerUpserts` 引入的 Exec provider 仍須遵守 [Exec provider consent behavior](#exec-provider-consent-behavior) 中的
exec 同意規則：包含 exec provider 的方案需要處於寫入模式的 `--allow-exec`。

## 支援的目標範圍

方案目標被接受用於以下支援的憑證路徑：

- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)

## 目標類型行為

通用規則：

- `target.type` 必須能夠識別，且必須符合標準化的 `target.path` 形狀。

相容性別名對於現有方案仍然被接受：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路徑驗證規則

每個目標都會使用以下所有規則進行驗證：

- `type` 必須是已識別的目標類型。
- `path` 必須是非空的點分隔路徑。
- `pathSegments` 可以省略。如果提供，它必須正規化為與 `path` 完全相同的路徑。
- 禁止的區段會被拒絕：`__proto__`、`prototype`、`constructor`。
- 正規化後的路徑必須符合目標類型的已註冊路徑形狀。
- 如果設定了 `providerId` 或 `accountId`，它必須符合路徑中編碼的 ID。
- `auth-profiles.json` 目標需要 `agentId`。
- 建立新的 `auth-profiles.json` 對應時，請包含 `authProfileProvider`。

## 失敗行為

如果目標驗證失敗，apply 會結束並顯示類似以下的錯誤：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

無效的計畫不會提交任何寫入。

## Exec 提供者同意行為

- `--dry-run` 預設會跳過 exec SecretRef 檢查。
- 除非設定了 `--allow-exec`，否則在寫入模式下會拒絕包含 exec SecretRefs/提供者的計畫。
- 驗證/套用包含 exec 的計畫時，請在 dry-run 和寫入指令中傳遞 `--allow-exec`。

## 執行階段和稽核範圍說明

- 僅參照 `auth-profiles.json` 項目（`keyRef`/`tokenRef`）會包含在執行階段解析和稽核涵蓋範圍內。
- `secrets apply` 會寫入支援的 `openclaw.json` 目標、支援的 `auth-profiles.json` 目標以及選用的 scrub 目標。

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

如果 apply 失敗並顯示無效目標路徑訊息，請使用 `openclaw secrets configure` 重新產生計畫，或將目標路徑修正為上述支援的形狀。

## 相關文件

- [Secrets Management](/zh-Hant/gateway/secrets)
- [CLI `secrets`](/zh-Hant/cli/secrets)
- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- [Configuration Reference](/zh-Hant/gateway/configuration-reference)
