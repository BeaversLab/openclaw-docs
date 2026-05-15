---
summary: "Drapeaux de diagnostic pour les journaux de débogage ciblés"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "Drapeaux de diagnostic"
---

Les indicateurs de diagnostic vous permettent d'activer les journaux de débogage ciblés sans activer la journalisation détaillée partout. Les indicateurs sont opt-in et n'ont aucun effet à moins qu'un sous-système ne les vérifie.

## Fonctionnement

- Les indicateurs sont des chaînes de caractères (insensibles à la casse).
- Vous pouvez activer les indicateurs dans la configuration ou via une substitution de variable d'environnement.
- Les caractères génériques sont pris en charge :
  - `telegram.*` correspond à `telegram.http`
  - `*` active tous les drapeaux

## Activer via la configuration

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Indicateurs multiples :

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "brave.http", "gateway.*"]
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

## Artefacts de la chronologie

Le drapeau `timeline` écrit des événements de chronologie structurés au démarrage et à l'exécution pour
les harnais de contrôle qualité externes :

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

Vous pouvez également l'activer dans la configuration :

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

Le chemin du fichier de chronologie provient toujours de
`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`. Lorsque `timeline` est activé uniquement
depuis la configuration, les premières étapes de chargement de la configuration ne sont pas émises car OpenClaw
n'a pas encore lu la configuration ; les étapes de démarrage ultérieures utilisent le drapeau de configuration.

`OPENCLAW_DIAGNOSTICS=1`, `OPENCLAW_DIAGNOSTICS=all` et
`OPENCLAW_DIAGNOSTICS=*` activent également la chronologie car ils activent chaque
drapeau de diagnostic. Privilégiez `timeline` si vous ne voulez que l'artefact de
chronologie JSONL.

Les enregistrements de la chronologie utilisent l'enveloppe `openclaw.diagnostics.v1`. Les événements peuvent inclure
les identifiants de processus, les noms de phase, les noms d'étendue, les durées, les identifiants de plug-in, les comptes de dépendances,
les échantillons de délai de boucle d'événements, les noms d'opérations du provider, l'état de sortie des processus enfants,
et les noms/messages d'erreur de démarrage. Traitez les fichiers de chronologie comme des artefacts de diagnostic
locaux ; examinez-les avant de les partager hors de votre machine.

## Où vont les journaux

Les drapeaux émettent des journaux dans le fichier journal de diagnostic standard. Par défaut :

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Si vous définissez `logging.file`, utilisez ce chemin à la place. Les journaux sont au format JSONL (un objet JSON par ligne). La suppression (redaction) s'applique toujours en fonction de `logging.redactSensitive`.

## Extraire les journaux

Choisissez le dernier fichier journal :

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

Filtrer pour les diagnostics HTTP Telegram :

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

Filtrer pour les diagnostics HTTP de recherche Brave :

```bash
rg "brave http" /tmp/openclaw/openclaw-*.log
```

Ou surveillez en direct (tail) tout en reproduisant :

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

Pour les passerelles distantes, vous pouvez également utiliser `openclaw logs --follow` (voir [/cli/logs](/fr/cli/logs)).

## Notes

- Si `logging.level` est défini plus haut que `warn`, ces journaux peuvent être supprimés. La valeur par défaut `info` convient.
- `brave.http` journalise les URL de requêtes et les paramètres de recherche Brave, le statut/le timing des réponses, ainsi que les événements de succès/échec/écriture du cache. Il ne journalise pas les clés API ni les corps des réponses, mais les requêtes de recherche peuvent être sensibles.
- Il est sans risque de laisser les indicateurs activés ; ils n'affectent que le volume des journaux pour le sous-système spécifique.
- Utilisez [/logging](/fr/logging) pour modifier les destinations de journalisation, les niveaux et la rédaction.

## Connexes

- [Diagnostics du Gateway](/fr/gateway/diagnostics)
- [Dépannage du Gateway](/fr/gateway/troubleshooting)
