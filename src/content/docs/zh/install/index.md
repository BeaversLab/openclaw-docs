---
summary: "OpenClawnpmDocker安装 OpenClaw - 安装程序脚本、npm/pnpm/bun、从源码、Docker 以及更多方式"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "安装"
---

## 系统要求

- **Node 24**（推荐）或 Node 22.16+ - 安装程序脚本会自动处理此要求
- **macOS、Linux 或 Windows** - 原生 Windows 和 WSL2 均受支持；WSL2 更加稳定。请参阅 [Windows](/zh/platforms/windows)。
- `pnpm` 仅在从源码构建时需要

## 推荐：安装程序脚本

最快的安装方式。它会检测您的操作系统，按需安装 Node，安装 OpenClaw，并启动新手引导。

<Tabs>
  <Tab title="macOSLinuxWSL2macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="WindowsWindows (PowerShell)">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
</Tabs>

要在不运行新手引导的情况下安装：

<Tabs>
  <Tab title="macOSLinuxWSL2macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="WindowsWindows (PowerShell)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

有关所有标志和 CI/自动化选项，请参阅 [安装程序内部机制](/zh/install/installer)。

## 替代安装方法

### 本地前缀安装程序 (`install-cli.sh`)

当您希望将 OpenClaw 和 Node 保留在本地前缀（例如
OpenClaw`~/.openclaw`）下，而不依赖系统范围的 Node 安装时，请使用此方法：

```bash
curl -fsSL https://openclaw.ai/install-cli.sh | bash
```

默认情况下，它支持通过 npm 安装，并在相同的前缀流程下支持 git-checkout 安装。完整参考：[安装程序内部机制](/zh/install/installer#install-clish)。

已经安装？使用 `openclaw update --channel dev` 和 `openclaw update --channel stable` 在软件包和 git 安装之间切换。请参阅 [更新](/zh/install/updating#switch-between-npm-and-git-installs)。

### npm、pnpm 或 bun

如果您已经自己管理 Node：

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    托管的安装程序会清除 npm 的新鲜度过滤器（例如 `min-release-age`），以便进行 OpenClaw 软件包的安装。如果您手动使用 npm 进行安装，您自己的 npm 策略仍然适用。
    </Note>

  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    pnpm approve-builds -g
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm 需要对包含构建脚本的软件包进行显式批准。首次安装后运行 `pnpm approve-builds -g`。
    </Note>

  </Tab>
  <Tab title="bun">
    ```bash
    bun add -g openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    Bun 支持全局 CLI 安装路径。对于 Gateway(网关) 运行时，Node 仍然是推荐的守护进程运行时。
    </Note>

  </Tab>
</Tabs>

<Accordion title="故障排除：sharp 构建错误 (npm)">
  如果 `sharp` 因全局安装的 libvips 而失败：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
```

</Accordion>

### 从源码安装

针对贡献者或任何想要从本地检出运行的人：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm build && pnpm ui:build
pnpm link --global
openclaw onboard --install-daemon
```

或者跳过链接并从仓库内部使用 `pnpm openclaw ...`。有关完整的开发工作流，请参阅 [设置](/zh/start/setup)。

### 从 GitHub main 安装

```bash
npm install -g github:openclaw/openclaw#main
```

### 容器和包管理器

<CardGroup cols={2}>
  <Card title="Docker" href="/zh/install/docker" icon="container">
    容器化或无头部署。
  </Card>
  <Card title="Podman" href="/zh/install/podman" icon="container" Docker>
    Docker 的无根容器替代方案。
  </Card>
  <Card title="NixNix" href="/zh/install/nix" icon="snowflake" Nix>
    通过 Nix flake 进行声明式安装。
  </Card>
  <Card title="AnsibleAnsible" href="/zh/install/ansible" icon="server">
    自动化集群配置。
  </Card>
  <Card title="BunBun" href="/zh/install/bun" icon="zap" CLIBun>
    通过 Bun 运行时仅使用 CLI。
  </Card>
</CardGroup>

## 验证安装

```bash
openclaw --version      # confirm the CLI is available
openclaw doctor         # check for config issues
openclaw gateway status # verify the Gateway is running
```

如果您需要在安装后进行托管启动：

- macOS：通过 `openclaw onboard --install-daemon` 或 `openclaw gateway install` 使用 LaunchAgent
- Linux/WSL2：通过相同的命令使用 systemd 用户服务
- 原生 Windows：优先使用计划任务，如果拒绝创建任务，则回退到每用户启动文件夹登录项

## 托管和部署

在云服务器或 VPS 上部署 OpenClaw：

<CardGroup cols={3}>
  <Card title="VPS" href="/zh/vps"Linux>任何 Linux VPS</Card>
  <Card title="DockerDocker VM" href="/zh/install/docker-vm-runtime"Docker>共享 Docker 步骤</Card>
  <Card title="Kubernetes" href="/zh/install/kubernetes">K8s</Card>
  <Card title="Fly.ioFly.io" href="/zh/install/fly"Fly.io>Fly.io</Card>
  <Card title="HetznerHetzner" href="/zh/install/hetzner"Hetzner>Hetzner</Card>
  <Card title="GCPGCP" href="/zh/install/gcp">Google Cloud</Card>
  <Card title="Azure" href="/zh/install/azure">Azure</Card>
  <Card title="Railway" href="/zh/install/railway">Railway</Card>
  <Card title="Render" href="/zh/install/render">Render</Card>
  <Card title="Northflank" href="/zh/install/northflank">Northflank</Card>
</CardGroup>

## 更新、迁移或卸载

<CardGroup cols={3}>
  <Card title="Updating" href="/zh/install/updating" icon="refresh-cw" OpenClaw>
    保持 OpenClaw 为最新版本。
  </Card>
  <Card title="Migrating" href="/zh/install/migrating" icon="arrow-right">
    迁移到新机器。
  </Card>
  <Card title="Uninstall" href="/zh/install/uninstall" icon="trash-2" OpenClaw>
    完全移除 OpenClaw。
  </Card>
</CardGroup>

## 故障排除：找不到 `openclaw`

如果安装成功但在终端中找不到 `openclaw`：

```bash
node -v           # Node installed?
npm prefix -g     # Where are global packages?
echo "$PATH"      # Is the global bin dir in PATH?
```

如果 `$(npm prefix -g)/bin` 不在您的 `$PATH` 中，请将其添加到您的 Shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）中：

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

然后打开一个新的终端。有关更多详细信息，请参阅 [Node setup](/zh/install/node)。
