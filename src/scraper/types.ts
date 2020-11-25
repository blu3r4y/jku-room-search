import { RangeDto } from "../common/dto";
import { Day, Time } from "../common/types";

/**
 * A scraped building entity
 */
export declare interface BuildingScrape {
  /** The full name of the building */
  name: string;
  /** The url identifier as used on the JKU homepage */
  url: string;
}

/**
 * A scraped room entity
 */
export declare type RoomScrape = {
  /** The room name */
  name: string;
  /** The maximum capacity of the room */
  capacity?: number;
  /** The associated building to this room */
  buildingId?: number;
  /** The <option> identifier used at the KUSSS homepage */
  kusssId?: string;
};

/**
 * A scraped course entity
 */
export declare interface CourseScrape {
  courseclassid: string;
  coursegroupid: string;
  showdetails: string;
}

/**
 * A scraped booking for some course
 * (one course usually has multiple bookings)
 */
export declare interface BookingScrape {
  /** The room name */
  room: string;
  /** The day */
  date: Day;
  /** The start time*/
  from: Time;
  /** The end time */
  to: Time;
}

/**
 * A statistics object used during scraping
 */
export declare interface ScrapeStatistics {
  requests: number;
  scrapedBuildings: number;
  scrapedKusssRooms: number;
  scrapedJkuRooms: number;
  scrapedCourses: number;
  scrapedBookings: number;
  incompleteRooms: number;
  ignoredBookings: number;
  days: number;
  range?: RangeDto;
}

/**
 * Provides a mapping from building names to rooms,
 * so that rooms that might not be found on the homepage
 * can be mapped with this additional data structure
 */
export declare interface BuildingToRoomsMap {
  [building: string]: string[];
}

export const SEARCH_PAGE = "/kusss/coursecatalogue-start.action?advanced=true";
export const SEARCH_RESULTS =
  "/kusss/coursecatalogue-search-lvas.action?sortParam0courses=lvaName&asccourses=true" +
  "&detailsearch=true&advanced=%24advanced&lvaName=&abhart=all&organisationalHint=&lastname=&firstname=" +
  "&lvaNr=&klaId=&type=all&curriculumContentKey=all&orgid=Alle&language=all&day=all&timefrom=all&timeto=all" +
  "&room={{room}}+&direct=true#result";
export const COURSE_DETAILS =
  "/kusss/selectcoursegroup.action?coursegroupid={{coursegroupid}}&showdetails={{showdetails}}" +
  "&abhart=all&courseclassid={{courseclassid}}";

export const BUILDINGS_PAGE = "/en/campus/the-jku-campus/buildings/";
export const BUILDING_DETAILS =
  "/en/campus/the-jku-campus/buildings/{{building}}/";
