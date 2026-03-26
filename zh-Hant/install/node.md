---
title: "Node.js"
summary: "為 OpenClaw 安裝和配置 Node.js —— 版本需求、安裝選項及 PATH 疑難排解"
read_when:
  - "You need to install Node.js before installing OpenClaw"
  - "You installed OpenClaw but `openclaw` is command not found"
  - "npm install -g fails with permissions or PATH issues"
---

# Node.js

OpenClaw 需要 **Node 22.16 或更新版本**。**Node 24 是安裝、CI 和發行工作流程的預設及推薦執行環境**。Node 22 透過最新的 LTS 線持續獲得支援。[安裝腳本](/zh-Hant/install#alternative-install-methods) 會自動偵測並安裝 Node —— 本頁面適用於您想自行設定 Node 並確保一切設定正確（版本、PATH、全域安裝）的情況。

## 檢查您的版本

```bash
node -v
```

如果輸出是 `v24.x.x` 或更高版本，表示您使用的是建議的預設版本。如果輸出是 `v22.16.x` 或更高版本，表示您使用的是受支援的 Node 22 LTS 版本，但我們仍然建議您在方便時升級到 Node 24。如果尚未安裝 Node 或版本過舊，請選擇下方的安裝方法。

## 安裝 Node

<Tabs>
  <Tab title="macOS">
    **Homebrew** (推薦):

    ```bash
    brew install node
    ```

    或從 [nodejs.org](https://nodejs.org/) 下載 macOS 安裝程式。

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian:**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL:**

    ```bash
    sudo dnf install nodejs
    ```

    或使用版本管理器 (見下文)。

  </Tab>
  <Tab title="Windows">
    **winget** (建議使用):

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **Chocolatey:**

    ```powershell
    choco install nodejs-lts
    ```

    或從 [nodejs.org](https://nodejs.org/) 下載 Windows 安裝程式。

  </Tab>
</Tabs>

<Accordion title="使用版本管理器 (nvm, fnm, mise, asdf)">
  版本管理器讓您可以輕鬆切換 Node 版本。熱門選項：

- [**fnm**](https://github.com/Schniz/fnm) — 快速，跨平台
- [**nvm**](https://github.com/nvm-sh/nvm) — 在 macOS/Linux 上廣泛使用
- [**mise**](https://mise.jdx.dev/) — 多語言 (Node, Python, Ruby 等)

使用 fnm 的範例：

```bash
fnm install 24
fnm use 24
```

  <Warning>
  請確保您的版本管理器已在您的 shell 啟動檔案 (`~/.zshrc` 或 `~/.bashrc`) 中初始化。如果沒有，在新的終端機工作階段中可能會找不到 `openclaw`，因為 PATH 將不會包含 Node 的 bin 目錄。
  </Warning>
</Accordion>

## 疑難排解

### `openclaw: command not found`

這幾乎總是意味著 npm 的全域 bin 目錄不在您的 PATH 中。

<Steps>
  <Step title="Find your global npm prefix">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="檢查它是否在你的 PATH 中">
    ```bash
    echo "$PATH"
    ```

    在輸出中尋找 `<npm-prefix>/bin` (macOS/Linux) 或 `<npm-prefix>` (Windows)。

  </Step>
  <Step title="將其加入你的 shell 啟動檔案">
    <Tabs>
      <Tab title="macOS / Linux">
        新增至 `~/.zshrc` 或 `~/.bashrc`：

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        然後開啟一個新的終端機 (或在 zsh 中執行 `rehash` / 在 bash 中執行 `hash -r`)。
      </Tab>
      <Tab title="Windows">
        透過 Settings → System → Environment Variables 將 `npm prefix -g` 的輸出新增到你的系統 PATH。
      </Tab>
    </Tabs>

  </Step>
</Steps>

### `npm install -g` (Linux) 上的權限錯誤

如果您看到 `EACCES` 錯誤，請將 npm 的全域前綴切換為使用者可寫入的目錄：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

將 `export PATH=...` 這一行加入您的 `~/.bashrc` 或 `~/.zshrc` 以使其永久生效。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
