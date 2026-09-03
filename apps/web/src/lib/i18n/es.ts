/**
 * Diccionario en español. Es la fuente: el inglés se tipa contra este objeto,
 * así que agregar una clave acá obliga a traducirla allá o el build falla.
 */
export const es = {
  nav: {
    inicio: "Inicio",
    cafeteria: "Cafetería",
    granos: "Granos",
    inicioAria: "BRUMA, inicio",
    idioma: "Ver en inglés",
  },

  hero: {
    etiqueta: "Palermo · Café de especialidad",
    eslogan: "Tostado a la vista",
    titulo: "Un café que vale levantarse.",
    bajada:
      "Desayunos, medialunas del día y café tostado acá adentro, en la tostadora que está en el salón.",
    horario: "Abierto de 7:30 a 20:00 · Cabrera 4680",
    verCarta: "Ver la carta",
    dondeEstamos: "Dónde estamos",
    alt: "Un barista sirve la leche en una taza de BRUMA, sobre la máquina de café del salón",
  },

  lugar: {
    etiqueta: "El lugar",
    titulo: "Podés quedarte toda la mañana.",
    texto:
      "Doce mesas, enchufes en casi todas y nadie que te venga a apurar con la cuenta. Se viene a desayunar, a quedarse a trabajar un rato, o a encontrarse con alguien y estirar la sobremesa.",
    altSalon: "Salón de BRUMA una mañana, con mesas ocupadas y luz entrando por el ventanal",
    acompanarTitulo: "Y algo para acompañar, obvio.",
    acompanarTexto:
      "Medialunas que llegan a la mañana y se terminan al mediodía, tostados, budines del día. Nada congelado, nada que sobre para mañana.",
    altMesa: "Mesa servida con dos flat whites y medialunas, y una mano alcanzando una taza",
    abrimos: "Abrimos",
    cerramos: "Cerramos",
    mesas: "Mesas",
    wifi: "Wi-fi",
    wifiSi: "Sí",
  },


  recorrido: {
    etiqueta: "El recorrido completo",
    titulo: "Todo esto pasa acá adentro.",
    texto:
      "Desde que llega el grano crudo hasta que te lo sirven pasan cinco pasos, y los cinco ocurren en el salón, a la vista.",
  },

  estaciones: {
    verde: {
      momento: "01 · Llega",
      titulo: "Así es el café antes de ser café.",
      texto:
        "Verde, duro y sin olor a nada. Compramos el grano crudo por lote chico y lo guardamos acá hasta el día que le toca. Nadie lo tostó antes que nosotros.",
      datoLabel: "Guji, Etiopía · lote de 18 kg",
      alt: "Granos de café crudo, de color verde apagado, cayendo de una bolsa de arpillera sobre una mesada clara",
    },
    tostadora: {
      momento: "02 · Se tuesta",
      titulo: "La máquina está en el salón, no en un depósito.",
      texto:
        "Podés sentarte a dos metros y mirarlo. El grano entra verde, pasa por amarillo y avanza hasta el punto que le rinde a cada origen. Cuando escuchás el primer crack, faltan cuatro minutos.",
      datoLabel: "Al primer crack · descarga a 212 °C",
      alt: "Tostadora de tambor funcionando dentro del local, con la ventanilla iluminada y el ventanal a la calle detrás",
    },
    molino: {
      momento: "03 · Se muele",
      titulo: "Se muele cuando lo pedís, no antes.",
      texto:
        "El café molido pierde la mitad de lo que tiene en quince minutos. Por eso el molino está en la barra y no atrás: cada taza se muele para esa taza.",
      datoLabel: "Lo que tarda en perder el aroma",
      alt: "Café recién molido cayendo del molino sobre una bandeja de acero, con polvo de café suspendido en la luz",
    },
    taza: {
      momento: "04 · Se sirve",
      titulo: "Y recién ahí llega a la mesa.",
      texto:
        "Espresso, filtrado o con leche, según lo que le rinda al grano de la semana. Si no sabés cuál pedir, preguntale a Brumita o al que está en la barra.",
      datoLabel: "De extracción · 18 g en 36 g",
      alt: "Espresso cayendo del portafiltro a una taza de cerámica blanca sobre la bandeja de la máquina, visto de costado",
    },
    bolsa: {
      momento: "05 · Si querés",
      titulo: "Y si te gustó, llevátelo.",
      texto:
        "No hace falta comprar nada para venir: la mayoría toma su café y listo. Pero si querés seguirlo en casa, es el mismo grano de la barra, en bolsa de 250 g y tostado el mismo día. La fecha va impresa — si tiene más de dos semanas, no te lo vendemos.",
      datoLabel: "Máximo entre el tueste y el mostrador",
      alt: "Bolsa de café de BRUMA con el logo impreso, de pie sobre una mesa del salón, con algunos granos tostados al lado",
    },
  },

  catalogo: {
    titulo: "¿Querés ver qué hay?",
    laCarta: "La carta",
    laCartaNota: "Café, desayunos y pastelería",
    losGranos: "Los granos",
    losGranosNota: "Para llevarte a tu casa",
    altMesa: "Mesa servida con cafés y medialunas",
    altBolsa: "Bolsa de café de BRUMA con el logo impreso",
  },

  brumita: {
    etiqueta: "Preguntale a Brumita",
    titulo: "¿No sabés cuál pedir?",
    texto:
      "Brumita atiende como atendería alguien de la barra: sabe qué grano hay, cómo se prepara cada uno y qué entra en la carta de hoy. Si no sabe algo, te lo dice — no te lo inventa.",
    alt: "Manos de barista terminando un cappuccino en la barra de BRUMA",
    preguntas: [
      "¿Qué grano me recomendás para tomar con leche?",
      "Me sale amargo en casa, ¿qué estoy haciendo mal?",
      "¿Qué tienen para desayunar hasta $10.000?",
      "¿Qué diferencia hay entre el lavado y el natural?",
    ],
    // La conversación
    abrir: "Preguntale a Brumita",
    cerrar: "Cerrar",
    cerrarAria: "Cerrar la conversación",
    rol: "Barista de BRUMA",
    empezar: "Para empezar",
    limpiar: "Borrar la conversación",
    campo: "Escribí tu pregunta",
    marcador: "Preguntá algo",
    enviar: "Preguntar",
    detener: "Detener",
    reintentar: "Probar de nuevo",
    vos: "Vos",
    ella: "Brumita",
    vacio: "Preguntale lo que le preguntarías a alguien de la barra. Sabe de la carta y de los granos que tostamos; de otra cosa, no.",
    pensando: "Pensando",
    consultando: {
      buscarProductos: "Consultando la carta",
      verGranos: "Consultando el catálogo de grano",
      buscarEnFichas: "Buscando en las fichas",
      horariosYUbicacion: "Consultando horarios y ubicación",
    },
    fuente: {
      buscarProductos: "Carta",
      verGranos: "Catálogo de grano",
      buscarEnFichas: "Fichas",
      horariosYUbicacion: "Horarios y ubicación",
    },
    fuentesEtiqueta: "Consultó",
    error: "Se cortó la respuesta. Puede ser la conexión, o que Brumita esté saturada.",
    demasiadas: "Demasiadas preguntas seguidas. Esperá un momento y volvé a intentar.",
    // Se quedó sin turnos buscando y no llegó a escribir. Se dice qué pasó sin
    // hablar de "pasos" ni de "herramientas", que no significan nada del otro lado.
    vacia: "Me quedé buscando y no llegué a contestarte. Probá de nuevo.",
    ficcion: "BRUMA no existe: es una pieza de portfolio. Los precios y los orígenes son inventados.",
  },

  cierre: {
    etiqueta: "Dónde estamos",
    titulo: "Te esperamos.",
    direccionLabel: "La dirección",
    direccion: "Cabrera 4680\nPalermo, CABA",
    nota:
      "Tostamos los martes y los viernes a la mañana. Si querés ver la máquina trabajando, vení temprano esos días.",
    alt: "Frente de BRUMA una mañana, con dos mesas en la vereda y un árbol dando sombra",
    horarios: {
      semana: "Lunes a viernes",
      sabados: "Sábados",
      domingos: "Domingos",
    },
  },

  footer: {
    descripcion: "Cafetería de especialidad con tostadora propia.",
    donde: "Dónde",
    horarios: "Horarios",
    secciones: "Secciones",
    lunVie: "Lun a vie",
    sabados: "Sábados",
    domingos: "Domingos",
    fiscalTitulo: "Esto no existe.",
    fiscal:
      "BRUMA es una marca ficticia, hecha como pieza de portfolio. No hay local, no hay café a la venta, y la dirección, los precios, los orígenes y las fechas son inventados. Los países son reales porque son geografía.",
  },

  cafeteria: {
    etiqueta: "La cafetería",
    titulo: "Lo que se sirve hoy.",
    texto:
      "Todo el café sale del grano de la semana, molido al momento. La pastelería se hornea a la mañana y se termina cuando se termina.",
    alt: "Salón de BRUMA a media mañana, con las mesas ocupadas y el barista atendiendo la barra",
    promoEtiqueta: "Antes de las 10, de lunes a viernes",
    promoTexto: "Un café a elección y una medialuna. Para el que sale corriendo.",
    agotado: "Agotado",
  },

  granosPagina: {
    etiqueta: "Para tu casa",
    titulo: "El mismo grano de la barra.",
    texto:
      "Cuatro orígenes por vez, tostados acá. Bolsas de 250 g con la fecha impresa: si tiene más de dos semanas, no te lo vendemos. Se compran en el mostrador, no por la web.",
    alt: "Bolsa de café de BRUMA con el logo impreso, sobre una mesa del salón",
    cuerpo: "Cuerpo",
    acidez: "Acidez",
    dulzor: "Dulzor",
    leRinde: "Le rinde en",
    esPara: "Es para",
    agotado: "Agotado",
    deCinco: "de 5",
    gramos: "250 g",
  },

  carta: {
    categorias: {
      cafe: { titulo: "Café", nota: "Con el grano de la semana, molido al momento" },
      acompanar: { titulo: "Para acompañar", nota: "Se hornea a la mañana y se termina" },
      desayuno: { titulo: "Desayunos", nota: "Hasta las 12" },
      grano: { titulo: "Grano en bolsa", nota: "250 g, con la fecha de tueste impresa" },
    },
    productos: {
      espresso: { nombre: "Espresso", desc: "18 g en 36 g, 25 segundos" },
      cortado: { nombre: "Cortado", desc: "Espresso con un toque de leche" },
      flatWhite: { nombre: "Flat white", desc: "El que más sale" },
      v60: { nombre: "Filtrado V60", desc: "Para el origen de la semana, en taza chica" },
      coldBrew: { nombre: "Cold brew", desc: "18 horas en frío" },
      medialuna: { nombre: "Medialuna", desc: "De manteca, glaseadas a la mañana" },
      tostado: { nombre: "Tostado de jamón y queso", desc: "En pan de masa madre" },
      budin: { nombre: "Budín del día", desc: "Hoy: limón y amapola" },
      alfajor: { nombre: "Alfajor de maicena", desc: "Con dulce de leche y coco" },
      desayunoBruma: {
        nombre: "Desayuno BRUMA",
        desc: "Café a elección, dos medialunas y jugo exprimido",
      },
      desayunoCompleto: {
        nombre: "Desayuno completo",
        desc: "Café a elección, tostado y jugo exprimido",
      },
      promo: { nombre: "Café + medialuna", desc: "Antes de las 10, de lunes a viernes" },
      guji: { nombre: "Guji, Etiopía", desc: "Lavado. Cítrico y floral, liviano en taza" },
      huila: { nombre: "Huila, Colombia", desc: "Lavado. Caramelo y naranja, equilibrado" },
      cerrado: {
        nombre: "Cerrado, Brasil",
        desc: "Natural. Chocolate y nuez, el que mejor aguanta la leche",
      },
      narino: { nombre: "Nariño, Colombia", desc: "Honey. Dulce, con cuerpo" },
    },
  },

  fichas: {
    guji: {
      proceso: "Lavado",
      perfil: "Claro",
      notas: ["Bergamota", "Jazmín", "Té negro"],
      metodo: "V60 o filtrado",
      para: "El que quiere probar algo distinto a lo que toma siempre",
    },
    huila: {
      proceso: "Lavado",
      perfil: "Medio",
      notas: ["Caramelo", "Naranja", "Panela"],
      metodo: "Cualquiera",
      para: "El que no sabe cuál elegir. Nunca falla",
    },
    cerrado: {
      proceso: "Natural",
      perfil: "Medio oscuro",
      notas: ["Chocolate", "Nuez", "Maní tostado"],
      metodo: "Espresso y con leche",
      para: "El que lo toma con leche todas las mañanas",
    },
    narino: {
      proceso: "Honey",
      perfil: "Medio",
      notas: ["Durazno", "Miel", "Fruta madura"],
      metodo: "Espresso",
      para: "El que ya sabe lo que le gusta",
    },
  },

  meta: {
    home: {
      titulo: "BRUMA — Café de especialidad, tostado a la vista",
      desc: "Cafetería de especialidad con tostadora propia en el local. Tostamos, molemos y servimos a puertas abiertas.",
    },
    cafeteria: {
      titulo: "La carta — BRUMA",
      desc: "Café, desayunos y pastelería del día en BRUMA, Palermo.",
    },
    granos: {
      titulo: "Granos — BRUMA",
      desc: "Los orígenes que tostamos en el local, en bolsa de 250 g con la fecha de tueste impresa.",
    },
  },

  // Las dos pantallas que nadie busca. El registro es el mismo que el del resto
  // del sitio: se dice qué pasó y qué se puede hacer, sin pedir disculpas ni
  // hacer un chiste de café.
  errores: {
    noEncontrada: {
      etiqueta: "404",
      titulo: "Esta página no está.",
      texto:
        "El link puede estar viejo o mal escrito. Desde el inicio se llega a todo: son tres páginas.",
      volver: "Ir al inicio",
    },
    roto: {
      etiqueta: "Error",
      titulo: "Se rompió algo de este lado.",
      texto:
        "No es tu conexión. Probá de nuevo; si vuelve a pasar, el resto del sitio sigue funcionando.",
      reintentar: "Probar de nuevo",
      volver: "Ir al inicio",
    },
  },
} as const;

/**
 * El diccionario con los tipos ensanchados: `as const` deja literales como
 * "Inicio", y una traducción es un string cualquiera. Este tipo es el contrato
 * que cumplen ambos idiomas — si falta una clave, no compila.
 */
export type Textos = Traducible<typeof es>;

type Traducible<T> = {
  readonly [K in keyof T]: T[K] extends readonly string[]
    ? readonly string[]
    : T[K] extends string
      ? string
      : Traducible<T[K]>;
};
