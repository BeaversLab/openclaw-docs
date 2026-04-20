---
summary: "安装程序脚本的工作原理 (install.sh, install-cli.sh, install.ps1)、标志和自动化"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "安装程序内部原理"
---

# 安装程序内部机制

OpenClaw 提供了三个安装程序脚本，从 `openclaw.ai` 提供。

| 脚本                               | 平台                 | 功能                                                                                               |
| ---------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | 如果需要则安装 Node，通过 OpenClaw（默认）或 git 安装 npm，并且可以运行新手引导。                  |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | 将 Node + OpenClaw 安装到本地前缀 (`~/.openclaw`)，支持 npm 或 git checkout 模式。无需 root 权限。 |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | 如果需要则安装 Node，通过 OpenClaw（默认）或 git 安装 npm，并且可以运行新手引导。                  |

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

<Note>如果安装成功但在新终端中找不到 `openclaw`，请参阅 [Node.js 故障排除](/zh/install/node#troubleshooting)。</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>推荐用于大多数在 macOS/Linux/WSL 上的交互式安装。</Tip>

### 流程 (install.sh)

<Steps>
  <Step title="检测操作系统">支持 macOS 和 Linux（包括 WSL）。如果检测到 macOS，在缺失时安装 Homebrew。</Step>
  <Step title="默认确保 Node.js 版本为 24">检查 Node 版本并在需要时安装 Node 24（在 macOS 上使用 Homebrew，在 Linux 上使用 NodeSource 设置脚本 apt/dnf/yum）。OpenClaw 目前仍支持 Node 22 LTS，当前为 `22.14+`，以确保兼容性。</Step>
  <Step title="确保 Git">如果缺失则安装 Git。</Step>
  <Step title="安装 OpenClaw">- `npm` 方法（默认）：全局 npm 安装 - `git` 方法：克隆/更新仓库，使用 pnpm 安装依赖，构建，然后在 `~/.local/bin/openclaw` 安装包装器</Step>
  <Step title="安装后任务">- 尽力刷新已加载的网关服务（`openclaw gateway install --force`，然后重启） - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为） - 在适当时尝试新手引导（TTY 可用、未禁用新手引导，且 bootstrap/config 检查通过） - 默认 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`</Step>
</Steps>

### 源码检出检测

如果在 OpenClaw 检出目录（`package.json` + `pnpm-workspace.yaml`）中运行，脚本将提供：

- 使用检出目录 (`git`)，或
- 使用全局安装 (`npm`)

如果没有可用的 TTY 且未设置安装方法，则默认为 `npm` 并发出警告。

对于无效的方法选择或无效的 `--install-method` 值，脚本将以代码 `2` 退出。

### 示例 (install.sh)

<Tabs>
  <Tab title="默认">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="跳过新手引导">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Git 安装">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="通过 GitHub 安装 GitHub main">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="试运行">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| Flag                                  | Description                                       |
| ------------------------------------- | ------------------------------------------------- |
| `--install-method npm\|git`           | 选择安装方法（默认：`npm`）。别名：`--method`     |
| `--npm`                               | npm 方法的快捷方式                                |
| `--git`                               | git 方法的快捷方式。别名：`--github`              |
| `--version <version\|dist-tag\|spec>` | npm 版本、dist-tag 或包规格（默认：`latest`)      |
| `--beta`                              | 如果可用，使用 beta dist-tag，否则回退到 `latest` |
| `--git-dir <path>`                    | 检出目录（默认：`~/openclaw`）。别名：`--dir`     |
| `--no-git-update`                     | 对于现有检出跳过 `git pull`                       |
| `--no-prompt`                         | 禁用提示                                          |
| `--no-onboard`                        | 跳过新手引导                                      |
| `--onboard`                           | 启用新手引导                                      |
| `--dry-run`                           | 打印操作而不应用更改                              |
| `--verbose`                           | 启用调试输出（`set -x`、npm notice-level 日志）   |
| `--help`                              | 显示用法（`-h`）                                  |

  </Accordion>

  <Accordion title="环境变量参考">

| 变量                                                    | 描述                                 |
| ------------------------------------------------------- | ------------------------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | 安装方法                             |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | npm 版本、dist-tag 或 package spec   |
| `OPENCLAW_BETA=0\|1`                                    | 如果可用则使用 beta 版本             |
| `OPENCLAW_GIT_DIR=<path>`                               | 检出目录                             |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | 切换 git 更新                        |
| `OPENCLAW_NO_PROMPT=1`                                  | 禁用提示                             |
| `OPENCLAW_NO_ONBOARD=1`                                 | 跳过 新手引导                        |
| `OPENCLAW_DRY_RUN=1`                                    | 试运行模式                           |
| `OPENCLAW_VERBOSE=1`                                    | 调试模式                             |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | npm 日志级别                         |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | 控制 sharp/libvips 行为（默认：`1`） |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>设计用于需要将所有内容置于本地前缀 （默认 `~/.openclaw`）且无系统 Node 依赖的环境。默认支持 npm 安装， 以及在同一前缀流程下的 git-checkout 安装。</Info>

### 流程 (install-cli.sh)

<Steps>
  <Step title="安装本地 Node 运行时">
    下载一个固定的受支持的 Node LTS 压缩包（该版本嵌入在脚本中并独立更新）到 `<prefix>/tools/node-v<version>` 并验证 SHA-256。
  </Step>
  <Step title="确保 Git">
    如果缺少 Git，尝试通过 apt/dnf/yum 在 Linux 上安装，或通过 Homebrew 在 macOS 上安装。
  </Step>
  <Step title="在前缀下安装 OpenClaw">
    - `npm` 方法（默认）：使用 npm 在前缀下安装，然后将包装器写入 `<prefix>/bin/openclaw`
    - `git` 方法：克隆/更新检出（默认 `~/openclaw`）并且仍将包装器写入 `<prefix>/bin/openclaw`
  </Step>
  <Step title="刷新已加载的网关服务">
    如果已经从同一前缀加载了网关服务，脚本将运行
    `openclaw gateway install --force`，然后运行 `openclaw gateway restart`，并
    尽力探测网关健康状况。
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

| 标志                        | 描述                                                               |
| --------------------------- | ------------------------------------------------------------------ |
| `--prefix <path>`           | 安装前缀（默认：`~/.openclaw`）                                    |
| `--install-method npm\|git` | 选择安装方式（默认：`npm`）。别名：`--method`                      |
| `--npm`                     | npm 方式的快捷方式                                                 |
| `--git`, `--github`         | git 方式的快捷方式                                                 |
| `--git-dir <path>`          | Git 检出目录（默认：`~/openclaw`）。别名：`--dir`                  |
| `--version <ver>`           | OpenClaw 版本或分发标签（默认：`latest`）                          |
| `--node-version <ver>`      | Node 版本（默认：`22.22.0`）                                       |
| `--json`                    | 发出 NDJSON 事件                                                   |
| `--onboard`                 | 安装后运行 `openclaw onboard`                                      |
| `--no-onboard`              | 跳过新手引导（默认）                                               |
| `--set-npm-prefix`          | 在 Linux 上，如果当前前缀不可写，则强制 npm 前缀为 `~/.npm-global` |
| `--help`                    | 显示用法（`-h`）                                                   |

  </Accordion>

  <Accordion title="环境变量参考">

| 变量                                        | 描述                                 |
| ------------------------------------------- | ------------------------------------ |
| `OPENCLAW_PREFIX=<path>`                    | 安装前缀                             |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | 安装方法                             |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw 版本或 dist-tag             |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node 版本                            |
| `OPENCLAW_GIT_DIR=<path>`                   | Git 安装的检出目录                   |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | 切换现有检出的 git 更新              |
| `OPENCLAW_NO_ONBOARD=1`                     | 跳过新手引导                         |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm 日志级别                         |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | 控制 sharp/libvips 行为（默认：`1`） |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### 流程 (install.ps1)

<Steps>
  <Step title="确保 PowerShell + Windows 环境">需要 PowerShell 5+。</Step>
  <Step title="确保默认为 Node.js 24">如果缺失，尝试通过 winget 安装，然后是 Chocolatey，接着是 Scoop。Node 22 LTS，目前为 `22.14+`，出于兼容性原因仍受支持。</Step>
  <Step title="安装 OpenClaw">- `npm` 方法（默认）：使用所选 `-Tag` 进行全局 npm 安装 - `git` 方法：克隆/更新仓库，使用 pnpm 安装/构建，并在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安装包装器</Step>
  <Step title="安装后任务">- 尽可能将所需的 bin 目录添加到用户 PATH - 尽力刷新已加载的网关服务（`openclaw gateway install --force`，然后重启） - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为）</Step>
</Steps>

### 示例 (install.ps1)

<Tabs>
  <Tab title="默认">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git 安装">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="通过 GitHub 安装 npm 主分支">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="自定义 git 目录">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="试运行">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="调试跟踪">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| 标志                        | 描述                                           |
| --------------------------- | ---------------------------------------------- |
| `-InstallMethod npm\|git`   | 安装方法（默认：`npm`）                        |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或包说明符（默认：`latest`） |
| `-GitDir <path>`            | 检出目录（默认：`%USERPROFILE%\openclaw`）     |
| `-NoOnboard`                | 跳过 新手引导                                  |
| `-NoGitUpdate`              | 跳过 `git pull`                                |
| `-DryRun`                   | 仅打印操作                                     |

  </Accordion>

  <Accordion title="环境变量参考">

| 变量                               | 描述          |
| ---------------------------------- | ------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安装方法      |
| `OPENCLAW_GIT_DIR=<path>`          | 检出目录      |
| `OPENCLAW_NO_ONBOARD=1`            | 跳过 新手引导 |
| `OPENCLAW_GIT_UPDATE=0`            | 禁用 git pull |
| `OPENCLAW_DRY_RUN=1`               | 试运行模式    |

  </Accordion>
</AccordionGroup>

<Note>如果使用了 `-InstallMethod git` 但缺少 Git，脚本将退出并打印适用于 Windows 的 Git 链接。</Note>

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

<Accordion title="为什么 npm 在 Linux 上会遇到 EACCES 错误？">一些 Linux 设置将 npm 全局前缀指向 root 拥有的路径。`install.sh` 可以将前缀切换到 `~/.npm-global` 并将 PATH 导出附加到 shell rc 文件（当这些文件存在时）。</Accordion>

  <Accordion title="sharp/libvips 问题">
    脚本默认使用 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 以避免 sharp 针对系统 libvips 进行构建。要覆盖此设置：

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title="Windows: “npm error spawn git / ENOENT”">安装 Git for Windows，重新打开 PowerShell，重新运行安装程序。</Accordion>

<Accordion title="Windows: “openclaw is not recognized”">运行 `npm config get prefix` 并将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀），然后重新打开 PowerShell。</Accordion>

  <Accordion title="Windows: 如何获取详细的安装程序输出">
    `install.ps1` 目前不公开 `-Verbose` 开关。
    使用 PowerShell 跟踪进行脚本级诊断：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="安装后找不到 openclaw">
    通常是 PATH 问题。请参阅 [Node.js 故障排除](/zh/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>
