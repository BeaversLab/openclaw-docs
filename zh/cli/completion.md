---
summary: "CLI 参考手册，用于 `openclaw completion`（生成/安装 Shell 自动补全脚本）"
read_when:
  - 您需要为 zsh/bash/fish/PowerShell 配置 Shell 自动补全
  - 您需要在 OpenClaw 状态下缓存自动补全脚本
title: "completion"
---

# `openclaw completion`

生成 Shell 自动补全脚本，并可选择将其安装到您的 Shell 配置文件中。

## 用法

```bash
openclaw completion
openclaw completion --shell zsh
openclaw completion --install
openclaw completion --shell fish --install
openclaw completion --write-state
openclaw completion --shell bash --write-state
```

## 选项

- `-s, --shell <shell>`: Shell 目标 (`zsh`, `bash`, `powershell`, `fish`; 默认: `zsh`)
- `-i, --install`: 通过向 Shell 配置文件添加 source 行来安装自动补全
- `--write-state`: 将自动补全脚本写入 `$OPENCLAW_STATE_DIR/completions` 而不打印到 stdout
- `-y, --yes`: 跳过安装确认提示

## 说明

- `--install` 会在您的 Shell 配置文件中写入一个小的 "OpenClaw Completion" 块，并将其指向缓存的脚本。
- 如果不使用 `--install` 或 `--write-state`，该命令会将脚本打印到 stdout。
- 自动补全的生成会急切地（eagerly）加载命令树，以便包含嵌套的子命令。

import en from "/components/footer/en.mdx";

<en />
