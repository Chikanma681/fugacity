package main

import (
	"database/sql"
	"errors"
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
	existing      bool
}

func parseOptions() options {
	dbPath := flag.String("path", defaultDBPath, "path to the .fgc flowsheet database")
	migrationsDir := flag.String("migrations", defaultMigrationsDir, "path to goose migrations")
	existing := flag.Bool("existing", false, "migrate an existing .fgc database")
	flag.Parse()

	return options{
		dbPath:        *dbPath,
		migrationsDir: *migrationsDir,
		existing:      *existing,
	}
}

func ensureDatabaseDir(dbPath string) error {
	dbDir := filepath.Dir(dbPath)
	if dbDir == "." || dbDir == "" {
		return nil
	}

	return os.MkdirAll(dbDir, 0o755)
}

func createDatabaseFile(dbPath string) error {
	const createExclusive = os.O_WRONLY | os.O_CREATE | os.O_EXCL

	file, err := os.OpenFile(dbPath, createExclusive, 0o600)
	if err != nil {
		if errors.Is(err, os.ErrExist) {
			return fmt.Errorf("flowsheet file already exists: %s", dbPath)
		}
		return fmt.Errorf("create flowsheet file: %w", err)
	}

	if err := file.Close(); err != nil {
		return fmt.Errorf("close flowsheet file: %w", err)
	}

	return nil
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

func initializeDatabase(options options) error {
	if err := ensureDatabaseDir(options.dbPath); err != nil {
		return err
	}
	if options.existing {
		if _, err := os.Stat(options.dbPath); err != nil {
			return err
		}
	} else {
		if err := createDatabaseFile(options.dbPath); err != nil {
			return err
		}
	}

	// connect
	db, err := sql.Open("sqlite", "file:"+options.dbPath+"?_pragma=foreign_keys(1)")
	if err != nil {
		return err
	}
	defer db.Close()

	if err := ensureApplicationID(db); err != nil {
		return err
	}

	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return err
	}

	if err := goose.SetDialect("sqlite3"); err != nil {
		return err
	}

	return goose.Up(db, options.migrationsDir)
}

func main() {
	if err := initializeDatabase(parseOptions()); err != nil {
		log.Fatal(err)
	}
}
