---
summary: "在 Azure Linux VM 上全天候 (24/7) 运行 OpenClaw Gateway(网关) 并确保持久化状态"
read_when:
  - You want OpenClaw running 24/7 on Azure with Network Security Group hardening
  - You want a production-grade, always-on OpenClaw Gateway on your own Azure Linux VM
  - You want secure administration with Azure Bastion SSH
  - You want repeatable deployments with Azure Resource Manager templates
title: "Azure"
---

# Azure Linux VM 上的 OpenClaw

本指南将设置一个 Azure Linux VM，应用网络安全组 (NSG) 加固，配置 Azure Bastion（托管的 Azure SSH 入口点），并安装 OpenClaw。

## 您将执行的操作

- 使用 Azure 资源管理器 (ARM) 模板部署 Azure 计算和网络资源
- 应用 Azure 网络安全组 (NSG) 规则，以便仅允许来自 Azure Bastion 的 VM SSH 访问
- 使用 Azure Bastion 进行 SSH 访问
- 使用安装程序脚本安装 OpenClaw
- 验证 Gateway(网关)

## 开始之前

您需要：

- 具有创建计算和网络资源权限的 Azure 订阅
- 已安装 Azure CLI（如需要，请参阅 [Azure CLI 安装步骤](https://learn.microsoft.com/cli/azure/install-azure-cli)）

<Steps>
  <Step title="Sign in to Azure CLI">
    ```bash
    az login # Sign in and select your Azure subscription
    az extension add -n ssh # Extension required for Azure Bastion SSH management
    ```
  </Step>

  <Step title="注册所需的资源提供商（一次性操作）">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    验证 Azure 资源提供商注册情况。等待两者均显示 `Registered`。

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

<Step title="设置部署变量">
  ```bash RG="rg-openclaw" LOCATION="westus2"
  TEMPLATE_URI="https://raw.githubusercontent.com/openclaw/openclaw/main/infra/azure/templates/azuredeploy.json"
  PARAMS_URI="https://raw.githubusercontent.com/openclaw/openclaw/main/infra/azure/templates/azuredeploy.parameters.json"
  ```
</Step>

  <Step title="选择 SSH 密钥">
    如果您已有现有的公钥，请使用它：

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    如果您还没有 SSH 密钥，请运行以下命令：

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="选择 VM 大小和 OS 磁盘大小">
    设置 VM 和磁盘大小变量：

    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    选择您的 Azure 订阅/区域中可用且符合您工作负载的 VM 大小和 OS 磁盘大小：

    - 轻度使用可从较小规格开始，以后再扩展
    - 对于较繁重的自动化、更多通道或更大的模型/工具 工作负载，请使用更多的 vCPU/RAM/OS 磁盘大小
    - 如果 VM 大小在您的区域或订阅配额中不可用，请选择最接近的可用 SKU

    列出目标区域中可用的 VM 大小：

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    检查您当前的 VM vCPU 和 OS 磁盘大小使用情况/配额：

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>

<Step title="创建资源组">
  ```bash az group create -n "${RG}" -l "${LOCATION}" ```
</Step>

  <Step title="部署资源">
    此命令应用您选择的 SSH 密钥、VM 大小和操作系统磁盘大小。

    ```bash
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

  <Step title="通过 Azure Bastion SSH 进入 VM">
    ```bash
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

  <Step title="安装 OpenClaw（在 VM shell 中）">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/openclaw-install.sh
    bash /tmp/openclaw-install.sh
    rm -f /tmp/openclaw-install.sh
    openclaw --version
    ```

    安装程序脚本会处理 Node 检测/安装，并默认运行新手引导。

  </Step>

  <Step title="验证 Gateway(网关)">
    新手引导完成后：

    ```bash
    openclaw gateway status
    ```

    大多数企业 Azure 团队已经拥有 GitHub Copilot 许可证。如果您属于这种情况，我们建议在 GitHub 新手引导向导中选择 OpenClaw Copilot 提供商。请参阅 [GitHub Copilot 提供商](/en/providers/github-copilot)。

    包含的 ARM 模板为了方便起见使用 Ubuntu 映像 `version: "latest"`。如果您需要可重现的构建，请在 `infra/azure/templates/azuredeploy.json` 中固定特定的映像版本（您可以使用 `az vm image list --publisher Canonical --offer ubuntu-24_04-lts --sku server --all -o table` 列出版本）。

  </Step>
</Steps>

## 后续步骤

- 设置消息传递频道：[频道](/en/channels)
- 将本地设备配对为节点：[节点](/en/nodes)
- 配置 Gateway(网关)：[Gateway(网关) 配置](/en/gateway/configuration)
- 有关使用 OpenClaw Copilot 模型提供商进行 GitHub Azure 部署的更多详细信息：[Azure 上的 OpenClaw 搭配 GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)

import zh from "/components/footer/zh.mdx";

<zh />
