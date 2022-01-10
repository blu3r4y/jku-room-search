import * as cheerio from "cheerio";

import { Log } from "../log";
import { ScraperComponent } from "./base";
import { RoomScrape, BuildingScrape, SEARCH_PAGE } from "../types";

export class KusssRoomScraper extends ScraperComponent<RoomScrape[]> {
  public async scrape(): Promise<RoomScrape[]> {
    const url = this.scraper.kusssUrl + SEARCH_PAGE;
    const ch: cheerio.CheerioAPI = await this.scraper.request(url);

    // select the <option> children of <select id="room">
    const values = ch("select#room > option")
      // of those, remove the first "all" <option>
      .slice(1)
      .map((_, el) => {
        // retrieve the text and 'value' attr of each <option>
        return {
          name: ch(el).text(),
          value: ch(el).val(),
        };
      });

    const rooms: RoomScrape[] = values
      .get()
      .map((t: { name: string; value: string | string[] | undefined }) => {
        return {
          // replace whitespace from the name
          name: t.name.trim().replace(/\s+/g, " "),
          kusssId: t.value as string,
        };
      });

    this.scraper.statistics.nScrapedKusssRooms += rooms.length;
    Log.milestone(
      "room",
      `scraped ${rooms.length} bookable room names from KUSSS`,
      rooms.length
    );
    Log.obj(rooms.map((r) => r.name));

    return rooms;
  }
}

export class JkuRoomScraper extends ScraperComponent<RoomScrape[]> {
  public async scrape(
    building: BuildingScrape,
    progress: number | undefined = undefined
  ): Promise<RoomScrape[]> {
    const url = this.scraper.jkuUrl + building.url;
    const ch: cheerio.CheerioAPI = await this.scraper.request(url);

    // select all <table> elements in the body
    const values = ch(
      "div.content_container > div.text > div.body > table.contenttable"
    )
      // for each of those tables (there might be multiple) do ...
      .map((_, el) =>
        ch(el)
          // select the <tr> children (rows) - any of them, not just direct children
          // remove the first row which is the header
          .find("tr")
          .slice(1)
          .map((_, em) => {
            // only scrape 3 column-tables with room name, number, and capacity
            const tds = ch(em).children("td");
            if (tds.length === 3) {
              // if this is a lecture hall (HS), abbreviate them
              const description = tds.eq(0).text();
              const hsRegex = /(?:HS|Hörsaal|Lecture Hall) (\d+)/;
              const match = description.match(hsRegex);

              return {
                name: match ? `HS ${match[1]}` : tds.eq(1).text(),
                capacity: tds.eq(2).text(),
              };
            }
          })
      )
      // flat map the map of table rows
      .get()
      .reduce(
        (acc, x) => acc.concat(x.get()),
        [] as { name: string; capacity: string }[]
      );

    const rooms: RoomScrape[] = values.map(
      (t: { name: string; capacity: string }) => {
        return {
          // replace whitespace from the name
          name: t.name.trim().replace(/\s+/g, " "),
          capacity: parseInt(t.capacity, 10),
        };
      }
    );

    this.scraper.statistics.nScrapedJkuRooms += rooms.length;
    Log.scrape(
      "room",
      `found ${rooms.length} room entries for building '${building.name}'`,
      rooms.length,
      progress
    );

    return rooms;
  }
}
