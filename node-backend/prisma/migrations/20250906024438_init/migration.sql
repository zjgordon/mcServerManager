-- CreateTable
CREATE TABLE "user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "server" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Stopped',
    "pid" INTEGER,
    "level_seed" TEXT,
    "gamemode" TEXT NOT NULL DEFAULT 'survival',
    "difficulty" TEXT NOT NULL DEFAULT 'normal',
    "hardcore" BOOLEAN NOT NULL DEFAULT false,
    "pvp" BOOLEAN NOT NULL DEFAULT true,
    "spawn_monsters" BOOLEAN NOT NULL DEFAULT true,
    "motd" TEXT,
    "memory_mb" INTEGER NOT NULL DEFAULT 1024,
    "owner_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "server_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "configuration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "updated_by" INTEGER,
    CONSTRAINT "configuration_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "server_server_name_key" ON "server"("server_name");

-- CreateIndex
CREATE UNIQUE INDEX "server_port_key" ON "server"("port");

-- CreateIndex
CREATE INDEX "server_status_idx" ON "server"("status");

-- CreateIndex
CREATE INDEX "server_owner_id_idx" ON "server"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_key_key" ON "configuration"("key");
