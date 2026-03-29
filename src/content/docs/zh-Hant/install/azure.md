---
summary: "在具有持久狀態的 Azure Linux VM 上 24/7 運行 OpenClaw Gateway"
read_when:
  - You want OpenClaw running 24/7 on Azure with Network Security Group hardening
  - You want a production-grade, always-on OpenClaw Gateway on your own Azure Linux VM
  - You want secure administration with Azure Bastion SSH
title: "Azure"
---

# 在 Azure Linux VM 上使用 OpenClaw

本指南使用 Azure CLI 設定 Azure Linux VM，套用網路安全群組 (NSG) 加固，設定 Azure Bastion 以進行 SSH 存取，並安裝 OpenClaw。

## 您將執行的操作

- 使用 Azure CLI 建立 Azure 網路 (VNet、子網、NSG) 和運算資源
- 套用網路安全群組規則，使 VM SSH 僅允許來自 Azure Bastion 的連線
- 使用 Azure Bastion 進行 SSH 存取 (VM 上沒有公用 IP)
- 使用安裝程式腳本安裝 OpenClaw
- 驗證 Gateway

## 您需要具備

- 具有建立運算和網路資源權限的 Azure 訂用帳戶
- 已安裝 Azure CLI (如需要，請參閱 [Azure CLI 安裝步驟](https://learn.microsoft.com/cli/azure/install-azure-cli))
- 一組 SSH 金鑰對 (如需要，本指南涵蓋如何產生金鑰)
- 約 20-30 分鐘

## 設定部署

<Steps>
  <Step title="登入 Azure CLI">
    ```bash
    az login
    az extension add -n ssh
    ```

    Azure Bastion 原生 SSH 通道需要 `ssh` 擴充功能。

  </Step>

  <Step title="註冊所需的資源提供者 (一次性)">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    驗證註冊狀態。請等到兩者都顯示 `Registered`。

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

  <Step title="設定部署變數">
    ```bash
    RG="rg-openclaw"
    LOCATION="westus2"
    VNET_NAME="vnet-openclaw"
    VNET_PREFIX="10.40.0.0/16"
    VM_SUBNET_NAME="snet-openclaw-vm"
    VM_SUBNET_PREFIX="10.40.2.0/24"
    BASTION_SUBNET_PREFIX="10.40.1.0/26"
    NSG_NAME="nsg-openclaw-vm"
    VM_NAME="vm-openclaw"
    ADMIN_USERNAME="openclaw"
    BASTION_NAME="bas-openclaw"
    BASTION_PIP_NAME="pip-openclaw-bastion"
    ```

    調整名稱和 CIDR 範圍以適合您的環境。Bastion 子網必須至少為 `/26`。

  </Step>

  <Step title="選擇 SSH 金鑰">
    如果您已有現有的公鑰，請使用它：

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    如果您還沒有 SSH 金鑰，請產生一組：

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="選取 VM 大小和 OS 磁碟大小">
    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    選擇您的訂用帳戶和區域中可用的 VM 大小和 OS 磁碟大小：

    - 若為輕度使用，可從較小的規格開始，之後再進行擴充
    - 若為較繁重的自動化、更多通道或較大的模型/工具工作負載，請使用更多的 vCPU/RAM/磁碟
    - 如果您的區域或訂用帳戶配額中無法使用某種 VM 大小，請選擇最接近的可用 SKU

    列出目標區域中可用的 VM 大小：

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    檢查您目前的 vCPU 和磁碟使用量/配額：

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>
</Steps>

## 部署 Azure 資源

<Steps>
  <Step title="Create the resource group">
    ```bash
    az group create -n "${RG}" -l "${LOCATION}"
    ```
  </Step>

  <Step title="建立網路安全性群組">
    建立 NSG 並新增規則，以便只有 Bastion 子網可以透過 SSH 進入 VM。

    ```bash
    az network nsg create \
      -g "${RG}" -n "${NSG_NAME}" -l "${LOCATION}"

    # Allow SSH from the Bastion subnet only
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n AllowSshFromBastionSubnet --priority 100 \
      --access Allow --direction Inbound --protocol Tcp \
      --source-address-prefixes "${BASTION_SUBNET_PREFIX}" \
      --destination-port-ranges 22

    # Deny SSH from the public internet
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n DenyInternetSsh --priority 110 \
      --access Deny --direction Inbound --protocol Tcp \
      --source-address-prefixes Internet \
      --destination-port-ranges 22

    # Deny SSH from other VNet sources
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n DenyVnetSsh --priority 120 \
      --access Deny --direction Inbound --protocol Tcp \
      --source-address-prefixes VirtualNetwork \
      --destination-port-ranges 22
    ```

    規則會依優先順序進行評估（數字越小優先順序越高）：Bastion 流量在 100 允許，然後所有其他 SSH 在 110 和 120 被封鎖。

  </Step>

  <Step title="建立虛擬網路和子網">
    建立具有 VM 子網 (附加 NSG) 的 VNet，然後新增 Bastion 子網。

    ```bash
    az network vnet create \
      -g "${RG}" -n "${VNET_NAME}" -l "${LOCATION}" \
      --address-prefixes "${VNET_PREFIX}" \
      --subnet-name "${VM_SUBNET_NAME}" \
      --subnet-prefixes "${VM_SUBNET_PREFIX}"

    # Attach the NSG to the VM subnet
    az network vnet subnet update \
      -g "${RG}" --vnet-name "${VNET_NAME}" \
      -n "${VM_SUBNET_NAME}" --nsg "${NSG_NAME}"

    # AzureBastionSubnet — name is required by Azure
    az network vnet subnet create \
      -g "${RG}" --vnet-name "${VNET_NAME}" \
      -n AzureBastionSubnet \
      --address-prefixes "${BASTION_SUBNET_PREFIX}"
    ```

  </Step>

  <Step title="建立 VM">
    VM 沒有公用 IP。SSH 存取完全透過 Azure Bastion。

    ```bash
    az vm create \
      -g "${RG}" -n "${VM_NAME}" -l "${LOCATION}" \
      --image "Canonical:ubuntu-24_04-lts:server:latest" \
      --size "${VM_SIZE}" \
      --os-disk-size-gb "${OS_DISK_SIZE_GB}" \
      --storage-sku StandardSSD_LRS \
      --admin-username "${ADMIN_USERNAME}" \
      --ssh-key-values "${SSH_PUB_KEY}" \
      --vnet-name "${VNET_NAME}" \
      --subnet "${VM_SUBNET_NAME}" \
      --public-ip-address "" \
      --nsg ""
    ```

    `--public-ip-address ""` 可防止指派公用 IP。`--nsg ""` 會跳過建立個別 NIC 的 NSG (子網層級的 NSG 負責安全性)。

    **可重現性：** 上述命令對 Ubuntu 映像使用 `latest`。若要釘選特定版本，請列出可用版本並取代 `latest`：

    ```bash
    az vm image list \
      --publisher Canonical --offer ubuntu-24_04-lts \
      --sku server --all -o table
    ```

  </Step>

  <Step title="建立 Azure Bastion">
    Azure Bastion 提供對 VM 的受控 SSH 存取，而不需要公開公用 IP。對於基於 CLI 的 `az network bastion ssh`，需要具有通道功能的標準 SKU。

    ```bash
    az network public-ip create \
      -g "${RG}" -n "${BASTION_PIP_NAME}" -l "${LOCATION}" \
      --sku Standard --allocation-method Static

    az network bastion create \
      -g "${RG}" -n "${BASTION_NAME}" -l "${LOCATION}" \
      --vnet-name "${VNET_NAME}" \
      --public-ip-address "${BASTION_PIP_NAME}" \
      --sku Standard --enable-tunneling true
    ```

    Bastion 佈建通常需要 5-10 分鐘，但在某些區域可能需要長達 15-30 分鐘。

  </Step>
</Steps>

## 安裝 OpenClaw

<Steps>
  <Step title="SSH into the VM through Azure Bastion">
    ```bash
    VM_ID="$(az vm show -g "${RG}" -n "${VM_NAME}" --query id -o tsv)"

    az network bastion ssh \
      --name "${BASTION_NAME}" \
      --resource-group "${RG}" \
      --target-resource-id "${VM_ID}" \
      --auth-type ssh-key \
      --username "${ADMIN_USERNAME}" \
      --ssh-key ~/.ssh/id_ed25519
    ```

  </Step>

  <Step title="安裝 OpenClaw (在 VM shell 中)">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/install.sh
    bash /tmp/install.sh
    rm -f /tmp/install.sh
    ```

    如果尚未安裝，安裝程式會安裝 Node LTS 和相依套件，安裝 OpenClaw，並啟動入門精靈。詳細資訊請參閱 [安裝](/en/install)。

  </Step>

  <Step title="驗證閘道">
    入門完成後：

    ```bash
    openclaw gateway status
    ```

    大多數企業 Azure 團隊已經有 GitHub Copilot 授權。如果是這種情況，我們建議您在 OpenClaw 入門精靈中選擇 GitHub Copilot 提供者。請參閱 [GitHub Copilot 提供者](/en/providers/github-copilot)。

  </Step>
</Steps>

## 成本考量

Azure Bastion Standard SKU 每月大約花費 **$140/月**，而 VM (Standard_B2as_v2) 每月大約花費 **$55/月**。

若要降低成本：

- **停止配置 VM** (Deallocate the VM) 當不使用時 (停止運算計費；磁碟費用保留)。當 VM 停止配置時，將無法連線到 OpenClaw 閘道 — 當您需要再次上線時重新啟動它：

  ```bash
  az vm deallocate -g "${RG}" -n "${VM_NAME}"
  az vm start -g "${RG}" -n "${VM_NAME}"   # restart later
  ```

- **不需要時刪除 Bastion**，並在您需要 SSH 存取時重新建立。Bastion 是最大的成本組成部分，只需幾分鐘即可佈建。
- **使用 Basic Bastion SKU** (~$38/月)，如果您只需要基於入口網站的 SSH 且不需要 CLI 通道 (`az network bastion ssh`)。

## 清理

若要刪除本指南建立的所有資源：

```bash
az group delete -n "${RG}" --yes --no-wait
```

這會移除資源群組以及其中的所有內容 (VM、VNet、NSG、Bastion、公用 IP)。

## 後續步驟

- 設定訊息通道：[通道](/en/channels)
- 將本機裝置配對為節點：[節點](/en/nodes)
- 設定閘道：[閘道設定](/en/gateway/configuration)
- 有關使用 GitHub Copilot 模型提供者在 Azure 上部署 OpenClaw 的更多詳細資訊：[OpenClaw on Azure with GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)
