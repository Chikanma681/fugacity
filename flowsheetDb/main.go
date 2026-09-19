package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/glebarez/go-sqlite"
	"github.com/pressly/goose/v3"
)

const (
	dbDir         = "db"
	dbPath        = dbDir + "/flowsheet.fgc"
	migrationsDir = "migrations"

	// SQLite stores application_id as a 32-bit signed integer. "FGC1" marks Fugacity documents.
	fugacityApplicationID int32 = 0x46474331
)

func ensureApplicationID(db *sql.DB) error {
	var current int64
	if err := db.QueryRow("PRAGMA application_id").Scan(&current); err != nil {
		return err
	}

	if current == 0 {
		_, err := db.Exec(fmt.Sprintf("PRAGMA application_id = %d", fugacityApplicationID))
		return err
	}

	if current != int64(fugacityApplicationID) {
		return fmt.Errorf("database application_id mismatch: got %d, want %d", current, fugacityApplicationID)
	}

	return nil
}

func main() {
	if err := os.MkdirAll(dbDir, 0o755); err != nil {
		log.Fatal(err)
	}

	// connect
	db, err := sql.Open("sqlite", "file:"+dbPath+"?_pragma=foreign_keys(1)")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := ensureApplicationID(db); err != nil {
		log.Fatal(err)
	}

	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		log.Fatal(err)
	}

	if err := goose.SetDialect("sqlite3"); err != nil {
		log.Fatal(err)
	}

	if err := goose.Up(db, migrationsDir); err != nil {
		log.Fatal(err)
	}
}
