---
summary: "Journalisation OpenClaw : journal de fichiers de diagnostics rotatifs + indicateurs de confidentialité du journal unifié"
read_when:
  - Capture des journaux macOS ou investigation de la journalisation des données privées
  - Débogage des problèmes de cycle de vie de réveil vocal/session
title: "Journalisation macOS"
---

# Journalisation (macOS)

## Journal de fichiers de diagnostics rotatifs (Panneau de débogage)

OpenClaw achemine les journaux de l'application macOS via swift-log (journalisation unifiée par défaut) et peut écrire un journal de fichiers rotatif local sur le disque lorsque vous avez besoin d'une capture durable.

- Verbosité : **Panneau de débogage → Journaux → Journalisation de l'application → Verbosité**
- Activer : **Panneau de débogage → Journaux → Journalisation de l'application → « Écrire le journal de diagnostics rotatif (JSONL) »**
- Emplacement : `~/Library/Logs/OpenClaw/diagnostics.jsonl` (effectue une rotation automatique ; les anciens fichiers sont suffixés avec `.1`, `.2`, …)
- Effacer : **Panneau de débogage → Journaux → Journalisation de l'application → « Effacer »**

Remarques :

- Ceci est **désactivé par défaut**. Activez-le uniquement lors d'un débogage actif.
- Traitez le fichier comme sensible ; ne le partagez pas sans vérification.

## Données privées de journalisation unifiée sur macOS

La journalisation unifiée censure la plupart des charges utiles, sauf si un sous-système active `privacy -off`. Selon l'article de Peter sur les macOS [tours de passe-passe de confidentialité de journalisation](https://steipete.me/posts/2025/logging-privacy-shenanigans) (2025), cela est contrôlé par un plist dans `/Library/Preferences/Logging/Subsystems/` indexé par le nom du sous-système. Seuls les nouveaux journaux prennent en compte l'indicateur, alors activez-le avant de reproduire un problème.

## Activer pour OpenClaw (`ai.openclaw`)

- Écrivez d'abord le plist dans un fichier temporaire, puis installez-le de manière atomique en tant que root :

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

- Aucun redémarrage n'est nécessaire ; logd détecte rapidement le fichier, mais seules les nouvelles lignes de journal incluront des charges utiles privées.
- Affichez la sortie plus riche avec l'assistant existant, par exemple `./scripts/clawlog.sh --category WebChat --last 5m`.

## Désactiver après le débogage

- Supprimez la substitution : `sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`.
- Exécutez facultativement `sudo log config --reload` pour forcer logd à abandonner immédiatement la substitution.
- Rappelez-vous que cette surface peut inclure des numéros de téléphone et des corps de messages ; ne conservez le plist en place que lorsque vous avez activement besoin du détail supplémentaire.

import en from "/components/footer/en.mdx";

<en />
