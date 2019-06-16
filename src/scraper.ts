import cheerio from "cheerio";
import http from "http";
import request from "request";

import { Logger } from "./log";

/* globals*/

// TODO: just for debugging purpose
const SCRAPER_BASE_URL = "https://mario.ac";
const SCRAPER_USER_AGENT = "jku-room-search-bot/0.1 (+https://github.com/blu3r4y/jku-room-search)";

// webpack will declare this global variables for us
// declare var SCRAPER_BASE_URL: string;
// declare var SCRAPER_USER_AGENT: string;

const SEARCH_PAGE = "/kusss/coursecatalogue-start.action?advanced=true";
const SEARCH_RESULTS = "/kusss/coursecatalogue-search-lvas.action?sortParam0courses=lvaName&asccourses=true" +
    "&detailsearch=true&advanced=%24advanced&lvaName=&abhart=all&organisationalHint=&lastname=&firstname=" +
    "&lvaNr=&klaId=&type=all&curriculumContentKey=all&orgid=Alle&language=all&day=all&timefrom=all&timeto=all" +
    "&room={{room}}+&direct=true#result";
const COURSE_DETAILS = "/kusss/selectcoursegroup.action?coursegroupid={{coursegroupid}}&showdetails={{showdetails}}" +
    "&abhart=all&courseclassid={{courseclassid}}";

/* scraper logic */

declare interface IRoom {
    htmlValue: string;
    id: number;
    name: string;
}

declare interface ICourse {
    courseclassid: number;
    coursegroupid: number;
    showdetails: number;
}

class JkuRoomScraper {

    private headers: request.CoreOptions;

    constructor() {
        // set request headers
        this.headers = { headers: { "User-Agent": SCRAPER_USER_AGENT } };
    }

    public scrape() {
        // request frontpage and scrape room names
        this.scrapeRooms((rooms: IRoom[]) => {
            for (const room of rooms) {
                // perform search and scrape course numbers
                this.scrapeCourses(room, (courses: ICourse[]) => Logger.info("done"));
            }
        });
    }

    private scrapeRooms(callback: (rooms: IRoom[]) => void) {
        const url = SCRAPER_BASE_URL + SEARCH_PAGE;
        this.request(url, (ch: CheerioStatic) => {
            const values = ch("select#room > option")  // the <option> children of <select id="room">
                .slice(1)                              // remove the first 'all' <option>
                .map((i, el) => {                      // the 'value' attr of each <option>
                    return {
                        name: ch(el).text(),
                        value: ch(el).val(),
                    };
                });

            // build room objects
            let rid = 0;
            const rooms: IRoom[] = values.get().map((pair: { name: string, value: string }) => {
                return {
                    htmlValue: pair.value,
                    id: rid++,
                    name: pair.name.trim().replace(/\s+/g, " "),
                };
            });

            Logger.info(`scraped ${rooms.length} room names`, "rooms", null, rooms.length === 0);

            if (rooms.length > 0) {
                Logger.info(rooms.map((room: IRoom) => room.name));
                callback(rooms);
            }

        });
    }

    private scrapeCourses(room: IRoom, callback: (courses: ICourse[]) => void) {
        const url = SCRAPER_BASE_URL + SEARCH_RESULTS.replace("{{room}}", encodeURIComponent(room.htmlValue));
        this.request(url, (ch: CheerioStatic) => {
            const hrefs = ch("div.contentcell > table > tbody").last()  // the last <tbody> in the div.contentcell
                .children("tr").slice(1)                                // the <tr> children (rows)
                .slice(1)                                               // remove the first row which is the header
                .map((i, el) => ch(el).children("td").first()           // the first <td> (first column) in each <tr>
                    .find("a").first().attr("href").trim());             // the 'href' attr of the first found <a>

            // build course objects
            const courses: ICourse[] = hrefs.get().map((href: string) => {
                const params = new URLSearchParams(href.split("?")[1]);
                return {
                    courseclassid: parseInt(params.get("courseclassid") as string, 10),
                    coursegroupid: parseInt(params.get("coursegroupid") as string, 10),
                    showdetails: parseInt(params.get("showdetails") as string, 10),
                };
            });

            Logger.info(`scraped ${courses.length} course numbers`, "courses", null, courses.length === 0);

            if (courses.length > 0) {
                callback(courses);
            }

        });
    }

    /**
     * Perform a HTTP GET request, load the HTML with Cheerio and call the supplied callback function
     *
     * @param url The URL do load with Cheerio
     * @param callback The callback function to call when done loading (optional)
     */
    private request(url: string, callback: ((ch: CheerioStatic) => void) | null | undefined = null) {
        const listener = (error: any, response: http.IncomingMessage, body: string) => {
            const code: number = response != null ? (response.statusCode != null ? response.statusCode : -1) : -1;

            Logger.info(`GET ${url}`, "request", code, code !== 200);

            // parse and callback on success
            if (response && code === 200) {
                const ch: CheerioStatic = cheerio.load(body);
                if (callback != null) {
                    callback(ch);
                }
            }

            if (error != null) {
                Logger.err(error);
            }
        };

        request.get(url, this.headers, listener);
    }
}

/* start the scraper */

const jrc = new JkuRoomScraper();
jrc.scrape();
