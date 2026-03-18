---
summary: "安裝程式指令碼（install.sh、install-cli.sh、install.ps1）的運作方式、旗標與自動化"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "安裝程式內部運作"
---

# 安裝程式內部運作

OpenClaw 提供三個安裝程式指令碼，透過 `openclaw.ai` 提供。

| 指令碼                             | 平台                 | 用途                                                                      |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | 視需要安裝 Node，透過 npm（預設）或 git 安裝 OpenClaw，並可執行入門導覽。 |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | 將 Node + OpenClaw 安裝至本機前綴目錄 (`~/.openclaw`)。不需要 root 權限。 |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | 視需要安裝 Node，透過 npm（預設）或 git 安裝 OpenClaw，並可執行入門導覽。 |

## 快速指令

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

<Note>
  如果安裝成功但在新的終端機中找不到 `openclaw`，請參閱 [Node.js
  疑難排解](/zh-Hant/install/node#troubleshooting)。
</Note>

---

## install.sh

<Tip>推薦用於大多數在 macOS/Linux/WSL 上的互動式安裝。</Tip>

### 流程 (install.sh)

<Steps>
  <Step title="偵測作業系統">
    支援 macOS 和 Linux（包括 WSL）。若偵測到 macOS，若缺少 Homebrew 則進行安裝。
  </Step>
  <Step title="預設確保 Node.js 24">
    檢查 Node 版本並視需要安裝 Node 24（macOS 上使用 Homebrew，Linux apt/dnf/yum 上使用 NodeSource
    設定指令碼）。為了相容性，OpenClaw 目前仍支援 Node 22 LTS，即 `22.16+`。
  </Step>
  <Step title="確保 Git">若缺少 Git 則進行安裝。</Step>
  <Step title="安裝 OpenClaw">
    - `npm` 方法（預設）：全域 npm 安裝 - `git` 方法：複製/更新 repo，使用 pnpm 安裝
    deps，建置，然後在 `~/.local/bin/openclaw` 安裝 wrapper
  </Step>
  <Step title="Post-install tasks">
    - 在升級和 git 安裝時運行 `openclaw doctor --non-interactive`（盡最大努力） - 在適當時嘗試
    入門引導（TTY 可用、未禁用入門引導，並且引導程式/配置檢查 通過） - 預設
    `SHARP_IGNORE_GLOBAL_LIBVIPS=1`
  </Step>
</Steps>

### Source checkout detection

如果在 OpenClaw checkout 內運行（`package.json` + `pnpm-workspace.yaml`），腳本會提供：

- 使用 checkout（`git`），或
- 使用全域安裝（`npm`）

如果沒有可用的 TTY 並且未設置安裝方法，則預設為 `npm` 並發出警告。

對於無效的方法選擇或無效的 `--install-method` 值，腳本以代碼 `2` 退出。

### Examples (install.sh)

<Tabs>
  <Tab title="Default">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```
  </Tab>
  <Tab title="Skip onboarding">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --no-onboard ```
  </Tab>
  <Tab title="Git install">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --install-method git ```
  </Tab>
  <Tab title="GitHub main via npm">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --version main ```
  </Tab>
  <Tab title="Dry run">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --dry-run ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="旗標參考">

| 旗標                                  | 描述                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `--install-method npm\|git`           | 選擇安裝方法 (預設: `npm`)。別名: `--method`           |
| `--npm`                               | npm 方法的捷徑                                         |
| `--git`                               | git 方法的捷徑。別名: `--github`                       |
| `--version <version\|dist-tag\|spec>` | npm 版本、dist-tag 或 package spec (預設: `latest`)    |
| `--beta`                              | 如果有可用的 beta dist-tag 則使用，否則回退到 `latest` |
| `--git-dir <path>`                    | Checkout 目錄 (預設: `~/openclaw`)。別名: `--dir`      |
| `--no-git-update`                     | 針對現有的 checkout 跳過 `git pull`                    |
| `--no-prompt`                         | 停用提示                                               |
| `--no-onboard`                        | 跳過新手引導                                           |
| `--onboard`                           | 啟用新手引導                                           |
| `--dry-run`                           | 列印操作而不套用變更                                   |
| `--verbose`                           | 啟用除錯輸出 (`set -x`, npm notice-level logs)         |
| `--help`                              | 顯示用法 (`-h`)                                        |

  </Accordion>

  <Accordion title="環境變數參考">

| 變數                                                    | 描述                                |
| ------------------------------------------------------- | ----------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | 安裝方法                            |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | npm 版本、dist-tag 或 package spec  |
| `OPENCLAW_BETA=0\|1`                                    | 如果可用則使用 beta                 |
| `OPENCLAW_GIT_DIR=<path>`                               | Checkout 目錄                       |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | 切換 git 更新                       |
| `OPENCLAW_NO_PROMPT=1`                                  | 停用提示                            |
| `OPENCLAW_NO_ONBOARD=1`                                 | 略過新手引導                        |
| `OPENCLAW_DRY_RUN=1`                                    | 試執行模式                          |
| `OPENCLAW_VERBOSE=1`                                    | 偵錯模式                            |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | npm 日誌層級                        |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | 控制 sharp/libvips 行為 (預設: `1`) |

  </Accordion>
</AccordionGroup>

---

## install-cli.sh

<Info>專為您希望所有內容位於本地前綴 (預設 `~/.openclaw`) 下 且不依賴系統 Node 的環境而設計。</Info>

### Flow (install-cli.sh)

<Steps>
  <Step title="安裝本地 Node 執行環境">
    下載固定且受支援的 Node tarball (目前預設 `22.22.0`) 到 `<prefix>/tools/node-v<version>` 並驗證 SHA-256。
  </Step>
  <Step title="確保 Git">
    如果缺少 Git，會嘗試透過 Linux 上的 apt/dnf/yum 或 macOS 上的 Homebrew 安裝。
  </Step>
  <Step title="在前綴下安裝 OpenClaw">
    使用 `--prefix <prefix>` 透過 npm 安裝，然後將寫入包裝程式至 `<prefix>/bin/openclaw`。
  </Step>
</Steps>

### Examples (install-cli.sh)

<Tabs>
  <Tab title="Default">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```
  </Tab>
  <Tab title="Custom prefix + version">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --prefix /opt/openclaw --version latest ```
  </Tab>
  <Tab title="Automation JSON output">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --json --prefix /opt/openclaw ```
  </Tab>
  <Tab title="Run onboarding">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --onboard ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="旗標參考">

| Flag                   | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `--prefix <path>`      | 安裝前綴（預設：`~/.openclaw`）                                |
| `--version <ver>`      | OpenClaw 版本或發行標籤（預設：`latest`）                      |
| `--node-version <ver>` | Node 版本（預設：`22.22.0`）                                   |
| `--json`               | 發出 NDJSON 事件                                               |
| `--onboard`            | 安裝後執行 `openclaw onboard`                                  |
| `--no-onboard`         | 跳過入門引導（預設）                                           |
| `--set-npm-prefix`     | 在 Linux 上，若當前前綴不可寫，強制 npm 前綴為 `~/.npm-global` |
| `--help`               | 顯示使用方式（`-h`）                                           |

  </Accordion>

  <Accordion title="環境變數參考">

| Variable                                    | Description                                            |
| ------------------------------------------- | ------------------------------------------------------ |
| `OPENCLAW_PREFIX=<path>`                    | 安裝前綴                                               |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw 版本或發行標籤                                |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node 版本                                              |
| `OPENCLAW_NO_ONBOARD=1`                     | 跳過入門引導                                           |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm 日誌層級                                           |
| `OPENCLAW_GIT_DIR=<path>`                   | 舊版清理查找路徑（用於移除舊的 `Peekaboo` 子模組簽出） |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | 控制 sharp/libvips 行為（預設：`1`）                   |

  </Accordion>
</AccordionGroup>

---

## install.ps1

### 流程 (install.ps1)

<Steps>
  <Step title="確保 PowerShell + Windows 環境">需要 PowerShell 5+。</Step>
  <Step title="預設確保 Node.js 24">
    若缺少，嘗試透過 winget，然後是 Chocolatey，再來是 Scoop 進行安裝。為了相容性，目前 `22.16+` 的
    Node 22 LTS 仍受支援。
  </Step>
  <Step title="安裝 OpenClaw">
    - `npm` 方法（預設）：使用選定的 `-Tag` 進行全域 npm 安裝 - `git` 方法：複製/更新 儲存庫，使用
    pnpm 安裝/建置，並在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安裝包裝程式
  </Step>
  <Step title="安裝後任務">
    盡可能將所需的 bin 目錄新增至使用者的 PATH，然後在升級和 git 安裝上執行 `openclaw doctor
    --non-interactive`（盡力而為）。
  </Step>
</Steps>

### 範例 (install.ps1)

<Tabs>
  <Tab title="Default">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git install">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1)))
    -InstallMethod git ```
  </Tab>
  <Tab title="GitHub main via npm">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main
    ```
  </Tab>
  <Tab title="Custom git directory">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1)))
    -InstallMethod git -GitDir "C:\openclaw" ```
  </Tab>
  <Tab title="Dry run">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```
  </Tab>
  <Tab title="Debug trace">
    ```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 &
    ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug
    -Trace 0 ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Flags 參考">

| Flag                        | 描述                                           |
| --------------------------- | ---------------------------------------------- |
| `-InstallMethod npm\|git`   | 安裝方法（預設：`npm`）                        |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或套件規格（預設：`latest`） |
| `-GitDir <path>`            | 檢出目錄（預設：`%USERPROFILE%\openclaw`）     |
| `-NoOnboard`                | 略過入門                                       |
| `-NoGitUpdate`              | 略過 `git pull`                                |
| `-DryRun`                   | 僅列印動作                                     |

  </Accordion>

  <Accordion title="環境變數參考">

| Variable                           | 描述          |
| ---------------------------------- | ------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安裝方法      |
| `OPENCLAW_GIT_DIR=<path>`          | 檢出目錄      |
| `OPENCLAW_NO_ONBOARD=1`            | 略過入門      |
| `OPENCLAW_GIT_UPDATE=0`            | 停用 git pull |
| `OPENCLAW_DRY_RUN=1`               | 試執行模式    |

  </Accordion>
</AccordionGroup>

<Note>如果使用了 `-InstallMethod git` 但缺少 Git，腳本將會退出並列印 Git for Windows 的連結。</Note>

---

## CI 與自動化

使用非互動式 flags/env vars 以確保可預測的執行。

<Tabs>
  <Tab title="install.sh (non-interactive npm)">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --no-prompt --no-onboard ```
  </Tab>
  <Tab title="install.sh (non-interactive git)">
    ```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2
    https://openclaw.ai/install.sh | bash ```
  </Tab>
  <Tab title="install-cli.sh (JSON)">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --json --prefix /opt/openclaw ```
  </Tab>
  <Tab title="install.ps1 (skip onboarding)">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

---

## 疑難排解

<AccordionGroup>
  <Accordion title="為什麼需要 Git？">
    `git` 安裝方式需要 Git。對於 `npm` 安裝，仍會檢查/安裝 Git，以避免當相依元件使用 git URLs 時發生 `spawn git ENOENT` 失敗。
  </Accordion>

<Accordion title="為什麼 npm 在 Linux 上會遇到 EACCES？">
  某些 Linux 設定將 npm 全域前綴指向 root 擁有的路徑。`install.sh` 可以將前綴切換至 `~/.npm-global`
  並將 PATH 匯出附加至 shell rc 檔案（當這些檔案存在時）。
</Accordion>

  <Accordion title="sharp/libvips 問題">
    這些腳本預設 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 以避免 sharp 針對系統 libvips 進行建置。若要覆寫：

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title="Windows：「npm error spawn git / ENOENT」">
  安裝 Git for Windows，重新開啟 PowerShell，並重新執行安裝程式。
</Accordion>

<Accordion title="Windows：「openclaw 不是內部或外部命令」">
  執行 `npm config get prefix` 並將該目錄新增至您的使用者 PATH（在 Windows 上 不需要 `\bin`
  後綴），然後重新開啟 PowerShell。
</Accordion>

  <Accordion title="Windows：如何取得詳細安裝程式輸出">
    `install.ps1` 目前未公開 `-Verbose` 參數。
    請使用 PowerShell 追蹤來進行腳本層級的診斷：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="安裝後找不到 openclaw">
    通常是 PATH 問題。請參閱 [Node.js 疑難排解](/zh-Hant/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
