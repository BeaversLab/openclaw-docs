---
summary: "Indicateurs de diagnostic pour les journaux de débogage ciblés"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "Indicateurs de diagnostic"
---

# Indicateurs de diagnostic

Les indicateurs de diagnostic vous permettent d'activer des journaux de débogage ciblés sans activer la journalisation détaillée partout. Les indicateurs sont opt-in et n'ont aucun effet à moins qu'un sous-système ne les vérifie.

## Fonctionnement

- Les indicateurs sont des chaînes de caractères (insensibles à la casse).
- Vous pouvez activer les indicateurs dans la configuration ou via une substitution de variable d'environnement.
- Les caractères génériques sont pris en charge :
  - `telegram.*` correspond à `telegram.http`
  - `*` active tous les indicateurs

## Activer via la configuration

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Plusieurs indicateurs :

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "gateway.*"]
  }
}
```

Redémarrez la passerelle après avoir modifié les indicateurs.

## Substitution de variable d'environnement (ponctuelle)

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

Désactiver tous les indicateurs :

```bash
OPENCLAW_DIAGNOSTICS=0
```

## Destination des journaux

Les indicateurs émettent des journaux dans le fichier de journal de diagnostic standard. Par défaut :

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Si vous définissez `logging.file`, utilisez plutôt ce chemin. Les journaux sont au format JSONL (un objet JSON par ligne). La suppression des informations sensibles s'applique toujours en fonction de `logging.redactSensitive`.

## Extraire les journaux

Sélectionnez le dernier fichier journal :

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

Filtrer pour les diagnostics HTTP Telegram :

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

Ou suivre en temps réel lors de la reproduction :

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

Pour les passerelles distantes, vous pouvez également utiliser `openclaw logs --follow` (voir [/cli/logs](/fr/cli/logs)).

## Notes

- Si `logging.level` est défini plus haut que `warn`, ces journaux peuvent être supprimés. La valeur par défaut `info` convient.
- Il est possible de laisser les indicateurs activés ; ils n'affectent que le volume des journaux pour le sous-système spécifique.
- Utilisez [/logging](/fr/logging) pour modifier les destinations des journaux, les niveaux et la suppression des informations sensibles.

import fr from '/components/footer/fr.mdx';

<fr />
