import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GRANOS } from "../src/db/maestros/granos.ts";
import { PRODUCTOS } from "../src/db/maestros/productos.ts";
import { horariosYUbicacion } from "../src/services/catalogo.service.ts";

describe("datos maestros", () => {
  it("no repite claves", () => {
    const claves = PRODUCTOS.map((p) => p.clave);
    expect(new Set(claves).size).toBe(claves.length);

    const clavesGrano = GRANOS.map((g) => g.clave);
    expect(new Set(clavesGrano).size).toBe(clavesGrano.length);
  });

  it("guarda los precios en centavos", () => {
    // Un precio en pesos entraria como un numero absurdamente chico. El cortado
    // no sale 3600 centavos, sale 360000.
    for (const p of PRODUCTOS) {
      expect(p.precio, `${p.clave} parece estar en pesos`).toBeGreaterThan(10_000);
      expect(Number.isInteger(p.precio), `${p.clave} tiene decimales`).toBe(true);
    }
  });

  it("cobra lo mismo por la bolsa de grano en la carta y en el catalogo", () => {
    // El grano aparece dos veces: como item de mostrador en `productos` y como
    // origen con ficha en `granos`. Si los precios se separan, Brumita contesta
    // uno distinto segun por donde entre la pregunta.
    for (const grano of GRANOS) {
      const enCarta = PRODUCTOS.find((p) => p.clave === grano.clave);
      expect(enCarta, `${grano.clave} no esta en la carta`).toBeDefined();
      expect(enCarta!.precio, `precio distinto para ${grano.clave}`).toBe(grano.precio);
      expect(enCarta!.disponible, `stock distinto para ${grano.clave}`).toBe(grano.stock);
    }
  });
});

describe("fichas de grano", () => {
  it("tiene prosa suficiente para partir en chunks", () => {
    for (const g of GRANOS) {
      const parrafos = g.ficha.split("\n\n").filter((p) => p.trim());

      // Un solo parrafo daria un solo chunk, y el retrieval no tendria entre
      // que elegir.
      expect(parrafos.length, `${g.clave} tiene pocos parrafos`).toBeGreaterThanOrEqual(3);

      for (const parrafo of parrafos) {
        expect(parrafo.length, `un parrafo de ${g.clave} es muy corto`).toBeGreaterThan(120);
      }
    }
  });

  it("usa los valores canonicos de proceso y perfil", () => {
    // Son los mismos que van a validar las tools con Zod: si aca entra "Lavado"
    // con mayuscula, el filtro exacto no encuentra nada.
    for (const g of GRANOS) {
      expect(["lavado", "natural", "honey"]).toContain(g.proceso);
      expect(["claro", "medio", "oscuro"]).toContain(g.perfil);
    }
  });
});

/**
 * El front tiene su propia copia de la carta, hardcodeada, porque renderiza sin
 * pegarle a la api. Estas dos copias pueden divergir en silencio, y el peor bug
 * posible de este proyecto es que la pagina muestre un precio y Brumita diga
 * otro. Esto es lo que lo atrapa.
 *
 * Es la unica vez que la api mira dentro del front, y pasa solo al correr los
 * tests: no hay import en runtime ni en la imagen.
 */
describe("coherencia con la carta del front", () => {
  const RUTA = new URL("../../web/src/lib/carta.ts", import.meta.url).pathname;

  it("el archivo del front esta donde se lo espera", () => {
    expect(existsSync(RUTA), `no se encontro ${RUTA}`).toBe(true);
  });

  const delFront = () => {
    const fuente = readFileSync(RUTA, "utf8");
    const filas = [
      ...fuente.matchAll(
        /\{\s*clave:\s*"([^"]+)",\s*categoria:\s*"([^"]+)",\s*precio:\s*(\d+),\s*disponible:\s*(true|false)/g,
      ),
    ];
    return filas.map(([, clave, categoria, precio, disponible]) => ({
      clave: clave!,
      categoria: categoria!,
      pesos: Number(precio),
      disponible: disponible === "true",
    }));
  };

  it("lee la carta del front", () => {
    expect(delFront().length).toBeGreaterThan(0);
  });

  it("tiene exactamente los mismos productos", () => {
    const enFront = delFront().map((p) => p.clave).sort();
    const enBase = PRODUCTOS.map((p) => p.clave).sort();

    expect(enBase).toEqual(enFront);
  });

  it("cobra lo mismo que muestra la pagina", () => {
    // El front guarda pesos y la base centavos. Cien veces, exacto.
    for (const item of delFront()) {
      const maestro = PRODUCTOS.find((p) => p.clave === item.clave);
      expect(maestro, `${item.clave} falta en los datos maestros`).toBeDefined();
      expect(maestro!.precio, `precio distinto para ${item.clave}`).toBe(item.pesos * 100);
      expect(maestro!.categoria, `categoria distinta para ${item.clave}`).toBe(item.categoria);
      expect(maestro!.disponible, `disponibilidad distinta para ${item.clave}`).toBe(
        item.disponible,
      );
    }
  });
});

/**
 * Las alturas de cada origen, que vivian dos veces y ya habian derivado.
 *
 * Medido cuando se agrego este test: de los cuatro origenes, tres no coincidian.
 * La pagina /granos decia que el Guji estaba a 1.940 msnm y la ficha —que es lo
 * que Brumita cita— decia 2.050. Igual el Cerrado (1.100 contra 1.150) y el
 * Narino (2.050 contra 2.100). Solo el Huila estaba bien.
 *
 * Es exactamente la falla que este archivo venia a cerrar para los precios, y no
 * la cerraba para la altura: alguien lee un numero en la pagina, se lo pregunta
 * a Brumita y recibe otro. La altura ademas es de los pocos datos duros que
 * tienen las fichas, asi que es de lo que mas se pregunta.
 *
 * Se comparan contra la columna `altura` y no contra la prosa de la ficha, pero
 * las dos tienen que decir lo mismo — eso lo cubre el test de abajo.
 */
describe("las alturas: la api y el front cuentan lo mismo", () => {
  const PAGINA = new URL("../../web/src/app/granos/page.tsx", import.meta.url).pathname;

  it.runIf(existsSync(PAGINA))("muestra la misma altura que tiene el catalogo", () => {
    const fuente = readFileSync(PAGINA, "utf8");
    // `guji: { altura: "2.050 msnm"` -> ["guji", "2.050"]
    const enPagina = new Map(
      [...fuente.matchAll(/(\w+):\s*\{\s*altura:\s*"([\d.]+)\s*msnm"/g)].map(
        ([, clave, altura]) => [clave!, Number(altura!.replace(".", ""))],
      ),
    );

    expect(enPagina.size, "no se leyo ninguna altura de la pagina").toBeGreaterThan(0);

    for (const grano of GRANOS) {
      const mostrada = enPagina.get(grano.clave);
      expect(mostrada, `${grano.clave} no aparece en /granos`).toBeDefined();
      expect(mostrada, `altura distinta para ${grano.clave}`).toBe(grano.altura);
    }
  });

  it("la ficha dice la misma altura que la columna", () => {
    // La columna es para filtrar y la ficha es lo que se recupera y se cita. Si
    // se separan, `verGranos` y `buscarEnFichas` contestan distinto la misma
    // pregunta, y las dos con seguridad.
    for (const grano of GRANOS) {
      if (grano.altura === null) continue;
      // "2.050 metros" o "2050 m s n m": se buscan los digitos sin separador.
      const enProsa = [...grano.ficha.matchAll(/([\d]\.?[\d]{3})\s*(?:metros|m\s?s\s?n\s?m|msnm)/g)]
        .map(([, n]) => Number(n!.replace(".", "")));

      expect(enProsa.length, `la ficha de ${grano.clave} no menciona una altura`).toBeGreaterThan(0);
      expect(enProsa, `la ficha de ${grano.clave} dice otra altura que la columna`).toContain(
        grano.altura,
      );
    }
  });
});

describe("el local: la api y el front cuentan lo mismo", () => {
  /**
   * La dirección y el horario viven dos veces: en `horariosYUbicacion()` de la
   * api y en el diccionario del front. Las dos apps son independientes —cada
   * una con su package.json y su node_modules— así que no hay un paquete
   * compartido de donde leerlo una sola vez.
   *
   * Este test es lo que las mantiene juntas, y es el mismo mecanismo con el que
   * ya se cuidan los precios de la carta: se lee el archivo del front como
   * texto, en tiempo de test, sin import en runtime ni nada de esto en la
   * imagen.
   *
   * Importa más que los precios, incluso: un precio viejo lo detecta cualquiera
   * que mire la carta, pero un horario viejo hace que Brumita le diga a alguien
   * que vaya a las 20:30 y se encuentre el local cerrado.
   */
  const DICCIONARIO = new URL("../../web/src/lib/i18n/es.ts", import.meta.url).pathname;
  const local = horariosYUbicacion();

  it.runIf(existsSync(DICCIONARIO))("dice la misma dirección que el front", () => {
    const front = readFileSync(DICCIONARIO, "utf8");
    const calle = local.direccion.split(",")[0]!.trim();

    expect(front, `el front no menciona "${calle}"`).toContain(calle);
  });

  it.runIf(existsSync(DICCIONARIO))("dice el mismo horario que el front", () => {
    const front = readFileSync(DICCIONARIO, "utf8");
    // "Todos los días de 7:30 a 20:00" -> ["7:30", "20:00"]
    const horas = local.horario.match(/\d{1,2}:\d{2}/g) ?? [];

    expect(horas.length, "el horario de la api no trae dos horas").toBe(2);
    for (const hora of horas) {
      expect(front, `el front no menciona ${hora}`).toContain(hora);
    }
  });
});
