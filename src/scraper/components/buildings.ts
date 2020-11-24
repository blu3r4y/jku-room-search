import { Logger } from "../log";
import { ScraperComponent } from "./base";
import { BuildingScrape, BUILDINGS_PAGE } from "../types";

export class BuildingScraper extends ScraperComponent<BuildingScrape[]> {
  public async scrape(): Promise<BuildingScrape[]> {
    const url = this.scraper.jkuUrl + BUILDINGS_PAGE;
    const ch: cheerio.Root = await this.scraper.request(url);

    // select the <article> elements inside <div class="stripe_element"> ...
    const values = ch("div.stripe_element > article").map((_, el) => {
      return {
        // select the first <h3> child inside <article>
        // ... of which we get and remove all its other nested html elements
        // only to return back and get the remaining header text inside the <h3>
        header: ch(el).children("h3").first().children().remove().end().text(),
        // select the first <a class="stripe_tbn"> child inside <article>
        // and retrieve its "href" attribute
        href: ch(el).children("a.stripe_btn").first().attr("href"),
      };
    });

    const buildings: BuildingScrape[] = values
      .get()
      .map((t: { header: string; href: string }) => {
        // check for a link to '/buildings/' and not some other site
        const match = t.href.match(/buildings\/(.*?)\//);
        if (match == null) {
          return null;
        }

        return {
          // remove whitespace and leading numbers from the name
          name: t.header
            .trim()
            .replace(/\s+/g, " ")
            .replace(/^\d+\s+/, ""),
          url: match[1],
        };
      })
      // filter out ignored buildings and map the remaining objects
      .filter((x) => x)
      .map((x) => x as BuildingScrape);

    this.scraper.statistics.scrapedBuildings += buildings.length;
    Logger.info(
      `scraped ${buildings.length} building names`,
      "buildings",
      undefined,
      undefined,
      buildings.length === 0
    );
    Logger.info(
      buildings.map((building: BuildingScrape) => building.name),
      "buildings"
    );

    return buildings;
  }
}
