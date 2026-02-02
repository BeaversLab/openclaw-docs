---
title: "Installer Internals"
summary: "安装器脚本的工作方式（install.sh + install-cli.sh）、flags 与自动化"
read_when:
  - 你想了解 `openclaw.bot/install.sh`
  - 你想自动化安装（CI / 无头环境）
  - 你想从 GitHub checkout 安装
---

# 安装器内部结构

OpenClaw 提供两个安装脚本（由 `openclaw.ai` 提供）：

- `https://openclaw.bot/install.sh` — “推荐”安装器（默认全局 npm 安装；也可从 GitHub checkout 安装）
- `https://openclaw.bot/install-cli.sh` — 适合非 root 的 CLI 安装器（安装到带自带 Node 的 prefix）
 - `https://openclaw.ai/install.ps1` — Windows PowerShell 安装器（默认 npm；可选 git 安装）

查看当前 flags/行为：

```bash
curl -fsSL https://openclaw.bot/install.sh | bash -s -- --help
```

Windows（PowerShell）帮助：

```powershell
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -?
```

如果安装完成但新终端找不到 `openclaw`，通常是 Node/npm 的 PATH 问题。见：[Install](/zh/install#nodejs--npm-path-sanity)。

## install.sh（推荐）

它做什么（高层）：

- 检测 OS（macOS / Linux / WSL）。
- 确保 Node.js **22+**（macOS 用 Homebrew；Linux 用 NodeSource）。
- 选择安装方式：
  - `npm`（默认）：`npm install -g openclaw@latest`
  - `git`：clone/build 源码 checkout 并安装包装脚本
- 在 Linux 上：当 npm 全局安装权限不足时，切换 npm prefix 到 `~/.npm-global`。
- 若升级已有安装：运行 `openclaw doctor --non-interactive`（尽力而为）。
- 对 git 安装：安装/更新后运行 `openclaw doctor --non-interactive`（尽力而为）。
- 通过默认 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 规避 `sharp` 原生安装坑（避免链接系统 libvips）。

如果你*想要* `sharp` 链接全局安装的 libvips（或在调试），设置：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL https://openclaw.bot/install.sh | bash
```

### 可发现性 / “git install” 提示

如果你在**已存在的 OpenClaw 源码 checkout** 内运行安装器（通过 `package.json` + `pnpm-workspace.yaml` 检测），它会提示：

- 更新并使用该 checkout（`git`）
- 或迁移到全局 npm 安装（`npm`）

在非交互环境（无 TTY / `--no-prompt`）中，你必须传 `--install-method git|npm`（或设置 `OPENCLAW_INSTALL_METHOD`），否则脚本会以退出码 `2` 结束。

### 为什么需要 Git

`--install-method git` 路径需要 Git（clone / pull）。

对 `npm` 安装来说，通常不需要 Git，但某些环境仍可能需要（例如包或依赖通过 git URL 获取）。安装器当前会确保 Git 可用，以避免在新系统上出现 `spawn git ENOENT`。

### 为什么 npm 在新 Linux 上会 `EACCES`

在一些 Linux 环境中（尤其是用系统包管理器或 NodeSource 安装 Node 后），npm 的全局 prefix 指向 root 拥有的位置，导致 `npm install -g ...` 失败并报 `EACCES` / `mkdir` 权限错误。

`install.sh` 通过切换 prefix 缓解：

- `~/.npm-global`（并将其加入 `PATH`，写入 `~/.bashrc` / `~/.zshrc`，若文件存在）

## install-cli.sh（非 root CLI 安装器）

该脚本把 `openclaw` 安装到一个 prefix（默认：`~/.openclaw`），并在该 prefix 下安装专用 Node 运行时，因此适用于你不想动系统 Node/npm 的机器。

帮助：

```bash
curl -fsSL https://openclaw.bot/install-cli.sh | bash -s -- --help
```

## install.ps1（Windows PowerShell）

它做什么（高层）：

- 确保 Node.js **22+**（winget/Chocolatey/Scoop 或手动）。
- 选择安装方式：
  - `npm`（默认）：`npm install -g openclaw@latest`
  - `git`：clone/build 源码 checkout 并安装包装脚本
- 在升级与 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为）。

示例：

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex -InstallMethod git
```

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex -InstallMethod git -GitDir "C:\openclaw"
```

环境变量：

- `OPENCLAW_INSTALL_METHOD=git|npm`
- `OPENCLAW_GIT_DIR=...`

Git 依赖：

如果你选择 `-InstallMethod git` 但未安装 Git，安装器会打印 Git for Windows 的链接（`https://git-scm.com/download/win`）并退出。

常见 Windows 问题：

- **npm error spawn git / ENOENT**：安装 Git for Windows，重开 PowerShell，然后重跑安装器。
- **“openclaw” is not recognized**：你的 npm 全局 bin 目录不在 PATH。多数系统是
  `%AppData%\npm`。也可以运行 `npm config get prefix` 并把 `\bin` 加入 PATH，然后重启 PowerShell。
