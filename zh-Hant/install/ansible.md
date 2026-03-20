---
summary: "使用 Ansible、Tailscale VPN 和防火牆隔離的自動化、已加固的 OpenClaw 安裝"
read_when:
  - 您希望透過安全性加固來自動部署伺服器
  - 您需要具備 VPN 存取權的防火牆隔離環境
  - 您正在部署到遠端 Debian/Ubuntu 伺服器
title: "Ansible"
---

# Ansible 安裝

將 OpenClaw 部署到生產伺服器的推薦方式是透過 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** —— 一個採用安全優先架構的自動安裝程式。

## 快速入門

單指令安裝：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

> **📦 完整指南：[github.com/openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**
>
> openclaw-ansible 存儲庫是 Ansible 部署的權威來源。本頁面僅作快速概覽。

## 您將獲得什麼

- 🔒 **防火牆優先的安全性**：UFW + Docker 隔離（僅存取 SSH + Tailscale）
- 🔐 **Tailscale VPN**：無需公開暴露服務的安全遠端存取
- 🐳 **Docker**：隔離的沙盒容器，僅綁定本機
- 🛡️ **縱深防禦**：4 層安全架構
- 🚀 **一鍵設定**：數分鐘內完成部署
- 🔧 **Systemd 整合**：開機自動啟動並含安全加固

## 需求

- **作業系統**：Debian 11+ 或 Ubuntu 20.04+
- **權限**：Root 或 sudo 權限
- **網路**：用於安裝套件的網際網路連線
- **Ansible**：2.14+（由快速入門腳本自動安裝）

## 會安裝什麼

Ansible playbook 會安裝並設定：

1. **Tailscale**（用於安全遠端存取的網狀 VPN）
2. **UFW 防火牆**（僅開放 SSH + Tailscale 連接埠）
3. **Docker CE + Compose V2**（用於 Agent 沙盒）
4. **Node.js 24 + pnpm**（執行時期依賴；Node 22 LTS，目前為 `22.16+`，仍為相容性提供支援）
5. **OpenClaw**（基於主機，非容器化）
6. **Systemd 服務**（含安全加固的自動啟動）

注意：閘道直接在主機上執行（不在 Docker 中），但 Agent 沙盒使用 Docker 進行隔離。詳情請參閱 [沙盒隔離](/zh-Hant/gateway/sandboxing)。

## 安裝後設定

安裝完成後，切換至 openclaw 使用者：

```bash
sudo -i -u openclaw
```

安裝後腳本將引導您完成：

1. **入門精靈**：設定 OpenClaw
2. **供應商登入**：連接 WhatsApp/Telegram/Discord/Signal
3. **閘道測試**：驗證安裝
4. **Tailscale 設定**：連接至您的 VPN 網格

### 快速指令

```bash
# Check service status
sudo systemctl status openclaw

# View live logs
sudo journalctl -u openclaw -f

# Restart gateway
sudo systemctl restart openclaw

# Provider login (run as openclaw user)
sudo -i -u openclaw
openclaw channels login
```

## 安全架構

### 四層防禦

1. **防火牆 (UFW)**：僅公開 SSH (22) + Tailscale (41641/udp)
2. **VPN (Tailscale)**：閘道僅能透過 VPN 網格存取
3. **Docker 隔離**：DOCKER-USER iptables 鏈防止外部連接埠暴露
4. **Systemd 加固**：NoNewPrivileges、PrivateTmp、非特權使用者

### 驗證

測試外部攻擊面：

```bash
nmap -p- YOUR_SERVER_IP
```

應顯示 **僅連接埠 22** (SSH) 開放。所有其他服務（閘道、Docker）均已鎖定。

### Docker 可用性

安裝 Docker 是為了 **代理沙盒**（隔離的工具執行），而非用於執行閘道本身。閘道僅綁定至 localhost 並可透過 Tailscale VPN 存取。

請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解沙盒設定。

## 手動安裝

如果您更喜歡手動控制而非自動化：

```bash
# 1. Install prerequisites
sudo apt update && sudo apt install -y ansible git

# 2. Clone repository
git clone https://github.com/openclaw/openclaw-ansible.git
cd openclaw-ansible

# 3. Install Ansible collections
ansible-galaxy collection install -r requirements.yml

# 4. Run playbook
./run-playbook.sh

# Or run directly (then manually execute /tmp/openclaw-setup.sh after)
# ansible-playbook playbook.yml --ask-become-pass
```

## 更新 OpenClaw

Ansible 安裝程式會設定 OpenClaw 以進行手動更新。請參閱 [Updating](/zh-Hant/install/updating) 以了解標準更新流程。

若要重新執行 Ansible playbook（例如，用於設定變更）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

注意：這是冪等的，且可安全地多次執行。

## 疑難排解

### 防火牆阻擋了我的連線

如果您被鎖在門外：

- 請確保您能先透過 Tailscale VPN 存取
- SSH 存取（連接埠 22）始終允許
- 出於設計考量，閘道 **僅** 能透過 Tailscale 存取

### 服務無法啟動

```bash
# Check logs
sudo journalctl -u openclaw -n 100

# Verify permissions
sudo ls -la /opt/openclaw

# Test manual start
sudo -i -u openclaw
cd ~/openclaw
pnpm start
```

### Docker 沙盒問題

```bash
# Verify Docker is running
sudo systemctl status docker

# Check sandbox image
sudo docker images | grep openclaw-sandbox

# Build sandbox image if missing
cd /opt/openclaw/openclaw
sudo -u openclaw ./scripts/sandbox-setup.sh
```

### 供應商登入失敗

請確保您以 `openclaw` 使用者身分執行：

```bash
sudo -i -u openclaw
openclaw channels login
```

## 進階設定

如需詳細的安全架構與疑難排解：

- [Security Architecture](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [Technical Details](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [Troubleshooting Guide](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相關

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — 完整部署指南
- [Docker](/zh-Hant/install/docker) — 容器化閘道設定
- [Sandboxing](/zh-Hant/gateway/sandboxing) — 代理沙盒設定
- [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) — 每個代理的隔離

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
