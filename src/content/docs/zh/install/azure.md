---
summary: "在 Azure Linux 虚拟机上全天候运行 OpenClaw Gateway(网关) 并确保持久化状态"
read_when:
  - You want OpenClaw running 24/7 on Azure with Network Security Group hardening
  - You want a production-grade, always-on OpenClaw Gateway on your own Azure Linux VM
  - You want secure administration with Azure Bastion SSH
title: "Azure"
---

本指南使用 Azure Linux 设置 Azure CLI 虚拟机，应用网络安全组 (NSG) 强化，配置 Azure Bastion 以进行 SSH 访问，并安装 OpenClaw。

## 您将执行的操作

- 使用 Azure CLI 创建 Azure 网络（VNet、子网、NSG）和计算资源
- 应用网络安全组规则，以便仅允许来自 Azure Bastion 的 VM SSH 访问
- 使用 Azure Bastion 进行 SSH 访问（VM 上没有公共 IP）
- 使用安装程序脚本安装 OpenClaw
- 验证 Gateway(网关)

## 您需要

- 具有创建计算和网络资源权限的 Azure 订阅
- 已安装 Azure CLI（如需要，请参阅 [Azure CLI 安装步骤](https://learn.microsoft.com/cli/azure/install-azure-cli)）
- 一个 SSH 密钥对（如果需要，本指南将介绍如何生成）
- 约 20-30 分钟

## 配置部署

<Steps>
  <Step title="登录 Azure CLI">
    ```bash
    az login
    az extension add -n ssh
    ```

    Azure Bastion 原生 SSH 隧道需要 `ssh` 扩展。

  </Step>

  <Step title="注册所需的资源提供程序（一次性操作）">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    验证注册情况。等到两者都显示 `Registered`。

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

  <Step title="设置部署变量">
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

    调整名称和 CIDR 范围以适应您的环境。Bastion 子网必须至少为 `/26`。

  </Step>

  <Step title="选择 SSH 密钥">
    如果您有现有的公钥，请使用它：

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    如果您还没有 SSH 密钥，请生成一个：

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="选择 VM 大小和 OS 磁盘大小">
    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    选择您的订阅和区域中可用的 VM 大小和 OS 磁盘大小：

    - 对于轻度使用，先从小规格开始，以后再扩展
    - 对于更繁重的自动化、更多通道或更大的模型/工具工作负载，使用更多的 vCPU/RAM/磁盘
    - 如果您的区域或订阅配额中没有某个 VM 大小，请选择最接近的可用 SKU

    列出目标区域中可用的 VM 大小：

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    检查您当前的 vCPU 和磁盘使用情况/配额：

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>
</Steps>

## 部署 Azure 资源

<Steps>
  <Step title="创建资源组">
    ```bash
    az group create -n "${RG}" -l "${LOCATION}"
    ```
  </Step>

  <Step title="创建网络安全组">
    创建 NSG 并添加规则，以便只有 Bastion 子网可以通过 SSH 访问 VM。

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

    规则按优先级评估（数字越小越优先）：Bastion 流量在 100 处被允许，然后在 110 和 120 处阻止所有其他 SSH。

  </Step>

  <Step title="创建虚拟网络和子网">
    创建带有 VM 子网（附加了 NSG）的 VNet，然后添加 Bastion 子网。

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

  <Step title="创建 VM">
    该 VM 没有公共 IP。SSH 访问完全通过 Azure Bastion 进行。

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

    `--public-ip-address ""` 防止分配公共 IP。`--nsg ""` 跳过创建按 NIC 的 NSG（子网级别的 NSG 负责安全）。

    **可复现性：** 上面的命令对 Ubuntu 镜像使用了 `latest`。要固定特定版本，请列出可用版本并替换 `latest`：

    ```bash
    az vm image list \
      --publisher Canonical --offer ubuntu-24_04-lts \
      --sku server --all -o table
    ```

  </Step>

  <Step title="创建 Azure Bastion">
    Azure Bastion 提供对虚拟机的托管 SSH 访问，而无需暴露公共 IP。基于 CLI 的 `az network bastion ssh` 需要支持隧道功能的 Standard SKU。

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

    Bastion 预配通常需要 5-10 分钟，但在某些区域可能需要长达 15-30 分钟。

  </Step>
</Steps>

## 安装 OpenClaw

<Steps>
  <Step title="通过 Azure Bastion SSH 登录虚拟机">
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

  <Step title="安装 OpenClaw（在虚拟机 Shell 中）">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/install.sh
    bash /tmp/install.sh
    rm -f /tmp/install.sh
    ```

    如果尚未存在，安装程序将安装 Node LTS 和依赖项，安装 OpenClaw，并启动新手引导向导。有关详细信息，请参阅 [安装](/zh/install)。

  </Step>

  <Step title="验证 Gateway(网关)">
    新手引导完成后：

    ```bash
    openclaw gateway status
    ```

    大多数企业 Azure 团队已经拥有 GitHub Copilot 许可证。如果您属于这种情况，我们建议在 GitHub 新手引导向导中选择 OpenClaw Copilot 提供商。请参阅 [GitHub Copilot 提供商](/zh/providers/github-copilot)。

  </Step>
</Steps>

## 成本注意事项

Azure Bastion Standard SKU 的运行费用约为每月 **140 美元**，虚拟机 (Standard_B2as_v2) 的运行费用约为每月 **55 美元**。

若要降低成本：

- **在不使用时解除分配虚拟机**（停止计费；磁盘费用仍保留）。在解除分配虚拟机期间将无法访问 OpenClaw Gateway(网关) — 当您需要再次激活它时重新启动它：

  ```bash
  az vm deallocate -g "${RG}" -n "${VM_NAME}"
  az vm start -g "${RG}" -n "${VM_NAME}"   # restart later
  ```

- **不需要时删除 Bastion**，并在需要 SSH 访问时重新创建它。Bastion 是成本最高的组件，预配只需几分钟。
- **如果只需要基于门户的 SSH 且不需要 CLI 隧道 (`az network bastion ssh`)，请使用 Basic Bastion SKU**（约 38 美元/月）。

## 清理

要删除本指南创建的所有资源：

```bash
az group delete -n "${RG}" --yes --no-wait
```

这将删除资源组及其中的所有内容（VM、VNet、NSG、Bastion、公共 IP）。

## 后续步骤

- 设置消息通道：[通道](/zh/channels)
- 将本地设备配对为节点：[节点](/zh/nodes)
- 配置 Gateway(网关)：[Gateway(网关) 配置](/zh/gateway/configuration)
- 有关使用 OpenClaw Copilot 模型提供商在 Azure 上部署 GitHub 的更多详细信息：[Azure 上的 OpenClaw 与 GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)

## 相关

- [安装概述](/zh/install)
- [GCP](/zh/install/gcp)
- [DigitalOcean](/zh/install/digitalocean)
