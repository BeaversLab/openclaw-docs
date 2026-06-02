---
summary: "使用 SKILL.md 构建和测试自定义工作区技能"
title: "创建技能"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Skills 教会智能体如何以及何时使用工具。每个 Skill 是一个包含带有 YAML 前置内容和 markdown 指令的 `SKILL.md` 文件的目录。

有关 Skills 如何加载和确定优先级的信息，请参阅 [Skills](/zh/tools/skills)。

## 创建你的第一个 Skill

<Steps>
  <Step title="创建技能目录">
    Skills 位于您的工作区中。创建一个新文件夹：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    当您的库变大时，您可以在子文件夹中组织 Skills：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    ```

    分组文件夹仅用于组织。Skill 仍然由 `SKILL.md` 前置内容命名，因此 `name: hello-world` 被调用为
    `/hello-world`。

  </Step>

  <Step title="编写 SKILL.md">
    在该目录中创建 `SKILL.md`。前置内容定义元数据，
    markdown 主体包含针对智能体的指令。

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    对于 skill `name`，请使用连字符格式，包含小写字母、数字和连字符。保持叶文件夹名称与前置内容 `name` 一致。

  </Step>

  <Step title="添加工具（可选）">
    您可以在前置内容中定义自定义工具架构，或指示智能体
    使用现有的系统工具（如 `exec` 或 `browser`）。Skills 也可以
    随其记录的工具一起在插件内发布。

  </Step>

  <Step title="加载技能">
    验证技能已加载：

    ```bash
    openclaw skills list
    ```

    OpenClaw 会监视 skills 根目录下嵌套的 `SKILL.md` 文件。如果监视器
    被禁用，或者您正在继续现有的会话，请启动一个新的会话
    以便模型接收刷新后的 skills 列表：

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="测试它">
    发送一条应触发该技能的消息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者直接与代理聊天并请求问候。

  </Step>
</Steps>

## 应用前先提议

对于代理生成的程序，请使用 Skill Workshop 提案而不是直接写入 `SKILL.md`：

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that says hello." \
  --proposal ./PROPOSAL.md
```

当提案还包含支持文件时，请使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that says hello." \
  --proposal-dir ./hello-world-proposal
```

草稿存储在 `<OPENCLAW_STATE_DIR>/skill-workshop/proposals/<proposal-id>/PROPOSAL.md` 下，
并在操作员审核并应用之前保持非活动状态。默认状态目录为
`~/.openclaw`。提案目录必须包含 `PROPOSAL.md`。
支持文件可以包含在 `assets/`、`examples/`、`references/`、
`scripts/` 或 `templates/`OpenClaw 中；OpenClaw 会与提案一起存储并扫描它们：

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
```

应用后，OpenClaw 会将最终的 OpenClaw`SKILL.md` 写入工作区 `skills/`
根目录，将批准的支持文件写入其旁边，并移除仅限提案的前置元数据
（frontmatter），例如 `status: proposal`、提案 `version` 和提案
`date`。

## 技能元数据参考

YAML 前置元数据支持以下字段：

| 字段                                | 必需 | 描述                                           |
| ----------------------------------- | ---- | ---------------------------------------------- |
| `name`                              | 是   | 使用小写字母、数字和连字符的唯一标识符         |
| `description`                       | 是   | 向代理显示的单行描述                           |
| `metadata.openclaw.os`              | 否   | 操作系统过滤器（`["darwin"]`、`["linux"]` 等） |
| `metadata.openclaw.requires.bins`   | 否   | PATH 上需要的二进制文件                        |
| `metadata.openclaw.requires.config` | 否   | 所需的配置键                                   |

## 高级功能

当基本技能运行正常后，这些字段有助于使其可靠且可移植：

- **条件激活** — 使用 `requires.bins`、`requires.env` 或
  `requires.config`，以便仅在所需的依赖项可用时加载该技能。请参阅 [Skills reference: gating](/zh/tools/skills#gating)。
- **环境和 API 密钥连接** — 使用 API`skills.entries.<name>.env` 和
  `skills.entries.<name>.apiKey` 为 Skill 轮次注入主机端环境。请参阅 [Skills 参考：配置连接](/zh/tools/skills#config-wiring)。
- **调用控制** — 设置 `user-invocable: false` 以隐藏斜杠命令，
  或设置 `disable-model-invocation: true` 以使命令式 Skill 不出现在
  模型提示中。请参阅 [Skills 参考：Frontmatter](/zh/tools/skills#frontmatter)。
- **直接命令调度** — 当斜杠命令应直接调用工具而不是
  通过模型路由时，请将 `command-dispatch: tool` 与
  `command-tool` 一起使用。
- **可移植路径** — 在 `SKILL.md` 中引用 Skill 目录内的脚本
  或资产时，请使用 `{baseDir}`。
- **发布** — 在准备发布 Skill 时，请使用 ClawHub Skill。
  它记录了当前的 ClawHub`clawhub publish` 命令形状和所需
  元数据。

## 最佳实践

- **保持简洁** — 指示模型做*什么*，而不是如何成为一个 AI
- **安全第一** — 如果您的 Skill 使用 `exec`，请确保提示不允许来自不受信任输入的任意命令注入
- **本地测试** — 在分享之前使用 `openclaw agent --message "..."` 进行测试
- **使用 ClawHub** — 在 [ClawHub](ClawHubClawHubhttps://clawhub.ai) 浏览和贡献 Skills

## Skills 的位置

| 位置                            | 优先级 | 范围                |
| ------------------------------- | ------ | ------------------- |
| `\<workspace\>/skills/`         | 最高   | 每个 Agent          |
| `\<workspace\>/.agents/skills/` | 高     | 每个工作区 Agent    |
| `~/.agents/skills/`             | 中等   | 共享 Agent 配置文件 |
| `~/.openclaw/skills/`           | 中等   | 共享（所有 Agents） |
| 捆绑（随 OpenClaw 附带）        | 低     | 全局                |
| `skills.load.extraDirs`         | 最低   | 自定义共享文件夹    |

每个 Skills 根目录都可以包含直接的 Skill 文件夹，例如
`skills/hello-world/SKILL.md`，或分组文件夹，例如
`skills/personal/hello-world/SKILL.md`。

## 相关

- [Skills 参考](/zh/tools/skills) — 加载、优先级和门控规则
- [Skills 配置](/zh/tools/skills-config) — `skills.*` 配置架构
- [ClawHub](ClawHub/en/clawhub) — 公共技能注册表
- [构建插件](/zh/plugins/building-plugins) — 插件可以附带技能
