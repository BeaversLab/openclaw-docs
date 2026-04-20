---
summary: "Exécuter OpenClaw Gateway 24/7 sur un Azure Linux VM avec un état durable"
read_when:
  - You want OpenClaw running 24/7 on Azure with Network Security Group hardening
  - You want a production-grade, always-on OpenClaw Gateway on your own Azure Linux VM
  - You want secure administration with Azure Bastion SSH
title: "Azure"
---

# OpenClaw sur Azure Linux VM

Ce guide configure une Azure Linux VM avec Azure CLI, applique le durcissement du groupe de sécurité réseau (NSG), configure Azure Bastion pour l'accès SSH et installe OpenClaw.

## Ce que vous allez faire

- Créer des ressources de mise en réseau (VNet, sous-réseaux, NSG) et de calcul Azure avec Azure CLI
- Appliquer les règles du groupe de sécurité réseau afin que le SSH de la VM soit autorisé uniquement depuis Azure Bastion
- Utiliser Azure Bastion pour l'accès SSH (pas d'IP publique sur la VM)
- Installer OpenClaw avec le script d'installation
- Vérifier le Gateway

## Ce dont vous avez besoin

- Un abonnement Azure avec l'autorisation de créer des ressources de calcul et réseau
- Azure CLI installé (voir les [étapes d'installation d'Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) si nécessaire)
- Une paire de clés SSH (le guide couvre la génération d'une paire si nécessaire)
- ~20-30 minutes

## Configurer le déploiement

<Steps>
  <Step title="Se connecter à Azure CLI">
    ```bash
    az login
    az extension add -n ssh
    ```

    L'extension `ssh` est requise pour le tunnelage SSH natif d'Azure Bastion.

  </Step>

  <Step title="Inscrire les fournisseurs de ressources requis (une fois)">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    Vérifiez l'inscription. Attendez que les deux affichent `Registered`.

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

  <Step title="Définir les variables de déploiement">
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

    Ajustez les noms et les plages CIDR pour qu'ils correspondent à votre environnement. Le sous-réseau Bastion doit être d'au moins `/26`.

  </Step>

  <Step title="Sélectionner la clé SSH">
    Utilisez votre clé publique existante si vous en avez une :

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    Si vous n'avez pas encore de clé SSH, générez-en une :

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="Sélectionner la taille de la machine virtuelle et du disque du système d'exploitation">
    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    Choisissez une taille de machine virtuelle et une taille de disque du système d'exploitation disponibles dans votre abonnement et votre région :

    - Commencez plus petit pour une utilisation légère et augmentez la taille ultérieurement
    - Utilisez plus de vCPU/RAM/disque pour une automatisation plus lourde, plus de canaux ou des charges de travail de model/tool plus importantes
    - Si une taille de machine virtuelle n'est pas disponible dans votre région ou le quota de votre abonnement, choisissez la référence SKU disponible la plus proche

    Répertorier les tailles de machines virtuelles disponibles dans votre région cible :

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    Vérifier votre utilisation/quota actuel de vCPU et de disque :

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>
</Steps>

## Déployer les ressources Azure

<Steps>
  <Step title="Créer le groupe de ressources">
    ```bash
    az group create -n "${RG}" -l "${LOCATION}"
    ```
  </Step>

  <Step title="Créer le groupe de sécurité réseau">
    Créez le groupe de sécurité réseau (NSG) et ajoutez des règles pour que seul le sous-réseau Bastion puisse se connecter en SSH à la machine virtuelle.

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

    Les règles sont évaluées par priorité (le plus petit nombre en premier) : le trafic Bastion est autorisé à 100, puis tout autre SSH est bloqué à 110 et 120.

  </Step>

  <Step title="Créer le réseau virtuel et les sous-réseaux">
    Créez le réseau virtuel avec le sous-réseau de la machine virtuelle (NSG attaché), puis ajoutez le sous-réseau Bastion.

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

  <Step title="Créer la machine virtuelle">
    La machine virtuelle n'a pas d'adresse IP publique. L'accès SSH se fait exclusivement via Azure Bastion.

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

    `--public-ip-address ""` empêche l'attribution d'une adresse IP publique. `--nsg ""` ignore la création d'un NSG par carte réseau (le NSG au niveau du sous-réseau gère la sécurité).

    **Reproductibilité :** La commande ci-dessus utilise `latest` pour l'image Ubuntu. Pour figer une version spécifique, répertoriez les versions disponibles et remplacez `latest` :

    ```bash
    az vm image list \
      --publisher Canonical --offer ubuntu-24_04-lts \
      --sku server --all -o table
    ```

  </Step>

  <Step title="Créer Azure Bastion">
    Azure Bastion fournit un accès SSH géré à la machine virtuelle sans exposer d'adresse IP publique. Le Référence SKU Standard avec tunneling est requis pour CLI basé sur `az network bastion ssh`.

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

    L'approvisionnement de Bastion prend généralement 5 à 10 minutes, mais peut prendre jusqu'à 15 à 30 minutes dans certaines régions.

  </Step>
</Steps>

## Installer OpenClaw

<Steps>
  <Step title="Se connecter en SSH à la machine virtuelle via Azure Bastion">
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

  <Step title="Installer OpenClaw (dans le shell de la machine virtuelle)">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/install.sh
    bash /tmp/install.sh
    rm -f /tmp/install.sh
    ```

    Le programme d'installation installe Node LTS et les dépendances si elles ne sont pas déjà présentes, installe OpenClaw et lance l'assistant d'intégration. Consultez la page [Installation](/fr/install) pour plus de détails.

  </Step>

  <Step title="Vérifier la passerelle">
    Une fois l'intégration terminée :

    ```bash
    openclaw gateway status
    ```

    La plupart des équipes d'entreprise Azure possèdent déjà des licences Gateway Copilot. Si c'est votre cas, nous vous recommandons de choisir le fournisseur GitHub Copilot dans l'assistant d'intégration GitHub. Consultez la section [Fournisseur OpenClaw Copilot](/fr/providers/github-copilot).

  </Step>
</Steps>

## Considérations relatives aux coûts

Le Référence SKU Standard d'Azure Bastion coûte environ **140 $/mois** et la machine virtuelle (Standard_B2as_v2) coûte environ **55 $/mois**.

Pour réduire les coûts :

- **Libérer la machine virtuelle** lorsqu'elle n'est pas utilisée (arrête la facturation de calcul ; les frais de disque restent). La passerelle OpenClaw Gateway ne sera pas accessible tant que la machine virtuelle est libérée — redémarrez-la lorsque vous en avez besoin à nouveau :

  ```bash
  az vm deallocate -g "${RG}" -n "${VM_NAME}"
  az vm start -g "${RG}" -n "${VM_NAME}"   # restart later
  ```

- **Supprimer Bastion lorsqu'il n'est pas nécessaire** et le recréer lorsque vous avez besoin d'un accès SSH. Bastion est le composant le plus coûteux et ne prend que quelques minutes à approvisionner.
- **Utiliser le Référence SKU Bastion Basic** (~38 $/mois) si vous avez uniquement besoin d'un accès SSH basé sur le portail et que vous n'exigez pas de tunneling CLI (`az network bastion ssh`).

## Nettoyage

Pour supprimer toutes les ressources créées par ce guide :

```bash
az group delete -n "${RG}" --yes --no-wait
```

Cela supprime le groupe de ressources et tout ce qu'il contient (machine virtuelle, réseau virtuel, groupe de sécurité réseau, Bastion, adresse IP publique).

## Étapes suivantes

- Configurer les canaux de messagerie : [Canaux](/fr/channels)
- Associer les appareils locaux en tant que nœuds : [Nœuds](/fr/nodes)
- Configurer le Gateway : [Configuration du Gateway](/fr/gateway/configuration)
- Pour plus de détails sur le déploiement OpenClaw sur Azure avec le fournisseur de modèles GitHub Copilot : [OpenClaw sur Azure avec GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)
