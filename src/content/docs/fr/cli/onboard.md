---
summary: "Référence CLI pour `openclaw onboard` (onboarding interactif)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "Onboard"
---

# `openclaw onboard`

Onboarding interactif pour la configuration locale ou distante du Gateway.

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
  --custom-compatibility openai
```

`--custom-api-key` est facultatif en mode non interactif. S'il est omis, l'intégration vérifie `CUSTOM_API_KEY`.

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

`--custom-base-url` est par défaut `http://127.0.0.1:11434`. `--custom-model-id` est facultatif ; s'il est omis, l'intégration utilise les valeurs par défaut suggérées par Ollama. Les ID de modèle cloud tels que `kimi-k2.5:cloud` fonctionnent également ici.

Stocker les clés de fournisseur sous forme de références au lieu de texte en clair :

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Avec `--secret-input-mode ref`, l'intégration écrit des références soutenues par env au lieu des valeurs de clé en texte en clair.
Pour les fournisseurs soutenus par auth-profile, cela écrit des entrées `keyRef` ; pour les fournisseurs personnalisés, cela écrit `models.providers.<id>.apiKey` sous forme de référence env (par exemple `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrat de mode non interactif `ref` :

- Définissez la variable d'environnement du fournisseur dans l'environnement de processus d'intégration (par exemple `OPENAI_API_KEY`).
- Ne transmettez pas d'indicateurs de clé en ligne (par exemple `--openai-api-key`) à moins que cette variable d'environnement ne soit également définie.
- Si un indicateur de clé en ligne est transmis sans la variable d'environnement requise, l'intégration échoue rapidement avec des instructions.

Options de jeton Gateway en mode non interactif :

- `--gateway-auth token --gateway-token <token>` stocke un jeton en texte en clair.
- `--gateway-auth token --gateway-token-ref-env <name>` stocke `gateway.auth.token` en tant qu'env SecretRef.
- `--gateway-token` et `--gateway-token-ref-env` sont mutuellement exclusifs.
- `--gateway-token-ref-env` nécessite une variable d'environnement non vide dans l'environnement de processus d'intégration.
- Avec `--install-daemon`, lorsque l'authentification par jeton nécessite un jeton, les jetons de passerère gérés par SecretRef sont validés mais ne sont pas persistés en tant que texte en clair résolu dans les métadonnées d'environnement du service superviseur.
- Avec `--install-daemon`, si le mode de jeton nécessite un jeton et que le SecretRef de jeton configuré est non résolu, l'intégration échoue de manière fermée avec des instructions de correction.
- Avec `--install-daemon`, si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'intégration bloque l'installation jusqu'à ce que le mode soit défini explicitement.
- L'onboarding local écrit `gateway.mode="local"` dans la configuration. Si un fichier de configuration ultérieur manque `gateway.mode`, considérez cela comme une corruption de la configuration ou une modification manuelle incomplète, et non comme un raccourci de mode local valide.
- `--allow-unconfigured` est une porte de sortie d'exécution de passerelle distincte. Cela ne signifie pas que l'onboarding peut omettre `gateway.mode`.

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

Santé de la passerelle locale non interactive :

- Sauf si vous passez `--skip-health`, l'onboarding attend une passerelle locale accessible avant de se terminer avec succès.
- `--install-daemon` lance d'abord le chemin d'installation de la passerelle gérée. Sans cela, vous devez déjà avoir une passerelle locale en cours d'exécution, par exemple `openclaw gateway run`.
- Si vous souhaitez uniquement des écritures de configuration/workspace/bootstrap dans l'automatisation, utilisez `--skip-health`.
- Si vous gérez vous-même les fichiers de l'espace de travail, passez `--skip-bootstrap` pour définir `agents.defaults.skipBootstrap: true` et sautez la création de `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` et `BOOTSTRAP.md`.
- Sur Windows natif, `--install-daemon` essaie d'abord les tâches planifiées et revient à un élément de connexion de dossier Démarrage par utilisateur si la création de tâche est refusée.

Comportement de l'onboarding interactif avec le mode de référence :

- Choisissez **Utiliser la référence secrète** lorsqu'on vous le demande.
- Ensuite, choisissez soit :
  - Variable d'environnement
  - Fournisseur de secrets configuré (`file` ou `exec`)
- L'onboarding effectue une validation préalable rapide avant d'enregistrer la référence.
  - Si la validation échoue, l'onboarding affiche l'erreur et vous permet de réessayer.

### Choix de point de terminaison Z.AI non interactif

<Note>`--auth-choice zai-api-key` détecte automatiquement le meilleur point de terminaison Z.AI pour votre clé (préfère l'API générale avec `zai/glm-5.1`). Si vous voulez spécifiquement les points de terminaison du plan de codage GLM, choisissez `zai-coding-global` ou `zai-coding-cn`.</Note>

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

Exemple Mistral non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

## Notes de flux

<AccordionGroup>
  <Accordion title="Flow types">
    - `quickstart` : invites minimales, génère automatiquement un jeton de passerelle.
    - `manual` : invites complètes pour le port, la liaison et l'auth (alias de `advanced`).
    - `import` : exécute un fournisseur de migration détecté, prévisualise le plan, puis l'applique après confirmation.
  </Accordion>
  <Accordion title="Provider prefiltering">
    Lorsqu'un choix d'auth implique un fournisseur préféré, l'onboarding préfiltre les sélecteurs de modèle par défaut et de liste d'autorisation vers ce fournisseur. Pour Volcengine et BytePlus, cela correspond également aux variantes de plan de codage (`volcengine-plan/*`, `byteplus-plan/*`).

    Si le filtre de fournisseur préféré ne donne encore aucun modèle chargé, l'onboarding revient au catalogue non filtré au lieu de laisser le sélecteur vide.

  </Accordion>
  <Accordion title="Web-search follow-ups">
    Certains fournisseurs de recherche web déclenchent des invites de suivi spécifiques au fournisseur :

    - **Grok** peut proposer une configuration facultative de `x_search` avec le même `XAI_API_KEY` et un choix de modèle `x_search`.
    - **Kimi** peut demander la région de l'API Moonshot (`api.moonshot.ai` vs `api.moonshot.cn`) et le modèle de recherche web Kimi par défaut.

  </Accordion>
  <Accordion title="Other behaviors">
    - Comportement de la portée DM pour l'onboarding local : [référence de configuration CLI](/fr/start/wizard-cli-reference#outputs-and-internals).
    - Premier chat le plus rapide : `openclaw dashboard` (Control UI, aucune configuration de channel).
    - Fournisseur personnalisé : connectez n'importe quel point de terminaison compatible OpenAI ou Anthropic, y compris les fournisseurs hébergés non répertoriés. Utilisez Inconnu pour une détection automatique.
    - Si un état Hermes est détecté, l'onboarding propose un flux de migration. Utilisez [Migrate](/fr/cli/migrate) pour les plans à sec, le mode de surcharge, les rapports et les mappages exacts.
  </Accordion>
</AccordionGroup>

## Commandes de suivi courantes

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` n'implique pas le mode non interactif. Utilisez `--non-interactive` pour les scripts.</Note>
