---
summary: "Héberger OpenClaw sur Hostinger"
read_when:
  - Setting up OpenClaw on Hostinger
  - Looking for a managed VPS for OpenClaw
  - Using Hostinger 1-Click OpenClaw
title: "Hostinger"
---

# Hostinger

Exécutez une passerelle OpenClaw persistante sur [Hostinger](https://www.hostinger.com/openclaw) via un déploiement géré en **1 clic** ou une installation sur **VPS**.

## Prérequis

- Un compte Hostinger ([inscription](https://www.hostinger.com/openclaw))
- Environ 5 à 10 minutes

## Option A : OpenClaw en 1 clic

La méthode la plus rapide pour commencer. Hostinger gère l'infrastructure, Docker et les mises à jour automatiques.

<Steps>
  <Step title="Acheter et lancer">
    1. Depuis la [page OpenClaw de Hostinger](https://www.hostinger.com/openclaw), choisissez un plan OpenClaw géré et finalisez le paiement.

    <Note>
    Lors du paiement, vous pouvez sélectionner des crédits **Ready-to-Use AI** qui sont pré-achetés et intégrés instantanément dans OpenClaw — aucun compte externe ni clé API d'autres fournisseurs n'est nécessaire. Vous pouvez commencer à discuter immédiatement. Alternativement, fournissez votre propre clé depuis Anthropic, OpenAI, Google Gemini ou xAI lors de la configuration.
    </Note>

  </Step>

  <Step title="Sélectionner un canal de messagerie">
    Choisissez un ou plusieurs canaux à connecter :

    - **WhatsApp** —— scannez le code QR affiché dans l'assistant de configuration.
    - **Telegram** —— collez le jeton du bot provenant de [BotFather](https://t.me/BotFather).

  </Step>

<Step title="Terminer l'installation">Cliquez sur **Finish** pour déployer l'instance. Une fois prêt, accédez au tableau de bord OpenClaw depuis **OpenClaw Overview** dans hPanel.</Step>

</Steps>

## Option B : OpenClaw sur VPS

Plus de contrôle sur votre serveur. Hostinger déploie OpenClaw via Docker sur votre VPS et vous le gérez via le **Docker Manager** dans hPanel.

<Steps>
  <Step title="Acheter un VPS">
    1. Depuis la [page OpenClaw de Hostinger](https://www.hostinger.com/openclaw), choisissez un plan OpenClaw sur VPS et finalisez le paiement.

    <Note>
    Vous pouvez sélectionner des crédits **Ready-to-Use AI** lors du paiement — ceux-ci sont pré-achetés et intégrés instantanément dans OpenClaw, vous permettant de commencer à discuter sans compte externe ni clé API d'autres fournisseurs.
    </Note>

  </Step>

  <Step title="Configurer OpenClaw">
    Une fois le VPS provisionné, remplissez les champs de configuration :

    - **Gateway token** —— généré automatiquement ; sauvegardez-le pour une utilisation ultérieure.
    - **Numéro WhatsApp** —— votre numéro avec l'indicatif pays (facultatif).
    - **Jeton du bot Telegram** —— depuis [BotFather](https://t.me/BotFather) (facultatif).
    - **Clés API** —— uniquement nécessaires si vous n'avez pas sélectionné de crédits Ready-to-Use AI lors du paiement.

  </Step>

<Step title="Démarrer OpenClaw">Cliquez sur **Deploy**. Une fois en cours d'exécution, ouvrez le tableau de bord OpenClaw depuis hPanel en cliquant sur **Open**.</Step>

</Steps>

Les journaux, redémarrages et mises à jour sont gérés directement depuis l'interface Docker Manager dans hPanel. Pour mettre à jour, appuyez sur **Update** dans Docker Manager pour récupérer la dernière image.

## Vérifier votre installation

Envoyez « Bonjour » à votre assistant sur le canal que vous avez connecté. OpenClaw répondra et vous guidera dans les préférences initiales.

## Dépannage

**Le tableau de bord ne se charge pas** —— Attendez quelques minutes que le conteneur termine son provisionnement. Consultez les journaux Docker Manager dans hPanel.

**Le conteneur Docker redémarre en boucle** —— Ouvrez les journaux Docker Manager et recherchez les erreurs de configuration (jetons manquants, clés API invalides).

**Le bot Telegram ne répond pas** —— Envoyez votre message de code d'appairage depuis Telegram directement dans votre chat OpenClaw pour compléter la connexion.

## Prochaines étapes

- [Canaux](/en/channels) —— connecter Telegram, WhatsApp, Discord et plus
- [Configuration de la passerelle](/en/gateway/configuration) —— toutes les options de configuration
