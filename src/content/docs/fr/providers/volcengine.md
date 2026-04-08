---
title: "Volcengine (Doubao)"
summary: "Configuration de Volcano Engine (modèles Doubao, points de terminaison généraux et codage)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

Le fournisseur Volcengine donne accès aux modèles Doubao et aux modèles tiers
hébergés sur Volcano Engine, avec des points de terminaison distincts pour les charges de travail
générales et de codage.

- Fournisseurs : `volcengine` (général) + `volcengine-plan` (codage)
- Auth : `VOLCANO_ENGINE_API_KEY`
- API : compatible OpenAI

## Quick start

1. Définir la clé API :

```bash
openclaw onboard --auth-choice volcengine-api-key
```

2. Définir un model par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "volcengine-plan/ark-code-latest" },
    },
  },
}
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

## Fournisseurs et points de terminaison

| Fournisseur       | Point de terminaison                      | Cas d'usage       |
| ----------------- | ----------------------------------------- | ----------------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | Modèles généraux  |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | Modèles de codage |

Les deux fournisseurs sont configurés avec une seule clé API. Le configuration enregistre les deux
automatiquement.

## Modèles disponibles

Fournisseur général (`volcengine`) :

| Réf modèle                                   | Nom                             | Entrée       | Contexte |
| -------------------------------------------- | ------------------------------- | ------------ | -------- |
| `volcengine/doubao-seed-1-8-251228`          | Doubao Seed 1.8                 | texte, image | 256 000  |
| `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | texte, image | 256 000  |
| `volcengine/kimi-k2-5-260127`                | Kimi K2.5                       | texte, image | 256 000  |
| `volcengine/glm-4-7-251222`                  | GLM 4.7                         | texte, image | 200 000  |
| `volcengine/deepseek-v3-2-251201`            | DeepSeek V3.2                   | texte, image | 128 000  |

Fournisseur de codage (`volcengine-plan`) :

| Réf modèle                                        | Nom                      | Entrée | Contexte |
| ------------------------------------------------- | ------------------------ | ------ | -------- |
| `volcengine-plan/ark-code-latest`                 | Ark Coding Plan          | texte  | 256 000  |
| `volcengine-plan/doubao-seed-code`                | Doubao Seed Code         | texte  | 256 000  |
| `volcengine-plan/glm-4.7`                         | GLM 4.7 Coding           | texte  | 200 000  |
| `volcengine-plan/kimi-k2-thinking`                | Kimi K2 Thinking         | texte  | 256 000  |
| `volcengine-plan/kimi-k2.5`                       | Kimi K2.5 Coding         | texte  | 256 000  |
| `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | texte  | 256 000  |

`openclaw onboard --auth-choice volcengine-api-key` définit actuellement
`volcengine-plan/ark-code-latest` comme modèle par défaut tout en enregistrant
le catalogue général `volcengine`.

Pendant l'intégration/la configuration de la sélection de modèle, le choix d'authentification Volcengine préfère
les lignes `volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas
encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un
sélecteur limité au fournisseur vide.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous
que `VOLCANO_ENGINE_API_KEY` est disponible pour ce processus (par exemple, dans
`~/.openclaw/.env` ou via `env.shellEnv`).
