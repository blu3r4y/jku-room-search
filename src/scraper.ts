import Bottleneck from "bottleneck";
import cheerio from "cheerio";
import { DateTimeFormatter, LocalDate, LocalTime } from "js-joda";
import request from "request-promise-native";

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

/**
 * A scraped room entity
 */
declare interface IRoom {
    htmlValue: string;
    id: number;
    name: string;
}

/**
 * A scraped course entity
 */
declare interface ICourse {
    courseclassid: string;
    coursegroupid: string;
    showdetails: string;
}

/**
 * A scraped booking for some course
 * (one course usually has multiple bookings)
 */
declare interface IBooking {
    date: LocalDate;
    from: LocalTime;
    roomName: string;
    to: LocalTime;
}

class JkuRoomScraper {

    /**
     * Headers sent with every query (only contains modified User-Agent)
     */
    private headers: request.RequestPromiseOptions;

    /**
     * Job queue for GET requests
     */
    private limiter: Bottleneck;

    constructor() {
        // set request headers
        this.headers = { headers: { "User-Agent": SCRAPER_USER_AGENT }, resolveWithFullResponse: true };
        // prepare request rate-limit
        this.limiter = new Bottleneck({
            maxConcurrent: 1,
            minTime: 100,
        });
    }

    public scrape() {
        // request frontpage and scrape room names
        this.scrapeRooms((rooms: IRoom[]) => {
            for (const room of rooms) {
                // perform search and scrape course numbers
                this.scrapeCourses(room, (courses: ICourse[]) => {
                    for (const course of courses) {
                        this.scrapeBookings(course, (bookings: IBooking[]) => { /* todo */ });
                        // break;
                    }
                });
                break;
            }
        });
    }

    private scrapeRooms(callback: (rooms: IRoom[]) => void) {
        const url = SCRAPER_BASE_URL + SEARCH_PAGE;
        this.request(url).then((ch) => {
            try {
                const values = ch("select#room > option")  // the <option> children of <select id="room">
                    .slice(1)                              // remove the first 'all' <option>
                    .map((i, el) => {
                        return {
                            name: ch(el).text(),           // the text and 'value' attr of each <option>
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

            } catch (e) {
                Logger.err(e, "rooms");
            }
        });
    }

    private scrapeCourses(room: IRoom, callback: (courses: ICourse[]) => void) {
        const url = SCRAPER_BASE_URL + SEARCH_RESULTS.replace("{{room}}", encodeURIComponent(room.htmlValue));
        this.request(url).then((ch) => {
            try {

                const hrefs = ch("div.contentcell > table > tbody").last()  // the last <tbody> in the div.contentcell
                    .children("tr")                                         // the <tr> children (rows)
                    .slice(1)                                               // remove the first row which is the header
                    .map((i, el) => ch(el).children("td").first()           // the first <td> (first column) in each <tr>
                        .find("a").first().attr("href").trim());            // the 'href' attr of the first found <a>

                // build course objects
                const courses: ICourse[] = hrefs.get().map((href: string) => {
                    const params = new URLSearchParams(href.split("?")[1]);
                    const cid = params.get("courseclassid");
                    const gid = params.get("coursegroupid");
                    const det = params.get("showdetails");
                    if (cid && gid && det) {
                        return { courseclassid: cid, coursegroupid: gid, showdetails: det };
                    } else {
                        throw Error("required parameters 'courseclassid', 'coursegroupid', 'showdetails' " +
                            `are missing in scraped url '${href}'`);
                    }
                });

                Logger.info(`scraped ${courses.length} course numbers for room '${room.name}'`,
                    "courses", null, courses.length === 0);

                if (courses.length > 0) {
                    callback(courses);
                }

            } catch (e) {
                Logger.err(e, "courses");
            }
        });
    }

    private scrapeBookings(course: ICourse, callback: (bookings: IBooking[]) => void) {
        const url = SCRAPER_BASE_URL + COURSE_DETAILS.replace("{{courseclassid}}", encodeURIComponent(course.courseclassid))
            .replace("{{coursegroupid}}", encodeURIComponent(course.coursegroupid))
            .replace("{{showdetails}}", encodeURIComponent(course.showdetails));
        this.request(url).then((ch) => {
            try {

                const values = ch("table.subinfo > tbody > tr table > tbody")  // the <tbody> which holds the date and times
                    .children("tr")                                            // the <tr> children (rows)
                    .slice(1)                                                  // remove the first row which is the header
                    .map((i, el) => {
                        const tds = ch(el).children("td");                     // the <td> children (columns)
                        if (tds.length === 4) {                                // ignore col-spanning description fields
                            return {
                                date: tds.eq(1).text().trim() as string,       // the date, time and room fields
                                room: tds.eq(3).text().trim() as string,
                                time: tds.eq(2).text().trim() as string,
                            };
                        }
                    });

                // build bookings objects
                const formatter = DateTimeFormatter.ofPattern("dd.MM.yy");
                const bookings: IBooking[] = values.get().map((tuple: { date: string, time: string, room: string }) => {
                    const times = tuple.time.split(" – ");
                    return {
                        date: LocalDate.parse(tuple.date, formatter),
                        from: LocalTime.parse(times[0].trim()),
                        roomName: tuple.room,
                        to: LocalTime.parse(times[1].trim()),
                    };
                });

                Logger.info(`scraped ${bookings.length} room bookings for course '${course.showdetails}'`,
                    "bookings", null, bookings.length === 0);

                if (bookings.length > 0) {
                    callback(bookings);
                }

            } catch (e) {
                Logger.err(e, "bookings");
            }
        });
    }

    /**
     * Perform a HTTP GET request, load the HTML with Cheerio and return the cheerio-parsed DOM
     *
     * @param url The URL to load and parse with Cheerio
     */
    private async request(url: string): Promise<CheerioStatic> {
        try {

            const response = await this.limiter.schedule(() => request.get(url, this.headers));
            const code: number = response != null ? (response.statusCode != null ? response.statusCode : -1) : -1;

            Logger.info(`GET ${url}`, "request", code, code !== 200);

            // parse and return on success
            if (response && code === 200) {
                const ch: CheerioStatic = cheerio.load(response.body);
                return Promise.resolve(ch);
            } else {
                throw Error(`request returned unexpected status code ${code}`);
            }

        } catch (error) {
            Logger.err(`GET ${url}`, "request");
            Logger.err(error);
            return Promise.reject(error);
        }
    }
}

/* start the scraper */

const jrc = new JkuRoomScraper();
jrc.scrape();
