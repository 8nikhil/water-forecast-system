
import requests
import pandas as pd
import time
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
from collections import deque

BASE_URL = "https://www.flowless.co/"
DOMAIN = urlparse(BASE_URL).netloc

HEADERS = {
    "User-Agent": "EducationalWebsiteResearchBot/1.0"
}

MAX_PAGES = 30

session = requests.Session()
session.headers.update(HEADERS)

visited = set()
queue = deque([BASE_URL])
results = []

# Check robots.txt permissions
robots_url = urljoin(BASE_URL, "/robots.txt")
robots = RobotFileParser()
robots.set_url(robots_url)

try:
    robots.read()
except Exception:
    print("Could not read robots.txt. Check permissions manually.")

def allowed(url):
    return robots.can_fetch(HEADERS["User-Agent"], url)

def clean_text(element):
    for tag in element.select(
        "script, style, nav, footer, header, noscript"
    ):
        tag.decompose()

    return re.sub(
        r"\s+", " ", element.get_text(" ", strip=True)
    )

def scrape_page(url):
    try:
        if not allowed(url):
            print("Blocked by robots.txt:", url)
            return []

        response = session.get(url, timeout=20)
        response.raise_for_status()

        content_type = response.headers.get(
            "Content-Type", ""
        )

        if "text/html" not in content_type:
            return []

        soup = BeautifulSoup(response.text, "lxml")

        title = (
            soup.title.get_text(strip=True)
            if soup.title else ""
        )

        description = ""
        meta = soup.find(
            "meta", attrs={"name": "description"}
        )

        if meta:
            description = meta.get("content", "")

        headings = [
            h.get_text(" ", strip=True)
            for h in soup.select("h1, h2, h3")
        ]

        content = soup.find("main") or soup.body or soup
        page_text = clean_text(content)

        results.append({
            "url": url,
            "title": title,
            "description": description,
            "headings": " | ".join(headings),
            "content": page_text
        })

        links = []

        for a in soup.find_all("a", href=True):
            link = urljoin(url, a["href"])
            parsed = urlparse(link)

            if (
                parsed.scheme in ("http", "https")
                and parsed.netloc == DOMAIN
            ):
                link = parsed._replace(
                    fragment=""
                ).geturl()

                links.append(link)

        print("Scraped:", url)

        return links

    except requests.RequestException as error:
        print("Error:", url, error)
        return []

# Try sitemap first
sitemap_url = urljoin(BASE_URL, "sitemap.xml")

try:
    response = session.get(sitemap_url, timeout=20)
    response.raise_for_status()

    sitemap = BeautifulSoup(response.text, "xml")

    for loc in sitemap.find_all("loc"):
        page_url = loc.get_text(strip=True)

        if urlparse(page_url).netloc == DOMAIN:
            queue.append(page_url)

except requests.RequestException:
    print("Sitemap unavailable. Using internal links.")

# Crawl public pages
while queue and len(visited) < MAX_PAGES:

    current_url = queue.popleft()

    if current_url in visited:
        continue

    visited.add(current_url)

    new_links = scrape_page(current_url)

    for link in new_links:
        if link not in visited:
            queue.append(link)

    time.sleep(2)

# Save extracted information
df = pd.DataFrame(results)

df.to_csv(
    "flowless_website_data.csv",
    index=False,
    encoding="utf-8-sig"
)

print("\nScraping completed!")
print("Total pages visited:", len(visited))
print("Total pages collected:", len(results))
print("Saved: flowless_website_data.csv")
