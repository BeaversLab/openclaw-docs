---
summary: "OpenClaw 如何原地升级之前的 Matrix 插件，包括加密状态恢复限制和手动恢复步骤。"
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Matrix 迁移"
---

# Matrix 迁移

本页面涵盖从先前的公共 `matrix` 插件升级到当前实现的过程。

对于大多数用户而言，升级是原地的：

- 插件保持为 `@openclaw/matrix`
- 渠道保持为 `matrix`
- 您的配置保留在 `channels.matrix` 下
- 缓存的凭据保留在 `~/.openclaw/credentials/matrix/` 下
- 运行时状态保留在 `~/.openclaw/matrix/` 下

您无需重命名配置键或以新名称重新安装插件。

## 迁移自动执行的操作

当网关启动，以及当您运行 [`openclaw doctor --fix`](/en/gateway/doctor) 时，OpenClaw 会尝试自动修复旧的 Matrix 状态。
在任何可执行的 Matrix 迁移步骤改变磁盘上的状态之前，OpenClaw 会创建或复用一个专门的恢复快照。

当您使用 `openclaw update` 时，确切的触发时机取决于 OpenClaw 的安装方式：

- 源码安装会在更新流程中运行 `openclaw doctor --fix`，然后默认重启网关
- 包管理器安装会更新软件包，运行一次非交互式的 doctor 检查，然后依赖默认的网关重启，以便启动过程可以完成 Matrix 迁移
- 如果您使用 `openclaw update --no-restart`，由启动支持的 Matrix 迁移将被推迟，直到您稍后运行 `openclaw doctor --fix` 并重启网关

自动迁移包括：

- 在 `~/Backups/openclaw-migrations/` 下创建或复用迁移前快照
- 复用您缓存的 Matrix 凭据
- 保持相同的帐户选择和 `channels.matrix` 配置
- 将最旧的扁平 Matrix 同步存储移动到当前帐户范围内的位置
- 当可以安全解析目标帐户时，将最旧的 Matrix 加密存储移动到当前帐户范围内的位置
- 从旧的 rust 加密存储中提取先前保存的 Matrix 房间密钥备份解密密钥（当该密钥存在于本地时）
- 当访问令牌稍后更改时，为同一 Matrix 账户、主服务器和用户重用最完整的现有令牌哈希存储根
- 当 Matrix 访问令牌更改但账户/设备身份保持不变时，扫描同级令牌哈希存储根以查找待处理的加密状态恢复元数据
- 在下次 Matrix 启动时，将备份的房间密钥恢复到新的加密存储中

快照详情：

- OpenClaw 在成功快照后在 `~/.openclaw/matrix/migration-snapshot.json` 写入一个标记文件，以便后续的启动和修复过程可以重用同一归档。
- 这些自动 Matrix 迁移快照仅备份配置和状态 (`includeWorkspace: false`)。
- 如果 Matrix 只有警告级别的迁移状态，例如因为 `userId` 或 `accessToken` 仍然缺失，OpenClaw 还不会创建快照，因为没有 Matrix 突变是可操作的。
- 如果快照步骤失败，OpenClaw 将跳过该次运行的 Matrix 迁移，而不是在没有恢复点的情况下更改状态。

关于多账户升级：

- 最旧的扁平 Matrix 存储 (`~/.openclaw/matrix/bot-storage.json` 和 `~/.openclaw/matrix/crypto/`) 来自单一存储布局，因此 OpenClaw 只能将其迁移到一个已解析的 Matrix 账户目标
- 已经具有账户作用域的旧版 Matrix 存储会被检测到，并按照配置的 Matrix 账户进行准备

## 迁移无法自动执行的操作

之前的公共 Matrix 插件**没有**自动创建 Matrix 房间密钥备份。它保留了本地加密状态并请求了设备验证，但并不保证您的房间密钥已备份到主服务器。

这意味着某些加密安装只能部分迁移。

OpenClaw 无法自动恢复：

- 从未备份过的仅本地房间密钥
- 当目标 Matrix 账户尚无法解析时，因为 `homeserver`、`userId` 或 `accessToken` 仍然不可用，导致的加密状态
- 当配置了多个 Matrix 账户但未设置 `channels.matrix.defaultAccount` 时，自动迁移一个共享的扁平 Matrix 存储
- 固定到仓库路径而不是标准 Matrix 包的自定义插件路径安装
- 当旧存储区有备份密钥但未在本地保留解密密钥时，缺少恢复密钥

当前警告范围：

- 自定义 Matrix 插件路径安装会在网关启动和 `openclaw doctor` 时显示

如果您的旧安装有从未备份的仅本地加密历史记录，升级后某些较旧的加密消息可能仍然无法读取。

## 推荐的升级流程

1. 正常更新 OpenClaw 和 Matrix 插件。
   最好使用不带 `--no-restart` 的普通 `openclaw update`，以便启动可以立即完成 Matrix 迁移。
2. 运行：

   ```bash
   openclaw doctor --fix
   ```

   如果 Matrix 有可执行的迁移工作，doctor 将首先创建或重用迁移前快照并打印归档路径。

3. 启动或重启网关。
4. 检查当前的验证和备份状态：

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. 如果 OpenClaw 提示您需要恢复密钥，请运行：

   ```bash
   openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"
   ```

6. 如果此设备仍未验证，请运行：

   ```bash
   openclaw matrix verify device "<your-recovery-key>"
   ```

7. 如果您有意放弃不可恢复的旧历史记录，并希望为未来的消息建立新的备份基线，请运行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

8. 如果尚不存在服务器端密钥备份，请为将来的恢复创建一个：

   ```bash
   openclaw matrix verify bootstrap
   ```

## 加密迁移如何工作

加密迁移是一个两阶段过程：

1. 如果加密迁移是可执行的，启动或 `openclaw doctor --fix` 将创建或重用迁移前快照。
2. 启动或 `openclaw doctor --fix` 通过活动的 Matrix 插件安装检查旧的 Matrix 加密存储。
3. 如果找到备份解密密钥，OpenClaw 会将其写入新的恢复密钥流程，并将房间密钥恢复标记为待处理。
4. 在下次 Matrix 启动时，OpenClaw 会自动将备份的房间密钥恢复到新的加密存储中。

如果旧存储报告有从未备份的房间密钥，OpenClaw 会发出警告，而不是假装恢复成功。

## 常见消息及其含义

### 升级和检测消息

`Matrix plugin upgraded in place.`

- 含义：检测到旧的磁盘上 Matrix 状态并将其迁移到当前布局。
- 操作：除非相同的输出中还包含警告，否则无需任何操作。

`Matrix migration snapshot created before applying Matrix upgrades.`

- 含义：OpenClaw 在更改 Matrix 状态之前创建了恢复归档。
- 操作：保留打印的归档路径，直到确认迁移成功。

`Matrix migration snapshot reused before applying Matrix upgrades.`

- 含义：OpenClaw 发现了现有的 Matrix 迁移快照标记，并重复使用了该存档，而不是创建重复的备份。
- 如何处理：在确认迁移成功之前，请保留打印的存档路径。

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- 含义：存在旧的 Matrix 状态，但 OpenClaw 无法将其映射到当前的 Matrix 帐户，因为 Matrix 未配置。
- 如何处理：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：OpenClaw 发现了旧状态，但仍无法确定确切的当前帐户/设备根目录。
- 如何处理：使用有效的 Matrix 登录凭据启动一次网关，或在存在缓存的凭据后重新运行 `openclaw doctor --fix`。

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 发现了一个共享的扁平 Matrix 存储，但它拒绝猜测哪个命名的 Matrix 帐户应该接收它。
- 如何处理：将 `channels.matrix.defaultAccount` 设置为目标帐户，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix legacy sync store not migrated because the target already exists (...)`

- 含义：新的帐户作用域位置已经具有同步或加密存储，因此 OpenClaw 没有自动覆盖它。
- 如何处理：在手动删除或移动冲突的目标之前，请验证当前帐户是否正确。

`Failed migrating Matrix legacy sync store (...)` 或 `Failed migrating Matrix legacy crypto store (...)`

- 含义：OpenClaw 尝试移动旧的 Matrix 状态，但文件系统操作失败。
- 如何处理：检查文件系统权限和磁盘状态，然后重新运行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- 含义：OpenClaw 发现了一个旧的加密 Matrix 存储，但没有当前的 Matrix 配置可供附加。
- 如何处理：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：加密存储存在，但 OpenClaw 无法安全地确定它属于哪个当前帐户/设备。
- 如何处理：使用有效的 Matrix 登录凭据启动一次网关，或在缓存的凭据可用后重新运行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 发现一个共享的扁平旧版加密存储，但它拒绝猜测哪个命名的 Matrix 账户应该接收它。
- 操作方法：将 `channels.matrix.defaultAccount` 设置为预期的账户，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- 含义：OpenClaw 检测到旧的 Matrix 状态，但迁移仍因缺少身份或凭证数据而被阻止。
- 操作方法：完成 Matrix 登录或配置设置，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- 含义：OpenClaw 发现旧的加密 Matrix 状态，但无法从通常检查该存储的 Matrix 插件加载辅助入口点。
- 解决方法：重新安装或修复 Matrix 插件（`openclaw plugins install @openclaw/matrix`，或者如果是代码库检出版本则为 `openclaw plugins install ./path/to/local/matrix-plugin`），然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- 含义：OpenClaw 发现了一个跳出插件根目录或未通过插件边界检查的辅助文件路径，因此拒绝导入它。
- 操作方法：从受信任的路径重新安装 Matrix 插件，然后重新运行 `openclaw doctor --fix` 或重启网关。

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- 含义：OpenClaw 拒绝更改 Matrix 状态，因为它无法先创建恢复快照。
- 操作方法：解决备份错误，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Failed migrating legacy Matrix client storage: ...`

- 含义：Matrix 客户端回退机制发现了旧的扁平存储，但移动失败。OpenClaw 现在会中止该回退，而不是静默地使用全新的存储启动。
- 操作方法：检查文件系统权限或冲突，保持旧状态完好，并在修复错误后重试。

`Matrix is installed from a custom path: ...`

- 含义：Matrix 被固定到路径安装，因此主线更新不会自动将其替换为仓库中的标准 Matrix 软件包。
- 操作方法：当您想返回默认的 Matrix 插件时，请使用 `openclaw plugins install @openclaw/matrix` 重新安装。

### 加密状态恢复消息

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- 含义：备份的房间密钥已成功恢复到新的加密存储中。
- 操作：通常无需任何操作。

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- 含义：某些旧的房间密钥仅存在于旧的本地存储中，且从未上传到 Matrix 备份。
- 操作：预期某些旧的加密历史记录将无法访问，除非您可以从另一个已验证的客户端手动恢复这些密钥。

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key <key>" after upgrade if they have the recovery key.`

- 含义：备份存在，但 OpenClaw 无法自动恢复恢复密钥。
- 操作：运行 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"`。

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- 含义：OpenClaw 找到了旧的加密存储，但无法足够安全地检查它以准备恢复。
- 操作：重新运行 `openclaw doctor --fix`。如果重复出现，请保持旧的状态目录完好，并使用另一个已验证的 Matrix 客户端以及 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` 进行恢复。

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- 含义：OpenClaw 检测到备份密钥冲突，并拒绝自动覆盖当前的恢复密钥文件。
- 操作：在重试任何还原命令之前，请验证哪个恢复密钥是正确的。

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- 含义：这是旧存储格式的硬性限制。
- 操作：已备份的密钥仍然可以恢复，但仅本地的加密历史记录可能无法恢复。

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- 含义：新插件尝试了恢复，但 Matrix 返回了错误。
- 操作：运行 `openclaw matrix verify backup status`，然后如有需要，使用 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` 重试。

### 手动恢复消息

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- 含义：OpenClaw 知道您应该有备份密钥，但该设备上未激活。
- 操作：运行 `openclaw matrix verify backup restore`，或者如有需要，传递 `--recovery-key`。

`Store a recovery key with 'openclaw matrix verify device <key>', then run 'openclaw matrix verify backup restore'.`

- 含义：此设备当前未存储恢复密钥。
- 操作：首先使用您的恢复密钥验证设备，然后恢复备份。

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device <key>' with the matching recovery key.`

- 含义：存储的密钥与活动的 Matrix 备份不匹配。
- 操作：使用正确的密钥重新运行 `openclaw matrix verify device "<your-recovery-key>"`。

如果您接受丢失无法恢复的旧加密历史记录，可以改用 `openclaw matrix verify backup reset --yes` 重置当前的备份基线。当存储的备份密钥损坏时，该重置可能还会重新创建密钥存储，以便新备份密钥在重启后能够正确加载。

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device <key>'.`

- 含义：备份存在，但此设备尚不够信任交叉签名链。
- 操作方法：重新运行 `openclaw matrix verify device "<your-recovery-key>"`。

`Matrix recovery key is required`

- 含义：您尝试了恢复步骤，但在需要时未提供恢复密钥。
- 操作方法：使用您的恢复密钥重新运行该命令。

`Invalid Matrix recovery key: ...`

- 含义：提供的密钥无法解析或与预期格式不匹配。
- 操作方法：使用您的 Matrix 客户端或恢复密钥文件中的确切恢复密钥重试。

`Matrix device is still unverified after applying recovery key. Verify your recovery key and ensure cross-signing is available.`

- 含义：密钥已应用，但设备仍无法完成验证。
- 操作方法：确认您使用了正确的密钥，并且该帐户上可使用交叉签名，然后重试。

`Matrix key backup is not active on this device after loading from secret storage.`

- 含义：密钥存储未在此设备上生成活动的备份会话。
- 操作方法：先验证设备，然后使用 `openclaw matrix verify backup status` 重新检查。

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device <key>' first.`

- 含义：在完成设备验证之前，此设备无法从密钥存储恢复。
- 操作方法：先运行 `openclaw matrix verify device "<your-recovery-key>"`。

### 自定义插件安装消息

`Matrix is installed from a custom path that no longer exists: ...`

- 含义：您的插件安装记录指向一个已不存在的本地路径。
- 解决方法：使用 `openclaw plugins install @openclaw/matrix` 重新安装，或者如果您是从代码库检出版本运行的，则使用 `openclaw plugins install ./path/to/local/matrix-plugin`。

## 如果加密历史记录仍未恢复

按顺序运行以下检查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
openclaw matrix verify backup restore --recovery-key "<your-recovery-key>" --verbose
```

如果备份成功恢复，但某些旧房间仍然缺少历史记录，则这些丢失的密钥可能从未被以前的插件备份过。

## 如果您想为将来的消息重新开始

如果您接受丢失无法恢复的旧加密历史记录，并且只希望将来有一个干净的备份基线，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果之后设备仍未验证，请通过比较 SAS 表情符号或十进制代码并确认它们匹配，从您的 Matrix 客户端完成验证。

## 相关页面

- [Matrix](/en/channels/matrix)
- [Doctor](/en/gateway/doctor)
- [Migrating](/en/install/migrating)
- [Plugins](/en/tools/plugin)
