---
summary: "`openclaw secrets` (reload, audit, configure, apply) 的 CLI 參考"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secrets"
---

# `openclaw secrets`

使用 `openclaw secrets` 來管理 SecretRefs 並保持作用中的執行時段快照健全。

指令角色：

- `reload`：gateway RPC (`secrets.reload`)，會重新解析參照並僅在完全成功時交換執行時段快照（無組態寫入）。
- `audit`：對組態/認證/生成模型儲存及舊殘留進行唯讀掃描，以查找明文、未解析的參照及優先順序漂移（除非設定了 `--allow-exec`，否則會跳過 exec 參照）。
- `configure`：用於提供者設定、目標映射及預檢的互動式規劃程式（需要 TTY）。
- `apply`：執行已儲存的計畫（`--dry-run` 僅用於驗證；試執行預設會跳過 exec 檢查，而寫入模式會拒絕包含 exec 的計畫，除非設定了 `--allow-exec`），然後清除目標明文殘留。

建議的操作員循環：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果您的計畫包含 `exec` SecretRefs/提供者，請在試執行和寫入套用指令上傳遞 `--allow-exec`。

CI/閘道的結束代碼說明：

- `audit --check` 在發現結果時會傳回 `1`。
- 未解析的參照會傳回 `2`。

相關：

- 機密指南：[機密管理](/en/gateway/secrets)
- 憑證接觸面：[SecretRef 憑證接觸面](/en/reference/secretref-credential-surface)
- 安全性指南：[安全性](/en/gateway/security)

## 重新載入執行時段快照

重新解析機密參照並以原子方式交換執行時段快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
```

說明：

- 使用 gateway RPC 方法 `secrets.reload`。
- 如果解析失敗，gateway 會保持最後一個已知的良好快照並傳回錯誤（無部分啟用）。
- JSON 回應包含 `warningCount`。

## 稽核

掃描 OpenClaw 狀態以尋找：

- 明文機密儲存
- 未解析的參照
- 優先級漂移（`auth-profiles.json` 憑證遮蔽 `openclaw.json` 參照）
- 產生的 `agents/*/agent/models.json` 殘留（提供者 `apiKey` 值和敏感的提供者標頭）
- 舊版殘留（舊版認證儲存條目、OAuth 提醒）

標頭殘留說明：

- 敏感提供者標頭偵測是基於名稱啟發式（常見的認證/憑證標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

結束行為：

- 當發現問題時，`--check` 會以非零狀態碼結束。
- 未解析的參照會以更高優先級的非零狀態碼結束。

報告結構重點：

- `status`：`clean | findings | unresolved`
- `resolution`：`refsChecked`、`skippedExecRefs`、`resolvabilityComplete`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 發現代碼：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 設定（互動式助手）

以互動方式建構提供者和 SecretRef 變更，執行預檢，並選擇性套用：

```bash
openclaw secrets configure
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets configure --apply --yes
openclaw secrets configure --providers-only
openclaw secrets configure --skip-provider-setup
openclaw secrets configure --agent ops
openclaw secrets configure --json
```

流程：

- 首先設定提供者（使用 `add/edit/remove` 進行 `secrets.providers` 別名設定）。
- 接著進行憑證對應（選擇欄位並指派 `{source, provider, id}` 參照）。
- 最後進行預檢和選擇性套用。

旗標：

- `--providers-only`：僅設定 `secrets.providers`，跳過憑證對應。
- `--skip-provider-setup`：跳過提供者設定，並將憑證對應至現有提供者。
- `--agent <id>`：將 `auth-profiles.json` 目標探索和寫入範圍限制在一個代理程式儲存中。
- `--allow-exec`：允許在預檢/套用期間執行 exec SecretRef 檢查（可能會執行提供者指令）。

說明：

- 需要互動式 TTY。
- 您不能將 `--providers-only` 與 `--skip-provider-setup` 結合使用。
- `configure` 以 `openclaw.json` 中的承載密碼欄位為目標，加上所選代理程式範圍的 `auth-profiles.json`。
- `configure` 支援直接在選擇器流程中建立新的 `auth-profiles.json` 對應。
- 標準的支援介面：[SecretRef Credential Surface](/en/reference/secretref-credential-surface)。
- 它會在套用前執行預檢解析。
- 如果預檢/套用包含 exec refs，請在這兩個步驟中保持 `--allow-exec` 設定。
- 產生的計畫預設為清除選項 (`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 全部啟用)。
- 清除後的明文值的套用路徑是單向的。
- 若沒有 `--apply`，CLI 仍會在預檢後提示 `Apply this plan now?`。
- 使用 `--apply` (且沒有 `--yes`) 時，CLI 會提示額外的不可逆確認。

Exec 提供者安全注意事項：

- Homebrew 安裝通常會在 `/opt/homebrew/bin/*` 下公開符號連結二元檔。
- 僅在信任的套件管理器路徑需要時設定 `allowSymlinkCommand: true`，並將其與 `trustedDirs` 搭配使用 (例如 `["/opt/homebrew"]`)。
- 在 Windows 上，如果無法針對提供者路徑使用 ACL 驗證，OpenClaw 將會封閉式失敗。僅針對信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全檢查。

## 套用已儲存的計畫

套用或預檢先前產生的計畫：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Exec 行為：

- `--dry-run` 會驗證預檢而不寫入檔案。
- 在試執行中，exec SecretRef 檢查預設會被略過。
- 寫入模式會拒絕包含 exec SecretRefs/提供者的計畫，除非已設定 `--allow-exec`。
- 使用 `--allow-exec` 以選擇在任一模式中執行 exec 提供者檢查/執行。

計畫契約詳細資訊 (允許的目標路徑、驗證規則和失敗語意)：

- [Secrets Apply Plan Contract](/en/gateway/secrets-plan-contract)

`apply` 可能更新的內容：

- `openclaw.json` (SecretRef 目標 + 提供者新增/刪除)
- `auth-profiles.json` (提供者目標清理)
- 舊版 `auth.json` 殘留
- `~/.openclaw/.env` 值已遷移的已知金鑰

## 為何沒有回滾備份

`secrets apply` 刻意不寫入包含舊純文字值的回滾備份。

安全性來自嚴格的飛行前檢查 + 類原子的套用，並在失敗時盡力在記憶體中還原。

## 範例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍然回報純文字結果，請更新其餘回報的目標路徑並重新執行稽核。
