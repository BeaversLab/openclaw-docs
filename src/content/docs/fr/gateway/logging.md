---
summary: "Surfaces de journalisation, journaux de fichiers, styles de journaux WS et formatage de la console"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Journalisation du Gateway"
---

# Journalisation

Pour une vue d'ensemble destinée à l'utilisateur (CLI + Interface de contrôle + configuration), voir [/logging](/en/logging).

OpenClaw possède deux « surfaces » de journalisation :

- **Sortie console** (ce que vous voyez dans le terminal / Interface de débogage).
- **Journaux de fichiers** (lignes JSON) écrits par le journalier de la passerelle.

## Journalier basé sur fichiers

- Le fichier journal à rotation par défaut se trouve sous `/tmp/openclaw/` (un fichier par jour) : `openclaw-YYYY-MM-DD.log`
  - La date utilise le fuseau horaire local de l'hôte de la passerelle.
- Le chemin du fichier journal et le niveau peuvent être configurés via `~/.openclaw/openclaw.json` :
  - `logging.file`
  - `logging.level`

Le format du fichier est un objet JSON par ligne.

L'onglet Journaux de l'interface de contrôle suit ce fichier via la passerelle (`logs.tail`).
Le CLI peut faire de même :

```bash
openclaw logs --follow
```

**Mode verbeux vs niveaux de journalisation**

- Les **journaux de fichiers** sont contrôlés exclusivement par `logging.level`.
- `--verbose` n'affecte que la **verbosité de la console** (et le style de journal WS) ; il n'augmente **pas**
  le niveau de journalisation du fichier.
- Pour capturer les détails en mode verbeux uniquement dans les journaux de fichiers, définissez `logging.level` sur `debug` ou
  `trace`.

## Capture de la console

Le CLI capture `console.log/info/warn/error/debug/trace` et les écrit dans les journaux de fichiers,
tout en continuant à imprimer sur stdout/stderr.

Vous pouvez régler indépendamment la verbosité de la console via :

- `logging.consoleLevel` (défaut `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Masquage du résumé de l'outil

Les résumés d'outils en mode verbeux (ex. `🛠️ Exec: ...`) peuvent masquer les jetons sensibles avant qu'ils n'atteignent le flux de la console. Ceci est **limité aux outils** et ne modifie pas les journaux de fichiers.

- `logging.redactSensitive` : `off` | `tools` (par défaut : `tools`)
- `logging.redactPatterns` : tableau de chaînes d'expressions régulières (remplace les valeurs par défaut)
  - Utilisez des chaînes d'expressions régulières brutes (`gi` automatique), ou `/pattern/flags` si vous avez besoin d'indicateurs personnalisés.
  - Les correspondances sont masquées en conservant les 6 premiers + 4 derniers caractères (longueur >= 18), sinon `***`.
  - Les valeurs par défaut couvrent les affectations de clés courantes, les indicateurs CLI, les champs JSON, les en-têtes bearer, les blocs PEM et les préfixes de jetons populaires.

## Journaux WebSocket Gateway

La passerelle imprime les journaux du protocole WebSocket dans deux modes :

- **Mode normal (pas de `--verbose`)** : seuls les résultats RPC « intéressants » sont imprimés :
  - erreurs (`ok=false`)
  - appels lents (seuil par défaut : `>= 50ms`)
  - erreurs d'analyse
- **Mode détaillé (`--verbose`)** : imprime tout le trafic de requête/réponse WS.

### Style de journal WS

`openclaw gateway` prend en charge un commutateur de style par passerelle :

- `--ws-log auto` (par défaut) : le mode normal est optimisé ; le mode détaillé utilise une sortie compacte
- `--ws-log compact` : sortie compacte (requête/réponse appariée) en mode détaillé
- `--ws-log full` : sortie complète par trame en mode détaillé
- `--compact` : alias pour `--ws-log compact`

Exemples :

```bash
# optimized (only errors/slow)
openclaw gateway

# show all WS traffic (paired)
openclaw gateway --verbose --ws-log compact

# show all WS traffic (full meta)
openclaw gateway --verbose --ws-log full
```

## Formatage de la console (journalisation du sous-système)

Le formateur de console est **sensible au TTY** et imprime des lignes préfixées cohérentes.
Les enregistreurs de sous-système gardent la sortie groupée et analysable.

Comportement :

- **Préfixes de sous-système** sur chaque ligne (par ex. `[gateway]`, `[canvas]`, `[tailscale]`)
- **Couleurs de sous-système** (stables par sous-système) plus coloration par niveau
- **Couleur lorsque la sortie est un TTY ou que l'environnement ressemble à un terminal riche** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respecte `NO_COLOR`
- **Préfixes de sous-système abrégés** : supprime les `gateway/` + `channels/` de début, conserve les 2 derniers segments (p. ex. `whatsapp/outbound`)
- **Sous-logger par sous-système** (préfixe automatique + champ structuré `{ subsystem }`)
- **`logRaw()`** pour la sortie QR/UX (pas de préfixe, pas de formatage)
- **Styles de console** (p. ex. `pretty | compact | json`)
- **Niveau de log de la console** distinct du niveau de log des fichiers (le fichier conserve tous les détails quand `logging.level` est réglé sur `debug`/`trace`)
- **Les corps de messages WhatsApp** sont enregistrés au niveau `debug` (utilisez `--verbose` pour les voir)

Cela permet de garder les fichiers de journaux existants stables tout en rendant la sortie interactive analysable.
