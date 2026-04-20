---
summary: "Héberger OpenClaw sur Hostinger"
read_when:
  - Setting up OpenClaw on Hostinger
  - Looking for a managed VPS for OpenClaw
  - Using Hostinger 1-Click OpenClaw
title: "Hostinger"
---

# Hostinger

Exécutez une passerelle OpenClaw persistante sur [Hostinger](https://www.hostinger.com/openclaw) via un déploiement géré en **un clic** ou une installation sur **VPS**.

## Prérequis

- Compte Hostinger ([inscription](https://www.hostinger.com/openclaw))
- Environ 5 à 10 minutes

## Option A : OpenClaw en un clic

Le moyen le plus rapide de démarrer. Hostinger gère l'infrastructure, Docker et les mises à jour automatiques.

<Steps>
  <Step title="Acheter et lancer">
    1. Depuis la [page OpenClaw de Hostinger](https://www.hostinger.com/openclaw), choisissez un plan OpenClaw géré et finalisez le paiement.

    <Note>
    Lors du paiement, vous pouvez sélectionner des crédits **IA prête à l'emploi** qui sont préachetés et intégrés instantanément dans OpenClaw -- aucun compte externe ni clé API d'autres fournisseurs n'est nécessaire. Vous pouvez commencer à discuter immédiatement. Alternativement, fournissez votre propre clé depuis Anthropic, OpenAI, Google Gemini ou xAI lors de la configuration.
    </Note>

  </Step>

  <Step title="Sélectionner un canal de messagerie">
    Choisissez un ou plusieurs canaux à connecter :

    - **WhatsApp** -- scannez le code QR affiché dans l'assistant de configuration.
    - **Telegram** -- collez le jeton du bot obtenu auprès de [BotFather](https://t.me/BotFather).

  </Step>

<Step title="Terminer l'installation">Cliquez sur **Terminer** pour déployer l'instance. Une fois prêt, accédez au tableau de bord OpenClaw depuis la section **Vue d'ensemble d'OpenClaw** dans hPanel.</Step>

</Steps>

## Option B : OpenClaw sur VPS

Plus de contrôle sur votre serveur. Hostinger déploie OpenClaw via Docker sur votre VPS et vous le gérez via le **Gestionnaire Docker** dans hPanel.

<Steps>
  <Step title="Acheter un VPS">
    1. Depuis la [page OpenClaw de Hostinger](https://www.hostinger.com/openclaw), choisissez un plan OpenClaw sur VPS et finalisez le paiement.

    <Note>
    Vous pouvez sélectionner des crédits **IA prête à l'emploi** lors du paiement -- ceux-ci sont préachetés et intégrés instantanément dans OpenClaw, vous permettant ainsi de commencer à discuter sans aucun compte externe ni clé API d'autres fournisseurs.
    </Note>

  </Step>

  <Step title="Configurer OpenClaw">
    Une fois le VPS provisionné, remplissez les champs de configuration :

    - **Jeton Gateway** -- généré automatiquement ; sauvegardez-le pour une utilisation ultérieure.
    - **Numéro WhatsApp** -- votre numéro avec l'indicatif du pays (facultatif).
    - **Jeton bot Telegram** -- depuis [BotFather](https://t.me/BotFather) (facultatif).
    - **Clés API** -- nécessaires uniquement si vous n'avez pas sélectionné de crédits IA prêts à l'emploi lors du paiement.

  </Step>

<Step title="Démarrer OpenClaw">Cliquez sur **Deploy** (Déployer). Une fois en cours d'exécution, ouvrez le tableau de bord OpenClaw depuis le hPanel en cliquant sur **Open** (Ouvrir).</Step>

</Steps>

Les journaux, les redémarrages et les mises à jour sont gérés directement depuis l'interface du gestionnaire Docker dans le hPanel. Pour mettre à jour, appuyez sur **Update** (Mettre à jour) dans le gestionnaire Docker et cela tirera la dernière image.

## Vérifier votre configuration

Envoyez "Bonjour" à votre assistant sur le canal que vous avez connecté. OpenClaw répondra et vous guidera à travers les préférences initiales.

## Dépannage

**Le tableau de bord ne se charge pas** -- Attendez quelques minutes que le conteneur finisse son provisionnement. Vérifiez les journaux du gestionnaire Docker dans le hPanel.

**Le conteneur Docker redémarre continuellement** -- Ouvrez les journaux du gestionnaire Docker et recherchez des erreurs de configuration (jetons manquants, clés API invalides).

**Le bot Telegram ne répond pas** -- Envoyez votre message de code d'appariement depuis Telegram directement en tant que message dans votre chat OpenClaw pour compléter la connexion.

## Étapes suivantes

- [Canaux](/en/channels) -- connectez Telegram, WhatsApp, Discord, et plus encore
- [Configuration de la Gateway](/en/gateway/configuration) -- toutes les options de configuration
