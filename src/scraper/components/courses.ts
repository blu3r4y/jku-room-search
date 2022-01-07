import * as cheerio from "cheerio";

import { Log } from "../log";
import { ScraperComponent } from "./base";
import { RoomScrape, CourseScrape, SEARCH_RESULTS } from "../types";

export class CourseScraper extends ScraperComponent<CourseScrape[]> {
  public async scrape(
    room: RoomScrape,
    progress: number | undefined = undefined
  ): Promise<CourseScrape[]> {
    if (room.kusssId == null) throw "room.kusssId can not be null here";

    const url =
      this.scraper.kusssUrl +
      SEARCH_RESULTS.replace("{{room}}", encodeURIComponent(room.kusssId));
    const ch: cheerio.CheerioAPI = await this.scraper.request(url);

    // select the <tbody> elements in the table
    const values = ch("div.contentcell > table > tbody")
      // select the last <tbody> of them
      // then, select the <tr> children (rows)
      // then, remove the first row which is the header
      .last()
      .children("tr")
      .slice(1)
      .map((_, el) =>
        // select the <td> children in each of those rows
        // then, take only the <td> (first column)
        // then, take the first <a>
        // and retrieve its "href" attribute
        ch(el).children("td").first().find("a").first().attr("href")
      );

    const courses: CourseScrape[] = values
      .get()
      .map((href: string) => href.trim())
      .map((href: string) => {
        // extract the url parameters
        const params = new URLSearchParams(href.split("?")[1]);
        const cid = params.get("courseclassid");
        const gid = params.get("coursegroupid");
        const det = params.get("showdetails");

        if (cid && gid && det) {
          return { courseclassid: cid, coursegroupid: gid, showdetails: det };
        } else {
          throw Error(
            "required parameters 'courseclassid', 'coursegroupid', 'showdetails' " +
              `are missing in '${href}'`
          );
        }
      });

    this.scraper.statistics.nScrapedCourses += courses.length;
    Log.scrape(
      "course",
      `scraped ${courses.length} course numbers for room '${room.name}'`,
      courses.length,
      progress
    );

    return courses;
  }
}
