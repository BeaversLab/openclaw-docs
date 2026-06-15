---
summary: "Utilisez les modèles pay-as-you-go et Token Plan de Xiaomi MiMo avec OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need Xiaomi MiMo auth or Token Plan setup
title: "Xiaomi MiMo"
---

Xiaomi MiMo est la plateforme API pour les modèles **MiMo**. OpenClaw inclut un plugin Xiaomi intégré avec deux préréglages de fournisseur de texte :

- `xiaomi` pour les clés pay-as-you-go (`sk-...`)
- `xiaomi-token-plan` pour les clés Token Plan (`tp-...`) avec des préréglages de point de terminaison régionaux

Le même plugin enregistre également le fournisseur de synthèse vocale (TTS) `xiaomi`.

| Propriété          | Valeur                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| IDs de fournisseur | `xiaomi` (pay-as-you-go), `xiaomi-token-plan` (Token Plan)                                                                                         |
| Plugin             | intégré, `enabledByDefault: true`                                                                                                                  |
| Auth env vars      | `XIAOMI_API_KEY`, `XIAOMI_TOKEN_PLAN_API_KEY`                                                                                                      |
| Onboarding flags   | `--auth-choice xiaomi-api-key`, `--auth-choice xiaomi-token-plan-cn`, `--auth-choice xiaomi-token-plan-sgp`, `--auth-choice xiaomi-token-plan-ams` |
| Direct CLI flags   | `--xiaomi-api-key <key>`, `--xiaomi-token-plan-api-key <key>`                                                                                      |
| Contracts          | chat completions + `speechProviders`                                                                                                               |
| API                | compatible avec OpenAI (`openai-completions`)                                                                                                      |
| Base URLs          | Pay-as-you-go : `https://api.xiaomimimo.com/v1` ; Préréglages Token Plan : `token-plan-{cn,sgp,ams}...`                                            |
| Default models     | `xiaomi/mimo-v2-flash`, `xiaomi-token-plan/mimo-v2.5-pro`                                                                                          |
| TTS par défaut     | `mimo-v2.5-tts`, voix `mimo_default` ; modèle de conception vocale `mimo-v2.5-tts-voicedesign`                                                     |

## Getting started

<Steps>
  <Step title="Obtenir la bonne clé">
    Créez une clé pay-as-you-go dans la [console Xiaomi MiMo](https://platform.xiaomimimo.com/#/console/api-keys), ou ouvrez votre page d'abonnement Token Plan et copiez l'URL de base compatible OpenAI régionale ainsi que la clé `tp-...` correspondante.
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

<Tip>La référence de modèle par défaut est `xiaomi/mimo-v2-flash`. Le fournisseur est injecté automatiquement lorsque `XIAOMI_API_KEY` est défini ou qu'un profil d'authentification existe.</Tip>

## Catalogue Token Plan

Choisissez l'option d'authentification Token Plan qui correspond à l'URL de base régionale affichée dans l'interface d'abonnement de Xiaomi :

- `xiaomi-token-plan-cn` -> `https://token-plan-cn.xiaomimimo.com/v1`
- `xiaomi-token-plan-sgp` -> `https://token-plan-sgp.xiaomimimo.com/v1`
- `xiaomi-token-plan-ams` -> `https://token-plan-ams.xiaomimimo.com/v1`

| Model ref                         | Input        | Contexte  | Max output | Reasoning | Notes             |
| --------------------------------- | ------------ | --------- | ---------- | --------- | ----------------- |
| `xiaomi-token-plan/mimo-v2.5-pro` | texte        | 1 048 576 | 32 000     | Oui       | Modèle par défaut |
| `xiaomi-token-plan/mimo-v2.5`     | texte, image | 1 048 576 | 32 000     | Oui       | Multimodal        |

<Tip>L'intégration du forfait par jetons (Token Plan onboarding) valide la forme de la clé et avertit lorsqu'une clé `tp-...` est entrée dans le chemin pay-as-you-go, ou qu'une clé `sk-...` est entrée dans le chemin du Token Plan.</Tip>

## Synthèse vocale

Le plugin `xiaomi` intégré enregistre également Xiaomi MiMo en tant que fournisseur vocal pour
`messages.tts`. Il appelle le contrat TTS de chat-completions de Xiaomi avec le texte en tant que
message `assistant` et un guide de style optionnel en tant que message `user`.

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
`Mia`, `Chloe`, `Milo` et `Dean`. Les modèles à voix prédéfinies utilisent `audio.voice`, donc
OpenClaw envoie `speakerVoice` pour `mimo-v2.5-tts` et `mimo-v2-tts`.

Le modèle de conception vocale de Xiaomi, `mimo-v2.5-tts-voicedesign`, génère la voix
à partir d'une invite de style en langage naturel au lieu d'un identifiant vocal prédéfini. Configurez
`style` avec la description vocale souhaitée ; OpenClaw l'envoie comme le message `user`,
envoie le texte parlé comme le message `assistant` et omet
`audio.voice` pour ce modèle.

```json5
{
  messages: {
    tts: {
      provider: "xiaomi",
      providers: {
        xiaomi: {
          model: "mimo-v2.5-tts-voicedesign",
          format: "wav",
          style: "Warm, natural female voice with clear pronunciation.",
        },
      },
    },
  },
}
```

Pour les cibles de notes vocales telles que Feishu et Telegram, OpenClaw transcode la sortie de Xiaomi
en Opus 48 kHz avec `ffmpeg` avant la livraison.

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

Les tarifs et les indicateurs de compatibilité proviennent du manifeste du plugin groupé, donc l'exemple de configuration omet `cost` et `compat` pour éviter de diverger du comportement d'exécution.

Token Plan :

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

Les tarifs proviennent du manifeste groupé (les modèles Token Plan incluent une tarification de lecture du cache par paliers), donc l'exemple de configuration omet `cost`.

<AccordionGroup>
  <Accordion title="Comportement d'auto-injection">
    Le fournisseur `xiaomi` est injecté automatiquement lorsque `XIAOMI_API_KEY` est défini dans votre environnement ou qu'un profil d'authentification existe. `xiaomi-token-plan` nécessite une URL de base régionale, donc le chemin pris en charge est le choix d'intégration Token Plan groupé ou un bloc de configuration `models.providers.xiaomi-token-plan` explicite.
  </Accordion>

  <Accordion title="Détails du modèle">
    - **mimo-v2-flash** — léger et rapide, idéal pour les tâches textuelles générales. Aucune prise en charge du raisonnement.
    - **mimo-v2-pro** — prend en charge le raisonnement avec une fenêtre de contexte de 1M de tokens pour les charges de travail sur documents longs.
    - **mimo-v2-omni** — modèle multimodal avec raisonnement qui accepte à la fois des entrées texte et image.
    - **mimo-v2.5-pro** — valeur par défaut du Token Plan avec la pile de raisonnement V2.5 actuelle de Xiaomi.
    - **mimo-v2.5** — route multimodal V2.5 du Token Plan.

    <Note>
    Les modèles pay-as-you-go utilisent le préfixe `xiaomi/`. Les modèles Token Plan utilisent le préfixe `xiaomi-token-plan/`.
    </Note>

  </Accordion>

  <Accordion title="Dépannage">
    - Si les modèles n'apparaissent pas, vérifiez que la variable d'environnement de clé pertinente ou le profil d'authentification est présent et valide.
    - Pour le Token Plan, vérifiez que la région d'intégration choisie correspond à l'URL de base de la page d'abonnement et que la clé commence par `tp-`.
    - Lorsque le Gateway s'exécute en tant que démon, assurez-vous que la clé est accessible pour ce processus (par exemple dans `~/.openclaw/.env` ou via `env.shellEnv`).

    <Warning>
    Les clés définies uniquement dans votre shell interactif ne sont pas visibles pour les processus de passerère gérés par démon. Utilisez la config `~/.openclaw/.env` ou `env.shellEnv` pour une disponibilité persistante.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration OpenClaw.
  </Card>
  <Card title="Xiaomi MiMo console" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Tableau de bord Xiaomi MiMo et gestion des clés API.
  </Card>
</CardGroup>
