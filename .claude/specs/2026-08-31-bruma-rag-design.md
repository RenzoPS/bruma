# BRUMA — Cafetería con asistente RAG

**Fecha:** 2026-08-31
**Estado:** aprobado; fases 1 a 3 implementadas

> **Este documento es la propuesta original y quedó parcialmente desactualizado.**
> Lo que se construyó, lo que se midió y en qué puntos la implementación se
> apartó de acá está en
> [`2026-09-01-backend-datos-y-retrieval.md`](./2026-09-01-backend-datos-y-retrieval.md),
> sección 11. Los cambios con más peso: el tamaño de chunk (§4 de ese doc), el
> umbral de similitud, que se midió en vez de dejarse abierto (§6), y
> `packages/shared`, que no se creó (§3). La asistente se llama **Brumita** en la
> implementación, no *Vera*.

## 1. Qué es esto

BRUMA es una marca ficticia: una cafetería de especialidad con local propio que además
tuesta y vende su grano. El proyecto es una pieza de portfolio con dos objetivos, y
conviene tenerlos separados porque compiten entre sí:

1. **Demostrar un sistema RAG entendido**, no copiado de un tutorial.
2. **Demostrar diseño frontend**, con un sistema visual propio y animación de scroll.

Nada de esto es un producto real. La marca no existe, los orígenes son ficticios y
no se venden productos. Eso se declara en la propia página.

## 2. Alcance

### Entra

- Landing de la cafetería, rediseñada: quién es BRUMA, el local, la carta y el grano.
- Catálogo de local (cafés preparados, desayunos, medialunas, promos) con precios.
- Catálogo de grano en bolsa, con ficha larga por origen.
- **Vera**, la asistente: responde sobre la carta y sobre el grano.
- Ingesta y reindexado de las fichas de grano.
- Deploy público y gratuito.

### No entra

- Autenticación de visitantes. Nadie se registra para preguntarle algo a un bot.
- Panel de administración. Es un CRM disfrazado y no aporta a los objetivos.
- Carrito, pagos, envíos. La marca no vende.
- Ingesta de conocimiento general del café (ver decisión D-3).

## 3. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D-1 | Postgres + pgvector propio, no InsForge | El objetivo es demostrar el sistema. Un backend que lo genera desde un prompt no deja nada que defender. |
| D-2 | El retrieval se escribe a mano | El AI SDK no tiene atajo tipo `QuestionAnswerAdvisor`; el flujo se arma explícito. Es la parte que hay que poder explicar. |
| D-3 | Se indexa solo lo propietario | Un LLM ya sabe qué es la sobreextracción. No sabe qué es el lote Bruma de Guji. Se indexa lo segundo. |
| D-4 | Menú por tools, no por text-to-SQL | Fazt deja que el modelo escriba SQL libre y lo filtra con una lista negra de palabras. Una whitelist de operaciones es estrictamente más segura. |
| D-5 | Sin auth | Ver alcance. |
| D-6 | Monorepo con pnpm workspaces | Dos apps con tipos compartidos; es el caso de uso de pnpm. |
| D-7 | Gemini free tier | Costo cero y permanente. El proyecto queda prendido sin vigilar una factura. |
| D-8 | Drizzle, no Prisma | Prisma no tiene tipo `vector`: iría como `Unsupported`, la búsqueda en `$queryRaw` sin tipar, y Studio no abre la tabla. Drizzle tiene `vector()`, índice HNSW declarativo y helpers de distancia tipados. InsForge no usa ORM, así que no había nada que copiar de ahí. |

## 4. Arquitectura

```
apps/web  ──HTTP──►  apps/api  ──SQL──►  Neon
Next.js              Express             Postgres + pgvector
Vercel               Render / Cloud Run
                         │
                         └──►  Gemini (embeddings + generación)
```

### Estructura

```
bruma/
├── pnpm-workspace.yaml
├── apps/
│   ├── web/            Next.js — landing + UI del chat
│   └── api/            Express + TypeScript — RAG (dockerizado)
└── packages/
    └── shared/         tipos compartidos (Producto, Grano, Mensaje)
```

`apps/web` sale de lo que hoy es `bruma-cafe`: se conservan GSAP, Lenis y los
componentes de scroll. Se reemplaza el hero de frames (3,1 MB en `public/hero/`,
la causa real de que el sitio se sienta lento).

## 5. Modelo de datos

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Carta del local. Cambia seguido. NO se vectoriza.
CREATE TABLE productos (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  categoria   TEXT NOT NULL,          -- cafe | desayuno | pasteleria | promo
  precio      INTEGER NOT NULL,       -- centavos, nunca float
  descripcion TEXT,
  disponible  BOOLEAN DEFAULT TRUE
);

-- Grano en bolsa. La ficha larga sí se vectoriza.
CREATE TABLE granos (
  id       SERIAL PRIMARY KEY,
  nombre   TEXT NOT NULL,
  origen   TEXT NOT NULL,
  proceso  TEXT NOT NULL,             -- lavado | natural | honey
  altura   INTEGER,
  perfil   TEXT,                      -- claro | medio | oscuro
  precio   INTEGER NOT NULL,
  ficha    TEXT NOT NULL,             -- prosa larga: esto es lo que se indexa
  stock    BOOLEAN DEFAULT TRUE
);

-- Un chunk = un pedazo de ficha + su vector.
CREATE TABLE chunks (
  id        SERIAL PRIMARY KEY,
  grano_id  INTEGER REFERENCES granos(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX chunks_embedding_idx ON chunks
  USING hnsw (embedding vector_cosine_ops);
```

`vector(768)` sale de pedirle a `gemini-embedding-001` una `outputDimensionality`
de 768. El default es mayor y no aporta a este corpus.

El índice HNSW no cambia nada con 70 chunks — a esa escala el scan secuencial es
más rápido. Está para que el sistema sea correcto a escala, y para poder mostrar
la diferencia entre buscar con y sin índice.

## 6. Ingesta

Corre a mano vía script, no en cada request.

1. Leer las fichas de `granos`.
2. Partir en chunks de ~500 tokens con solapamiento de ~50, cortando por párrafo
   y nunca a mitad de oración. Escrito a mano, sin librería.
3. `embedMany()` sobre todos los chunks — una llamada, no una por chunk.
4. Borrar los chunks viejos del grano y escribir los nuevos, en una transacción.

Reindexar un grano es borrar sus chunks y volver a generarlos. No hay updates
parciales: es más simple y a esta escala no cuesta nada.

## 7. El flujo de una consulta

Vera tiene dos formas de conseguir información, y elegir bien entre ellas es el
núcleo del proyecto.

```
pregunta
   │
   ├─► tools (menú y precios)      datos exactos y cambiantes
   │
   └─► retrieval (fichas de grano) significado, matices, prosa
   │
   └─► ambas, cuando la pregunta las cruza
```

**El modelo no decide con un `if`.** Se le declaran las tools y él elige cuáles
llamar; el retrieval se expone también como una tool. Eso deja el ruteo explícito
y auditable: en la respuesta se puede mostrar qué usó.

### Tools declaradas (whitelist)

```ts
buscarProductos({ categoria?, precioMax?, soloDisponibles? })
verGranos({ proceso?, perfil?, precioMax? })
buscarEnFichas({ consulta })   // ← el retrieval vectorial
horariosYUbicacion()
```

El modelo **nunca escribe SQL**. Elige una función y sus argumentos, validados con
Zod. Esta es la diferencia con D-4: no hay superficie de inyección porque no hay
SQL generado.

### `buscarEnFichas` por dentro

```ts
const { embedding } = await embed({
  model: google.embedding('gemini-embedding-001'),
  value: consulta,
});

// la similitud la calcula Postgres, no Node
const similitud = sql<number>`1 - (${cosineDistance(chunks.embedding, embedding)})`;

return db
  .select({ contenido: chunks.contenido, granoId: chunks.granoId, similitud })
  .from(chunks)
  .where(gt(similitud, UMBRAL))
  .orderBy(t => desc(t.similitud))
  .limit(5);
```

Drizzle expone además `l1Distance`, `l2Distance` e `innerProduct`. Son las mismas
métricas que explica el video de BettaTech, y cambiar entre ellas es una línea:
sirve para medir cuál recupera mejor sobre este corpus en vez de asumir que coseno
es la correcta porque es la que usa todo el mundo.

El umbral importa: sin él, siempre vuelven cinco chunks aunque ninguno tenga que
ver, y el modelo responde con basura confiada. Con umbral, ante una pregunta fuera
de dominio no vuelve nada y Vera dice que no sabe.

Su valor no se fija de antemano: se calibra en la fase 3, midiendo la similitud
real de preguntas que deben recuperar contra preguntas que no. Un número elegido
a ojo acá es la diferencia entre un bot que sabe callarse y uno que inventa.

## 8. Guardrails

| Riesgo | Defensa |
|---|---|
| Inventar precios u origen | Temperatura 0 y la instrucción de responder solo con lo recuperado. |
| Preguntas fuera de dominio | Umbral de similitud: si no recupera nada, no hay contexto y lo dice. |
| Prompt injection | Las tools son una whitelist con argumentos validados por Zod. No hay SQL generado ni ejecución arbitraria. |
| Agotar la cuota de Gemini | Rate limit por IP y caché de preguntas repetidas. |
| Fuga del prompt de sistema | Instrucción explícita de no revelarlo; el prompt no contiene secretos igual. |

Cada uno de estos tiene su test.

## 9. Vera

La identidad no se inventa de cero: **Vera es la barista de Bruma.** Sabe de café
porque es su oficio, conoce el local y conoce el grano que tuestan.

- Tutea, en rioplatense, sin exagerar el modismo.
- Contesta corto. Es una barista atendiendo, no un folleto.
- Cuando recomienda, dice por qué, y cita de dónde lo sacó.
- **Cuando no sabe, lo dice.** Nunca completa con verosimilitud.
- Si le preguntan algo ajeno al café o a Bruma, redirige sin sermonear.

En la UI, cada respuesta muestra qué fuente usó (carta o ficha de tal grano). Es
honesto y hace visible el mecanismo, que es medio punto del proyecto.

## 10. Rediseño

El `PRODUCT.md` actual describe una microtostaduría que despacha por correo, y el
`DESIGN.md` construye sobre eso un mundo oscuro de papelería de trazabilidad. El
producto cambió: ahora hay un local con mesas, desayuno y luz de mañana. El mundo
visual tiene que cambiar con él.

Orden, con `impeccable`:

1. `init` → `PRODUCT.md` nuevo (cafetería con local + venta de grano).
2. `new-work` → `DESIGN.md` nuevo. Claro, cálido. El logo se conserva como
   continuidad, revisándolo si hace falta.
3. Prompts de Gemini para logo, bolsas, local y producto, ya con la paleta definida.
4. Implementación, conservando GSAP y Lenis y reemplazando el hero de frames.

## 11. Deploy

| Pieza | Dónde | Costo |
|---|---|---|
| `apps/web` | Vercel | $0 |
| `apps/api` | Render + ping, o Cloud Run | $0 |
| Base | Neon | $0 |
| Modelos | Gemini free tier | $0 |

Render duerme a los 15 min y tarda ~1 min en despertar, pero da 750 h/mes: alcanza
para tenerlo despierto 24/7 con un ping cada 10 min a `/healthz`. Cloud Run arranca
en 1-2 s y da 2M requests/mes, pero pide tarjeta. La decisión queda abierta; la API
va dockerizada, así que corre igual en las dos.

## 12. Fases

1. **Rediseño** — PRODUCT.md, DESIGN.md, imágenes, landing nueva. Sin backend.
2. **Datos** — esquema, seed del catálogo y las fichas, ingesta y reindexado.
3. **Retrieval** — la búsqueda vectorial sola, verificada por tests antes de que
   haya un chatbot.
4. **Vera** — tools, ruteo, guardrails, streaming.
5. **UI del chat** — `useChat`, fuentes citadas, estados de carga y error.
6. **Deploy** — Docker, los tres servicios, dominio.

El orden no es negociable en un punto: **el retrieval se prueba antes de que exista
el chat.** Si se arma el chat primero, cualquier error de recuperación queda tapado
por un modelo que responde bien igual, y no hay forma de saber si el RAG anda.

## 13. Verificación

- Chunking: los cortes respetan párrafos y el solapamiento es el pedido.
- Retrieval: un set de preguntas con el chunk que debería volver primero.
- Umbral: preguntas fuera de dominio no recuperan nada.
- Tools: los argumentos inválidos se rechazan; el modelo no puede pedir SQL.
- Guardrails: un set de intentos de jailbreak e inyección.
- Frontend: Lighthouse, y el peso del hero como gate.

## 14. Abierto

- Host de la API: Render o Cloud Run.
- Si el logo actual se conserva tal cual o se revisa.
- Cuántos granos: 6 a 8.
