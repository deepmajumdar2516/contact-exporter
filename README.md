# Contact Exporter

Backup your phone contacts instantly from a single-page website.

## Live Site

The project is deployed on GitHub Pages:

https://deepmajumdar2516.github.io/contact-exporter/

## Repository

GitHub repository:

https://github.com/deepmajumdar2516/contact-exporter

## What It Does

- Requests contact access only after the user taps Export Contacts.
- Uses the browser Contact Picker API to fetch contact names and phone numbers.
- Removes duplicate phone numbers.
- Displays contacts in a responsive, sticky-header table.
- Supports search, alphabetical sorting, and copy-to-clipboard actions.
- Exports contacts to `contacts.xlsx` with SheetJS.
- Also supports CSV export.
- Includes dark/light mode and mobile-friendly UI.

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- SheetJS (`XLSX`) for Excel export

## Browser Support

Best suited for Android Chrome and other browsers that support the Contact Picker API.
Safari and many iPhone browsers do not support the API, so the app shows a graceful warning when it is unavailable.

## Local Run

Open the project with any static file server and load `index.html`.

Example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```