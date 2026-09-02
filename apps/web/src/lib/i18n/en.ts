import type { Textos } from "./es";

/**
 * English dictionary.
 *
 * Typed against the Spanish one on purpose: a missing key is a compile error,
 * not a half-translated page someone finds later.
 */
export const en: Textos = {
  nav: {
    inicio: "Home",
    cafeteria: "Café",
    granos: "Beans",
    inicioAria: "BRUMA, home",
    idioma: "Ver en español",
  },

  hero: {
    etiqueta: "Palermo · Specialty coffee",
    eslogan: "Roasted on site",
    titulo: "Coffee worth getting up for.",
    bajada:
      "Breakfast, fresh medialunas and coffee roasted right here, in the roaster sitting in the room.",
    horario: "Open 7:30 to 20:00 · Cabrera 4680",
    verCarta: "See the menu",
    dondeEstamos: "Find us",
    alt: "A barista pouring milk into a BRUMA cup, at the espresso machine in the room",
  },

  lugar: {
    etiqueta: "The place",
    titulo: "Stay the whole morning.",
    texto:
      "Twelve tables, outlets at almost all of them, and nobody rushing you with the bill. People come for breakfast, to work for a while, or to meet someone and let the conversation run long.",
    altSalon: "BRUMA's room in the morning, tables taken and daylight coming through the window",
    acompanarTitulo: "And something on the side, obviously.",
    acompanarTexto:
      "Medialunas that arrive in the morning and run out by midday, toasted sandwiches, loaf cake of the day. Nothing frozen, nothing left over for tomorrow.",
    altMesa: "A table set with two flat whites and medialunas, a hand reaching for a cup",
    abrimos: "Opens",
    cerramos: "Closes",
    mesas: "Tables",
    wifi: "Wi-Fi",
    wifiSi: "Yes",
  },


  recorrido: {
    etiqueta: "The whole run",
    titulo: "All of this happens right here.",
    texto:
      "From the moment the raw bean arrives to the moment it reaches your table there are five steps, and all five happen in the room, in plain sight.",
  },

  estaciones: {
    verde: {
      momento: "01 · Arrives",
      titulo: "This is coffee before it's coffee.",
      texto:
        "Green, hard, and it smells of nothing. We buy the raw bean in small lots and keep it here until its day comes. Nobody roasted it before we did.",
      datoLabel: "Guji, Ethiopia · 18 kg lot",
      alt: "Raw coffee beans, dull green, spilling from a burlap sack onto a pale counter",
    },
    tostadora: {
      momento: "02 · Roasted",
      titulo: "The machine is in the room, not in a warehouse.",
      texto:
        "You can sit two metres away and watch. The bean goes in green, turns yellow, and runs to whatever point each origin deserves. When you hear the first crack, there are four minutes left.",
      datoLabel: "To first crack · dropped at 212 °C",
      alt: "A drum roaster running inside the café, sight glass lit, the street window behind it",
    },
    molino: {
      momento: "03 · Ground",
      titulo: "Ground when you order it, not before.",
      texto:
        "Ground coffee loses half of what it has in fifteen minutes. That's why the grinder is on the bar and not in the back: every cup is ground for that cup.",
      datoLabel: "How long it takes to lose its aroma",
      alt: "Freshly ground coffee falling from the grinder onto a steel tray, dust caught in the light",
    },
    taza: {
      momento: "04 · Served",
      titulo: "And only then does it reach the table.",
      texto:
        "Espresso, filter or with milk, depending on what suits the week's bean. If you're not sure what to order, ask Brumita or whoever is behind the bar.",
      datoLabel: "Extraction · 18 g in, 36 g out",
      alt: "Espresso falling from the portafilter into a white ceramic cup on the machine tray, seen from the side",
    },
    bolsa: {
      momento: "05 · If you want",
      titulo: "And if you liked it, take it home.",
      texto:
        "You don't have to buy anything to come: most people have their coffee and that's it. But if you want to keep it going at home, it's the same bean from the bar, in a 250 g bag roasted that same day. The date is printed on it — if it's more than two weeks old, we won't sell it to you.",
      datoLabel: "Maximum between roast and counter",
      alt: "A BRUMA coffee bag with the logo printed, standing on a table in the room, roasted beans beside it",
    },
  },

  catalogo: {
    titulo: "Want to see what's on?",
    laCarta: "The menu",
    laCartaNota: "Coffee, breakfast and pastry",
    losGranos: "The beans",
    losGranosNota: "To take home with you",
    altMesa: "A table set with coffees and medialunas",
    altBolsa: "A BRUMA coffee bag with the logo printed",
  },

  brumita: {
    etiqueta: "Ask Brumita",
    titulo: "Not sure what to order?",
    texto:
      "Brumita helps the way someone behind the bar would: she knows what beans are in, how each one is brewed, and what's on today's menu. If she doesn't know something, she says so — she won't make it up.",
    alt: "A barista's hands finishing a cappuccino at BRUMA's bar",
    preguntas: [
      "Which bean would you recommend for milk drinks?",
      "It comes out bitter at home — what am I doing wrong?",
      "What do you have for breakfast under $10,000?",
      "What's the difference between washed and natural?",
    ],
    abrir: "Ask Brumita",
    cerrar: "Close",
    cerrarAria: "Close the conversation",
    rol: "BRUMA's barista",
    empezar: "To get started",
    limpiar: "Clear the conversation",
    campo: "Type your question",
    marcador: "Ask something",
    enviar: "Ask",
    detener: "Stop",
    reintentar: "Try again",
    vos: "You",
    ella: "Brumita",
    vacio: "Ask her what you'd ask someone behind the bar. She knows the menu and the beans we roast; anything else, she doesn't.",
    pensando: "Thinking",
    consultando: {
      buscarProductos: "Checking the menu",
      verGranos: "Checking the bean catalogue",
      buscarEnFichas: "Searching the origin notes",
      horariosYUbicacion: "Checking hours and address",
    },
    fuente: {
      buscarProductos: "Menu",
      verGranos: "Bean catalogue",
      buscarEnFichas: "Origin notes",
      horariosYUbicacion: "Hours and address",
    },
    fuentesEtiqueta: "Checked",
    error: "The answer was cut off. Could be the connection, or Brumita being busy.",
    demasiadas: "Too many questions in a row. Give it a moment and try again.",
    ficcion: "BRUMA is not a real place: it's a portfolio piece. Prices and origins are invented.",
  },

  cierre: {
    etiqueta: "Find us",
    titulo: "We'll be here.",
    direccionLabel: "The address",
    direccion: "Cabrera 4680\nPalermo, Buenos Aires",
    nota:
      "We roast on Tuesday and Friday mornings. If you want to see the machine working, come early those days.",
    alt: "BRUMA's storefront in the morning, two tables on the sidewalk under a tree",
    horarios: {
      semana: "Monday to Friday",
      sabados: "Saturdays",
      domingos: "Sundays",
    },
  },

  footer: {
    descripcion: "Specialty coffee shop with its own roaster.",
    donde: "Where",
    horarios: "Hours",
    secciones: "Sections",
    lunVie: "Mon–Fri",
    sabados: "Saturdays",
    domingos: "Sundays",
    fiscalTitulo: "This isn't real.",
    fiscal:
      "BRUMA is a fictional brand, built as a portfolio piece. There is no shop, there is no coffee for sale, and the address, the prices, the origins and the dates are all invented. The countries are real because they're geography.",
  },

  cafeteria: {
    etiqueta: "The café",
    titulo: "What's being served today.",
    texto:
      "All the coffee comes from the week's bean, ground to order. The pastry is baked in the morning and lasts until it lasts.",
    alt: "BRUMA's room mid-morning, tables taken and the barista working the bar",
    promoEtiqueta: "Before 10 am, Monday to Friday",
    promoTexto: "A coffee of your choice and a medialuna. For whoever is running late.",
    agotado: "Sold out",
  },

  granosPagina: {
    etiqueta: "For your home",
    titulo: "The same bean from the bar.",
    texto:
      "Four origins at a time, roasted here. 250 g bags with the date printed on them: if it's more than two weeks old, we won't sell it to you. Sold at the counter, not online.",
    alt: "A BRUMA coffee bag with the logo printed, on a table in the room",
    cuerpo: "Body",
    acidez: "Acidity",
    dulzor: "Sweetness",
    leRinde: "Best brewed as",
    esPara: "It's for",
    agotado: "Sold out",
    deCinco: "of 5",
    gramos: "250 g",
  },

  carta: {
    categorias: {
      cafe: { titulo: "Coffee", nota: "From the week's bean, ground to order" },
      acompanar: { titulo: "On the side", nota: "Baked in the morning, gone when it's gone" },
      desayuno: { titulo: "Breakfast", nota: "Until noon" },
      grano: { titulo: "Beans by the bag", nota: "250 g, with the roast date printed" },
    },
    productos: {
      espresso: { nombre: "Espresso", desc: "18 g in, 36 g out, 25 seconds" },
      cortado: { nombre: "Cortado", desc: "Espresso cut with a little milk" },
      flatWhite: { nombre: "Flat white", desc: "The one that sells most" },
      v60: { nombre: "V60 filter", desc: "For the week's origin, in a small cup" },
      coldBrew: { nombre: "Cold brew", desc: "18 hours cold" },
      medialuna: { nombre: "Medialuna", desc: "Butter pastry, glazed in the morning" },
      tostado: { nombre: "Ham and cheese toastie", desc: "On sourdough" },
      budin: { nombre: "Loaf cake of the day", desc: "Today: lemon and poppy seed" },
      alfajor: { nombre: "Cornstarch alfajor", desc: "With dulce de leche and coconut" },
      desayunoBruma: {
        nombre: "BRUMA breakfast",
        desc: "Coffee of your choice, two medialunas and fresh juice",
      },
      desayunoCompleto: {
        nombre: "Full breakfast",
        desc: "Coffee of your choice, a toastie and fresh juice",
      },
      promo: { nombre: "Coffee + medialuna", desc: "Before 10 am, Monday to Friday" },
      guji: { nombre: "Guji, Ethiopia", desc: "Washed. Citrus and floral, light in the cup" },
      huila: { nombre: "Huila, Colombia", desc: "Washed. Caramel and orange, balanced" },
      cerrado: {
        nombre: "Cerrado, Brazil",
        desc: "Natural. Chocolate and walnut, the one that holds up best with milk",
      },
      narino: { nombre: "Nariño, Colombia", desc: "Honey. Sweet, with body" },
    },
  },

  fichas: {
    guji: {
      proceso: "Washed",
      perfil: "Light",
      notas: ["Bergamot", "Jasmine", "Black tea"],
      metodo: "V60 or filter",
      para: "Whoever wants something different from their usual",
    },
    huila: {
      proceso: "Washed",
      perfil: "Medium",
      notas: ["Caramel", "Orange", "Panela"],
      metodo: "Anything",
      para: "Whoever can't decide. It never misses",
    },
    cerrado: {
      proceso: "Natural",
      perfil: "Medium dark",
      notas: ["Chocolate", "Walnut", "Roasted peanut"],
      metodo: "Espresso and milk drinks",
      para: "Whoever has it with milk every morning",
    },
    narino: {
      proceso: "Honey",
      perfil: "Medium",
      notas: ["Peach", "Honey", "Ripe fruit"],
      metodo: "Espresso",
      para: "Whoever already knows what they like",
    },
  },

  meta: {
    home: {
      titulo: "BRUMA — Specialty coffee, roasted in plain sight",
      desc: "A specialty coffee shop with its own roaster on site. We roast, grind and serve with the doors open.",
    },
    cafeteria: {
      titulo: "The menu — BRUMA",
      desc: "Coffee, breakfast and pastry of the day at BRUMA, Palermo.",
    },
    granos: {
      titulo: "Beans — BRUMA",
      desc: "The origins we roast on site, in 250 g bags with the roast date printed.",
    },
  },
};
