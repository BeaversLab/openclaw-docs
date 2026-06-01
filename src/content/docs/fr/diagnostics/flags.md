---
summary: "Indicateurs de diagnostic pour les journaux de débogage ciblés"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "Indicateurs de diagnostic"
---

Les indicateurs de diagnostic vous permettent d'activer les journaux de débogage ciblés sans activer la journalisation détaillée partout. Les indicateurs sont opt-in et n'ont aucun effet à moins qu'un sous-système ne les vérifie.

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

`OPENCLAW_DIAGNOSTICS=0` est une substitution de désactivation au niveau du processus : elle désactive
les indicateurs provenant à la fois des variables d'environnement et de la configuration pour ce processus.

## Indicateurs de profilage

Les indicateurs de profilage activent des plages de chronométrage ciblées sans augmenter les niveaux de journalisation globaux.
Ils sont désactivés par défaut.

Activer toutes les plages conditionnées par le profileur pour une exécution de la passerelle :

```bash
OPENCLAW_DIAGNOSTICS=profiler openclaw gateway run
```

Activer uniquement les plages du profileur de dispatch de réponse :

```bash
OPENCLAW_DIAGNOSTICS=reply.profiler openclaw gateway run
```

Activer uniquement les plages du profileur de démarrage/tool/thread du serveur d'application Codex :

```bash
OPENCLAW_DIAGNOSTICS=codex.profiler openclaw gateway run
```

Activer les indicateurs de profilage depuis la configuration :

```json
{
  "diagnostics": {
    "flags": ["reply.profiler", "codex.profiler"]
  }
}
```

Redémarrez la passerelle après avoir modifié les indicateurs de configuration. Pour désactiver un indicateur de profilage,
supprimez-le de `diagnostics.flags` et redémarrez. Pour désactiver temporairement tout
indicateur de diagnostic même lorsque la configuration active les indicateurs de profilage, démarrez le processus avec :

```bash
OPENCLAW_DIAGNOSTICS=0 openclaw gateway run
```

## Artefacts de chronologie

L'indicateur `timeline` écrit des événements de chronométrage structurés au démarrage et à l'exécution pour
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

Le chemin d'accès au fichier de chronologie provient toujours de
`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`. Lorsque `timeline` est activé uniquement depuis
la configuration, les premières plages de chargement de la configuration ne sont pas émises car OpenClaw n'a
pas encore lu la configuration ; les plages de démarrage ultérieures utilisent l'indicateur de configuration.

`OPENCLAW_DIAGNOSTICS=1`, `OPENCLAW_DIAGNOSTICS=all` et
`OPENCLAW_DIAGNOSTICS=*` activent également la chronologie car ils activent chaque
indicateur de diagnostic. Privilégiez `timeline` si vous ne souhaitez que l'artefact de chronométrage JSONL.

Les enregistrements de chronologie utilisent l'enveloppe `openclaw.diagnostics.v1`. Les événements peuvent inclure
les ID de processus, les noms de phase, les noms de plage, les durées, les ID de plugin, les nombres de dépendances,
les échantillons de retard de boucle d'événements, les noms d'opération de fournisseur, l'état de sortie du processus fils,
et les noms/messages d'erreur de démarrage. Traitez les fichiers de chronologie comme des artefacts de diagnostic
locaux ; examinez-les avant de les partager en dehors de votre machine.

## Emplacement des journaux

Les indicateurs émettent des journaux dans le fichier journal de diagnostic standard. Par défaut :

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Si vous définissez `logging.file`, utilisez plutôt ce chemin. Les journaux sont au format JSONL (un objet JSON par ligne). La suppression s'applique toujours en fonction de `logging.redactSensitive`.

## Extraire les journaux

Choisissez le dernier fichier journal :

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

Filtrer pour les diagnostics HTTP Telegram :

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

Filtrer pour les diagnostics HTTP Brave Search :

```bash
rg "brave http" /tmp/openclaw/openclaw-*.log
```

Ou suivre la fin du fichier pendant la reproduction :

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

Pour les passerelles distantes, vous pouvez également utiliser `openclaw logs --follow` (voir [/cli/logs](/fr/cli/logs)).

## Remarques

- Si `logging.level` est défini à une valeur supérieure à `warn`, ces journaux peuvent être supprimés. La valeur par défaut `info` est correcte.
- `brave.http` journalise les URL/paramètres de requête de recherche Brave, le statut/le temps de réponse, et les événements de succès/échec/écriture du cache. Il ne journalise pas les clés API ni les corps de réponse, mais les requêtes de recherche peuvent être sensibles.
- Il est sûr de laisser les indicateurs activés ; ils n'affectent que le volume des journaux pour le sous-système spécifique.
- Utilisez [/logging](/fr/logging) pour modifier les destinations, les niveaux et la suppression des journaux.

## Connexes

- [Diagnostics de Gateway](/fr/gateway/diagnostics)
- [Dépannage de Gateway](/fr/gateway/troubleshooting)
