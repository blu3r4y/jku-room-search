import dayjs from "dayjs";
import * as cheerio from "cheerio";

import { ScraperComponent } from "./base";
import { TimeUtils } from "../../common/utils";
import { CourseScrape, BookingScrape, COURSE_DETAILS } from "../types";

export class BookingScraper extends ScraperComponent<BookingScrape[]> {
  public async scrape(course: CourseScrape): Promise<BookingScrape[]> {
    let courseDetails = COURSE_DETAILS;
    courseDetails = courseDetails
      .replace("{{courseclassid}}", encodeURIComponent(course.courseclassid))
      .replace("{{coursegroupid}}", encodeURIComponent(course.coursegroupid))
      .replace("{{showdetails}}", encodeURIComponent(course.showdetails));
    const url = this.scraper.kusssUrl + courseDetails;
    const ch: cheerio.CheerioAPI = await this.scraper.request(url);

    // select the <tbody> which holds the date and times ...
    const values = ch("table.subinfo > tbody > tr table > tbody")
      // select the <tr> children (rows)
      // then, remove the first row which is the header
      .children("tr")
      .slice(1)
      .map((_, el) => {
        // select the <td> children (columns)
        // and ignore col-spanning description fields, i.e. ensure that there are 4 columns
        const tds = ch(el).children("td");
        if (tds.length === 4) {
          return {
            date: tds.eq(1).text().trim(),
            time: tds.eq(2).text().trim(),
            room: tds.eq(3).text().trim(),
          };
        }
      });

    const dateFormat = "DD.MM.YY";
    const bookings: BookingScrape[] = values
      .get()
      .map((t: { date: string; time: string; room: string }) => {
        const times = t.time.split(" – ");
        return {
          room: t.room,
          date: dayjs(t.date, dateFormat),
          from: TimeUtils.fromString(times[0].trim()),
          to: TimeUtils.fromString(times[1].trim()),
        };
      });

    this.scraper.statistics.nScrapedBookings += bookings.length;

    return bookings;
  }
}
