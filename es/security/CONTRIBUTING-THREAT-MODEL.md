# Contribuir al modelo de amenazas de OpenClaw

Gracias por ayudar a hacer OpenClaw más seguro. Este modelo de amenazas es un documento vivo y agradecemos las contribuciones de cualquier persona; no es necesario ser un experto en seguridad.

## Formas de contribuir

### Añadir una amenaza

¿Has detectado un vector de ataque o un riesgo que no hemos cubierto? Abre un issue en [openclaw/trust](https://github.com/openclaw/trust/issues) y descríbelo con tus propias palabras. No es necesario que conozcas ningún marco de trabajo ni rellenar todos los campos; simplemente describe el escenario.

**Es útil incluir (pero no es obligatorio):**

- El escenario de ataque y cómo podría ser explotado
- Qué partes de OpenClaw se ven afectadas (CLI, puerta de enlace, canales, ClawHub, servidores MCP, etc.)
- Qué tan severo crees que es (baja / media / alta / crítica)
- Cualquier enlace a investigaciones relacionadas, CVEs o ejemplos del mundo real

Nos encargaremos de la asignación a ATLAS, los identificadores de amenaza y la evaluación de riesgos durante la revisión. Si deseas incluir esos detalles, estupendo, pero no se espera.

> **Esto es para añadir al modelo de amenazas, no para reportar vulnerabilidades en vivo.** Si has encontrado una vulnerabilidad explotable, consulta nuestra [página de Trust](https://trust.openclaw.ai) para obtener instrucciones sobre divulgación responsable.

### Sugerir una mitigación

¿Tienes una idea sobre cómo abordar una amenaza existente? Abre un issue o una PR haciendo referencia a la amenaza. Las mitigaciones útiles son específicas y accionables; por ejemplo, "limitación de velocidad por remitente de 10 mensajes/minuto en la puerta de enlace" es mejor que "implementar limitación de velocidad".

### Proponer una cadena de ataque

Las cadenas de ataque muestran cómo múltiples amenazas se combinan en un escenario de ataque realista. Si ves una combinación peligrosa, describe los pasos y cómo un atacante los encadenaría. Una breve narración de cómo se desarrolla el ataque en la práctica es más valiosa que una plantilla formal.

### Corregir o mejorar el contenido existente

Errores tipográficos, aclaraciones, información desactualizada, mejores ejemplos; las PRs son bienvenidas, no es necesario abrir un issue.

## Lo que usamos

### MITRE ATLAS

Este modelo de amenazas se basa en [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems), un marco diseñado específicamente para amenazas de IA/ML como la inyección de prompts, el uso indebido de herramientas y la explotación de agentes. No es necesario conocer ATLAS para contribuir; asignamos las envíos al marco durante la revisión.

### Identificadores de amenaza

Cada amenaza recibe un ID como `T-EXEC-003`. Las categorías son:

| Código  | Categoría                                    |
| ------- | -------------------------------------------- |
| RECON   | Reconnaissance - recopilación de información |
| ACCESS  | Initial access - obtención de acceso         |
| EXEC    | Execution - ejecución de acciones maliciosas |
| PERSIST | Persistence - mantenimiento del acceso       |
| EVADE   | Defense evasion - evasión de detección       |
| DISC    | Discovery - descubrimiento del entorno       |
| EXFIL   | Exfiltration - robo de datos                 |
| IMPACT  | Impact - daño o interrupción                 |

Los ID son asignados por los mantenedores durante la revisión. No necesitas elegir uno.

### Niveles de riesgo

| Nivel       | Significado                                                            |
| ----------- | ---------------------------------------------------------------------- |
| **Crítico** | Compromiso total del sistema, o alta probabilidad + impacto crítico    |
| **Alto**    | Daños significativos probables, o probabilidad media + impacto crítico |
| **Medio**   | Riesgo moderado, o baja probabilidad + impacto alto                    |
| **Bajo**    | Poco probable y con impacto limitado                                   |

Si no estás seguro del nivel de riesgo, simplemente describe el impacto y nosotros lo evaluaremos.

## Proceso de revisión

1. **Tríaje** - Revisamos las nuevas presentaciones en 48 horas
2. **Evaluación** - Verificamos la viabilidad, asignamos la asignación ATLAS y el ID de amenaza, validamos el nivel de riesgo
3. **Documentación** - Nos aseguramos de que todo esté formateado y completo
4. **Fusión** - Se añade al modelo de amenazas y visualización

## Recursos

- [Sitio web de ATLAS](https://atlas.mitre.org/)
- [Técnicas de ATLAS](https://atlas.mitre.org/techniques/)
- [Estudios de casos de ATLAS](https://atlas.mitre.org/studies/)
- [Modelo de amenazas de OpenClaw](/es/security/THREAT-MODEL-ATLAS)

## Contacto

- **Vulnerabilidades de seguridad:** Consulte nuestra [página de confianza](https://trust.openclaw.ai) para obtener instrucciones de reporte
- **Preguntas sobre el modelo de amenazas:** Abra un issue en [openclaw/trust](https://github.com/openclaw/trust/issues)
- **Chat general:** Canal #security de Discord

## Reconocimiento

Los contribuyentes al modelo de amenazas son reconocidos en los agradecimientos del modelo de amenazas, en las notas de la versión y en el salón de la fama de seguridad de OpenClaw por contribuciones significativas.

import es from "/components/footer/es.mdx";

<es />
