import type { granos } from "../schema.ts";

/**
 * Los cuatro orígenes que BRUMA tuesta y vende en bolsa de 250 g.
 *
 * `ficha` es la única columna que se vectoriza, y es la razón de que exista el
 * RAG: un modelo ya sabe qué es un lavado y qué grind pide una moka. Lo que no
 * puede saber es que el lote de Guji de BRUMA lo trae Tadesse Wolde, que llegó
 * en marzo y que se tuesta corto. Eso es lo propietario, y es lo único que se
 * indexa.
 *
 * **Los párrafos son la unidad de corte.** El chunker parte por párrafo, así
 * que cada uno se escribe cerrado sobre un solo tema: de dónde viene, cómo se
 * procesa, cómo se tuesta acá, cómo se comporta en taza. Un párrafo que mezcla
 * origen con método de preparación produce un chunk cuyo vector no significa
 * ninguna de las dos cosas, y la búsqueda se vuelve difusa.
 *
 * `proceso` y `perfil` guardan el valor canónico en minúscula, que es el que
 * van a validar las tools con Zod. El front muestra su versión capitalizada
 * desde el diccionario de traducciones; son dos representaciones del mismo
 * dato, no dos datos.
 *
 * Marca ficticia: los productores, las fincas y las fechas son inventados.
 */
export const GRANOS: (typeof granos.$inferInsert)[] = [
  {
    clave: "guji",
    nombre: "Guji, Etiopía",
    origen: "Guji, Etiopía",
    proceso: "lavado",
    altura: 2050,
    perfil: "claro",
    precio: 1800000,
    stock: true,
    ficha: [
      "El Guji viene de la zona de Hambela, en el sur de Etiopía, a unos 2.050 metros. Lo produce Tadesse Wolde, que trabaja poco menos de dos hectáreas y entrega su cereza a la estación de lavado del pueblo. Compramos el lote entero de la cosecha 2025: son 340 kilos, y cuando se terminan no hay más hasta el año que viene. Es el único de los cuatro orígenes que no podemos reponer a mitad de temporada.",

      "Es un lavado clásico. La cereza se despulpa el mismo día que se cosecha, fermenta entre 36 y 48 horas en pileta y después se seca en camas africanas, al sol, durante unas dos semanas. El lavado saca de la ecuación todo el azúcar de la pulpa, y lo que queda es el grano solo: por eso este café sabe tan limpio y tan poco a fruta madura. Lo que se prueba es la variedad y la altura, sin el maquillaje del proceso.",

      "Acá lo tostamos corto y claro, el más claro de la carta. Sale de la tostadora en once minutos y medio, apenas pasado el primer crack, sin llegar nunca al segundo. Un tueste más largo le mataría la parte floral, que es exactamente por lo que compramos este lote. La contra es que un tueste tan claro es menos indulgente: si el agua está fría o la molienda gruesa, sale ácido y flaco, y no perdona.",

      "En taza da bergamota, jazmín y un fondo de té negro. Es liviano, casi transparente, con una acidez que se siente en los costados de la lengua y no en la punta. La gente que viene tomando café con leche toda la vida a veces dice que no le sabe a café, y es una reacción razonable: no se parece a nada de lo que se toma en un bar.",

      "Va en filtrado, V60 o Chemex, con agua a 94 grados y molienda media. En espresso se puede, pero hay que aceptar que va a salir corto y muy ácido. Con leche no tiene sentido: la leche tapa todo lo que este café tiene para decir, y estás pagando por algo que no vas a probar. Si tomás con leche todas las mañanas, llevate el Cerrado y dejá este para el fin de semana.",
    ].join("\n\n"),
  },

  {
    clave: "huila",
    nombre: "Huila, Colombia",
    origen: "Huila, Colombia",
    proceso: "lavado",
    altura: 1750,
    perfil: "medio",
    precio: 1550000,
    stock: true,
    ficha: [
      "El Huila sale de la finca La Esperanza, en Pitalito, sur de Colombia, a 1.750 metros. Es de la familia Motta, que produce café hace tres generaciones y nos vende desde que abrimos. Es el único origen del que compramos dos veces al año, en las dos cosechas colombianas, así que es el que nunca falta. Si venís un martes cualquiera y pedís un filtrado, es muy probable que estés tomando esto.",

      "Es un lavado, como el Guji, pero el resultado no se parece. Acá la fermentación es más corta, unas 18 horas, y el secado es mecánico y no al sol, porque en Pitalito llueve demasiado como para depender del clima. El café que sale es limpio pero más redondo, con más cuerpo y menos filo. La variedad es Castillo, que es resistente a la roya y por eso se planta en toda Colombia.",

      "Lo tostamos medio, doce minutos y veinte segundos, bien entrado después del primer crack. Es el tueste más fácil de los cuatro: la ventana en la que este café está bueno es ancha, y quince segundos de más no lo arruinan. Por eso es el que usamos para calibrar la tostadora cuando le cambiamos algo, y el que le damos a la gente nueva para que practique.",

      "En taza da caramelo, naranja y panela. Es dulce sin ser empalagoso, con una acidez de cítrico que aparece cuando se enfría un poco. Tiene suficiente cuerpo para aguantar la leche y suficiente carácter para tomarse solo, que es una combinación más rara de lo que parece.",

      "Anda en cualquier método y en cualquier proporción. Espresso, filtrado, prensa francesa, moka, con leche, sin leche, frío. Es el que recomendamos cuando alguien no sabe qué llevar, cuando es un regalo, o cuando la persona tiene una cafetera en casa y no sabe bien cuál. Nunca falla y nunca decepciona, aunque tampoco es el que te va a sorprender.",
    ].join("\n\n"),
  },

  {
    clave: "cerrado",
    nombre: "Cerrado, Brasil",
    origen: "Cerrado Mineiro, Brasil",
    proceso: "natural",
    altura: 1150,
    perfil: "oscuro",
    precio: 1450000,
    stock: true,
    ficha: [
      "El Cerrado viene de Minas Gerais, de la región del Cerrado Mineiro, a 1.150 metros: es el más bajo de los cuatro, y en Brasil eso es normal. Lo produce la Fazenda Bela Vista, una finca grande y mecanizada, muy lejos de la imagen romántica del café de especialidad. Compramos ahí porque el café es bueno y consistente, no porque la historia sea linda. Es el origen del que más volumen movemos.",

      "Es un natural. La cereza se seca entera, con la pulpa puesta, durante tres semanas en patio de cemento, y hay que revolverla varias veces por día para que no fermente de más. El azúcar de la fruta entra al grano mientras se seca, y eso es lo que le da el dulzor y el cuerpo. Es un proceso más barato que el lavado y más riesgoso: si llueve tres días seguidos en el momento equivocado, el lote se pierde entero.",

      "Es el tueste más largo de la carta, catorce minutos, con el segundo crack ya empezado. Vamos a buscar el chocolate y el cuerpo, y eso está del otro lado del primer crack. Es también el único que dejamos reposar cinco días antes de venderlo: recién tostado tiene demasiado gas y el espresso sale con una crema espectacular y un sabor plano.",

      "En taza da chocolate amargo, nuez y maní tostado. Casi no tiene acidez, tiene mucho cuerpo y deja el paladar con una sensación espesa que dura. Es el café que la mayoría de la gente reconoce como café, en el sentido de que se parece a lo que uno espera cuando pide uno.",

      "Es el que mejor aguanta la leche, y por lejos. El chocolate y la nuez atraviesan la leche en vez de desaparecer debajo, así que un flat white con este grano sabe a algo. En la barra es el que usamos para todo lo que lleve leche. Solo, en espresso, también está bien. En filtrado no lo recomendamos: sin la presión pierde el cuerpo, que es justamente su gracia, y queda pesado y sin brillo.",
    ].join("\n\n"),
  },

  {
    clave: "narino",
    nombre: "Nariño, Colombia",
    origen: "Nariño, Colombia",
    proceso: "honey",
    altura: 2100,
    perfil: "medio",
    precio: 1680000,
    // Agotado. Es el lote más chico y se termina siempre antes que los otros.
    stock: false,
    ficha: [
      "El Nariño viene del sur de Colombia, casi en la frontera con Ecuador, a 2.100 metros: es el más alto de los cuatro. La altura importa acá más que en ningún otro origen, porque a esa altitud la planta madura la cereza mucho más lento y el grano se pone denso y azucarado. Lo produce un grupo de doce familias que juntan su cosecha para poder vender un lote del tamaño que a nosotros nos sirve. Compramos 180 kilos por año, que es el lote más chico de la carta y el primero que se agota.",

      "Es un honey, que está a mitad de camino entre el lavado y el natural. Se despulpa la cereza pero no se lava: el grano se seca con el mucílago pegado, esa capa pegajosa y dulce que queda entre la pulpa y el grano, de ahí el nombre. Es el proceso más difícil de los tres, porque el mucílago fermenta rápido y hay que controlar el secado casi hora por hora. Cuando sale bien, tenés la limpieza de un lavado con el dulzor de un natural.",

      "Lo tostamos medio, trece minutos, un poco más largo que el Huila. Este café tiene tanto azúcar que un tueste corto lo deja crudo y verdoso, y uno largo lo pone a caramelo quemado enseguida. La ventana es angosta, de unos veinte segundos, y es el lote con el que más tandas descartamos.",

      "En taza da durazno, miel y fruta madura. Es dulce de una manera que sorprende a la gente que lo prueba por primera vez, casi como si tuviera azúcar agregada. Tiene cuerpo medio y una acidez suave, redonda, que no molesta a nadie.",

      "Va en espresso, y ahí es donde se luce: la presión concentra el dulzor y sale un shot que no necesita nada. En filtrado también está bien, aunque pierde un poco de esa densidad. Es el más caro de los cuatro y el que menos dura, así que si lo ves en el mostrador y te interesa, llevalo, porque la semana que viene probablemente no esté.",
    ].join("\n\n"),
  },
];
