import Bottleneck from "bottleneck";
import cheerio from "cheerio";
import got, { OptionsOfTextResponseBody } from "got";
import { writeFile } from "fs";
import { DateTimeFormatter, LocalDate, LocalDateTime, LocalTime } from "@js-joda/core";
import { Set } from 'typescript-collections';

import { IRoomData } from "./api";
import { Logger } from "./log";
import { SplitTree } from "./split-tree";
import { DateUtils } from "./utils";

/* globals*/

// webpack will declare this global variables for us
declare var SCRAPER_BASE_URL: string;
declare var SCRAPER_USER_AGENT: string;
declare var SCRAPER_DATA_PATH: string;
declare var SCRAPER_MAX_RETRIES: number;
declare var SCRAPER_REQUEST_TIMEOUT: number;
declare var SCRAPER_REQUEST_DELAY: number;

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
     * The booking interval which will be considered as free by default
     */
    private fullInterval: [number, number];

    /**
     * Stores various scraping statistics
     */
    private statistics: {
        numBookings: number;
        numCourses: number;
        numDays: number;
        numRequests: number;
        numRooms: number;
        rangeEnd: string | undefined;
        rangeStart: string | undefined;
    };

    /**
     * Request options sent with every query
     */
    private requestOptions: OptionsOfTextResponseBody;

    /**
     * Job queue for GET requests
     */
    private requestLimiter: Bottleneck;

    /**
     * Date formatters for the entries in rooms.json
     */
    private dateFormatter: DateTimeFormatter;
    private dateTimeFormatter: DateTimeFormatter;

    constructor() {
        // booking interval which will be considered free
        this.fullInterval = [
            DateUtils.toMinutes(DateUtils.fromString("08:30")),
            DateUtils.toMinutes(DateUtils.fromString("22:15")),
        ];

        // zero statistics
        this.statistics = {
            numBookings: 0,
            numCourses: 0,
            numDays: 0,
            numRequests: 0,
            numRooms: 0,
            rangeEnd: undefined,
            rangeStart: undefined,
        };

        // set request headers
        this.requestOptions = {
            headers: { "User-Agent": SCRAPER_USER_AGENT },
            timeout: SCRAPER_REQUEST_TIMEOUT,
            retry: { limit: SCRAPER_MAX_RETRIES }
        };

        // prepare request rate-limit
        this.requestLimiter = new Bottleneck({
            maxConcurrent: 1,
            minTime: SCRAPER_REQUEST_DELAY,
        });

        // date formatters
        this.dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        this.dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    }

    public async scrape(): Promise<IRoomData> {
        try {

            // prepare final result object
            const data: IRoomData = {
                available: {},
                range: { start: "", end: "" },
                rooms: {},
                version: LocalDateTime.now().format(this.dateTimeFormatter),
            };

            // scrape rooms
            const rooms: IRoom[] = await this.scrapeRooms();
            Logger.info(rooms.map((room: IRoom) => room.name));
            this.statistics.numRooms = rooms.length;

            this.addRooms(data, rooms);

            // scrape courses for all rooms (and remove duplicates based on JSON.stringify)
            let unfilteredCourseCount = 0;
            const uniqueCourses: Set<ICourse> = new Set<ICourse>(JSON.stringify);
            for (const room of rooms) {
                const courses: ICourse[] = await this.scrapeCourses(room);
                unfilteredCourseCount += courses.length;
                courses.forEach(uniqueCourses.add, uniqueCourses);
            }

            this.statistics.numCourses += uniqueCourses.size();
            Logger.info(`scraped ${uniqueCourses.size()} course numbers in total (removed ${unfilteredCourseCount - uniqueCourses.size()} duplicates)`,
                "scrape", null, uniqueCourses.size() === 0);

            // scrape bookings
            for (const course of uniqueCourses.toArray()) {
                const bookings: IBooking[] = await this.scrapeBookings(course);
                this.statistics.numBookings += bookings.length;

                for (const booking of bookings) {
                    this.addBooking(data, booking);
                }
            }

            // get full day range
            const days = Object.keys(data.available).map((e) => LocalDate.parse(e, this.dateFormatter)).sort();
            this.statistics.numDays = days.length;
            if (days.length === 0) {
                throw Error("0 days have been scraped");
            }

            data.range.start = days[0].atTime(LocalTime.MIN).format(this.dateTimeFormatter);
            data.range.end = days[days.length - 1].atTime(LocalTime.MAX).format(this.dateTimeFormatter);

            this.statistics.rangeStart = data.range.start;
            this.statistics.rangeEnd = data.range.end;

            // build the reverse index of all those intervals
            this.reverseIndex(data);

            return data;

        } catch (error) {
            Logger.err("scraping failed", "scrape");
            if (error != null) {
                Logger.err(error);
            }
            return Promise.reject(null);
        } finally {
            Logger.info("scrapping done, showing statistics", "scrape");
            Logger.info(this.statistics);
        }
    }

    private reverseIndex(data: IRoomData) {
        const start = LocalDate.parse(data.range.start, this.dateTimeFormatter);
        const end = LocalDate.parse(data.range.end, this.dateTimeFormatter);

        const roomKeys = Object.keys(data.rooms);

        // traverse all days
        let curr = start;
        while (curr <= end) {
            const dayKey = curr.format(this.dateFormatter);

            // traverse all rooms
            for (const roomKey of roomKeys) {
                const intervals: [number, number][] = this.getBookingsList(data, dayKey, roomKey);

                // reverse and overwrite intervals
                const reversed = SplitTree.split(this.fullInterval, intervals);
                intervals.length = 0;
                intervals.push.apply(intervals, reversed);
            }

            curr = curr.plusDays(1);
        }
    }

    private addRooms(data: IRoomData, rooms: IRoom[]) {
        for (const room of rooms) {
            data.rooms[room.id.toString()] = room.name;
        }
    }

    private addBooking(data: IRoomData, booking: IBooking) {
        const dayKey = booking.date.format(this.dateFormatter);

        // lookup the room id
        const canonicalName = booking.roomName.replace(/\s/g, "").toLowerCase();
        const roomKey = Object.keys(data.rooms).find((key) => data.rooms[key].replace(/\s/g, "").toLowerCase() === canonicalName);
        if (!roomKey) {
            Logger.err(`room '${booking.roomName}' is unknown, ignoring`, "scrape");
            return;  // just ignore this room then
        }

        // book this room
        const bookVal: [number, number] = [DateUtils.toMinutes(booking.from), DateUtils.toMinutes(booking.to)];
        this.getBookingsList(data, dayKey, roomKey).push(bookVal);
    }

    private getBookingsList(data: IRoomData, dayKey: string, roomKey: string) {
        // add missing keys if necessary
        if (!(dayKey in data.available)) {
            data.available[dayKey] = {};
        }
        if (!(roomKey in data.available[dayKey])) {
            data.available[dayKey][roomKey] = new Array<[number, number]>();
        }

        return data.available[dayKey][roomKey];
    }

    private async scrapeRooms(): Promise<IRoom[]> {
        const url = SCRAPER_BASE_URL + SEARCH_PAGE;
        const ch: cheerio.Root = await this.request(url);

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

        return rooms;
    }

    private async scrapeCourses(room: IRoom): Promise<ICourse[]> {
        const url = SCRAPER_BASE_URL + SEARCH_RESULTS
            .replace("{{room}}", encodeURIComponent(room.htmlValue));
        const ch: cheerio.Root = await this.request(url);

        const hrefs = ch("div.contentcell > table > tbody").last()  // the last <tbody> in the div.contentcell
            .children("tr")                                         // the <tr> children (rows)
            .slice(1)                                               // remove the first row which is the header
            .map((i, el) => ch(el).children("td").first()           // the first <td> (first column) in each <tr>
                .find("a").first().attr("href"));                   // the 'href' attr of the first found <a>

        // build course objects
        const courses: ICourse[] = hrefs.get().map(href => href.trim()).map((href: string) => {
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

        return courses;
    }

    private async scrapeBookings(course: ICourse): Promise<IBooking[]> {
        const url = SCRAPER_BASE_URL + COURSE_DETAILS
            .replace("{{courseclassid}}", encodeURIComponent(course.courseclassid))
            .replace("{{coursegroupid}}", encodeURIComponent(course.coursegroupid))
            .replace("{{showdetails}}", encodeURIComponent(course.showdetails));
        const ch: cheerio.Root = await this.request(url);

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

        return bookings;
    }

    /**
     * Perform a HTTP GET request, load the HTML with Cheerio and return the cheerio-parsed DOM
     *
     * @param url The URL to load and parse with Cheerio
     */
    private async request(url: string): Promise<cheerio.Root> {
        try {
            const response = await this.requestLimiter.schedule(() => got.get(url, this.requestOptions));
            Logger.info(`GET ${url}`, "request", response.statusCode, response.statusCode !== 200);
            this.statistics.numRequests++;

            // parse and return on success
            if (response.statusCode === 200) {
                return cheerio.load(response.body);
            } else {
                throw Error(`request returned unexpected status code ${response.statusCode}`);
            }
        } catch (error) {
            Logger.err(`GET ${url}`, "request");
            Logger.err(error);
            return Promise.reject(null);
        }
    }
}

/* start the scraper */

Logger.info("initializing scraper", "main");
const jrc = new JkuRoomScraper();

jrc.scrape()
    .then((data: IRoomData) => {
        writeFile(SCRAPER_DATA_PATH, JSON.stringify(data), "utf-8", (error) => {
            if (error) {
                Logger.err(`could not store result in '${SCRAPER_DATA_PATH}'`, "main");
                Logger.err(error);
            } else {
                Logger.info(`stored result in '${SCRAPER_DATA_PATH}'`, "main");
            }
        });
    })
    .catch(() => {
        process.exit(-1);
    });
