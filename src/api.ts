import { Utils } from "./utils";

/**
 * API query for requesting free rooms
 */
export declare interface IQuery {
    day: Date;
    from: number;
    to: number | null;
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
    available: Array<[number, number]>;
}

/**
 * Endpoint for performing queries on free rooms
 */
export class RoomSearch {

    public static searchFreeRooms(query: IQuery): IResult {

        // TODO: mocked output

        if (query.to === -1) {
            return [];
        } else {
            const todo: IResult = [
                {
                    available: [
                        [Utils.fromTimeString("08:30"), Utils.fromTimeString("10:00")],
                        [Utils.fromTimeString("15:30"), Utils.fromTimeString("17:00")],
                    ],
                    room: "S3 218",
                },
                {
                    available: [
                        [Utils.fromTimeString("08:30"), Utils.fromTimeString("12:00")],
                    ],
                    room: "BA 9901",
                },
            ];

            return todo;
        }
    }

}
