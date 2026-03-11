---
summary: "`openclaw secrets` 的 CLI 参考（重新加载、审计、配置、应用）"
read_when:
  - "Re-resolving secret refs at runtime"
  - "Auditing plaintext residues and unresolved refs"
  - "Configuring SecretRefs and applying one-way scrub changes"
title: "secrets"
---

# `openclaw secrets`

使用 `openclaw secrets` 管理 SecretRefs 并保持活动运行时快照健康。

命令角色：

- `reload`：gateway RPC（`secrets.reload`），仅在完全成功时重新解析引用并交换运行时快照（无配置写入）。
- `audit`：对配置/身份验证/生成的模型存储和遗留残留的只读扫描，检查纯文本、未解析引用和优先级漂移。
- `configure`：提供商设置、目标映射和预检的交互式规划器（需要 TTY）。
- `apply`：执行保存的计划（`--dry-run` 仅用于验证），然后擦除目标纯文本残留。

推荐的操作员循环：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

CI/gate 的退出代码说明：

- `audit --check` 在有发现时返回 `1`。
- 未解析的引用返回 `2`。

相关：

- 密钥指南：[密钥管理](/zh/gateway/secrets)
- 凭据范围：[SecretRef 凭据范围](/zh/reference/secretref-credential-surface)
- 安全指南：[安全](/zh/gateway/security)

## 重新加载运行时快照

重新解析密钥引用并原子交换运行时快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
```

说明：

- 使用 gateway RPC 方法 `secrets.reload`。
- 如果解析失败，gateway 保持最后已知良好快照并返回错误（无部分激活）。
- JSON 响应包括 `warningCount`。

## 审计

扫描 OpenClaw 状态以查找：

- 纯文本密钥存储
- 未解析的引用
- 优先级漂移（`auth-profiles.json` 凭据遮蔽 `openclaw.json` 引用）
- 生成的 `agents/*/agent/models.json` 残留（提供商 `apiKey` 值和敏感提供商头）
- 遗留残留（遗留身份验证存储条目、OAuth 提醒）

头部残留说明：

- 敏感提供商头部检测基于名称启发式（常见的身份验证/凭据头部名称和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
```

退出行为：

- `--check` 在有发现时以非零退出。
- 未解析的引用以更高优先级的非零代码退出。

报告形状要点：

- `status`：`clean | findings | unresolved`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 发现代码：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 配置（交互式助手）

交互式构建提供商和 SecretRef 更改、运行预检，并可选地应用：

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
- `--agent <id>`：将 `auth-profiles.json` 目标发现和写入范围限制为一个代理存储。

说明：

- 需要交互式 TTY。
- 您不能将 `--providers-only` 与 `--skip-provider-setup` 组合使用。
- `configure` 针对 `openclaw.json` 中的承载密钥字段以及所选代理范围的 `auth-profiles.json`。
- `configure` 支持直接在选择器流程中创建新的 `auth-profiles.json` 映射。
- 规范支持的范围：[SecretRef 凭据范围](/zh/reference/secretref-credential-surface)。
- 它在应用之前执行预检解析。
- 生成的计划默认为擦除选项（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 全部启用）。
- 对于已擦除的纯文本值，应用路径是单向的。
- 如果没有 `--apply`，CLI 仍会在预检后提示 `Apply this plan now?`。
- 使用 `--apply`（且没有 `--yes`），CLI 提示额外的不可逆确认。

Exec 提供商安全说明：

- Homebrew 安装通常在 `/opt/homebrew/bin/*` 下暴露符号链接的二进制文件。
- 仅当受信任的包管理器路径需要时才设置 `allowSymlinkCommand: true`，并将其与 `trustedDirs` 配对（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果提供商路径的 ACL 验证不可用，OpenClaw 将失败关闭。仅对于受信任的路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

## 应用保存的计划

应用或预检之前生成的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

计划合约详情（允许的目标路径、验证规则和失败语义）：

- [密钥应用计划合约](/zh/gateway/secrets-plan-contract)

`apply` 可能更新的内容：

- `openclaw.json`（SecretRef 目标 + 提供商插入/删除）
- `auth-profiles.json`（提供商目标擦除）
- 遗留 `auth.json` 残留
- `~/.openclaw/.env` 已迁移值的已知密钥

## 为什么没有回滚备份

`secrets apply` 故意不写入包含旧纯文本值的回滚备份。

安全性来自严格的预检 + 原子式应用，失败时尽力恢复内存。

## 示例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍然报告纯文本发现，请更新剩余的报告目标路径并重新运行审计。
