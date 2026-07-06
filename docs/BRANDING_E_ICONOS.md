# Branding e íconos — Mi Almacén

Documento de referencia para la identidad visual de la app y el proceso para
regenerar los assets derivados (íconos Android, splash, favicon). No repite
el SVG ni el código del generador — ambos ya existen como archivos en el
repo y son la fuente de verdad.

---

## Concepto: "La Libreta"

El ícono reinterpreta la libreta de fiado del almacén de barrio como símbolo
de orden, control y confianza — coherente con el propósito de la app (llevar
cuenta de fiados, caja y productos). No es un ícono genérico de "tienda" o
"carrito de compras".

Paleta de marca (la misma que usa `src/theme/index.ts` en toda la app):

| Token | Hex | Uso |
|---|---|---|
| Primary — "Azul Puerto" | `#0F4C81` | Color principal del ícono y de la app |
| Primary Dark | `#0A3560` | Degradé de fondo del ícono |
| Accent — "Terracota Almacén" | `#C2542D` | Uso puntual, nunca como color de acción repetida |

---

## Archivo maestro

**`assets/icon.svg`** es el único archivo que se edita a mano. Es un SVG de
1024×1024 organizado en grupos/capas (fondo, glifo, variantes) para que el
generador pueda aislar o recolorear cada capa según el asset que esté
produciendo (por ejemplo, el glifo en blanco puro para la variante
monocromática de Android 13+).

**Ningún PNG derivado se edita manualmente.** Todos se regeneran desde este
SVG. Si hace falta un ajuste visual (color, proporciones, trazo), se edita
`assets/icon.svg` y se vuelven a generar los 6 archivos — nunca se retoca un
PNG en un editor de imágenes.

---

## Herramienta de generación

**`scripts/generate-icons.html`** — página HTML autocontenida (sin
dependencias externas, no sube nada a internet) que carga `assets/icon.svg`
con `fetch()` y lo renderiza en `<canvas>` en 6 variantes, cada una
descargable individualmente desde el navegador.

| Variante | Archivo de salida | Tamaño |
|---|---|---|
| Ícono principal | `assets/icon.png` | 1024×1024 |
| Ícono adaptativo Android — foreground | `assets/android-icon-foreground.png` | 1024×1024 |
| Ícono adaptativo Android — background | `assets/android-icon-background.png` | 1024×1024 |
| Ícono adaptativo Android — monochrome | `assets/android-icon-monochrome.png` | 1024×1024 |
| Splash | `assets/splash-icon.png` | 512×512 |
| Favicon (web) | `assets/favicon.png` | 64×64 |

Estos 6 archivos son referenciados directamente desde `app.config.ts`
(`icon`, `splash.image`, `android.adaptiveIcon.*`, `web.favicon`) — no hace
falta tocar esa configuración al regenerar los PNG, solo reemplazar los
archivos.

### Cómo regenerar los íconos

El navegador bloquea `fetch()` sobre archivos abiertos con `file://` (CORS),
así que hay que servir el proyecto localmente:

```bash
npx serve .
```

1. Abrir la URL que indique la terminal, agregando la ruta de la página, por ejemplo `http://localhost:3000/scripts/generate-icons.html`.
2. Confirmar que las 6 tarjetas de vista previa se generaron correctamente a partir de `assets/icon.svg`.
3. Descargar cada archivo con su botón individual (no genera un .zip).
4. Mover los archivos descargados a `assets/`, reemplazando los existentes.
5. Correr `npx expo start -c` para limpiar la caché de Metro y ver los íconos nuevos.

---

## Qué NO hacer

- No editar ningún PNG de `assets/` directamente en un editor de imágenes.
- No duplicar ni pegar el SVG completo en otro documento — `assets/icon.svg` es la única fuente.
- No generar los PNG a mano con otra herramienta distinta de `scripts/generate-icons.html`, para evitar inconsistencias entre variantes (recorte, color de fondo, capas activas).
