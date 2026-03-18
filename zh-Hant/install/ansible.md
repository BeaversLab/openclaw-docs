---
summary: "使用 Ansible、Tailscale VPN 和防火牆隔離進行自動化、已加固的 OpenClaw 安裝"
read_when:
  - You want automated server deployment with security hardening
  - You need firewall-isolated setup with VPN access
  - You're deploying to remote Debian/Ubuntu servers
title: "Ansible"
---

# Ansible 安裝

將 OpenClaw 部署到生產伺服器的推薦方式是透過 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** —— 一個具有安全優先架構的自動化安裝程式。

## 快速入門

單指令安裝：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

> **📦 完整指南：[github.com/openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**
>
> openclaw-ansible repo 是 Ansible 部署的事實來源。本頁面僅提供快速概覽。

## 您將獲得

- 🔒 **防火牆優先的安全性**：UFW + Docker 隔離（僅允許 SSH + Tailscale 存取）
- 🔐 **Tailscale VPN**：安全的遠端存取，無需公開暴露服務
- 🐳 **Docker**：隔離的沙箱容器，僅綁定 localhost
- 🛡️ **縱深防禦**：4 層安全架構
- 🚀 **單指令設定**：數分鐘內完成完整部署
- 🔧 **Systemd 整合**：開機自動啟動並進行加固

## 需求

- **OS**：Debian 11+ 或 Ubuntu 20.04+
- **存取權限**：Root 或 sudo 權限
- **網路**：用於套件安裝的網際網路連線
- **Ansible**：2.14+（由快速入門腳本自動安裝）

## 安裝項目

Ansible playbook 將會安裝並設定：

1. **Tailscale**（用於安全遠端存取的網狀 VPN）
2. **UFW 防火牆**（僅開放 SSH + Tailscale 連接埠）
3. **Docker CE + Compose V2**（用於代理程式沙箱）
4. **Node.js 24 + pnpm**（執行時期相依項；Node 22 LTS，目前為 `22.16+`，為了相容性仍持續支援）
5. **OpenClaw**（基於主機，非容器化）
6. **Systemd 服務**（開機自動啟動並進行安全加固）

注意：閘道器**直接在主機上**執行（不在 Docker 中），但代理程式沙箱使用 Docker 進行隔離。詳情請參閱 [沙箱隔離](/zh-Hant/gateway/sandboxing)。

## 安裝後設定

安裝完成後，切換至 openclaw 使用者：

```bash
sudo -i -u openclaw
```

安裝後腳本將會引導您完成：

1. **上架精靈**：設定 OpenClaw
2. **供應商登入**：連結 WhatsApp/Telegram/Discord/Signal
3. **閘道器測試**：驗證安裝
4. **Tailscale 設定**：連接到您的 VPN 網狀網路

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

### 4 層防禦

1. **防火牆 (UFW)**：僅 SSH (22) + Tailscale (41641/udp) 公開暴露
2. **VPN (Tailscale)**：閘道僅可透過 VPN 網狀網路存取
3. **Docker 隔離**：DOCKER-USER iptables 鏈防止外部連接埠暴露
4. **Systemd 加固**：NoNewPrivileges、PrivateTmp、非特權使用者

### 驗證

測試外部攻擊面：

```bash
nmap -p- YOUR_SERVER_IP
```

應顯示 **僅開啟連接埠 22** (SSH)。所有其他服務（閘道、Docker）皆已鎖定。

### Docker 可用性

安裝 Docker 是為了 **代理程式沙盒**（隔離的工具執行），而非為了執行閘道本身。閘道僅綁定至 localhost，並可透過 Tailscale VPN 存取。

參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解沙盒設定。

## 手動安裝

如果您偏好手動控制而非自動化：

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

Ansible 安裝程式會將 OpenClaw 設定為手動更新。請參閱 [Updating](/zh-Hant/install/updating) 以了解標準更新流程。

若要重新執行 Ansible playbook（例如，用於設定變更）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

注意：這是冪等的，且可安全地多次執行。

## 疑難排解

### 防火牆阻擋我的連線

如果您被鎖在外面：

- 請確保您可以先透過 Tailscale VPN 存取
- SSH 存取（連接埠 22）始終允許
- 出於設計考量，閘道 **僅** 可透過 Tailscale 存取

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

### 提供者登入失敗

請確保您是以 `openclaw` 使用者身分執行：

```bash
sudo -i -u openclaw
openclaw channels login
```

## 進階設定

如需詳細的安全架構與疑難排解資訊：

- [Security Architecture](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [Technical Details](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [Troubleshooting Guide](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相關

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — 完整部署指南
- [Docker](/zh-Hant/install/docker) — 容器化閘道設定
- [Sandboxing](/zh-Hant/gateway/sandboxing) — 代理程式沙盒設定
- [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) — 每個代理程式的隔離

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
