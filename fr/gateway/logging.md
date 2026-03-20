---
summary: "Surfaces de journalisation, journaux fichiers, styles de journaux WS et formatage de la console"
read_when:
  - Modification de la sortie ou des formats de journalisation
  - Débogage de la sortie CLI ou de la passerelle
title: "Logging"
---

# Journalisation

Pour une vue d'ensemble orientée utilisateur (CLI + Interface de contrôle + configuration), voir [/logging](/fr/logging).

OpenClaw dispose de deux « surfaces » de journalisation :

- **Sortie console** (ce que vous voyez dans le terminal / Interface de débogage).
- **Journaux fichiers** (lignes JSON) écrits par le journalisateur de la passerelle.

## Journalisateur basé sur fichiers

- Le fichier journal rotatif par défaut se trouve sous `/tmp/openclaw/` (un fichier par jour) : `openclaw-YYYY-MM-DD.log`
  - La date utilise le fuseau horaire local de l'hôte de la passerelle.
- Le chemin et le niveau du fichier journal peuvent être configurés via `~/.openclaw/openclaw.json` :
  - `logging.file`
  - `logging.level`

Le format du fichier est un objet JSON par ligne.

L'onglet Journaux de l'Interface de contrôle suit ce fichier via la passerelle (`logs.tail`).
Le CLI peut faire de même :

```bash
openclaw logs --follow
```

**Mode verbeux vs niveaux de journalisation**

- Les **journaux fichiers** sont contrôlés exclusivement par `logging.level`.
- `--verbose` affecte uniquement la **verbosité de la console** (et le style de journal WS) ; il n'augmente **pas** le niveau de journalisation des fichiers.
- Pour capturer les détails uniquement en mode verbeux dans les journaux fichiers, définissez `logging.level` sur `debug` ou `trace`.

## Capture console

Le CLI capture `console.log/info/warn/error/debug/trace` et les écrit dans les journaux fichiers,
tout en continuant à imprimer sur stdout/stderr.

Vous pouvez régler indépendamment la verbosité de la console via :

- `logging.consoleLevel` (par défaut `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Masquage du résumé des outils

Les résumés d'outils verbeux (par exemple `🛠️ Exec: ...`) peuvent masquer les jetons sensibles avant qu'ils n'atteignent le flux de la console. Ceci est **uniquement pour les outils** et ne modifie pas les journaux fichiers.

- `logging.redactSensitive` : `off` | `tools` (par défaut : `tools`)
- `logging.redactPatterns` : tableau de chaînes d'expressions rationnelles (remplace les valeurs par défaut)
  - Utilisez des chaînes d'expressions régulières brutes (auto `gi`), ou `/pattern/flags` si vous avez besoin d'indicateurs personnalisés.
  - Les correspondances sont masquées en conservant les 6 premiers + 4 derniers caractères (longueur >= 18), sinon `***`.
  - Les valeurs par défaut couvrent les affectations de clés courantes, les indicateurs CLI, les champs JSON, les en-têtes bearer, les blocs PEM et les préfixes de jetons populaires.

## Journaux WebSocket Gateway

Le Gateway imprime les journaux de protocole WebSocket en deux modes :

- **Mode normal (pas de `--verbose`)** : seuls les résultats RPC « intéressants » sont imprimés :
  - erreurs (`ok=false`)
  - appels lents (seuil par défaut : `>= 50ms`)
  - erreurs d'analyse
- **Mode verbeux (`--verbose`)** : imprime tout le trafic de requête/réponse WS.

### Style de journal WS

`openclaw gateway` prend en charge un commutateur de style par passerelle :

- `--ws-log auto` (par défaut) : le mode normal est optimisé ; le mode verbeux utilise une sortie compacte
- `--ws-log compact` : sortie compacte (requête/réponse couplée) en mode verbeux
- `--ws-log full` : sortie complète par trame en mode verbeux
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

Le formateur de console est **conscient du TTY** et imprime des lignes cohérentes et préfixées.
Les enregistreurs de sous-système maintiennent la sortie groupée et analysable.

Comportement :

- **Préfixes de sous-système** sur chaque ligne (par exemple `[gateway]`, `[canvas]`, `[tailscale]`)
- **Couleurs de sous-système** (stables par sous-système) plus coloration par niveau
- **Couleur lorsque la sortie est un TTY ou que l'environnement ressemble à un terminal riche** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respecte `NO_COLOR`
- **Préfixes de sous-système raccourcis** : supprime le `gateway/` + `channels/` de tête, conserve les 2 derniers segments (par exemple `whatsapp/outbound`)
- **Sous-enregistreurs par sous-système** (préfixe auto + champ structuré `{ subsystem }`)
- **`logRaw()`** pour la sortie QR/UX (pas de préfixe, pas de formatage)
- **Styles de console** (par exemple `pretty | compact | json`)
- **Niveau de journalisation de la console** distinct du niveau de journalisation des fichiers (le fichier conserve tous les détails lorsque `logging.level` est défini sur `debug`/`trace`)
- **Corps de messages WhatsApp** sont enregistrés au niveau `debug` (utilisez `--verbose` pour les voir)

Cela permet de garder les fichiers de journalisation existants stables tout en rendant la sortie interactive facile à parcourir.

import en from "/components/footer/en.mdx";

<en />
