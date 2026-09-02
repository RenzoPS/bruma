/**
 * Carga el `.env` de la raiz para los tests de integracion.
 *
 * Los demas comandos lo reciben por `--env-file`, pero aca el proceso lo
 * arranca vitest y ese flag no llega. `loadEnvFile` es de Node, asi que hace lo
 * mismo sin sumar una dependencia solo para esto.
 *
 * La ruta se resuelve contra este archivo y no contra el cwd: los setupFiles
 * corren dentro de un worker y no conviene depender de donde quedo parado.
 */
process.loadEnvFile(new URL("../../../.env", import.meta.url));
