---
title: "创建 Skills"
sidebarTitle: "创建 Skills"
summary: "为您的 OpenClaw 代理构建、测试和发布基于 SKILL.md 的自定义工作区 Skills。"
read_when:
  - You are creating a new custom skill
  - You need a quick starter workflow for SKILL.md-based skills
  - You want to use Skill Workshop to propose a skill for agent review
---

Skills 教会代理如何以及何时使用工具。每个 Skill 都是一个包含 `SKILL.md` 文件的目录，该文件包含 YAML 前置数据和 markdown 指令。
OpenClaw 会按照定义的 [优先顺序](/zh/tools/skills#loading-order) 从多个根目录加载 Skills。

## 创建你的第一个 Skill

<Steps>
  <Step title="创建 Skill 目录">
    Skills 位于您的工作区 `skills/` 文件夹中。为您的新 Skill 创建一个目录：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    为了便于组织，您可以将 Skills 分组在子文件夹中 — Skill 仍然由 `SKILL.md` 前置数据命名，而不是由文件夹路径命名：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    # skill name is still "hello-world", invoked as /hello-world
    ```

  </Step>

  <Step title="编写 SKILL.md">
    在目录内创建 `SKILL.md`。前置数据定义元数据；正文向代理提供指令。

    ```markdown
    ---
    name: hello-world
    description: A simple skill that prints a greeting.
    ---

    # Hello World

    When the user asks for a greeting, use the `exec` tool to run:

    ```bash
    echo "Hello from your custom skill!"
    ```
    ```

    命名规则：
    - `name` 使用小写字母、数字和连字符。
    - 保持目录名称和前置数据 `name` 一致。
    - `description` 会显示给代理并在斜杠命令发现中显示 — 请保持其为一行且不超过 160 个字符。

  </Step>

  <Step title="验证 Skill 已加载">
    ```bash
    openclaw skills list
    ```

    OpenClaw 默认会监视 Skills 根目录下的 `SKILL.md` 文件。如果监视器已禁用或您正在继续现有的会话，请启动一个新的会话，以便代理接收刷新后的列表：

    ```bash
    # From chat — archive current session and start fresh
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

    或者打开聊天窗口直接询问 agent。使用 `/skill hello-world` 来
    按名称显式调用它。

  </Step>
</Steps>

## SKILL.md 参考

### 必填字段

| 字段          | 描述                                      |
| ------------- | ----------------------------------------- |
| `name`        | 使用小写字母、数字和连字符的唯一标识符    |
| `description` | 展示给 agent 并在发现输出中显示的单行描述 |

### 可选 Frontmatter 键

| 字段                       | 默认值  | 描述                                                        |
| -------------------------- | ------- | ----------------------------------------------------------- |
| `user-invocable`           | `true`  | 将技能作为用户斜杠命令公开                                  |
| `disable-model-invocation` | `false` | 将技能排除在 agent 的系统提示之外（仍可通过 `/skill` 运行） |
| `command-dispatch`         | —       | 设置为 `tool` 可将斜杠命令直接路由到工具，绕过模型          |
| `command-tool`             | —       | 设置 `command-dispatch: tool` 时要调用的工具名称            |
| `command-arg-mode`         | `raw`   | 对于工具调度，将原始参数字符串转发给工具                    |
| `homepage`                 | —       | 在 macOS Skills UI 中显示为“网站”的 URL                     |

有关门控字段（`requires.bins`，`requires.env` 等），请参阅
[Skills — Gating](/zh/tools/skills#gating)。

### 使用 `{baseDir}`

在技能正文中使用 `{baseDir}` 来引用技能目录内的文件，
而无需硬编码路径：

```markdown
Run the helper script at `{baseDir}/scripts/run.sh`.
```

## 添加条件激活

设置技能门控，使其仅在依赖项可用时加载：

```markdown
---
name: gemini-search
description: Search using Gemini CLI.
metadata: { "openclaw": { "requires": { "bins": ["gemini"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<AccordionGroup>
  <Accordion title="选项控制">
    | 键 | 描述 |
    | --- | --- |
    | `requires.bins` | 所有二进制文件必须存在于 `PATH` 上 |
    | `requires.anyBins` | 至少有一个二进制文件必须存在于 `PATH` 上 |
    | `requires.env` | 每个环境变量必须存在于进程或配置中 |
    | `requires.config` | 每个 `openclaw.json` 路径必须为真 |
    | `os` | 平台过滤器：`["darwin"]`、`["linux"]`、`["win32"]` |
    | `always` | 设置 `true` 以跳过所有检查并始终包含该技能 |

    完整参考：[Skills — Gating](/zh/tools/skills#gating)。

  </Accordion>
  <Accordion title="环境和 API 密钥">
    将 API 密钥连接到 `openclaw.json` 中的技能条目：

    ```json5
    {
      skills: {
        entries: {
          "gemini-search": {
            enabled: true,
            apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
          },
        },
      },
    }
    ```

    密钥仅在对应的代理轮次中注入到宿主进程。
    它不会到达沙箱 —— 请参阅
    [沙箱隔离 环境变量](/zh/tools/skills-config#sandboxed-skills-and-env-vars)。

  </Accordion>
</AccordionGroup>

## 通过 Skill Workshop 提议

对于由代理起草的技能，或者当您希望在技能上线前由操作员进行审查时，请使用 [Skill Workshop](/zh/tools/skill-workshop) 提案，而不是直接编写
`SKILL.md`。

```bash
# Propose a brand-new skill
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that prints a greeting." \
  --proposal ./PROPOSAL.md

# Propose an update to an existing skill
openclaw skills workshop propose-update hello-world \
  --proposal ./PROPOSAL.md \
  --description "Updated greeting skill"
```

当提案包含支持文件时，使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that prints a greeting." \
  --proposal-dir ./hello-world-proposal/
```

该目录必须包含 `PROPOSAL.md`。支持文件可以放在 `assets/`、
`examples/`、`references/`、`scripts/` 或 `templates/` 中。

审查之后：

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

有关完整的提案生命周期，请参阅 [Skill Workshop](/zh/tools/skill-workshop)。

## 发布到 ClawHub

<Steps>
  <Step title="确保您的 SKILL.md 已完成">
    确保 `name`、`description` 以及任何 `metadata.openclaw` 控制字段
    已设置。如果您有项目页面，请添加 `homepage` URL。
  </Step>
  <Step title="ClawHub安装 ClawHub 技能"ClawHub>
    ClawHub 技能记录了当前发布命令的形式和必需的
    元数据：

    ```bash
    openclaw skills install clawhub-publish
    ```

  </Step>
  <Step title="发布">
    ```bash
    clawhub publish
    ```ClawHub

    查看 [ClawHub — Publishing](/en/clawhub/publishing) 了解完整流程。

  </Step>
</Steps>

## 最佳实践

<Tip>- **保持简洁** — 指示模型做*什么*，而不是如何成为一个 AI。 - **安全第一** — 如果您的技能使用了 `exec`，请确保提示词不允许 来自不受信任输入的任意命令注入。 - **本地测试** — 在分享之前使用 `openclaw agent --message "..."`ClawHub。 - **使用 ClawHub** — 在从头开始构建之前， 浏览 [clawhub.ai](https://clawhub.ai) 上的社区技能。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="Skills 参考" href="/en/tools/skills" icon="puzzle-piece">
    加载顺序、控制、允许列表和 SKILL.md 格式。
  </Card>
  <Card title="Skill Workshop" href="/en/tools/skill-workshop" icon="flask">
    代理起草技能的提案队列。
  </Card>
  <Card title="Skills 配置" href="/en/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置架构。
  </Card>
  <Card title="ClawHubClawHub" href="/en/clawhub" icon="cloud">
    在公共注册表中浏览和发布技能。
  </Card>
  <Card title="Building plugins" href="/en/plugins/building-plugins" icon="plug">
    插件可以随其文档的工具一起提供技能。
  </Card>
</CardGroup>
