---
summary: "Ejecutar OpenClaw Gateway 24/7 en una máquina virtual Linux de Azure con estado duradero"
read_when:
  - You want OpenClaw running 24/7 on Azure with Network Security Group hardening
  - You want a production-grade, always-on OpenClaw Gateway on your own Azure Linux VM
  - You want secure administration with Azure Bastion SSH
title: "Azure"
---

# OpenClaw en una máquina virtual Linux de Azure

Esta guía configura una máquina virtual Linux de Azure con la CLI de Azure, aplica el endurecimiento del Grupo de Seguridad de Red (NSG), configura Azure Bastion para el acceso SSH e instala OpenClaw.

## Lo que hará

- Crear recursos de redes (VNet, subredes, NSG) y de proceso de Azure con la CLI de Azure
- Aplicar reglas del Grupo de Seguridad de Red para que el SSH de la máquina virtual solo se permita desde Azure Bastion
- Usar Azure Bastion para el acceso SSH (sin IP pública en la máquina virtual)
- Instalar OpenClaw con el script de instalación
- Verificar el Gateway

## Lo que necesita

- Una suscripción a Azure con permiso para crear recursos de proceso y redes
- CLI de Azure instalada (consulte los [pasos de instalación de la CLI de Azure](https://learn.microsoft.com/cli/azure/install-azure-cli) si es necesario)
- Un par de claves SSH (la guía cubre cómo generar uno si es necesario)
- ~20-30 minutos

## Configurar la implementación

<Steps>
  <Step title="Iniciar sesión en la CLI de Azure">
    ```bash
    az login
    az extension add -n ssh
    ```

    La extensión `ssh` es necesaria para el túnel SSH nativo de Azure Bastion.

  </Step>

  <Step title="Registrar los proveedores de recursos necesarios (una sola vez)">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    Verifique el registro. Espere hasta que ambos muestren `Registered`.

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

  <Step title="Establecer variables de implementación">
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

    Ajuste los nombres y los rangos CIDR para que se ajusten a su entorno. La subred de Bastion debe tener al menos `/26`.

  </Step>

  <Step title="Seleccionar clave SSH">
    Use su clave pública existente si tiene una:

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    Si aún no tiene una clave SSH, genere una:

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="Seleccionar el tamaño de la VM y el tamaño del disco del SO">
    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    Elija un tamaño de VM y un tamaño de disco del SO disponibles en su suscripción y región:

    - Comience con un tamaño menor para uso ligero y escale más tarde
    - Use más vCPU/RAM/disco para automatización más pesada, más canales o cargas de trabajo de modelos/herramientas más grandes
    - Si un tamaño de VM no está disponible en su región o cuota de suscripción, elija el SKU disponible más cercano

    Enumere los tamaños de VM disponibles en su región de destino:

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    Verifique su uso/cuota actual de vCPU y disco:

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>
</Steps>

## Implementación de recursos de Azure

<Steps>
  <Step title="Crear el grupo de recursos">
    ```bash
    az group create -n "${RG}" -l "${LOCATION}"
    ```
  </Step>

  <Step title="Crear el grupo de seguridad de red">
    Cree el NSG y agregue reglas para que solo la subred de Bastion pueda acceder por SSH a la VM.

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

    Las reglas se evalúan por prioridad (primero el número más bajo): el tráfico de Bastion se permite en 100, luego todo el otro SSH se bloquea en 110 y 120.

  </Step>

  <Step title="Crear la red virtual y las subredes">
    Cree la red virtual con la subred de la VM (NSG adjunto), luego agregue la subred de Bastion.

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

  <Step title="Crear la VM">
    La VM no tiene una dirección IP pública. El acceso SSH es exclusivamente a través de Azure Bastion.

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

    `--public-ip-address ""` evita que se asigne una dirección IP pública. `--nsg ""` omite la creación de un NSG por NIC (el NSG a nivel de subred maneja la seguridad).

    **Reproducibilidad:** El comando anterior usa `latest` para la imagen de Ubuntu. Para fijar una versión específica, enumere las versiones disponibles y reemplace `latest`:

    ```bash
    az vm image list \
      --publisher Canonical --offer ubuntu-24_04-lts \
      --sku server --all -o table
    ```

  </Step>

  <Step title="Crear Azure Bastion">
    Azure Bastion proporciona acceso SSH administrado a la máquina virtual sin exponer una dirección IP pública. Se requiere la SKU Estándar con túnel para la `az network bastion ssh` basada en CLI.

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

    El aprovisionamiento de Bastion generalmente tarda entre 5 y 10 minutos, pero puede tardar hasta 15-30 minutos en algunas regiones.

  </Step>
</Steps>

## Instalar OpenClaw

<Steps>
  <Step title="Conectarse por SSH a la máquina virtual a través de Azure Bastion">
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

  <Step title="Instalar OpenClaw (en el shell de la máquina virtual)">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/install.sh
    bash /tmp/install.sh
    rm -f /tmp/install.sh
    ```

    El instalador instala Node LTS y las dependencias si aún no están presentes, instala OpenClaw e inicia el asistente de incorporación. Consulte [Install](/es/install) para obtener más detalles.

  </Step>

  <Step title="Verificar el Gateway">
    Una vez completada la incorporación:

    ```bash
    openclaw gateway status
    ```

    La mayoría de los equipos de Azure empresariales ya tienen licencias de GitHub Copilot. Si es su caso, recomendamos elegir el proveedor de GitHub Copilot en el asistente de incorporación de OpenClaw. Consulte [GitHub Copilot provider](/es/providers/github-copilot).

  </Step>
</Steps>

## Consideraciones de costos

Azure Bastion SKU Estándar cuesta aproximadamente **\$140/mes** y la máquina virtual (Standard_B2as_v2) cuesta aproximadamente **\$55/mes**.

Para reducir los costos:

- **Desasignar la máquina virtual** cuando no esté en uso (detiene la facturación de procesos; los cargos del disco permanecen). El Gateway de OpenClaw no será accesible mientras la máquina virtual esté desasignada; reiníciela cuando necesite que esté activa nuevamente:

  ```bash
  az vm deallocate -g "${RG}" -n "${VM_NAME}"
  az vm start -g "${RG}" -n "${VM_NAME}"   # restart later
  ```

- **Eliminar Bastion cuando no sea necesario** y volver a crearlo cuando necesite acceso SSH. Bastion es el componente de mayor costo y solo toma unos minutos aprovisionarlo.
- **Use la SKU Básica de Bastion** (~\$38/mes) si solo necesita SSH basado en Portal y no requiere túnel CLI (`az network bastion ssh`).

## Limpieza

Para eliminar todos los recursos creados por esta guía:

```bash
az group delete -n "${RG}" --yes --no-wait
```

Esto elimina el grupo de recursos y todo lo que contiene dentro (máquina virtual, VNet, NSG, Bastion, IP pública).

## Pasos siguientes

- Configure los canales de mensajería: [Canales](/es/channels)
- Empareje dispositivos locales como nodos: [Nodos](/es/nodes)
- Configure el Gateway: [Configuración del Gateway](/es/gateway/configuration)
- Para más detalles sobre el despliegue de OpenClaw en Azure con el proveedor de modelos de GitHub Copilot: [OpenClaw en Azure con GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)
