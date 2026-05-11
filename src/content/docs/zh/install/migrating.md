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
    导入 Claude Code 和 Claude Desktop 状态，包括 `CLAUDE.md`、MCP 服务器、技能和项目命令。
  </Card>
  <Card title="从 Hermes 迁移" href="/zh/install/migrating-hermes" icon="feather">
    导入 Hermes 配置、提供商、MCP 服务器、记忆、技能和支持的 `.env` 密钥。
  </Card>
</CardGroup>

CLI 入口点是 [`openclaw migrate`](/zh/cli/migrate)。当新手引导检测到已知来源（`openclaw onboard --flow import`）时，也可以提供迁移选项。

## 将 OpenClaw 移动到新机器

复制 **状态目录**（默认为 `~/.openclaw/`）和你的 **工作区** 以保留：

- **配置** — `openclaw.json` 和所有网关设置。
- **身份验证** — 每个 agent 的 `auth-profiles.json`（API 密钥加上 OAuth），以及 `credentials/` 下的任何渠道或提供商状态。
- **会话** — 对话历史和 agent 状态。
- **渠道状态** — WhatsApp 登录、Telegram 会话和类似内容。
- **工作区文件** — `MEMORY.md`、`USER.md`、技能和提示词。

<Tip>
在旧机器上运行 `openclaw status` 以确认您的状态目录路径。自定义配置文件使用 `~/.openclaw-<profile>/` 或通过 `OPENCLAW_STATE_DIR` 设置的路径。
</Tip>

### 迁移步骤

<Steps>
  <Step title="停止网关并备份">
    在**旧**机器上，停止网关以防止文件在复制过程中发生变化，然后进行归档：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果您使用多个配置文件（例如 `~/.openclaw-work`），请分别归档每一个。

  </Step>

<Step title="在新机器上安装 OpenClaw">在新机器上[安装](/zh/install) CLI（如果需要也包括 Node）。即使新手引导创建了一个新的 `~/.openclaw/` 也没关系。您将在下一步覆盖它。</Step>

  <Step title="复制状态目录和工作区">
    通过 `scp`、`rsync -a` 或外部驱动器传输归档文件，然后解压：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    确保包含了隐藏目录，并且文件所有权与运行网关的用户相匹配。

  </Step>

  <Step title="运行诊断并验证">
    在新机器上，运行 [Doctor](/zh/gateway/doctor) 以应用配置迁移并修复服务：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

### 常见陷阱

<AccordionGroup>
  <Accordion title="配置文件或状态目录不匹配">
    如果旧网关使用了 `--profile` 或 `OPENCLAW_STATE_DIR` 而新网关没有使用，渠道将显示为已退出登录状态，会话也将为空。请使用您迁移时所用的**相同**配置文件或状态目录启动网关，然后重新运行 `openclaw doctor`。
  </Accordion>

  <Accordion title="仅复制 openclaw.">
    仅复制配置文件是不够的。模型身份验证配置文件位于 `agents/<agentId>/agent/auth-profiles.json` 下，而渠道和提供商状态位于 `credentials/` 下。请始终迁移**整个**状态目录。
  </Accordion>

<Accordion title="权限和所有权">如果您以 root 用户身份复制或切换了用户，网关可能无法读取凭据。请确保状态目录和工作区由运行网关的用户拥有。</Accordion>

<Accordion title="远程模式">如果您的 UI 指向**远程**网关，则远程主机拥有会话和工作区。请迁移网关主机本身，而不是您的本地笔记本电脑。请参阅 [常见问题](/zh/help/faq#where-things-live-on-disk)。</Accordion>

  <Accordion title="备份中的机密信息">
    状态目录包含身份验证配置文件、渠道凭据和其他提供商状态。请加密存储备份，避免使用不安全的传输渠道，如果您怀疑信息泄露，请轮换密钥。
  </Accordion>
</AccordionGroup>

### 验证清单

在新机器上，确认：

- [ ] `openclaw status` 显示网关正在运行。
- [ ] 渠道仍处于连接状态（无需重新配对）。
- [ ] 仪表板已打开并显示现有会话。
- [ ] 工作区文件（内存、配置）存在。

## 就地升级插件

就地升级插件会保留相同的插件 ID 和配置键，但可能会将磁盘上的状态移动到当前布局中。特定于插件的升级指南与其渠道并存：

- [Matrix 迁移](/zh/channels/matrix-migration)：加密状态恢复限制、自动快照行为和手动恢复命令。

## 相关

- [`openclaw migrate`](/zh/cli/migrate)：跨系统导入的 CLI 参考。
- [安装概述](/zh/install)：所有安装方法。
- [Doctor](/zh/gateway/doctor)：迁移后的健康检查。
- [卸载](/zh/install/uninstall)：彻底删除 OpenClaw。
