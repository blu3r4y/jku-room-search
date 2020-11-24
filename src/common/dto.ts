/**
 * Index of inverse room bookings
 */
export declare interface IndexDto {
  version: string;
  range: RangeDto;
  rooms: RoomsDto;
  buildings: BuildingsDto;
  available: AvailableDto;
}

/**
 * Identifies the indexed range
 */
export declare interface RangeDto {
  start: string;
  end: string;
}

/**
 * Identifies a room in the index
 */
export declare interface RoomsDto {
  [id: string]: {
    name: string;
    building: number;
    capacity: number;
  };
}

/**f
 * Identifies a building in the index
 */
export declare interface BuildingsDto {
  [id: string]: {
    name: string;
  };
}

/**
 * Identifies available (free) rooms in the index,
 * grouped by days and rooms
 */
export declare interface AvailableDto {
  [day: string]: AvailableRoomsDto;
}

export declare interface AvailableRoomsDto {
  [room: string]: TimeSpanDto[];
}

/**
 * Identifies a timespan
 */
export declare type TimeSpanDto = [number, number];

/**
 * The format of the key in the `AvailableDto` data structure
 */
export const DAY_KEY_FORMAT = "YYYY-MM-DD";
