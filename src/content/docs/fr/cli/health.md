---
summary: "Référence CLI pour `openclaw health` (instantané de santé de la passerelle via RPC)"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `openclaw health`

Récupérer l'état de santé du passerelle en cours d'exécution.

Options :

- `--json` : sortie lisible par machine
- `--timeout <ms>` : délai de connexion en millisecondes (par défaut `10000`)
- `--verbose` : journalisation détaillée
- `--debug` : alias pour `--verbose`

Exemples :

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

Notes :

- Le `openclaw health` par défaut demande à la passerelle en cours d'exécution son instantané de santé. Lorsque la
  passerelle dispose déjà d'un instantané en cache frais, elle peut renvoyer cette charge utile en cache et
  l'actualiser en arrière-plan.
- `--verbose` force une sonde en direct, imprime les détails de connexion de la passerelle et étend la
  sortie lisible par l'homme sur tous les comptes et agents configurés.
- La sortie inclut les magasins de session par agent lorsque plusieurs agents sont configurés.
