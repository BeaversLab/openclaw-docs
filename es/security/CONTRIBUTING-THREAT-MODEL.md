---
title: "Contributing to the Threat Model"
summary: "How to contribute to the OpenClaw threat model"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

# Contributing to the OpenClaw Threat Model

Thanks for helping make OpenClaw more secure. This threat model is a living document and we welcome contributions from anyone - you don't need to be a security expert.

## Ways to Contribute

### Add a Threat

Spotted an attack vector or risk we haven't covered? Open an issue on [openclaw/trust](https://github.com/openclaw/trust/issues) and describe it in your own words. You don't need to know any frameworks or fill in every field - just describe the scenario.

**Helpful to include (but not required):**

- The attack scenario and how it could be exploited
- Which parts of OpenClaw are affected (CLI, gateway, channels, ClawHub, MCP servers, etc.)
- How severe you think it is (low / medium / high / critical)
- Any links to related research, CVEs, or real-world examples

We'll handle the ATLAS mapping, threat IDs, and risk assessment during review. If you want to include those details, great - but it's not expected.

> **This is for adding to the threat model, not reporting live vulnerabilities.** If you've found an exploitable vulnerability, see our [Trust page](https://trust.openclaw.ai) for responsible disclosure instructions.

### Suggest a Mitigation

Have an idea for how to address an existing threat? Open an issue or PR referencing the threat. Useful mitigations are specific and actionable - for example, "per-sender rate limiting of 10 messages/minute at the gateway" is better than "implement rate limiting."

### Propose an Attack Chain

Attack chains show how multiple threats combine into a realistic attack scenario. If you see a dangerous combination, describe the steps and how an attacker would chain them together. A short narrative of how the attack unfolds in practice is more valuable than a formal template.

### Fix or Improve Existing Content

Typos, clarifications, outdated info, better examples - PRs welcome, no issue needed.

## What We Use

### MITRE ATLAS

Este modelo de amenazas se basa en [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems), un marco diseñado específicamente para amenazas de IA/ML como la inyección de prompts, el uso indebido de herramientas y la explotación de agentes. No necesitas conocer ATLAS para contribuir - nosotros mapeamos las envíos al marco durante la revisión.

### IDs de Amenazas

Cada amenaza obtiene un ID como `T-EXEC-003`. Las categorías son:

| Código    | Categoría                                   |
| ------- | ------------------------------------------ |
| RECON   | Reconocimiento - recopilación de información     |
| ACCESS  | Acceso inicial - obtener entrada             |
| EXEC    | Ejecución - ejecutar acciones maliciosas      |
| PERSIST | Persistencia - mantener el acceso           |
| EVADE   | Evasión de defensa - evitar la detección       |
| DISC    | Descubrimiento - aprender sobre el entorno |
| EXFIL   | Exfiltración - robo de datos               |
| IMPACT  | Impacto - daño o interrupción              |

Los IDs son asignados por los mantenedores durante la revisión. No necesitas elegir uno.

### Niveles de Riesgo

| Nivel        | Significado                                                           |
| ------------ | ----------------------------------------------------------------- |
| **Crítico** | Compromiso total del sistema, o alta probabilidad + impacto crítico      |
| **Alto**     | Daños significativos probables, o probabilidad media + impacto crítico |
| **Medio**   | Riesgo moderado, o baja probabilidad + impacto alto                    |
| **Bajo**      | Poco probable y de impacto limitado                                       |

Si no estás seguro del nivel de riesgo, simplemente describe el impacto y lo evaluaremos.

## Proceso de Revisión

1. **Triaje** - Revisamos los nuevos envíos dentro de las 48 horas
2. **Evaluación** - Verificamos la viabilidad, asignamos el mapeo ATLAS y el ID de amenaza, validamos el nivel de riesgo
3. **Documentación** - Nos aseguramos de que todo esté formateado y completo
4. Fusión** - Se añade al modelo de amenazas y la visualización

## Recursos

- [Sitio web de ATLAS](https://atlas.mitre.org/)
- [Técnicas de ATLAS](https://atlas.mitre.org/techniques/)
- [Estudios de caso de ATLAS](https://atlas.mitre.org/studies/)
- [Modelo de amenazas OpenClaw](/es/security/THREAT-MODEL-ATLAS)

## Contacto

- **Vulnerabilidades de seguridad:** Consulta nuestra [página de Trust](https://trust.openclaw.ai) para obtener instrucciones de reporte
- **Preguntas sobre el modelo de amenazas:** Abre un issue en [openclaw/trust](https://github.com/openclaw/trust/issues)
- **Chat general:** Canal #security de Discord

## Reconocimiento

Los colaboradores del modelo de amenazas son reconocidos en los agradecimientos del modelo de amenazas, las notas de la versión y el salón de la fama de seguridad de OpenClaw por contribuciones significativas.

import en from "/components/footer/en.mdx";

<en />
