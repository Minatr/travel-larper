// Package api holds the code generated from api/openapi.yaml: the schema
// types and the ServerInterface that the controllers must implement. Run
// `make generate` after changing the contract; never edit openapi.gen.go.
package api

//go:generate go tool oapi-codegen -config oapi-codegen.yaml ../../../api/openapi.yaml
