import { LocalDate, LocalTime } from "@js-joda/core";

import { DateUtils } from "./utils";

/**
 * API query for requesting free rooms
 */
export declare interface IQuery {
    day: LocalDate;
    from: LocalTime;
    to: LocalTime | null;
}

/**
 * API result object with free rooms
 */
export type IResult = IFreeRoom[];

/**
 * A single free room entry
 */
export declare interface IFreeRoom {
    room: string;
    available: [LocalTime, LocalTime][];
}

/**
 * The structure of the room data index
 */
export declare interface IRoomData {
    version: string;
    range: { start: string, end: string };
    rooms: { [id: string]: string };
    available: { [id: string]: { [id: string]: [number, number][] } };
}

/**
 * Endpoint for performing queries on free rooms
 */
export class RoomSearch {

    private data: IRoomData;

    constructor(data: IRoomData) {
        this.data = data;
    }

    /**
     * Search the index for free rooms
     *
     * @param query The user query object
     */
    public searchFreeRooms(query: IQuery): IResult | null {
        try {

            // check if we got any data on this day
            if (!(query.day.toString() in this.data.available)) {
                return [];
            }

            const result: IResult = [];
            const cursor = this.data.available[query.day.toString()];

            const from: number = DateUtils.toMinutes(query.from);
            const to: number = query.to != null ? DateUtils.toMinutes(query.to) : -1;

            // iterate over free rooms
            Object.keys(cursor).forEach((roomId: string) => {
                let matches: number[][] = [];

                if (query.to == null) {
                    matches = cursor[roomId].filter((duration) =>
                        from >= duration[0] && from < duration[1]);
                } else {
                    matches = cursor[roomId].filter((duration) =>
                        from >= duration[0] && to <= duration[1]);
                }

                // append the result if we found some matches
                if (matches.length > 0) {
                    result.push({
                        available: matches.map((duration) =>
                            [DateUtils.fromMinutes(duration[0]), DateUtils.fromMinutes(duration[1])]),
                        room: this.data.rooms[roomId],
                    });
                }
            });

            return result;

        } catch (e) {
            console.error(e);
            return null;
        }
    }

}
