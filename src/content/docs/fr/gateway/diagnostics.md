---
summary: "Créer des bundles de diagnostics Gateway partageables pour les rapports de bogues"
title: "Exportation des diagnostics"
read_when:
  - Preparing a bug report or support request
  - Debugging Gateway crashes, restarts, memory pressure, or oversized payloads
  - Reviewing what diagnostics data is recorded or redacted
---

OpenClaw peut créer un fichier zip de diagnostics local qu'il est sûr de joindre aux rapports de bogue. Il combine l'état Gateway nettoyé, la santé, les journaux, la forme de la configuration et les événements de stabilité récents sans charge utile.

## Quick start

```bash
openclaw gateway diagnostics export
```

La commande affiche le chemin du fichier zip écrit. Pour choisir un chemin :

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

Pour l'automatisation :

```bash
openclaw gateway diagnostics export --json
```

## Contenu de l'export

Le fichier zip comprend :

- `summary.md` : vue d'ensemble lisible par l'homme pour le support.
- `diagnostics.json` : résumé lisible par la machine de la configuration, des journaux, de l'état, de la santé
  et des données de stabilité.
- `manifest.json` : métadonnées d'export et liste de fichiers.
- Forme de la configuration nettoyée et détails de configuration non secrets.
- Résumés des journaux nettoyés et lignes de journal récentes expurgées.
- Instantanés de l'état et de la santé du Gateway, au mieux des capacités.
- `stability/latest.json` : bundle de stabilité persistant le plus récent, si disponible.

L'export est utile même lorsque le Gateway est en mauvaise santé. Si le Gateway ne peut
pas répondre aux requêtes d'état ou de santé, les journaux locaux, la forme de la configuration et le dernier
bundle de stabilité sont tout de même collectés si disponibles.

## Modèle de confidentialité

Les diagnostics sont conçus pour être partageables. L'export conserve les données opérationnelles
qui aident au débogage, telles que :

- noms de sous-systèmes, identifiants de plugins, identifiants de fournisseurs, identifiants de canal et modes configurés
- codes d'état, durées, comptes d'octets, état de la file d'attente et lectures de mémoire
- métadonnées de journal nettoyées et messages opérationnels expurgés
- forme de la configuration et paramètres de fonctionnalité non secrets

L'export omet ou expurge :

- texte de chat, invites, instructions, corps de webhook et sorties d'outils
- informations d'identification, clés API, jetons, cookies et valeurs secrètes
- corps de requête ou de réponse bruts
- identifiants de compte, identifiants de message, identifiants de session bruts, noms d'hôte et noms d'utilisateur locaux

Lorsqu'un message de journal ressemble à du texte de charge utile d'utilisateur, de chat, d'invite ou d'outil,
l'export conserve uniquement le fait qu'un message a été omis et le nombre d'octets.

## Enregistreur de stabilité

Le Gateway enregistre par défaut un flux de stabilité borné et sans charge utile lorsque
les diagnostics sont activés. Il est destiné aux faits opérationnels, pas au contenu.

Inspecter l'enregistreur en direct :

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

Inspecter le bundle de stabilité persisté le plus récent après une sortie fatale, une expiration du délai d'arrêt ou une échec de démarrage après redémarrage :

```bash
openclaw gateway stability --bundle latest
```

Créer un zip de diagnostic à partir du bundle persisté le plus récent :

```bash
openclaw gateway stability --bundle latest --export
```

Les bundles persistés se trouvent sous `~/.openclaw/logs/stability/` lorsque des événements existent.

## Options utiles

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

- `--output <path>` : écrire vers un chemin zip spécifique.
- `--log-lines <count>` : nombre maximum de lignes de journal assainies à inclure.
- `--log-bytes <bytes>` : nombre maximum d'octets de journal à inspecter.
- `--url <url>` : URL WebSocket du Gateway pour les instantanés d'état et de santé.
- `--token <token>` : jeton du Gateway pour les instantanés d'état et de santé.
- `--password <password>` : mot de passe du Gateway pour les instantanés d'état et de santé.
- `--timeout <ms>` : délai d'expiration de l'instantané d'état et de santé.
- `--no-stability-bundle` : ignorer la recherche du bundle de stabilité persisté.
- `--json` : afficher les métadonnées d'exportation lisibles par machine.

## Désactiver les diagnostics

Les diagnostics sont activés par défaut. Pour désactiver l'enregistreur de stabilité et la collecte d'événements de diagnostic :

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

La désactivation des diagnostics réduit les détails du rapport de bogue. Cela n'affecte pas la journalisation normale du Gateway.

## Connexes

- [Contrôles de santé](/fr/gateway/health)
- [Gateway CLI](/fr/cli/gateway#gateway-diagnostics-export)
- [Protocole du Gateway](/fr/gateway/protocol#system-and-identity)
- [Journalisation](/fr/logging)
- [Export OpenTelemetry](/fr/gateway/opentelemetry) — flux distinct pour diffuser les diagnostics vers un collecteur
