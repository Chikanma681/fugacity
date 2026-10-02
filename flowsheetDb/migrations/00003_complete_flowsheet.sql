-- +goose Up
ALTER TABLE flowsheets ADD COLUMN viewport_json TEXT;

-- +goose Down
ALTER TABLE flowsheets DROP COLUMN viewport_json;
