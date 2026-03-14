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
- `audit`：对配置/身份验证/生成模型存储和遗留残留进行只读扫描，查找明文、未解析引用和优先级漂移。
- `configure`：用于提供程序设置、目标映射和预检的交互式规划器（需要 TTY）。
- `apply`：执行保存的计划（`--dry-run` 仅用于验证），然后清除目标明文残留。

建议的操作员循环：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

CI/闸门的退出代码说明：

- 发现问题时 `audit --check` 返回 `1`。
- 未解析的引用返回 `2`。

相关：

- Secrets 指南：[Secrets 管理](/zh/en/gateway/secrets)
- 凭据范围：[SecretRef 凭据范围](/zh/en/reference/secretref-credential-surface)
- 安全指南：[安全](/zh/en/gateway/security)

## 重新加载运行时快照

重新解析密钥引用并原子化交换运行时快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
```

说明：

- 使用网关 RPC 方法 `secrets.reload`。
- 如果解析失败，网关将保留上次已知的良好快照并返回错误（无部分激活）。
- JSON 响应包括 `warningCount`。

## 审计

扫描 OpenClaw 状态以查找：

- 纯文本密钥存储
- 未解析的引用
- 优先级漂移（`auth-profiles.json` 凭据遮蔽 `openclaw.json` 引用）
- 生成的 `agents/*/agent/models.json` 残留（提供程序 `apiKey` 值和敏感提供程序标头）
- 遗留残留项（遗留身份验证存储条目、OAuth 提醒）

标头残留项说明：

- 敏感提供程序标头检测基于名称启发式方法（常见的身份验证/凭据标头名称和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
```

退出行为：

- 发现问题时 `--check` 退出并返回非零状态。
- 未解析的引用以更高优先级的非零代码退出。

报告形状亮点：

- `status`：`clean | findings | unresolved`
- `summary`: `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- 发现代码：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 配置（交互式助手）

以交互方式构建提供者和 SecretRef 更改，运行预检，并可选择应用：

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

- 首先设置提供商（`add/edit/remove` 用于 `secrets.providers` 别名）。
- 其次进行凭证映射（选择字段并分配 `{source, provider, id}` 引用）。
- 最后是预检和可选应用。

标志：

- `--providers-only`：仅配置 `secrets.providers`，跳过凭证映射。
- `--skip-provider-setup`：跳过提供商设置，并将凭证映射到现有提供商。
- `--agent <id>`：将 `auth-profiles.json` 目标发现和写入范围限定为一个代理存储。

注意：

- 需要一个交互式 TTY。
- 您不能将 `--providers-only` 与 `--skip-provider-setup` 结合使用。
- `configure` 针对 `openclaw.json` 中包含机密的字段以及所选代理范围的 `auth-profiles.json`。
- `configure` 支持在选择器流程中直接创建新的 `auth-profiles.json` 映射。
- 规范支持表面：[SecretRef Credential Surface](/zh/en/reference/secretref-credential-surface)。
- 它在应用之前执行预检解析。
- 生成的计划默认启用清理选项（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 均已启用）。
- 应用路径对于已清理的明文值是单向的。
- 如果没有 `--apply`，CLI 仍会在预检后提示 `Apply this plan now?`。
- 使用 `--apply`（且没有 `--yes`）时，CLI 会提示额外的不可逆确认。

Exec 提供程序安全提示：

- Homebrew 安装通常在 `/opt/homebrew/bin/*` 下暴露符号链接的二进制文件。
- 仅当受信任的包管理器路径需要时才设置 `allowSymlinkCommand: true`，并将其与 `trustedDirs` 配对（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果提供程序路径的 ACL 验证不可用，OpenClaw 将以失败关闭。仅对于受信任的路径，在该提供程序上设置 `allowInsecurePath: true` 以绕过路径安全检查。

## 应用已保存的计划

应用或预检先前生成的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

计划合约详情（允许的目标路径、验证规则和失败语义）：

- [Secrets 应用计划合约](/zh/en/gateway/secrets-plan-contract)

`apply` 可能会更新：

- `openclaw.json` （SecretRef 目标 + 提供程序插入/删除）
- `auth-profiles.json` （提供程序目标清理）
- 旧版 `auth.json` 残留
- `~/.openclaw/.env` 已迁移值的已知密钥

## 为何没有回滚备份

`secrets apply` 故意不写入包含旧明文值的回滚备份。

安全性来自于严格的预检 + 类原子的应用，并在失败时尽力进行内存中恢复。

## 示例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍然报告明文发现，请更新剩余的报告目标路径并重新运行审计。

import zh from '/components/footer/zh.mdx';

<zh />
