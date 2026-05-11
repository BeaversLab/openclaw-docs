---
summary: "Surfaces de journalisation, journaux de fichiers, styles de journaux WS et formatage de la console"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Journalisation du Gateway"
---

# Journalisation

Pour une vue d'ensemble destinée à l'utilisateur (CLI + Interface de contrôle + configuration), voir [/logging](/fr/logging).

OpenClaw possède deux « surfaces » de journalisation :

- **Sortie console** (ce que vous voyez dans le terminal / Interface de débogage).
- **Journaux de fichiers** (lignes JSON) écrits par le journalier de la passerelle.

## Journalier basé sur fichiers

- Le fichier journal à rotation par défaut se trouve sous `/tmp/openclaw/` (un fichier par jour) : `openclaw-YYYY-MM-DD.log`
  - La date utilise le fuseau horaire local de l'hôte de la passerelle.
- Les fichiers journaux actifs sont remplacés à `logging.maxFileBytes` (par défaut : 100 Mo), en conservant
  jusqu'à cinq archives numérotées et en continuant à écrire dans un nouveau fichier actif.
- Le chemin du fichier journal et le niveau peuvent être configurés via `~/.openclaw/openclaw.json` :
  - `logging.file`
  - `logging.level`

Le format du fichier est un objet JSON par ligne.

L'onglet Logs de l'interface de contrôle suit ce fichier via le gateway (`logs.tail`).
Le CLI peut faire de même :

```bash
openclaw logs --follow
```

**Mode détaillé vs niveaux de journalisation**

- **Les journaux fichiers** sont contrôlés exclusivement par `logging.level`.
- `--verbose` n'affecte que la **verbosité de la console** (et le style de journal WS) ; il n'augmente **pas**
  le niveau de journalisation du fichier.
- Pour capturer les détails uniquement en mode détaillé dans les journaux fichiers, définissez `logging.level` sur `debug` ou
  `trace`.

## Capture de la console

Le CLI capture `console.log/info/warn/error/debug/trace` et les écrit dans les journaux fichiers,
tout en continuant à imprimer sur stdout/stderr.

Vous pouvez régler la verbosité de la console indépendamment via :

- `logging.consoleLevel` (par défaut `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Masquage

OpenClaw peut masquer les jetons sensibles avant que la sortie du journal ou de la transcription ne quitte le
processus. La même politique de masquage est appliquée à la console, au journal fichier, à l'enregistrement de journal OTLP
et aux sinks de texte de transcription de session, de sorte que les valeurs secrètes correspondantes sont
masquées avant que les lignes JSONL ou les messages ne soient écrits sur le disque.

- `logging.redactSensitive` : `off` | `tools` (par défaut : `tools`)
- `logging.redactPatterns` : tableau de chaînes regex (remplace les valeurs par défaut)
  - Utilisez des chaînes regex brutes (auto `gi`) ou `/pattern/flags` si vous avez besoin de drapeaux personnalisés.
  - Les correspondances sont masquées en conservant les 6 premiers + les 4 derniers caractères (longueur >= 18), sinon `***`.
  - Les valeurs par défaut couvrent les affectations de clés courantes, les indicateurs CLI, les champs JSON, les en-têtes bearer, les blocs PEM et les préfixes de jetons populaires.

## Journaux Gateway WebSocket

La passerelle imprime les journaux du protocole WebSocket dans deux modes :

- **Mode normal (sans `--verbose`)** : seuls les résultats RPC « intéressants » sont imprimés :
  - erreurs (`ok=false`)
  - appels lents (seuil par défaut : `>= 50ms`)
  - erreurs d'analyse
- **Mode détaillé (`--verbose`)** : imprime tout le trafic de requête/réponse WS.

### Style de journal WS

`openclaw gateway` prend en charge un commutateur de style par passerelle :

- `--ws-log auto` (par défaut) : le mode normal est optimisé ; le mode détaillé utilise une sortie compacte
- `--ws-log compact` : sortie compacte (requête/réponse couplée) en mode détaillé
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

Le formateur de console est **sensible au TTY** et imprime des lignes cohérentes et préfixées.
Les journaux de sous-système gardent la sortie groupée et lisible.

Comportement :

- **Préfixes de sous-système** sur chaque ligne (par ex. `[gateway]`, `[canvas]`, `[tailscale]`)
- **Couleurs de sous-système** (stables par sous-système) plus coloration par niveau
- **Couleur lorsque la sortie est un TTY ou que l'environnement ressemble à un terminal riche** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respecte `NO_COLOR`
- **Préfixes de sous-système raccourcis** : supprime le `gateway/` + `channels/` de tête, garde les 2 derniers segments (par ex. `whatsapp/outbound`)
- **Sous-journaliseurs par sous-système** (préfixe automatique + champ structuré `{ subsystem }`)
- **`logRaw()`** pour la sortie QR/UX (pas de préfixe, pas de formatage)
- **Styles de console** (par ex. `pretty | compact | json`)
- **Niveau de journal de la console** distinct du niveau de journal fichier (le fichier conserve tous les détails lorsque `logging.level` est défini sur `debug`/`trace`)
- **Les corps de message WhatsApp** sont journalisés au niveau `debug` (utilisez `--verbose` pour les voir)

Cela permet de garder les journaux de fichiers existants stables tout en rendant la sortie interactive analysable.

## Connexes

- [Journalisation](/fr/logging)
- [Export OpenTelemetry](/fr/gateway/opentelemetry)
- [Export des diagnostics](/fr/gateway/diagnostics)
