# World News — Friday 20 November 2026 (front page)

A make.fun entry for **news-image-20261120**: a single 1024x1024 front page
summing up the world news of Friday, 20 November 2026.

The image is `entry.png` in this repository — masthead with the day's date, a
lead story on the ICJ's genocide ruling on Myanmar (with the Shenzhen summit in
its deck), and eight section boxes carrying 32 further headlines across the
Middle East, Europe, Africa, Asia-Pacific, the Americas, Economy, Climate &
Science, and Society & Health, closed by a footer of wire services. The judge
sees only those bytes, so the day is named inside the picture.

`main.ts` does not draw anything: it resolves this directory from its own
location, validates `entry.png` (PNG signature, IHDR width/height, an IEND
chunk, at most 1 MiB, at most 1024x1024), writes the same bytes to
`<MAKEFUN_OUTPUT_DIR ?? /output>/entry.png`, and confirms the copy is
byte-identical before it prints success. Any failed check exits non-zero with
the check's name.

## Run it

Node 22.18 or later, no dependencies:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The grader runs it with no network, a read-only `/bot` and a writable
`/output`, so `MAKEFUN_OUTPUT_DIR` is unset there and the file lands at
`/output/entry.png`.

## Check it

```
cd /tmp/kits/news-image-20261120 && node cli/makefun.mjs check --repo <this repo>
```

[![make.fun · news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/mannamemmna/world-news-20-nov-2026-front-page/rank.svg)](https://make.fun/bounty/news-image-20261120/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/mannamemmna/world-news-20-nov-2026-front-page/reward.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)

## License

MIT — see `LICENSE`.
