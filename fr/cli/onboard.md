---
summary: "Référence CLI pour `openclaw onboard` (onboarding interactif)"
read_when:
  - Vous souhaitez une configuration guidée pour la passerelle, l'espace de travail, l'authentification, les canaux et les compétences
title: "onboard"
---

# `openclaw onboard`

Onboarding interactif pour la configuration locale ou distante de Gateway.

## Guides connexes

- Hub d'onboarding CLI : [Onboarding (CLI)](/fr/start/wizard)
- Aperçu de l'onboarding : [Onboarding Overview](/fr/start/onboarding-overview)
- Référence d'onboarding CLI : [CLI Setup Reference](/fr/start/wizard-cli-reference)
- Automatisation CLI : [CLI Automation](/fr/start/wizard-cli-automation)
- Onboarding macOS : [Onboarding (macOS App)](/fr/start/onboarding)

## Exemples

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

Pour les cibles `ws://` de réseau privé en texte brut (réseaux de confiance uniquement), définissez
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` dans l'environnement du processus d'onboarding.

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

`--custom-api-key` est optionnel en mode non interactif. Si omis, l'onboarding vérifie `CUSTOM_API_KEY`.

Ollama non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` est par défaut `http://127.0.0.1:11434`. `--custom-model-id` est optionnel ; si omis, l'onboarding utilise les valeurs par défaut suggérées par Ollama. Les IDs de modèles cloud tels que `kimi-k2.5:cloud` fonctionnent également ici.

Stocker les clés de provider en tant que références au lieu de texte brut :

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Avec `--secret-input-mode ref`, l'onboarding écrit des références soutenues par des variables d'environnement au lieu des valeurs de clés en texte brut.
Pour les providers soutenus par des profils d'authentification, cela écrit des entrées `keyRef` ; pour les providers personnalisés, cela écrit `models.providers.<id>.apiKey` comme une référence d'environnement (par exemple `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrat du mode non interactif `ref` :

- Définissez la variable d'environnement du provider dans l'environnement du processus d'onboarding (par exemple `OPENAI_API_KEY`).
- Ne transmettez pas de drapeaux de clé en ligne (par exemple `--openai-api-key`) sauf si cette variable d'environnement est également définie.
- Si un indicateur de clé inline est transmis sans la env var requise, l'onboarding échoue rapidement avec des instructions.

Options de jeton Gateway en mode non interactif :

- `--gateway-auth token --gateway-token <token>` stocke un jeton en texte brut.
- `--gateway-auth token --gateway-token-ref-env <name>` stocke `gateway.auth.token` comme une SecretRef d'environnement.
- `--gateway-token` et `--gateway-token-ref-env` sont mutuellement exclusifs.
- `--gateway-token-ref-env` nécessite une variable d'environnement non vide dans l'environnement du processus d'onboarding.
- Avec `--install-daemon`, lorsque l'authentification par jeton nécessite un jeton, les jetons de passerelle gérés par SecretRef sont validés mais ne sont pas conservés en tant que texte brut résolu dans les métadonnées d'environnement du service superviseur.
- Avec `--install-daemon`, si le mode jeton nécessite un jeton et que le SecretRef de jeton configuré n'est pas résolu, l'intégration échoue de manière sécurisée avec des instructions de correction.
- Avec `--install-daemon`, si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'intégration bloque l'installation jusqu'à ce que le mode soit défini explicitement.

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

Santé de la gateway locale non interactive :

- Sauf si vous passez `--skip-health`, l'intégration attend une passerelle locale accessible avant de se terminer avec succès.
- `--install-daemon` lance d'abord le chemin d'installation de la passerelle gérée. Sans cela, vous devez déjà avoir une passerelle locale en cours d'exécution, par exemple `openclaw gateway run`.
- Si vous souhaitez uniquement des écritures de configuration/espace de travail/amorçage dans l'automatisation, utilisez `--skip-health`.
- Sur Windows natif, `--install-daemon` essaie d'abord les tâches planifiées et revient à un élément de connexion de dossier Démarrage par utilisateur si la création de tâche est refusée.

Comportement de l'onboarding interactif avec le mode de référence :

- Choisissez **Utiliser la référence secrète** lorsque vous y êtes invité.
- Ensuite, choisissez soit :
  - Variable d'environnement
  - Fournisseur de secrets configuré (`file` ou `exec`)
- L'onboarding effectue une validation préliminaire rapide avant d'enregistrer la référence.
  - Si la validation échoue, l'onboarding affiche l'erreur et vous permet de réessayer.

Choix de point de terminaison Z.AI non interactif :

Remarque : `--auth-choice zai-api-key` détecte désormais automatiquement le meilleur point de terminaison Z.AI pour votre clé (préfère l'API générale avec `zai/glm-5`).
Si vous souhaitez spécifiquement les points de terminaison du Plan de Codage GLM, choisissez `zai-coding-global` ou `zai-coding-cn`.

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

Notes de flux :

- `quickstart` : invites minimales, génère automatiquement un jeton de passerelle.
- `manual` : invites complètes pour le port/liage/auth (alias de `advanced`).
- Comportement de la portée DM d'intégration locale : [Référence de configuration CLI](/fr/start/wizard-cli-reference#outputs-and-internals).
- Premier chat le plus rapide : `openclaw dashboard` (Interface de contrôle, aucune configuration de canal).
- Fournisseur personnalisé : connectez n'importe quel point de terminaison compatible OpenAI ou Anthropic,
  y compris les fournisseurs hébergés non répertoriés. Utilisez Inconnu pour détecter automatiquement.

## Commandes de suite courantes

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` n'implique pas le mode non interactif. Utilisez `--non-interactive` pour les scripts.
</Note>

import en from "/components/footer/en.mdx";

<en />
