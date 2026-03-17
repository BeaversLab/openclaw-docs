---
summary: "安装 OpenClaw — 安装程序脚本、npm/pnpm、从源码、Docker 等方式"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "安装"
---

# 安装

已经跟随[入门指南](/zh/start/getting-started)了吗？你已经准备好了 — 本页面介绍其他安装方法、特定平台的说明以及维护。

## 系统要求

- **[Node 24（推荐）](/zh/install/node)**（为了兼容性，目前仍支持 Node 22 LTS，即 `22.16+`；[安装程序脚本](#install-methods) 会在缺少时安装 Node 24）
- macOS、Linux 或 Windows
- 仅当你从源码构建时才需要 `pnpm`

<Note>
  在 Windows 上，我们强烈建议在 [OpenClaw](https://learn.microsoft.com/en-us/windows/wsl/install)
  下运行 WSL2。
</Note>

## 安装方法

<Tip>**安装程序脚本** 是安装 OpenClaw 的推荐方式。它可以一步完成 Node 检测、 安装和新手引导。</Tip>

<Warning>
  对于 VPS/云主机，请尽可能避免使用第三方“一键式”市场镜像。首选一个纯净的 基础操作系统镜像（例如
  Ubuntu LTS），然后使用安装程序脚本自行安装 OpenClaw。
</Warning>

<AccordionGroup>
  <Accordion title="安装程序脚本" icon="rocket" defaultOpen>
    下载 CLI，通过 npm 全局安装，并启动新手引导。

    <Tabs>
      <Tab title="macOS / Linux / WSL2">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    就是这样 — 脚本会处理 Node 检测、安装和新手引导。

    要跳过新手引导并仅安装二进制文件：

    <Tabs>
      <Tab title="macOS / Linux / WSL2">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
        ```
      </Tab>
    </Tabs>

    有关所有标志、环境变量和 CI/自动化选项，请参阅 [安装程序内部原理](/zh/install/installer)。

  </Accordion>

  <Accordion title="npm / pnpm" icon="package">
    如果您自己管理 Node，我们推荐 Node 24。为了兼容性，OpenClaw 仍然支持 Node 22 LTS，目前是 `22.16+`：

    <Tabs>
      <Tab title="npm">
        ```bash
        npm install -g openclaw@latest
        openclaw onboard --install-daemon
        ```

        <Accordion title="sharp 构建错误？">
          如果您全局安装了 libvips（在 macOS 上通过 Homebrew 安装很常见）并且 `sharp` 失败，请强制使用预构建的二进制文件：

          ```bash
          SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
          ```

          如果您看到 `sharp: Please add node-gyp to your dependencies`，请安装构建工具（macOS：Xcode CLT + `npm install -g node-gyp`）或使用上述环境变量。
        </Accordion>
      </Tab>
      <Tab title="pnpm">
        ```bash
        pnpm add -g openclaw@latest
        pnpm approve-builds -g        # approve openclaw, node-llama-cpp, sharp, etc.
        openclaw onboard --install-daemon
        ```

        <Note>
        pnpm 需要显式批准包含构建脚本的包。首次安装显示“Ignored build scripts”警告后，运行 `pnpm approve-builds -g` 并选择列出的包。
        </Note>
      </Tab>
    </Tabs>

    想要通过包管理器安装获取当前的 GitHub `main` 主分支版本吗？

    ```bash
    npm install -g github:openclaw/openclaw#main
    ```

    ```bash
    pnpm add -g github:openclaw/openclaw#main
    ```

  </Accordion>

  <Accordion title="从源代码" icon="github">
    适用于贡献者或任何希望从本地检出运行的人。

    <Steps>
      <Step title="克隆并构建">
        克隆 [OpenClaw 仓库](https://github.com/openclaw/openclaw) 并构建：

        ```bash
        git clone https://github.com/openclaw/openclaw.git
        cd openclaw
        pnpm install
        pnpm ui:build
        pnpm build
        ```
      </Step>
      <Step title="链接 CLI">
        使 `openclaw` 命令在全局可用：

        ```bash
        pnpm link --global
        ```

        或者，跳过链接步骤，直接在仓库内部通过 `pnpm openclaw ...` 运行命令。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --install-daemon
        ```
      </Step>
    </Steps>

    有关更深入的开发工作流，请参阅 [设置](/zh/start/setup)。

  </Accordion>
</AccordionGroup>

## 其他安装方法

<CardGroup cols={2}>
  <Card title="Docker" href="/zh/install/docker" icon="container">
    容器化或无头部署。
  </Card>
  <Card title="Podman" href="/zh/install/podman" icon="container">
    无根容器：运行一次 `setup-podman.sh`，然后运行启动脚本。
  </Card>
  <Card title="Nix" href="/zh/install/nix" icon="snowflake">
    通过 Nix 进行声明式安装。
  </Card>
  <Card title="Ansible" href="/zh/install/ansible" icon="server">
    自动化集群配置。
  </Card>
  <Card title="Bun" href="/zh/install/bun" icon="zap">
    通过 Bun 运行时仅使用 CLI。
  </Card>
</CardGroup>

## 安装后

验证一切是否正常工作：

```bash
openclaw doctor         # check for config issues
openclaw status         # gateway status
openclaw dashboard      # open the browser UI
```

如果您需要自定义运行时路径，请使用：

- `OPENCLAW_HOME` 用于基于主目录的内部路径
- `OPENCLAW_STATE_DIR` 用于可变状态位置
- `OPENCLAW_CONFIG_PATH` 用于配置文件位置

有关优先级和详细信息，请参阅 [环境变量](/zh/help/environment)。

## 故障排除：未找到 `openclaw`

<Accordion title="PATH 诊断与修复">
  快速诊断：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin` (macOS/Linux) 或 `$(npm prefix -g)` (Windows) **不**在您的 `$PATH` 中，您的 shell 将无法找到全局 npm 二进制文件（包括 `openclaw`）。

修复 — 将其添加到您的 shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）中：

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

在 Windows 上，将 `npm prefix -g` 的输出添加到您的 PATH 中。

然后打开一个新的终端（或在 zsh 中运行 `rehash` / 在 bash 中运行 `hash -r`）。

</Accordion>

## 更新 / 卸载

<CardGroup cols={3}>
  <Card title="更新" href="/zh/install/updating" icon="refresh-cw">
    保持 OpenClaw 为最新状态。
  </Card>
  <Card title="迁移" href="/zh/install/migrating" icon="arrow-right">
    移至新机器。
  </Card>
  <Card title="卸载" href="/zh/install/uninstall" icon="trash-2">
    完全移除 OpenClaw。
  </Card>
</CardGroup>

import zh from "/components/footer/zh.mdx";

<zh />
