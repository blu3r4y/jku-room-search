/// <reference types="@dynatrace/dtrum-api-types" />

import dayjs from "dayjs";
import scrollIntoView from "scroll-into-view-if-needed";

import { Jku } from "../common/jku";
import { SearchApi } from "./searchApi";
import { IndexDto } from "../common/dto";
import { LogUtils } from "../common/utils";
import { ApiResponse } from "../common/types";
import {
  TeaserState as TSt,
  ButtonState as BSt,
  Frontend,
} from "./frontend/frontend";

export class App {
  private searchApi?: SearchApi;
  private readonly frontend: Frontend;
  private readonly indexUrl: string;
  private readonly debugMode: boolean;

  constructor(indexUrl: string, debugMode = false) {
    this.indexUrl = indexUrl;
    this.debugMode = debugMode;
    this.frontend = new Frontend({
      datepicker: $("#datepicker")[0] as HTMLElement,
      fromTime: $("#fromTime"),
      toTime: $("#toTime"),
      results: $("#results"),
      teaserText: $("#teaserText"),
      teaserBlock: $("#teaserBlock"),
      spinner: $("#spinner"),
      buttonText: $("#buttonText"),
      versionText: $("#versionText"),
      cover: $("#cover"),
      button: $("#button")[0] as HTMLInputElement,
      anchor: $("#anchor")[0],
    });
  }

  /**
   * Main app entry point
   */
  public init(): void {
    if (this.debugMode) console.log("debug mode enabled");

    this.frontend.init(Jku.getCourseStartTimes(), Jku.getCourseEndTimes());
    this.initSeachApi(this.indexUrl);

    // register form submission handler
    $("#form").on("submit", App.getSearchEventHandler(this));

    // only show page content when loading finished
    $(window).on("load", () => this.frontend.hideCover());
  }

  /**
   * Load the latest index and initialize the global `SEARCH_API` object
   *
   * @param indexUrl The URL that points to index.json
   */
  private initSeachApi(indexUrl: string) {
    const xhr: JQuery.jqXHR = $.getJSON(indexUrl);

    xhr.done((index: IndexDto) => {
      if (this.debugMode) console.log("data", index);

      this.searchApi = new SearchApi(index);

      this.frontend.renderVersion(dayjs(index.version));
      this.frontend.renderButton(BSt.Enabled);
    });

    xhr.fail(() => {
      LogUtils.error(
        "err::xhrRequest",
        `the XHR request 'GET ${indexUrl}' failed.`
      );
      this.frontend.render(
        "😟 Sorry, something broke <tt>[err::xhrRequest]</tt>",
        TSt.Error
      );
    });
  }

  /**
   * Handle pressing the search button by initiating an API query
   *
   * @param event The DOM event object
   */
  private static getSearchEventHandler(app: App) {
    return (event: Event) => {
      app.frontend.renderButton(BSt.Spinning);

      const searchAction = window.dtrum?.enterAction("search", "click");

      // get user query
      const query = app.frontend.getQuery();
      if (app.debugMode) console.log("query", query);

      if (query == null) {
        LogUtils.error(
          "err::parseQuery",
          "the frontend input could not be parsed into a valid user query"
        );
        app.frontend.render(
          "😟 Sorry, something broke <tt>[err::parseQuery]</tt>",
          TSt.Error
        );
        return;
      }

      if (app.searchApi == null) {
        LogUtils.error("err::initApi", "room data wasn't loaded properly");
        app.frontend.render(
          "😟 Sorry, something broke <tt>[err::initApi]</tt>",
          TSt.Error
        );
        return;
      }

      // perform user query
      const result: ApiResponse | null = app.searchApi.searchFreeRooms(query);
      if (app.debugMode) console.log("result", result);

      if (result == null) {
        LogUtils.error(
          "err::searchApi",
          "the search algorithm could not process the query"
        );
        app.frontend.render(
          "😟 Sorry, something broke <tt>[err::searchApi]</tt>",
          TSt.Error
        );
        return;
      }

      // show result status
      if (result.length > 0) {
        app.frontend.render("😊 We found some free rooms", TSt.Success, result);
      } else {
        app.frontend.render(
          "😟 Sorry, we don't have data for this day",
          TSt.NoResult
        );
      }

      // scroll to the results
      scrollIntoView(app.frontend.getAnchor(), {
        behavior: "smooth",
        scrollMode: "if-needed",
      });

      // briefly show the spinner before re-enabling the button
      setTimeout(() => app.frontend.renderButton(BSt.Enabled), 150);
      event.preventDefault();

      if (searchAction) {
        window.dtrum?.leaveAction(searchAction);
      }
    };
  }
}
