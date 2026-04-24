---
title: "Tencent Cloud (TokenHub)"
summary: "Configuration de Tencent Cloud TokenHub"
read_when:
  - You want to use Tencent Hy models with OpenClaw
  - You need the TokenHub API key setup
---

# Tencent Cloud (TokenHub)

Tencent Cloud est fourni en tant que **plugin de provider groupé** dans OpenClaw. Il donne accès aux modèles Tencent Hy via le point de terminaison TokenHub (`tencent-tokenhub`).

Le provider utilise une OpenAI compatible API.

## Démarrage rapide

```bash
openclaw onboard --auth-choice tokenhub-api-key
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## Providers et points de terminaison

| Provider           | Point de terminaison          | Cas d'usage             |
| ------------------ | ----------------------------- | ----------------------- |
| `tencent-tokenhub` | `tokenhub.tencentmaas.com/v1` | Hy via Tencent TokenHub |

## Modèles disponibles

### tencent-tokenhub

- **hy3-preview** — Hy3 preview (contexte 256K, raisonnement, par défaut)

## Remarques

- Les références de modèle TokenHub utilisent `tencent-tokenhub/<modelId>`.
- Le plugin est fourni avec des métadonnées de tarification échelonnée Hy3 intégrées, de sorte que les estimations de coûts sont renseignées sans manuellement remplacer la tarification.
- Remplacez les métadonnées de tarification et de contexte dans `models.providers` si nécessaire.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `TOKENHUB_API_KEY`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Documentation connexe

- [Configuration OpenClaw](/fr/gateway/configuration)
- [Providers de modèles](/fr/concepts/model-providers)
- [Tencent TokenHub](https://cloud.tencent.com/document/product/1823/130050)
