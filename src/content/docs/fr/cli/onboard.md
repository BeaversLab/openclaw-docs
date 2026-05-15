---
summary: "Référence CLI pour `openclaw onboard` (onboarding interactif)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "Onboard"
---

# `openclaw onboard`

Onboarding guidé complet pour la configuration locale ou distante du Gateway. Utilisez ceci lorsque vous voulez qu'OpenClaw parcourt l'authentification du modèle, l'espace de travail, la passerelle, les canaux, les compétences et l'état de santé en un seul flux.

## Guides associés

<CardGroup cols={2}>
  <Card title="Centre d'onboarding CLI" href="/fr/start/wizard" icon="rocket">
    Procédure pas à pas du flux interactif de la CLI.
  </Card>
  <Card title="Aperçu de l'onboarding" href="/fr/start/onboarding-overview" icon="map">
    Fonctionnement de l'onboarding OpenClaw.
  </Card>
  <Card title="Référence de la configuration CLI" href="/fr/start/wizard-cli-reference" icon="book">
    Sorties, fonctionnement interne et comportement par étape.
  </Card>
  <Card title="Automatisation CLI" href="/fr/start/wizard-cli-automation" icon="terminal">
    Options non interactives et configurations scriptées.
  </Card>
  <Card title="Onboarding de l'application macOS" href="/fr/start/onboarding" icon="apple">
    Flux d'onboarding pour l'application de la barre de menus macOS.
  </Card>
</CardGroup>

## Exemples

```bash
openclaw onboard
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`--flow import` utilise des providers de migration détenus par des plugins tels que Hermes. Il ne s'exécute que sur une installation OpenClaw fraîche ; si une configuration, des identifiants, des sessions ou des fichiers de mémoire/identité d'espace de travail existent, réinitialisez ou choisissez une installation fraîche avant d'importer.

`--modern` lance la prévisualisation de l'onboarding conversationnel de Crestodian. Sans
`--modern`, `openclaw onboard` conserve le flux d'onboarding classique.

Pour les cibles `ws://` de réseau privé en texte brut (réseaux de confiance uniquement), définissez
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` dans l'environnement du processus d'onboarding.
Il n'y a pas d'équivalent `openclaw.json` pour cette solution de secours de transport côté client.

Provider personnalisé non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

`--custom-api-key` est facultatif en mode non interactif. S'il est omis, l'onboarding vérifie `CUSTOM_API_KEY`.
OpenClaw marque automatiquement les ID de modèles de vision courants comme capables d'images. Passez `--custom-image-input` pour les ID de vision personnalisés inconnus, ou `--custom-text-input` pour forcer les métadonnées texte uniquement.

LM Studio prend également en charge un indicateur de clé spécifique au fournisseur en mode non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice lmstudio \
  --custom-base-url "http://localhost:1234/v1" \
  --custom-model-id "qwen/qwen3.5-9b" \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --accept-risk
```

Ollama non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` correspond par défaut à `http://127.0.0.1:11434`. `--custom-model-id` est facultatif ; s'il est omis, l'onboarding utilise les valeurs par défaut suggérées par Ollama. Les ID de modèles cloud tels que `kimi-k2.5:cloud` fonctionnent également ici.

Stocker les clés de fournisseur sous forme de références au lieu de texte en clair :

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Avec `--secret-input-mode ref`, l'onboarding écrit des références sauvegardées par des variables d'environnement (env-backed) au lieu de valeurs de clé en texte clair.
Pour les fournisseurs basés sur un profil d'authentification, cela écrit des entrées `keyRef` ; pour les fournisseurs personnalisés, cela écrit `models.providers.<id>.apiKey` en tant que référence d'environnement (par exemple `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrat du mode non interactif `ref` :

- Définissez la variable d'environnement du fournisseur (provider env var) dans l'environnement du processus d'onboarding (par exemple `OPENAI_API_KEY`).
- Ne passez pas de drapeaux de clé en ligne (par exemple `--openai-api-key`) à moins que cette variable d'environnement ne soit également définie.
- Si un indicateur de clé en ligne est transmis sans la variable d'environnement requise, l'intégration échoue rapidement avec des instructions.

Options de jeton Gateway en mode non interactif :

- `--gateway-auth token --gateway-token <token>` stocke un jeton en texte clair.
- `--gateway-auth token --gateway-token-ref-env <name>` stocke `gateway.auth.token` en tant que SecretRef d'environnement.
- `--gateway-token` et `--gateway-token-ref-env` sont mutuellement exclusifs.
- `--gateway-token-ref-env` nécessite une variable d'environnement non vide dans l'environnement du processus d'onboarding.
- Avec `--install-daemon`, lorsque l'authentification par jeton nécessite un jeton, les jetons de passerelle gérés par SecretRef sont validés mais ne sont pas persistés en tant que texte clair résolu dans les métadonnées de l'environnement du service de supervision.
- Avec `--install-daemon`, si le mode jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, l'onboarding échoue de manière sécurisée avec des directives de correction.
- Avec `--install-daemon`, si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'onboarding bloque l'installation jusqu'à ce que le mode soit défini explicitement.
- L'onboarding local écrit `gateway.mode="local"` dans la configuration. Si un fichier de configuration ultérieur ne contient pas `gateway.mode`, considérez cela comme une altération de la configuration ou une modification manuelle incomplète, et non comme un raccourci de mode local valide.
- L'onboarding local installe les plugins téléchargeables sélectionnés lorsque le chemin d'installation choisi les nécessite.
- L'onboarding distant n'écrit que les informations de connexion pour le Gateway distant et n'installe pas les packages de plugins locaux.
- `--allow-unconfigured` est une porte de dérogation (escape hatch) distincte pour l'exécution du gateway. Cela ne signifie pas que l'onboarding peut omettre `gateway.mode`.

Exemple :

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

Santé du gateway local non interactif :

- Sauf si vous passez `--skip-health`, l'onboarding attend un gateway local accessible avant de se terminer avec succès.
- `--install-daemon` lance d'abord le chemin d'installation du gateway géré. Sans cela, vous devez déjà avoir un gateway local en cours d'exécution, par exemple `openclaw gateway run`.
- Si vous ne souhaitez que des écritures de configuration/workspace/d'amorçage (bootstrap) en automatisation, utilisez `--skip-health`.
- Si vous gérez vous-même les fichiers de l'espace de travail, passez `--skip-bootstrap` pour définir `agents.defaults.skipBootstrap: true` et sauter la création de `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` et `BOOTSTRAP.md`.
- Sur Windows natif, Windows`--install-daemon` essaie d'abord les tâches planifiées (Scheduled Tasks) et revient à un élément de connexion de dossier Démarrage par utilisateur si la création de tâche est refusée.

Comportement de l'onboarding interactif avec le mode de référence :

- Choisissez **Utiliser une référence secrète** (Use secret reference) lorsqu'on vous le demande.
- Ensuite, choisissez soit :
  - Variable d'environnement
  - Provider de secrets configuré (`file` ou `exec`)
- L'onboarding effectue une validation préliminaire rapide avant d'enregistrer la référence.
  - Si la validation échoue, l'intégration affiche l'erreur et vous permet de réessayer.

### Choix de point de terminaison Z.AI non interactif

<Note>`--auth-choice zai-api-key`API détecte automatiquement le meilleur point de terminaison Z.AI pour votre clé (préfère l'API générale avec `zai/glm-5.1`). Si vous souhaitez spécifiquement les points de terminaison du Plan de Codage GLM, choisissez `zai-coding-global` ou `zai-coding-cn`.</Note>

```bash
# Promptless endpoint selection
openclaw onboard --non-interactive \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# Other Z.AI endpoint choices:
# --auth-choice zai-coding-cn
# --auth-choice zai-global
# --auth-choice zai-cn
```

Exemple non interactif Mistral :

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

## Notes de flux

<AccordionGroup>
  <Accordion title="Types de flux">
    - `quickstart` : invites minimales, génère automatiquement un jeton de passerelle.
    - `manual` : invites complètes pour le port, la liaison et l'authentification (alias de `advanced`).
    - `import` : exécute un fournisseur de migration détecté, prévisualise le plan, puis l'applique après confirmation.

  </Accordion>
  <Accordion title="Préfiltrage du fournisseur">
    Lorsqu'un choix d'authentification implique un fournisseur préféré, l'intégration préfiltre les sélecteurs de modèle par défaut et de liste d'autorisation vers ce fournisseur. Pour Volcengine et BytePlus, cela correspond également aux variantes du plan de codage (`volcengine-plan/*`, `byteplus-plan/*`).

    Si le filtre de fournisseur préféré ne donne encore aucun modèle chargé, l'intégration revient au catalogue non filtré au lieu de laisser le sélecteur vide.

  </Accordion>
  <Accordion title="Suivis de recherche Web">
    Certains fournisseurs de recherche Web déclenchent des invites de suivi spécifiques au fournisseur :

    - **Grok** peut proposer une configuration `x_search` facultative avec le même `XAI_API_KEY` et un choix de modèle `x_search`.
    - **Kimi** peut demander la région de l'API MoonshotAPI (`api.moonshot.ai` contre `api.moonshot.cn`) et le modèle de recherche Web Kimi par défaut.

  </Accordion>
  <Accordion title="Autres comportements"CLI>
    - Comportement de la portée du DM de onboarding local : [référence de configuration CLI](/fr/start/wizard-cli-reference#outputs-and-internals).
    - Premier chat le plus rapide : `openclaw dashboard`OpenAIAnthropic (Interface de contrôle, aucune configuration de channel).
    - Provider personnalisé : connectez n'importe quel point de terminaison compatible OpenAI ou Anthropic, y compris les providers hébergés non répertoriés. Utilisez Unknown pour détecter automatiquement.
    - Si un état Hermes est détecté, le onboarding propose un flux de migration. Utilisez [Migrate](/fr/cli/migrate) pour les plans de simulation, le mode de écrasement, les rapports et les mappages exacts.

  </Accordion>
</AccordionGroup>

## Commandes de suivi courantes

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```

Utilisez `openclaw setup` à la place lorsque vous avez uniquement besoin de la configuration de base/de l'espace de travail. Utilisez `openclaw configure` plus tard pour des modifications ciblées et `openclaw channels add` pour une configuration uniquement de channel.

<Note>`--json` n'implique pas le mode non interactif. Utilisez `--non-interactive` pour les scripts.</Note>
