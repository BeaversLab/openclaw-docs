---
title: "Creating Skills"
summary: "Build and test custom workspace skills with SKILL.md"
read_when:
  - 您正在工作区中创建一个新的自定义 skill
  - 您需要基于 SKILL.md 的 skills 的快速入门工作流
---

# 创建自定义 Skills 🛠

OpenClaw 设计为易于扩展。“Skills”是为您的助手添加新功能的主要方式。

## 什么是 Skill？

Skill 是一个包含 `SKILL.md` 文件（向 LLM 提供指令和工具定义）以及可选的一些脚本或资源的目录。

## 分步操作：您的第一个 Skill

### 1. 创建目录

Skills 位于您的工作区中，通常位于 `~/.openclaw/workspace/skills/`。为您的 skill 创建一个新文件夹：

```bash
mkdir -p ~/.openclaw/workspace/skills/hello-world
```

### 2. 定义 `SKILL.md`

在该目录中创建一个 `SKILL.md` 文件。该文件使用 YAML frontmatter 存储元数据，使用 Markdown 编写指令。

```markdown
---
name: hello_world
description: A simple skill that says hello.
---

# Hello World Skill

When the user asks for a greeting, use the `echo` tool to say "Hello from your custom skill!".
```

### 3. 添加工具（可选）

您可以在 frontmatter 中定义自定义工具，或者指示代理使用现有的系统工具（如 `bash` 或 `browser`）。

### 4. 刷新 OpenClaw

要求您的代理“refresh skills”或重启网关。OpenClaw 将发现新目录并索引 `SKILL.md`。

## 最佳实践

- **保持简洁**：指示模型*做什么*，而不是如何成为一名 AI。
- **安全第一**：如果您的 skill 使用 `bash`，请确保提示词不允许通过不受信任的用户输入进行任意命令注入。
- **本地测试**：使用 `openclaw agent --message "use my new skill"` 进行测试。

## 共享 Skills

您也可以浏览并贡献 skills 到 [ClawHub](https://clawhub.com)。

import zh from "/components/footer/zh.mdx";

<zh />
