import { Scraper } from "../scraper";

export abstract class ScraperComponent<T> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */

  protected readonly scraper: Scraper;

  constructor(scraper: Scraper) {
    this.scraper = scraper;
  }

  /**
   * Scrapes a component, parses and returns a result
   *
   * @param data Necessary scraper-specifc input values
   * @param progress A percent value that shall be used during logging
   */
  public abstract async scrape(data: any, progress?: number): Promise<T>;
}
