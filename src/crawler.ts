import colors from "ansicolors";
import cheerio from "cheerio";
import http from "http";
import request from "request";

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

    public start() {
        this.crawlRooms((rooms: string[]) => console.log("done."));
    }

    private crawlRooms(callback: (rooms: string[]) => void) {
        this.request(CRAWLER_BASE_URL + SEARCH_PAGE, (ch: CheerioStatic) => {
            // extract option values in the room selector
            const rooms: string[] = ch("#room").children().map((i, el) => ch(el).val()).get();

            if (rooms.length === 0) {
                console.error("rooms", colors.bgBrightRed(colors.brightWhite(" error ")),
                    "selector yielded 0 room values");
            } else {
                // remove first all-quantifier value
                const firstValue = (rooms.shift() as string).trim();
                if (firstValue !== "all") {
                    console.error("rooms", colors.bgBrightRed(colors.brightWhite(" error ")),
                        `first value expected to be 'all' but was '${firstValue}'`);
                } else {
                    console.log("rooms", `extracted ${rooms.length} room values`);
                    console.log(rooms);

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
            if (code === 200) {
                console.error("request", colors.green(` ${code} `), url);
            } else {
                console.error("request", colors.bgBrightRed(colors.brightWhite(` ${code} `)), url);
            }

            if (response && code === 200) {

                // parse with cheerio
                const ch: CheerioStatic = cheerio.load(body);

                // call callback function
                if (callback != null) {
                    callback(ch);
                }

            } else if (error != null) {
                console.error(error);
            }
        };

        request.get(url, { headers: { "User-Agent": CRAWLER_USER_AGENT } }, listener);
    }
}

/* start the crawler */

const jrc = new JkuRoomCrawler();
jrc.start();
