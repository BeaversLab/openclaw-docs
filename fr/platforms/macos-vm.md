---
summary: "Exécutez OpenClaw dans une VM macOS sandboxée (locale ou hébergée) lorsque vous avez besoin d'isolement ou de iMessage"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "VMs macOS"
---

# OpenClaw sur les VMs macOS (Sandboxing)

## Par défaut recommandé (la plupart des utilisateurs)

- **Petit VPS Linux** pour une Gateway toujours active et à faible coût. Voir [Hébergement VPS](/fr/vps).
- **Matériel dédié** (Mac mini ou boîtier Linux) si vous souhaitez un contrôle total et une **IP résidentielle** pour l'automatisation du navigateur. De nombreux sites bloquent les IP des centres de données, la navigation locale fonctionne donc souvent mieux.
- **Hybride :** gardez la Gateway sur un VPS bon marché, et connectez votre Mac en tant que **nœud** lorsque vous avez besoin d'une automatisation du navigateur/interface. Voir [Nœuds](/fr/nodes) et [Gateway à distance](/fr/gateway/remote).

Utilisez une VM macOS lorsque vous avez spécifiquement besoin de capacités exclusives à macOS (iMessage/BlueBubbles) ou si vous souhaitez un isolement strict de votre Mac quotidien.

## Options de VM macOS

### VM locale sur votre Mac Apple Silicon (Lume)

Exécutez OpenClaw dans une VM macOS sandboxée sur votre Mac Apple Silicon existant en utilisant [Lume](https://cua.ai/docs/lume).

Cela vous offre :

- Environnement complet macOS en isolement (votre hôte reste propre)
- Prise en charge de iMessage via BlueBubbles (impossible sur Linux/Windows)
- Réinitialisation instantanée en clonant les VMs
- Aucun matériel supplémentaire ni frais de cloud

### Fournisseurs de Mac hébergés (cloud)

Si vous souhaitez macOS dans le cloud, les fournisseurs de Mac hébergés fonctionnent également :

- [MacStadium](https://www.macstadium.com/) (Macs hébergés)
- D'autres fournisseurs de Mac hébergés fonctionnent aussi ; suivez leur documentation VM + SSH

Une fois que vous avez un accès SSH à une VM macOS, passez à l'étape 6 ci-dessous.

---

## Accès rapide (Lume, utilisateurs expérimentés)

1. Installer Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Complétez l'Assistant de configuration, activez la connexion à distance (SSH)
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

Docs : [Installation de Lume](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) Créer la machine virtuelle macOS

```bash
lume create openclaw --os macos --ipsw latest
```

Cela télécharge macOS et crée la machine virtuelle. Une fenêtre VNC s'ouvre automatiquement.

Remarque : Le téléchargement peut prendre un certain temps selon votre connexion.

---

## 3) Terminer l'assistant de configuration

Dans la fenêtre VNC :

1. Sélectionnez la langue et la région
2. Ignorez l'identifiant Apple (ou connectez-vous si vous souhaitez utiliser iMessage plus tard)
3. Créez un compte utilisateur (souvenez-vous du nom d'utilisateur et du mot de passe)
4. Ignorez toutes les fonctionnalités facultatives

Une fois la configuration terminée, activez le SSH :

1. Ouvrez Réglages Système → Général → Partage
2. Activez « Connexion à distance »

---

## 4) Obtenir l'adresse IP de la machine virtuelle

```bash
lume get openclaw
```

Recherchez l'adresse IP (généralement `192.168.64.x`).

---

## 5) Se connecter en SSH à la machine virtuelle

```bash
ssh youruser@192.168.64.X
```

Remplacez `youruser` par le compte que vous avez créé, et l'IP par l'IP de votre machine virtuelle.

---

## 6) Installer OpenClaw

À l'intérieur de la machine virtuelle :

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Suivez les invites d'onboarding pour configurer votre fournisseur de modèle (Anthropic, OpenAI, etc.).

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

Connectez-vous ensuite à WhatsApp (scannez le code QR) :

```bash
openclaw channels login
```

---

## 8) Exécuter la machine virtuelle en mode sans affichage

Arrêtez la machine virtuelle et redémarrez-la sans affichage :

```bash
lume stop openclaw
lume run openclaw --no-display
```

La machine virtuelle s'exécute en arrière-plan. Le daemon de OpenClaw maintient la passerelle en fonctionnement.

Pour vérifier l'état :

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonus : Intégration iMessage

C'est la fonctionnalité phare de l'exécution sur macOS. Utilisez [BlueBubbles](https://bluebubbles.app) pour ajouter iMessage à OpenClaw.

À l'intérieur de la machine virtuelle :

1. Téléchargez BlueBubbles depuis bluebubbles.app
2. Connectez-vous avec votre identifiant Apple
3. Activez l'API Web et définissez un mot de passe
4. Pointez les webhooks BlueBubbles vers votre passerelle (exemple : `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`)

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

Détails complets de la configuration : [Canal BlueBubbles](/fr/channels/bluebubbles)

---

## Sauvegarder une image dorée

Avant d'effectuer d'autres personnalisations, créez une capture instantanée de votre état propre :

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

Gardez la machine virtuelle en marche en :

- Gardant votre Mac branché
- Désactivant la mise en veille dans Réglages Système → Économie d'énergie
- Utilisant `caffeinate` si nécessaire

Pour une disponibilité 24h/24, envisagez un Mac mini dédié ou un petit VPS. Voir [Hébergement VPS](/fr/vps).

---

## Dépannage

| Problème                                  | Solution                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Impossible de se connecter en SSH à la VM | Vérifiez que la « Connexion à distance » est activée dans les réglages système de la VM                 |
| L'IP de la VM ne s'affiche pas            | Attendez le démarrage complet de la VM, réexécutez `lume get openclaw`                                  |
| Commande Lume introuvable                 | Ajoutez `~/.local/bin` à votre PATH                                                                     |
| Le code QR WhatsApp ne se scanne pas      | Assurez-vous d'être connecté à la VM (et non à l'hôte) lors de l'exécution de `openclaw channels login` |

---

## Documentation connexe

- [Hébergement VPS](/fr/vps)
- [Nœuds](/fr/nodes)
- [Gateway distant](/fr/gateway/remote)
- [Channel BlueBubbles](/fr/channels/bluebubbles)
- [Démarrage rapide Lume](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Référence de la CLI Lume](https://cua.ai/docs/lume/reference/cli-reference)
- [Configuration de VM sans assistance](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (avancé)
- [Sandboxing Docker](/fr/install/docker) (méthode d'isolation alternative)

import fr from '/components/footer/fr.mdx';

<fr />
