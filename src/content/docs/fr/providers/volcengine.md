---
summary: "Configuration de Volcano Engine (modèles Doubao, points de terminaison de codage et synthèse vocale Seed Speech)"
title: "Volcengine (Doubao)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
  - You want to use Volcengine Speech text-to-speech
---

Le fournisseur Volcengine donne accès aux modèles Doubao et aux modèles tiers hébergés sur Volcano Engine, avec des points de terminaison distincts pour les charges de travail générales et de codage. Le même plugin groupé peut également enregistrer Volcengine Speech en tant que fournisseur TTS.

| Détail                     | Valeur                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| Fournisseurs               | `volcengine` (général + TTS) + `volcengine-plan` (codage)                 |
| Authentification du modèle | `VOLCANO_ENGINE_API_KEY`                                                  |
| Authentification TTS       | `VOLCENGINE_TTS_API_KEY` ou `BYTEPLUS_SEED_SPEECH_API_KEY`                |
| API                        | Modèles compatibles avec OpenAI, synthèse vocale BytePlus Seed Speech TTS |

## Getting started

<Steps>
  <Step title="Définir la clé API">
    Exécutez l'intégration interactive :

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    Cela enregistre les fournisseurs général (`volcengine`) et codage (`volcengine-plan`) à partir d'une seule clé API.

  </Step>
  <Step title="Définir un modèle par défaut">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step title="Vérifier la disponibilité du modèle">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
Pour une configuration non interactive (CI, scripts), passez la clé directement :

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## Fournisseurs et points de terminaison

| Fournisseur       | Point de terminaison                      | Cas d'usage       |
| ----------------- | ----------------------------------------- | ----------------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | Modèles généraux  |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | Modèles de codage |

<Note>Les deux fournisseurs sont configurés à partir d'une seule clé API. La configuration les enregistre automatiquement.</Note>

## Catalogue intégré

<Tabs>
  <Tab title="Général (volcengine)">
    | Modèle ref | Nom | Entrée | Contexte | | ------------------------------------------ | ------------------------------ | ----------- | ------- | | `volcengine/doubao-seed-1-8-251228` | Doubao Seed 1.8 | texte, image | 256,000 | | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | texte, image | 256,000 | | `volcengine/kimi-k2-5-260127` | Kimi K2.5 | texte, image |
    256,000 | | `volcengine/glm-4-7-251222` | GLM 4.7 | texte, image | 200,000 | | `volcengine/deepseek-v3-2-251201` | DeepSeek V3.2 | texte, image | 128,000 |
  </Tab>
  <Tab title="Codage (volcengine-plan)">
    | Modèle ref | Nom | Entrée | Contexte | | ------------------------------------------------ | ----------------------- | ------ | ------- | | `volcengine-plan/ark-code-latest` | Ark Coding Plan | texte | 256,000 | | `volcengine-plan/doubao-seed-code` | Doubao Seed Code | texte | 256,000 | | `volcengine-plan/glm-4.7` | GLM 4.7 Coding | texte | 200,000 | | `volcengine-plan/kimi-k2-thinking` |
    Kimi K2 Thinking | texte | 256,000 | | `volcengine-plan/kimi-k2.5` | Kimi K2.5 Coding | texte | 256,000 | | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | texte | 256,000 |
  </Tab>
</Tabs>

## Synthèse vocale

Le TTS Volcengine utilise l'API HTTP BytePlus Seed Speech et est configuré
séparément de la clé d'OpenAI du modèle Doubao compatible API. Dans la console BytePlus,
ouvre Seed Speech > Paramètres > Clés d'API et copie la clé d'API, puis définis :

```bash
export VOLCENGINE_TTS_API_KEY="byteplus_seed_speech_api_key"
export VOLCENGINE_TTS_RESOURCE_ID="seed-tts-1.0"
```

Active-le ensuite dans `openclaw.json` :

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "byteplus_seed_speech_api_key",
          voice: "en_female_anna_mars_bigtts",
          speedRatio: 1.0,
        },
      },
    },
  },
}
```

Pour les cibles de notes vocales, OpenClaw demande à Volcengine un `ogg_opus` natif au fournisseur.
Pour les pièces jointes audio normales, il demande un `mp3`. Les alias de fournisseur
`bytedance` et `doubao` renvoient également au même fournisseur vocal.

L'identifiant de ressource par défaut est `seed-tts-1.0` car c'est ce que BytePlus accorde
aux clés d'API Seed Speech nouvellement créées dans le projet par défaut. Si ton projet
possède des droits TTS 2.0, définis `VOLCENGINE_TTS_RESOURCE_ID=seed-tts-2.0`.

<Warning>`VOLCANO_ENGINE_API_KEY` est destiné aux points de terminaison des modèles ModelArk/Doubao et n'est pas une clé d'API Seed Speech. La synthèse vocale nécessite une clé d'API Seed Speech provenant de la console BytePlus Speech, ou une paire AppID/jeton de l'ancienne console Speech.</Warning>

L'authentification par AppID/jeton (legacy) reste prise en charge pour les anciennes applications de la console Speech :

```bash
export VOLCENGINE_TTS_APPID="speech_app_id"
export VOLCENGINE_TTS_TOKEN="speech_access_token"
export VOLCENGINE_TTS_CLUSTER="volcano_tts"
```

## Configuration avancée

<AccordionGroup>
  <Accordion title="Modèle par défaut après l'intégration">
    `openclaw onboard --auth-choice volcengine-api-key` définit actuellement
    `volcengine-plan/ark-code-latest` comme modèle par défaut tout en enregistrant
    le catalogue général `volcengine`.
  </Accordion>

<Accordion title="Comportement de secours du sélecteur de modèle">Lors de l'intégration/configuration de la sélection de modèle, le choix d'authentification Volcengine privilégie à la fois les lignes `volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur limité au fournisseur vide.</Accordion>

  <Accordion title="Variables d'environnement pour les processus démons">
    Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que les variables d'environnement de modèle et de TTS
    telles que `VOLCANO_ENGINE_API_KEY`, `VOLCENGINE_TTS_API_KEY`,
    `BYTEPLUS_SEED_SPEECH_API_KEY`, `VOLCENGINE_TTS_APPID` et
    `VOLCENGINE_TTS_TOKEN` sont disponibles pour ce processus (par exemple, dans
    `~/.openclaw/.env` ou via `env.shellEnv`).
  </Accordion>
</AccordionGroup>

<Warning>Lors de l'exécution d'OpenClaw en tant que service d'arrière-plan, les variables d'environnement définies dans votre shell interactif ne sont pas héritées automatiquement. Voir la note sur le démon ci-dessus.</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèle et comportement de basculement.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et étapes de débogage.
  </Card>
  <Card title="FAQ" href="/fr/help/faq" icon="circle-question">
    Questions fréquentes sur la configuration d'OpenClaw.
  </Card>
</CardGroup>
