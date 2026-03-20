---
summary: "Persistance des permissions macOS (TCC) et exigences de signature"
read_when:
  - Débogage des invites de permission macOS manquantes ou bloquées
  - Empaquetage ou signature de l'application macOS
  - Modification des identifiants de bundle ou des chemins d'installation des applications
title: "Permissions macOS"
---

# Permissions macOS (TCC)

Les autorisations de permission macOS sont fragiles. TCC associe une autorisation de permission à la
signature de code de l'application, à l'identificateur de bundle et au chemin sur le disque. Si l'un de ces éléments change,
macOS considère l'application comme nouvelle et peut supprimer ou masquer les invites.

## Exigences pour des permissions stables

- Même chemin : exécutez l'application à partir d'un emplacement fixe (pour OpenClaw, `dist/OpenClaw.app`).
- Même identificateur de bundle : changer l'ID de bundle crée une nouvelle identité de permission.
- Application signée : les versions non signées ou signées ad-hoc ne conservent pas les permissions.
- Signature cohérente : utilisez un véritable certificat de développement Apple ou d'ID de développeur
  afin que la signature reste stable d'une reconstruction à l'autre.

Les signatures ad-hoc génèrent une nouvelle identité à chaque build. macOS oubliera les autorisations
précédentes, et les invites peuvent disparaître entièrement jusqu'à ce que les entrées obsolètes soient effacées.

## Liste de contrôle de récupération lorsque les invites disparaissent

1. Quittez l'application.
2. Supprimez l'entrée de l'application dans Réglages système -> Confidentialité et sécurité.
3. Relancez l'application à partir du même chemin et accordez à nouveau les permissions.
4. Si l'invite n'apparaît toujours pas, réinitialisez les entrées TCC avec `tccutil` et réessayez.
5. Certaines permissions ne réapparaissent qu'après un redémarrage complet de macOS.

Exemples de réinitialisations (remplacez l'ID de bundle si nécessaire) :

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## Permissions des fichiers et dossiers (Bureau/Documents/Téléchargements)

macOS peut également restreindre l'accès au Bureau, aux Documents et aux Téléchargements pour les processus de terminal/arrière-plan. Si la lecture de fichiers ou les listages de répertoires bloquent, accordez l'accès au même contexte de processus qui effectue les opérations sur les fichiers (par exemple Terminal/iTerm, application lancée par LaunchAgent ou processus SSH).

Solution de contournement : déplacez les fichiers dans l'espace de travail OpenClaw (`~/.openclaw/workspace`) si vous souhaitez éviter d'accorder des permissions par dossier.

Si vous testez des permissions, signez toujours avec un vrai certificat. Les builds ad-hoc
ne sont acceptables que pour des exécutions locales rapides où les permissions n'ont pas d'importance.

import en from "/components/footer/en.mdx";

<en />
