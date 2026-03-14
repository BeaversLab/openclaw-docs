---
title: "创建技能"
summary: "使用 SKILL.md 构建和测试自定义工作区技能"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

# 创建自定义技能 🛠

OpenClaw 旨在易于扩展。“技能”是为助手添加新功能的主要方式。

## 什么是技能？

技能是一个包含 `SKILL.md` 文件（为 LLM 提供指令和工具定义）以及可选的一些脚本或资源的目录。

## 分步操作：你的第一个技能

### 1. 创建目录

技能位于您的工作区中，通常是 `~/.openclaw/workspace/skills/`。为您的技能创建一个新文件夹：

```bash
mkdir -p ~/.openclaw/workspace/skills/hello-world
```

### 2. 定义 `SKILL.md`

在该目录中创建一个 `SKILL.md` 文件。该文件使用 YAML frontmatter 作为元数据，使用 Markdown 作为指令。

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

要求您的代理“刷新技能”或重启网关。OpenClaw 将发现新目录并对 `SKILL.md` 进行索引。

## 最佳实践

- **保持简洁**：指示模型做*什么*，而不是如何做一个 AI。
- **安全第一**：如果您的技能使用 `bash`，请确保提示词不允许来自不受信任用户输入的任意命令注入。
- **本地测试**：使用 `openclaw agent --message "use my new skill"` 进行测试。

## 共享技能

您也可以浏览并为 [ClawHub](https://clawhub.com) 贡献技能。

import zh from '/components/footer/zh.mdx';

<zh />
