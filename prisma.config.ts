import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url:"mongodb+srv://bishan:bBZZnbX3bBaEJ5bZ@learning.i40bkxc.mongodb.net/insta",
  },
});
