import c from "chalk";

export class Log {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */

  public static info(text: string): void {
    const group_ = c.cyan("INFO");
    const text_ = c.cyan(text);

    console.log(`${group_} ${text_}`);
  }

  public static warn(text: string): void {
    const group_ = c.yellow("WARN");
    const text_ = c.yellow(text);

    console.log(`${group_} ${text_}`);
  }

  public static err(text: string): void {
    const group_ = c.bgRed("ERROR");
    const text_ = c.red.underline(text);

    console.log(`${group_} ${text_}`);
  }

  public static obj(object: any): void {
    console.log(object);
  }

  public static req(status: number, url: string): void {
    const status_ =
      status >= 200 && status < 300
        ? c.dim(status.toString())
        : c.red(status.toString());
    const url_ = c.dim(url);

    console.log(`${c.dim("GET")} ${status_} ${url_}`);
  }

  public static scrape(
    group: string,
    text: string,
    numItems: number,
    progress = 1
  ): void {
    Log.logScraperInfo(group, text, numItems, progress, false);
  }

  public static milestone(
    group: string,
    text: string,
    numItems: number,
    progress = 1
  ): void {
    Log.logScraperInfo(group, text, numItems, progress, true);
  }

  public static sectionmark(): void {
    const mark = c.green("-------------------------------------");
    console.log();
    console.log(mark);
    console.log();
  }

  private static logScraperInfo(
    group: string,
    text: string,
    numItems: number,
    progress = 1,
    major = false
  ): void {
    const success = numItems > 0;

    let group_ = major
      ? c.bgGreen(`${group.toUpperCase()}`)
      : c.cyan(`${group.toUpperCase()}`);
    if (!success) group_ = c.bgRed(`${group.toUpperCase()}`);

    let text_ = success ? text : c.red.underline(text);
    if (major) text_ = c.green(text_);

    const progress_ = c.green(
      (Math.round(progress * 100).toString() + "%").padStart(4, " ")
    );

    if (major) console.log();
    console.log(`${group_} ${progress_} ${text_}`);
  }
}
