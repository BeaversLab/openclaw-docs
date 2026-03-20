---
summary: "`secrets apply` 計劃的約定：目標驗證、路徑匹配以及 `auth-profiles.json` 目標範圍"
read_when:
  - 正在產生或審查 `openclaw secrets apply` 計劃
  - 除錯 `Invalid plan target path` 錯誤
  - 瞭解目標類型和路徑驗證行為
title: "Secrets Apply Plan Contract"
---

# Secrets apply plan contract

本頁定義了 `openclaw secrets apply` 強制執行的嚴格約定。

如果目標不符合這些規則，在變更組態之前，apply 將會失敗。

## Plan file shape

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

## Supported target scope

以下位置中支援的憑證路徑會接受計劃目標：

- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)

## Target type behavior

一般規則：

- `target.type` 必須被識別，且必須符合正規化的 `target.path` 形狀。

現有計劃仍接受相容性別名：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## Path validation rules

每個目標都會根據以下所有項目進行驗證：

- `type` 必須是可識別的目標類型。
- `path` 必須是非空白的點分隔路徑。
- `pathSegments` 可以省略。如果提供，其正規化後的路徑必須與 `path` 完全相同。
- 禁止的區段會被拒絕：`__proto__`、`prototype`、`constructor`。
- 正規化路徑必須符合該目標類型的註冊路徑形狀。
- 如果設定了 `providerId` 或 `accountId`，其必須符合路徑中編碼的 ID。
- `auth-profiles.json` 目標需要 `agentId`。
- 建立新的 `auth-profiles.json` 對應時，請包含 `authProfileProvider`。

## Failure behavior

如果目標驗證失敗，apply 將會產生類似以下的錯誤並結束：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

無效的計劃不會執行任何寫入操作。

## Exec provider consent behavior

- `--dry-run` 預設會跳過 exec SecretRef 檢查。
- 包含 exec SecretRefs/提供者的計劃在寫入模式下會被拒絕，除非設定了 `--allow-exec`。
- 在驗證/套用包含 exec 的計劃時，請在試執行和寫入命令中傳遞 `--allow-exec`。

## 執行時和稽核範圍註記

- 僅參照的 `auth-profiles.json` 項目（`keyRef`/`tokenRef`）包含在執行時解析和稽核覆蓋範圍內。
- `secrets apply` 會寫入支援的 `openclaw.json` 目標、支援的 `auth-profiles.json` 目標以及選用的清理目標。

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

如果套用失敗並顯示無效目標路徑訊息，請使用 `openclaw secrets configure` 重新產生計劃，或將目標路徑修正為上述支援的形狀。

## 相關文件

- [Secrets Management](/zh-Hant/gateway/secrets)
- [CLI `secrets`](/zh-Hant/cli/secrets)
- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- [Configuration Reference](/zh-Hant/gateway/configuration-reference)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
