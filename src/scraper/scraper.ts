import cheerio from "cheerio";
import Bottleneck from "bottleneck";
import got, { OptionsOfTextResponseBody } from "got";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

// this is a dirty hack, but i have no idea how to get this running instead
// see https://github.com/basarat/typescript-collections/issues/120
import Set from "typescript-collections/dist/lib/Set";
import FactoryDictionary from "typescript-collections/dist/lib/FactoryDictionary";

import { CourseScraper } from "./components/courses";
import { BookingScraper } from "./components/bookings";
import { BuildingScraper } from "./components/buildings";
import {
  KusssRoomsScraper as KusssRoomScraper,
  JkuRoomsScraper as JkuRoomScraper,
} from "./components/rooms";
import { Logger } from "./log";
import { Jku } from "../common/jku";
import { Time } from "../common/types";
import { SplitTree } from "./splitTree";
import { TimeUtils } from "../common/utils";
import {
  IndexDto,
  DAY_KEY_FORMAT,
  RoomsDto,
  TimeSpanDto,
  AvailableDto,
  AvailableRoomsDto,
  RangeDto,
} from "../common/dto";
import { RoomScrape, CourseScrape, ScrapeStatistics } from "./types";

/** Intermediate type that is used for building the availability dto structure */
declare type AvailableDict = FactoryDictionary<
  string,
  FactoryDictionary<string, TimeSpanDto[]>
>;

export class Scraper {
  public readonly jkuUrl: string;
  public readonly kusssUrl: string;
  public statistics: ScrapeStatistics;

  private readonly quickMode: boolean;
  private readonly requestLimiter: Bottleneck;
  private readonly requestOptions: OptionsOfTextResponseBody;

  /**
   * Initializes the scraper
   *
   * @param quickMode If this is true, the scraper will not scrape the entire page,
   * but end early. This is useful for doing a quick set of tests
   * without scraping the entire index.
   */
  constructor(
    jkuUrl: string,
    kusssUrl: string,
    quickMode = false,
    userAgent = "jku-room-search-bot",
    requestTimeout = 5000,
    maxRetries = 5,
    requestDelay = 500
  ) {
    this.quickMode = quickMode;
    this.jkuUrl = jkuUrl;
    this.kusssUrl = kusssUrl;

    // initialize request configuration and statistics object
    this.requestOptions = {
      headers: { "User-Agent": userAgent },
      timeout: requestTimeout,
      retry: { limit: maxRetries },
    };
    this.requestLimiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: requestDelay,
    });
    this.statistics = {
      scrapedBookings: 0,
      ignoredBookings: 0,
      scrapedCourses: 0,
      days: 0,
      requests: 0,
      scrapedKusssRooms: 0,
      scrapedJkuRooms: 0,
      incompleteRooms: 0,
      scrapedBuildings: 0,
      range: undefined,
    };
  }

  public async scrape(): Promise<IndexDto> {
    // prepare result object
    const result: IndexDto = {
      version: dayjs().format(),
      range: { start: "", end: "" },
      rooms: {},
      buildings: {},
      available: {},
    };

    // intermediate data structure for available dto
    const available: AvailableDict = new FactoryDictionary(
      () => new FactoryDictionary(() => new Array<TimeSpanDto>())
    );

    const buildingScraper = new BuildingScraper(this);
    const courseScraper = new CourseScraper(this);
    const bookingScraper = new BookingScraper(this);
    const jkuRoomScraper = new JkuRoomScraper(this);
    const kusssRoomScraper = new KusssRoomScraper(this);

    // we need those helper structures for reversal
    const buildingToId: { [name: string]: number } = {};
    const roomToId: { [canonical: string]: number } = {};

    try {
      /* scrape buildings */

      const buildings = await buildingScraper.scrape();

      // assign building ids and store the mapping
      let bid = 0;
      buildings.forEach((b) => {
        const id = bid++;
        result.buildings[id] = { name: b.name };
        buildingToId[b.name] = id;
      });

      /* scrape rooms inside buildings */

      const jRooms: { [canonical: string]: RoomScrape } = {};
      for (const [i, building] of buildings.entries()) {
        const p = (i + 1) / buildings.length;
        const scrapes = await jkuRoomScraper.scrape(building, p);
        scrapes.forEach((r) => {
          // link and store that with the assigned building id
          r.buildingId = buildingToId[building.name];
          jRooms[Scraper.getCncnlName(r.name)] = r;
        });

        // return early in quick-mode
        if (this.quickMode && i > 5) break;
      }

      /* scrape rooms searchable from kusss */

      const kRooms: { [canonical: string]: RoomScrape } = {};
      const kRoomScrapes = await kusssRoomScraper.scrape();
      kRoomScrapes.forEach((r) => (kRooms[Scraper.getCncnlName(r.name)] = r));

      /* assign kusss rooms to result, but possibly extend it with jku rooms metadata */

      let rid = 0;
      for (const cnclName in kRooms) {
        let building = -1;
        let capacity = -1;
        if (cnclName in jRooms) {
          building = jRooms[cnclName].buildingId ?? -1;
          capacity = jRooms[cnclName].capacity ?? -1;
        }

        // assign the new room object
        const id = rid++;
        result.rooms[id] = {
          name: kRooms[cnclName].name,
          building,
          capacity,
        };

        // store the mapping
        roomToId[cnclName] = id;
      }

      this.logRoomMetadataHealth(result.rooms);

      /* scrape kusss courses */

      const uniqueCourses = new Set<CourseScrape>(JSON.stringify);

      let i = 0;
      for (const cnclName in kRooms) {
        const room = kRooms[cnclName];

        const p = (i + 1) / Object.keys(kRooms).length;
        const courses = await courseScraper.scrape(room, p);
        courses.forEach(uniqueCourses.add, uniqueCourses);

        // return early in quick-mode
        if (this.quickMode && i > 5) break;

        i++;
      }

      this.logCourseMetadataHealth(uniqueCourses.size());

      /* scrape bookings of these courses from kusss */

      const ignoredRooms = new Set<string>();

      for (const [i, course] of uniqueCourses.toArray().entries()) {
        const p = (i + 1) / uniqueCourses.size();
        const bookings = await bookingScraper.scrape(course, p);

        bookings.forEach((booking) => {
          const cnclName = Scraper.getCncnlName(booking.room);

          // ignore this entire booking if we can't resolve the room
          if (!(cnclName in kRooms)) {
            ignoredRooms.add(cnclName);
            this.statistics.ignoredBookings += 1;
            return;
          }

          const day = booking.date.format(DAY_KEY_FORMAT);
          const room = roomToId[cnclName].toString();
          const timespan: [number, number] = [
            TimeUtils.toMinutes(booking.from),
            TimeUtils.toMinutes(booking.to),
          ];

          available.getValue(day).getValue(room).push(timespan);
        });

        // return early in quick-mode
        if (this.quickMode && i > 10) break;
      }

      /* sort and count the days */

      const days = available
        .keys()
        .map((e) => dayjs(e, DAY_KEY_FORMAT))
        .sort((a, b) => (a.isAfter(b) ? 1 : -1));

      if (days.length === 0) throw Error("0 days have been scraped");

      result.range.start = days[0].startOf("day").format();
      result.range.end = days[days.length - 1].endOf("day").format();

      this.statistics.days = days.length;
      this.statistics.range = result.range;

      /* reverse index */

      this.reverseIndex(available, result.range, result.rooms);

      /* eventually, assign the available data structure */

      result.available = Scraper.buildAvailableDto(available);

      Logger.info("scrapping successful", "scrape");
      return result;
    } catch (error) {
      Logger.err("scraping failed", "scrape");
      Logger.err(error);
      return Promise.reject(null);
    } finally {
      Logger.info(this.statistics);
    }
  }

  private reverseIndex(
    available: AvailableDict,
    range: RangeDto,
    rooms: RoomsDto
  ) {
    // booking interval which will be considered free
    const fullInterval: [number, number] = Jku.getBookingIntervalInMinutes();

    // zip the break times so we can later remove them
    const breakStartTimes: Time[] = Jku.getPauseStartTimes();
    const breakEndTimes: Time[] = Jku.getPauseEndTimes();
    const breakTimes = breakStartTimes.map((e, i) => [
      TimeUtils.toMinutes(e),
      TimeUtils.toMinutes(breakEndTimes[i]),
    ]);

    // traverse all days and rooms
    let curr = dayjs(range.start);
    while (curr <= dayjs(range.end)) {
      const day = curr.format(DAY_KEY_FORMAT);
      const availRooms = available.getValue(day);

      // TODO: replace this with availRooms.keys() to only consider rooms with bookings
      for (const room of Object.keys(rooms)) {
        const intervals: TimeSpanDto[] = availRooms.getValue(room);

        // reverse intervals by cutting from the full interval
        let reversed = SplitTree.split(fullInterval, intervals);
        // drop stand-alone break times because those short intervals can't be selected anyway
        reversed = reversed.filter(
          (iv) => !breakTimes.some((br) => br[0] === iv[0] && br[1] === iv[1])
        );

        availRooms.setValue(room, reversed);
      }

      curr = curr.add(1, "day");
    }
  }

  /**
   * Perform a HTTP GET request, load the HTML with cheerio and return the cheerio-parsed DOM
   *
   * @param url The URL to load and parse with cheerio
   */
  public async request(url: string): Promise<cheerio.Root> {
    try {
      const response = await this.requestLimiter.schedule(() =>
        got.get(url, this.requestOptions)
      );

      this.statistics.requests++;

      Logger.info(
        `GET ${url}`,
        "request",
        response.statusCode.toString(),
        undefined,
        response.statusCode !== 200
      );

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

  private logRoomMetadataHealth(rooms: RoomsDto): void {
    const missing = Object.values(rooms).filter(
      (r) => r.building === -1 || r.capacity === -1
    );

    this.statistics.incompleteRooms = missing.length;

    if (missing.length > 0) {
      Logger.err(
        `there are ${missing.length} rooms without building or capacity information`,
        "rooms"
      );

      const affectedRooms = missing.map((r) => r.name);
      Logger.info(affectedRooms, "rooms");
    }
  }

  private logCourseMetadataHealth(numUniqueCourses: number): void {
    // correct final statistics by only counting unique numbers
    const numDuplicates = this.statistics.scrapedCourses - numUniqueCourses;
    this.statistics.scrapedCourses = numUniqueCourses;

    Logger.info(
      `scraped ${numUniqueCourses} course numbers (removed ${numDuplicates} duplicates)`,
      "scrape",
      undefined,
      undefined,
      numUniqueCourses === 0
    );
  }

  private static getCncnlName(name: string) {
    // all characters in lower case and without whitespace (canonical name)
    return name.replace(/\s/g, "").toLowerCase();
  }

  private static buildAvailableDto(factoryDict: AvailableDict): AvailableDto {
    // transform the used nested factory dictionary to the final dto structure
    const dto: AvailableDto = {};
    factoryDict.forEach((day, roomDict) => {
      const _roomdict: AvailableRoomsDto = {};
      roomDict.forEach((room, timespans) => (_roomdict[room] = timespans));
      dto[day] = _roomdict;
    });

    return dto;
  }
}
