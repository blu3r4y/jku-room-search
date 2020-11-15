export class SplitTree {
  /**
   * Given a full interval and a set of exclusions to cut out of it,
   * return a minimal set of remaining intervals
   *
   * @param interval The full interval
   * @param exclusions A list of exclusions, which shall be cut out of the full interval
   */
  public static split(
    interval: [number, number],
    exclusions: [number, number][]
  ): [number, number][] {
    const root = new Interval(interval[0], interval[1]);
    for (const exclusion of exclusions) {
      root.split(exclusion[0], exclusion[1]);
    }

    const list = new Array<[number, number]>();
    this.appendLeafs(root, list);

    return list;
  }

  private static appendLeafs(interval: Interval, list: [number, number][]) {
    // prune empty intervals
    if (interval.empty) {
      return;
    }

    // append only child-less nodes (leafs)
    if (interval.left == null && interval.right == null) {
      list.push([interval.a, interval.b]);
    } else {
      if (interval.left != null) {
        this.appendLeafs(interval.left, list);
      }
      if (interval.right != null) {
        this.appendLeafs(interval.right, list);
      }
    }
  }
}

class Interval {
  /** lower bound */
  public a: number;
  /** upper bound */
  public b: number;

  /** left sub-interval, if this interval has been split */
  public left: Interval | null = null;
  /** right sub-interval, if this interval has been split */
  public right: Interval | null = null;

  /** interval, which has been cut completely */
  public empty: boolean = false;

  constructor(a: number, b: number) {
    this.a = a;
    this.b = b;
  }

  public cut(x: number, y: number) {
    console.assert(this.left == null && this.right == null);

    // prune if we observe a empty node
    if (!this.empty) {
      if (x <= this.a && y >= this.b) {
        // interval needs to be cut completely
        this.empty = true;
      } else {
        // clamp cut range to interval bounds
        const xBound = Math.max(this.a, Math.min(this.b, x));
        const yBound = Math.min(this.b, Math.max(this.a, y));

        // add sub intervals (if the interval would not be empty)
        this.left = xBound - this.a > 0 ? new Interval(this.a, xBound) : null;
        this.right = this.b - yBound > 0 ? new Interval(yBound, this.b) : null;
      }
    }
  }

  public split(x: number, y: number) {
    // test for existing and non-empty sub-intervals
    if (this.left != null || this.right != null) {
      // propagate split to sub-intervals
      if (this.left != null && x < this.left.b) {
        this.left.split(x, y);
      }
      if (this.right != null && y > this.right.a) {
        this.right.split(x, y);
      }
    } else {
      // no children, cut this interval directly
      this.cut(x, y);
    }
  }
}
