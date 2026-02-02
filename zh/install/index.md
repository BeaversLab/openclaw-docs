---
summary: "安装 OpenClaw（推荐安装器、全局安装或从源码）"
read_when:
  - 安装 OpenClaw
  - 你想从 GitHub 安装
title: "Install"
---

# 安装

除非你有明确理由，否则使用安装器。它会设置 CLI 并运行 onboarding。

## 快速安装（推荐）

```bash
curl -fsSL https://openclaw.bot/install.sh | bash
```

Windows（PowerShell）：

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

下一步（若跳过了 onboarding）：

```bash
openclaw onboard --install-daemon
```

## 系统要求

- **Node >=22**
- macOS、Linux 或通过 WSL2 的 Windows
- 仅在从源码构建时需要 `pnpm`

## 选择安装方式

### 1) 安装器脚本（推荐）

通过 npm 全局安装 `openclaw` 并运行 onboarding。

```bash
curl -fsSL https://openclaw.bot/install.sh | bash
```

安装器 flags：

```bash
curl -fsSL https://openclaw.bot/install.sh | bash -s -- --help
```

细节：[Installer internals](/zh/install/installer)。

非交互（跳过 onboarding）：

```bash
curl -fsSL https://openclaw.bot/install.sh | bash -s -- --no-onboard
```

### 2) 全局安装（手动）

如果你已经有 Node：

```bash
npm install -g openclaw@latest
```

如果你全局安装了 libvips（macOS 上通过 Homebrew 常见），且 `sharp` 安装失败，可强制使用预编译二进制：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
```

如果你看到 `sharp: Please add node-gyp to your dependencies`，请安装构建工具（macOS：Xcode CLT + `npm install -g node-gyp`），或使用上面的 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 方案跳过原生构建。

或者：

```bash
pnpm add -g openclaw@latest
```

然后：

```bash
openclaw onboard --install-daemon
```

### 3) 从源码（贡献者/开发）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
openclaw onboard --install-daemon
```

提示：如果尚未全局安装，可通过 `pnpm openclaw ...` 运行仓库命令。

### 4) 其他安装选项

- Docker：[Docker](/zh/install/docker)
- Nix：[Nix](/zh/install/nix)
- Ansible：[Ansible](/zh/install/ansible)
- Bun（仅 CLI）：[Bun](/zh/install/bun)

## 安装后

- 运行 onboarding：`openclaw onboard --install-daemon`
- 快速检查：`openclaw doctor`
- 检查 gateway 健康：`openclaw status` + `openclaw health`
- 打开仪表盘：`openclaw dashboard`

## 安装方式：npm vs git（安装器）

安装器支持两种方式：

- `npm`（默认）：`npm install -g openclaw@latest`
- `git`：从 GitHub clone/build 并从源码 checkout 运行

### CLI flags

```bash
# 显式 npm
curl -fsSL https://openclaw.bot/install.sh | bash -s -- --install-method npm

# 从 GitHub 安装（源码 checkout）
curl -fsSL https://openclaw.bot/install.sh | bash -s -- --install-method git
```

常用 flags：

- `--install-method npm|git`
- `--git-dir <path>`（默认：`~/openclaw`）
- `--no-git-update`（使用现有 checkout 时跳过 `git pull`）
- `--no-prompt`（禁用提示；CI/自动化中必需）
- `--dry-run`（仅输出将执行的步骤，不做改动）
- `--no-onboard`（跳过 onboarding）

### 环境变量

等价环境变量（适用于自动化）：

- `OPENCLAW_INSTALL_METHOD=git|npm`
- `OPENCLAW_GIT_DIR=...`
- `OPENCLAW_GIT_UPDATE=0|1`
- `OPENCLAW_NO_PROMPT=1`
- `OPENCLAW_DRY_RUN=1`
- `OPENCLAW_NO_ONBOARD=1`
- `SHARP_IGNORE_GLOBAL_LIBVIPS=0|1`（默认：`1`；避免 `sharp` 使用系统 libvips 构建）

## 故障排查：找不到 `openclaw`（PATH）

快速诊断：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin`（macOS/Linux）或 `$(npm prefix -g)`（Windows）**不在** `echo "$PATH"` 中，说明 shell 无法找到全局 npm 二进制（包含 `openclaw`）。

修复：把它加入 shell 启动文件（zsh：`~/.zshrc`，bash：`~/.bashrc`）：

```bash
# macOS / Linux
export PATH="$(npm prefix -g)/bin:$PATH"
```

Windows 上，将 `npm prefix -g` 的输出加入 PATH。

然后打开新终端（或在 zsh 中 `rehash` / bash 中 `hash -r`）。

## 更新 / 卸载

- 更新：[Updating](/zh/install/updating)
- 迁移到新机器：[Migrating](/zh/install/migrating)
- 卸载：[Uninstall](/zh/install/uninstall)
