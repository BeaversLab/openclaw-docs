---
summary: "OpenClaw 如何就地升级以前的 Matrix 插件，包括加密状态恢复限制和手动恢复步骤。"
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Matrix 迁移"
---

本页面介绍从以前公开的 `matrix` 插件升级到当前实现的过程。

对于大多数用户，升级是就地进行的：

- 插件保持 `@openclaw/matrix`
- 渠道保持 `matrix`
- 您的配置仍保留在 `channels.matrix` 下
- 缓存的凭据仍保留在 `~/.openclaw/credentials/matrix/` 下
- 运行时状态仍保留在 `~/.openclaw/matrix/` 下

您无需重命名配置键，也无需以新名称重新安装插件。

## 迁移自动执行的操作

当网关启动以及您运行 [`openclaw doctor --fix`](/zh/gateway/doctor) 时，OpenClaw 会尝试自动修复旧的 Matrix 状态。
在任何可执行的 Matrix 迁移步骤改变磁盘状态之前，OpenClaw 会创建或重用专用的恢复快照。

当您使用 `openclaw update` 时，确切的触发方式取决于 OpenClaw 的安装方式：

- 源码安装会在更新流程中运行 `openclaw doctor --fix`，然后默认重启网关
- 包管理器安装会更新软件包，运行非交互式的检查，然后依赖默认的网关重启，以便启动过程完成 Matrix 迁移
- 如果您使用 `openclaw update --no-restart`，由启动支持的 Matrix 迁移将被推迟，直到您稍后运行 `openclaw doctor --fix` 并重启网关

自动迁移包括：

- 在 `~/Backups/openclaw-migrations/` 下创建或重用迁移前的快照
- 重用您缓存的 Matrix 凭据
- 保持相同的帐户选择和 `channels.matrix` 配置
- 将最旧的扁平 Matrix 同步存储移动到当前帐户作用域的位置
- 当目标帐户可以安全解析时，将最旧的 Matrix 加密存储移动到当前帐户作用域的位置
- 从旧的 rust 加密存储中提取之前保存的 Matrix 房间密钥备份解密密钥（当该密钥存在于本地时）
- 当访问令牌稍后更改时，针对同一个 Matrix 账户、主服务器和用户重用最完整的现有令牌哈希存储根
- 当 Matrix 访问令牌已更改但账户/设备身份保持不变时，扫描同级令牌哈希存储根以查找待处理的加密状态恢复元数据
- 在下次 Matrix 启动时，将备份的房间密钥恢复到新的加密存储中

快照详细信息：

- OpenClaw 在成功快照后于 `~/.openclaw/matrix/migration-snapshot.json` 写入一个标记文件，以便后续的启动和修复过程可以重用同一归档。
- 这些自动 Matrix 迁移快照仅备份配置 + 状态 (`includeWorkspace: false`)。
- 如果 Matrix 只有仅警告的迁移状态，例如因为 `userId` 或 `accessToken` 仍然缺失，则 OpenClaw 尚不会创建快照，因为没有 Matrix 突变是可操作的。
- 如果快照步骤失败，OpenClaw 将跳过该运行的 Matrix 迁移，而不是在没有恢复点的情况下改变状态。

关于多账户升级：

- 最旧的扁平 Matrix 存储 (`~/.openclaw/matrix/bot-storage.json` 和 `~/.openclaw/matrix/crypto/`) 来自单一存储布局，因此 OpenClaw 只能将其迁移到一个已解析的 Matrix 账户目标
- 已检测到具有账户作用域的旧版 Matrix 存储并根据每个已配置的 Matrix 账户进行准备

## 迁移无法自动完成的工作

之前的公共 Matrix 插件并**不**会自动创建 Matrix 房间密钥备份。它会持久化本地加密状态并请求设备验证，但并不保证您的房间密钥已备份到主服务器。

这意味着某些加密安装只能部分迁移。

OpenClaw 无法自动恢复：

- 从未备份过的仅本地房间密钥
- 当目标 Matrix 账户尚无法解析，因为 `homeserver`、`userId` 或 `accessToken` 仍然不可用时的加密状态
- 当配置了多个 Matrix 账户但未设置 `channels.matrix.defaultAccount` 时，对一个共享的扁平 Matrix 存储进行的自动迁移
- 固定到仓库路径而不是标准 Matrix 包的自定义插件路径安装
- 旧存储区有备份密钥但在本地未保留解密密钥时，缺少恢复密钥

当前警告范围：

- 自定义 Matrix 插件路径安装会在网关启动和 `openclaw doctor` 时显示

如果您的旧安装拥有从未备份过的仅本地加密历史记录，升级后某些较旧的加密消息可能仍然无法阅读。

## 推荐的升级流程

1. 正常更新 OpenClaw 和 Matrix 插件。
   最好使用不带 `--no-restart` 的纯 `openclaw update`，以便启动时可以立即完成 Matrix 迁移。
2. 运行：

   ```bash
   openclaw doctor --fix
   ```

   如果 Matrix 有可执行的迁移工作，doctor 将首先创建或重用预迁移快照并打印存档路径。

3. 启动或重启网关。
4. 检查当前的验证和备份状态：

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. 将您正在修复的 Matrix 帐户的恢复密钥放入特定于帐户的环境变量中。对于单个默认帐户，`MATRIX_RECOVERY_KEY` 即可。对于多个帐户，请为每个帐户使用一个变量，例如 `MATRIX_RECOVERY_KEY_ASSISTANT`，并将 `--account assistant` 添加到命令中。

6. 如果 OpenClaw 告诉您需要恢复密钥，请为匹配的帐户运行该命令：

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify backup restore --recovery-key-stdin --account assistant
   ```

7. 如果此设备仍未验证，请为匹配的帐户运行该命令：

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify device --recovery-key-stdin --account assistant
   ```

   如果恢复密钥被接受且备份可用，但 `Cross-signing verified`
   仍然是 `no`，请从另一个 Matrix 客户端完成自我验证：

   ```bash
   openclaw matrix verify self
   ```

   在另一个 Matrix 客户端中接受请求，比较表情符号或数字，
   并仅在它们匹配时输入 `yes`。该命令仅在 `Cross-signing verified` 变为 `yes` 后才会成功退出。

8. 如果您有意放弃不可恢复的旧历史记录，并希望为未来的消息建立新的备份基线，请运行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

9. 如果尚不存在服务器端密钥备份，请为将来的恢复创建一个：

   ```bash
   openclaw matrix verify bootstrap
   ```

## 加密迁移的工作原理

加密迁移是一个两阶段过程：

1. 如果加密迁移是可执行的，启动或 `openclaw doctor --fix` 会创建或重用预迁移快照。
2. 启动或 `openclaw doctor --fix` 通过活动的 Matrix 插件安装检查旧的 Matrix 加密存储。
3. 如果找到备份解密密钥，OpenClaw 会将其写入新的恢复密钥流程，并将房间密钥恢复标记为待处理。
4. 在下一次 Matrix 启动时，OpenClaw 会自动将备份的房间密钥恢复到新的加密存储中。

如果旧存储报告了从未备份过的房间密钥，OpenClaw 会发出警告，而不是假装恢复成功。

## 常见消息及其含义

### 升级和检测消息

`Matrix plugin upgraded in place.`

- 含义：检测到旧的磁盘上的 Matrix 状态，并将其迁移到了当前布局中。
- 操作：除非同一输出中还包含警告，否则无需任何操作。

`Matrix migration snapshot created before applying Matrix upgrades.`

- 含义：OpenClaw 在修改 Matrix 状态之前创建了一个恢复归档。
- 操作：保留打印的归档路径，直到确认迁移成功。

`Matrix migration snapshot reused before applying Matrix upgrades.`

- 含义：OpenClaw 发现了现有的 Matrix 迁移快照标记，并重复使用了该归档，而不是创建重复的备份。
- 操作：保留打印的归档路径，直到确认迁移成功。

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- 含义：旧的 Matrix 状态存在，但 OpenClaw 无法将其映射到当前的 Matrix 账户，因为 Matrix 未配置。
- 操作：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：OpenClaw 发现了旧状态，但仍无法确定确切的当前账户/设备根目录。
- 操作：使用有效的 Matrix 登录启动一次网关，或者在存在缓存的凭据后重新运行 `openclaw doctor --fix`。

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 发现了一个共享的扁平 Matrix 存储，但它拒绝猜测哪个命名的 Matrix 账户应该接收它。
- 操作：将 `channels.matrix.defaultAccount` 设置为目标账户，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix legacy sync store not migrated because the target already exists (...)`

- 含义：新的账户范围位置已经具有同步或加密存储，因此 OpenClaw 没有自动覆盖它。
- 操作：在手动删除或移动冲突的目标之前，请验证当前账户是否正确。

`Failed migrating Matrix legacy sync store (...)` 或 `Failed migrating Matrix legacy crypto store (...)`

- 含义：OpenClaw 尝试移动旧的 Matrix 状态，但文件系统操作失败。
- 操作：检查文件系统权限和磁盘状态，然后重新运行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- 含义：OpenClaw 发现了一个旧的加密 Matrix 存储区，但没有当前的 Matrix 配置可以将其附加到其中。
- 操作：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：加密存储区存在，但 OpenClaw 无法安全地判断它属于哪个当前账户/设备。
- 操作：使用有效的 Matrix 登录凭据启动网关一次，或者在缓存凭据可用后重新运行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 发现了一个共享的平面旧版加密存储区，但它拒绝猜测应该将其分配给哪个命名的 Matrix 账户。
- 操作：将 `channels.matrix.defaultAccount` 设置为预期的账户，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- 含义：OpenClaw 检测到旧的 Matrix 状态，但迁移仍因缺少身份或凭据数据而被阻止。
- 操作：完成 Matrix 登录或配置设置，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- 含义：OpenClaw 发现了旧的加密 Matrix 状态，但无法从通常检查该存储区的 Matrix 插件中加载辅助入口点。
- 操作：重新安装或修复 Matrix 插件（`openclaw plugins install @openclaw/matrix`，或对于代码仓库检出使用 `openclaw plugins install ./path/to/local/matrix-plugin`），然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- 含义：OpenClaw 发现了一个超出插件根目录或未通过插件边界检查的辅助文件路径，因此拒绝导入它。
- 操作：从受信任的路径重新安装 Matrix 插件，然后重新运行 `openclaw doctor --fix` 或重启网关。

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- 含义：OpenClaw 拒绝更改 Matrix 状态，因为它无法先创建恢复快照。
- 操作：解决备份错误，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Failed migrating legacy Matrix client storage: ...`

- 含义：Matrix 客户端回退机制发现了旧的 flat 存储，但移动失败。OpenClaw 现在会中止该回退，而不是默默启动一个新的存储。
- 操作：检查文件系统权限或冲突，保持旧状态完整，并在修复错误后重试。

`Matrix is installed from a custom path: ...`

- 含义：Matrix 被固定为路径安装，因此主线更新不会自动将其替换为仓库中的标准 Matrix 包。
- 操作：当您想恢复默认的 Matrix 插件时，请使用 `openclaw plugins install @openclaw/matrix` 重新安装。

### 加密状态恢复消息

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- 含义：备份的房间密钥已成功恢复到新的加密存储中。
- 操作：通常无需操作。

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- 含义：一些旧的房间密钥仅存在于旧的本地存储中，且从未上传到 Matrix 备份。
- 操作：除非您可以从另一个经过验证的客户端手动恢复这些密钥，否则请预料部分旧的加密历史记录将无法使用。

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key-stdin" after upgrade if they have the recovery key.`

- 含义：备份存在，但 OpenClaw 无法自动恢复恢复密钥。
- 操作：运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`。

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- 含义：OpenClaw 找到了旧的加密存储，但无法安全地检查它以准备恢复。
- 操作：重新运行 `openclaw doctor --fix`。如果重复出现，请保持旧状态目录完整，并使用另一个经过验证的 Matrix 客户端以及 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` 进行恢复。

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- 含义：OpenClaw 检测到备份密钥冲突，并拒绝自动覆盖当前的恢复密钥文件。
- 操作：在重试任何恢复命令之前，请验证哪个恢复密钥是正确的。

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- 含义：这是旧存储格式的硬性限制。
- 操作：备份的密钥仍然可以恢复，但仅限本地的加密历史记录可能无法使用。

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- 含义：新插件尝试恢复，但 Matrix 返回了错误。
- 如何处理：运行 `openclaw matrix verify backup status`，如有需要，请使用 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` 重试。

### 手动恢复消息

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- 含义：OpenClaw 知道您应该有备份密钥，但它在此设备上未激活。
- 如何处理：运行 `openclaw matrix verify backup restore`，或设置 `MATRIX_RECOVERY_KEY` 并在需要时运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`。

`Store a recovery key with 'openclaw matrix verify device --recovery-key-stdin', then run 'openclaw matrix verify backup restore'.`

- 含义：此设备当前未存储恢复密钥。
- 如何处理：设置 `MATRIX_RECOVERY_KEY`，运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`，然后恢复备份。

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin' with the matching recovery key.`

- 含义：存储的密钥与活动的 Matrix 备份不匹配。
- 如何处理：将 `MATRIX_RECOVERY_KEY` 设置为正确的密钥并运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

如果您接受丢失不可恢复的旧加密历史记录，可以改用 `openclaw matrix verify backup reset --yes` 重置当前备份基线。当存储的备份密钥损坏时，该重置操作可能还会重新创建密钥存储，以便重启后能正确加载新的备份密钥。

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin'.`

- 含义：备份存在，但此设备尚未充分信任交叉签名链。
- 如何处理：设置 `MATRIX_RECOVERY_KEY` 并运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

`Matrix recovery key is required`

- 含义：您尝试了恢复步骤，但在需要时未提供恢复密钥。
- 如何处理：使用 `--recovery-key-stdin` 重新运行命令，例如 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

`Invalid Matrix recovery key: ...`

- 含义：提供的密钥无法解析或与预期格式不匹配。
- 如何处理：使用您的 Matrix 客户端或恢复密钥文件中的确切恢复密钥重试。

`Matrix recovery key was applied, but this device still lacks full Matrix identity trust.`

- 含义：OpenClaw 可以应用恢复密钥，但 Matrix 尚未为此设备建立完整的交叉签名身份信任。请检查命令输出中的 `Recovery key accepted`、`Backup usable`、`Cross-signing verified` 和 `Device verified by owner`。
- 操作方法：运行 `openclaw matrix verify self`，在另一个 Matrix 客户端中接受该请求，比较 SAS，仅当匹配时输入 `yes`。该命令在报告成功之前会等待完全的 Matrix 身份信任。仅当您有意要替换当前的交叉签名身份时，才使用 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify bootstrap --recovery-key-stdin --force-reset-cross-signing`。

`Matrix key backup is not active on this device after loading from secret storage.`

- 含义：秘密存储在此设备上未产生活动的备份会话。
- 操作方法：首先验证设备，然后使用 `openclaw matrix verify backup status` 重新检查。

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device --recovery-key-stdin' first.`

- 含义：在设备验证完成之前，此设备无法从秘密存储恢复。
- 操作方法：首先运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

### 自定义插件安装消息

`Matrix is installed from a custom path that no longer exists: ...`

- 含义：您的插件安装记录指向一个已不存在的本地路径。
- 操作方法：使用 `openclaw plugins install @openclaw/matrix` 重新安装，或者如果您是从仓库检出运行的，请使用 `openclaw plugins install ./path/to/local/matrix-plugin`。

## 如果加密历史记录仍然没有恢复

按顺序运行这些检查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin --verbose
```

如果备份成功恢复，但某些旧房间仍然缺少历史记录，则那些丢失的密钥可能从未由以前的插件备份过。

## 如果您想为未来的消息重新开始

如果您接受丢失无法恢复的旧加密历史记录，并且只希望以后有一个干净的备份基线，请按顺序运行这些命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果之后设备仍未验证，请通过比较 SAS 表情符号或十进制代码并确认它们匹配，从您的 Matrix 客户端完成验证。

## 相关页面

- [Matrix](/zh/channels/matrix)
- [Doctor](/zh/gateway/doctor)
- [迁移](/zh/install/migrating)
- [插件](/zh/tools/plugin)
