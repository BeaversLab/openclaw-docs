---
summary: "使用 Ansible、Tailscale VPN 和防火牆隔離自動化且經過強化的 OpenClaw 安裝"
read_when:
  - You want automated server deployment with security hardening
  - You need firewall-isolated setup with VPN access
  - You're deploying to remote Debian/Ubuntu servers
title: "Ansible"
---

# Ansible 安裝

使用 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** 將 OpenClaw 部署到生產伺服器——這是一個具有優先安全架構的自動化安裝程式。

<Info>[openclaw-ansible](https://github.com/openclaw/openclaw-ansible) repo 是 Ansible 部署的權威來源。本頁提供快速概覽。</Info>

## 先決條件

| 需求         | 詳細資訊                         |
| ------------ | -------------------------------- |
| **作業系統** | Debian 11+ 或 Ubuntu 20.04+      |
| **存取權限** | Root 或 sudo 權限                |
| **網路**     | 用於套件安裝的網際網路連線       |
| **Ansible**  | 2.14+ (由快速入門指令碼自動安裝) |

## 您將獲得什麼

- **防火牆優先的安全** -- UFW + Docker 隔離 (僅存取 SSH + Tailscale)
- **Tailscale VPN** -- 安全的遠端存取，無需公開公開服務
- **Docker** -- 隔離的沙箱容器，僅限本地主機綁定
- **縱深防禦** -- 4 層安全架構
- **Systemd 整合** -- 開機自動啟動並強化
- **單一指令設定** -- 在數分鐘內完成部署

## 快速入門

單一指令安裝：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

## 安裝內容

Ansible playbook 會安裝並設定：

1. **Tailscale** -- 用於安全遠端存取的 mesh VPN
2. **UFW 防火牆** -- 僅開放 SSH + Tailscale 連接埠
3. **Docker CE + Compose V2** -- 用於代理沙箱
4. **Node.js 24 + pnpm** -- 執行時相依性 (Node 22 LTS，目前為 `22.14+`，仍受支援)
5. **OpenClaw** -- 基於主機，非容器化
6. **Systemd 服務** -- 自動啟動並強化安全性

<Note>閘道直接在主機上運行（而非在 Docker 中），但代理沙箱使用 Docker 進行隔離。詳情請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。</Note>

## 安裝後設定

<Steps>
  <Step title="Switch to the openclaw user">```bash sudo -i -u openclaw ```</Step>
  <Step title="執行上架嚮導">安裝後腳本會引導您設定 OpenClaw 設定。</Step>
  <Step title="連接訊息服務提供商">登入 WhatsApp、Telegram、Discord 或 Signal： ```bash openclaw channels login ```</Step>
  <Step title="驗證安裝">```bash sudo systemctl status openclaw sudo journalctl -u openclaw -f ```</Step>
  <Step title="連線至 Tailscale">加入您的 VPN 網狀網路以進行安全的遠端存取。</Step>
</Steps>

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

此部署使用 4 層防禦模型：

1. **防火牆 (UFW)** -- 僅公開 SSH (22) + Tailscale (41641/udp)
2. **VPN (Tailscale)** -- 閘道僅能透過 VPN 網狀網路存取
3. **Docker 隔離** -- DOCKER-USER iptables 鏈防止外部連接埠暴露
4. **Systemd 加固** -- NoNewPrivileges、PrivateTmp、非特權使用者

若要驗證您的外部攻擊面：

```bash
nmap -p- YOUR_SERVER_IP
```

僅應開放連接埠 22 (SSH)。所有其他服務（閘道、Docker）皆已鎖定。

安裝 Docker 是為了 Agent 沙箱（隔離的工具執行），而非用於執行閘道本身。請參閱[多 Agent 沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools)以了解沙箱設定。

## 手動安裝

如果您更喜歡手動控制而非自動化：

<Steps>
  <Step title="Install prerequisites">
    ```bash
    sudo apt update && sudo apt install -y ansible git
    ```
  </Step>
  <Step title="Clone the repository">
    ```bash
    git clone https://github.com/openclaw/openclaw-ansible.git
    cd openclaw-ansible
    ```
  </Step>
  <Step title="Install Ansible collections">
    ```bash
    ansible-galaxy collection install -r requirements.yml
    ```
  </Step>
  <Step title="執行 playbook">
    ```bash
    ./run-playbook.sh
    ```

    或者，直接執行並在之後手動執行設定腳本：
    ```bash
    ansible-playbook playbook.yml --ask-become-pass
    # Then run: /tmp/openclaw-setup.sh
    ```

  </Step>
</Steps>

## 更新

Ansible 安裝程式會將 OpenClaw 設定為手動更新。請參閱[更新](/zh-Hant/install/updating)以了解標準更新流程。

若要重新執行 Ansible playbook（例如，用於變更設定）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

此為冪等操作，可安全地多次執行。

## 疑難排解

<AccordionGroup>
  <Accordion title="防火牆阻擋我的連線">
    - 請確保您能先透過 Tailscale VPN 存取
    - SSH 存取 (連接埠 22) 始終允許
    - 依設計，閘道僅能透過 Tailscale 存取
  </Accordion>
  <Accordion title="服務無法啟動">
    ```bash
    # Check logs
    sudo journalctl -u openclaw -n 100

    # Verify permissions
    sudo ls -la /opt/openclaw

    # Test manual start
    sudo -i -u openclaw
    cd ~/openclaw
    openclaw gateway run
    ```

  </Accordion>
  <Accordion title="Docker sandbox issues">
    ```bash
    # Verify Docker is running
    sudo systemctl status docker

    # Check sandbox image
    sudo docker images | grep openclaw-sandbox

    # Build sandbox image if missing
    cd /opt/openclaw/openclaw
    sudo -u openclaw ./scripts/sandbox-setup.sh
    ```

  </Accordion>
  <Accordion title="提供者登入失敗">
    請確保您以 `openclaw` 使用者身分執行：
    ```bash
    sudo -i -u openclaw
    openclaw channels login
    ```
  </Accordion>
</AccordionGroup>

## 進階組態

如需詳細的安全性架構與疑難排解資訊，請參閱 openclaw-ansible 儲存庫：

- [安全性架構](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [技術細節](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [疑難排解指南](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相關

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) -- 完整部署指南
- [Docker](/zh-Hant/install/docker) -- 容器化閘道設定
- [沙盒機制](/zh-Hant/gateway/sandboxing) -- 代理程式沙盒組態
- [多代理程式沙盒與工具](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理程式的隔離
