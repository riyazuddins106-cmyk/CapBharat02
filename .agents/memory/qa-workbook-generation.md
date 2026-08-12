---
name: QA workbook generation
description: Durable guidance for generating and validating Excel QA reports in this workspace.
---

XlsxWriter tables already create their own filter controls. Adding a separate
`autofilter()` over the same range raises an overlapping-range error.

**Why:** The first report-generation attempt failed before writing the workbook
because the table filter and explicit autofilter overlapped.

**How to apply:** Use the table's built-in filter, then validate generated
`.xlsx` files with `unzip -t` before presenting them as deliverables.