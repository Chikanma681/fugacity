package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/glebarez/go-sqlite"
	"github.com/pressly/goose/v3"
)

const (
	defaultDBPath        = "db/flowsheet.fgc"
	defaultMigrationsDir = "migrations"

	// SQLite stores application_id as a 32-bit signed integer. "FGC1" marks Fugacity documents.
	fugacityApplicationID int32 = 0x46474331
)

type options struct {
	dbPath        string
	migrationsDir string
}

func parseOptions() options {
	dbPath := flag.String("path", defaultDBPath, "path to the .fgc flowsheet database")
	migrationsDir := flag.String("migrations", defaultMigrationsDir, "path to goose migrations")
	flag.Parse()

	return options{
		dbPath:        *dbPath,
		migrationsDir: *migrationsDir,
	}
}

func ensureDatabaseDir(dbPath string) error {
	dbDir := filepath.Dir(dbPath)
	if dbDir == "." || dbDir == "" {
		return nil
	}

	return os.MkdirAll(dbDir, 0o755)
}

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
	options := parseOptions()

	if err := ensureDatabaseDir(options.dbPath); err != nil {
		log.Fatal(err)
	}

	// connect
	db, err := sql.Open("sqlite", "file:"+options.dbPath+"?_pragma=foreign_keys(1)")
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

	if err := goose.Up(db, options.migrationsDir); err != nil {
		log.Fatal(err)
	}
}
