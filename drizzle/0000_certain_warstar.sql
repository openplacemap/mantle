CREATE TYPE "public"."batch_type" AS ENUM('region', 'pixels', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."color_hex" AS ENUM('#000000', '#3c3c3c', '#787878', '#aaaaaa', '#d2d2d2', '#ffffff', '#600018', '#a50e1e', '#ed1c24', '#fa8072', '#e45c1a', '#ff7f27', '#f6aa09', '#f9dd3b', '#fffabc', '#9c8431', '#c5ad31', '#e8d45f', '#4a6b3a', '#5a944a', '#84c573', '#0eb968', '#13e67b', '#87ff5e', '#0c816e', '#10aea6', '#13e1be', '#0f799f', '#60f7f2', '#bbfaf2', '#28509e', '#4093e4', '#7dc7ff', '#4d31b8', '#6b50f6', '#99b1fb', '#4a4284', '#7a71c4', '#b5aef1', '#780c99', '#aa38b9', '#e09ff9', '#cb007a', '#ec1f80', '#f38da9', '#9b5249', '#d18078', '#fab6a4', '#684634', '#95682a', '#dba463', '#7b6352', '#9c846b', '#d6b594', '#d18051', '#f8b277', '#ffc5a5', '#6d643f', '#948c6b', '#cdc59e', '#333941', '#6d758d', '#b3b9d1', 'transparent');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" bigint NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" bigint NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"type" "batch_type" NOT NULL,
	"tile" smallint NOT NULL,
	"color" "color_hex" NOT NULL,
	"x1" smallint,
	"y1" smallint,
	"x2" smallint,
	"y2" smallint,
	"pixels" integer[]
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_user_id_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batch_tile_version_idx" ON "batches" USING btree ("tile");--> statement-breakpoint
CREATE INDEX "batch_user_tile_type_idx" ON "batches" USING btree ("user_id","tile","type");--> statement-breakpoint
CREATE INDEX "batch_spatial_version_idx" ON "batches" USING btree ("tile","x1","y1","x2","y2");