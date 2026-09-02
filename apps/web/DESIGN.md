---
name: BRUMA
description: A puertas abiertas — el color de la página se tuesta mientras bajás.
colors:
  paper: "#F2F3F0"
  paper-deep: "#E4E6E1"
  tinta: "#241812"
  tinta-suave: "#5A4A40"
  verde: "#6F7F4B"
  amarillo: "#A47C14"
  canela: "#C1662F"
  tostado: "#8A4B24"
  oscuro: "#4A2A18"
  linea: "#C8CBC2"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 9vw, 7rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  titulo:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.1vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  dato:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  etiqueta:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  none: "0"
  sm: "2px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "32px"
  lg: "64px"
  xl: "128px"
components:
  boton-primario:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "18px 36px"
    typography: "{typography.etiqueta}"
  boton-primario-hover:
    backgroundColor: "{colors.etapa}"
    textColor: "{colors.paper}"
  boton-secundario:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "18px 36px"
    typography: "{typography.etiqueta}"
  etiqueta-dato:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-suave}"
    typography: "{typography.etiqueta}"
---

# Design System: BRUMA

## Overview

**La idea que ordena todo: la página es el recorrido del grano.**

BRUMA trabaja a puertas abiertas — se ve cómo tuestan, muelen y preparan. La
página no lo cuenta: lo hace. El scroll no atraviesa secciones ("Nosotros",
"Productos"), atraviesa **estaciones del proceso**, en el orden real:

```
grano verde  →  tostadora  →  molino  →  taza  →  bolsa
```

**La paleta no se eligió: se derivó.** Cuando el café se tuesta cambia de color
siempre en la misma secuencia — verde, amarillo, canela, marrón. Esa progresión
es el sistema de color, y avanza con el scroll: el acento de la página está en
verde en la primera estación y llega tostado a la última. El visitante ve el
grano tostarse mientras baja.

Lo que rechaza: la página de café de especialidad que hace toda la categoría —
fondo crema tibio, serif de alto contraste, acento terracota, tres tarjetas de
origen — y también su opuesto de boutique: negro con cobre y serif fino. Este
mundo es claro, frío de base, y saturado por etapas.

## Colors

**El ground es frío y se mantiene claro todo el recorrido.** `paper` (#F2F3F0)
no es crema: tiene un sesgo verdoso mínimo, de papel técnico, no de papel de
panadería. Esa temperatura es la que separa este mundo del cliché de la
categoría, así que no se entibia.

**Las cinco etapas del tueste son el sistema, no una decoración.** Cada estación
del proceso adopta la suya como acento, en orden y sin saltearse ninguna:

| Token | Etapa real | Dónde manda |
|---|---|---|
| `verde` #6F7F4B | Grano crudo, sin tostar | Apertura y primera estación |
| `amarillo` #A47C14 | *Yellowing*, primeros minutos | Segunda estación |
| `canela` #C1662F | *First crack* | Tercera estación |
| `tostado` #8A4B24 | El punto de BRUMA | Cuarta estación, taza |
| `oscuro` #4A2A18 | Tueste oscuro | Cierre y bolsa |

El acento vive en una custom property (`--etapa`) que la estación visible
define. Botones, líneas, subrayados y estados leen de ahí: cambiar de estación
recolorea la interfaz entera sin tocar un componente.

**`verde` es el color de marca.** Es el diferencial más barato y más fuerte que
tiene este mundo: la categoría entera muestra café ya tostado, así que nadie usa
el verde oliva del grano crudo. Es el color de la apertura y el que se recuerda.

**Estrategia: Full palette.** Cinco roles nombrados, cada uno dueño de una
región completa de la página. El color no se espolvorea en acentos sueltos: una
estación es su color.

El texto de lectura va siempre en `tinta` (#241812) sobre `paper` — 15,5:1. Un
color de etapa puede titular, nunca llevar un párrafo, y solo a tamaño de display:
todos superan 3:1 sobre `paper`, ninguno llega a 4,5:1.

Ese umbral fijó el `amarillo`: el dorado del *yellowing* real daba 2,2:1 y era
ilegible, así que se bajó a #A47C14 (3,45:1). Es la única concesión del sistema —
el color sigue leyéndose como la etapa que nombra, pero el que manda es el
contraste.

**Ningún texto va directamente sobre una foto.** Una fotografía con textura densa
—mil granos, un salón lleno— no deja leer nada encima, y este mundo no tiene
sombras ni velos para taparla. Cuando hace falta texto sobre imagen, se apoya en
un bloque opaco de `paper` con su filete: superposición de imprenta, que es el
único recurso de profundidad que el sistema admite.

## Typography

**Una sola familia: Archivo**, de Omnibus-Type, fundición argentina de Buenos
Aires. Es una grotesca de gaceta, dibujada para impresión de alta demanda:
tiene el temple de una tipografía de trabajo, no de una de librito.

Se eligió por tres motivos, ninguno decorativo: el mundo es porteño y técnico y
la letra también lo es; es **variable con eje de ancho** (`wdth` 62–125), así que
el expanded del display y el narrow de las etiquetas salen del mismo archivo; y
un solo recurso tipográfico para todo el sistema mantiene el presupuesto de peso
donde tiene que estar.

```
Display     wdth 125  ·  weight 700  ·  tracking -0.03em
Título      wdth 110  ·  weight 600
Cuerpo      wdth 100  ·  weight 400
Dato        wdth 100  ·  weight 600  ·  tabular-nums
Etiqueta    wdth  75  ·  weight 600  ·  caps  ·  tracking 0.12em
```

Los números de instrumentación (temperatura, minutos, altura, precio) van
**siempre con `font-variant-numeric: tabular-nums`**: son mediciones y tienen
que alinearse en columna y no bailar al actualizarse.

Las etiquetas en caps y narrow son el registro del instrumento — el rótulo
serigrafiado de una máquina. Se usan para nombrar magnitudes, nunca para
titular una sección.

## Layout

**Cada estación ocupa su viewport.** No hay tres tarjetas de origen en grilla;
hay estaciones a pantalla completa que se suceden en el orden del proceso.

**La línea del proceso** recorre la página entera en vertical: un filete de 1px
en `linea` que atraviesa todas las estaciones y las cose. Es lo único que
persiste de arriba a abajo, y hace visible que esto es un recorrido y no una
lista. Marca cada estación con un punto que se pinta del color de su etapa una
vez alcanzada, así que también funciona de índice de avance.

Ritmo: densidad alternada. Una estación densa (datos, ficha, especificaciones)
se gana una de respiro (una foto a sangre y una sola línea de texto). El cierre
ancla con la dirección y el horario, que es la información que trajo a la
persona.

Espaciado: más aire arriba de un título que abajo, siempre. Grupos apretados,
separación generosa entre grupos.

Mobile primero de verdad: la escena real es una mano, en la calle, apurada. Las
estaciones se apilan sin perder el orden y la línea del proceso pasa a ocupar el
margen izquierdo.

## Elevation & Depth

**Este mundo es plano.** No hay tarjetas flotando ni sombras difusas: un local
con las paredes de vidrio no tiene capas ocultas, y la interfaz tampoco.

La profundidad, donde hace falta, es de imprenta: superposición y filete. Un
bloque se apoya sobre otro por contraste de superficie (`paper` sobre
`paper-deep`) o por una línea de 1px, nunca por una sombra.

Las fotos van a sangre y sin marco. La imagen es la superficie, no un objeto
apoyado sobre ella.

## Shapes

**Sin radios.** `rounded.none` es el default de todo: botones, campos, bloques,
imágenes. El mundo es de instrumento y de imprenta, y ninguno de los dos redondea
esquinas. `rounded.sm` (2px) existe solo para el punto indicador de la línea del
proceso.

Los bordes son filetes de 1px en `linea` o en el color de la etapa activa. Nunca
más gruesos: un borde grueso de color al costado de un bloque es el recurso que
usa toda la categoría para simular jerarquía.

## Components

**Estación.** La unidad de la página. Ocupa el viewport, declara su etapa del
tueste (que define `--etapa`), y combina un dato de instrumentación, una imagen
a sangre y un texto corto. Toda estación nombra su momento del proceso en una
etiqueta narrow en caps.

**Dato de instrumentación.** Número grande tabular con su etiqueta narrow
encima. Es la voz de la marca: donde la categoría escribe "artesanal", BRUMA
escribe `11:20 AL PRIMER CRACK`. Nunca decorativo — todo dato mostrado es un
dato real del producto.

**Línea del proceso.** Filete vertical persistente con un punto por estación.
El punto se pinta del color de su etapa cuando la estación se alcanza. Es
navegación y es avance a la vez.

**Botón.** Rectángulo sin radio, `tinta` sobre `paper`, etiqueta en caps narrow.
En hover adopta el color de la etapa activa: el botón pertenece a la estación en
la que está.

**Brumita.** La asistente tiene su propia estación en el recorrido, con
preguntas sugeridas visibles, y una burbuja persistente. La burbuja es el único
elemento con permiso para flotar sobre el resto, y aun así es un rectángulo sin
sombra, con filete.

## Do's and Don'ts

**Do**

- Derivar el color de la etapa del proceso en la que está la sección.
- Mostrar mediciones reales con `tabular-nums`: temperatura, minutos, altura, gramos.
- Fotos a sangre, sin marco ni radio.
- Una sola idea de movimiento, orquestada: el avance del color con el scroll.
- Mantener `paper` frío. Si empieza a verse crema, está mal calibrado.

**Don't**

- **No entibiar el ground a crema.** Es la línea que separa este mundo del
  cliché que rechaza.
- **No usar los colores de etapa fuera de orden.** La secuencia del tueste es
  la lógica del sistema; saltearla lo convierte en un degradé decorativo.
- No agregar una segunda familia tipográfica. Los ejes de Archivo cubren todos
  los registros que este sistema necesita.
- No poner sombras, glassmorphism ni gradientes de relleno.
- No apoyar la jerarquía en un borde de color grueso al costado de un bloque.
- No animar por sección. Una entrada idéntica repetida en cada estación no es
  motion autorado, es ruido.
- No inventar datos. Un número en pantalla es un dato del producto o no está.
