import colors from "ansicolors";

export class Logger {

    /**
     * Pretty-print log (and error) messages with category and status code
     *
     * @param text The descriptive message to log
     * @param category The category to which this message belongs (optional)
     * @param status Custom status code or text (optional, default is 'OK' or 'ERR' if error = true)
     * @param error Style this message differently if this is an error (default is false)
     */
    public static info(text: any, category?: any, status?: any, error: boolean = false) {
        if (category == null && status == null) {
            // pure unmodified logging
            console.log(text);
        } else {
            category = (category == null ? "" : category.toString()).padEnd(8, " ");
            status = (status == null ? (error ? "ERR" : "OK") : status.toString()).padStart(5, " ");
            status = error ? colors.brightRed(`${status}`) : colors.green(`${status}`);

            if (error) {
                const label = error ? colors.bgBrightRed(colors.brightWhite(" ERROR ")) : "";
                console.log(category, status, label, text);
            } else {
                console.log(category, status, text);
            }
        }
    }

    /**
     * Pretty-print error messages with category and status code
     *
     * @param text The descriptive message to log as an error
     * @param category he category to which this message belongs (optional)
     * @param status Custom status code or text (optional, default is 'ERR')
     */
    public static err(text: any, category?: any, status?: any) {
        Logger.info(text, category, status, true);
    }

}
