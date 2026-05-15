---
summary: "迁移中心：跨系统导入、机器间迁移以及插件升级"
read_when:
  - You are moving OpenClaw to a new laptop or server
  - You are coming from another agent system and want to keep state
  - You are upgrading an in-place plugin
title: "迁移指南"
---

OpenClaw 支持三种迁移路径：从另一个 agent 系统导入、将现有安装移动到新机器以及原地升级插件。

## 从另一个 agent 系统导入

使用附带的迁移提供商将指令、MCP 服务器、技能、模型配置和（可选）API 密钥导入 API。计划在任何更改之前都会预览，报告中的敏感信息会被编辑，并且应用操作有经过验证的备份支持。

<CardGroup cols={2}>
  <Card title="从 Claude 迁移" href="/zh/install/migrating-claude" icon="brain">
    导入 Claude Code 和 Claude Desktop 的状态，包括 `CLAUDE.md`、MCP 服务器、技能和项目命令。
  </Card>
  <Card title="从 Hermes 迁移" href="/zh/install/migrating-hermes" icon="feather">
    导入 Hermes 配置、提供商、MCP 服务器、记忆、技能以及支持的 `.env` 密钥。
  </Card>
</CardGroup>

CLI 入口点是 [`openclaw migrate`](/zh/cli/migrate)。当检测到已知来源（`openclaw onboard --flow import`）时，新手引导也可以提供迁移选项。

## 将 OpenClaw 移动到新机器

复制 **状态目录**（默认为 `~/.openclaw/`）和您的 **工作区** 以保留：

- **配置** —— `openclaw.json` 以及所有网关设置。
- **身份验证** —— 每个代理的 `auth-profiles.json`（API 密钥加上 OAuth），以及 `credentials/` 下的任何渠道或提供商状态。
- **会话** — 对话历史和 agent 状态。
- **渠道状态** — WhatsApp 登录、Telegram 会话和类似内容。
- **工作区文件** —— `MEMORY.md`、`USER.md`、技能和提示词。

<Tip>
在旧机器上运行 `openclaw status` 以确认您的状态目录路径。自定义配置文件使用 `~/.openclaw-<profile>/` 或通过 `OPENCLAW_STATE_DIR` 设置的路径。
</Tip>

### 迁移步骤

<Steps>
  <Step title="停止网关并备份">
    在 **旧** 机器上，停止网关以免复制过程中文件发生变化，然后进行归档：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果您使用多个配置文件（例如 `~/.openclaw-work`），请分别归档每一个。

  </Step>

<Step title="OpenClaw在机器上安装 OpenClaw">在新机器上[安装](/zh/installCLI) CLI（如果需要的话也安装 Node）。如果新手引导创建了一个新的 `~/.openclaw/` 也没关系。您下一步会覆盖它。</Step>

  <Step title="复制状态目录和工作区">
    通过 `scp`、`rsync -a` 或外部驱动器传输存档，然后解压：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    确保包含了隐藏目录，并且文件所有权与将运行网关的用户相匹配。

  </Step>

  <Step title="运行检查程序并验证">
    在新机器上，运行 [Doctor](/zh/gateway/doctor) 以应用配置迁移并修复服务：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

如果 Telegram 或 Discord 使用了默认环境变量回退（TelegramDiscord`TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN`），请验证迁移后的 state-dir `.env` 包含这些密钥，且不打印机密值：

```bash
awk -F= '/^(TELEGRAM_BOT_TOKEN|DISCORD_BOT_TOKEN)=/ { print $1 "=present" }' ~/.openclaw/.env
```

当已启用的默认 Telegram 或 Discord 账户没有配置令牌，并且匹配的环境变量对检查程序进程不可用时，`openclaw doctor`TelegramDiscord 也会发出警告。

### 常见陷阱

<AccordionGroup>
  <Accordion title="配置文件或状态目录不匹配">
    如果旧网关使用了 `--profile` 或 `OPENCLAW_STATE_DIR` 而新网关没有使用，渠道将显示为已登出且会话将为空。使用您迁移的**相同**配置文件或状态目录启动网关，然后重新运行 `openclaw doctor`。
  </Accordion>

  <Accordion title="仅复制 openclaw.">
    仅复制配置文件是不够的。模型身份验证配置文件位于 `agents/<agentId>/agent/auth-profiles.json` 下，而渠道和提供商状态位于 `credentials/` 下。请始终迁移**整个**状态目录。
  </Accordion>

<Accordion title="Permissions and ownership">如果您以 root 用户身份复制或切换了用户，网关可能无法读取凭据。请确保状态目录和工作区由运行网关的用户拥有。</Accordion>

<Accordion title="Remote mode">如果您的 UI 指向**远程**网关，则远程主机拥有会话和工作区。请迁移网关主机本身，而不是您的本地笔记本电脑。参见 [常见问题](/zh/help/faq#where-things-live-on-disk)。</Accordion>

  <Accordion title="Secrets in backups">
    状态目录包含身份验证配置文件、渠道凭据和其他提供商状态。请加密存储备份，避免使用不安全的传输渠道，并在怀疑发生泄露时轮换密钥。
  </Accordion>
</AccordionGroup>

### 验证清单

在新机器上，确认：

- [ ] `openclaw status` 显示网关正在运行。
- [ ] 渠道仍然保持连接（无需重新配对）。
- [ ] 仪表板已打开并显示现有会话。
- [ ] 工作区文件（内存、配置）存在。

## 就地升级插件

就地插件升级会保留相同的插件 ID 和配置键，但可能会将磁盘上的状态移动到当前布局中。特定于插件的升级指南与其渠道并列存在：

- [Matrix 迁移](/zh/channels/matrix-migration)：加密状态恢复限制、自动快照行为和手动恢复命令。

## 相关

- [`openclaw migrate`](/zh/cli/migrate)：跨系统导入的 CLI 参考。
- [安装概述](/zh/install)：所有安装方法。
- [Doctor](/zh/gateway/doctor)：迁移后的健康检查。
- [卸载](/zh/install/uninstall)：彻底移除 OpenClaw。
