---
summary: "Fichiers journaux, sortie console, suivi CLI et l'onglet Logs de l'interface de contrôle"
read_when:
  - You need a beginner-friendly overview of OpenClaw logging
  - You want to configure log levels, formats, or redaction
  - You are troubleshooting and need to find logs quickly
title: "Journalisation"
---

OpenClaw dispose de deux surfaces principales de journalisation :

- **Fichiers journaux** (lignes JSON) écrits par le Gateway.
- **Sortie console** affichée dans les terminaux et l'interface de débogage du Gateway.

L'onglet **Journaux** de l'interface de contrôle suit le fichier journal de la passerelle. Cette page explique où se trouvent les journaux, comment les lire et comment configurer les niveaux et formats de journalisation.

## Emplacement des journaux

Par défaut, le Gateway écrit un fichier journal rotatif sous :

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

La date utilise le fuseau horaire local de l'hôte de la passerelle.

Chaque fichier effectue une rotation lorsqu'il atteint `logging.maxFileBytes` (par défaut : 100 Mo).
OpenClaw conserve jusqu'à cinq archives numérotées à côté du fichier actif, telles que
`openclaw-YYYY-MM-DD.1.log`, et continue d'écrire dans un nouveau fichier journal actif au lieu de
supprimer les diagnostics.

Vous pouvez remplacer cela dans `~/.openclaw/openclaw.json` :

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## Lire les journaux

### CLI : suivi en direct (recommandé)

Utilisez la CLI pour suivre le fichier journal de la passerelle via RPC :

```bash
openclaw logs --follow
```

Options actuelles utiles :

- `--local-time` : afficher les horodatages dans votre fuseau horaire local
- `--url <url>` / `--token <token>` / `--timeout <ms>` : indicateurs standard Gateway RPC
- `--expect-final` : indicateur d'attente de réponse finale RPC pris en charge par l'agent (accepté ici via la couche client partagée)

Modes de sortie :

- **Sessions TTY** : lignes de journalisation structurées, colorées et jolies.
- **Sessions non-TTY** : texte brut.
- `--json` : JSON délimité par des lignes (un événement de journal par ligne).
- `--plain` : forcer le texte brut dans les sessions TTY.
- `--no-color` : désactiver les couleurs ANSI.

Lorsque vous passez une `--url` explicite, la CLI n'applique pas automatiquement la configuration ou les informations d'identification de l'environnement ; incluez `--token` vous-même si le Gateway cible nécessite une authentification.

En mode JSON, la CLI émet des objets balisés `type` :

- `meta` : métadonnées du flux (fichier, curseur, taille)
- `log` : entrée de journal analysée
- `notice` : indicateurs de troncation / rotation
- `raw` : ligne de journal non analysée

Si le Gateway de boucle locale implicite demande un jumelage, se ferme pendant la connexion,
ou expire avant que `logs.tail` ne réponde, `openclaw logs` revient automatiquement au
journal de fichiers du Gateway configuré. Les cibles `--url` explicites n'utilisent pas
ce repli. `openclaw logs --follow` est plus strict : sur Linux, il utilise le journal du
Gateway utilisateur-systemd actif par PID lorsqu'il est disponible, et sinon continue à réessayer
le Gateway en direct au lieu de suivre un fichier potentiellement obsolète côte à côte.

Si le Gateway est inaccessible, la CLI imprime un court indice pour exécuter :

```bash
openclaw doctor
```

### Interface utilisateur de contrôle (web)

L'onglet **Journaux** (Logs) de l'interface de contrôle fait le suivi (tail) du même fichier en utilisant `logs.tail`.
Voir [Control UI](/fr/web/control-ui) pour savoir comment l'ouvrir.

### Journaux canal uniquement

To filter channel activity (WhatsApp/Telegram/etc), use:

```bash
openclaw channels logs --channel whatsapp
```

## Log formats

### File logs (JSONL)

Each line in the log file is a JSON object. The CLI and Control UI parse these
entries to render structured output (time, level, subsystem, message).

Les enregistrements JSONL des journaux de fichiers incluent également des champs de niveau supérieur filtrables par machine lorsque disponible :

- `hostname` : nom d'hôte de la passerelle.
- `message` : texte de message de journal aplati pour la recherche en texte intégral.
- `agent_id` : id de l'agent actif lorsque l'appel de journal porte un contexte d'agent.
- `session_id` : id/clé de session active lorsque l'appel de journal porte un contexte de session.
- `channel` : channel actif lorsque l'appel de journal porte un contexte de channel.

OpenClaw préserve les arguments de journal structuré d'origine à côté de ces champs, afin que les analyseurs existants qui lisent les clés d'argument tslog numérotés continuent de fonctionner.

Les activités Talk, voix en temps réel et salle gérée émettent des enregistrements de journal de cycle de vie limités via ce même pipeline de journalisation de fichiers. Ces enregistrements incluent le type d'événement, le mode, le transport, le fournisseur et les mesures de taille/chronologie lorsqu'elles sont disponibles, mais omettent le texte de la transcription, les charges utiles audio, les identifiants de tour, les identifiants d'appel et les identifiants d'élément du fournisseur.

### Sortie console

Les journaux de la console sont **conscients du TTY** et formatés pour la lisibilité :

- Préfixes de sous-système (ex. `gateway/channels/whatsapp`)
- Coloration par niveau (info/warn/error)
- Mode compact ou JSON facultatif

Le formatage de la console est contrôlé par `logging.consoleStyle`.

### Journaux WebSocket du Gateway

`openclaw gateway` possède également une journalisation de protocole WebSocket pour le trafic RPC :

- mode normal : uniquement les résultats intéressants (erreurs, erreurs d'analyse, appels lents)
- `--verbose` : tout le trafic demande/réponse
- `--ws-log auto|compact|full` : choisir le style de rendu verbeux
- `--compact` : alias pour `--ws-log compact`

Exemples :

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## Configuration de la journalisation

Toute la configuration de journalisation se trouve sous `logging` dans `~/.openclaw/openclaw.json`.

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": ["sk-.*"]
  }
}
```

### Niveaux de journal

- `logging.level` : niveau des **journaux de fichiers** (JSONL).
- `logging.consoleLevel` : niveau de verbosité de la **console**.

Vous pouvez remplacer les deux via la variable d'environnement **`OPENCLAW_LOG_LEVEL`** (par ex. `OPENCLAW_LOG_LEVEL=debug`). La variable d'environnement prend le pas sur le fichier de configuration, vous pouvez donc augmenter la verbosité pour une seule exécution sans modifier `openclaw.json`. Vous pouvez également passer l'option globale CLI **`--log-level <level>`** (par exemple, `openclaw --log-level debug gateway run`), qui remplace la variable d'environnement pour cette commande.

`--verbose` n'affecte que la sortie de la console et la verbosité des journaux WS ; cela ne modifie pas
les niveaux de journalisation des fichiers.

### Diagnostics de transport de modèle ciblés

Lors du débogage des appels de fournisseur, utilisez des indicateurs d'environnement ciblés au lieu d'augmenter
tous les journaux à `debug` :

```bash
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 openclaw gateway
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools OPENCLAW_DEBUG_SSE=events openclaw gateway
```

Indicateurs disponibles :

- `OPENCLAW_DEBUG_MODEL_TRANSPORT=1` : émettre le début de la requête, la réponse de récupération, les en-têtes
  SDK, le premier événement de flux, l'achèvement du flux et les erreurs de transport au
  niveau `info`.
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=summary` : inclure un résumé de la charge utile de la requête
  borné dans les journaux de requête de modèle.
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=tools` : inclure tous les noms d'outils orientés modèle dans
  le résumé de la charge utile.
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` : inclure un instantané de la charge utile JSON
  censuré et plafonné. À utiliser uniquement lors du débogage ; les secrets sont censurés mais les invites
  et le texte des messages peuvent encore être présents.
- `OPENCLAW_DEBUG_SSE=events` : émettre le chronométrage du premier événement et de l'achèvement du flux.
- `OPENCLAW_DEBUG_SSE=peek` : émettre également les cinq premières charges utiles d'événement SSE
  censurées, plafonnées par événement.
- `OPENCLAW_DEBUG_CODE_MODE=1` : émettre les diagnostics de surface modèle en mode code,
  y compris lorsque les outils natifs du fournisseur sont masqués car le mode code possède la
  surface de l'outil.

Ces indicateurs enregistrent via la journalisation normale OpenClaw, donc `openclaw logs --follow`
et l'onglet Journaux de l'interface de contrôle les affichent. Sans les indicateurs, les mêmes diagnostics
restent disponibles au niveau `debug`.

### Corrélation des traces

Les fichiers de journal sont au format JSONL. Lorsqu'un appel de journal transporte un contexte de trace de diagnostic valide, OpenClaw écrit les champs de trace en tant que clés JSON de premier niveau (OpenClaw`traceId`, `spanId`, `parentSpanId`, `traceFlags`) afin que les processeurs de journaux externes puissent corréler la ligne avec les spans OTEL et la propagation `traceparent` du provider.

Les requêtes HTTP du Gateway et les trames WebSocket du Gateway établissent une portée de trace de requête interne. Les journaux et les événements de diagnostic émis dans cette portée asynchrone héritent de la trace de requête lorsqu'ils ne transmettent pas explicitement un contexte de trace. Les traces d'exécution de l'agent et d'appel de modèle deviennent des enfants de la trace de requête active, de sorte que les journaux locaux, les instantanés de diagnostic, les spans OTEL et les en-têtes GatewayGateway`traceparent` de provider de confiance peuvent être joints par `traceId` sans journaliser le contenu brut de la requête ou du modèle.

Les enregistrements de journal du cycle de vie des conversations sont également acheminés vers les journaux OTLP lorsque l'exportation des journaux OpenTelemetry est activée, en utilisant les mêmes attributs bornés que les fichiers de journal.

### Taille et timing des appels de modèle

Les diagnostics des appels de modèle enregistrent des mesures de demande/réponse bornées sans capturer le contenu brut du prompt ou de la réponse :

- `requestPayloadBytes` : taille en octets UTF-8 de la charge utile finale de la requête du modèle
- `responseStreamBytes` : taille en octets UTF-8 des événements de réponse du modèle diffusés en continu
- `timeToFirstByteMs` : temps écoulé avant le premier événement de réponse diffusé en continu
- `durationMs` : durée totale de l'appel du modèle

Ces champs sont disponibles pour les instantanés de diagnostic, les hooks de plugin d'appel de modèle et les spans/métriques OTEL d'appel de modèle lorsque l'exportation des diagnostics est activée.

### Styles de console

`logging.consoleStyle` :

- `pretty` : convivial, coloré, avec horodatages.
- `compact` : sortie plus compacte (idéal pour les longues sessions).
- `json` : JSON par ligne (pour les processeurs de journaux).

### Masquage

OpenClaw peut masquer les jetons sensibles avant qu'ils n'atteignent la sortie console, les journaux de fichiers, les enregistrements de journaux OTLP, le texte de transcription de session persisté, ou les charges utiles d'événements d'outil de l'interface utilisateur de contrôle (arguments de début d'outil, charges utiles de résultats partiels/finaux, sortie d'exécution dérivée, et résumés de correctifs) :

- `logging.redactSensitive` : `off` | `tools` (par défaut : `tools`)
- `logging.redactPatterns` : liste de chaînes regex pour remplacer l'ensemble par défaut. Les modèles personnalisés s'appliquent par-dessus les valeurs par défaut intégrées pour les charges utiles d'outils de l'interface de contrôle, donc l'ajout d'un modèle n'affaiblit jamais la rédaction des valeurs déjà capturées par les valeurs par défaut.

Les journaux de fichiers et les transcriptions de session restent en JSONL, mais les valeurs secrètes correspondantes sont masquées avant que la ligne ou le message ne soit écrit sur le disque. Le masquage est de type « best-effort » (meilleur effort) : il s'applique au contenu des messages portant du texte et aux chaînes de journal, et non à chaque identifiant ou champ de charge utile binaire.

Les valeurs par défaut intégrées couvrent les informations d'identification API courantes et les noms de champs d'informations d'identification de paiement tels que le numéro de carte, CVC/CVV, le jeton de paiement partagé, et l'information d'identification de paiement lorsqu'ils apparaissent comme des champs JSON, des paramètres d'URL, des drapeaux CLI, ou des affectations.

`logging.redactSensitive: "off"`OpenClaw désactive uniquement cette stratégie générale de journalisation/de transcription. OpenClaw masque toujours les charges utiles délimitées par la sécurité qui peuvent être affichées aux clients de l'interface utilisateur, aux bundles de support, aux observateurs de diagnostics, aux invites d'approbation ou aux outils d'agent. Les exemples incluent les événements d'appel d'outil de l'interface utilisateur de contrôle, la sortie `sessions_history`Gateway, les exportations de support de diagnostic, les observations d'erreur du fournisseur, l'affichage des commandes d'approbation exec et les journaux de protocole WebSocket du Gateway. Un `logging.redactPatterns` personnalisé peut toujours ajouter des modèles spécifiques au projet sur ces surfaces.

## Diagnostics et OpenTelemetry

Les diagnostics sont des événements structurés et lisibles par machine pour les exécutions de modèle et la télémétrie du flux de messages (webhooks, mise en file d'attente, état de session). Ils ne remplacent **pas** les journaux — ils alimentent les métriques, les traces et les exportateurs. Les événements sont émis en cours de processus que vous les exportiez ou non.

Deux surfaces adjacentes :

- **Export OpenTelemetry** — envoyer des métriques, des traces et des journaux via OTLP/HTTP vers
  n'importe quel collecteur ou backend compatible OpenTelemetry (Grafana, Datadog,
  Honeycomb, New Relic, Tempo, etc.). La configuration complète, le catalogue de signaux,
  les noms de métriques/spans, les env vars et le modèle de confidentialité se trouvent sur une page dédiée :
  [Export OpenTelemetry](/fr/gateway/opentelemetry).
- **Indicateurs de diagnostic** — indicateurs de journal de débogage ciblés qui acheminent des journaux supplémentaires vers
  `logging.file` sans augmenter `logging.level`. Les indicateurs ne sont pas sensibles à la casse
  et prennent en charge les caractères génériques (`telegram.*`, `*`). Configurez sous `diagnostics.flags`
  ou via le remplacement d'env `OPENCLAW_DIAGNOSTICS=...`. Guide complet :
  [Indicateurs de diagnostic](/fr/diagnostics/flags).

Pour activer les événements de diagnostic pour les plugins ou les récepteurs personnalisés sans exportation OTLP :

```json5
{
  diagnostics: { enabled: true },
}
```

Pour l'export OTLP vers un collecteur, voir [Export OpenTelemetry](/fr/gateway/opentelemetry).

## Conseils de dépannage

- **Gateway inaccessible ?** Exécutez d'abord Gateway`openclaw doctor`.
- **Journaux vides ?** Vérifiez que le Gateway est en cours d'exécution et écrit dans le chemin de fichier
  dans Gateway`logging.file`.
- **Besoin de plus de détails ?** Définissez `logging.level` sur `debug` ou `trace` et réessayez.

## Connexes

- [Export OpenTelemetry](/fr/gateway/opentelemetry) — export OTLP/HTTP, catalogue de métriques/spans, modèle de confidentialité
- [Indicateurs de diagnostic](/fr/diagnostics/flags) — indicateurs de journal de débogage ciblés
- [Fonctionnement interne de la journalisation du Gateway](Gateway/en/gateway/logging) — styles de journaux WS, préfixes de sous-système et capture de console
- [Référence de configuration](/fr/gateway/configuration-reference#diagnostics) — référence complète du champ `diagnostics.*`
