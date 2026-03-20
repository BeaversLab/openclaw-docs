---
summary: "Guía de ClawHub: registro público de habilidades + flujos de trabajo de CLI"
read_when:
  - Introduciendo ClawHub a nuevos usuarios
  - Instalando, buscando o publicando habilidades
  - Explicación de los flags de la CLI de ClawHub y el comportamiento de sincronización
title: "ClawHub"
---

# ClawHub

ClawHub es el **registro público de habilidades para OpenClaw**. Es un servicio gratuito: todas las habilidades son públicas, abiertas y visibles para todos para compartir y reutilizar. Una habilidad es simplemente una carpeta con un archivo `SKILL.md` (más archivos de texto de apoyo). Puede explorar las habilidades en la aplicación web o usar la CLI para buscar, instalar, actualizar y publicar habilidades.

Sitio: [clawhub.ai](https://clawhub.ai)

## Qué es ClawHub

- Un registro público para las habilidades de OpenClaw.
- Un almacén versionado de paquetes de habilidades y metadatos.
- Una superficie de descubrimiento para búsquedas, etiquetas y señales de uso.

## Cómo funciona

1. Un usuario publica un paquete de habilidades (archivos + metadatos).
2. ClawHub almacena el paquete, analiza los metadatos y asigna una versión.
3. El registro indexa la habilidad para la búsqueda y el descubrimiento.
4. Los usuarios navegan, descargan e instalan habilidades en OpenClaw.

## Lo que puede hacer

- Publicar nuevas habilidades y nuevas versiones de habilidades existentes.
- Descubrir habilidades por nombre, etiquetas o búsqueda.
- Descargar paquetes de habilidades e inspeccionar sus archivos.
- Reportar habilidades que sean abusivas o inseguras.
- Si es moderador, ocultar, mostrar, eliminar o prohibir.

## A quién va dirigido (amigable para principiantes)

Si desea añadir nuevas capacidades a su agente OpenClaw, ClawHub es la forma más fácil de encontrar e instalar habilidades. No necesita saber cómo funciona el backend. Puede:

- Buscar habilidades en lenguaje natural.
- Instalar una habilidad en su espacio de trabajo.
- Actualizar habilidades más tarde con un solo comando.
- Hacer una copia de seguridad de sus propias habilidades publicándolas.

## Inicio rápido (no técnico)

1. Instale la CLI (consulte la siguiente sección).
2. Busque algo que necesite:
   - `clawhub search "calendar"`
3. Instale una habilidad:
   - `clawhub install <skill-slug>`
4. Inicie una nueva sesión de OpenClaw para que detecte la nueva habilidad.

## Instalar la CLI

Elija una:

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## Cómo se integra en OpenClaw

De forma predeterminada, la CLI instala habilidades en `./skills` en su directorio de trabajo actual. Si hay configurado un espacio de trabajo de OpenClaw, `clawhub` recurre a ese espacio de trabajo a menos que anule `--workdir` (o `CLAWHUB_WORKDIR`). OpenClaw carga las habilidades del espacio de trabajo desde `<workspace>/skills` y las detectará en la **siguiente** sesión. Si ya usa `~/.openclaw/skills` o habilidades incluidas, las habilidades del espacio de trabajo tienen prioridad.

Para obtener más detalles sobre cómo se cargan, comparten y restringen las habilidades, consulte
[Habilidades](/es/tools/skills).

## Descripción general del sistema de habilidades

Una habilidad es un paquete versionado de archivos que enseña a OpenClaw cómo realizar una
tarea específica. Cada publicación crea una nueva versión y el registro mantiene un
historial de versiones para que los usuarios puedan auditar los cambios.

Una habilidad típica incluye:

- Un archivo `SKILL.md` con la descripción principal y el uso.
- Configuraciones opcionales, scripts o archivos de compatibilidad utilizados por la habilidad.
- Metadatos como etiquetas, resumen y requisitos de instalación.

ClawHub utiliza metadatos para potenciar el descubrimiento y exponer de manera segura las capacidades de las habilidades.
El registro también rastrea señales de uso (como estrellas y descargas) para mejorar
la clasificación y la visibilidad.

## Lo que proporciona el servicio (características)

- **Navegación pública** de habilidades y su contenido `SKILL.md`.
- **Búsqueda** impulsada por incrustaciones (búsqueda vectorial), no solo por palabras clave.
- **Control de versiones** con semver, registros de cambios y etiquetas (incluyendo `latest`).
- **Descargas** como archivo zip por versión.
- **Estrellas y comentarios** para los comentarios de la comunidad.
- **Ganchos de moderación** para aprobaciones y auditorías.
- **API compatible con CLI** para automatización y secuencias de comandos.

## Seguridad y moderación

ClawHub es abierto de forma predeterminada. Cualquiera puede cargar habilidades, pero una cuenta de GitHub debe
tener al menos una semana de antigüedad para publicar. Esto ayuda a frenar el abuso sin bloquear
a los contribuyentes legítimos.

Informes y moderación:

- Cualquier usuario que haya iniciado sesión puede reportar una habilidad.
- Se requieren y registran los motivos del reporte.
- Cada usuario puede tener hasta 20 reportes activos a la vez.
- Las habilidades con más de 3 reportes únicos se ocultan automáticamente de forma predeterminada.
- Los moderadores pueden ver las habilidades ocultas, mostrarlas, eliminarlas o prohibir a los usuarios.
- El abuso de la función de reporte puede resultar en baneos de cuenta.

¿Interesado en convertirse en moderador? Pregúntelo en el Discord de OpenClaw y contacte a un
moderador o mantenedor.

## Comandos y parámetros de la CLI

Opciones globales (aplican a todos los comandos):

- `--workdir <dir>`: Directorio de trabajo (predeterminado: directorio actual; vuelve al espacio de trabajo de OpenClaw).
- `--dir <dir>`: Directorio de habilidades, relativo al directorio de trabajo (predeterminado: `skills`).
- `--site <url>`: URL base del sitio (inicio de sesión en el navegador).
- `--registry <url>`: URL base de la API del registro.
- `--no-input`: Desactivar preguntas (no interactivo).
- `-V, --cli-version`: Imprimir versión de la CLI.

Auth:

- `clawhub login` (flujo del navegador) o `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

Opciones:

- `--token <token>`: Pegar un token de API.
- `--label <label>`: Etiqueta almacenada para tokens de inicio de sesión del navegador (predeterminado: `CLI token`).
- `--no-browser`: No abrir un navegador (requiere `--token`).

Buscar:

- `clawhub search "query"`
- `--limit <n>`: Máximos resultados.

Instalar:

- `clawhub install <slug>`
- `--version <version>`: Instalar una versión específica.
- `--force`: Sobrescribir si la carpeta ya existe.

Actualizar:

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`: Actualizar a una versión específica (solo un solo slug).
- `--force`: Sobrescribir cuando los archivos locales no coincidan con ninguna versión publicada.

Listar:

- `clawhub list` (lee `.clawhub/lock.json`)

Publicar:

- `clawhub publish <path>`
- `--slug <slug>`: Slug de habilidad.
- `--name <name>`: Nombre para mostrar.
- `--version <version>`: Versión semver.
- `--changelog <text>`: Texto del registro de cambios (puede estar vacío).
- `--tags <tags>`: Etiquetas separadas por comas (predeterminado: `latest`).

Eliminar/Recuperar (solo propietario/administrador):

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

Sincronización (escanear habilidades locales + publicar nuevas/actualizadas):

- `clawhub sync`
- `--root <dir...>`: Raíces de escaneo adicionales.
- `--all`: Subir todo sin preguntas.
- `--dry-run`: Mostrar qué se subiría.
- `--bump <type>`: `patch|minor|major` para actualizaciones (predeterminado: `patch`).
- `--changelog <text>`: Registro de cambios para actualizaciones no interactivas.
- `--tags <tags>`: Etiquetas separadas por comas (predeterminado: `latest`).
- `--concurrency <n>`: Verificaciones del registro (predeterminado: 4).

## Flujos de trabajo comunes para agentes

### Buscar habilidades

```bash
clawhub search "postgres backups"
```

### Descargar nuevas habilidades

```bash
clawhub install my-skill-pack
```

### Actualizar habilidades instaladas

```bash
clawhub update --all
```

### Hacer una copia de seguridad de tus habilidades (publicar o sincronizar)

Para una sola carpeta de habilidades:

```bash
clawhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

Para escanear y hacer una copia de seguridad de muchas habilidades a la vez:

```bash
clawhub sync --all
```

## Detalles avanzados (técnicos)

### Control de versiones y etiquetas

- Cada publicación crea un nuevo `SkillVersion` **semver**.
- Las etiquetas (como `latest`) apuntan a una versión; mover las etiquetas te permite retroceder.
- Los registros de cambios se adjuntan por versión y pueden estar vacíos al sincronizar o publicar actualizaciones.

### Cambios locales vs. versiones del registro

Las actualizaciones comparan el contenido de la habilidad local con las versiones del registro utilizando un hash de contenido. Si los archivos locales no coinciden con ninguna versión publicada, la CLI pregunta antes de sobrescribir (o requiere `--force` en ejecuciones no interactivas).

### Escaneo de sincronización y raíces de respaldo

`clawhub sync` escanea primero tu directorio de trabajo actual. Si no se encuentran habilidades, recurre a ubicaciones heredadas conocidas (por ejemplo, `~/openclaw/skills` y `~/.openclaw/skills`). Esto está diseñado para encontrar instalaciones de habilidades más antiguas sin indicadores adicionales.

### Almacenamiento y archivo de bloqueo

- Las habilidades instaladas se registran en `.clawhub/lock.json` bajo tu directorio de trabajo.
- Los tokens de autenticación se almacenan en el archivo de configuración de la CLI de ClawHub (anular mediante `CLAWHUB_CONFIG_PATH`).

### Telemetría (recuentos de instalaciones)

Cuando ejecutas `clawhub sync` mientras estás conectado, la CLI envía una instantánea mínima para calcular los recuentos de instalaciones. Puedes desactivar esto por completo:

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## Variables de entorno

- `CLAWHUB_SITE`: Anular la URL del sitio.
- `CLAWHUB_REGISTRY`: Anula la URL de la API del registro.
- `CLAWHUB_CONFIG_PATH`: Anula dónde la CLI almacena el token/configuración.
- `CLAWHUB_WORKDIR`: Anula el directorio de trabajo predeterminado.
- `CLAWHUB_DISABLE_TELEMETRY=1`: Desactiva la telemetría en `sync`.

import es from "/components/footer/es.mdx";

<es />
