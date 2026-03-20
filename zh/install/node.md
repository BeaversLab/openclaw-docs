---
title: "Node.js"
summary: "为 Node.js 安装和配置 OpenClaw — 版本要求、安装选项和 PATH 故障排除"
read_when:
  - "在安装 Node.js 之前，您需要安装 OpenClaw"
  - "您已安装 OpenClaw，但 `openclaw` is command not found"
  - "npm install -g 因权限或 PATH 问题而失败"
---

# Node.js

OpenClaw 需要 **Node 22.16 或更新版本**。**Node 24 是安装、CI 和发布工作流的默认及推荐运行时**。Node 22 仍通过当前的 LTS 线路获得支持。[安装程序脚本](/zh/install#install-methods) 将自动检测并安装 Node — 本页面适用于您想自行设置 Node 并确保一切连接正确（版本、PATH、全局安装）的情况。

## 检查您的版本

```bash
node -v
```

如果打印出 `v24.x.x` 或更高版本，说明您处于推荐的默认版本。如果打印出 `v22.16.x` 或更高版本，说明您处于受支持的 Node 22 LTS 线路，但我们仍建议您在方便时升级到 Node 24。如果未安装 Node 或版本过旧，请选择下方的安装方法。

## 安装 Node

<Tabs>
  <Tab title="macOS">
    **Homebrew**（推荐）：

    ```bash
    brew install node
    ```

    或从 [nodejs.org](https://nodejs.org/) 下载 macOS 安装程序。

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian：**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL：**

    ```bash
    sudo dnf install nodejs
    ```

    或使用版本管理器（见下文）。

  </Tab>
  <Tab title="Windows">
    **winget**（推荐）：

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **Chocolatey：**

    ```powershell
    choco install nodejs-lts
    ```

    或从 [nodejs.org](https://nodejs.org/) 下载 Windows 安装程序。

  </Tab>
</Tabs>

<Accordion title="使用版本管理器 (nvm, fnm, mise, asdf)">
  版本管理器可让您轻松切换 Node 版本。常用选项：

- [**fnm**](https://github.com/Schniz/fnm) — 快速，跨平台
- [**nvm**](https://github.com/nvm-sh/nvm) — 在 macOS/Linux 上广泛使用
- [**mise**](https://mise.jdx.dev/) — 多语言支持 (Node, Python, Ruby 等)

fnm 示例：

```bash
fnm install 24
fnm use 24
```

  <Warning>
  请确保您的版本管理器已在 shell 启动文件 (`~/.zshrc` 或 `~/.bashrc`) 中初始化。如果未初始化，由于 PATH 不包含 Node 的 bin 目录，在新的终端会话中可能找不到 `openclaw`。
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
  <Step title="检查它是否在您的 PATH 中">
    ```bash
    echo "$PATH"
    ```

    在输出中查找 `<npm-prefix>/bin` (macOS/Linux) 或 `<npm-prefix>` (Windows)。

  </Step>
  <Step title="将其添加到您的 shell 启动文件">
    <Tabs>
      <Tab title="macOS / Linux">
        添加到 `~/.zshrc` 或 `~/.bashrc`：

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        然后打开一个新的终端（或在 zsh 中运行 `rehash` / 在 bash 中运行 `hash -r`）。
      </Tab>
      <Tab title="Windows">
        通过 设置 → 系统 → 环境变量 将 `npm prefix -g` 的输出添加到您的系统 PATH。
      </Tab>
    </Tabs>

  </Step>
</Steps>

### 在 `npm install -g` 上出现权限错误 (Linux)

如果您看到 `EACCES` 错误，请将 npm 的全局前缀切换到用户可写的目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

将 `export PATH=...` 行添加到您的 `~/.bashrc` 或 `~/.zshrc` 以使其永久生效。

import zh from "/components/footer/zh.mdx";

<zh />
