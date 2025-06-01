# RustDB

**RustDB** is the core backend service for managing and updating the Rust item database, fetching data from the Steam API. It powers the RustDB ecosystem, providing up-to-date information on Rust skins and items.

## Features

- Fetches and updates Rust item data from the Steam API
- Maintains a comprehensive database of all Rust skins and items
- Supports efficient queries and indexing for fast access
- Designed to work seamlessly with [RustDB-API](https://github.com/FrantisekSilhan/RustDB-API) and other related services

## Usage

This service is intended to be run as a backend process. It periodically fetches new data and updates the main database.

## Related Projects

- [RustDB](https://github.com/FrantisekSilhan/RustDB) — Main database
- [RustDB-API](https://github.com/FrantisekSilhan/RustDB-API) — Public API for accessing RustDB data
- [RustDB-Explorer](https://github.com/FrantisekSilhan/RustDB-Explorer) — Web frontend for browsing Rust items
- [RustDB-Inventory](https://github.com/FrantisekSilhan/RustDB-Inventory) — User inventory database
- [RustDB-Inventory-API](https://github.com/FrantisekSilhan/RustDB-Inventory-API) — API for user inventory database

## License

AGPL-3.0
