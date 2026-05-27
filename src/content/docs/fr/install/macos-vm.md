---
summary: "Exécutez OpenClaw dans une VM macOS sandboxée (locale ou hébergée) lorsque vous avez besoin d'isolement ou d'iMessage"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "VMs macOS"
---

## Recommandé par défaut (la plupart des utilisateurs)

- **Petit VPS Linux** pour une passerelle (Gateway) toujours active et à faible coût. Voir [Hébergement VPS](/fr/vps).
- **Matériel dédié** (Mac mini ou boîtier Linux) si vous souhaitez un contrôle total et une **IP résidentielle** pour l'automatisation du navigateur. De nombreux sites bloquent les IP des centres de données, la navigation locale fonctionne donc souvent mieux.
- **Hybride :** gardez le Gateway sur un VPS peu coûteux, et connectez votre Mac en tant que **nœud** lorsque vous avez besoin d'automatisation du navigateur/interface. Voir [Nœuds](/fr/nodes) et [Gateway distant](/fr/gateway/remote).

Utilisez une VM macOS lorsque vous avez spécifiquement besoin de capacités exclusives à macOS telles que iMessage ou si vous souhaitez une isolation stricte de votre Mac quotidien.

## Options de VM macOS

### VM locale sur votre Mac Apple Silicon (Lume)

Exécutez OpenClaw dans une VM macOS sandboxée sur votre Mac Apple Silicon existant en utilisant [Lume](https://cua.ai/docs/lume).

Cela vous offre :

- Environnement macOS complet en isolation (votre hôte reste propre)
- Prise en charge de iMessage via `imsg` (le chemin local par défaut est impossible sous Linux/Windows)
- Réinitialisation instantanée en clonant les VM
- Aucun matériel supplémentaire ni coûts cloud

### Fournisseurs de Mac hébergés (cloud)

Si vous souhaitez macOS dans le cloud, les fournisseurs de Mac hébergés fonctionnent également :

- [MacStadium](https://www.macstadium.com/) (Macs hébergés)
- D'autres fournisseurs de Mac hébergés fonctionnent aussi ; suivez leur documentation VM + SSH

Une fois que vous avez un accès SSH à une VM macOS, passez à l'étape 6 ci-dessous.

---

## Accès rapide (Lume, utilisateurs expérimentés)

1. Installer Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Complétez l'Assistant de configuration, activez la Connexion à distance (SSH)
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

Docs : [Installation de Lume](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) Créer la VM macOS

```bash
lume create openclaw --os macos --ipsw latest
```

Cela télécharge macOS et crée la VM. Une fenêtre VNC s'ouvre automatiquement.

<Note>Le téléchargement peut prendre un certain temps selon votre connexion.</Note>

---

## 3) Terminer l'assistant de configuration

Dans la fenêtre VNC :

1. Sélectionnez la langue et la région
2. Ignorez l'Apple ID (ou connectez-vous si vous souhaitez utiliser iMessage plus tard)
3. Créez un compte utilisateur (mémorisez le nom d'utilisateur et le mot de passe)
4. Ignorez toutes les fonctionnalités facultatives

Une fois la configuration terminée :

1. Activer SSH : Ouvrez Réglages Système -> Général -> Partage et activez « Connexion à distance ».
2. Pour une utilisation sans écran, activez la connexion automatique : Ouvrez Réglages Système -> Utilisateurs et groupes, sélectionnez « Ouvrir la session automatiquement en tant que : » et choisissez l'utilisateur de la VM.

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

Suivez les invites de l'intégration (onboarding) pour configurer votre fournisseur de modèles (Anthropic, OpenAI, etc.).

---

## 7) Configurer les canaux

Modifiez le fichier de configuration :

```bash
nano ~/.openclaw/openclaw.json
```

Ajoutez vos canaux :

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
    telegram: {
      botToken: "YOUR_BOT_TOKEN",
    },
  },
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

La VM s'exécute en arrière-plan. Le démon de OpenClaw maintient la passerelle en fonctionnement.

Pour vérifier l'état :

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonus : Intégration iMessage

C'est la fonctionnalité phare de l'exécution sur macOS. Utilisez [iMessage](/fr/channels/imessage) avec `imsg` pour ajouter Messages à OpenClaw.

Dans la VM :

1. Connectez-vous à Messages.
2. Installez `imsg`.
3. Accordez les autorisations d'accès complet au disque et d'automatisation au processus exécutant OpenClaw/`imsg`.
4. Vérifiez la prise en charge RPC avec `imsg rpc --help`.

Ajoutez à votre configuration OpenClaw :

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
    },
  },
}
```

Redémarrez la passerelle. Votre agent peut désormais envoyer et recevoir des iMessages.

Détails complets de la configuration : [Canal iMessage](/fr/channels/imessage)

---

## Sauvegarder une image dorée

Avant de personnaliser davantage, créez une capture de votre état propre :

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
- Désactivation de la mise en veille dans Réglages Système → Économiseur d'énergie
- Utilisation de `caffeinate` si nécessaire

Pour une disponibilité permanente, envisagez un Mac mini dédié ou un petit VPS. Voir [Hébergement VPS](/fr/vps).

---

## Dépannage

| Problème                                  | Solution                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Impossible de se connecter en SSH à la VM | Vérifiez que « Connexion à distance » est activée dans les Réglages Système de la VM                        |
| IP de la VM non affichée                  | Attendez le démarrage complet de la VM, exécutez `lume get openclaw` à nouveau                              |
| Commande Lume introuvable                 | Ajoutez `~/.local/bin` à votre PATH                                                                         |
| WhatsApp QR ne se scanne pas              | Assurez-vous que vous êtes connecté à la VM (pas à l'hôte) lors de l'exécution de `openclaw channels login` |

---

## Documentation connexe

- [Hébergement VPS](/fr/vps)
- [Nœuds](/fr/nodes)
- [Gateway distant](/fr/gateway/remote)
- [Channel iMessage](/fr/channels/imessage)
- [Démarrage rapide Lume](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Référence de la CLI Lume](https://cua.ai/docs/lume/reference/cli-reference)
- [Configuration de VM sans surveillance](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (avancé)
- [Bac à sable Docker](/fr/install/docker) (approche d'isolement alternative)
