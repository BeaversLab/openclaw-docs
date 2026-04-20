---
summary: "将 OpenClaw 安装从一台机器移动（迁移）到另一台机器"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "迁移指南"
---

# 将 OpenClaw 迁移到新机器

本指南将 OpenClaw 网关移动到新机器，而无需重新进行新手引导。

## 迁移内容

当您复制 **状态目录**（默认为 `~/.openclaw/`）和您的 **工作空间** 时，您将保留：

- **配置** -- `openclaw.json` 和所有网关设置
- **认证** -- 每个 `auth-profiles.json` （API 密钥 + OAuth），以及 `credentials/` 下的任何渠道/提供商状态
- **会话** -- 对话历史和代理状态
- **通道状态** -- WhatsApp 登录、Telegram 会话等。
- **工作区文件** -- `MEMORY.md`、`USER.md`、技能和提示词

<Tip>
在旧机器上运行 `openclaw status` 以确认您的状态目录路径。
自定义配置文件使用 `~/.openclaw-<profile>/` 或通过 `OPENCLAW_STATE_DIR` 设置的路径。
</Tip>

## 迁移步骤

<Steps>
  <Step title="停止网关并备份">
    在**旧**机器上，停止网关以防止文件在复制过程中发生变化，然后进行归档：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果您使用多个配置文件（例如 `~/.openclaw-work`），请分别归档每个文件。

  </Step>

<Step title="在新机器上安装 OpenClaw">在新机器上[安装](/zh/install) CLI（如果需要也包括 Node）。 即使新手引导创建了新的 `~/.openclaw/` 也没关系——您接下来会覆盖它。</Step>

  <Step title="复制状态目录和工作区">
    通过 `scp`、`rsync -a` 或外部驱动器传输归档文件，然后解压：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    确保包含隐藏目录，并且文件所有权与将运行网关的用户匹配。

  </Step>

  <Step title="运行检查并验证">
    在新机器上，运行 [Doctor](/zh/gateway/doctor) 以应用配置迁移并修复服务：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

## 常见误区

<AccordionGroup>
  <Accordion title="配置文件或状态目录不匹配">
    如果旧网关使用了 `--profile` 或 `OPENCLAW_STATE_DIR` 而新网关没有，
    渠道将显示为已注销状态，会话将为空。
    使用您迁移时的**相同**配置文件或状态目录启动网关，然后重新运行 `openclaw doctor`。
  </Accordion>

  <Accordion title="仅复制 openclaw.">
    仅复制配置文件是不够的。模型身份验证配置文件位于
    `agents/<agentId>/agent/auth-profiles.json` 下，而渠道/提供商的状态仍然
    位于 `credentials/` 下。请始终迁移**整个**状态目录。
  </Accordion>

<Accordion title="权限和所有权">如果您以 root 用户身份复制或切换了用户，网关可能无法读取凭证。 请确保状态目录和工作区归运行网关的用户所有。</Accordion>

<Accordion title="远程模式">如果您的 UI 指向**远程**网关，则远程主机拥有会话和工作区。 请迁移网关主机本身，而不是您的本地笔记本电脑。请参阅 [常见问题](/zh/help/faq#where-things-live-on-disk)。</Accordion>

  <Accordion title="备份中的机密信息">
    状态目录包含身份验证配置文件、渠道凭据和其他
    提供商状态。
    请加密存储备份，避免使用不安全的传输渠道，如果您怀疑信息泄露，请轮换密钥。
  </Accordion>
</AccordionGroup>

## 验证清单

在新机器上，确认：

- [ ] `openclaw status` 显示网关正在运行
- [ ] 渠道仍保持连接状态（无需重新配对）
- [ ] 仪表板可以打开并显示现有会话
- [ ] 工作区文件（记忆、配置）存在
