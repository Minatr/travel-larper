package services

import (
	"context"
	"errors"
	"testing"
)

type fakePinger struct {
	err error
}

func (p fakePinger) Ping(context.Context) error {
	return p.err
}

func TestHealthServiceCheck(t *testing.T) {
	tests := []struct {
		name    string
		pingErr error
		wantErr error
	}{
		{name: "database up", pingErr: nil, wantErr: nil},
		{name: "database down", pingErr: errors.New("connection refused"), wantErr: ErrDatabaseUnavailable},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewHealthService(fakePinger{err: tt.pingErr})

			err := service.Check(context.Background())

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Check() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}
