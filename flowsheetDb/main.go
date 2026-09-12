package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/glebarez/go-sqlite"
	"github.com/pressly/goose/v3"
)

const (
	dbDir         = "db"
	dbPath        = dbDir + "/flowsheet.db"
	migrationsDir = "migrations"
)

func main() {
	if err := os.MkdirAll(dbDir, 0o755); err != nil {
		log.Fatal(err)
	}

	// connect
	db, err := sql.Open("sqlite", "file:"+dbPath+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := goose.SetDialect("sqlite3"); err != nil {
		log.Fatal(err)
	}

	if err := goose.Up(db, migrationsDir); err != nil {
		log.Fatal(err)
	}
}
