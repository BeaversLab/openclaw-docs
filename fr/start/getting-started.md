---
summary: "Installez OpenClaw et lancez votre premier chat en quelques minutes."
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "Getting Started"
---

# Getting Started

Objectif : passer de zéro à un premier chat fonctionnel avec une configuration minimale.

<Info>
  Chat le plus rapide : ouvrez l'interface de contrôle (aucune configuration de canal nécessaire).
  Exécutez `openclaw dashboard` et chattez dans le navigateur, ou ouvrez `http://127.0.0.1:18789/`
  sur le
  <Tooltip headline="Gateway host" tip="The machine running the OpenClaw gateway service.">
    hôte de la passerelle
  </Tooltip>
  . Docs : [Tableau de bord](/fr/web/dashboard) et [Interface de contrôle](/fr/web/control-ui).
</Info>

## Prérequis

- Node 24 recommandé (Node 22 LTS, actuellement `22.16+`, encore pris en charge pour la compatibilité)

<Tip>Vérifiez votre version de Node avec `node --version` si vous n'êtes pas sûr.</Tip>

## Installation rapide (CLI)

<Steps>
  <Step title="Installer OpenClaw (recommandé)">
    <Tabs>
      <Tab title="macOS/Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="Processus du script d'installation"
  className="rounded-lg"
/>
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    Autres méthodes d'installation et exigences : [Install](/fr/install).
    </Note>

  </Step>
  <Step title="Exécuter l'assistant de démarrage">
    ```bash
    openclaw onboard --install-daemon
    ```

    L'assistant configure l'authentification, les paramètres de la passerelle et les canaux optionnels.
    Voir [Assistant de démarrage](/fr/start/wizard) pour plus de détails.

  </Step>
  <Step title="Vérifier la Gateway">
    Si vous avez installé le service, il devrait déjà être en cours d'exécution :

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="Ouvrir l'interface de contrôle">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>Si l'interface de contrôle se charge, votre Gateway est prêt à être utilisé.</Check>

## Vérifications et extras facultatifs

<AccordionGroup>
  <Accordion title="Exécuter la passerelle au premier plan">
    Utile pour les tests rapides ou le dépannage.

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="Envoyer un message de test">
    Nécessite une chaîne configurée.

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## Variables d'environnement utiles

Si vous exécutez OpenClaw en tant que compte de service ou si vous souhaitez des emplacements de configuration/état personnalisés :

- `OPENCLAW_HOME` définit le répertoire personnel utilisé pour la résolution des chemins internes.
- `OPENCLAW_STATE_DIR` remplace le répertoire d'état.
- `OPENCLAW_CONFIG_PATH` remplace le chemin du fichier de configuration.

Référence complète des variables d'environnement : [Environment vars](/fr/help/environment).

## Pour aller plus loin

<Columns>
  <Card title="Assistant d'intégration (détails)" href="/fr/start/wizard">
    Référence complète de l'assistant CLI et options avancées.
  </Card>
  <Card title="Intégration de l'application macOS" href="/fr/start/onboarding">
    Flux de première exécution pour l'application macOS.
  </Card>
</Columns>

## Ce que vous aurez

- Une Gateway en cours d'exécution
- Auth configurée
- Accès à l'interface de contrôle ou une chaîne connectée

## Étapes suivantes

- Sécurité et approbations des messages privés : [Pairing](/fr/channels/pairing)
- Connecter plus de chaînes : [Channels](/fr/channels)
- Workflows avancés et à partir de la source : [Setup](/fr/start/setup)

import fr from '/components/footer/fr.mdx';

<fr />
