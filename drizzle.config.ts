import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

export default defineConfig({
	schema: "./src/database/schema/**.schema.ts",
	out: "./src/drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		host: process.env.DB_HOST || "127.0.0.1",
		port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
		user: process.env.DB_USERNAME || "",
		password: process.env.DB_PASSWORD || "",
		database: process.env.DB_DATABASE || "",
	},
	strict: true,
});
