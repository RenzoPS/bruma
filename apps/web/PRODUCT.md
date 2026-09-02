# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primario: alguien que busca dónde desayunar o tomar un buen café cerca. Llega
desde Instagram o de una recomendación, casi siempre desde el celular y con poco
tiempo. **El trabajo que viene a hacer es decidir si vale la pena ir**: qué
sirven, cómo es el lugar, cuánto sale. No viene a comprar nada todavía.

El grano en bolsa no es lo que lo trae: es lo que descubre después, cuando el
lugar ya le gustó. Esa secuencia — primero el local, después la bolsa — es un
hecho del producto y no debe invertirse.

## Product Purpose

BRUMA es una cafetería de especialidad con local propio. Sirve café de barra,
desayuno y merienda, y **tuesta su propio grano en el local**, que además vende
en bolsa para llevar.

La web existe para que alguien decida ir. Éxito: el visitante entiende en un
scroll qué es BRUMA, por qué el café es distinto, y sabe dónde queda y qué va a
encontrar cuando llegue.

## Positioning

**Tuestan ahí, a la vista.** El tostador está en el local. El grano que te
sirven en la barra es el mismo que tostaron a metros de tu mesa, y el mismo que
te llevás en bolsa.

Casi ninguna cafetería tuesta: compran el grano ya tostado a un tercero y solo
lo muelen. Por eso el de al lado puede decir que su café es rico, pero no puede
decir que lo tostó él. El posicionamiento es un hecho físico verificable, no un
adjetivo.

De ahí se desprende lo demás: si tostás vos, controlás el punto de cada origen,
sabés la fecha exacta y podés responder por qué ese grano sabe así.

## Operating Context

- Se decide en el celular, con una mano, en un rato muerto. Nunca se lee todo.
- Hay dos momentos de consumo distintos: la mañana (desayuno, café rápido) y la
  tarde (merienda, quedarse un rato). La carta cubre los dos.
- El tostador a la vista es parte de la experiencia del local, no una anécdota.
- El grano en bolsa se compra en el local, no por la web.

## Capabilities and Constraints

- **La web no vende.** No hay carrito, ni pagos, ni envíos. Muestra la carta y
  el grano; la transacción ocurre en el local.
- **No hay cuentas de usuario ni login.** Nadie se registra.
- **Brumita**, la asistente conversacional del sitio: responde sobre la carta
  (datos exactos: qué hay, cuánto sale, qué está disponible) y sobre los granos
  (recomendación por perfil, origen y método). Tiene una sección propia en el
  recorrido de la página, con preguntas sugeridas para invitar a probarla, más
  una burbuja accesible desde cualquier punto.
- Brumita responde solo sobre café y sobre BRUMA. Fuera de ese dominio, lo dice.
- Stack fijado: Next 16, React 19, Tailwind 4, GSAP y Lenis en el front; la
  asistente corre contra una API propia en Express.
- **El SEO no es un requisito.** La marca no existe y el sitio no busca
  indexarse. Las decisiones no deben justificarse por buscadores.

## Brand Commitments

- El nombre de la marca es **BRUMA**. La asistente se llama **Brumita** — el
  diminutivo es deliberado: es de la casa, es como la llamarían los clientes.
- Voz rioplatense, de trato directo. Brumita tutea y contesta corto, como
  alguien atendiendo la barra, no como un folleto.
- **La ficción se declara.** BRUMA no existe; es una pieza de portfolio. Eso se
  dice en la propia página, no se esconde.

## Evidence on Hand

- **No hay fotografía real.** Todas las imágenes se generan con IA a partir de
  prompts escritos para este proyecto. Ninguna foto de stock que finja ser el
  local.
- **No hay clientes, reseñas, premios ni prensa.** No se inventan. Una cafetería
  ficticia con testimonios falsos es una mentira sin gracia y se nota.
- Los orígenes, fincas, estaciones de beneficio, códigos de lote y fechas son
  ficticios. Los países y regiones pueden ser reales porque son geografía.
- **Nunca se usan nombres de productores o cooperativas reales, ni sellos ni
  puntajes de organismos reales** (SCA, Cup of Excellence). Eso no se inventa.
- Referencia previa: `~/Develop/bruma-cafe` describía otro producto — una
  microtostaduría que despachaba por correo, sin local. Sirve como antecedente
  de marca, no como descripción de este producto.

## Product Principles

1. **El local primero, la bolsa después.** Todo el recorrido acompaña la
   decisión de ir. Vender grano antes de que el lugar guste es pedir el segundo
   paso sin haber dado el primero.
2. **Hechos, no adjetivos.** "Tostado el 24 de julio" dice más que "artesanal".
   Donde la categoría pone sensaciones, BRUMA pone datos verificables.
3. **La ficción es honesta.** Se inventa la marca, no la evidencia. Nada que
   simule ser una prueba real que no existe.
4. **Brumita admite lo que no sabe.** Ante una pregunta que no puede responder
   con información propia, lo dice. Un precio inventado con seguridad es peor
   que un "no sé".
5. **El celular es el escenario real**, no el caso extremo.
