import axios from "axios";
import { JSDOM } from "jsdom";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

interface SeoData {
  url: string;
  title: string;
  h1: string;
  metaDescription: string;
  statusCode: number;
}

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Safari/604.1.38",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:56.0) Gecko/20100101 Firefox/56.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Safari/604.1.38",
];

function randomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function makeRequest(url: string): Promise<any> {
  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": randomUserAgent() },
      timeout: 10000,
    });
    return response;
  } catch (error) {
    return null;
  }
}

function isSitemap(urls: string[]): [string[], string[]] {
  const sitemapFiles: string[] = [];
  const pages: string[] = [];

  urls.forEach((page) => {
    if (page.includes("xml")) {
      console.log("Found Sitemap", page);
      sitemapFiles.push(page);
    } else {
      pages.push(page);
    }
  });

  return [sitemapFiles, pages];
}

async function extractSitemapURLs(startURL: string): Promise<string[]> {
  const toCrawl: string[] = [];
  const visited: Set<string> = new Set();

  async function crawl(url: string) {
    if (visited.has(url)) return;
    visited.add(url);

    const response = await makeRequest(url);
    if (!response) return;

    const urls = extractUrls(response.data);
    const [sitemapFiles, pages] = isSitemap(urls);

    toCrawl.push(...pages);

    for (const sitemapUrl of sitemapFiles) {
      await crawl(sitemapUrl);
    }
  }

  await crawl(startURL);
  return toCrawl;
}

function extractUrls(content: string): string[] {
  const dom = new JSDOM(content);
  const document = dom.window.document;
  const locations = document.querySelectorAll("loc");
  return Array.from(locations).map((loc) => loc.textContent || "");
}

async function scrapePage(url: string): Promise<SeoData | null> {
  const response = await makeRequest(url);
  if (!response) return null;

  const dom = new JSDOM(response.data);
  const document = dom.window.document;

  return {
    url: url,
    statusCode: response.status,
    title: document.querySelector("title")?.textContent || "",
    h1: document.querySelector("h1")?.textContent || "",
    metaDescription:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") || "",
  };
}

async function scrapeSitemap(
  url: string,
  concurrency: number
): Promise<SeoData[]> {
  const urls = await extractSitemapURLs(url);
  const results: SeoData[] = [];

  // Simple concurrency control
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((url) => scrapePage(url)));
    results.push(...batchResults.filter((r): r is SeoData => r !== null));
  }

  return results;
}

function findSitemap(baseURL: string): string[] {
  const commonPaths = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap1.xml",
    "/robots.txt",
    "/de/sitemap/sitemap.xml",
  ];

  return commonPaths.map((path) => new URL(path, baseURL).toString());
}

function parseRobotsTxt(contents: string, baseURL: string): string[] {
  const sitemaps: string[] = [];
  const lines = contents.split("\n");

  for (const line of lines) {
    if (line.toLowerCase().startsWith("sitemap:")) {
      let sitemapURL = line.split(":")[1].trim();
      if (!sitemapURL.startsWith("http")) {
        sitemapURL = new URL(sitemapURL, baseURL).toString();
      }
      sitemaps.push(sitemapURL);
    }
  }

  return sitemaps;
}

async function main() {
  const baseURL = process.argv[2] || "https://example.com";
  console.log("Searching for sitemaps...");

  const potentialSitemaps = findSitemap(baseURL);
  const sitemapURLs: string[] = [];

  for (const url of potentialSitemaps) {
    try {
      const response = await makeRequest(url);
      if (response && response.status === 200) {
        if (url.endsWith("robots.txt")) {
          sitemapURLs.push(...parseRobotsTxt(response.data, baseURL));
        } else {
          sitemapURLs.push(url);
        }
      }
    } catch (error) {
      console.log("No sitemap found at", url);
    }
  }

  if (sitemapURLs.length === 0) {
    console.log("No sitemaps found.");
    return;
  }

  const results: SeoData[] = [];
  for (const sitemapURL of sitemapURLs) {
    console.log("Scraping sitemap:", sitemapURL);
    results.push(...(await scrapeSitemap(sitemapURL, 10)));
  }

  const outputFileName = path.join(__dirname, "..", "output.json");
  fs.writeFileSync(outputFileName, JSON.stringify(results, null, 2));
  console.log("Done. Results written to", outputFileName);
}

main().catch(console.error);
