---
summary: "GatewayCréer des bundles de diagnostics Gateway partageables pour les rapports de bugs"
title: "Exportation des diagnostics"
read_when:
  - Preparing a bug report or support request
  - Debugging Gateway crashes, restarts, memory pressure, or oversized payloads
  - Reviewing what diagnostics data is recorded or redacted
---

OpenClaw peut créer un fichier zip de diagnostic local pour les rapports de bugs. Il combine
l'état nettoyé du Gateway, la santé, les journaux, la forme de la configuration et les événements
récents de stabilité sans charge utile.

Traitez les bundles de diagnostic comme des secrets jusqu'à ce que vous les ayez examinés. Ils sont
conçus pour omettre ou masquer les charges utiles et les identifiants, mais ils résument
tout de même les journaux locaux du Gateway et l'état d'exécution au niveau de l'hôte.

## Quick start

```bash
openclaw gateway diagnostics export
```

La commande affiche le chemin du zip écrit. Pour choisir un chemin :

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

Pour l'automatisation :

```bash
openclaw gateway diagnostics export --json
```

## Commande de chat

Les propriétaires peuvent utiliser `/diagnostics [note]`Gateway dans le chat pour demander un export local du Gateway.
Utilisez ceci lorsque le bug s'est produit dans une conversation réelle et que vous souhaitez un
rapport copier-coller pour le support :

1. Envoyez `/diagnostics` dans la conversation où vous avez remarqué le problème. Ajoutez une
   courte note si cela aide, par exemple `/diagnostics bad tool choice`.
2. OpenClaw envoie le préambule des diagnostics et demande une approbation explicite de l'exécution.
   L'approbation exécute OpenClaw`openclaw gateway diagnostics export --json`.
   N'approuvez pas les diagnostics via une règle autorisant tout.
3. Après approbation, OpenClaw répond avec un rapport copiable contenant le chemin
   local du bundle, le résumé du manifeste, les notes de confidentialité et les identifiants de session pertinents.

Dans les chats de groupe, un propriétaire peut toujours exécuter `/diagnostics`OpenClawGatewayOpenClaw, mais OpenClaw ne
publie pas les détails de diagnostic dans le chat partagé. Il envoie le préambule,
les invites d'approbation, le résultat de l'export Gateway et la répartition session/fil Codex
au propriétaire via la route d'approbation privée. Le groupe reçoit uniquement une courte notification
indiquant que le flux de diagnostics a été envoyé en privé. Si OpenClaw ne trouve pas de route
privée vers le propriétaire, la commande échoue fermement et demande au propriétaire de l'exécuter depuis un DM.

Lorsque la session OpenClaw active utilise le harnais natif Codex d'OpenAI, la même approbation d'exécution couvre également un téléchargement de commentaires OpenAI pour les threads d'exécution Codex dont OpenClaw a connaissance. Ce téléchargement est distinct du zip local Gateway et n'apparaît que pour les sessions avec harnais Codex. Avant l'approbation, l'invite explique qu'approuver les diagnostics enverra également les commentaires Codex, mais elle ne répertorie pas les identifiants de session ou de thread Codex. Après l'approbation, la réponse du chat répertorie les channels, les identifiants de session OpenClaw, les identifiants de thread Codex et les commandes de reprise locales pour les threads qui ont été envoyés aux serveurs OpenAI. Si vous refusez ou ignorez l'approbation, OpenClaw n'exécute pas l'exportation, n'envoie pas de commentaires Codex et n'imprime pas les identifiants Codex.

Cela rend la boucle de débogage Codex courante courte : remarquer le mauvais comportement dans
Telegram, Discord ou un autre channel, exécuter TelegramDiscord`/diagnostics`, approuver une fois, partager
le rapport avec le support, puis exécuter la commande `codex resume <thread-id>` imprimée
localement si vous souhaitez inspecter vous-même le fil Codex natif. Voir
[Codex harness](/fr/plugins/codex-harness#inspect-codex-threads-locally) pour
ce workflow d'inspection.

## Contenu de l'export

Le zip inclut :

- `summary.md` : aperçu lisible par l'homme pour le support.
- `diagnostics.json` : résumé lisible par machine de la configuration, des journaux, du statut, de la santé,
  et des données de stabilité.
- `manifest.json` : métadonnées d'export et liste de fichiers.
- Forme de configuration nettoyée et détails de configuration non secrets.
- Résumés de journaux nettoyés et lignes de journal récentes expurgées.
- Instantanés de statut et de santé du Gateway au mieux.
- `stability/latest.json` : bundle de stabilité persistant le plus récent, si disponible.

L'export est utile même lorsque le Gateway est en mauvaise santé. Si le Gateway ne peut pas répondre aux demandes de statut ou de santé, les journaux locaux, la forme de la configuration et le dernier bundle de stabilité sont toujours collectés si disponibles.

## Modèle de confidentialité

Les diagnostics sont conçus pour être partageables. L'export conserve les données opérationnelles qui aident au débogage, telles que :

- noms des sous-systèmes, identifiants des plugins, identifiants des fournisseurs, identifiants des canaux et modes configurés
- codes d'état, durées, nombres d'octets, état de la file d'attente et lectures de la mémoire
- métadonnées de journal nettoyées et messages opérationnels expurgés
- structure de la configuration et paramètres de fonctionnalité non secrets

L'export omet ou expurge :

- texte de chat, invites, instructions, corps de webhook et résultats des outils
- informations d'identification, clés API, jetons, cookies et valeurs secrètes
- corps bruts des requêtes ou des réponses
- identifiants de compte, identifiants de message, identifiants de session bruts, noms d'hôte et noms d'utilisateur locaux

Lorsqu'un message de journal ressemble à du texte de charge utile utilisateur, de chat, d'invite ou d'outil,
l'export conserve uniquement le fait qu'un message a été omis et le nombre d'octets.

## Enregistreur de stabilité

Le Gateway enregistre par défaut un flux de stabilité limité et sans charge utile lorsque
les diagnostics sont activés. Il est destiné aux faits opérationnels, pas au contenu.

Le même heartbeat de diagnostic enregistre des échantillons de vivacité lorsque le Gateway continue
de fonctionner mais que la boucle d'événements Node.js ou le CPU semble saturé. Ces
événements `diagnostic.liveness.warning` incluent le délai de la boucle d'événements,
l'utilisation de la boucle d'événements, le rapport des cœurs CPU, les comptes de session actives/en attente/en file, la phase actuelle
de démarrage/exécution si connue, les durées de phase récentes, et des étiquettes de travail actives/en file délimitées. Les échantillons inactifs restent en télémétrie au niveau `info`. Les échantillons de vivacité
deviennent des avertissements Gateway uniquement lorsque du travail est en attente ou en file, ou lorsque le travail actif
chevauche un délai soutenu de la boucle d'événements. Les pics transitoires de délai maximum pendant
un travail d'arrière-plan sain restent dans les journaux de débogage. Ils ne redémarrent pas le
Gateway par eux-mêmes.

Les phases de démarrage émettent également des événements `diagnostic.phase.completed` avec le temps
d'horloge et le temps CPU. Les diagnostics de exécution intégrée bloquée marquent `terminalProgressStale=true`
lorsque le dernier progrès du pont semblait terminal, tel qu'un élément de réponse brut
ou un événement d'achèvement de réponse, mais que le Gateway considère toujours l'exécution intégrée
comme active.

Inspecter l'enregistreur en direct :

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

Inspecter le bundle de stabilité persisté le plus récent après une sortie fatale, un délai d'arrêt ou une échec de démarrage après redémarrage :

```bash
openclaw gateway stability --bundle latest
```

Créer un zip de diagnostics à partir du bundle persisté le plus récent :

```bash
openclaw gateway stability --bundle latest --export
```

Les lots persistés résident sous `~/.openclaw/logs/stability/` lorsque des événements existent.

## Options utiles

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

- `--output <path>` : écrire dans un chemin zip spécifique.
- `--log-lines <count>` : nombre maximum de lignes de journal nettoyées à inclure.
- `--log-bytes <bytes>` : nombre maximum d'octets de journal à inspecter.
- `--url <url>` : URL WebSocket Gateway pour les instantanés d'état et de santé.
- `--token <token>` : jeton Gateway pour les instantanés d'état et de santé.
- `--password <password>` : mot de passe Gateway pour les instantanés d'état et de santé.
- `--timeout <ms>` : délai d'attente de l'instantané d'état et de santé.
- `--no-stability-bundle` : ignorer la recherche de lot de stabilité persisté.
- `--json` : afficher les métadonnées d'exportation lisibles par machine.

## Désactiver les diagnostics

Les diagnostics sont activés par défaut. Pour désactiver l'enregistreur de stabilité et
la collecte d'événements de diagnostic :

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

La désactivation des diagnostics réduit les détails du rapport de bogue. Elle n'affecte pas la journalisation normale du Gateway.

Les instantanés critiques de pression mémoire sont désactivés par défaut. Pour conserver les événements
de diagnostic et également capturer l'instantané de stabilité pré-OOM :

```json5
{
  diagnostics: {
    memoryPressureSnapshot: true,
  },
}
```

Utilisez cette option uniquement sur les hôtes qui peuvent tolérer l'analyse supplémentaire du système de fichiers et l'écriture de l'instantané lors d'une pression critique sur la mémoire. Les événements normaux de pression sur la mémoire enregistrent toujours les faits RSS, tas, seuil et croissance lorsque l'instantané est désactivé.

## Connexes

- [Vérifications de santé](/fr/gateway/health)
- [Gateway CLI](/fr/cli/gateway#gateway-diagnostics-export)
- [Protocole Gateway](/fr/gateway/protocol#system-and-identity)
- [Journalisation](/fr/logging)
- [Export OpenTelemetry](/fr/gateway/opentelemetry) — flux distinct pour diffuser les diagnostics vers un collecteur
