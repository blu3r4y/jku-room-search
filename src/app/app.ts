/// <reference types="@dynatrace/dtrum-api-types" />

import $ from "cash-dom";
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
      versionTextInline: $("#versionTextInline"),
      cover: $("#cover"),
      button: $("#button")[0] as HTMLInputElement,
      anchor: $("#anchor")[0] as HTMLElement,
    });
  }

  /**
   * Main app entry point
   */
  public init(): void {
    if (this.debugMode) console.log("🤖 debug mode enabled");

    this.frontend.init(Jku.getCourseStartTimes(), Jku.getCourseEndTimes());
    this.initSeachApi(this.indexUrl);

    // register form submission handler (animate, scroll)
    $("#form").on("submit", (event) => {
      App.handleSearchEvent(this, true, true);
      event.preventDefault();
    });

    // register time drop down submission handlers (animate, no scroll)
    $("#fromTime").on("change", () => App.handleSearchEvent(this, true));
    $("#toTime").on("change", () => App.handleSearchEvent(this, true));

    // register date picker submission handler (animate, no scroll
    this.frontend.datepickerOnSelect = () => App.handleSearchEvent(this, true);

    // only show page content when loading finished
    $(window).on("load", () => this.frontend.hideCover());
  }

  /**
   * Load the latest index and initialize the global `SEARCH_API` object
   *
   * @param indexUrl The URL that points to index.json
   */
  private initSeachApi(indexUrl: string) {
    const xhr = new XMLHttpRequest();

    const handlXhrError = () => {
      LogUtils.error(
        "err::xhrRequest",
        `the XHR request 'GET ${indexUrl}' failed.`
      );
      this.frontend.render(
        "😟 Sorry, something broke <tt>[err::xhrRequest]</tt>",
        TSt.Error
      );
    };

    xhr.onerror = handlXhrError;
    xhr.onload = () => {
      try {
        if (xhr.status !== 200 && xhr.onerror)
          throw new Error(xhr.status.toString());

        // try parsing the response
        const index: IndexDto = JSON.parse(xhr.response);
        if (this.debugMode) console.log("data", index);

        this.searchApi = new SearchApi(index);
        this.frontend.renderVersion(dayjs(index.version));
        this.frontend.renderButton(BSt.Enabled);

        // do an initial search (no animate, no scroll)
        App.handleSearchEvent(this);
      } catch (e) {
        handlXhrError();
      }
    };

    xhr.open("GET", indexUrl, true);
    xhr.send();
  }

  /**
   * Handle pressing the search button by initiating an API query
   *
   * @param event The DOM event object
   * @param animate Whether to animate to show the spinner and animate tables
   * @param scroll Whether to scroll to the anchor element
   */
  private static handleSearchEvent(app: App, animate = false, scroll = false) {
    if (animate) app.frontend.renderButton(BSt.Spinning);

    const searchAction = window.dtrum?.enterAction("search");

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
      app.frontend.render(
        "😊 These rooms are not used for classes at this time",
        TSt.Success,
        result,
        animate
      );
    } else {
      app.frontend.render(
        "😟 Sorry, we don't have data for this day",
        TSt.NoResult
      );
    }

    // scroll to the results
    if (scroll) {
      scrollIntoView(app.frontend.getAnchor(), {
        behavior: "smooth",
        scrollMode: "if-needed",
      });
    }

    if (searchAction) window.dtrum?.leaveAction(searchAction);

    // briefly show the spinner before re-enabling the button
    if (animate) {
      setTimeout(() => app.frontend.renderButton(BSt.Enabled), 150);
    } else {
      app.frontend.renderButton(BSt.Enabled);
    }
  }
}
