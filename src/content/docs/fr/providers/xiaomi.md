---
summary: "XiaomiOpenClawUtiliser les modèles Xiaomi MiMo pay-as-you-go et Token Plan avec OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need Xiaomi MiMo auth or Token Plan setup
title: "XiaomiXiaomi MiMo"
---

Xiaomi MiMo est la plateforme API pour les modèles **MiMo**. OpenClaw inclut un plugin Xiaomi intégré avec deux préréglages de fournisseur de texte :

- `xiaomi` pour les clés pay-as-you-go (`sk-...`)
- `xiaomi-token-plan` pour les clés Token Plan (`tp-...`) avec des préréglages de point de terminaison régionaux

Le même plugin enregistre également le fournisseur de synthèse vocale (TTS) `xiaomi`.

| Propriété          | Valeur                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| IDs de fournisseur | `xiaomi` (pay-as-you-go), `xiaomi-token-plan` (Token Plan)                                                                                         |
| Plugin             | bundled, `enabledByDefault: true`                                                                                                                  |
| Auth env vars      | `XIAOMI_API_KEY`, `XIAOMI_TOKEN_PLAN_API_KEY`                                                                                                      |
| Onboarding flags   | `--auth-choice xiaomi-api-key`, `--auth-choice xiaomi-token-plan-cn`, `--auth-choice xiaomi-token-plan-sgp`, `--auth-choice xiaomi-token-plan-ams` |
| Direct CLI flags   | `--xiaomi-api-key <key>`, `--xiaomi-token-plan-api-key <key>`                                                                                      |
| Contracts          | chat completions + `speechProviders`                                                                                                               |
| API                | OpenAI-compatible (`openai-completions`)                                                                                                           |
| Base URLs          | Pay-as-you-go: `https://api.xiaomimimo.com/v1`; Token Plan presets: `token-plan-{cn,sgp,ams}...`                                                   |
| Default models     | `xiaomi/mimo-v2-flash`, `xiaomi-token-plan/mimo-v2.5-pro`                                                                                          |
| TTS par défaut     | `mimo-v2.5-tts`, voix `mimo_default`                                                                                                               |

## Getting started

<Steps>
  <Step title="Obtenir la bonne clé">
    Créez une clé à la demande dans la [console Xiaomi MiMo](https://platform.xiaomimimo.com/#/console/api-keys), ou ouvrez votre page d'abonnement Token Plan et copiez l'URL de base compatible OpenAI de la région ainsi que la clé `tp-...` correspondante.
  </Step>

  <Step title="Exécuter l'onboarding">
    Pay-as-you-go :

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    Token Plan :

    ```bash
    openclaw onboard --auth-choice xiaomi-token-plan-sgp
    ```

    Ou passez les clés directement :

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    openclaw onboard --auth-choice xiaomi-token-plan-sgp --xiaomi-token-plan-api-key "$XIAOMI_TOKEN_PLAN_API_KEY"
    ```

  </Step>
  <Step title="Vérifier que le modèle est disponible">
    ```bash
    openclaw models list --provider xiaomi
    openclaw models list --provider xiaomi-token-plan
    ```
  </Step>
</Steps>

## Catalogue Pay-as-you-go

| Référence du modèle    | Entrée      | Contexte  | Max output | Reasoning | Notes             |
| ---------------------- | ----------- | --------- | ---------- | --------- | ----------------- |
| `xiaomi/mimo-v2-flash` | text        | 262,144   | 8,192      | No        | Modèle par défaut |
| `xiaomi/mimo-v2-pro`   | text        | 1,048,576 | 32,000     | Yes       | Large context     |
| `xiaomi/mimo-v2-omni`  | text, image | 262,144   | 32,000     | Yes       | Multimodal        |

<Tip>The default model ref is `xiaomi/mimo-v2-flash`. The provider is injected automatically when `XIAOMI_API_KEY` is set or an auth profile exists.</Tip>

## Catalogue Token Plan

Choisissez l'option d'authentification Token Plan qui correspond à l'URL de base régionale affichée dans l'interface d'abonnement de Xiaomi :

- `xiaomi-token-plan-cn` -> `https://token-plan-cn.xiaomimimo.com/v1`
- `xiaomi-token-plan-sgp` -> `https://token-plan-sgp.xiaomimimo.com/v1`
- `xiaomi-token-plan-ams` -> `https://token-plan-ams.xiaomimimo.com/v1`

| Model ref                         | Input        | Contexte  | Max output | Reasoning | Notes             |
| --------------------------------- | ------------ | --------- | ---------- | --------- | ----------------- |
| `xiaomi-token-plan/mimo-v2.5-pro` | texte        | 1 048 576 | 32 000     | Oui       | Modèle par défaut |
| `xiaomi-token-plan/mimo-v2.5`     | texte, image | 1 048 576 | 32 000     | Oui       | Multimodal        |

<Tip>L'intégration du plan de jetons valide le format de la clé et avertit lorsqu'une clé `tp-...` est saisie dans le chemin pay-as-you-go, ou lorsqu'une clé `sk-...` est saisie dans le chemin du plan de jetons.</Tip>

## Synthèse vocale

Le plugin `xiaomi` inclus enregistre également Xiaomi MiMo en tant que fournisseur vocal pour
`messages.tts`. Il appelle le contrat TTS de complétion de chat de Xiaomi avec le texte sous forme de
message `assistant` et des instructions de style optionnelles sous forme de message `user`.

| Propriété  | Valeur                                       |
| ---------- | -------------------------------------------- |
| ID TTS     | `xiaomi` (alias `mimo`)                      |
| Auth       | `XIAOMI_API_KEY`                             |
| API        | `POST /v1/chat/completions` avec `audio`     |
| Par défaut | `mimo-v2.5-tts`, voix `mimo_default`         |
| Sortie     | MP3 par défaut ; WAV lorsqu'il est configuré |

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "xiaomi_api_key",
          model: "mimo-v2.5-tts",
          speakerVoice: "mimo_default",
          format: "mp3",
          style: "Bright, natural, conversational tone.",
        },
      },
    },
  },
}
```

Les voix intégrées prises en charge incluent `mimo_default`, `default_zh`, `default_en`,
`Mia`, `Chloe`, `Milo` et `Dean`. `mimo-v2-tts` est pris en charge pour les anciens comptes
TTS MiMo ; la valeur par défaut utilise le modèle TTS MiMo-V2.5 actuel. Pour les cibles de
notes vocales telles que Feishu et Telegram, OpenClaw transcode la sortie Xiaomi en Opus 48 kHz
avec `ffmpeg` avant la livraison.

## Exemple de configuration

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

Les tarifs et les indicateurs de compatibilité proviennent du manifeste du plugin groupé, par conséquent, l'exemple de configuration omet `cost` et `compat` pour éviter toute divergence avec le comportement d'exécution.

Forfait Jeton :

```json5
{
  env: { XIAOMI_TOKEN_PLAN_API_KEY: "tp-your-key" },
  agents: { defaults: { model: { primary: "xiaomi-token-plan/mimo-v2.5-pro" } } },
  models: {
    mode: "merge",
    providers: {
      "xiaomi-token-plan": {
        baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_TOKEN_PLAN_API_KEY",
        models: [
          {
            id: "mimo-v2.5-pro",
            name: "Xiaomi MiMo V2.5 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2.5",
            name: "Xiaomi MiMo V2.5",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

La tarification provient du manifeste groupé (les modèles de Forfait Jeton incluent une tarification de lecture du cache par niveaux), par conséquent, l'exemple de configuration omet `cost`.

<AccordionGroup>
  <Accordion title="Comportement d'injection automatique">
    Le fournisseur `xiaomi` est injecté automatiquement lorsque `XIAOMI_API_KEY` est défini dans votre environnement ou qu'un profil d'authentification existe. `xiaomi-token-plan` a besoin d'une URL de base régionale, donc le chemin pris en charge est le choix d'onboarding du Forfait Jeton groupé ou un bloc de configuration explicite `models.providers.xiaomi-token-plan`.
  </Accordion>

  <Accordion title="Détails du modèle">
    - **mimo-v2-flash** — léger et rapide, idéal pour les tâches textuelles générales. Pas de support du raisonnement.
    - **mimo-v2-pro** — prend en charge le raisonnement avec une fenêtre de contexte de 1M de jetons pour les charges de travail sur documents longs.
    - **mimo-v2-omni** — modèle multimodal avec raisonnement qui accepte les entrées texte et image.
    - **mimo-v2.5-pro** — valeur par défaut du Token Plan avec la pile de raisonnement actuelle V2.5 de Xiaomi.
    - **mimo-v2.5** — route multimodale V2.5 du Token Plan.

    <Note>
    Les modèles à la carte utilisent le préfixe `xiaomi/`. Les modèles Token Plan utilisent le préfixe `xiaomi-token-plan/`.
    </Note>

  </Accordion>

  <Accordion title="Dépannage">
    - Si les modèles n'apparaissent pas, vérifiez que la variable d'environnement de clé pertinente ou le profil d'authentification est présent et valide.
    - Pour le Token Plan, vérifiez que la région d'intégration choisie correspond à l'URL de base de la page d'abonnement et que la clé commence par `tp-`.
    - Lorsque le Gateway s'exécute en tant que démon, assurez-vous que la clé est disponible pour ce processus (par exemple dans `~/.openclaw/.env` ou via `env.shellEnv`).

    <Warning>
    Les clés définies uniquement dans votre shell interactif ne sont pas visibles pour les processus de passerelle gérés par le démon. Utilisez la config `~/.openclaw/.env` ou `env.shellEnv` pour une disponibilité persistante.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration OpenClaw.
  </Card>
  <Card title="Xiaomi MiMo console" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Tableau de bord Xiaomi MiMo et gestion des clés API.
  </Card>
</CardGroup>
