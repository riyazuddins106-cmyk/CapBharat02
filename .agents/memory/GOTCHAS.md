# Gotchas

- Admin table filter props must be destructured by the shared sortable header before column inputs can render.
- The Services table should keep its per-column inputs in a separate header row, matching Customers; embedding filters inside sortable headers makes the layout inconsistent.
- Admin uploads must not hardcode a relative `/api` URL: public admin previews can route that request to the HTML shell, causing `Unexpected token '<'` during JSON parsing.
- Category partner counts cannot rely only on `professionals.category_id`; include distinct professionals assigned through active services and `partner_services`.
- Documentation workflow guidance must be committed and pushed to GitHub before importing into another Replit account; local unpushed changes do not transfer.
- Admin startup must not launch duplicate and expensive data requests concurrently; Supabase/API pool queuing can leave proxied requests pending and keep the global shell spinner active.