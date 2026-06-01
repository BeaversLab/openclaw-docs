---
summary: "安裝 OpenClaw - 安裝程式指令碼、npm/pnpm/bun、從原始碼、Docker 以及更多"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "安裝"
---

## 系統需求

- **Node 24**（建議）或 Node 22.19+ - 安裝程式會自動處理此項
- **macOS、Linux 或 Windows** - 原生 Windows 和 WSL2 均受支援；WSL2 更為穩定。請參閱 [Windows](/zh-Hant/platforms/windows)。
- `pnpm` 僅在您從原始碼建構時才需要

## 推薦：安裝程式腳本

最快的安裝方式。它會偵測您的作業系統，在需要時安裝 Node，安裝 OpenClaw，並啟動入門導覽。

<Tabs>
  <Tab title="macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Windows (PowerShell)">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
</Tabs>

若要安裝但不執行入門導覽：

<Tabs>
  <Tab title="macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Windows (PowerShell)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

若要查看所有旗標與 CI/自動化選項，請參閱 [Installer internals](/zh-Hant/install/installer)。

## 其他安裝方式

### 本地前綴安裝程式 (`install-cli.sh`)

當您希望將 OpenClaw 和 Node 保留在本地前綴（例如
`~/.openclaw`）下，而不依賴系統範圍的 Node 安裝時，請使用此方法：

```bash
curl -fsSL https://openclaw.ai/install-cli.sh | bash
```

它預設支援 npm 安裝，並在同一前綴流程下支援 git-checkout 安裝。完整參考：[Installer internals](/zh-Hant/install/installer#install-clish)。

已經安裝了嗎？您可以使用
`openclaw update --channel dev` 和 `openclaw update --channel stable` 在套件和 git 安裝之間切換。請參閱
[Updating](/zh-Hant/install/updating#switch-between-npm-and-git-installs)。

### npm、pnpm 或 bun

如果您已自行管理 Node：

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    託管安裝程式會清除 OpenClaw 套件安裝的 npm 新鮮度過濾器，例如 `min-release-age`。
    如果您使用 npm 手動安裝，您自己的
    npm 原則仍然適用。
    </Note>

  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    pnpm approve-builds -g
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm 需要對具有建置腳本的套件給予明確批准。在首次安裝後執行 `pnpm approve-builds -g`。
    </Note>

  </Tab>
  <Tab title="bun">
    ```bash
    bun add -g openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    Bun 支援全域 CLI 安裝路徑。對於 Gateway 執行時，Node 仍是推薦的守護行程執行時。
    </Note>

  </Tab>
</Tabs>

### 從原始碼安裝

適用於貢獻者或任何想要從本地副本執行的人：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm build && pnpm ui:build
pnpm link --global
openclaw onboard --install-daemon
```

或跳過連結並直接在程式庫內部使用 `pnpm openclaw ...`。請參閱 [Setup](/zh-Hant/start/setup) 以了解完整的開發工作流程。

### 從 GitHub main 分支安裝

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --version main
```

### 容器與套件管理員

<CardGroup cols={2}>
  <Card title="Docker" href="/zh-Hant/install/docker" icon="container">
    容器化或無介面部署。
  </Card>
  <Card title="Podman" href="/zh-Hant/install/podman" icon="container">
    Docker 的無根容器替代方案。
  </Card>
  <Card title="Nix" href="/zh-Hant/install/nix" icon="snowflake">
    透過 Nix flake 進行宣告式安裝。
  </Card>
  <Card title="Ansible" href="/zh-Hant/install/ansible" icon="server">
    自動化機群佈建。
  </Card>
  <Card title="Bun" href="/zh-Hant/install/bun" icon="zap">
    透過 Bun 執行時僅使用 CLI。
  </Card>
</CardGroup>

## 驗證安裝

```bash
openclaw --version      # confirm the CLI is available
openclaw doctor         # check for config issues
openclaw gateway status # verify the Gateway is running
```

如果您希望在安裝後進行受管理的啟動：

- macOS：透過 `openclaw onboard --install-daemon` 或 `openclaw gateway install` 使用 LaunchAgent
- Linux/WSL2：透過相同的指令使用 systemd 使用者服務
- 原生 Windows：優先使用排定的工作，如果拒絕建立工作，則退回到個別使用者的啟動資料夾登入項目

## 託管與部署

在雲端伺服器或 VPS 上部署 OpenClaw：

<CardGroup cols={3}>
  <Card title="VPS" href="/zh-Hant/vps">
    任何 Linux VPS。
  </Card>
  <Card title="Docker VM" href="/zh-Hant/install/docker-vm-runtime">
    共用的 Docker 步驟。
  </Card>
  <Card title="Kubernetes" href="/zh-Hant/install/kubernetes">
    K8s 部署。
  </Card>
  <Card title="Fly.io" href="/zh-Hant/install/fly">
    在 Fly.io 上部署。
  </Card>
  <Card title="Hetzner" href="/zh-Hant/install/hetzner">
    Hetzner 部署。
  </Card>
  <Card title="GCP" href="/zh-Hant/install/gcp">
    Google Cloud 部署。
  </Card>
  <Card title="Azure" href="/zh-Hant/install/azure">
    Azure 部署。
  </Card>
  <Card title="Railway" href="/zh-Hant/install/railway">
    Railway 部署。
  </Card>
  <Card title="Render" href="/zh-Hant/install/render">
    Render 部署。
  </Card>
  <Card title="Northflank" href="/zh-Hant/install/northflank">
    Northflank 部署。
  </Card>
</CardGroup>

## 更新、遷移或解除安裝

<CardGroup cols={3}>
  <Card title="Updating" href="/zh-Hant/install/updating" icon="refresh-cw">
    讓 OpenClaw 保持最新狀態。
  </Card>
  <Card title="Migrating" href="/zh-Hant/install/migrating" icon="arrow-right">
    移動到新機器。
  </Card>
  <Card title="Uninstall" href="/zh-Hant/install/uninstall" icon="trash-2">
    完全移除 OpenClaw。
  </Card>
</CardGroup>

## 疑難排解：找不到 `openclaw`

如果安裝成功但在終端機中找不到 `openclaw`：

```bash
node -v           # Node installed?
npm prefix -g     # Where are global packages?
echo "$PATH"      # Is the global bin dir in PATH?
```

如果 `$(npm prefix -g)/bin` 不在您的 `$PATH` 中，請將其新增至您的 Shell 啟動檔案（`~/.zshrc` 或 `~/.bashrc`）：

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

然後打開一個新的終端機。詳情請參閱 [Node 設定](/zh-Hant/install/node)。
