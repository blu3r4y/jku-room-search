import cheerio from "cheerio";
import http from "http";
import request from "request";

import { Logger } from "./log";

/* globals*/

// TODO: just for debugging purpose
const CRAWLER_BASE_URL = "https://mario.ac";
const CRAWLER_USER_AGENT = "jku-room-search-bot/0.1 (+https://github.com/blu3r4y/jku-room-search)";

// webpack will declare this global variables for us
// declare var CRAWLER_BASE_URL: string;
// declare var CRAWLER_USER_AGENT: string;

const SEARCH_PAGE = "/kusss/coursecatalogue-start.action?advanced=true";
const SEARCH_RESULTS = "/kusss/coursecatalogue-search-lvas.action?sortParam0courses=lvaName&asccourses=true" +
    "&detailsearch=true&advanced=%24advanced&lvaName=&abhart=all&organisationalHint=&lastname=&firstname=" +
    "&lvaNr=&klaId=&type=all&curriculumContentKey=all&orgid=Alle&language=all&day=all&timefrom=all&timeto=all" +
    "&room={{room}}+&direct=true#result";
const COURSE_DETAILS = "/kusss/selectcoursegroup.action?coursegroupid={{coursegroupid}}&showdetails={{showdetails}}" +
    "&abhart=all&courseclassid={{courseclassid}}";

/* crawler logic */

class JkuRoomCrawler {

    private headers: request.CoreOptions;

    constructor() {
        // set request headers
        this.headers = { headers: { "User-Agent": CRAWLER_USER_AGENT } };
    }

    public crawl() {
        this.crawlRooms((rooms: string[]) => Logger.info("done", "rooms"));
    }

    private crawlRooms(callback: (rooms: string[]) => void) {
        this.request(CRAWLER_BASE_URL + SEARCH_PAGE, (ch: CheerioStatic) => {
            // extract option values in the room selector
            const rooms: string[] = ch("#room").children().map((i, el) => ch(el).val()).get();
            Logger.info(`extracted ${rooms.length} room values`, "rooms", null, rooms.length === 0);

            if (rooms.length > 0) {
                // remove first all-quantifier value
                const firstValue = (rooms.shift() as string).trim();
                if (firstValue !== "all") {
                    Logger.err(`first value expected to be 'all' but was '${firstValue}'`, "rooms");
                } else {
                    Logger.info(rooms);
                    callback(rooms);
                }
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

            if (response && code === 200) {

                // parse with cheerio
                const ch: CheerioStatic = cheerio.load(body);
                if (callback != null) {
                    callback(ch);
                }

            } else if (error != null) {
                Logger.err(error);
            }
        };

        request.get(url, this.headers, listener);
    }
}

/* start the crawler */

const jrc = new JkuRoomCrawler();
jrc.crawl();
