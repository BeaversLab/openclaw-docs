---
summary: "Guide de configuration pour les développeurs travaillant sur l'application OpenClaw macOS"
read_when:
  - Setting up the macOS development environment
title: "macOS Dev Setup"
---

# Configuration du développeur macOS

Ce guide couvre les étapes nécessaires pour compiler et exécuter l'application OpenClaw macOS à partir des sources.

## Prérequis

Avant de compiler l'application, assurez-vous d'avoir installé les éléments suivants :

1. **Xcode 26.2+** : Requis pour le développement Swift.
2. **Node.js 24 & pnpm** : Recommandé pour la passerelle, la CLI et les scripts de packaging. Node 22 LTS, actuellement `22.14+`, reste pris en charge pour la compatibilité.

## 1. Installer les dépendances

Installez les dépendances à l'échelle du projet :

```bash
pnpm install
```

## 2. Compiler et empaqueter l'application

Pour compiler l'application macOS et l'empaqueter dans `dist/OpenClaw.app`, exécutez :

```bash
./scripts/package-mac-app.sh
```

Si vous ne disposez pas d'un certificat de développeur Apple, le script utilisera automatiquement la **signature ad-hoc** (`-`).

Pour les modes d'exécution de développement, les indicateurs de signature et le troubleshooting de l'ID d'équipe, consultez le README de l'application macOS :
[https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)

> **Remarque** : Les applications signées ad-hoc peuvent déclencher des invites de sécurité. Si l'application plante immédiatement avec "Abort trap 6", consultez la section [Dépannage](#troubleshooting).

## 3. Installer la CLI

L'application macOS s'attend à une installation globale de la CLI `openclaw` pour gérer les tâches en arrière-plan.

**Pour l'installer (recommandé) :**

1. Ouvrez l'application OpenClaw.
2. Allez dans l'onglet des paramètres **Général**.
3. Cliquez sur **"Installer CLI"**.

Alternativement, installez-la manuellement :

```bash
npm install -g openclaw@<version>
```

`pnpm add -g openclaw@<version>` et `bun add -g openclaw@<version>` fonctionnent également.
Pour le runtime Gateway, Node reste la méthode recommandée.

## Dépannage

### Échec de la build : Inadéquation de la chaîne d'outils ou du SDK

La build de l'application macOS s'attend au dernier SDK macOS et à la chaîne d'outils Swift 6.2.

**Dépendances système (requises) :**

- **Dernière version macOS disponible dans Mise à jour de logiciels** (requis par les SDK Xcode 26.2)
- **Xcode 26.2** (chaîne d'outils Swift 6.2)

**Vérifications :**

```bash
xcodebuild -version
xcrun swift --version
```

Si les versions ne correspondent pas, mettez à jour macOS/Xcode et relancez la build.

### L'application plante lors de l'octroi d'autorisations

Si l'application plante lorsque vous essayez d'autoriser l'accès à la **Reconnaissance vocale** ou au **Microphone**, cela peut être dû à un cache TCC corrompu ou à une inadéquation de signature.

**Correction :**

1. Réinitialisez les autorisations TCC :

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. Si cela échoue, modifiez temporairement le `BUNDLE_ID` dans [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) pour forcer un "propre départ" de la part de macOS.

### Gateway "Démarrage..." indéfiniment

Si le statut de la passerelle reste sur "Démarrage...", vérifiez si un processus zombie occupe le port :

```bash
openclaw gateway status
openclaw gateway stop

# If you're not using a LaunchAgent (dev mode / manual runs), find the listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

Si une exécution manuelle occupe le port, arrêtez ce processus (Ctrl+C). En dernier recours, tuez le PID que vous avez trouvé ci-dessus.
