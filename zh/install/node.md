---
title: "Node.js"
summary: "为 OpenClaw 安装和配置 Node.js — 版本要求、安装选项和 PATH 故障排除"
read_when:
  - "You need to install Node.js before installing OpenClaw"
  - "You installed OpenClaw but `openclaw` is command not found"
  - "npm install -g fails with permissions or PATH issues"
---

# Node.js

OpenClaw 需要 **Node 22.16 或更新版本**。**Node 24 是安装、CI 和发布工作流的默认及推荐运行时**。Node 22 仍然通过当前的 LTS 线路获得支持。[安装程序脚本](/zh/en/install#install-methods) 会自动检测并安装 Node —— 本页面适用于您想要自行设置 Node 并确保一切配置正确（版本、PATH、全局安装）的情况。

## 检查您的版本

```bash
node -v
```

如果打印的是 `v24.x.x` 或更高版本，说明您使用的是推荐的默认版本。如果打印的是 `v22.16.x` 或更高版本，说明您使用的是受支持的 Node 22 LTS 版本，但我们仍建议在方便时升级到 Node 24。如果未安装 Node 或版本过旧，请从下方选择一种安装方式。

## 安装 Node

<Tabs>
  <Tab title="macOS">
    **Homebrew** (推荐)：

    ```bash
    brew install node
    ```

    或者从 [nodejs.org](https://nodejs.org/) 下载 macOS 安装程序。

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian:**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL："

    ```bash
    sudo dnf install nodejs
    ```

    或者使用版本管理器（见下文）。

  </Tab>
  <Tab title="Windows">
    **winget** (推荐)：

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **Chocolatey："

    ```powershell
    choco install nodejs-lts
    ```

    或者从 [nodejs.org](https://nodejs.org/) 下载 Windows 安装程序。

  </Tab>
</Tabs>

<Accordion title="Using a version manager (nvm, fnm, mise, asdf)">
  版本管理器让您可以轻松切换 Node 版本。常用选项：

- [**fnm**](https://github.com/Schniz/fnm) — 快速、跨平台
- [**nvm**](https://github.com/nvm-sh/nvm) — 在 macOS/Linux 上广泛使用
- [**mise**](https://mise.jdx.dev/) — 多语言 (Node, Python, Ruby 等)

fnm 使用示例：

```bash
fnm install 24
fnm use 24
```

  <Warning>
  确保您的版本管理器已在 Shell 启动文件 (`~/.zshrc` 或 `~/.bashrc`) 中初始化。如果没有，新的终端会话中可能找不到 `openclaw`，因为 PATH 将不包含 Node 的 bin 目录。
  </Warning>
</Accordion>

## 故障排除

### `openclaw: command not found`

这几乎总是意味着 npm 的全局 bin 目录不在您的 PATH 中。

<Steps>
  <Step title="Find your global npm prefix">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="Check if it's on your PATH">
    ```bash
    echo "$PATH"
    ```

    在输出中查找 `<npm-prefix>/bin` (macOS/Linux) 或 `<npm-prefix>` (Windows)。

  </Step>
  <Step title="将其添加到您的 shell 启动文件中">
    <Tabs>
      <Tab title="macOS / Linux">
        添加到 `~/.zshrc` 或 `~/.bashrc`：

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        然后打开一个新的终端（或者在 zsh 中运行 `rehash` / 在 bash 中运行 `hash -r`）。
      </Tab>
      <Tab title="Windows">
        通过 设置 → 系统 → 环境变量 将 `npm prefix -g` 的输出添加到您的系统 PATH 中。
      </Tab>
    </Tabs>

  </Step>
</Steps>

### `npm install -g` 上的权限错误（Linux）

如果您看到 `EACCES` 错误，请将 npm 的全局前缀切换到用户可写目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

将 `export PATH=...` 行添加到您的 `~/.bashrc` 或 `~/.zshrc` 中以使其永久生效。

import zh from '/components/footer/zh.mdx';

<zh />
