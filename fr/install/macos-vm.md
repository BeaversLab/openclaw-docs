---
summary: "Exécutez OpenClaw dans une VM macOS sandboxée (locale ou hébergée) lorsque vous avez besoin d'isolement ou d'iMessage"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "VMs macOS"
---

# OpenClaw sur des VMs macOS (Sandboxing)

## Par défaut recommandé (pour la plupart des utilisateurs)

- **Petit VPS Linux** pour une Gateway toujours active et à faible coût. Voir [Hébergement VPS](/fr/vps).
- **Matériel dédié** (Mac mini ou boîtier Linux) si vous voulez un contrôle total et une **IP résidentielle** pour l'automatisation du navigateur. De nombreux sites bloquent les IP des centres de données, donc la navigation locale fonctionne souvent mieux.
- **Hybride :** gardez la Gateway sur un VPS bon marché, et connectez votre Mac en tant que **nœud** lorsque vous avez besoin d'automatisation du navigateur/interface. Voir [Nœuds](/fr/nodes) et [Gateway distante](/fr/gateway/remote).

Utilisez une VM macOS lorsque vous avez spécifiquement besoin de capacités exclusives à macOS (iMessage/BlueBubbles) ou si vous souhaitez un isolement strict de votre Mac quotidien.

## Options de VM macOS

### VM locale sur votre Apple Silicon Mac (Lume)

Exécutez OpenClaw dans une VM macOS sandboxée sur votre Apple Silicon Mac existant en utilisant [Lume](https://cua.ai/docs/lume).

Cela vous offre :

- Environnement macOS complet en isolation (votre hôte reste propre)
- Support iMessage via BlueBubbles (impossible sur Linux/Windows)
- Réinitialisation instantanée en clonant les VMs
- Aucun coût matériel ou cloud supplémentaire

### Fournisseurs de Mac hébergés (cloud)

Si vous voulez macOS dans le cloud, les fournisseurs de Mac hébergés fonctionnent aussi :

- [MacStadium](https://www.macstadium.com/) (Macs hébergés)
- D'autres fournisseurs de Mac hébergés fonctionnent également ; suivez leur documentation VM + SSH

Une fois que vous avez un accès SSH à une VM macOS, continuez à l'étape 6 ci-dessous.

---

## Accès rapide (Lume, utilisateurs expérimentés)

1. Installer Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Terminez l'Assistant de configuration, activez la Connexion distante (SSH)
4. `lume run openclaw --no-display`
5. Connectez-vous par SSH, installez OpenClaw, configurez les canaux
6. Terminé

---

## Ce dont vous avez besoin (Lume)

- Apple Silicon Mac (M1/M2/M3/M4)
- macOS Sequoia ou version ultérieure sur l'hôte
- ~60 Go d'espace disque libre par VM
- ~20 minutes

---

## 1) Installer Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

Si `~/.local/bin` n'est pas dans votre PATH :

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

Vérifiez :

```bash
lume --version
```

Docs : [Installation de Lume](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) Créer la VM macOS

```bash
lume create openclaw --os macos --ipsw latest
```

Cela télécharge macOS et crée la VM. Une fenêtre VNC s'ouvre automatiquement.

Remarque : Le téléchargement peut prendre un certain temps selon votre connexion.

---

## 3) Terminer l'Assistant de configuration

Dans la fenêtre VNC :

1. Sélectionnez la langue et la région
2. Ignorez l'Apple ID (ou connectez-vous si vous voulez iMessage plus tard)
3. Créez un compte utilisateur (mémorisez le nom d'utilisateur et le mot de passe)
4. Ignorez toutes les fonctionnalités facultatives

Une fois la configuration terminée, activez SSH :

1. Ouvrez Réglages Système → Général → Partage
2. Activez « Connexion à distance »

---

## 4) Obtenir l'adresse IP de la VM

```bash
lume get openclaw
```

Recherchez l'adresse IP (généralement `192.168.64.x`).

---

## 5) Se connecter en SSH à la VM

```bash
ssh youruser@192.168.64.X
```

Remplacez `youruser` par le compte que vous avez créé, et l'IP par l'IP de votre VM.

---

## 6) Installer OpenClaw

Dans la VM :

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Suivez les invites d'onboarding pour configurer votre fournisseur de modèles (Anthropic, OpenAI, etc.).

---

## 7) Configurer les channels

Modifiez le fichier de configuration :

```bash
nano ~/.openclaw/openclaw.json
```

Ajoutez vos channels :

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+15551234567"]
    },
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN"
    }
  }
}
```

Connectez-vous ensuite à WhatsApp (scannez le QR) :

```bash
openclaw channels login
```

---

## 8) Exécuter la VM en mode headless

Arrêtez la VM et redémarrez-la sans affichage :

```bash
lume stop openclaw
lume run openclaw --no-display
```

La VM s'exécute en arrière-plan. Le daemon de OpenClaw maintient la passerelle en marche.

Pour vérifier l'état :

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonus : intégration iMessage

C'est la fonctionnalité majeure de l'exécution sur macOS. Utilisez [BlueBubbles](https://bluebubbles.app) pour ajouter iMessage à OpenClaw.

Dans la VM :

1. Téléchargez BlueBubbles depuis bluebubbles.app
2. Connectez-vous avec votre Apple ID
3. Activez l'API Web et définissez un mot de passe
4. Orientez les webhooks BlueBubbles vers votre passerelle (exemple : `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`)

Ajoutez à votre config OpenClaw :

```json
{
  "channels": {
    "bluebubbles": {
      "serverUrl": "http://localhost:1234",
      "password": "your-api-password",
      "webhookPath": "/bluebubbles-webhook"
    }
  }
}
```

Redémarrez la passerelle. Désormais, votre agent peut envoyer et recevoir des iMessages.

Détails complets de la configuration : [channel BlueBubbles](/fr/channels/bluebubbles)

---

## Sauvegarder une image dorée

Avant de personnaliser davantage, créez un instantané de votre état propre :

```bash
lume stop openclaw
lume clone openclaw openclaw-golden
```

Réinitialiser à tout moment :

```bash
lume stop openclaw && lume delete openclaw
lume clone openclaw-golden openclaw
lume run openclaw --no-display
```

---

## Fonctionnement 24/7

Gardez la VM en fonctionnement en :

- Gardant votre Mac branché
- Désactivant la mise en veille dans Réglages Système → Économie d'énergie
- Utilisant `caffeinate` si nécessaire

Pour une disponibilité permanente, envisagez un Mac mini dédié ou un petit VPS. Voir [Hébergement VPS](/fr/vps).

---

## Dépannage

| Problème                                  | Solution                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Impossible de se connecter en SSH à la VM | Vérifiez que la « Connexion à distance » est activée dans les réglages système de la VM                     |
| L'IP de la VM ne s'affiche pas            | Attendez que la VM démarre complètement, relancez `lume get openclaw`                                       |
| Commande Lume introuvable                 | Ajoutez `~/.local/bin` à votre PATH                                                                         |
| Le QR WhatsApp ne se scanne pas           | Assurez-vous que vous êtes connecté à la VM (pas à l'hôte) lors de l'exécution de `openclaw channels login` |

---

## Documentation connexe

- [Hébergement VPS](/fr/vps)
- [Nœuds](/fr/nodes)
- [Gateway distant](/fr/gateway/remote)
- [Channel BlueBubbles](/fr/channels/bluebubbles)
- [Démarrage rapide Lume](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Référence CLI Lume](https://cua.ai/docs/lume/reference/cli-reference)
- [Configuration de VM sans assistance](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (avancé)
- [Bac à sable Docker](/fr/install/docker) (méthode d'isolation alternative)

import fr from '/components/footer/fr.mdx';

<fr />
