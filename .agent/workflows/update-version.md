---
description: Actualizar versión de la aplicación
---

# Actualizar Versión

Este workflow incrementa automáticamente la versión en `index.html`.

## Comando

```bash
node update-version.js [tipo]
```

## Tipos de actualización

| Tipo | Ejemplo | Cuándo usar |
|------|---------|-------------|
| `patch` (default) | 1.3.0 → 1.3.1 | Correcciones menores, fixes de bugs |
| `minor` | 1.3.1 → 1.4.0 | Nuevas funcionalidades |
| `major` | 1.4.0 → 2.0.0 | Cambios grandes/incompatibles |

## Ejemplos

// turbo
1. Incrementar patch (default):
   ```
   node update-version.js
   ```

2. Incrementar minor (nueva feature):
   ```
   node update-version.js minor
   ```

3. Incrementar major (release grande):
   ```
   node update-version.js major
   ```
