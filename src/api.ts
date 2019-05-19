import { LocalDate, LocalTime } from "js-joda";

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
    available: Array<[LocalTime, LocalTime]>;
}

/**
 * Endpoint for performing queries on free rooms
 */
export class RoomSearch {

    public static searchFreeRooms(query: IQuery): IResult | null {
        try {

            // TODO: mocked output

            if (query.to == null) {
                return [];
            } else {
                const todo: IResult = [
                    {
                        available: [
                            [DateUtils.fromString("08:30"), DateUtils.fromString("10:00")],
                            [DateUtils.fromString("15:30"), DateUtils.fromString("17:00")],
                        ],
                        room: "S3 218",
                    },
                    {
                        available: [
                            [DateUtils.fromString("08:30"), DateUtils.fromString("12:00")],
                        ],
                        room: "BA 9901",
                    },
                ];

                return todo;
            }

        } catch (e) {
            console.error(e);
            return null;
        }
    }

}
