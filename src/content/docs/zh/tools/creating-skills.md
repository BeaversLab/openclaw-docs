---
summary: "使用 SKILL.md 构建和测试自定义工作区 Skills"
title: "创建 Skills"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Skills 教会智能体如何以及何时使用工具。每个 Skill 是一个包含 `SKILL.md` 文件的目录，该文件具有 YAML frontmatter 和 markdown 指令。

关于 Skills 如何加载和确定优先级，请参阅 [Skills](/zh/tools/skills)。

## 创建你的第一个 Skill

<Steps>
  <Step title="创建 Skill 目录">
    Skills 位于你的工作区中。创建一个新文件夹：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="编写 SKILL.md">
    在该目录内创建 `SKILL.md`。Frontmatter 定义元数据，
    而 Markdown 主体包含给 Agent 的说明。

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    技能 `name` 请使用由小写字母、数字和连字符组成的连字符命名法 (hyphen-case)。
    保持文件夹名称与 frontmatter 中的 `name` 一致。

  </Step>

  <Step title="添加工具（可选）">
    您可以在 frontmatter 中定义自定义工具架构，或指示 Agent
    使用现有的系统工具（如 `exec` 或 `browser`）。Skills 也可以
    随其文档化的工具一起打包在插件中。

  </Step>

  <Step title="加载 Skill">
    启动一个新的会话以便 OpenClaw 获取该 Skill：

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

    验证 Skill 已加载：

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="测试它">
    发送一条应触发该 Skill 的消息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者直接与智能体聊天并请求问候。

  </Step>
</Steps>

## Skill 元数据参考

YAML frontmatter 支持以下字段：

| 字段                                | 必填 | 描述                                           |
| ----------------------------------- | ---- | ---------------------------------------------- |
| `name`                              | 是   | 使用小写字母、数字和连字符的唯一标识符         |
| `description`                       | 是   | 向智能体显示的单行描述                         |
| `metadata.openclaw.os`              | 否   | 操作系统筛选器 (`["darwin"]`, `["linux"]`, 等) |
| `metadata.openclaw.requires.bins`   | 否   | PATH 上所需的二进制文件                        |
| `metadata.openclaw.requires.config` | 否   | 所需的配置键                                   |

## 高级功能

当基本 Skill 能够运行后，以下字段有助于使其更可靠且更易于移植：

- **条件激活** — 使用 `requires.bins`、`requires.env` 或
  `requires.config`，以便仅在所需的依赖项可用时加载 Skill。请参阅 [Skills reference: gating](/zh/tools/skills#gating)。
- **环境和 API 密钥连接** — 使用 `skills.entries.<name>.env` 和
  `skills.entries.<name>.apiKey` 为 Skill 轮次注入主机端环境。请参阅 [Skills reference: config wiring](/zh/tools/skills#config-wiring)。
- **调用控制** — 设置 `user-invocable: false` 以隐藏斜杠命令，
  或设置 `disable-model-invocation: true` 以使命令式 Skill 不出现在
  模型提示中。请参阅 [Skills reference: frontmatter](/zh/tools/skills#frontmatter)。
- **直接命令调度** — 当斜杠命令应直接调用工具而不是
  通过模型路由时，使用 `command-dispatch: tool` 配合
  `command-tool`。
- **可移植路径** — 在 `SKILL.md` 中引用 Skill 目录内的脚本
  或资产时，请使用 `{baseDir}`。
- **发布** — 在准备发布 Skill 时，请使用 ClawHub Skill。
  它记录了当前的 `clawhub publish` 命令形态和必需的
  元数据。

## 最佳实践

- **言简意赅** — 指示模型做*什么*，而不是如何做一个 AI
- **安全第一** — 如果您的 Skill 使用了 `exec`，请确保提示不允许从不受信任的输入中注入任意命令
- **本地测试** — 在共享之前，请使用 `openclaw agent --message "..."` 进行测试
- **使用 ClawHub** — 在 [ClawHub](https://clawhub.ai) 浏览并贡献 Skills

## Skills 的位置

| 位置                            | 优先级 | 作用域             |
| ------------------------------- | ------ | ------------------ |
| `\<workspace\>/skills/`         | 最高   | 每个代理           |
| `\<workspace\>/.agents/skills/` | 高     | 每个工作区代理     |
| `~/.agents/skills/`             | 中等   | 共享代理配置文件   |
| `~/.openclaw/skills/`           | 中等   | 共享（所有智能体） |
| 内置（随 OpenClaw 一起提供）    | 低     | 全局               |
| `skills.load.extraDirs`         | 最低   | 自定义共享文件夹   |

## 相关

- [Skills 参考](/zh/tools/skills) — 加载、优先级和门控规则
- [Skills 配置](/zh/tools/skills-config) — `skills.*` 配置架构
- [ClawHub](ClawHub/en/clawhub) — 公共技能注册表
- [构建插件](/zh/plugins/building-plugins) — 插件可以提供技能
