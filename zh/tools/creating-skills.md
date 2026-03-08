---
title: "创建技能"
---

# 创建自定义技能 🛠

OpenClaw 旨在易于扩展。技能是为您的助手添加新功能的主要方式。

## 什么是技能？

技能是一个包含 `SKILL.md` 文件（向 LLM 提供指令和工具定义）的目录，以及一些可选的脚本或资源。

## 逐步指南：您的第一个技能

### 1. 创建目录

技能位于您的工作区中，通常为 `~/.openclaw/workspace/skills/`。为您的技能创建一个新文件夹：

```bash
mkdir -p ~/.openclaw/workspace/skills/hello-world
```

### 2. 定义 `SKILL.md`

在该目录中创建 `SKILL.md` 文件。该文件使用 YAML frontmatter 作为元数据，使用 Markdown 作为指令。

```markdown
---
name: hello_world
description: A simple skill that says hello.
---

# Hello World Skill

When the user asks for a greeting, use the `echo` tool to say "Hello from your custom skill!".
```

### 3. 添加工具（可选）

您可以在 frontmatter 中定义自定义工具，或指示 agent 使用现有的系统工具（如 `bash` 或 `browser`）。

### 4. 刷新 OpenClaw

让您的 agent 刷新技能 或重启 gateway。OpenClaw 将发现新目录并索引 `SKILL.md`。

## 最佳实践

- **简洁明了**：指示模型做*什么*，而不是如何成为 AI。
- **安全第一**：如果您的技能使用 `bash`，确保提示不允许来自不受信任的用户输入的任意命令注入。
- **本地测试**：使用 `openclaw agent --message "use my new skill"` 进行测试。

## 共享技能

您还可以浏览和贡献技能到 [ClawHub](https://clawhub.com)。
