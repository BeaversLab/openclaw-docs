---
summary: "Surfaces de journalisation, journaux de fichiers, styles de journaux WS et formatage de la console"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "GatewayJournalisation du Gateway"
---

# Journalisation

Pour une vue d'ensemble orientée utilisateur (CLI + Interface de contrôle + configuration), consultez [/logging](CLI/en/logging).

OpenClaw possède deux "surfaces" de journalisation :

- **Sortie console** (ce que vous voyez dans le terminal / Interface de débogage).
- **Journaux de fichiers** (lignes JSON) écrits par le journalier de la passerelle.

Au démarrage, le Gateway journalise le modèle d'agent par défaut résolu ainsi que les
valeurs par défaut du mode qui affectent les nouvelles sessions, par exemple :

```text
agent model: openai/gpt-5.5 (thinking=medium, fast=on)
```

`thinking` provient de l'agent par défaut, des paramètres du modèle, ou de l'agent global par défaut ;
lorsqu'il n'est pas défini, le résumé de démarrage affiche `medium`. `fast` provient de
l'agent par défaut ou des paramètres `fastMode` du modèle.

## Journalisation basée sur les fichiers

- Le fichier journal avec rotation par défaut se trouve sous `/tmp/openclaw/` (un fichier par jour) : `openclaw-YYYY-MM-DD.log`
  - La date utilise le fuseau horaire local de l'hôte du gateway.
- Les fichiers journaux actifs tournent à `logging.maxFileBytes` (par défaut : 100 Mo), en conservant
  jusqu'à cinq archives numérotées et en continuant à écrire dans un nouveau fichier actif.
- Le chemin du fichier journal et le niveau peuvent être configurés via `~/.openclaw/openclaw.json` :
  - `logging.file`
  - `logging.level`

Le format de fichier est un objet JSON par ligne.

Les chemins de code Talk, voix en temps réel et salle gérée utilisent le journal de fichiers partagé pour
les enregistrements de cycle de vie limité. Ces enregistrements sont destinés au débogage opérationnel
et à l'exportation des journaux OTLP ; le texte de la transcription, les charges utiles audio, les identifiants de tour, les identifiants d'appel et
les identifiants d'élément de fournisseur ne sont pas copiés dans l'enregistrement du journal.

L'onglet Journaux de l'interface de contrôle suit ce fichier via le gateway (`logs.tail`CLI).
Le CLI peut faire de même :

```bash
openclaw logs --follow
```

**Mode verbeux vs niveaux de journalisation**

- Les **journaux de fichiers** sont contrôlés exclusivement par `logging.level`.
- `--verbose` affecte uniquement la **verbosité de la console** (et le style de journal WS) ; il n'augmente
  pas le niveau de journalisation du fichier.
- Pour capturer les détails en mode verbeux uniquement dans les journaux de fichiers, définissez `logging.level` sur `debug` ou
  `trace`.
- La journalisation de trace inclut également des résumés de synchronisation de diagnostic pour les chemins chauds sélectionnés,
  tels que la préparation de l'usine d'outils de plug-in. Voir
  [/tools/plugin#slow-plugin-tool-setup](/fr/tools/plugin#slow-plugin-tool-setup).

## Capture de la console

Le CLI capture `console.log/info/warn/error/debug/trace` et les écrit dans les journaux de fichiers,
tout en continuant à imprimer sur stdout/stderr.

Vous pouvez régler indépendamment la verbosité de la console via :

- `logging.consoleLevel` (par défaut `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Masquage

OpenClaw peut masquer les jetons sensibles avant que la sortie du journal ou de la transcription ne quitte le
processus. Cette stratégie de masquage de journalisation est appliquée à la console, au journal de fichiers, aux enregistrements de journal OTLP
et aux récepteurs de texte de transcription de session, de sorte que les valeurs secrètes correspondantes sont
masquées avant que les lignes JSONL ou les messages ne soient écrits sur le disque.

- `logging.redactSensitive` : `off` | `tools` (par défaut : `tools`)
- `logging.redactPatterns` : tableau de chaînes d'expression régulière (remplace les valeurs par défaut)
  - Utilisez des chaînes d'expression régulière brutes (`gi` automatique), ou `/pattern/flags` si vous avez besoin de indicateurs personnalisés.
  - Les correspondances sont masquées en conservant les 6 premiers + les 4 derniers caractères (longueur >= 18), sinon `***`.
  - Les valeurs par défaut couvrent les affectations de clés courantes, les indicateurs CLI, les champs JSON, les en-têtes bearer, les blocs PEM, les préfixes de jetons populaires et les noms de champs d'informations d'identification de paiement tels que le numéro de carte, CVC/CVV, le jeton de paiement partagé et l'information d'identification de paiement.

Certaines limites de sécurité masquent toujours, quelle que soit la valeur de `logging.redactSensitive`.
Cela inclut les événements d'appel d'outil de l'interface de contrôle, la sortie de l'outil `sessions_history`,
les exportations du support de diagnostic, les observations d'erreur de fournisseur, l'affichage des commandes d'approbation exec
et les journaux de protocole WebSocket du Gateway. Ces surfaces peuvent toujours utiliser
`logging.redactPatterns` comme modèles supplémentaires, mais `redactSensitive: "off"`
ne les fait pas émettre des secrets bruts.

## Journaux WebSocket du Gateway

La passerelle imprime les journaux de protocole WebSocket en deux modes :

- **Mode normal (sans `--verbose`RPC)** : seuls les résultats RPC « intéressants » sont imprimés :
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
Les sous-systèmes de journalisation maintiennent la sortie groupée et consultable.

Comportement :

- **Préfixes de sous-système** sur chaque ligne (par ex. `[gateway]`, `[canvas]`, `[tailscale]`)
- **Couleurs de sous-système** (stables par sous-système) plus coloration par niveau
- **Couleur lorsque la sortie est un TTY ou que l'environnement ressemble à un terminal riche** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respecte `NO_COLOR`
- **Préfixes de sous-système raccourcis** : supprime le `gateway/` de tête + `channels/`, conserve les 2 derniers segments (par ex. `whatsapp/outbound`)
- **Sous-journaliseurs par sous-système** (préfixe auto + champ structuré `{ subsystem }`)
- **`logRaw()`** pour la sortie QR/UX (pas de préfixe, pas de formatage)
- **Styles de console** (par ex. `pretty | compact | json`)
- **Niveau de journal de la console** distinct du niveau de journal du fichier (le fichier conserve tous les détails lorsque `logging.level` est réglé sur `debug`/`trace`)
- **Les corps de message WhatsApp** sont enregistrés au niveau `debug` (utilisez `--verbose` pour les voir)

Cela maintient les fichiers journaux existants stables tout en rendant la sortie interactive consultable.

## Connexes

- [Journalisation](/fr/logging)
- [Exportation OpenTelemetry](/fr/gateway/opentelemetry)
- [Exportation de diagnostics](/fr/gateway/diagnostics)
