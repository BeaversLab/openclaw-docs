---
title: "Creating Skills"
summary: "使用 SKILL.md 构建和测试自定义工作区 Skills"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

# 创建 Skills

Skills 教会 Agent 如何以及何时使用工具。每个 Skill 都是一个目录，其中包含一个带有 YAML frontmatter 和 markdown 指令的 `SKILL.md` 文件。

有关如何加载和优先排序 Skills，请参阅 [Skills](/en/tools/skills)。

## 创建您的第一个 Skill

<Steps>
  <Step title="创建 Skill 目录">
    Skills 位于您的工作区中。创建一个新文件夹：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="编写 SKILL.md">
    在该目录内创建 `SKILL.md`。Frontmatter 定义元数据，
    而 markdown 主体包含给 Agent 的指令。

    ```markdown
    ---
    name: hello_world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

  </Step>

  <Step title="添加工具（可选）">
    您可以在 frontmatter 中定义自定义工具架构，或者指示 Agent
    使用现有的系统工具（如 `exec` 或 `browser`）。Skills 也可以
    随其记录的工具一起打包在插件中。

  </Step>

  <Step title="加载 Skill">
    启动一个新的会话，以便 OpenClaw 获取该 Skill：

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

    验证 Skill 是否已加载：

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="测试它">
    发送一条应触发该 Skill 的消息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者直接与 Agent 聊天并请求问候。

  </Step>
</Steps>

## Skill 元数据参考

YAML frontmatter 支持以下字段：

| 字段                                | 是否必填 | 描述                                          |
| ----------------------------------- | -------- | --------------------------------------------- |
| `name`                              | 是       | 唯一标识符 (snake_case)                       |
| `description`                       | 是       | 向 Agent 显示的单行描述                       |
| `metadata.openclaw.os`              | 否       | 操作系统过滤器 (`["darwin"]`, `["linux"]` 等) |
| `metadata.openclaw.requires.bins`   | 否       | PATH 上需要的二进制文件                       |
| `metadata.openclaw.requires.config` | 否       | 必需的配置键                                  |

## 最佳实践

- **保持简洁** — 指示模型做*什么*，而不是如何成为 AI
- **安全第一** — 如果你的 Skill 使用 `exec`，请确保提示词不允许来自不受信任输入的任意命令注入
- **本地测试** — 在共享之前使用 `openclaw agent --message "..."` 进行测试
- **使用 ClawHub** — 在 [ClawHub](https://clawhub.ai) 浏览和贡献 Skills

## Skills 的存放位置

| 位置                            | 优先级 | 范围             |
| ------------------------------- | ------ | ---------------- |
| `\<workspace\>/skills/`         | 最高   | 每个 Agent       |
| `\<workspace\>/.agents/skills/` | 高     | 每个工作区代理   |
| `~/.agents/skills/`             | 中     | 共享代理配置文件 |
| `~/.openclaw/skills/`           | 中     | 共享（所有代理） |
| 捆绑（随 OpenClaw 附带）        | 低     | 全局             |
| `skills.load.extraDirs`         | 最低   | 自定义共享文件夹 |

## 相关

- [Skills 参考](/en/tools/skills) — 加载、优先级和门控规则
- [Skills 配置](/en/tools/skills-config) — `skills.*` 配置架构
- [ClawHub](/en/tools/clawhub) — 公共 Skills 注册表
- [构建插件](/en/plugins/building-plugins) — 插件可以附带 Skills
