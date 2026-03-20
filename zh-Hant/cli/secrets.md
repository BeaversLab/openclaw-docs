---
summary: "`openclaw secrets` 的 CLI 參考（reload、audit、configure、apply）"
read_when:
  - 在執行時重新解析 secret refs
  - 稽核明文殘留和未解析的 refs
  - 設定 SecretRefs 並套用單向清理變更
title: "secrets"
---

# `openclaw secrets`

使用 `openclaw secrets` 來管理 SecretRefs 並保持作用中的執行時快照健全。

命令角色：

- `reload`：gateway RPC (`secrets.reload`)，會重新解析 refs 並且僅在完全成功時（無寫入設定）交換執行時快照。
- `audit`：對 configuration/auth/generated-model 存儲和舊版殘留進行唯讀掃描，以檢查明文、未解析的 refs 和優先順序漂移（除非設定了 `--allow-exec`，否則會跳過 exec refs）。
- `configure`：用於供應商設定、目標對應和飛行前檢查的互動式規劃工具（需要 TTY）。
- `apply`：執行儲存的計畫（`--dry-run` 僅用於驗證；預設情況下，試執行會跳過執行檢查，而寫入模式會拒絕包含執行的計畫，除非設定了 `--allow-exec`），然後清除目標純文字殘留。

建議的操作員循環：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果您的計畫包含 `exec` SecretRefs/供應商，請在試執行和寫入應用指令上傳遞 `--allow-exec`。

針對 CI/閘道的退出代碼說明：

- `audit --check` 在發現問題時會傳回 `1`。
- 未解析的參照會傳回 `2`。

相關連結：

- Secrets 指南：[Secrets Management](/zh-Hant/gateway/secrets)
- 憑證表面：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- 安全性指南：[Security](/zh-Hant/gateway/security)

## 重新載入運行時快照

重新解析 secret 參照並原子地交換運行時快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
```

備註：

- 使用 gateway RPC 方法 `secrets.reload`。
- 如果解析失敗，gateway 將保留最後已知良好的快照並傳回錯誤（不會部分啟用）。
- JSON 回應包含 `warningCount`。

## 稽核

掃描 OpenClaw 狀態以尋找：

- 明文 secret 儲存
- 未解析的參照
- 優先級漂移（`auth-profiles.json` 憑證遮蔽 `openclaw.json` 引用）
- 生成的 `agents/*/agent/models.json` 殘留（提供者 `apiKey` 值和敏感的提供者標頭）
- 舊版殘留（舊版認證儲存條目、OAuth 提醒）

標頭殘留說明：

- 敏感的提供者標頭偵測是基於名稱啟發式的（常見的 auth/credential 標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

退出行為：

- 當發現結果時，`--check` 會以非零代碼退出。
- 未解析的引用會以更高優先級的非零代碼退出。

報告形態重點：

- `status`：`clean | findings | unresolved`
- `resolution`：`refsChecked`、`skippedExecRefs`、`resolvabilityComplete`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 發現代碼：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 設定（互動式輔助程式）

以互動方式建置提供者和 SecretRef 變更，執行預檢，並選擇性套用：

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
- 接著進行憑證對應（選取欄位並指派 `{source, provider, id}` 引用）。
- 最後進行預檢和選擇性套用。

旗標：

- `--providers-only`：僅設定 `secrets.providers`，跳過憑證對應。
- `--skip-provider-setup`：跳過提供者設定，並將憑證對應到現有提供者。
- `--agent <id>`：將 `auth-profiles.json` 目標探索和寫入範圍限定為一個 agent store。
- `--allow-exec`：允許在預檢/套用期間執行 exec SecretRef 檢查（可能會執行提供者指令）。

說明：

- 需要互動式 TTY。
- 您不能將 `--providers-only` 與 `--skip-provider-setup` 結合使用。
- `configure` 針對 `openclaw.json` 中包含 secret 的欄位以及所選 agent 範圍的 `auth-profiles.json`。
- `configure` 支援直接在選擇器流程中建立新的 `auth-profiles.json` 對應。
- 標準支援介面：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。
- 它會在套用之前執行預檢解析。
- 如果預檢/套用包含 exec refs，請在這兩個步驟中保持設定 `--allow-exec`。
- 產生的計畫預設使用 scrub 選項（`scrubEnv`、`scrubAuthProfilesForProviderTargets` 和 `scrubLegacyAuthJson` 均已啟用）。
- 對於已清理的純文字值，套用路徑是單向的。
- 如果沒有 `--apply`，CLI 仍會在預檢後提示 `Apply this plan now?`。
- 使用 `--apply`（且沒有 `--yes`）時，CLI 會提示額外的不可逆確認。

Exec 提供者安全注意事項：

- Homebrew 安裝通常會在 `/opt/homebrew/bin/*` 下公開符號連結的二進位檔。
- 僅當信任的套件管理器路徑需要時才設定 `allowSymlinkCommand: true`，並將其與 `trustedDirs` 配對（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果提供者路徑無法進行 ACL 驗證，OpenClaw 將會失敗封閉。僅對信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全檢查。

## 套用儲存的計畫

套用或預檢先前產生的計畫：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Exec 行為：

- `--dry-run` 驗證預檢而不寫入檔案。
- 在 dry-run 中，預設會跳過 exec SecretRef 檢查。
- 寫入模式會拒絕包含 exec SecretRefs/提供者的計畫，除非設定了 `--allow-exec`。
- 使用 `--allow-exec` 以在任一模式中加入執行提供者檢查/執行。

計畫合約細節（允許的目標路徑、驗證規則和失敗語意）：

- [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)

`apply` 可能更新的內容：

- `openclaw.json` (SecretRef 目標 + 提供者 upserts/deletes)
- `auth-profiles.json` (提供者目標清理)
- 舊版 `auth.json` 殘留
- `~/.openclaw/.env` 已知已遷移值的 secret 金鑰

## 為何沒有回滾備份

`secrets apply` 故意不寫入包含舊純文字值的還原備份。

安全性來自嚴格的預檢 + 類似原子的套用，並在失敗時盡力進行記憶體內還原。

## 範例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍回報純文字發現，請更新剩餘回報的目標路徑並重新執行稽核。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
