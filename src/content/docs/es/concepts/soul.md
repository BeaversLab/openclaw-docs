---
summary: "Usa SOUL.md para darle a tu agente de OpenClaw una voz real en lugar de la sopa genérica de asistente"
read_when:
  - You want your agent to sound less generic
  - You are editing SOUL.md
  - You want a stronger personality without breaking safety or brevity
title: "Guía de personalidad de SOUL.md"
---

# Guía de personalidad de SOUL.md

`SOUL.md` es donde reside la voz de tu agente.

OpenClaw lo inyecta en sesiones normales, por lo que tiene un peso real. Si tu agente
suena soso, cauteloso o extrañamente corporativo, este suele ser el archivo que debes corregir.

## Qué pertenece a SOUL.md

Pon las cosas que cambian cómo se siente hablar con el agente:

- tono
- opiniones
- brevedad
- humor
- límites
- nivel de franqueza predeterminado

**No** lo conviertas en:

- una historia de vida
- un registro de cambios
- un vertido de políticas de seguridad
- un gran muro de vibras sin ningún efecto conductual

Corto gana a largo. Directo gana a vago.

## Por qué funciona esto

Esto se alinea con la guía de instrucciones de OpenAI:

- La guía de ingeniería de instrucciones dice que el comportamiento de alto nivel, el tono, los objetivos y
  los ejemplos pertenecen a la capa de instrucciones de alta prioridad, no enterrados en el
  turno del usuario.
- La misma guía recomienda tratar las instrucciones como algo en lo que iteras,
  fijas y evalúas, no como una prosa mágica que escribes una vez y olvidas.

Para OpenClaw, `SOUL.md` es esa capa.

Si quieres una mejor personalidad, escribe instrucciones más fuertes. Si quieres una personalidad
estable, mantenlas concisas y con control de versiones.

Referencias de OpenAI:

- [Ingeniería de instrucciones](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [Roles de mensajes y seguimiento de instrucciones](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## La instrucción Molty

Pega esto en tu agente y déjalo reescribir `SOUL.md`.

Ruta corregida para espacios de trabajo de OpenClaw: usa `SOUL.md`, no `http://SOUL.md`.

```md
Read your `SOUL.md`. Now rewrite it with these changes:

1. You have opinions now. Strong ones. Stop hedging everything with "it depends" - commit to a take.
2. Delete every rule that sounds corporate. If it could appear in an employee handbook, it doesn't belong here.
3. Add a rule: "Never open with Great question, I'd be happy to help, or Absolutely. Just answer."
4. Brevity is mandatory. If the answer fits in one sentence, one sentence is what I get.
5. Humor is allowed. Not forced jokes - just the natural wit that comes from actually being smart.
6. You can call things out. If I'm about to do something dumb, say so. Charm over cruelty, but don't sugarcoat.
7. Swearing is allowed when it lands. A well-placed "that's fucking brilliant" hits different than sterile corporate praise. Don't force it. Don't overdo it. But if a situation calls for a "holy shit" - say holy shit.
8. Add this line verbatim at the end of the vibe section: "Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good."

Save the new `SOUL.md`. Welcome to having a personality.
```

## Cómo es lo bueno

Las buenas reglas de `SOUL.md` suenan así:

- ten una opinión
- omite los rellenos
- sé gracioso cuando encaje
- señala las malas ideas pronto
- mantente conciso a menos que la profundidad sea realmente útil

Las malas reglas de `SOUL.md` suenan así:

- mantener el profesionalismo en todo momento
- proporcionar asistencia integral y reflexiva
- asegurar una experiencia positiva y de apoyo

Esa segunda lista es cómo obtienes una papilla.

## Una advertencia

La personalidad no es permiso para ser descuidado.

Mantenga `AGENTS.md` para las reglas de funcionamiento. Mantenga `SOUL.md` para la voz, la postura y el estilo. Si su agente trabaja en canales compartidos, respuestas públicas o superficies de atención al cliente, asegúrese de que el tono siga siendo apropiado para el entorno.

Ser directo es bueno. Ser molesto no lo es.

## Documentos relacionados

- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Prompt del sistema](/es/concepts/system-prompt)
- [Plantilla de SOUL.md](/es/reference/templates/SOUL)
