---
summary: "`openclaw secrets` 的 CLI 参考（reload、audit、configure、apply）"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secrets"
---

# `openclaw secrets`

使用 `openclaw secrets` 管理 SecretRefs 并保持当前运行时快照健康。

命令角色：

- `reload`：网关 RPC（`secrets.reload`），仅在完全成功时重新解析引用并交换运行时快照（不写入配置）。
- `audit`: 对 configuration/auth/generated-模型 存储和遗留残留进行只读扫描，检查明文、未解析的引用和优先级漂移（除非设置了 `--allow-exec`，否则将跳过 exec 引用）。
- `configure`: 用于提供商设置、目标映射和预检的交互式计划器（需要 TTY）。
- `apply`: 执行保存的计划（`--dry-run` 仅用于验证；默认情况下，dry-run 跳过 exec 检查，写入模式会拒绝包含 exec 的计划，除非设置了 `--allow-exec`），然后清除目标明文残留。

建议的操作员循环：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果您的计划包含 `exec` SecretRefs/提供商，请在 dry-run 和写入应用命令上传递 `--allow-exec`。

CI/网关的退出代码说明：

- `audit --check` 在发现问题时返回 `1`。
- 未解析的引用返回 `2`。

相关内容：

- 密钥指南：[密钥管理](/zh/gateway/secrets)
- 凭证范围：[SecretRef 凭证范围](/zh/reference/secretref-credential-surface)
- 安全指南：[安全](/zh/gateway/security)

## 重新加载运行时快照

重新解析密钥引用并原子交换运行时快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
```

说明：

- 使用网关 RPC 方法 `secrets.reload`。
- 如果解析失败，网关将保留最后已知良好的快照并返回错误（无部分激活）。
- JSON 响应包含 `warningCount`。

## 审计

扫描 OpenClaw 状态以查找：

- 明文密钥存储
- 未解析的引用
- 优先级漂移（`auth-profiles.json` 凭证覆盖 `openclaw.json` 引用）
- 生成的 `agents/*/agent/models.json` 残留（提供商 `apiKey` 值和敏感的提供商标头）
- 遗留残留（遗留身份验证存储条目、OAuth 提醒）

标头残留说明：

- 敏感提供商标头检测是基于名称启发式的（常见的认证/凭据标头名称和片段，如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

退出行为：

- 如果发现结果，`--check` 将以非零代码退出。
- 未解析的引用将以更高优先级的非零代码退出。

报告结构亮点：

- `status`：`clean | findings | unresolved`
- `resolution`：`refsChecked`、`skippedExecRefs`、`resolvabilityComplete`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 发现代码：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 配置（交互式助手）

以交互方式构建提供商和 SecretRef 更改，运行预检，并可选择应用：

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

- 首先进行提供商设置（`add/edit/remove` 用于 `secrets.providers` 别名）。
- 其次进行凭据映射（选择字段并分配 `{source, provider, id}` 引用）。
- 最后进行预检和可选应用。

标志：

- `--providers-only`：仅配置 `secrets.providers`，跳过凭据映射。
- `--skip-provider-setup`：跳过提供商设置并将凭据映射到现有提供商。
- `--agent <id>`：将 `auth-profiles.json` 目标发现和写入范围限定为一个代理存储。
- `--allow-exec`：在预检/应用期间允许 exec SecretRef 检查（可能会执行提供商命令）。

注意：

- 需要交互式 TTY。
- 您不能将 `--providers-only` 与 `--skip-provider-setup` 结合使用。
- `configure` 针对 `openclaw.json` 中承载机密的字段以及所选代理范围的 `auth-profiles.json`。
- `configure` 支持在选择器流程中直接创建新的 `auth-profiles.json` 映射。
- 规范支持范围：[SecretRef Credential Surface](/zh/reference/secretref-credential-surface)。
- 它在应用之前执行预检解析。
- 如果预检/应用包含 exec 引用，请保持这两个步骤都设置 `--allow-exec`。
- 生成的计划默认使用清理选项（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 均已启用）。
- 对于已清理的明文值，应用路径是单向的。
- 如果没有 `--apply`，CLI 仍会在预检后提示 `Apply this plan now?`。
- 使用 `--apply`（且没有 `--yes`）时，CLI 会提示进行额外的不可逆确认。

Exec 提供商安全说明：

- Homebrew 安装通常会在 `/opt/homebrew/bin/*` 下公开符号链接二进制文件。
- 仅当受信任的包管理器路径需要时才设置 `allowSymlinkCommand: true`，并将其与 `trustedDirs` 配对（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果提供商路径无法进行 ACL 验证，OpenClaw 将以失败关闭。仅对于受信任的路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

## 应用保存的计划

应用或预检之前生成的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Exec 行为：

- `--dry-run` 在不写入文件的情况下验证预检。
- 在试运行中，默认跳过 exec SecretRef 检查。
- 写入模式会拒绝包含 exec SecretRefs/提供商的计划，除非设置了 `--allow-exec`。
- 使用 `--allow-exec` 以在任一模式下选择加入 exec 提供商检查/执行。

计划合约详细信息（允许的目标路径、验证规则和失败语义）：

- [Secrets Apply Plan Contract](/zh/gateway/secrets-plan-contract)

`apply` 可能更新的内容：

- `openclaw.json`（SecretRef 目标 + 提供商插入/删除）
- `auth-profiles.json`（提供商目标清理）
- 旧版 `auth.json` 残留
- `~/.openclaw/.env` 已迁移值的已知密钥

## 为什么没有回滚备份

`secrets apply` 故意不写入包含旧明文值的回滚备份。

安全性来自于严格的预检 + 尽可能原子的应用，以及在失败时尽力恢复内存中的状态。

## 示例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍然报告明文发现，请更新剩余报告的目标路径并重新运行审计。
