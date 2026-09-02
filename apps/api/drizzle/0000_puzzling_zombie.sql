-- pgvector no viene habilitado por defecto y drizzle-kit no lo genera:
-- sin esta linea el tipo vector(768) de abajo no existe y la migracion falla.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"grano_id" integer NOT NULL,
	"contenido" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "granos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"origen" text NOT NULL,
	"proceso" text NOT NULL,
	"altura" integer,
	"perfil" text NOT NULL,
	"precio" integer NOT NULL,
	"ficha" text NOT NULL,
	"stock" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"categoria" text NOT NULL,
	"precio" integer NOT NULL,
	"descripcion" text,
	"disponible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_grano_id_granos_id_fk" FOREIGN KEY ("grano_id") REFERENCES "public"."granos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);