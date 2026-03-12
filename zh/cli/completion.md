---
summary: "`openclaw completion` 的 CLI 参考（生成/安装 Shell 补全脚本）"
read_when:
  - You want shell completions for zsh/bash/fish/PowerShell
  - You need to cache completion scripts under OpenClaw state
title: 补全
---

# `openclaw completion`

生成 Shell 补全脚本，并可选择将其安装到您的 Shell 配置文件中。

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

- `-s, --shell <shell>`：Shell 目标（`zsh`、`bash`、`powershell`、`fish`；默认值：`zsh`）
- `-i, --install`：通过向 Shell 配置文件添加 source 行来安装补全
- `--write-state`：将补全脚本写入 `$OPENCLAW_STATE_DIR/completions` 而不打印到标准输出
- `-y, --yes`：跳过安装确认提示

## 注意

- `--install` 会在您的 Shell 配置文件中写入一个小的“OpenClaw 补全”块，并将其指向缓存的脚本。
- 如果没有使用 `--install` 或 `--write-state`，该命令会将脚本打印到标准输出。
- 生成补全会急切加载命令树，以便包含嵌套的子命令。
