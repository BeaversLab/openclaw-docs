> [!NOTE]
> 本页正在翻译中。

---
title: "Node.js + npm（PATH 自检）"
summary: "Node.js + npm 安装自检：版本、PATH 与全局安装"
read_when:
  - "你安装了 OpenClaw 但 `openclaw` 提示 ‘command not found’"
  - "你在新机器上配置 Node.js/npm"
  - "npm install -g ... 遇到权限或 PATH 问题"
---

# Node.js + npm（PATH 自检）

OpenClaw 运行时基线是 **Node 22+**。

如果你能运行 `npm install -g openclaw@latest`，但随后提示 `openclaw: command not found`，几乎总是 **PATH** 问题：npm 放全局二进制的目录没有在你的 shell PATH 中。

## 快速诊断

运行：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin`（macOS/Linux）或 `$(npm prefix -g)`（Windows）**不在** `echo "$PATH"` 中，说明 shell 找不到全局 npm 二进制（包括 `openclaw`）。

## 修复：把 npm 的全局 bin 目录加入 PATH

1) 找出你的全局 npm prefix：

```bash
npm prefix -g
```

2) 把全局 npm 的 bin 目录加入 shell 启动文件：

- zsh：`~/.zshrc`
- bash：`~/.bashrc`

示例（把路径替换为你的 `npm prefix -g` 输出）：

```bash
# macOS / Linux
export PATH="/path/from/npm/prefix/bin:$PATH"
```

然后打开一个**新终端**（或在 zsh 中 `rehash` / 在 bash 中 `hash -r`）。

Windows 上，把 `npm prefix -g` 的输出加入 PATH。

## 修复：避免 `sudo npm install -g` / 权限错误（Linux）

如果 `npm install -g ...` 报 `EACCES`，把 npm 的全局 prefix 改为可写目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

将 `export PATH=...` 持久化到你的 shell 启动文件。

## 推荐的 Node 安装方式

安装 Node/npm 时，尽量保证：

- Node 可持续更新（22+）
- 全局 npm bin 目录稳定且在新 shell 中可用

常见选择：

- macOS：Homebrew（`brew install node`）或版本管理器
- Linux：你偏好的版本管理器，或能提供 Node 22+ 的发行版安装方式
- Windows：官方 Node 安装器、`winget`，或 Windows 版 Node 版本管理器

如果你使用版本管理器（nvm/fnm/asdf 等），确保它在你日常使用的 shell（zsh vs bash）中被初始化，这样 PATH 才会在运行安装器时生效。
