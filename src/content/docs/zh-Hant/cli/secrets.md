---
summary: "`openclaw secrets`（reload、audit、configure、apply）的 CLI 參考資料"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secrets"
---

# `openclaw secrets`

使用 `openclaw secrets` 來管理 SecretRefs 並保持使用中的執行時段快照健全。

指令角色：

- `reload`：閘道 RPC（`secrets.reload`），僅在完全成功時重新解析參照並交換執行時段快照（無組態寫入）。
- `audit`：對組態/驗證/generated-model 儲存和殘留項進行唯讀掃描，以查找純文字、未解析的參照和優先順序漂移（除非設定了 `--allow-exec`，否則會跳過 exec 參照）。
- `configure`：用於提供者設定、目標映射和預先檢查的互動式規劃工具（需要 TTY）。
- `apply`：執行儲存的計畫（`--dry-run` 僅用於驗證；dry-run 預設會跳過 exec 檢查，而寫入模式會拒絕包含 exec 的計畫，除非設定了 `--allow-exec`），然後清除指定的明文殘留。

建議的操作員循環：

```exec
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果您的計畫包含 `exec` SecretRefs/提供者，請在 dry-run 和寫入套用命令上傳遞 `--allow-exec`。

CI/閘道的退出代碼說明：

- `audit --check` 在發現結果時傳回 `1`。
- 未解析的參照傳回 `2`。

相關：

- Secrets 指南：[Secrets Management](/zh-Hant/gateway/secrets)
- 憑證範圍：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- 安全性指南：[Security](/zh-Hant/gateway/security)

## 重新載入執行時期快照

重新解析 secret 參照並原子性地交換執行時期快照。

```exec
openclaw secrets reload
openclaw secrets reload --json
```

備註：

- 使用 gateway RPC 方法 `secrets.reload`。
- 如果解析失敗，gateway 會保留最後一個已知良好的快照並傳回錯誤（不會部分啟用）。
- JSON 回應包含 `warningCount`。

## 稽核

掃描 OpenClaw 狀態以尋找：

- 明文 secret 儲存
- 未解析的參照
- 優先順序漂移（`auth-profiles.json` 憑證遮蔽 `openclaw.json` 參照）
- 產生的 `agents/*/agent/models.json` 殘留（provider `apiKey` 值和敏感的標頭）
- 舊版殘留（舊版 auth store 項目、OAuth 提醒）

標頭殘留備註：

- 敏感的提供者標頭偵測基於名稱啟發式（常見的驗證/憑證標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```exec
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

結束行為：

- 當發現結果時，`--check` 會以非零代碼結束。
- 未解析的參照會以更高優先級的非零代碼結束。

報告形狀重點：

- `status`：`clean | findings | unresolved`
- `resolution`：`refsChecked`、`skippedExecRefs`、`resolvabilityComplete`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 尋找程式碼：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 設定 (互動式協助程式)

以互動方式建立提供者和 SecretRef 變更，執行飛行前檢查，並選擇性套用：

```exec
openclaw secrets configure
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets configure --apply --yes
openclaw secrets configure --providers-only
openclaw secrets configure --skip-provider-setup
openclaw secrets configure --agent ops
openclaw secrets configure --json
```

流程：

- 先進行提供者設定 (`add/edit/remove` 用於 `secrets.providers` 別名)。
- 其次是憑證對應 (選取欄位並指派 `{source, provider, id}` 參照)。
- 最後進行飛行前檢查與選擇性套用。

旗標：

- `--providers-only`：僅設定 `secrets.providers`，跳過憑證對應。
- `--skip-provider-setup`：跳過提供者設定，並將憑證對應到現有提供者。
- `--agent <id>`：將 `auth-profiles.json` 目標探索和寫入範圍限制在單一代理程式存放區。
- `--allow-exec`: allow exec SecretRef checks during preflight/apply (may execute provider commands).

備註：

- 需要互動式 TTY。
- 您不能結合 `--providers-only` 與 `--skip-provider-setup`。
- `configure` 針對 `openclaw.json` 中承載秘密的欄位，加上所選代理程式範圍的 `auth-profiles.json`。
- `configure` 支援直接在選取器流程中建立新的 `auth-profiles.json` 對應。
- 正式支援的介面：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。
- 它會在套用前執行預檢解析。
- 如果 preflight/apply 包含 exec refs，請保持 `--allow-exec` 在兩個步驟中均已設定。
- 生成的計畫預設為清理選項（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 均已啟用）。
- 對於已清理的純文字值，套用路徑是單向的。
- 如果沒有 `--apply`，CLI 仍會在預檢後提示 `Apply this plan now?`。
- 使用 `--apply`（且沒有 `--yes`）時，CLI 會提示額外的不可還原確認。

Exec 提供者安全注意事項：

- Homebrew 安裝通常會在 `/opt/homebrew/bin/*` 下公開符號連結的二元檔。
- 僅在受信任的套件管理器路徑需要時設定 `allowSymlinkCommand: true`，並將其與 `trustedDirs` 搭配使用（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果提供者路徑無法進行 ACL 驗證，OpenClaw 將以失敗封閉 (fails closed) 方式處理。僅對於信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全性檢查。

## 套用已儲存的計畫

套用或預檢先前產生的計畫：

```exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Exec 行為：

- `--dry-run` 會在不寫入檔案的情況下驗證預檢。
- exec SecretRef 檢查在預演中預設會被略過。
- 寫入模式會拒絕包含 exec SecretRefs/提供者的計畫，除非設定了 `--allow-exec`。
- 使用 `--allow-exec` 以在任一模式中選擇加入 exec 提供者檢查/執行。

計畫合約細節 (允許的目標路徑、驗證規則和失敗語意)：

- [Secrets 套用計畫合約](/zh-Hant/gateway/secrets-plan-contract)

`apply` 可能會更新的內容：

- `openclaw.json` (SecretRef 目標 + 提供者新增/更新/刪除)
- `auth-profiles.json` (provider-target scrubbing)
- legacy `auth.json` residues
- `~/.openclaw/.env` known secret keys whose values were migrated

## 為什麼沒有回滾備份

`secrets apply` intentionally does not write rollback backups containing old plaintext values.

Safety comes from strict preflight + atomic-ish apply with best-effort in-memory restore on failure.

## 範例

```exec
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

If `audit --check` still reports plaintext findings, update the remaining reported target paths and rerun audit.
