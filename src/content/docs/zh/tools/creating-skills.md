---
summary: "使用 SKILL.md 构建和测试自定义工作区技能"
title: "创建技能"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Skills 教会代理如何以及何时使用工具。每个技能都是一个目录，其中包含一个带有 YAML frontmatter 和 markdown 指令的 `SKILL.md` 文件。

有关如何加载和确定技能优先级的信息，请参阅 [Skills](/zh/tools/skills)。

## 创建你的第一个 Skill

<Steps>
  <Step title="创建技能目录">
    Skills 存在于您的工作区中。创建一个新文件夹：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    当您的技能库增长时，您可以在子文件夹中对 Skills 进行分组：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    ```

    分组文件夹仅用于组织。技能仍由 `SKILL.md` frontmatter 命名，因此 `name: hello-world` 作为 `/hello-world` 被调用。

  </Step>

  <Step title="编写 SKILL.md">
    在该目录中创建 `SKILL.md`。Frontmatter 定义元数据，markdown 主体包含给代理的指令。

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    对于技能 `name`，请使用连字符格式（hyphen-case），包含小写字母、数字和连字符。保持叶子文件夹名称和 frontmatter `name` 一致。

  </Step>

  <Step title="添加工具（可选）">
    您可以在 frontmatter 中定义自定义工具架构，或者指示代理使用现有的系统工具（如 `exec` 或 `browser`）。Skills 也可以与它们记录的工具一起随插件发布。

  </Step>

  <Step title="加载技能">
    验证技能是否已加载：

    ```bash
    openclaw skills list
    ```

    OpenClaw 会监视技能根目录下的嵌套 `SKILL.md` 文件。如果监视器被禁用或者您正在继续现有的会话，请启动一个新会话，以便模型接收刷新后的 Skills 列表：

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="测试它">
    发送一条应该触发该技能的消息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者直接与代理聊天并请求问候。

  </Step>
</Steps>

## Skill 元数据参考

YAML frontmatter 支持以下字段：

| 字段                                | 必填 | 描述                                      |
| ----------------------------------- | ---- | ----------------------------------------- |
| `name`                              | 是   | 使用小写字母、数字和连字符的唯一标识符    |
| `description`                       | 是   | 向智能体显示的单行描述                    |
| `metadata.openclaw.os`              | 否   | OS 过滤器（`["darwin"]`、`["linux"]` 等） |
| `metadata.openclaw.requires.bins`   | 否   | PATH 上所需的二进制文件                   |
| `metadata.openclaw.requires.config` | 否   | 所需的配置键                              |

## 高级功能

当基本 Skill 能够运行后，以下字段有助于使其更可靠且更易于移植：

- **条件激活** — 使用 `requires.bins`、`requires.env` 或
  `requires.config` 以仅在所需的依赖项可用时加载该技能。请参阅 [Skills reference: gating](/zh/tools/skills#gating)。
- **环境和 API 密钥连接** — 使用 API`skills.entries.<name>.env` 和
  `skills.entries.<name>.apiKey` 为技能回合注入主机端环境。请参阅 [Skills reference: config wiring](/zh/tools/skills#config-wiring)。
- **调用控制** — 设置 `user-invocable: false` 以隐藏斜杠命令，
  或设置 `disable-model-invocation: true` 以使命令风格的技能不显示在
  模型提示中。请参阅 [Skills reference: frontmatter](/zh/tools/skills#frontmatter)。
- **直接命令分发** — 当斜杠命令应直接调用工具而不是
  通过模型路由时，请将 `command-dispatch: tool` 与
  `command-tool` 一起使用。
- **可移植路径** — 在 `SKILL.md` 中使用 `{baseDir}` 以引用技能目录中的脚本
  或资源。
- **发布** — 在准备发布技能时使用 ClawHub 技能。
  它记录了当前的 ClawHub`clawhub publish` 命令形状和所需的
  元数据。

## 最佳实践

- **言简意赅** — 指示模型做*什么*，而不是如何做一个 AI
- **安全第一** — 如果您的技能使用 `exec`，请确保提示不允许来自不受信任输入的任意命令注入
- **本地测试** — 在共享之前使用 `openclaw agent --message "..."` 进行测试
- **使用 ClawHub** — 在 [ClawHub](ClawHubClawHubhttps://clawhub.ai) 浏览和贡献技能

## Skills 的位置

| 位置                            | 优先级 | 作用域             |
| ------------------------------- | ------ | ------------------ |
| `\<workspace\>/skills/`         | 最高   | 每个代理           |
| `\<workspace\>/.agents/skills/` | 高     | 每个工作区代理     |
| `~/.agents/skills/`             | 中等   | 共享代理配置文件   |
| `~/.openclaw/skills/`           | 中等   | 共享（所有智能体） |
| 内置（随 OpenClaw 一起提供）    | 低     | 全局               |
| `skills.load.extraDirs`         | 最低   | 自定义共享文件夹   |

每个 skills 根目录可以包含直接的 skill 文件夹，例如 `skills/hello-world/SKILL.md`，或分组的文件夹，例如 `skills/personal/hello-world/SKILL.md`。

## 相关

- [Skills 参考](/zh/tools/skills) — 加载、优先级和门控规则
- [Skills 配置](/zh/tools/skills-config) — `skills.*` 配置架构
- [ClawHub](ClawHub/en/clawhub) — 公共 skill 注册表
- [构建插件](/zh/plugins/building-plugins) — 插件可以附带 skills
