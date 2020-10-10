import { ChronoUnit, DateTimeFormatter, LocalTime } from "@js-joda/core";

export class DateUtils {

    /**
     * Converts a time string to a `LocalTime` object
     *
     * @param str A time string, formatted like `"08:30"`
     */
    public static fromString(text: string): LocalTime {
        return LocalTime.parse(text).truncatedTo(ChronoUnit.MINUTES);
    }

    /**
     * Formats the `LocalTime` object to a human-readable string, e.g. `"08:30"`
     *
     * @param time A `LocalTime` object
     */
    public static toString(time: LocalTime): string {
        return time.format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    /**
     * Converts the minute-based representation to a `LocalTime` object,
     * e.g. converts `510` to `LocalTime.parse("08:30")` since `8 x 60 + 30 = 510`
     *
     * @param minutes The amount of minutes from the start of the day
     */
    public static fromMinutes(minutes: number): LocalTime {
        return LocalTime.ofSecondOfDay(minutes * 60);
    }

    /**
     * Converts the `LocalTime` object to a minute-based representation,
     * e.g. converts `LocalTime.parse("08:30")` to `510` since `8 x 60 + 30 = 510`
     *
     * @param time A `LocalTime` object
     */
    public static toMinutes(time: LocalTime): number {
        return time.toSecondOfDay() / 60;
    }

}
