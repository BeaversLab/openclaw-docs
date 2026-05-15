---
summary: "Cómo contribuir al modelo de amenazas de OpenClaw"
title: "Contribuir al modelo de amenazas"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

Gracias por ayudar a hacer OpenClaw más seguro. Este modelo de amenazas es un documento vivo y agradecemos las contribuciones de cualquiera; no es necesario ser un experto en seguridad.

## Formas de contribuir

### Añadir una amenaza

¿Has detectado un vector de ataque o un riesgo que no hemos cubierto? Abre un problema en [openclaw/trust](https://github.com/openclaw/trust/issues) y descríbelo con tus propias palabras. No necesitas conocer ningún marco ni rellenar todos los campos; simplemente describe el escenario.

**Es útil incluir (pero no obligatorio):**

- El escenario de ataque y cómo se podría explotar
- Qué partes de OpenClaw se ven afectadas (CLI, puerta de enlace, canales, ClawHub, servidores MCP, etc.)
- Qué tan grave crees que es (baja / media / alta / crítica)
- Cualquier enlace a investigaciones relacionadas, CVEs o ejemplos del mundo real

Nos encargaremos de la asignación a ATLAS, los IDs de amenaza y la evaluación de riesgos durante la revisión. Si deseas incluir esos detalles, excelente, pero no se espera.

> **Esto es para añadir al modelo de amenazas, no para reportar vulnerabilidades activas.** Si has encontrado una vulnerabilidad explotable, consulta nuestra [página de Trust](https://trust.openclaw.ai) para obtener instrucciones de divulgación responsable.

### Sugerir una mitigación

¿Tienes una idea sobre cómo abordar una amenaza existente? Abre un problema o una PR que haga referencia a la amenaza. Las mitigaciones útiles son específicas y accionables; por ejemplo, "limitación de velocidad por remitente de 10 mensajes/minuto en la puerta de enlace" es mejor que "implementar limitación de velocidad".

### Proponer una cadena de ataque

Las cadenas de ataque muestran cómo múltiples amenazas se combinan en un escenario de ataque realista. Si ves una combinación peligrosa, describe los pasos y cómo un atacante los encadenaría. Una breve narrativa de cómo se desarrolla el ataque en la práctica es más valiosa que una plantilla formal.

### Corregir o mejorar el contenido existente

Errores tipográficos, aclaraciones, información desactualizada, mejores ejemplos: las PRs son bienvenidas, no es necesario abrir un problema.

## Lo que usamos

### Marco MITRE ATLAS

Este modelo de amenazas se basa en [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems), un marco diseñado específicamente para amenazas de IA/ML como la inyección de indicaciones (prompt injection), el uso indebido de herramientas y la explotación de agentes. No necesitas conocer ATLAS para contribuir; asignamos las envíos al marco durante la revisión.

### IDs de amenaza

Cada amenaza recibe un ID como `T-EXEC-003`. Las categorías son:

| Código  | Categoría                                    |
| ------- | -------------------------------------------- |
| RECON   | Reconocimiento - recopilación de información |
| ACCESS  | Acceso inicial - conseguir entrada           |
| EXEC    | Ejecución - ejecución de acciones maliciosas |
| PERSIST | Persistencia - mantenimiento del acceso      |
| EVADE   | Evasión de defensas - evitar la detección    |
| DISC    | Descubrimiento - aprender sobre el entorno   |
| EXFIL   | Exfiltración - robo de datos                 |
| IMPACT  | Impacto - daño o interrupción                |

Los identificadores (IDs) son asignados por los mantenedores durante la revisión. No necesitas elegir uno.

### Niveles de riesgo

| Nivel       | Significado                                                         |
| ----------- | ------------------------------------------------------------------- |
| **Crítico** | Compromiso total del sistema, o alta probabilidad + impacto crítico |
| **Alto**    | Daño significativo probable, o probabilidad media + impacto crítico |
| **Medio**   | Riesgo moderado, o baja probabilidad + impacto alto                 |
| **Bajo**    | Poco probable e impacto limitado                                    |

Si no estás seguro del nivel de riesgo, solo describe el impacto y nosotros lo evaluaremos.

## Proceso de revisión

1. **Triaje** - Revisamos los nuevos envíos dentro de las 48 horas
2. **Evaluación** - Verificamos la viabilidad, asignamos la correspondencia ATLAS y el ID de amenaza, validamos el nivel de riesgo
3. **Documentación** - Nos aseguramos de que todo esté formateado y completo
4. **Fusión (Merge)** - Se añade al modelo de amenazas y la visualización

## Recursos

- [Sitio web de ATLAS](https://atlas.mitre.org/)
- [Técnicas de ATLAS](https://atlas.mitre.org/techniques/)
- [Estudios de caso de ATLAS](https://atlas.mitre.org/studies/)
- [Modelo de amenazas de OpenClaw](/es/security/THREAT-MODEL-ATLAS)

## Contacto

- **Vulnerabilidades de seguridad:** Consulte nuestra [página de Confianza](https://trust.openclaw.ai) para obtener instrucciones de reporte
- **Preguntas sobre el modelo de amenazas:** Abra un issue en [openclaw/trust](https://github.com/openclaw/trust/issues)
- **Chat general:** Canal #security de Discord

## Reconocimiento

Los colaboradores del modelo de amenazas son reconocidos en los agradecimientos del modelo de amenazas, las notas de la versión y el salón de la fama de seguridad de OpenClaw por contribuciones significativas.

## Relacionado

- [Modelo de amenazas](/es/security/THREAT-MODEL-ATLAS)
- [Verificación formal](/es/security/formal-verification)
