package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestEnsureDatabaseDirCreatesParentDirectories(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "projects", "example", "example.fgc")

	if err := ensureDatabaseDir(dbPath); err != nil {
		t.Fatalf("ensureDatabaseDir() error = %v", err)
	}

	info, err := os.Stat(filepath.Dir(dbPath))
	if err != nil {
		t.Fatalf("stat database directory: %v", err)
	}
	if !info.IsDir() {
		t.Fatalf("database parent is not a directory")
	}
}

func TestCreateDatabaseFileRejectsExistingFile(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "example.fgc")

	if err := createDatabaseFile(dbPath); err != nil {
		t.Fatalf("first createDatabaseFile() error = %v", err)
	}
	if err := createDatabaseFile(dbPath); err == nil {
		t.Fatal("second createDatabaseFile() unexpectedly succeeded")
	}
}
