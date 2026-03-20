---
summary: "Exécutez OpenClaw dans une VM macOS sandboxée (locale ou hébergée) lorsque vous avez besoin d'isolement ou de iMessage"
read_when:
  - Vous voulez que OpenClaw soit isolé de votre environnement principal macOS
  - Vous voulez l'intégration iMessage (BlueBubbles) dans un bac à sable
  - Vous voulez un environnement macOS réinitialisable que vous pouvez cloner
  - Vous voulez comparer les options de VM macOS locales et hébergées
title: "VM macOS"
---

# OpenClaw sur les VM macOS (Sandboxing)

## Par défaut recommandé (la plupart des utilisateurs)

- **Petit VPS Linux** pour un Gateway toujours actif et à faible coût. Voir [Hébergement VPS](/fr/vps).
- **Matériel dédié** (Mac mini ou boîtier Linux) si vous voulez un contrôle total et une **IP résidentielle** pour l'automatisation du navigateur. De nombreux sites bloquent les IP de centres de données, donc la navigation locale fonctionne souvent mieux.
- **Hybride :** gardez le Gateway sur un VPS bon marché, et connectez votre Mac en tant que **nœud** lorsque vous avez besoin d'automatisation du navigateur/interface. Voir [Nœuds](/fr/nodes) et [Gateway distant](/fr/gateway/remote).

Utilisez une VM macOS lorsque vous avez spécifiquement besoin de capacités exclusives à macOS (iMessage/BlueBubbles) ou si vous souhaitez un isolement strict de votre Mac quotidien.

## Options de VM macOS

### VM locale sur votre Mac Apple Silicon (Lume)

Exécutez OpenClaw dans une VM macOS sandboxée sur votre Mac Apple Silicon existant en utilisant [Lume](https://cua.ai/docs/lume).

Cela vous offre :

- Environnement complet macOS en isolement (votre hôte reste propre)
- Support iMessage via BlueBubbles (impossible sur Linux/Windows)
- Réinitialisation instantanée en clonant les VM
- Aucun matériel supplémentaire ni coût cloud

### Fournisseurs de Mac hébergés (cloud)

Si vous voulez macOS dans le cloud, les fournisseurs de Mac hébergés fonctionnent aussi :

- [MacStadium](https://www.macstadium.com/) (Macs hébergés)
- D'autres vendeurs de Mac hébergés fonctionnent également ; suivez leur documentation VM + SSH

Une fois que vous avez un accès SSH à une VM macOS, continuez à l'étape 6 ci-dessous.

---

## Accès rapide (Lume, utilisateurs expérimentés)

1. Installer Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Terminez l'Assistant de configuration, activez la Connexion à distance (SSH)
4. `lume run openclaw --no-display`
5. Connectez-vous en SSH, installez OpenClaw, configurez les canaux
6. Terminé

---

## Ce dont vous avez besoin (Lume)

- Mac Apple Silicon (M1/M2/M3/M4)
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

Vérifier :

```bash
lume --version
```

Documentation : [Installation de Lume](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) Créer la VM macOS

```bash
lume create openclaw --os macos --ipsw latest
```

Cela télécharge macOS et crée la VM. Une fenêtre VNC s'ouvre automatiquement.

Remarque : Le téléchargement peut prendre un certain temps en fonction de votre connexion.

---

## 3) Terminer l'assistant de configuration

Dans la fenêtre VNC :

1. Sélectionnez la langue et la région
2. Ignorez l'Apple ID (ou connectez-vous si vous souhaitez utiliser iMessage plus tard)
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

Suivez les invites d'intégration (onboarding) pour configurer votre fournisseur de modèle (Anthropic, OpenAI, etc.).

---

## 7) Configurer les canaux

Modifiez le fichier de configuration :

```bash
nano ~/.openclaw/openclaw.json
```

Ajoutez vos canaux :

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

## 8) Exécuter la VM en mode sans affichage (headless)

Arrêtez la VM et redémarrez-la sans affichage :

```bash
lume stop openclaw
lume run openclaw --no-display
```

La VM s'exécute en arrière-plan. Le démon de OpenClaw maintient la passerelle en cours d'exécution.

Pour vérifier l'état :

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonus : Intégration iMessage

C'est la fonctionnalité phare de l'exécution sur macOS. Utilisez [BlueBubbles](https://bluebubbles.app) pour ajouter iMessage à OpenClaw.

Dans la VM :

1. Téléchargez BlueBubbles depuis bluebubbles.app
2. Connectez-vous avec votre Apple ID
3. Activez l'API Web et définissez un mot de passe
4. Dirigez les webhooks BlueBubbles vers votre passerelle (exemple : `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`)

Ajoutez à votre configuration OpenClaw :

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

Redémarrez la passerelle. Votre agent peut maintenant envoyer et recevoir des iMessages.

Détails complets de la configuration : [canal BlueBubbles](/fr/channels/bluebubbles)

---

## Enregistrer une image dorée (golden image)

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

Pour une véritable disponibilité permanente, envisagez un Mac mini dédié ou un petit VPS. Voir [Hébergement VPS](/fr/vps).

---

## Dépannage

| Problème                  | Solution                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Impossible de se connecter en SSH à la VM        | Vérifiez que « Connexion à distance » est activé dans les Réglages Système de la VM                            |
| L'IP de la VM ne s'affiche pas        | Attendez que la VM démarre complètement, exécutez `lume get openclaw` à nouveau                           |
| Commande Lume introuvable   | Ajoutez `~/.local/bin` à votre PATH                                                    |
| Le QR WhatsApp ne se scanne pas | Assurez-vous d'être connecté à la VM (et non à l'hôte) lors de l'exécution de `openclaw channels login` |

---

## Documentation connexe

- [Hébergement VPS](/fr/vps)
- [Nœuds](/fr/nodes)
- [Gateway distant](/fr/gateway/remote)
- [canal BlueBubbles](/fr/channels/bluebubbles)
- [Démarrage rapide Lume](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Référence Lume CLI](https://cua.ai/docs/lume/reference/cli-reference)
- [Configuration sans surveillance de la VM](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (avancé)
- [Bac à sable Docker](/fr/install/docker) (approche d'isolation alternative)

import en from "/components/footer/en.mdx";

<en />
