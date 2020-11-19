import dayjs from "dayjs";
import { Duration } from "dayjs/plugin/duration";

/** Represents a date, but will also always hold some time, because it is backed by IDate */
export type IDate = dayjs.Dayjs;

/** Represents a time of day, but is backed by a dayjs.ITime */
export type ITime = Duration;
