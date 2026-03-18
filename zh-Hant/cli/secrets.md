---
summary: "CLI 參考文件 `openclaw secrets` (reload, audit, configure, apply)"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secrets"
---

# `openclaw secrets`

使用 `openclaw secrets` 來管理 SecretRefs 並保持運行時快照的健全狀態。

指令角色：

- `reload`：閘道 RPC (`secrets.reload`)，僅在完全成功時重新解析參照並交換運行時快照（無寫入設定）。
- `audit`：對設定/授權/生成模型儲存庫和舊殘留進行唯讀掃描，以檢查純文字、未解析參照和優先順序漂移。
- `configure`：提供者設定、目標映射和預檢的互動式規劃器（需要 TTY）。
- `apply`：執行儲存的計畫（`--dry-run` 僅用於驗證），然後清除目標純文字殘留。

建議的操作員循環：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

CI/閘道的退出代碼注意事項：

- 當發現問題時，`audit --check` 會傳回 `1`。
- 未解析的參照會傳回 `2`。

相關：

- 機密指南：[機密管理](/zh-Hant/gateway/secrets)
- 憑證表面：[SecretRef 憑證表面](/zh-Hant/reference/secretref-credential-surface)
- 安全性指南：[安全性](/zh-Hant/gateway/security)

## 重新載入運行時快照

重新解析機密參照並原子性地交換運行時快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
```

注意事項：

- 使用閘道 RPC 方法 `secrets.reload`。
- 如果解析失敗，閘道會保持最後已知良好的快照並傳回錯誤（無部分啟動）。
- JSON 回應包含 `warningCount`。

## 稽核

掃描 OpenClaw 狀態以尋找：

- 純文字機密儲存
- 未解析參照
- 優先順序漂移（`auth-profiles.json` 憑證遮蔽 `openclaw.json` 參照）
- 生成的 `agents/*/agent/models.json` 殘留（提供者 `apiKey` 值和敏感的提供者標頭）
- 舊殘留（舊授權儲存項目，OAuth 提醒）

標頭殘留注意事項：

- 敏感提供者標頭偵測是基於名稱啟發式的（常見的身份驗證/憑證標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
```

退出行為：

- 當發現問題時，`--check` 會以非零代碼退出。
- 未解析的參照會以更高優先級的非零代碼退出。

報告結構重點：

- `status`：`clean | findings | unresolved`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 發現代碼：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 配置（互動式輔助工具）

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

- 首先進行提供者設定（`add/edit/remove` 用於 `secrets.providers` 別名）。
- 其次是憑證對應（選擇欄位並指派 `{source, provider, id}` 參照）。
- 最後進行預檢和選擇性套用。

旗標：

- `--providers-only`：僅配置 `secrets.providers`，跳過憑證對應。
- `--skip-provider-setup`：跳過提供者設定，並將憑證對應到現有提供者。
- `--agent <id>`：將 `auth-profiles.json` 目標探索和寫入範圍限制在單一代理程式存放區。

備註：

- 需要互動式 TTY。
- 您不能結合 `--providers-only` 與 `--skip-provider-setup`。
- `configure` 以 `openclaw.json` 中的承載秘密欄位以及所選代理程式範圍的 `auth-profiles.json` 為目標。
- `configure` 支援直接在選擇器流程中建立新的 `auth-profiles.json` 對應。
- 正式支援的介面：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。
- 它會在套用前執行預檢解析。
- 生成的計劃預設為清理選項（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 均已啟用）。
- 對於已清理的純文字值，套用路徑是單向的。
- 若沒有 `--apply`，CLI 仍會在預檢後提示 `Apply this plan now?`。
- 若有 `--apply`（且沒有 `--yes`），CLI 會提示額外的不可逆確認。

Exec 提供者安全注意事項：

- Homebrew 安裝通常會在 `/opt/homebrew/bin/*` 下公開符號連結的二元檔。
- 僅在信任的套件管理器路徑需要時設定 `allowSymlinkCommand: true`，並將其與 `trustedDirs` 搭配使用（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果提供者路徑無法進行 ACL 驗證，OpenClaw 將會失敗封閉。僅對信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全檢查。

## 套用已儲存的計劃

套用或預檢先前產生的計劃：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

計劃合約細節（允許的目標路徑、驗證規則和失敗語意）：

- [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)

`apply` 可能會更新的內容：

- `openclaw.json`（SecretRef 目標 + 提供者的新增/刪除）
- `auth-profiles.json`（提供者目標清理）
- 舊版 `auth.json` 殘留
- `~/.openclaw/.env` 已遷移值的已知金鑰

## 為何沒有回滾備份

`secrets apply` 故意不寫入包含舊純文字值的回滾備份。

安全性來自嚴格的預檢 + 準原子的套用，並在失敗時盡力在記憶體中還原。

## 範例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍回報純文字發現，請更新其餘回報的目標路徑並重新執行稽核。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
