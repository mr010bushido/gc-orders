<img src="assets/icon.svg" width="64" height="64" alt="">

# gc-orders

Online cake booking and order management for Giuseppe's Cakes.

- Scope: [`docs/PBS.md`](docs/PBS.md) (product breakdown structure + open questions)
- PRD: [`docs/PRD.md`](docs/PRD.md) · design system: [`design/DESIGN.md`](design/DESIGN.md) · flow prototype: [`docs/prototype/`](docs/prototype/cake-booking-prototype.html)

## Develop

```sh
uv sync
uv run pytest
uv run ruff check . && uv run ruff format .
```

Branch from `main`, open a PR; CI runs lint + tests.
