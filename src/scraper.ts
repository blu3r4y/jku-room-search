import Bottleneck from "bottleneck";
import cheerio from "cheerio";
import got, { OptionsOfTextResponseBody } from "got";
import { writeFile } from "fs";
import {
  DateTimeFormatter,
  LocalDate,
  LocalDateTime,
  LocalTime,
} from "@js-joda/core";
import { Set } from "typescript-collections";

import { IRoomData } from "./api";
import { Jku } from "./jku";
import { Logger } from "./log";
import { SplitTree } from "./split-tree";
import { DateUtils } from "./utils";

/* globals*/

// webpack will declare this global variables for us
declare var SCRAPER_BASE_URL_KUSSS: string;
declare var SCRAPER_BASE_URL_JKU: string;
declare var SCRAPER_USER_AGENT: string;
declare var SCRAPER_DATA_PATH: string;
declare var SCRAPER_MAX_RETRIES: number;
declare var SCRAPER_REQUEST_TIMEOUT: number;
declare var SCRAPER_REQUEST_DELAY: number;

const SEARCH_PAGE = "/kusss/coursecatalogue-start.action?advanced=true";
const SEARCH_RESULTS =
  "/kusss/coursecatalogue-search-lvas.action?sortParam0courses=lvaName&asccourses=true" +
  "&detailsearch=true&advanced=%24advanced&lvaName=&abhart=all&organisationalHint=&lastname=&firstname=" +
  "&lvaNr=&klaId=&type=all&curriculumContentKey=all&orgid=Alle&language=all&day=all&timefrom=all&timeto=all" +
  "&room={{room}}+&direct=true#result";
const COURSE_DETAILS =
  "/kusss/selectcoursegroup.action?coursegroupid={{coursegroupid}}&showdetails={{showdetails}}" +
  "&abhart=all&courseclassid={{courseclassid}}";

const BUILDINGS_PAGE = "/en/campus/the-jku-campus/buildings/";
const BUILDING_DETAILS = "/en/campus/the-jku-campus/buildings/{{building}}/";

/* scraper logic */

/**
 * A scraped building entity
 */
declare interface IBuilding {
  id: number;
  name: string;
  url: string; // the identifier used at the jku.at homepage
}

/**
 * A scraped room entity
 */
declare interface IRoom {
  id: number | undefined;
  name: string;
  capacity: number | undefined;
  buildingId: number | undefined;
  kusssId: string | undefined; // the <option> identifier used at the kusss.jku.at homepage
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
  to: LocalTime;
  roomName: string;
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
    numBuildings: number;
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
      DateUtils.toMinutes(Jku.FIRST_COURSE_START),
      DateUtils.toMinutes(Jku.LAST_COURSE_END),
    ];

    // zero statistics
    this.statistics = {
      numBookings: 0,
      numCourses: 0,
      numDays: 0,
      numRequests: 0,
      numRooms: 0,
      numBuildings: 0,
      rangeEnd: undefined,
      rangeStart: undefined,
    };

    // set request headers
    this.requestOptions = {
      headers: { "User-Agent": SCRAPER_USER_AGENT },
      timeout: SCRAPER_REQUEST_TIMEOUT,
      retry: { limit: SCRAPER_MAX_RETRIES },
    };

    // prepare request rate-limit
    this.requestLimiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: SCRAPER_REQUEST_DELAY,
    });

    // date formatters
    this.dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    this.dateTimeFormatter = DateTimeFormatter.ofPattern(
      "yyyy-MM-dd'T'HH:mm:ss"
    );
  }

  public async scrape(): Promise<IRoomData> {
    try {
      /* ---------------- */
      /* (1) preparations */

      const data: IRoomData = {
        available: {},
        range: { start: "", end: "" },
        rooms: {},
        buildings: {},
        version: LocalDateTime.now().format(this.dateTimeFormatter),
      };

      // a map for rooms, identified by their canonical name
      const rooms: { [key: string]: IRoom } = {};

      /* -------------------- */
      /* (2) scrape buildings */

      const buildings: IBuilding[] = await this.scrapeBuildings();
      buildings.forEach((b) => (data.buildings[b.id] = b.name));

      this.statistics.numBuildings = buildings.length;
      Logger.info(
        `scraped ${buildings.length} building names`,
        "buildings",
        undefined,
        undefined,
        buildings.length === 0
      );
      Logger.info(
        buildings.map((building: IBuilding) => building.name),
        "buildings"
      );

      /* --------------------------------- */
      /* (3) scrape rooms inside buildings */

      const jkuRooms: IRoom[] = new Array<IRoom>();
      for (const [i, building] of buildings.entries()) {
        const buildingRooms: IRoom[] = await this.scrapeJkuRooms(building);
        jkuRooms.push.apply(jkuRooms, buildingRooms);

        Logger.info(
          `found ${buildingRooms.length} room entries for building '${building.name}'`,
          "buildings",
          undefined,
          (i + 1) / buildings.length
        );
      }

      /* ---------------------- */
      /* (4) scrape kusss rooms */

      const kusssRooms: IRoom[] = await this.scrapeKusssRooms();

      // use this as the base array for rooms
      kusssRooms.forEach((r) => (rooms[this.getCanonicalRoomName(r.name)] = r));

      this.statistics.numRooms = kusssRooms.length;
      Logger.info(
        `scraped ${kusssRooms.length} bookable room names from KUSSS`,
        "rooms",
        undefined,
        undefined,
        kusssRooms.length === 0
      );
      Logger.info(
        kusssRooms.map((r) => r.name),
        "rooms"
      );

      for (const room of jkuRooms) {
        const canonical = this.getCanonicalRoomName(room.name);

        // update existing rooms with buildingId and capacity
        if (canonical in rooms) {
          rooms[canonical].buildingId = room.buildingId;
          rooms[canonical].capacity = room.capacity;
        }
      }

      /* ------------------------ */
      /* (5) observe room metadata */

      // assign a numeric id to each room
      let rid = 0;
      for (const roomKey of Object.keys(rooms)) {
        rooms[roomKey].id = rid++;
      }

      // store rooms
      Object.values(rooms).forEach(
        (r) =>
          (data.rooms[r.id!.toString()] = {
            name: r.name,
            building: r.buildingId != null ? r.buildingId : -1,
          })
      );

      const roomsVal = Object.values(rooms);
      const withMeta = roomsVal.filter(
        (r) => r.buildingId != null && r.capacity != null
      );
      const woBuilding = roomsVal.filter((r) => r.buildingId == null);
      const woCapacity = roomsVal.filter((r) => r.capacity == null);

      Logger.info(`merged room metadata of ${withMeta.length} rooms`, "rooms");
      Logger.info(
        roomsVal.map((r) => r.name),
        "rooms"
      );

      if (woBuilding.length > 0) {
        Logger.err(
          `there are ${woBuilding.length} rooms without building information`,
          "rooms"
        );
        Logger.info(
          woBuilding.map((r) => r.name),
          "rooms"
        );
      }
      if (woCapacity.length > 0) {
        Logger.err(
          `there are ${woCapacity.length} rooms without capacity information`,
          "rooms"
        );
        Logger.info(
          woCapacity.map((r) => r.name),
          "rooms"
        );
      }

      /* ------------------------ */
      /* (6) scrape kusss courses */

      let unfilteredCoursesCount = 0;
      const uniqueCourses: Set<ICourse> = new Set<ICourse>(JSON.stringify);

      for (const [i, room] of roomsVal.entries()) {
        if (room.kusssId == null) continue;

        const courses: ICourse[] = await this.scrapeCourses(room);

        // remove duplicate course entries based on JSON.stringify
        unfilteredCoursesCount += courses.length;
        courses.forEach(uniqueCourses.add, uniqueCourses);

        Logger.info(
          `scraped ${courses.length} course numbers for room '${room.name}'`,
          "courses",
          undefined,
          (i + 1) / Object.keys(rooms).length,
          courses.length === 0
        );
      }

      this.statistics.numCourses = uniqueCourses.size();
      Logger.info(
        `scraped ${uniqueCourses.size()} course numbers in total (removed ${
          unfilteredCoursesCount - uniqueCourses.size()
        } duplicates)`,
        "scrape",
        undefined,
        undefined,
        uniqueCourses.size() === 0
      );

      /* ------------------------- */
      /* (7) scrape kusss bookings */

      for (const [i, course] of uniqueCourses.toArray().entries()) {
        const bookings: IBooking[] = await this.scrapeBookings(course);
        bookings.forEach((booking) => this.addBooking(data, booking));

        this.statistics.numBookings += bookings.length;
        Logger.info(
          `scraped ${bookings.length} room bookings for course '${course.showdetails}'`,
          "bookings",
          undefined,
          (i + 1) / uniqueCourses.size(),
          bookings.length === 0
        );
      }

      /* -------------- */
      /* (8) statistics */

      // query how many days we scraped in total
      const days = Object.keys(data.available)
        .map((e) => LocalDate.parse(e, this.dateFormatter))
        .sort();

      this.statistics.numDays = days.length;
      if (days.length === 0) {
        throw Error("0 days have been scraped");
      }

      // query the earlierst and latest day that we scraped
      data.range.start = days[0]
        .atTime(LocalTime.MIN)
        .format(this.dateTimeFormatter);
      data.range.end = days[days.length - 1]
        .atTime(LocalTime.MAX)
        .format(this.dateTimeFormatter);

      this.statistics.rangeStart = data.range.start;
      this.statistics.rangeEnd = data.range.end;

      /* ------------------ */
      /* (9) index reversal */

      // build the reverse index of all those intervals with a SplitTree
      this.reverseIndex(data);

      return data;
    } catch (error) {
      Logger.err("scraping failed", "scrape");
      if (error != null) {
        Logger.err(error);
      }
      return Promise.reject(null);
    } finally {
      Logger.info("scrapping done", "scrape");
      Logger.info(this.statistics);
    }
  }

  private reverseIndex(data: IRoomData) {
    const start = LocalDate.parse(data.range.start, this.dateTimeFormatter);
    const end = LocalDate.parse(data.range.end, this.dateTimeFormatter);
    const roomKeys = Object.keys(data.rooms);

    // compute and zip the break times
    const breakStartTimes: LocalTime[] = Jku.getPauseTimes(
      Jku.FIRST_PAUSE_START,
      Jku.LAST_PAUSE_START
    );
    const breakEndTimes: LocalTime[] = Jku.getPauseTimes(
      Jku.FIRST_PAUSE_END,
      Jku.LAST_PAUSE_END
    );
    const breakTimes = breakStartTimes.map((e, i) => [
      DateUtils.toMinutes(e),
      DateUtils.toMinutes(breakEndTimes[i]),
    ]);

    // traverse all days
    let curr = start;
    while (curr <= end) {
      const dayKey = curr.format(this.dateFormatter);

      // traverse all rooms
      for (const roomKey of roomKeys) {
        const intervals: [number, number][] = this.getBookingsList(
          data,
          dayKey,
          roomKey
        );

        // reverse intervals by cutting from the full interval
        let reversed = SplitTree.split(this.fullInterval, intervals);

        // drop stand-alone break times because those short intervals can't be selected anyway
        reversed = reversed.filter(
          (itv) =>
            !breakTimes.some((brk) => brk[0] === itv[0] && brk[1] === itv[1])
        );

        // overwrite intervals
        intervals.length = 0;
        intervals.push.apply(intervals, reversed);
      }

      curr = curr.plusDays(1);
    }
  }

  private addBooking(data: IRoomData, booking: IBooking) {
    const dayKey = booking.date.format(this.dateFormatter);

    // lookup the room id
    const canonicalName = this.getCanonicalRoomName(booking.roomName);
    const roomKey = Object.keys(data.rooms).find(
      (key) => this.getCanonicalRoomName(data.rooms[key].name) === canonicalName
    );
    if (!roomKey) {
      Logger.err(`room '${booking.roomName}' is unknown, ignoring`, "scrape");
      return; // just ignore this room then
    }

    // book this room
    const bookVal: [number, number] = [
      DateUtils.toMinutes(booking.from),
      DateUtils.toMinutes(booking.to),
    ];
    this.getBookingsList(data, dayKey, roomKey).push(bookVal);
  }

  private getCanonicalRoomName(name: string) {
    // all characters in lower case and without whitespace
    return name.replace(/\s/g, "").toLowerCase();
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

  private async scrapeBuildings(): Promise<IBuilding[]> {
    const url = SCRAPER_BASE_URL_JKU + BUILDINGS_PAGE;
    const ch: cheerio.Root = await this.request(url);

    // the <article> elements in all div.stripe_element
    const values = ch("div.stripe_element > article").map((i, el) => {
      return {
        header: ch(el)
          .children("h3")
          .first() // the first found <h3> in there
          .children()
          .remove()
          .end()
          .text(), // the text in that, without all of its other children
        // the 'href' of the first <a> with 'stripe_btn' class
        href: ch(el).children("a.stripe_btn").first().attr("href"),
      };
    });

    // build building objects
    let bid = 0;
    const buildings: IBuilding[] = values
      .get()
      .map((pair: { header: string; href: string }) => {
        const match = pair.href.match(/buildings\/(.*?)\//); // check for a link to '/buildings/'
        if (match != null) {
          return {
            id: bid++,
            url: match[1],
            // remove whitespace and leading numbers from the name
            name: pair.header
              .trim()
              .replace(/\s+/g, " ")
              .replace(/^\d+\s+/, ""),
          };
        } else {
          // ignore building names that don't refer to a valid "/buildings/" sub-page
          return null;
        }
      })
      .filter((x) => x)
      .map((x) => x as IBuilding);

    return buildings;
  }

  private async scrapeJkuRooms(building: IBuilding): Promise<IRoom[]> {
    const url =
      SCRAPER_BASE_URL_JKU +
      BUILDING_DETAILS.replace("{{building}}", building.url);
    const ch: cheerio.Root = await this.request(url);

    const values = ch(
      "div.content_container > div.text > div.body > table.contenttable"
    )
      .map((i, el) => {
        // traverse each table individually
        return ch(el)
          .find("tr") // the <tr> children (rows) - any of them, not just direct children
          .slice(1) // remove the first row which is the header
          .map((j, em) => {
            const tds = ch(em).children("td");

            // only scrape 3 columns-mode with room name, number, and capacity
            if (tds.length === 3) {
              // check if this is a lecture hall (HS)
              const match = tds
                .eq(0)
                .text()
                .match(/(HS \d+)/);
              return {
                name: match == null ? tds.eq(1).text() : match[1],
                capacity: tds.eq(2).text(),
              };
            }
          });
      })
      // flat map the map of rows
      .get()
      .reduce((acc, x) => acc.concat(x.get()), []);

    // build room objects
    const rooms: IRoom[] = values.map(
      (pair: { name: string; capacity: string }) => {
        return {
          id: undefined,
          name: pair.name.trim().replace(/\s+/g, " "),
          kusssId: undefined,
          capacity: parseInt(pair.capacity, 10),
          buildingId: building.id,
        };
      }
    );

    return rooms;
  }

  private async scrapeKusssRooms(): Promise<IRoom[]> {
    const url = SCRAPER_BASE_URL_KUSSS + SEARCH_PAGE;
    const ch: cheerio.Root = await this.request(url);

    const values = ch("select#room > option") // the <option> children of <select id="room">
      .slice(1) // remove the first 'all' <option>
      .map((i, el) => {
        return {
          name: ch(el).text(), // the text and 'value' attr of each <option>
          value: ch(el).val(),
        };
      });

    // build room objects
    const rooms: IRoom[] = values
      .get()
      .map((pair: { name: string; value: string }) => {
        return {
          id: undefined,
          kusssId: pair.value,
          name: pair.name.trim().replace(/\s+/g, " "),
          capacity: undefined,
          buildingId: undefined,
        };
      });

    return rooms;
  }

  private async scrapeCourses(room: IRoom): Promise<ICourse[]> {
    const url =
      SCRAPER_BASE_URL_KUSSS +
      SEARCH_RESULTS.replace("{{room}}", encodeURIComponent(room.kusssId!));
    const ch: cheerio.Root = await this.request(url);

    const hrefs = ch("div.contentcell > table > tbody")
      .last() // the last <tbody> in the div.contentcell
      .children("tr") // the <tr> children (rows)
      .slice(1) // remove the first row which is the header
      .map((i, el) =>
        ch(el)
          .children("td")
          .first() // the first <td> (first column) in each <tr>
          .find("a")
          .first()
          .attr("href")
      ); // the 'href' attr of the first found <a>

    // build course objects
    const courses: ICourse[] = hrefs
      .get()
      .map((href) => href.trim())
      .map((href: string) => {
        const params = new URLSearchParams(href.split("?")[1]);
        const cid = params.get("courseclassid");
        const gid = params.get("coursegroupid");
        const det = params.get("showdetails");
        if (cid && gid && det) {
          return { courseclassid: cid, coursegroupid: gid, showdetails: det };
        } else {
          throw Error(
            "required parameters 'courseclassid', 'coursegroupid', 'showdetails' " +
              `are missing in scraped url '${href}'`
          );
        }
      });

    return courses;
  }

  private async scrapeBookings(course: ICourse): Promise<IBooking[]> {
    const url =
      SCRAPER_BASE_URL_KUSSS +
      COURSE_DETAILS.replace(
        "{{courseclassid}}",
        encodeURIComponent(course.courseclassid)
      )
        .replace("{{coursegroupid}}", encodeURIComponent(course.coursegroupid))
        .replace("{{showdetails}}", encodeURIComponent(course.showdetails));
    const ch: cheerio.Root = await this.request(url);

    // the <tbody> which holds the date and times
    const values = ch("table.subinfo > tbody > tr table > tbody")
      .children("tr") // the <tr> children (rows)
      .slice(1) // remove the first row which is the header
      .map((i, el) => {
        const tds = ch(el).children("td"); // the <td> children (columns)
        if (tds.length === 4) {
          // ignore col-spanning description fields
          return {
            date: tds.eq(1).text().trim() as string, // the date, time and room fields
            room: tds.eq(3).text().trim() as string,
            time: tds.eq(2).text().trim() as string,
          };
        }
      });

    // build bookings objects
    const formatter = DateTimeFormatter.ofPattern("dd.MM.yy");
    const bookings: IBooking[] = values
      .get()
      .map((tuple: { date: string; time: string; room: string }) => {
        const times = tuple.time.split(" – ");
        return {
          date: LocalDate.parse(tuple.date, formatter),
          from: LocalTime.parse(times[0].trim()),
          roomName: tuple.room,
          to: LocalTime.parse(times[1].trim()),
        };
      });

    return bookings;
  }

  /**
   * Perform a HTTP GET request, load the HTML with Cheerio and return the cheerio-parsed DOM
   *
   * @param url The URL to load and parse with Cheerio
   */
  private async request(url: string): Promise<cheerio.Root> {
    try {
      const response = await this.requestLimiter.schedule(() =>
        got.get(url, this.requestOptions)
      );
      Logger.info(
        `GET ${url}`,
        "request",
        response.statusCode.toString(),
        undefined,
        response.statusCode !== 200
      );
      this.statistics.numRequests++;

      // parse and return on success
      if (response.statusCode === 200) {
        return cheerio.load(response.body);
      } else {
        throw Error(
          `request returned unexpected status code ${response.statusCode}`
        );
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

jrc
  .scrape()
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
