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
export declare interface IResults {
    message: string;
}
