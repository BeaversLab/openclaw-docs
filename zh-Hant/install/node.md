---
title: "Node.js"
summary: "為 OpenClaw 安裝與配置 Node.js — 版本需求、安裝選項與 PATH 排解"
read_when:
  - "您必須在安裝 OpenClaw 之前安裝 Node.js"
  - "您已安裝 OpenClaw，但 `openclaw` 指令找不到"
  - "npm install -g 因權限或 PATH 問題而失敗"
---

# Node.js

OpenClaw 需要 **Node 22.16 或更新版本**。**Node 24 是安裝、CI 與發佈工作流程的預設與推薦執行環境**。Node 22 仍透過現行的 LTS 版本獲得支援。[安裝腳本](/zh-Hant/install#install-methods) 會自動偵測並安裝 Node — 本頁面適用於您想自行設定 Node 並確認一切正確接駁（版本、PATH、全域安裝）的情況。

## 檢查您的版本

```bash
node -v
```

若輸出為 `v24.x.x` 或更高，則您正在使用推薦的預設版本。若輸出為 `v22.16.x` 或更高，則您位於受支援的 Node 22 LTS 路徑，但我們仍建議您在方便時升級至 Node 24。若未安裝 Node 或版本過舊，請從下方選擇一種安裝方式。

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

    或使用版本管理工具 (見下文)。

  </Tab>
  <Tab title="Windows">
    **winget** (推薦):

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

- [**fnm**](https://github.com/Schniz/fnm) — 快速、跨平台
- [**nvm**](https://github.com/nvm-sh/nvm) — 在 macOS/Linux 上廣泛使用
- [**mise**](https://mise.jdx.dev/) — 多語言支援 (Node, Python, Ruby 等)

fnm 範例：

```bash
fnm install 24
fnm use 24
```

  <Warning>
  請確保您的版本管理器已在您的 shell 啟動檔案 (`~/.zshrc` 或 `~/.bashrc`) 中初始化。如果未初始化，新的終端機工作階段可能會找不到 `openclaw`，因為 PATH 不會包含 Node 的 bin 目錄。
  </Warning>
</Accordion>

## 疑難排解

### `openclaw: command not found`

這幾乎總是表示 npm 的全域 bin 目錄不在您的 PATH 中。

<Steps>
  <Step title="Find your global npm prefix">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="檢查它是否在您的 PATH 中">
    ```bash
    echo "$PATH"
    ```

    在輸出中尋找 `<npm-prefix>/bin` (macOS/Linux) 或 `<npm-prefix>` (Windows)。

  </Step>
  <Step title="將其加入您的 shell 啟動檔案">
    <Tabs>
      <Tab title="macOS / Linux">
        加入至 `~/.zshrc` 或 `~/.bashrc`：

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        然後開啟一個新的終端機 (或在 zsh 中執行 `rehash` / 在 bash 中執行 `hash -r`)。
      </Tab>
      <Tab title="Windows">
        透過 Settings → System → Environment Variables，將 `npm prefix -g` 的輸出加入至您的系統 PATH。
      </Tab>
    </Tabs>

  </Step>
</Steps>

### `npm install -g` 的權限錯誤

如果您看到 `EACCES` 錯誤，請將 npm 的全域前綴切換至使用者可寫入的目錄：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

將 `export PATH=...` 這一行加入您的 `~/.bashrc` 或 `~/.zshrc` 以永久設定。

import en from "/components/footer/en.mdx";

<en />
