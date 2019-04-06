import numeral from "numeral";

export class Utils {

    /**
     * Converts the string-based minute representation to a number-based representation,
     * e.g., converts `510` to `"08:30"` since `8 x 60 + 30 = 510`
     *
     * @param timeString A time string, formatted like `"08:30"`
     */
    public static fromTimeString(timeString: string): number {
        const s: string[] = timeString.split(":");
        const hours = parseInt(s[0], 10);
        const mins = parseInt(s[1], 10);

        return hours * 60 + mins;
    }

    /**
     * Converts the number-based minute representation to a string-based representation,
     * e.g., converts `510` to `"08:30"` since `8 x 60 + 30 = 510`
     *
     * @param minutes The amount of minutes from the start of the day.
     */
    public static fromMinutes(minutes: number): string {
        const quo = Math.floor(minutes / 60);
        const rem = minutes % 60;

        return numeral(quo).format("00") + ":" + numeral(rem).format("00");
    }

}
