import {
  limit, onSnapshot, orderBy, query, startAfter,
  type DocumentData, type OrderByDirection, type Query, type QueryDocumentSnapshot,
} from "firebase/firestore";

import { PUBLIC_QUERY_LIMIT } from "./publicPageSize";

type Row = QueryDocumentSnapshot<DocumentData>;

type Page = {
  rows?: Row[];
  stop?: () => void;
};

/** Watch an ordered window without issuing any query over the public page limit. */
export function subscribePublicWindow(
  source: Query<DocumentData>,
  field: string,
  direction: OrderByDirection,
  size: number,
  onRows: (rows: Row[]) => void,
  onError: (error: Error) => void,
) {
  const ordered = query(source, orderBy(field, direction));
  const pages: Page[] = [];
  let stopped = false;

  function removeAfter(index: number) {
    for (const page of pages.splice(index + 1)) page.stop?.();
  }

  function stop() {
    stopped = true;
    removeAfter(-1);
  }

  function watch(index: number, cursor?: Row) {
    const page: Page = {};
    pages.push(page);
    const remaining = size - index * PUBLIC_QUERY_LIMIT;
    const count = Math.min(PUBLIC_QUERY_LIMIT, remaining);
    const options = cursor ? [startAfter(cursor), limit(count)] : [limit(count)];

    page.stop = onSnapshot(query(ordered, ...options), (snapshot) => {
      if (stopped || pages[index] !== page) return;
      const previousLast = page.rows?.at(-1);
      page.rows = snapshot.docs;
      const last = page.rows.at(-1);

      if (page.rows.length < count || remaining === count) {
        removeAfter(index);
      } else if (!previousLast || previousLast.id !== last?.id ||
                 previousLast.get(field) !== last?.get(field)) {
        removeAfter(index);
        if (last) watch(index + 1, last);
      }
      if (pages.every((entry) => entry.rows !== undefined)) {
        onRows(pages.flatMap((entry) => entry.rows ?? []));
      }
    }, (error) => {
      if (stopped || pages[index] !== page) return;
      stop();
      onError(error);
    });
  }

  if (size > 0) watch(0);
  else onRows([]);
  return stop;
}
