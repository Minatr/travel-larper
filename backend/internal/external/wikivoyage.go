package external

import (
	"context"
	"fmt"
	"net/url"
	"strings"
)

// WikivoyageURL is the summary endpoint of a Wikivoyage edition; %s is its language code.
const WikivoyageURL = "https://%s.wikivoyage.org/api/rest_v1/page/summary/"

// Summary is the first paragraph of a Wikivoyage article, and the article's address.
type Summary struct {
	Text string
	URL  string
}

// Wikivoyage reads the summary of an article.
type Wikivoyage struct {
	client     *jsonClient
	baseFormat string
}

// NewWikivoyage creates a Wikivoyage client; baseFormat is WikivoyageURL outside tests.
func NewWikivoyage(baseFormat string, options Options) *Wikivoyage {
	return &Wikivoyage{client: newJSONClient(options), baseFormat: baseFormat}
}

type wikivoyageAnswer struct {
	Type        string `json:"type"`
	Extract     string `json:"extract"`
	ContentURLs struct {
		Desktop struct {
			Page string `json:"page"`
		} `json:"desktop"`
	} `json:"content_urls"`
}

// Summary returns the summary of the article `title` of the Wikivoyage in `language`, and ErrNotFound when there is
// no such article or it has no text. `language` must be one of the app's: it goes into the host name.
func (w *Wikivoyage) Summary(ctx context.Context, language, title string) (Summary, error) {
	address := fmt.Sprintf(w.baseFormat, language) + url.PathEscape(strings.ReplaceAll(title, " ", "_"))
	var answer wikivoyageAnswer
	if err := w.client.get(ctx, address, nil, &answer); err != nil {
		return Summary{}, err
	}
	// A disambiguation page lists other articles: no summary of the country.
	if answer.Type == "disambiguation" || strings.TrimSpace(answer.Extract) == "" {
		return Summary{}, ErrNotFound
	}
	return Summary{Text: strings.TrimSpace(answer.Extract), URL: answer.ContentURLs.Desktop.Page}, nil
}
