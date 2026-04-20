---
title: "Volcengine (Doubao)"
summary: "Configuration de Volcano Engine (modèles Doubao, points de terminaison généraux + codage)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

Le fournisseur Volcengine donne accès aux modèles Doubao et aux modèles tiers
hébergés sur Volcano Engine, avec des points de terminaison distincts pour les charges de travail
générales et de codage.

| Détail       | Valeur                                              |
| ------------ | --------------------------------------------------- |
| Fournisseurs | `volcengine` (général) + `volcengine-plan` (codage) |
| Auth         | `VOLCANO_ENGINE_API_KEY`                            |
| API          | Compatible avec OpenAI                              |

## Getting started

<Steps>
  <Step title="Définir la clé API">
    Exécutez l'onboarding interactif :

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
  <Step title="Vérifier que le modèle est disponible">
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

<Note>Les deux fournisseurs sont configurés à partir d'une seule clé API. La configuration enregistre les deux automatiquement.</Note>

## Modèles disponibles

<Tabs>
  <Tab title="Général (volcengine)">
    | Modèle ref | Nom | Entrée | Contexte | | -------------------------------------------- | ------------------------------- | ----------- | ------- | | `volcengine/doubao-seed-1-8-251228` | Doubao Seed 1.8 | text, image | 256,000 | | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | text, image | 256,000 | | `volcengine/kimi-k2-5-260127` | Kimi K2.5 | text, image |
    256,000 | | `volcengine/glm-4-7-251222` | GLM 4.7 | text, image | 200,000 | | `volcengine/deepseek-v3-2-251201` | DeepSeek V3.2 | text, image | 128,000 |
  </Tab>
  <Tab title="Codage (volcengine-plan)">
    | Modèle réf. | Nom | Entrée | Contexte | | ------------------------------------------------- | ------------------------ | ------ | -------- | | `volcengine-plan/ark-code-latest` | Ark Coding Plan | texte | 256 000 | | `volcengine-plan/doubao-seed-code` | Doubao Seed Code | texte | 256 000 | | `volcengine-plan/glm-4.7` | GLM 4.7 Coding | texte | 200 000 | | `volcengine-plan/kimi-k2-thinking` |
    Kimi K2 Thinking | texte | 256 000 | | `volcengine-plan/kimi-k2.5` | Kimi K2.5 Coding | texte | 256 000 | | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | texte | 256 000 |
  </Tab>
</Tabs>

## Notes avancées

<AccordionGroup>
  <Accordion title="Modèle par défaut après l'intégration">
    `openclaw onboard --auth-choice volcengine-api-key` définit actuellement
    `volcengine-plan/ark-code-latest` comme modèle par défaut tout en enregistrant
    le catalogue général `volcengine`.
  </Accordion>

<Accordion title="Comportement de repli du sélecteur de modèle">Lors de l'intégration/configuration de la sélection de modèle, le choix d'authentification Volcengine préfère à la fois les lignes `volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur limité au provider vide.</Accordion>

  <Accordion title="Variables d'environnement pour les processus démon">
    Si la Gateway fonctionne en tant que démon (launchd/systemd), assurez-vous que
    `VOLCANO_ENGINE_API_KEY` est disponible pour ce processus (par exemple, dans
    `~/.openclaw/.env` ou via `env.shellEnv`).
  </Accordion>
</AccordionGroup>

<Warning>Lors de l'exécution d'OpenClaw en tant que service d'arrière-plan, les variables d'environnement définies dans votre shell interactif ne sont pas automatiquement héritées. Voir la note sur le démon ci-dessus.</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les providers, les références de modèles et le comportement de basculement.
  </Card>
  <Card title="Configuration" href="/fr/configuration" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
  <Card title="Troubleshooting" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et étapes de débogage.
  </Card>
  <Card title="FAQ" href="/fr/help/faq" icon="circle-question">
    Questions fréquemment posées sur la configuration de OpenClaw.
  </Card>
</CardGroup>
