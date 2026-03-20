---
summary: "安裝 OpenClaw — 安裝程式腳本、npm/pnpm、從原始碼、Docker 等更多方式"
read_when:
  - 您需要「快速入門」以外的安裝方式
  - 您想要部署到雲端平台
  - 您需要更新、遷移或解除安裝
title: "安裝"
---

# 安裝

已經跟隨[快速入門](/zh-Hant/start/getting-started)了嗎？您已經準備就緒 — 本頁面提供替代的安裝方式、特定平台的說明以及維護指南。

## 系統需求

- **[Node 24 (推薦)](/zh-Hant/install/node)** (為了相容性，目前仍支援 Node 22 LTS，即 `22.16+`；如果缺少 Node，[安裝程式腳本](#install-methods) 將會安裝 Node 24)
- macOS、Linux 或 Windows
- `pnpm` 僅在您從原始碼建構時需要

<Note>
  在 Windows 上，我們強烈建議在 [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) 下執行
  OpenClaw。
</Note>

## 安裝方式

<Tip>
  **安裝程式腳本**是安裝 OpenClaw 的推薦方式。它能在一個步驟中處理 Node 的偵測、安裝和導入。
</Tip>

<Warning>
  對於 VPS/雲端主機，請盡可能避免使用第三方「一鍵」市集映像檔。建議使用乾淨的基礎 OS 映像檔 (例如
  Ubuntu LTS)，然後使用安裝程式腳本自行安裝 OpenClaw。
</Warning>

<AccordionGroup>
  <Accordion title="安裝腳本" icon="rocket" defaultOpen>
    下載 CLI，透過 npm 全域安裝，並啟動新手引導。

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

    就這樣 —— 該腳本會處理 Node 版本偵測、安裝和新手引導。

    若要略過新手引導並僅安裝二進位檔：

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

    若要查看所有旗標、環境變數和 CI/自動化選項，請參閱 [安裝程式內部機制](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="npm / pnpm" icon="package">
    如果您自行管理 Node，我們建議使用 Node 24。為了相容性，OpenClaw 仍支援 Node 22 LTS，目前為 `22.16+`：

    <Tabs>
      <Tab title="npm">
        ```bash
        npm install -g openclaw@latest
        openclaw onboard --install-daemon
        ```

        <Accordion title="sharp 建置錯誤？">
          如果您已全域安裝 libvips（在 macOS 上透過 Homebrew 很常見）且 `sharp` 失敗，請強制使用預先建置的二進位檔：

          ```bash
          SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
          ```

          如果您看到 `sharp: Please add node-gyp to your dependencies`，請安裝建置工具（macOS：Xcode CLT + `npm install -g node-gyp`）或使用上述環境變數。
        </Accordion>
      </Tab>
      <Tab title="pnpm">
        ```bash
        pnpm add -g openclaw@latest
        pnpm approve-builds -g        # approve openclaw, node-llama-cpp, sharp, etc.
        openclaw onboard --install-daemon
        ```

        <Note>
        pnpm 需要針對包含建置腳本的套件進行明確授權。當首次安裝顯示「Ignored build scripts」警告後，請執行 `pnpm approve-builds -g` 並選取列出的套件。
        </Note>
      </Tab>
    </Tabs>

    想透過套件管理器安裝目前的 GitHub `main` head 嗎？

    ```bash
    npm install -g github:openclaw/openclaw#main
    ```

    ```bash
    pnpm add -g github:openclaw/openclaw#main
    ```

  </Accordion>

  <Accordion title="從原始碼" icon="github">
    適用於貢獻者或任何想要從本地副本執行的人。

    <Steps>
      <Step title="Clone 並建置">
        Clone [OpenClaw repo](https://github.com/openclaw/openclaw) 並建置：

        ```bash
        git clone https://github.com/openclaw/openclaw.git
        cd openclaw
        pnpm install
        pnpm ui:build
        pnpm build
        ```
      </Step>
      <Step title="連結 CLI">
        讓 `openclaw` 指令可在全域使用：

        ```bash
        pnpm link --global
        ```

        或者，跳過連結並透過 `pnpm openclaw ...` 從 repo 內部執行指令。
      </Step>
      <Step title="執行 onboarding">
        ```bash
        openclaw onboard --install-daemon
        ```
      </Step>
    </Steps>

    如需更深入的開發工作流程，請參閱 [Setup](/zh-Hant/start/setup)。

  </Accordion>

</AccordionGroup>

## 其他安裝方法

<CardGroup cols={2}>
  <Card title="Docker" href="/zh-Hant/install/docker" icon="container">
    容器化或無介面部署。
  </Card>
  <Card title="Podman" href="/zh-Hant/install/podman" icon="container">
    Rootless 容器：執行一次 `setup-podman.sh`，然後執行啟動腳本。
  </Card>
  <Card title="Nix" href="/zh-Hant/install/nix" icon="snowflake">
    透過 Nix 進行宣告式安裝。
  </Card>
  <Card title="Ansible" href="/zh-Hant/install/ansible" icon="server">
    自動化佈建叢集。
  </Card>
  <Card title="Bun" href="/zh-Hant/install/bun" icon="zap">
    透過 Bun 執行時期僅使用 CLI。
  </Card>
</CardGroup>

## 安裝後

驗證一切是否正常運作：

```bash
openclaw doctor         # check for config issues
openclaw status         # gateway status
openclaw dashboard      # open the browser UI
```

如果您需要自訂執行時期路徑，請使用：

- `OPENCLAW_HOME` 用於基於主目錄的內部路徑
- `OPENCLAW_STATE_DIR` 用於可變狀態位置
- `OPENCLAW_CONFIG_PATH` 用於設定檔位置

請參閱 [環境變數](/zh-Hant/help/environment) 以了解優先順序和完整詳情。

## 疑難排解：找不到 `openclaw`

<Accordion title="PATH 診斷與修復">
  快速診斷：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果您的 `$PATH` 中**沒有** `$(npm prefix -g)/bin` (macOS/Linux) 或 `$(npm prefix -g)` (Windows)，您的 Shell 將無法找到全域 npm 二進位檔（包括 `openclaw`）。

修復方法 — 將其新增至您的 Shell 啟動檔案 (`~/.zshrc` 或 `~/.bashrc`)：

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

在 Windows 上，將 `npm prefix -g` 的輸出新增至您的 PATH。

然後開啟一個新的終端機（或在 zsh 中執行 `rehash` / 在 bash 中執行 `hash -r`）。

</Accordion>

## 更新 / 解除安裝

<CardGroup cols={3}>
  <Card title="Updating" href="/zh-Hant/install/updating" icon="refresh-cw">
    保持 OpenClaw 為最新狀態。
  </Card>
  <Card title="Migrating" href="/zh-Hant/install/migrating" icon="arrow-right">
    移動到新機器。
  </Card>
  <Card title="Uninstall" href="/zh-Hant/install/uninstall" icon="trash-2">
    完全移除 OpenClaw。
  </Card>
</CardGroup>

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
