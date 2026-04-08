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

- Secrets 指南：[Secrets Management](/en/gateway/secrets)
- Credential surface：[SecretRef Credential Surface](/en/reference/secretref-credential-surface)
- 安全性指南：[Security](/en/gateway/security)

## 重新載入執行時段快照

重新解析機密參照並以原子方式交換執行時段快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
openclaw secrets reload --url ws://127.0.0.1:18789 --token <token>
```

說明：

- 使用 gateway RPC 方法 `secrets.reload`。
- 如果解析失敗，gateway 會保持最後一個已知的良好快照並傳回錯誤（無部分啟用）。
- JSON 回應包含 `warningCount`。

選項：

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--json`

## 稽核

掃描 OpenClaw 狀態以檢查：

- 明文秘密儲存
- 未解析的參照
- 優先順序漂移（`auth-profiles.json` 憑證遮蔽 `openclaw.json` 參照）
- 產生的 `agents/*/agent/models.json` 殘留（提供者 `apiKey` 值和敏感的提供者標頭）
- 舊版殘留（舊版認證儲存條目、OAuth 提醒）

標頭殘留說明：

- 敏感的提供者標頭偵測基於名稱啟發式（常見的認證/憑證標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

結束行為：

- `--check` 在發現結果時以非零代碼結束。
- 未解析的參照以較高優先順序的非零代碼結束。

報告形狀重點：

- `status`：`clean | findings | unresolved`
- `resolution`：`refsChecked`、`skippedExecRefs`、`resolvabilityComplete`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 發現代碼：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 設定（互動式輔助程式）

以互動方式建立提供者和 SecretRef 變更，執行預檢，並選擇性套用：

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

- 首先設定提供者（`add/edit/remove` 用於 `secrets.providers` 別名）。
- 其次進行憑證對應（選取欄位並指派 `{source, provider, id}` 參照）。
- 最後進行預檢並選擇性套用。

旗標：

- `--providers-only`：僅設定 `secrets.providers`，跳過憑證映射。
- `--skip-provider-setup`：跳過提供者設定，並將憑證映射到現有的提供者。
- `--agent <id>`：將 `auth-profiles.json` 目標探索與寫入範圍限制在單一 agent store。
- `--allow-exec`：允許在 preflight/apply 期間執行 SecretRef 檢查（可能會執行提供者指令）。

備註：

- 需要互動式 TTY。
- 您不能將 `--providers-only` 與 `--skip-provider-setup` 結合使用。
- `configure` 的目標是 `openclaw.json` 中包含秘密的欄位，加上所選 agent 範圍的 `auth-profiles.json`。
- `configure` 支援直接在選擇器流程中建立新的 `auth-profiles.json` 映射。
- 標準的支援介面：[SecretRef Credential Surface](/en/reference/secretref-credential-surface)。
- 它會在 apply 之前執行 preflight 解析。
- 如果 preflight/apply 包含 exec refs，請將 `--allow-exec` 在兩個步驟中都保持設定。
- 產生的計畫預設使用清理選項（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 均已啟用）。
- 針對已清理的明文值，Apply 路徑是單向的。
- 如果沒有 `--apply`，CLI 仍會在 preflight 後提示 `Apply this plan now?`。
- 使用 `--apply`（且沒有 `--yes`）時，CLI 會提示額外的不可逆確認。
- `--json` 會列印計畫 + preflight 報告，但該指令仍需要互動式 TTY。

Exec 提供者安全性說明：

- Homebrew 安裝通常會在 `/opt/homebrew/bin/*` 下公開符號連結二元檔。
- 僅在受信任的套件管理器路徑需要時設定 `allowSymlinkCommand: true`，並將其與 `trustedDirs` 配對（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果無法針對提供者路徑進行 ACL 驗證，OpenClaw 會封閉式失敗。僅針對受信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全性檢查。

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
- 在 dry-run 模式下，exec SecretRef 檢查預設會被跳過。
- 除非設定了 `--allow-exec`，否則寫入模式會拒絕包含 exec SecretRefs/提供者的計畫。
- 使用 `--allow-exec` 可在任一模式下選擇加入 exec 提供者檢查/執行。

計畫合約細節（允許的目標路徑、驗證規則和失敗語意）：

- [Secrets 套用計畫合約](/en/gateway/secrets-plan-contract)

`apply` 可能會更新的內容：

- `openclaw.json` (SecretRef 目標 + 提供者 upserts/刪除)
- `auth-profiles.json` (提供者目標清除)
- 舊版 `auth.json` 殘留
- `~/.openclaw/.env` 已遷移值的已知金鑰

## 為何沒有還原備份

`secrets apply` 故意不寫入包含舊明文值的還原備份。

安全性來自於嚴格的預檢 + 原子式套用，並在失敗時盡力進行記憶體內還原。

## 範例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍然回報明文發現，請更新剩餘回報的目標路徑並重新執行稽核。
