---
title: "Creating Skills"
summary: "Build and test custom workspace skills with SKILL.md"
read_when:
  - 您正在您的工作區中建立一個新的自訂技能
  - 您需要針對基於 SKILL.md 的技能的快速入門工作流程
---

# 建立自訂技能 🛠

OpenClaw 的設計使其易於擴充。「技能」是為您的助手新增功能的主要方式。

## 什麼是技能？

技能是一個包含 `SKILL.md` 檔案（為 LLM 提供指令和工具定義）以及可選的一些腳本或資源的目錄。

## 逐步操作：您的第一個技能

### 1. 建立目錄

技能位於您的工作區中，通常在 `~/.openclaw/workspace/skills/`。為您的技能建立一個新資料夾：

```bash
mkdir -p ~/.openclaw/workspace/skills/hello-world
```

### 2. 定義 `SKILL.md`

在該目錄中建立一個 `SKILL.md` 檔案。此檔案使用 YAML frontmatter 作為元數據，並使用 Markdown 撰寫指令。

```markdown
---
name: hello_world
description: A simple skill that says hello.
---

# Hello World Skill

When the user asks for a greeting, use the `echo` tool to say "Hello from your custom skill!".
```

### 3. 新增工具（選用）

您可以在 frontmatter 中定義自訂工具，或指示代理程式使用現有的系統工具（例如 `bash` 或 `browser`）。

### 4. 重新整理 OpenClaw

要求您的代理程式「重新整理技能」或重新啟動閘道。OpenClaw 將會發現新目錄並為 `SKILL.md` 建立索引。

## 最佳實踐

- **簡明扼要**：指示模型要做「什麼」，而不是如何成為一個 AI。
- **安全第一**：如果您的技能使用 `bash`，請確保提示不允許來自不受信任的使用者輸入的任意指令注入。
- **本地測試**：使用 `openclaw agent --message "use my new skill"` 進行測試。

## 共享技能

您也可以瀏覽並為 [ClawHub](https://clawhub.com) 貢獻技能。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
