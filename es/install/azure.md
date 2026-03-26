---
summary: "Ejecutar OpenClaw Gateway 24/7 en una máquina virtual Linux de Azure con estado duradero"
read_when:
  - You want OpenClaw running 24/7 on Azure with Network Security Group hardening
  - You want a production-grade, always-on OpenClaw Gateway on your own Azure Linux VM
  - You want secure administration with Azure Bastion SSH
  - You want repeatable deployments with Azure Resource Manager templates
title: "Azure"
---

# OpenClaw en máquina virtual Linux de Azure

Esta guía configura una máquina virtual Linux de Azure, aplica el endurecimiento del grupo de seguridad de red (NSG), configura Azure Bastion (punto de entrada SSH administrado de Azure) e instala OpenClaw.

## Lo que harás

- Implementar recursos de cómputo y red de Azure con plantillas de Azure Resource Manager (ARM)
- Aplicar reglas del grupo de seguridad de red (NSG) de Azure para que el SSH de la máquina virtual solo se permita desde Azure Bastion
- Usar Azure Bastion para el acceso SSH
- Instalar OpenClaw con el script de instalador
- Verificar la puerta de enlace

## Antes de empezar

Necesitarás:

- Una suscripción de Azure con permiso para crear recursos de cómputo y red
- CLI de Azure instalada (consulte los [pasos de instalación de la CLI de Azure](https://learn.microsoft.com/cli/azure/install-azure-cli) si es necesario)

<Steps>
  <Step title="Sign in to Azure CLI">
    ```bash
    az login # Sign in and select your Azure subscription
    az extension add -n ssh # Extension required for Azure Bastion SSH management
    ```
  </Step>

  <Step title="Registrar proveedores de recursos necesarios (una sola vez)">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    Verifique el registro del proveedor de recursos de Azure. Espere hasta que ambos muestren `Registered`.

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

<Step title="Establecer variables de implementación">
  ```bash RG="rg-openclaw" LOCATION="westus2"
  TEMPLATE_URI="https://raw.githubusercontent.com/openclaw/openclaw/main/infra/azure/templates/azuredeploy.json"
  PARAMS_URI="https://raw.githubusercontent.com/openclaw/openclaw/main/infra/azure/templates/azuredeploy.parameters.json"
  ```
</Step>

  <Step title="Seleccionar clave SSH">
    Use su clave pública existente si tiene una:

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    Si aún no tiene una clave SSH, ejecute lo siguiente:

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="Seleccionar el tamaño de la máquina virtual y el tamaño del disco del SO">
    Establezca las variables de tamaño de máquina virtual y disco:

    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    Elija un tamaño de máquina virtual y un tamaño de disco del SO que estén disponibles en su suscripción/región de Azure y que coincidan con su carga de trabajo:

    - Comience con un tamaño menor para un uso ligero y escale más tarde
    - Use más vCPU/RAM/tamaño de disco del SO para una automatización más pesada, más canales o cargas de trabajo de modelos/herramientas más grandes
    - Si un tamaño de máquina virtual no está disponible en su región o cuota de suscripción, elija la SKU disponible más cercana

    Enumere los tamaños de máquina virtual disponibles en su región de destino:

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    Verifique su uso/cuota actual de vCPU de máquina virtual y tamaño de disco del SO:

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>

<Step title="Crear el grupo de recursos">
  ```bash az group create -n "${RG}" -l "${LOCATION}" ```
</Step>

  <Step title="Implementar recursos">
    Este comando aplica la clave SSH, el tamaño de la máquina virtual y el tamaño del disco del sistema operativo seleccionados.

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

  <Step title="Acceder mediante SSH a la máquina virtual a través de Azure Bastion">
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

  <Step title="Instalar OpenClaw (en el shell de la máquina virtual)">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/openclaw-install.sh
    bash /tmp/openclaw-install.sh
    rm -f /tmp/openclaw-install.sh
    openclaw --version
    ```

    El script de instalación se encarga de la detección e instalación de Node y ejecuta el proceso de incorporación de forma predeterminada.

  </Step>

  <Step title="Verificar la puerta de enlace">
    Una vez completada la incorporación:

    ```bash
    openclaw gateway status
    ```

    La mayoría de los equipos empresariales de Azure ya tienen licencias de GitHub Copilot. Si es su caso, le recomendamos elegir el proveedor de GitHub Copilot en el asistente de incorporación de OpenClaw. Consulte [Proveedor de GitHub Copilot](/en/providers/github-copilot).

    La plantilla de ARM incluida utiliza la imagen de Ubuntu `version: "latest"` por comodidad. Si necesita compilaciones reproducibles, ancle una versión específica de la imagen en `infra/azure/templates/azuredeploy.json` (puede enumerar las versiones con `az vm image list --publisher Canonical --offer ubuntu-24_04-lts --sku server --all -o table`).

  </Step>
</Steps>

## Siguientes pasos

- Configure los canales de mensajería: [Canales](/en/channels)
- Empareje dispositivos locales como nodos: [Nodos](/en/nodes)
- Configure la puerta de enlace: [Configuración de la puerta de enlace](/en/gateway/configuration)
- Para obtener más detalles sobre la implementación de OpenClaw en Azure con el proveedor de modelos GitHub Copilot: [OpenClaw en Azure con GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)

import es from "/components/footer/es.mdx";

<es />
