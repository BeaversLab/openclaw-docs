---
summary: "安装程序脚本的工作原理 (install.sh, install-cli.sh, install.ps1)、标志和自动化"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "安装程序内部原理"
---

OpenClaw 提供三个安装程序脚本，通过 `openclaw.ai` 提供服务。

| 脚本                               | 平台                 | 功能                                                                                             |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | 如需要则安装 Node，通过 OpenClaw（默认）或 git 安装 npm，并可运行新手引导。                      |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | 使用 OpenClaw 或 git 检出模式，将 Node + npm 安装到本地前缀 (`~/.openclaw`) 中。无需 root 权限。 |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | 如需要则安装 Node，通过 OpenClaw（默认）或 git 安装 npm，并可运行新手引导。                      |

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

<Note>如果安装成功但在新的终端中未找到 `openclaw`Node.js，请参阅 [Node.js 故障排除](/zh/install/node#troubleshooting)。</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>推荐用于 macOS/Linux/WSL 上的大多数交互式安装。</Tip>

### Flow (install.sh)

<Steps>
  <Step title="检测 OS">
    支持 macOS 和 Linux (包括 WSL)。如果检测到 macOS，会在缺少时安装 Homebrew。
  </Step>
  <Step title="Node.js确保默认使用 Node.js 24"macOSLinuxOpenClaw>
    检查 Node 版本并在需要时安装 Node 24（macOS 上使用 Homebrew，Linux apt/dnf/yum 上使用 NodeSource 安装脚本）。为了兼容性，OpenClaw 目前仍支持 Node 22 LTS，即 `22.16+`。
  </Step>
  <Step title="确保 Git">
    如果缺少则安装 Git。
  </Step>
  <Step title="OpenClaw安装 OpenClaw">
    - `npm`npm 方法（默认）：全局 npm 安装
    - `git` 方法：克隆/更新仓库，使用 pnpm 安装依赖，构建，然后在 `~/.local/bin/openclaw` 安装包装器

  </Step>
  <Step title="安装后任务">
    - 尽力刷新已加载的网关服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力尝试）
    - 在适当时尝试进行新手引导（TTY 可用、未禁用新手引导，且 bootstrap/config 检查通过）
    - 默认为 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`

  </Step>
</Steps>

### Source checkout detection

如果在 OpenClaw 检出版本内运行（`package.json` + `pnpm-workspace.yaml`），脚本将提供：

- 使用检出版本（`git`），或
- 使用全局安装（`npm`）

如果没有可用的 TTY 且未设置安装方法，则默认为 `npm` 并发出警告。

如果方法选择无效或 `--install-method` 值无效，脚本将以代码 `2` 退出。

### 示例 (install.sh)

<Tabs>
  <Tab title="默认">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="跳过新手引导">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Git 安装">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="通过 GitHub 安装 npm 主分支">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="试运行">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| 标志                                  | 描述                                              |
| ------------------------------------- | ------------------------------------------------- |
| `--install-method npm\|git`           | 选择安装方法（默认：`npm`）。别名：`--method`     |
| `--npm`                               | npm 方法的快捷方式                                |
| `--git`                               | git 方法的快捷方式。别名：`--github`              |
| `--version <version\|dist-tag\|spec>` | npm 版本、dist-tag 或包规格（默认：`latest`）     |
| `--beta`                              | 如果可用，使用 beta dist-tag，否则回退到 `latest` |
| `--git-dir <path>`                    | 检出目录（默认：`~/openclaw`）。别名：`--dir`     |
| `--no-git-update`                     | 对现有检出跳过 `git pull`                         |
| `--no-prompt`                         | 禁用提示                                          |
| `--no-onboard`                        | 跳过新手引导                                      |
| `--onboard`                           | 启用新手引导                                      |
| `--dry-run`                           | 打印操作而不应用更改                              |
| `--verbose`                           | 启用调试输出（`set -x`，npm 通知级别日志）        |
| `--help`                              | 显示用法（`-h`）                                  |

  </Accordion>

  <Accordion title="Environment variables reference">

| Variable                                                | Description                         |
| ------------------------------------------------------- | ----------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | 安装方法                            |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | npm 版本、dist-tag 或 package spec  |
| `OPENCLAW_BETA=0\|1`                                    | 如果可用则使用 beta 版本            |
| `OPENCLAW_GIT_DIR=<path>`                               | 检出目录                            |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | 切换 git 更新                       |
| `OPENCLAW_NO_PROMPT=1`                                  | 禁用提示                            |
| `OPENCLAW_NO_ONBOARD=1`                                 | 跳过 新手引导                       |
| `OPENCLAW_DRY_RUN=1`                                    | 试运行模式                          |
| `OPENCLAW_VERBOSE=1`                                    | 调试模式                            |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | npm 日志级别                        |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | 控制 sharp/libvips 行为 (默认: `1`) |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>专为需要将所有内容置于本地前缀 (default `~/.openclaw`) 下且无系统 Node 依赖的环境而设计。默认支持 npm 安装， 以及在相同前缀流程下的 git-checkout 安装。</Info>

### Flow (install-cli.sh)

<Steps>
  <Step title="Install local Node runtime">
    下载一个固定的受支持的 Node LTS tarball (版本内嵌在脚本中并独立更新) 到 `<prefix>/tools/node-v<version>` 并验证 SHA-256。
  </Step>
  <Step title="Ensure Git">
    如果缺少 Git，会尝试通过 apt/dnf/yum 在 Linux 上或通过 Homebrew 在 macOS 上进行安装。
  </Step>
  <Step title="OpenClaw在指定前缀下安装 OpenClaw">
    - `npm`npm 方法（默认）：使用 npm 在前缀下安装，然后将包装器写入 `<prefix>/bin/openclaw`
    - `git` 方法：克隆/更新检出版本（默认为 `~/openclaw`），仍然将包装器写入 `<prefix>/bin/openclaw`

  </Step>
  <Step title="Refresh loaded gateway service">
    如果已从同一前缀加载了网关服务，脚本将运行
    `openclaw gateway install --force`，然后运行 `openclaw gateway restart`，并
    尽最大努力探测网关健康状况。
  </Step>
</Steps>

### 示例 (install-cli.sh)

<Tabs>
  <Tab title="默认">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="自定义前缀 + 版本">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Git 安装">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw ```</Tab>
  <Tab title="自动化 JSON 输出">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="运行新手引导">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| 标志                        | 描述                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| `--prefix <path>`           | 安装前缀（默认：`~/.openclaw`）                                      |
| `--install-method npm\|git` | 选择安装方法（默认：`npm`）。别名：`--method`                        |
| `--npm`                     | npm 方法的快捷方式                                                   |
| `--git`, `--github`         | git 方法的快捷方式                                                   |
| `--git-dir <path>`          | Git 检出目录（默认：`~/openclaw`）。别名：`--dir`                    |
| `--version <ver>`           | OpenClaw 版本或分发标签（默认：`latest`）                            |
| `--node-version <ver>`      | Node 版本（默认：`22.22.0`）                                         |
| `--json`                    | 发出 NDJSON 事件                                                     |
| `--onboard`                 | 安装后运行 `openclaw onboard`                                        |
| `--no-onboard`              | 跳过新手引导（默认）                                                 |
| `--set-npm-prefix`          | 在 Linux 上，如果当前前缀不可写，强制将 npm 前缀设为 `~/.npm-global` |
| `--help`                    | 显示用法（`-h`）                                                     |

  </Accordion>

  <Accordion title="Environment variables reference">

| Variable                                    | Description                                   |
| ------------------------------------------- | --------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | Install prefix                                |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | Install method                                |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw version or dist-tag                  |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node version                                  |
| `OPENCLAW_GIT_DIR=<path>`                   | Git checkout directory for git installs       |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | Toggle git updates for existing checkouts     |
| `OPENCLAW_NO_ONBOARD=1`                     | Skip 新手引导                                 |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm log level                                 |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | Control sharp/libvips behavior (default: `1`) |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### Flow (install.ps1)

<Steps>
  <Step title="Ensure PowerShell + Windows environment">
    Requires PowerShell 5+.
  </Step>
  <Step title="Node.js确保默认使用 Node.js 24">
    如果缺失，尝试通过 winget 安装，然后是 Chocolatey，接着是 Scoop。Node 22 LTS（目前为 `22.16+`）为了兼容性仍受支持。
  </Step>
  <Step title="OpenClaw安装 OpenClaw">
    - `npm`npm 方法（默认）：使用选定的 `-Tag` 进行全局 npm 安装，从可写的安装程序临时目录启动，以便在受保护文件夹（如 `C:\`）中打开的 shell 仍然可以工作
    - `git` 方法：克隆/更新仓库，使用 pnpm 安装/构建，并在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安装包装器

  </Step>
  <Step title="安装后任务">
    - 尽可能将所需的 bin 目录添加到用户 PATH
    - 尽力刷新已加载的网关服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为）

  </Step>
  <Step title="处理失败">
    `iwr ... | iex` 和脚本块安装会报告终止错误而不关闭当前的 PowerShell 会话。直接的 `powershell -File` / `pwsh -File` 安装仍会以非零状态退出以用于自动化。
  </Step>
</Steps>

### 示例 (install.ps1)

<Tabs>
  <Tab title="默认">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git 安装">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="通过 GitHub 安装 main 分支">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="自定义 git 目录">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="试运行">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="调试跟踪">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| 标志                           | 描述                                         |
| ------------------------------ | -------------------------------------------- |
| `-InstallMethod npm\|git`      | 安装方法（默认：`npm`）                      |
| `-Tag <tag\|version\|spec>`npm | npm dist-tag、版本或包规范（默认：`latest`） |
| `-GitDir <path>`               | 检出目录（默认：`%USERPROFILE%\openclaw`）   |
| `-NoOnboard`                   | 跳过新手引导                                 |
| `-NoGitUpdate`                 | 跳过 `git pull`                              |
| `-DryRun`                      | 仅打印操作                                   |

  </Accordion>

  <Accordion title="环境变量参考">

| 变量                               | 描述          |
| ---------------------------------- | ------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安装方法      |
| `OPENCLAW_GIT_DIR=<path>`          | 检出目录      |
| `OPENCLAW_NO_ONBOARD=1`            | 跳过新手引导  |
| `OPENCLAW_GIT_UPDATE=0`            | 禁用 git pull |
| `OPENCLAW_DRY_RUN=1`               | 试运行模式    |

  </Accordion>
</AccordionGroup>

<Note>如果使用了 `-InstallMethod git`Windows 但缺少 Git，脚本将退出并打印 Git for Windows 的链接。</Note>

---

## CI 和自动化

使用非交互式标志/环境变量以获得可预测的运行结果。

<Tabs>
  <Tab title="install.sh (非交互式 npm)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard ```</Tab>
  <Tab title="install.sh (非交互式 git)">```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="install-cli.sh (JSON)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="install.ps1 (跳过新手引导)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

---

## 故障排除

<AccordionGroup>
  <Accordion title="为什么需要 Git？">
    `git` 安装方法需要 Git。对于 `npm` 安装，仍然会检查/安装 Git，以避免当依赖项使用 git URL 时出现 `spawn git ENOENT` 失败。
  </Accordion>

<Accordion title="npmLinux为什么 npm 在 Linux 上会遇到 EACCES 错误？" Linuxnpm>
  某些 Linux 设置将 npm 全局前缀指向 root 拥有的路径。`install.sh` 可以将前缀切换到 `~/.npm-global` 并将 PATH 导出项追加到 shell rc 文件（当这些文件存在时）。
</Accordion>

  <Accordion title="sharp/libvips 问题">
    脚本默认 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 以避免 sharp 针对系统 libvips 进行构建。如需覆盖此设置：

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title='Windows: "npm error spawn git / ENOENT"'>为 Windows 安装 Git，重新打开 PowerShell，然后重新运行安装程序。</Accordion>

<Accordion title="Windows：“未识别出 openclaw”">运行 `npm config get prefix` 并将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀），然后重新打开 PowerShell。</Accordion>

  <Accordion title="Windows：如何获取详细的安装程序输出">
    `install.ps1` 目前未公开 `-Verbose` 开关。
    使用 PowerShell 跟踪进行脚本级诊断：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="安装后未找到 openclaw">
    通常是 PATH 问题。请参阅 [Node.js 故障排除](/zh/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>

## 相关

- [安装概述](/zh/install)
- [更新](/zh/install/updating)
- [卸载](/zh/install/uninstall)
