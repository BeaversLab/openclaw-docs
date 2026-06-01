---
summary: "Crestodian（无配置安全设置和修复助手）的 CLI 参考和安全模型"
read_when:
  - You run openclaw with no command after setup and want to understand Crestodian
  - You need a configless-safe way to inspect or repair OpenClaw
  - You are designing or enabling message-channel rescue mode
title: "Crestodian"
---

# `openclaw crestodian`

Crestodian 是 OpenClaw 的本地设置、修复和配置助手。它的设计目的是在正常代理路径中断时保持可访问性。

当活动配置文件缺失或没有已编写的设置（为空或仅包含元数据）时，不带命令运行 `openclaw` 会首先启动经典新手引导。在配置文件包含已编写的设置后，不带命令运行 `openclaw` 会在交互式终端中启动 Crestodian。运行 `openclaw crestodian` 会显式启动相同的辅助程序。

## Crestodian 显示的内容

启动时，交互式 Crestodian 会打开与 `openclaw tui` 相同的 TUI shell，后端为 Crestodian 聊天。聊天日志以简短的问候开始：

- 启动 Crestodian 的时机
- Crestodian 实际使用的模型或确定性规划器路径
- 配置有效性和默认代理
- 从首次启动探测开始的 Gateway(网关) 可达性
- Crestodian 可以采取的下一个调试操作

它不会仅为了启动而转储机密信息或加载插件 CLI 命令。TUI 仍然提供正常的页眉、聊天日志、状态行、页脚、自动完成和编辑器控件。

使用 `status` 获取详细清单，其中包含配置路径、文档/源路径、本地 CLI 探针、API 密钥是否存在、代理、模型和 Gateway(网关) 详情。

Crestodian 使用与常规代理相同的 OpenClaw 引用发现机制。在 Git 检出中，它将自身指向本地 `docs/` 和本地源树。在 npm 包安装中，它使用捆绑的包文档并链接到 [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)，并明确提示在文档不足时查阅源码。

## 示例

```bash
openclaw
openclaw crestodian
openclaw crestodian --json
openclaw crestodian --message "models"
openclaw crestodian --message "validate config"
openclaw crestodian --message "setup workspace ~/Projects/work model openai/gpt-5.5" --yes
openclaw crestodian --message "set default model openai/gpt-5.5" --yes
openclaw onboard --modern
```

在 Crestodian TUI 内部：

```text
status
health
doctor
doctor fix
validate config
setup
setup workspace ~/Projects/work model openai/gpt-5.5
config set gateway.port 19001
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
restart gateway
agents
create agent work workspace ~/Projects/work
models
set default model openai/gpt-5.5
plugins list
plugins search slack
plugin install clawhub:openclaw-codex-app-server
plugin uninstall openclaw-codex-app-server
talk to work agent
talk to agent for ~/Projects/work
audit
quit
```

## 安全启动

Crestodian 的启动路径特意设计得很小。它可以在以下情况下运行：

- `openclaw.json` 缺失
- `openclaw.json` 无效
- Gateway(网关) 已关闭
- 插件命令注册不可用
- 尚未配置任何代理

`openclaw --help` 和 `openclaw --version` 仍使用常规快速路径。
非交互式的裸 `openclaw` 会显示一条简短消息并退出，而不是打印根帮助。在全新安装时，该消息指向非交互式新手引导；设置完成后，它指向一次性 Crestodian 命令。

## 操作和批准

Crestodian 使用类型化操作，而不是临时编辑配置。

只读操作可以立即运行：

- 显示概览
- 列出代理
- 列出已安装的插件
- 搜索 ClawHub 插件
- 显示模型/后端状态
- 运行状态或健康检查
- 检查 Gateway(网关) 连接性
- 运行诊断程序但不进行交互式修复
- 验证配置
- 显示审计日志路径

持久性操作在交互模式下需要对话批准，除非您传递 `--yes` 以直接执行命令：

- 写入配置
- 运行 `config set`
- 通过 `config set-ref` 设置支持的 SecretRef 值
- 运行设置/新手引导引导程序
- 更改默认模型
- 启动、停止或重启 Gateway(网关)
- 创建代理
- 从 ClawHub 或 npm 安装插件
- 卸载插件
- 运行重写配置或状态的诊断修复

应用的写入操作记录在：

```text
~/.openclaw/audit/crestodian.jsonl
```

设备发现不受审计。只有应用的操作和写入会被记录。

`openclaw onboard --modern` 启动 Crestodian 作为现代新手引导预览。
普通的 `openclaw onboard` 仍然运行经典新手引导。

## 设置引导

`setup` 是以聊天优先的新手引导引导程序。它仅通过类型化配置操作进行写入，并首先请求批准。

```text
setup
setup workspace ~/Projects/work
setup workspace ~/Projects/work model openai/gpt-5.5
```

当未配置模型时，设置将按此顺序选择第一个可用的后端，并告诉您它选择了什么：

- 现有的显式模型（如果已配置）
- `OPENAI_API_KEY` -> `openai/gpt-5.5`
- `ANTHROPIC_API_KEY` -> `anthropic/claude-opus-4-8`
- Claude Code CLI -> CLI`claude-cli/claude-opus-4-8`
- Codex -> `openai/gpt-5.5` 通过 Codex 应用服务器工具

如果均不可用，设置仍会写入默认工作区并使模型保持未设置。安装或登录 Codex/Claude Code，或公开 `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`，然后再次运行设置。

## 模型辅助规划器

Crestodian 始终以确定性模式启动。对于确定性解析器无法理解的模糊命令，本地 Crestodian 可以通过 OpenClaw 的正常运行时路径进行一次有界的规划器轮转。它首先使用已配置的 OpenClaw 模型。如果尚未配置可用的模型，它可以回退到机器上已存在的本地运行时：

- Claude Code CLI：CLI`claude-cli/claude-opus-4-8`
- Codex 应用服务器工具：`openai/gpt-5.5`

模型辅助规划器无法直接修改配置。它必须将请求转换为 Crestodian 的类型化命令之一，然后应用正常的批准和审计规则。Crestodian 在运行任何操作之前会打印它使用的模型和解释后的命令。无配置回退规划器轮次是临时的，在运行时支持的情况下禁用工具，并使用临时工作区/会话。

消息渠道救援模式不使用模型辅助规划器。远程救援保持确定性，因此损坏或被入侵的正常代理路径无法被用作配置编辑器。

## 切换到代理

使用自然语言选择器退出 Crestodian 并打开正常的 TUI：

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`、`openclaw chat` 和 `openclaw terminal` 仍会直接打开常规代理 TUI。它们不会启动 Crestodian。

切换到常规 TUI 后，使用 `/crestodian` 返回 Crestodian。
您可以包含后续请求：

```text
/crestodian
/crestodian restart gateway
```

TUI 内的代理切换会留下一个标记，指示 `/crestodian` 可用。

## 消息救援模式

消息救援模式是 Crestodian 的消息渠道入口点。它适用于正常代理已死机，但 WhatsApp 等受信任渠道仍能接收命令的情况。

支持的文本命令：

- `/crestodian <request>`

操作员流程：

```text
You, in a trusted owner DM: /crestodian status
OpenClaw: Crestodian rescue mode. Gateway reachable: no. Config valid: no.
You: /crestodian restart gateway
OpenClaw: Plan: restart the Gateway. Reply /crestodian yes to apply.
You: /crestodian yes
OpenClaw: Applied. Audit entry written.
```

代理创建也可以从本地提示符或救援模式排队：

```text
create agent work workspace ~/Projects/work model openai/gpt-5.5
/crestodian create agent work workspace ~/Projects/work
```

远程救援模式是一个管理界面。必须将其视为远程配置修复，而不是普通聊天。

远程救援的安全契约：

- 启用沙箱隔离时禁用。如果代理/会话处于沙箱隔离状态，
  Crestodian 必须拒绝远程救援，并说明需要通过本地 CLI 进行修复。
- 默认有效状态为 `auto`：仅在被信任的 YOLO
  操作中允许远程救援，其中运行时已具有非沙箱化的本地权限。
- 要求明确的所有者身份。救援不得接受通配符发送方
  规则、开放组策略、未经身份验证的 Webhook 或匿名渠道。
- 默认仅限所有者私信。组/渠道救援需要明确选择加入。
- 插件搜索和列表为只读。默认情况下，插件安装仅限本地，
  因为它会下载可执行代码。如果救援策略允许持久写入，则可以将插件卸载作为
  批准的修复操作。
- 远程救援无法打开本地 TUI 或切换到交互式代理
  会话。请使用本地 `openclaw` 进行代理交接。
- 即使在救援模式下，持久写入仍需要批准。
- 审核每一个应用的救援操作。消息渠道救援会记录渠道、
  账户、发送方和源地址元数据。配置变更操作还会
  记录前后的配置哈希。
- 切勿回显机密信息。SecretRef 检查应报告可用性，而非
  值。
- 如果 Gateway(网关) 处于活动状态，请优先使用 Gateway(网关) 类型的操作。如果 Gateway(网关)
  已停止，请仅使用不依赖
  正常代理循环的最小本地修复表面。

配置结构：

```jsonc
{
  "crestodian": {
    "rescue": {
      "enabled": "auto",
      "ownerDmOnly": true,
    },
  },
}
```

`enabled` 应接受：

- `"auto"`：默认值。仅当有效运行时为 YOLO 且
  沙箱隔离关闭时允许。
- `false`：永不允许消息渠道救援。
- `true`：当所有者/渠道检查通过时明确允许救援。这
  仍不得绕过沙箱隔离拒绝。

默认的 `"auto"` YOLO 姿态为：

- 沙箱模式解析为 `off`
- `tools.exec.security` 解析为 `full`
- `tools.exec.ask` 解析为 `off`

远程救援由 Docker 路径涵盖：

```bash
pnpm test:docker:crestodian-rescue
```

无配置本地规划器回退机制涵盖于：

```bash
pnpm test:docker:crestodian-planner
```

一个可选择的实时渠道命令界面冒烟测试 `/crestodian status`，加上一个通过救援处理程序的持久批准往返：

```bash
pnpm test:live:crestodian-rescue-channel
```

通过显式 Crestodian 命令进行的无配置设置涵盖了：

```bash
pnpm test:docker:crestodian-first-run
```

该通道从一个空的状态目录开始，验证现代的 Crestodian 入口点，设置默认模型，创建一个额外的代理，通过插件启用和令牌 SecretRef 配置 Discord，验证配置，并检查审计日志。QA Lab 也有一个针对相同的 Ring 0 流程的基于仓库的场景：

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## 相关

- [CLI 参考](/zh/cli)
- [Doctor](/zh/cli/doctor)
- [TUI](/zh/cli/tui)
- [沙箱](/zh/cli/sandbox)
- [安全](/zh/cli/security)
