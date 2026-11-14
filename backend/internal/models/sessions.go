package models

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// FindSessionUser returns the unexpired session with this token hash and its
// user, and false when there is none.
func (q *Queries) FindSessionUser(ctx context.Context, tokenHash []byte) (GetSessionUserRow, bool, error) {
	row, err := q.GetSessionUser(ctx, tokenHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return GetSessionUserRow{}, false, nil
	}
	if err != nil {
		return GetSessionUserRow{}, false, fmt.Errorf("find session user: %w", err)
	}
	return row, true, nil
}
