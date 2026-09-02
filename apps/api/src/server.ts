import { crearApp } from "./app.ts";
import { revisarIndice } from "./rag/estado.ts";

const puerto = Number(process.env.PORT ?? 3001);

crearApp().listen(puerto, () => {
  console.log(`API de BRUMA escuchando en http://localhost:${puerto}`);

  // Despues de escuchar y sin await: es un diagnostico, no una precondicion.
  // Si la base todavia no atiende o la consulta falla, el servidor tiene que
  // levantar igual — Brumita responde carta y horarios sin tocar el indice.
  revisarIndice().catch((e) => {
    console.warn("No se pudo revisar el indice vectorial:", e instanceof Error ? e.message : e);
  });
});
