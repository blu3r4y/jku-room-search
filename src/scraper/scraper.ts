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

import { Log } from "./log";
import { Jku } from "../common/jku";
import { Time } from "../common/types";
import { SplitTree } from "./splitTree";
import { TimeUtils } from "../common/utils";
import { CourseScraper } from "./components/courses";
import { BookingScraper } from "./components/bookings";
import { BuildingScraper } from "./components/buildings";
import {
  RoomScrape,
  CourseScrape,
  ScrapeStatistics,
  BuildingToRoomsMap as BuildingToRooms,
  BookingScrape,
  RoomToCapacityMap,
} from "./types";
import { KusssRoomScraper, JkuRoomScraper } from "./components/rooms";
import {
  IndexDto,
  DAY_KEY_FORMAT,
  RoomsDto,
  TimeSpanDto,
  AvailableDto,
  AvailableRoomsDto,
  RangeDto,
} from "../common/dto";

/**
 * Intermediate type that is used for building the availability dto structure
 */
declare type AvailableDict = FactoryDictionary<
  string,
  FactoryDictionary<string, TimeSpanDto[]>
>;

/**
 * Intermediate type that wraps `RoomScrape` objects by their canonical room name
 */
declare type RoomScrapeDict = { [canonical: string]: RoomScrape };

export class Scraper {
  public readonly jkuUrl: string;
  public readonly kusssUrl: string;
  public statistics: ScrapeStatistics;

  private readonly quickMode: boolean;
  private readonly ignoreRooms: string[];
  private readonly extraBuildingMeta: BuildingToRooms;
  private readonly extraCapacityMeta: RoomToCapacityMap;
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
    requestDelay = 500,
    ignoreRooms: string[] = [],
    extraBuildingMeta: BuildingToRooms = {},
    extraCapacityMeta: RoomToCapacityMap = {}
  ) {
    this.quickMode = quickMode;
    this.jkuUrl = jkuUrl;
    this.kusssUrl = kusssUrl;
    this.ignoreRooms = ignoreRooms.map(Scraper.getCncnlName);
    this.extraBuildingMeta = extraBuildingMeta;
    this.extraCapacityMeta = extraCapacityMeta;

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
      nScrapedBookings: 0,
      nIgnoredBookings: 0,
      nScrapedCourses: 0,
      nExtraBuildings: 0,
      nExtraRooms: 0,
      nDays: 0,
      nRequests: 0,
      nScrapedKusssRooms: 0,
      nScrapedJkuRooms: 0,
      nIncompleteRooms: 0,
      nScrapedBuildings: 0,
      nUnknownRooms: 0,
      unknownRooms: [],
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

      Log.sectionmark();

      /* scrape rooms inside buildings */

      const jRooms: RoomScrapeDict = {};
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

      /* add extra building and room metadata if necessary */

      for (const building in this.extraBuildingMeta) {
        // add additional buildings that might not already exist
        if (!(building in buildingToId)) {
          this.statistics.nExtraBuildings += 1;

          const id = bid++;
          result.buildings[id] = { name: building };
          buildingToId[building] = id;
        }

        // add additional room metadata
        for (const room of this.extraBuildingMeta[building]) {
          this.statistics.nExtraRooms += 1;
          jRooms[Scraper.getCncnlName(room)] = {
            name: room,
            buildingId: buildingToId[building],
            capacity: this.extraCapacityMeta[room] ?? -1,
          };
        }
      }

      this.logExtraBuildingMetrics();
      this.logJkuRoomMetrics(jRooms);
      Log.sectionmark();

      /* scrape rooms searchable from kusss */

      const kRooms: RoomScrapeDict = {};
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

      this.logMergedRoomMetrics(result.rooms);
      Log.sectionmark();

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

      this.logCourseMetrics(uniqueCourses.size());
      Log.sectionmark();

      /* scrape bookings of these courses from kusss */

      for (const [i, course] of uniqueCourses.toArray().entries()) {
        const p = (i + 1) / uniqueCourses.size();
        const bookings = await bookingScraper.scrape(course);

        // all the rooms which we had to ignore
        const ignoredRooms = new Set<string>();
        // rooms that are really new and not part of the ignore list already
        const unknownRooms = new Set<string>();

        bookings.forEach((booking) => {
          const cnclName = Scraper.getCncnlName(booking.room);

          // ignore this entire booking if we can't resolve the room
          if (!(cnclName in kRooms)) {
            this.statistics.nIgnoredBookings += 1;
            ignoredRooms.add(booking.room);

            if (!this.ignoreRoom(booking.room)) {
              this.statistics.nUnknownRooms += 1;
              unknownRooms.add(booking.room);
            }

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

        this.logIgnoredBookingMetrics(
          bookings,
          course,
          p,
          ignoredRooms,
          unknownRooms
        );

        // return early in quick-mode
        if (this.quickMode && i > 10) break;
      }

      this.logBookingMetrics();
      Log.sectionmark();

      /* sort and count the days */

      const days = available
        .keys()
        .map((e) => dayjs(e, DAY_KEY_FORMAT))
        .sort((a, b) => (a.isAfter(b) ? 1 : -1));

      if (days.length === 0) throw Error("0 days have been scraped");

      result.range.start = days[0].startOf("day").format();
      result.range.end = days[days.length - 1].endOf("day").format();

      this.statistics.nDays = days.length;
      this.statistics.range = result.range;

      /* reverse index */

      this.reverseIndex(available, result.range, result.rooms);

      /* eventually, assign the available data structure */

      result.available = Scraper.buildAvailableDto(available);

      Log.info("scrapping successful");
      return result;
    } catch (error) {
      Log.err("scraping failed");
      Log.obj(error);
      return Promise.reject(null);
    } finally {
      Log.obj(this.statistics);
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

      this.statistics.nRequests++;

      Log.req(response.statusCode, url);

      // parse and return on success
      if (response.statusCode === 200) {
        return cheerio.load(response.body);
      } else {
        throw Error(
          `request returned unexpected status code ${response.statusCode}`
        );
      }
    } catch (error) {
      Log.err(`GET ${url}`);
      Log.obj(error);
      return Promise.reject(null);
    }
  }

  private logJkuRoomMetrics(rooms: RoomScrapeDict): void {
    const numRooms = Object.keys(rooms).length;
    Log.milestone(
      "room",
      `scraped ${numRooms} rooms from the JKU homepage or extraneous resource files`,
      numRooms
    );
    Log.obj(Object.values(rooms).map((r) => r.name));
  }

  private logExtraBuildingMetrics(): void {
    if (
      this.statistics.nExtraBuildings > 0 ||
      this.statistics.nExtraRooms > 0
    ) {
      Log.scrape(
        "room",
        `appended ${this.statistics.nExtraBuildings} extra buildings and ${this.statistics.nExtraRooms} room mappings`,
        1
      );
      Log.obj(this.extraBuildingMeta);
    }
  }

  private logMergedRoomMetrics(rooms: RoomsDto): void {
    const missing = Object.values(rooms).filter(
      (r) => r.building === -1 || r.capacity === -1
    );

    this.statistics.nIncompleteRooms = missing.length;

    if (missing.length > 0) {
      Log.err(
        `there are ${missing.length} rooms without building or capacity information`
      );

      const affectedRooms = missing.map((r) => r.name);
      Log.obj(affectedRooms);
    }
  }

  private logCourseMetrics(numUniqueCourses: number): void {
    // correct final statistics by only counting unique numbers
    const numDuplicates = this.statistics.nScrapedCourses - numUniqueCourses;
    this.statistics.nScrapedCourses = numUniqueCourses;

    Log.milestone(
      "COURSE",
      `scraped ${numUniqueCourses} course numbers (removed ${numDuplicates} duplicates)`,
      numUniqueCourses
    );
  }

  private logIgnoredBookingMetrics(
    bookings: BookingScrape[],
    course: CourseScrape,
    progress: number,
    ignoredRooms: Set<string>,
    unknownRooms: Set<string>
  ): void {
    const nIgnored = ignoredRooms.size();
    const nUnknown = unknownRooms.size();
    const nTotalSkipped = nIgnored + nUnknown;

    // update global statistics
    unknownRooms.forEach((r) => {
      if (!this.statistics.unknownRooms.includes(r))
        this.statistics.unknownRooms.push(r);
    });

    // optionally take note on ignored bookings
    let ignoreText = "";
    if (ignoredRooms.size() > 0) {
      let allOrNumber = nIgnored.toString();
      if (nIgnored == nTotalSkipped) allOrNumber = "all";
      ignoreText = ` (ignored ${nTotalSkipped} bookings, of which ${allOrNumber} held ignored rooms)`;
    }

    Log.scrape(
      "booking",
      `scraped ${bookings.length} room bookings for course '${course.showdetails}'${ignoreText}`,
      bookings.length,
      progress
    );

    // warn if we additionally ignored something that wasn't on the ignore list
    if (unknownRooms.size() > 0) {
      const unknowns = `'${unknownRooms.toArray().join("', '")}'`;
      Log.warn(
        `additionally ignored ${unknownRooms.size()} unknown rooms: ${unknowns}`
      );
    }
  }

  private logBookingMetrics(): void {
    Log.milestone(
      "booking",
      `scraped ${this.statistics.nScrapedBookings} room bookings for ${this.statistics.nScrapedCourses} courses`,
      this.statistics.nScrapedBookings
    );
  }

  private ignoreRoom(name: string): boolean {
    const query = Scraper.getCncnlName(name);

    // ignore rooms that are just empty
    // or just contain one or more dashes
    // or contain any pattern from the ignore list
    return (
      query.match(/^\s*$/) != null ||
      query.match(/^-+$/) != null ||
      this.ignoreRooms.some((pattern) => query.includes(pattern))
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
