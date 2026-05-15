---
summary: "為 OpenClaw 安裝和配置 Node.js - 版本需求、安裝選項和 PATH 故障排除"
title: "Node.js"
read_when:
  - "You need to install Node.js before installing OpenClaw"
  - "You installed OpenClaw but `openclaw` is command not found"
  - "npm install -g fails with permissions or PATH issues"
---

OpenClaw 需要 **Node 22.16 或更新版本**。對於安裝、CI 和發佈工作流程，**Node 24 是預設且推薦的運行時**。Node 22 透過目前的 LTS 線路維持支援。[安裝腳本](/zh-Hant/install#alternative-install-methods) 會自動偵測並安裝 Node - 本頁面適用於您想要自行設定 Node 並確保一切正確連線（版本、PATH、全域安裝）的情況。

## 檢查您的版本

```bash
node -v
```

如果此處顯示 `v24.x.x` 或更高版本，表示您處於推薦的預設版本。如果顯示 `v22.16.x` 或更高版本，表示您處於受支援的 Node 22 LTS 路徑，但我們仍建議在方便時升級至 Node 24。如果未安裝 Node 或版本過舊，請選擇下方的其中一種安裝方式。

## 安裝 Node

<Tabs>
  <Tab title="macOS">
    **Homebrew** (建議):

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

    或使用版本管理工具（見下方）。

  </Tab>
  <Tab title="Windows">
    **winget** (建議):

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

<Accordion title="使用版本管理工具 (nvm, fnm, mise, asdf)">
  版本管理工具讓您能輕鬆切換 Node 版本。熱門選項包括：

- [**fnm**](https://github.com/Schniz/fnm) - 快速、跨平台
- [**nvm**](https://github.com/nvm-sh/nvm) - 廣泛用於 macOS/Linux
- [**mise**](https://mise.jdx.dev/) - 多語言支援 (Node, Python, Ruby 等)

使用 fnm 的範例：

```bash
fnm install 24
fnm use 24
```

  <Warning>
  請確保您的版本管理工具已在您的 shell 啟動檔案 (`~/.zshrc` 或 `~/.bashrc`) 中初始化。如果未初始化，由於 PATH 不包含 Node 的 bin 目錄，在新的終端機階段中可能會找不到 `openclaw`。
  </Warning>
</Accordion>

## 疑難排解

### `openclaw: command not found`

這幾乎總是表示 npm 的全域 bin 目錄不在您的 PATH 中。

<Steps>
  <Step title="尋找您的全域 npm prefix">
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
  <Step title="將其新增至您的 shell 啟動檔案">
    <Tabs>
      <Tab title="macOS / Linux">
        新增至 `~/.zshrc` 或 `~/.bashrc`：

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        然後開啟新的終端機 (或在 zsh 中執行 `rehash` / 在 bash 中執行 `hash -r`)。
      </Tab>
      <Tab title="Windows">
        透過 Settings → System → Environment Variables，將 `npm prefix -g` 的輸出新增至您的系統 PATH。
      </Tab>
    </Tabs>

  </Step>
</Steps>

### 在 `npm install -g` 上發生權限錯誤 (Linux)

如果您看到 `EACCES` 錯誤，請將 npm 的全域 prefix 切換至使用者可寫入的目錄：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

將 `export PATH=...` 這一行新增至您的 `~/.bashrc` 或 `~/.zshrc` 以使其永久生效。

## 相關資訊

- [安裝概覽](/zh-Hant/install) - 所有安裝方式
- [更新](/zh-Hant/install/updating) - 保持 OpenClaw 為最新狀態
- [快速入門](/zh-Hant/start/getting-started) - 安裝後的第一步
