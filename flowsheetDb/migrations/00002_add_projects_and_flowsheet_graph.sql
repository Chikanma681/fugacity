-- +goose Up
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE flowsheets ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE CASCADE;

CREATE TABLE thermo_selections (
    flowsheet_id TEXT PRIMARY KEY,
    property_package TEXT NOT NULL,
    -- JSON array of DWSIM-resolvable compound names, e.g. ["methane", "ethane", "propane"].
    compounds_json TEXT NOT NULL,
    FOREIGN KEY (flowsheet_id) REFERENCES flowsheets(id) ON DELETE CASCADE
);

CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    flowsheet_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    node_type TEXT NOT NULL CHECK (node_type IN ('material_stream', 'energy_stream', 'unit_operation')),
    unit_operation TEXT,
    -- JSON object containing user-entered simulation parameters for this node.
    -- material_stream example: {"temperature":{"value":300,"unit":"K"},"pressure":{"value":10,"unit":"bar"},"flow":{"value":100,"unit":"kmol/h"},"composition":{"methane":0.5}}
    -- unit_operation example: {"pressure":{"value":5,"unit":"bar"}}
    parameters_json TEXT NOT NULL,
    -- JSON object containing canvas-only metadata, e.g. {"x":100,"y":200}.
    layout_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flowsheet_id) REFERENCES flowsheets(id) ON DELETE CASCADE,
    UNIQUE (flowsheet_id, tag)
);

CREATE TABLE node_ports (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    name TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inlet', 'outlet')),
    medium TEXT NOT NULL CHECK (medium IN ('material', 'energy')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    UNIQUE (node_id, name)
);

CREATE TABLE connections (
    id TEXT PRIMARY KEY,
    flowsheet_id TEXT NOT NULL,
    from_node_id TEXT NOT NULL,
    from_port TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    to_port TEXT NOT NULL,
    -- JSON object containing canvas route metadata, e.g. {"points":[{"x":180,"y":200},{"x":320,"y":200}]}.
    layout_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flowsheet_id) REFERENCES flowsheets(id) ON DELETE CASCADE,
    FOREIGN KEY (from_node_id, from_port) REFERENCES node_ports(node_id, name) ON DELETE CASCADE,
    FOREIGN KEY (to_node_id, to_port) REFERENCES node_ports(node_id, name) ON DELETE CASCADE,
    FOREIGN KEY (from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE TABLE simulation_runs (
    id TEXT PRIMARY KEY,
    flowsheet_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
    -- JSON object sent to the simulation backend for this run.
    input_json TEXT NOT NULL,
    -- JSON object returned by the simulation backend on success.
    result_json TEXT,
    -- JSON object describing backend/validation errors on failure.
    error_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT,
    FOREIGN KEY (flowsheet_id) REFERENCES flowsheets(id) ON DELETE CASCADE
);

CREATE TABLE command_log (
    id TEXT PRIMARY KEY,
    flowsheet_id TEXT NOT NULL,
    actor TEXT NOT NULL CHECK (actor IN ('user', 'agent', 'system')),
    command_type TEXT NOT NULL,
    -- JSON object containing the validated command payload, e.g. {"type":"move_node","nodeId":"V-101","x":400,"y":200}.
    command_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flowsheet_id) REFERENCES flowsheets(id) ON DELETE CASCADE
);

CREATE INDEX idx_flowsheets_project_id ON flowsheets(project_id);
CREATE INDEX idx_nodes_flowsheet_id ON nodes(flowsheet_id);
CREATE INDEX idx_node_ports_node_id ON node_ports(node_id);
CREATE INDEX idx_connections_flowsheet_id ON connections(flowsheet_id);
CREATE INDEX idx_simulation_runs_flowsheet_id ON simulation_runs(flowsheet_id);
CREATE INDEX idx_command_log_flowsheet_id ON command_log(flowsheet_id);

-- +goose Down
DROP INDEX idx_command_log_flowsheet_id;
DROP INDEX idx_simulation_runs_flowsheet_id;
DROP INDEX idx_connections_flowsheet_id;
DROP INDEX idx_node_ports_node_id;
DROP INDEX idx_nodes_flowsheet_id;
DROP INDEX idx_flowsheets_project_id;

DROP TABLE command_log;
DROP TABLE simulation_runs;
DROP TABLE connections;
DROP TABLE node_ports;
DROP TABLE nodes;
DROP TABLE thermo_selections;

ALTER TABLE flowsheets DROP COLUMN project_id;

DROP TABLE projects;
