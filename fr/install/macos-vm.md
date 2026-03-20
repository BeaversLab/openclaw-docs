---
summary: "Exécutez OpenClaw dans une VM macOS sandboxée (locale ou hébergée) lorsque vous avez besoin d'isolement ou d'macOS"
read_when:
  - Vous souhaitez isoler OpenClaw de votre environnement principal macOS
  - Vous souhaitez l'intégration iMessage (BlueBubbles) dans un sandbox
  - Vous souhaitez un environnement macOS réinitialisable que vous pouvez cloner
  - Vous souhaitez comparer les options de VM macOS locale et hébergée
title: "VMs macOS"
---

# OpenClaw sur les VMs macOS (Sandboxing)

## Par défaut recommandé (la plupart des utilisateurs)

- **Petit VPS Linux** pour une Gateway toujours active et à faible coût. Voir [Hébergement VPS](/fr/vps).
- **Matériel dédié** (Mac mini ou boîtier Linux) si vous souhaitez un contrôle total et une **IP résidentielle** pour l'automatisation du navigateur. De nombreux sites bloquent les IP des centres de données, donc la navigation locale fonctionne souvent mieux.
- **Hybride :** gardez la Gateway sur un VPS bon marché, et connectez votre Mac en tant que **nœud** lorsque vous avez besoin d'une automatisation du navigateur/interface. Voir [Nœuds](/fr/nodes) et [Gateway distant](/fr/gateway/remote).

Utilisez une VM macOS lorsque vous avez spécifiquement besoin de capacités exclusives à macOS (iMessage/BlueBubbles) ou souhaitez un isolement strict de votre Mac quotidien.

## Options de VM macOS

### VM locale sur votre Mac Apple Silicon (Lume)

Exécutez OpenClaw dans une VM macOS sandboxée sur votre Mac Apple Silicon existant en utilisant [Lume](https://cua.ai/docs/lume).

Cela vous offre :

- Environnement complet macOS en isolation (votre hôte reste propre)
- Prise en charge d'iMessage via BlueBubbles (impossible sur Linux/Windows)
- Réinitialisation instantanée en clonant les VMs
- Aucun coût matériel ou cloud supplémentaire

### Fournisseurs de Mac hébergés (cloud)

Si vous souhaitez macOS dans le cloud, les fournisseurs de Mac hébergés fonctionnent également :

- [MacStadium](https://www.macstadium.com/) (Macs hébergés)
- D'autres fournisseurs de Mac hébergés fonctionnent aussi ; suivez leur documentation VM + SSH

Une fois que vous avez un accès SSH à une VM macOS, continuez à l'étape 6 ci-dessous.

---

## Accès rapide (Lume, utilisateurs expérimentés)

1. Installer Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Terminez l'Assistant de configuration, activez la Connexion à distance (SSH)
4. `lume run openclaw --no-display`
5. Connectez-vous par SSH, installez OpenClaw, configurez les canaux
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

Remarque : Le téléchargement peut prendre un certain temps selon votre connexion.

---

## 3) Terminer l'assistant de configuration

Dans la fenêtre VNC :

1. Sélectionnez la langue et la région
2. Ignorer l'Apple ID (ou vous connecter si vous souhaitez iMessage plus tard)
3. Créer un compte utilisateur (mémorisez le nom d'utilisateur et le mot de passe)
4. Ignorer toutes les fonctionnalités optionnelles

Une fois la configuration terminée, activez SSH :

1. Ouvrir Réglages Système → Général → Partage
2. Activer « Connexion à distance »

---

## 4) Obtenir l'adresse IP de la VM

```bash
lume get openclaw
```

Recherchez l'adresse IP (généralement `192.168.64.x`).

---

## 5) Se connecter en SSH dans la VM

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

Suivez les invites d'onboarding pour configurer votre fournisseur de modèle (Anthropic, OpenAI, etc.).

---

## 7) Configurer les canaux

Modifier le fichier de configuration :

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

## 8) Exécuter la VM sans interface graphique

Arrêtez la VM et redémarrez-la sans affichage :

```bash
lume stop openclaw
lume run openclaw --no-display
```

La VM s'exécute en arrière-plan. Le démon OpenClaw maintient la passerelle en fonctionnement.

Pour vérifier l'état :

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonus : Intégration iMessage

C'est la fonctionnalité majeure de l'exécution sur macOS. Utilisez [BlueBubbles](https://bluebubbles.app) pour ajouter iMessage à OpenClaw.

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

Redémarrez la passerelle. Désormais, votre agent peut envoyer et recevoir des iMessages.

Détails de la configuration complète : [Canal BlueBubbles](/fr/channels/bluebubbles)

---

## Enregistrer une image dorée

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

## Fonctionnement en continu 24/7

Gardez la VM en fonctionnement en :

- Gardant votre Mac branché
- Désactivant la mise en veille dans Réglages Système → Économie d'énergie
- Utilisant `caffeinate` si nécessaire

Pour une véritable disponibilité permanente, envisagez un Mac mini dédié ou un petit VPS. Voir [Hébergement VPS](/fr/vps).

---

## Dépannage

| Problème                                  | Solution                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Impossible de se connecter en SSH à la VM | Vérifiez que « Connexion à distance » est activé dans les Réglages Système de la VM                     |
| L'adresse IP de la VM ne s'affiche pas    | Attendez le démarrage complet de la VM, relancez `lume get openclaw`                                    |
| Commande Lume introuvable                 | Ajoutez `~/.local/bin` à votre PATH                                                                     |
| Le QR WhatsApp ne se scanne pas           | Assurez-vous d'être connecté à la VM (et non à l'hôte) lors de l'exécution de `openclaw channels login` |

---

## Documentation connexe

- [Hébergement VPS](/fr/vps)
- [Nœuds](/fr/nodes)
- [Gateway distant](/fr/gateway/remote)
- [BlueBubbles channel](/fr/channels/bluebubbles)
- [Démarrage rapide avec Lume](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Référence de la CLI Lume](https://cua.ai/docs/lume/reference/cli-reference)
- [Configuration de VM sans assistance](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (avancé)
- [Docker Sandboxing](/fr/install/docker) (méthode d'isolation alternative)

import fr from "/components/footer/fr.mdx";

<fr />
