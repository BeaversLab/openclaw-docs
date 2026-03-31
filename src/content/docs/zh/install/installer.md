---
summary: "安装程序脚本的工作原理 (install.sh, install-cli.sh, install.ps1)、标志和自动化"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "安装程序内部原理"
---

# 安装程序内部机制

OpenClaw 附带了三个安装程序脚本，由 `openclaw.ai` 提供。

| 脚本                               | 平台                 | 功能                                                                              |
| ---------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | 如果需要则安装 Node，通过 OpenClaw（默认）或 git 安装 npm，并且可以运行新手引导。 |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | 将 Node + OpenClaw 安装到本地前缀 (`~/.openclaw`) 中。无需 root 权限。            |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | 如果需要则安装 Node，通过 OpenClaw（默认）或 git 安装 npm，并且可以运行新手引导。 |

## 快速命令

<Tabs>
  <Tab title="install.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install-cli.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install.ps1">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```

    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag beta -NoOnboard -DryRun
    ```

  </Tab>
</Tabs>

<Note>如果安装成功但在新的终端中未找到 `openclaw`，请参阅 [Node.js 故障排除](/en/install/node#troubleshooting)。</Note>

---

## install.sh

<Tip>推荐用于在 macOS/Linux/WSL 上进行的大多数交互式安装。</Tip>

### 流程 (install.sh)

<Steps>
  <Step title="检测操作系统">支持 macOS 和 Linux（包括 WSL）。如果检测到 macOS，若缺少 Homebrew 则会进行安装。</Step>
  <Step title="默认确保 Node.js 24">检查 Node 版号，如果需要则安装 Node 24（macOS 上使用 Homebrew，Linux 上使用 NodeSource 设置脚本处理 apt/dnf/yum）。出于兼容性考虑，OpenClaw 目前仍支持 Node 22 LTS（`22.14+`）。</Step>
  <Step title="确保 Git">如果缺失则安装 Git。</Step>
  <Step title="安装 OpenClaw">- `npm` 方法（默认）：全局 npm 安装 - `git` 方法：克隆/更新仓库，使用 pnpm 安装依赖，构建，然后在 `~/.local/bin/openclaw` 安装包装器</Step>
  <Step title="安装后任务">- 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为） - 在适当时尝试新手引导（TTY 可用、未禁用新手引导且 bootstrap/config 检查通过） - 默认设置 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`</Step>
</Steps>

### 源码检出检测

如果在 OpenClaw 检出目录 (`package.json` + `pnpm-workspace.yaml`) 内运行，该脚本提供：

- 使用检出方式 (`git`)，或
- 使用全局安装 (`npm`)

如果没有可用的 TTY 且未设置安装方法，则默认为 `npm` 并发出警告。

如果方法选择无效或 `--install-method` 值无效，脚本将以代码 `2` 退出。

### 示例 (install.sh)

<Tabs>
  <Tab title="Default">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Skip onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Git install">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="GitHub main via npm">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="Dry run">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| 标志                                  | 描述                                              |
| ------------------------------------- | ------------------------------------------------- |
| `--install-method npm\|git`           | 选择安装方法（默认：`npm`）。别名：`--method`     |
| `--npm`                               | npm 方法的快捷方式                                |
| `--git`                               | git 方法的快捷方式。别名：`--github`              |
| `--version <version\|dist-tag\|spec>` | npm 版本、dist-tag 或包规格（默认：`latest`)      |
| `--beta`                              | 如果可用，使用 beta dist-tag，否则回退到 `latest` |
| `--git-dir <path>`                    | 检出目录（默认：`~/openclaw`）。别名：`--dir`     |
| `--no-git-update`                     | 跳过现有检出的 `git pull`                         |
| `--no-prompt`                         | 禁用提示                                          |
| `--no-onboard`                        | 跳过新手引导                                      |
| `--onboard`                           | 启用新手引导                                      |
| `--dry-run`                           | 打印操作而不应用更改                              |
| `--verbose`                           | 启用调试输出 (`set -x`，npm notice-level 日志)    |
| `--help`                              | 显示用法 (`-h`)                                   |

  </Accordion>

  <Accordion title="环境变量参考">

| Variable                                                | Description                         |
| ------------------------------------------------------- | ----------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | 安装方法                            |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | npm 版本、dist-tag 或 package spec  |
| `OPENCLAW_BETA=0\|1`                                    | 如果可用则使用 Beta 版本            |
| `OPENCLAW_GIT_DIR=<path>`                               | 检出目录                            |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | 切换 git 更新                       |
| `OPENCLAW_NO_PROMPT=1`                                  | 禁用提示                            |
| `OPENCLAW_NO_ONBOARD=1`                                 | 跳过新手引导                        |
| `OPENCLAW_DRY_RUN=1`                                    | 试运行模式                          |
| `OPENCLAW_VERBOSE=1`                                    | 调试模式                            |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | npm 日志级别                        |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | 控制 sharp/libvips 行为 (默认: `1`) |

  </Accordion>
</AccordionGroup>

---

## install-cli.sh

<Info>专为希望将所有内容置于本地前缀（默认为 `~/.openclaw`）下且无系统 Node 依赖项的环境而设计。</Info>

### Flow (install-cli.sh)

<Steps>
  <Step title="安装本地 Node 运行时">
    下载固定的受支持 Node LTS tarball（该版本内嵌在脚本中并独立更新）到 `<prefix>/tools/node-v<version>` 并验证 SHA-256。
  </Step>
  <Step title="确保 Git">
    如果缺少 Git，则尝试通过 Linux 上的 apt/dnf/yum 或 macOS 上的 Homebrew 进行安装。
  </Step>
  <Step title="在前缀下安装 OpenClaw">
    使用 npm 通过 `--prefix <prefix>` 安装，然后将包装器写入 `<prefix>/bin/openclaw`。
  </Step>
</Steps>

### 示例 (install-cli.sh)

<Tabs>
  <Tab title="Default">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="Custom prefix + version">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Automation JSON output">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="Run onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| 标志                   | 描述                                                               |
| ---------------------- | ------------------------------------------------------------------ |
| `--prefix <path>`      | 安装前缀（默认：`~/.openclaw`）                                    |
| `--version <ver>`      | OpenClaw 版本或 dist-tag（默认：`latest`）                         |
| `--node-version <ver>` | Node 版本（默认：`22.22.0`）                                       |
| `--json`               | 发出 NDJSON 事件                                                   |
| `--onboard`            | 安装后运行 `openclaw onboard`                                      |
| `--no-onboard`         | 跳过新手引导（默认）                                               |
| `--set-npm-prefix`     | 在 Linux 上，如果当前前缀不可写，则强制 npm 前缀为 `~/.npm-global` |
| `--help`               | 显示用法（`-h`）                                                   |

  </Accordion>

  <Accordion title="环境变量参考">

| Variable                                    | Description                                            |
| ------------------------------------------- | ------------------------------------------------------ |
| `OPENCLAW_PREFIX=<path>`                    | 安装前缀                                               |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw 版本或分发标签                                |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node 版本                                              |
| `OPENCLAW_NO_ONBOARD=1`                     | 跳过新手引导                                           |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm 日志级别                                           |
| `OPENCLAW_GIT_DIR=<path>`                   | 旧版清理查找路径（用于删除旧的 `Peekaboo` 子模块检出） |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | 控制 sharp/libvips 行为（默认：`1`）                   |

  </Accordion>
</AccordionGroup>

---

## install.ps1

### Flow (install.ps1)

<Steps>
  <Step title="确保 PowerShell + Windows 环境">需要 PowerShell 5+。</Step>
  <Step title="默认确保 Node.js 24">如果缺失，尝试通过 winget、然后 Chocolatey、再然后 Scoop 进行安装。出于兼容性考虑，目前仍支持 Node 22 LTS（`22.14+`）。</Step>
  <Step title="安装 OpenClaw">- `npm` 方法（默认）：使用所选 `-Tag` 进行全局 npm 安装 - `git` 方法：克隆/更新仓库，使用 pnpm 安装/构建，并在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安装包装脚本</Step>
  <Step title="安装后任务">在可能的情况下，将所需的 bin 目录添加到用户 PATH 中，然后在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为）。</Step>
</Steps>

### 示例

<Tabs>
  <Tab title="Default">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git install">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="GitHub main via npm">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="Custom git directory">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="Dry run">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="Debug trace">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| 标志                        | 描述                                                |
| --------------------------- | --------------------------------------------------- |
| `-InstallMethod npm\|git`   | 安装方法（默认：`npm`）                             |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或 package spec（默认：`latest`） |
| `-GitDir <path>`            | Checkout 目录（默认：`%USERPROFILE%\openclaw`）     |
| `-NoOnboard`                | 跳过新手引导                                        |
| `-NoGitUpdate`              | 跳过 `git pull`                                     |
| `-DryRun`                   | 仅打印操作                                          |

  </Accordion>

  <Accordion title="环境变量参考">

| 变量                               | 描述          |
| ---------------------------------- | ------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安装方法      |
| `OPENCLAW_GIT_DIR=<path>`          | Checkout 目录 |
| `OPENCLAW_NO_ONBOARD=1`            | 跳过新手引导  |
| `OPENCLAW_GIT_UPDATE=0`            | 禁用 git pull |
| `OPENCLAW_DRY_RUN=1`               | 试运行模式    |

  </Accordion>
</AccordionGroup>

<Note>如果使用了 `-InstallMethod git` 但缺少 Git，脚本将退出并打印 Git for Windows 的链接。</Note>

---

## CI 和自动化

使用非交互式标志/环境变量以获得可预测的运行结果。

<Tabs>
  <Tab title="install.sh (non-interactive npm)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard ```</Tab>
  <Tab title="install.sh (non-interactive git)">```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="install-cli.sh (JSON)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="install.ps1 (skip onboarding)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

---

## 故障排除

<AccordionGroup>
  <Accordion title="为什么需要 Git？">
    `git` 安装方式需要 Git。对于 `npm` 安装，仍然会检查/安装 Git，以避免在依赖项使用 git URL 时发生 `spawn git ENOENT` 失败。
  </Accordion>

<Accordion title="为什么 npm 在 Linux 上遇到 EACCES？">某些 Linux 设置将 npm 全局前缀指向 root 拥有的路径。`install.sh` 可以将前缀切换到 `~/.npm-global` 并将 PATH 导出附加到 shell rc 文件（当这些文件存在时）。</Accordion>

  <Accordion title="sharp/libvips 问题">
    脚本默认 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 以避免 sharp 针对系统 libvips 进行构建。要覆盖此设置：

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title='Windows: "npm error spawn git / ENOENT"'>安装 Git for Windows，重新打开 PowerShell，重新运行安装程序。</Accordion>

<Accordion title='Windows: "openclaw is not recognized"'>运行 `npm config get prefix` 并将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀），然后重新打开 PowerShell。</Accordion>

  <Accordion title="Windows: 如何获取详细的安装程序输出">
    `install.ps1` 目前不暴露 `-Verbose` 开关。
    使用 PowerShell 跟踪进行脚本级诊断：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="安装后找不到 openclaw">
    通常是 PATH 问题。请参阅 [Node.js 故障排除](/en/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>
