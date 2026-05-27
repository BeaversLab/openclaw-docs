---
summary: "Convention de substitution sécurisée contre les scanners de secrets pour la documentation et les exemples"
read_when:
  - Writing docs that include tokens, API keys, or credential snippets
  - Updating examples that may be scanned by secret-detection tooling
title: "Conventions de substitution de secrets"
---

# Conventions de substitution de secrets

Utilisez des substituts lisibles par l'homme qui ne ressemblent pas à de vrais secrets.

## Style recommandé

- Privilégiez des valeurs descriptives comme `example-openai-key-not-real` ou `example-discord-bot-token`.
- Pour les extraits de code shell, privilégiez `${OPENAI_API_KEY}` aux chaînes similaires à des jetons en ligne.
- Gardez les exemples manifestement factices et limités à leur usage (provider, channel, type d'authentification).

## Éviter ces modèles dans la documentation

- Texte d'en-tête ou de pied de page de clé privée PEM littéral.
- Préfixes ressemblant à des informations d'identification actives, par exemple `sk-...`, `xoxb-...`, `AKIA...`.
- Jetons porteurs réalistes copiés depuis les journaux d'exécution.

## Exemple

```bash
# Good
export OPENAI_API_KEY="example-openai-key-not-real"

# Better (when the doc is about env wiring)
export OPENAI_API_KEY="${OPENAI_API_KEY}"
```
