---
summary: "安裝 OpenClaw — 安裝程式腳本、npm/pnpm、從原始碼、Docker 等等"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "安裝"
---

# 安裝

## 推薦：安裝程式腳本

最快的安裝方式。它會偵測您的作業系統，在需要時安裝 Node，安裝 OpenClaw，並啟動入門指引。

<Tabs>
  <Tab title="macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Windows (PowerShell)">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
</Tabs>

若要不執行入門指引直接安裝：

<Tabs>
  <Tab title="macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Windows (PowerShell)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

如需所有旗標和 CI/自動化選項，請參閱 [安裝程式內部機制](/zh-Hant/install/installer)。

## 系統需求

- **Node 24**（推薦）或 Node 22.14+ — 安裝程式腳本會自動處理此項
- **macOS、Linux 或 Windows** — 同時支援原生 Windows 和 WSL2；WSL2 更穩定。請參閱 [Windows](/zh-Hant/platforms/windows)。
- `pnpm` 僅在您從原始碼建置時需要

## 其他安裝方法

### npm 或 pnpm

如果您已自行管理 Node：

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g openclaw@latest
    openclaw onboard --install-daemon
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    pnpm approve-builds -g
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm 要求對包含建置腳本的套件給予明確核准。請在首次安裝後執行 `pnpm approve-builds -g`。
    </Note>

  </Tab>
</Tabs>

<Accordion title="疑難排解：sharp 建置錯誤 (npm)">
  如果 `sharp` 因全域安裝的 libvips 而失敗：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
```

</Accordion>

### 從原始碼

適用於貢獻者或任何想從本機副本執行的人：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm ui:build && pnpm build
pnpm link --global
openclaw onboard --install-daemon
```

或者略過連結並在 repo 內部使用 `pnpm openclaw ...`。完整的開發工作流程請參閱 [設定](/zh-Hant/start/setup)。

### 從 GitHub main 安裝

```bash
npm install -g github:openclaw/openclaw#main
```

### 容器與套件管理員

<CardGroup cols={2}>
  <Card title="Docker" href="/zh-Hant/install/docker" icon="container">
    容器化或無介面部署。
  </Card>
  <Card title="Podman" href="/zh-Hant/install/podman" icon="container">
    Docker 的無 root 容器替代方案。
  </Card>
  <Card title="Nix" href="/zh-Hant/install/nix" icon="snowflake">
    透過 Nix flake 進行宣告式安裝。
  </Card>
  <Card title="Ansible" href="/zh-Hant/install/ansible" icon="server">
    自動化佈建機群。
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

## 託管與部署

將 OpenClaw 部署到雲端伺服器或 VPS：

<CardGroup cols={3}>
  <Card title="VPS" href="/zh-Hant/vps">
    任何 Linux VPS
  </Card>
  <Card title="Docker VM" href="/zh-Hant/install/docker-vm-runtime">
    共用的 Docker 步驟
  </Card>
  <Card title="Kubernetes" href="/zh-Hant/install/kubernetes">
    K8s
  </Card>
  <Card title="Fly.io" href="/zh-Hant/install/fly">
    Fly.io
  </Card>
  <Card title="Hetzner" href="/zh-Hant/install/hetzner">
    Hetzner
  </Card>
  <Card title="GCP" href="/zh-Hant/install/gcp">
    Google Cloud
  </Card>
  <Card title="Azure" href="/zh-Hant/install/azure">
    Azure
  </Card>
  <Card title="Railway" href="/zh-Hant/install/railway">
    Railway
  </Card>
  <Card title="Render" href="/zh-Hant/install/render">
    Render
  </Card>
  <Card title="Northflank" href="/zh-Hant/install/northflank">
    Northflank
  </Card>
</CardGroup>

## 更新、遷移或解除安裝

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

## 故障排除：找不到 `openclaw`

如果安裝成功但在終端機中找不到 `openclaw`：

```bash
node -v           # Node installed?
npm prefix -g     # Where are global packages?
echo "$PATH"      # Is the global bin dir in PATH?
```

如果 `$(npm prefix -g)/bin` 不在您的 `$PATH` 中，請將其新增至您的 shell 啟動檔案（`~/.zshrc` 或 `~/.bashrc`）：

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

然後開啟一個新的終端機。詳情請參閱 [Node 設定](/zh-Hant/install/node)。
