---
summary: "Utilisez l'API unifiée de Qianfan pour accéder à de nombreux modèles dans OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You need Baidu Qianfan setup guidance
title: "Qianfan"
---

# Qianfan

Qianfan est la plateforme MaaS de Baidu, fournissant une **API unifiée** qui achemine les requêtes vers de nombreux modèles derrière un seul
endpoint et une seule clé API. Elle est compatible avec OpenAI, donc la plupart des SDK OpenAI fonctionnent simplement en changeant l'URL de base.

| Propriété   | Valeur                            |
| ----------- | --------------------------------- |
| Fournisseur | `qianfan`                         |
| Auth        | `QIANFAN_API_KEY`                 |
| API         | Compatible OpenAI                 |
| URL de base | `https://qianfan.baidubce.com/v2` |

## Getting started

<Steps>
  <Step title="Créer un compte Baidu Cloud">Inscrivez-vous ou connectez-vous sur la [Qianfan Console](https://console.bce.baidu.com/qianfan/ais/console/apiKey) et assurez-vous d'avoir activé l'accès à l'API Qianfan.</Step>
  <Step title="Générer une clé API">Créez une nouvelle application ou sélectionnez une application existante, puis générez une clé API. Le format de la clé est `bce-v3/ALTAK-...`.</Step>
  <Step title="Lancer l'onboarding">```bash openclaw onboard --auth-choice qianfan-api-key ```</Step>
  <Step title="Vérifier que le modèle est disponible">```bash openclaw models list --provider qianfan ```</Step>
</Steps>

## Modèles disponibles

| Réf modèle                           | Entrée       | Contexte | Sortie max | Raisonnement | Notes             |
| ------------------------------------ | ------------ | -------- | ---------- | ------------ | ----------------- |
| `qianfan/deepseek-v3.2`              | texte        | 98 304   | 32 768     | Oui          | Modèle par défaut |
| `qianfan/ernie-5.0-thinking-preview` | texte, image | 119 000  | 64 000     | Oui          | Multimodal        |

<Tip>La référence de modèle groupée par défaut est `qianfan/deepseek-v3.2`. Vous n'avez besoin de remplacer `models.providers.qianfan` que lorsque vous avez besoin d'une URL de base personnalisée ou de métadonnées de modèle.</Tip>

## Exemple de configuration

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Transport et compatibilité">
    Qianfan passe par le chemin de transport compatible OpenAI, et non par le formatage de requête natif de OpenAI. Cela signifie que les fonctionnalités standard du SDK OpenAI fonctionnent, mais que les paramètres spécifiques au fournisseur peuvent ne pas être transmis.
  </Accordion>

  <Accordion title="Catalog and overrides">
    Le catalogue groupé inclut actuellement `deepseek-v3.2` et `ernie-5.0-thinking-preview`. Ajoutez ou substituez `models.providers.qianfan` uniquement lorsque vous avez besoin d'une URL de base personnalisée ou de métadonnées de modèle.

    <Note>
    Les références de modèle utilisent le préfixe `qianfan/` (par exemple `qianfan/deepseek-v3.2`).
    </Note>

  </Accordion>

  <Accordion title="Dépannage">
    - Assurez-vous que votre clé API commence par `bce-v3/ALTAK-` et que l'accès à l'API Qianfan est activé dans la console Baidu Cloud.
    - Si les modèles ne sont pas listés, confirmez que votre compte a le service Qianfan activé.
    - L'URL de base par défaut est `https://qianfan.baidubce.com/v2`. Ne la changez que si vous utilisez un point de terminaison personnalisé ou un proxy.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration OpenClaw.
  </Card>
  <Card title="Configuration de l'agent" href="/fr/concepts/agent" icon="robot">
    Configuration des valeurs par défaut de l'agent et des affectations de modèle.
  </Card>
  <Card title="Documentation de l'API Qianfan" href="https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb" icon="arrow-up-right-from-square">
    Documentation officielle de l'API Qianfan.
  </Card>
</CardGroup>
