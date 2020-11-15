import colors from "ansicolors";

export class Logger {
  /**
   * Pretty-print log (and error) messages with category and status code
   *
   * @param text The descriptive message to log
   * @param category The category to which this message belongs (optional)
   * @param status Custom status code or text (optional, default is 'OK' or 'ERR' if error = true)
   * @param progress A progress indicator that will be shown in percent (accepts numbers 0.0 - 1.0)
   * @param error Style this message differently if this is an error (default is false)
   */
  public static info(
    text: any,
    category?: string,
    status?: string,
    progress?: number,
    error: boolean = false
  ) {
    if (category == null && status == null && progress == null) {
      // pure unmodified logging
      console.log(text);
    } else {
      category = (category == null ? "" : category.toString()).padEnd(10, " ");
      category = colors.cyan(category);

      status = (status == null
        ? error
          ? "ERR"
          : "OK"
        : status.toString()
      ).padStart(5, " ");
      status = error
        ? colors.brightRed(`${status}`)
        : colors.brightGreen(`${status}`);

      let progressStr = (progress == null
        ? ""
        : Math.round(progress * 100).toString() + "%"
      ).padStart(4, " ");
      progressStr = colors.green(progressStr);

      if (error) {
        const label = error
          ? colors.bgBrightRed(colors.brightWhite(" ERROR "))
          : "";
        console.log(category, status, progressStr, label, text);
      } else {
        console.log(category, status, progressStr, text);
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
  public static err(text: any, category?: string, status?: string) {
    Logger.info(text, category, status, undefined, true);
  }
}
