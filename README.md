# Sitemap Scraper

A TypeScript-based tool for scraping sitemaps and extracting SEO-relevant data from web pages.

## Features

- Automatically finds and parses sitemaps from a given base URL
- Extracts URLs from XML sitemaps
- Scrapes individual pages for SEO data including title, H1, and meta description
- Supports concurrent scraping for improved performance
- Uses random User-Agents to avoid detection

## Installation

1. Clone this repository:
   git clone https://github.com/danielehrhardt/node-sitemap-crawler.git
2. cd sitemap-scraper
3. Install dependencies:

```
npm install
```

## Usage

Run the script with a base URL as an argument:

```
npm run scrape -- https://example.com/
```

The script will automatically search for sitemaps, parse them, and scrape the found URLs for SEO data.

## Dependencies

- axios: For making HTTP requests
- jsdom: For parsing HTML and XML
- typescript: For TypeScript support
- ts-node: For running TypeScript files directly

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for educational purposes only. Always respect websites' robots.txt files and terms of service when scraping. Use responsibly and ethically.
