---
summary: "在 Azure Linux VM 上全天候運行 OpenClaw Gateway，並具備持久狀態"
read_when:
  - You want OpenClaw running 24/7 on Azure with Network Security Group hardening
  - You want a production-grade, always-on OpenClaw Gateway on your own Azure Linux VM
  - You want secure administration with Azure Bastion SSH
  - You want repeatable deployments with Azure Resource Manager templates
title: "Azure"
---

# Azure Linux VM 上的 OpenClaw

本指南將設定 Azure Linux VM、套用網路安全性群組 (NSG) 加固、設定 Azure Bastion (受控 Azure SSH 進入點)，並安裝 OpenClaw。

## 您將執行的操作

- 使用 Azure Resource Manager (ARM) 範本部署 Azure 運算和網路資源
- 套用 Azure 網路安全性群組 (NSG) 規則，以便僅允許來自 Azure Bastion 的 VM SSH 連線
- 使用 Azure Bastion 進行 SSH 存取
- 使用安裝程式腳本安裝 OpenClaw
- 驗證 Gateway

## 開始之前

您需要：

- 具備建立運算和網路資源權限的 Azure 訂用帳戶
- 已安裝 Azure CLI (如需要，請參閱 [Azure CLI 安裝步驟](https://learn.microsoft.com/cli/azure/install-azure-cli))

<Steps>
  <Step title="Sign in to Azure CLI">
    ```exec
    az login # Sign in and select your Azure subscription
    az extension add -n ssh # Extension required for Azure Bastion SSH management
    ```
  </Step>

  <Step title="註冊必要的資源提供者（一次性）">
    ```exec
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    驗證 Azure 資源提供者註冊情況。請等到兩者都顯示 `Registered` 為止。

    ```exec
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

<Step title="設定部署變數">```exec RG="rg-openclaw" LOCATION="westus2" TEMPLATE_URI="https://raw.githubusercontent.com/openclaw/openclaw/main/infra/azure/templates/azuredeploy.json" PARAMS_URI="https://raw.githubusercontent.com/openclaw/openclaw/main/infra/azure/templates/azuredeploy.parameters.json" ```</Step>

  <Step title="選取 SSH 金鑰">
    如果您已經有現有的公鑰，請使用該金鑰：

    ```exec
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    如果您還沒有 SSH 金鑰，請執行下列指令：

    ```exec
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="Select VM size and OS disk size">
    設定 VM 和磁碟大小變數：

    ```exec
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    選擇您的 Azure 訂用帳戶/區域中可用且符合您工作負載的 VM 大小和 OS 磁碟大小：

    - 輕量使用從較小的規格開始，之後再擴充
    - 針對較繁重的自動化、更多通道，或較大的模型/工具工作負載，使用更多的 vCPU/RAM/OS 磁碟大小
    - 如果 VM 大小在您的區域或訂用帳戶配額中無法使用，請選擇最接近的可用 SKU

    列出目標區域中可用的 VM 大小：

    ```exec
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    檢查您目前的 VM vCPU 和 OS 磁碟大小使用量/配額：

    ```exec
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>

<Step title="Create the resource group">
  ```exec az group create -n "${RG}" -l "${LOCATION}" ```
</Step>

  <Step title="部署資源">
    此命令會套用您選取的 SSH 金鑰、VM 大小和 OS 磁碟大小。

    ```exec
    az deployment group create \
      -g "${RG}" \
      --template-uri "${TEMPLATE_URI}" \
      --parameters "${PARAMS_URI}" \
      --parameters location="${LOCATION}" \
      --parameters vmSize="${VM_SIZE}" \
      --parameters osDiskSizeGb="${OS_DISK_SIZE_GB}" \
      --parameters sshPublicKey="${SSH_PUB_KEY}"
    ```

  </Step>

  <Step title="透過 Azure Bastion SSH 登入 VM">
    ```exec
    RG="rg-openclaw"
    VM_NAME="vm-openclaw"
    BASTION_NAME="bas-openclaw"
    ADMIN_USERNAME="openclaw"
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

  <Step title="安裝 OpenClaw（在 VM shell 中）">
    ```exec
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/openclaw-install.sh
    bash /tmp/openclaw-install.sh
    rm -f /tmp/openclaw-install.sh
    openclaw --version
    ```

    安裝程式腳本會處理 Node 的偵測/安裝，並預設執行入門流程。

  </Step>

  <Step title="驗證閘道">
    完成上架後：

    ```exec
    openclaw gateway status
    ```

    大多數企業 Azure 團隊已經擁有 GitHub Copilot 授權。如果是這種情況，我們建議您在 OpenClaw 上架精靈中選擇 GitHub Copilot 提供者。請參閱 [GitHub Copilot 提供者](/en/providers/github-copilot)。

    包含的 ARM 範本為了方便起見使用 Ubuntu 映像 `version: "latest"`。如果您需要可重現的組建，請在 `infra/azure/templates/azuredeploy.json` 中鎖定特定的映像版本 (您可以使用 `az vm image list --publisher Canonical --offer ubuntu-24_04-lts --sku server --all -o table` 列出版本)。

  </Step>
</Steps>

## 後續步驟

- 設定訊息頻道：[頻道](/en/channels)
- 將本機裝置配對為節點：[節點](/en/nodes)
- 設定閘道：[閘道設定](/en/gateway/configuration)
- 有關搭配 GitHub Copilot 模型提供者在 Azure 上部署 OpenClaw 的更多詳細資訊：[OpenClaw on Azure with GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)
