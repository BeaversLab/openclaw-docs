---
summary: "Persistance des permissions macOS (TCC) et exigences de signature"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Packaging or signing the macOS app
  - Changing bundle IDs or app install paths
title: "Autorisations macOS"
---

# Autorisations macOS (TCC)

Les octroi d'autorisations macOS sont fragiles. TCC associe une autorisation à la signature
de code de l'application, à son identifiant de bundle et à son chemin sur le disque.
Si l'un de ces éléments change, macOS considère l'application comme nouvelle
et peut supprimer ou masquer les invites.

## Exigences pour des autorisations stables

- Même chemin : exécutez l'application depuis un emplacement fixe (pour OpenClaw, `dist/OpenClaw.app`).
- Même identifiant de bundle : changer l'identifiant de bundle crée une nouvelle identité d'autorisation.
- Application signée : les versions non signées ou signées ad-hoc ne conservent pas les autorisations.
- Signature cohérente : utilisez un véritable certificat Apple Development ou Developer ID
  afin que la signature reste stable lors des nouvelles compilations.

Les signatures ad-hoc génèrent une nouvelle identité à chaque compilation. macOS oubliera
les autorisations précédentes, et les invites peuvent disparaître entièrement jusqu'à ce
que les entrées obsolètes soient effacées.

## Liste de contrôle de récupération lorsque les invites disparaissent

1. Quittez l'application.
2. Supprimez l'entrée de l'application dans Réglages Système -> Confidentialité et sécurité.
3. Relancez l'application depuis le même chemin et accordez à nouveau les autorisations.
4. Si l'invite n'apparaît toujours pas, réinitialisez les entrées TCC avec `tccutil` et réessayez.
5. Certaines autorisations ne réapparaissent qu'après un redémarrage complet de macOS.

Exemples de réinitialisations (remplacez l'identifiant de bundle si nécessaire) :

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## Autorisations des fichiers et dossiers (Bureau/Documents/Téléchargements)

macOS peut également restreindre l'accès au Bureau, aux Documents et aux
Téléchargements pour les processus de terminal/arrière-plan. Si la lecture de fichiers
ou les listages de répertoires bloquent, accordez l'accès au même contexte de processus
qui effectue les opérations sur les fichiers (par exemple Terminal/iTerm, application
lancée par LaunchAgent, ou processus SSH).

Solution de contournement : déplacez les fichiers dans l'espace de travail OpenClaw (`~/.openclaw/workspace`)
si vous souhaitez éviter d'accorder des autorisations pour chaque dossier.

Si vous testez les autorisations, signez toujours avec un vrai certificat. Les builds ad-hoc ne sont acceptables que pour des exécutions locales rapides où les autorisations n'ont pas d'importance.
