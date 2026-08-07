# Gotchas

- Admin table filter props must be destructured by the shared sortable header before column inputs can render.
- The Services table should keep its per-column inputs in a separate header row, matching Customers; embedding filters inside sortable headers makes the layout inconsistent.