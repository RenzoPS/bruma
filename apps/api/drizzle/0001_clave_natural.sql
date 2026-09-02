ALTER TABLE "granos" ADD COLUMN "clave" text NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "clave" text NOT NULL;--> statement-breakpoint
ALTER TABLE "granos" ADD CONSTRAINT "granos_clave_unique" UNIQUE("clave");--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_clave_unique" UNIQUE("clave");