# TerraSphere Build Editor

A web-based character build planner for the TerraSphere RPG system featuring multi-page architecture, expertise system, and secondary role support.

## Project Structure

```
/
├── mastery-selector.html    # Page 1: Select masteries + equipment types
├── expertise-selector.html  # Page 2: Choose expertise
├── rank-selector.html       # Page 3: Assign ranks to masteries and expertise
├── action-selector.html     # Page 4: Choose actions based on masteries
├── build-sheet.html         # Page 5: Final build display and sharing
├── dm-screen.html           # DM Screen: author custom actions per cycle, export codes
├── index.html               # Entry point for imports and character loading
├── shared/                  # Shared modules
│   ├── state-manager.js     # Global state + localStorage persistence
│   ├── dom-utils.js         # DOM manipulation helpers
│   ├── calculations.js      # Stat calculations and validations
│   ├── build-encoder.js     # Build code encoding/decoding
│   ├── buildpack.js         # v1 bit-packed build code codec
│   ├── data-loader.js       # Data loading and caching
│   ├── dm-screen-state.js   # Pure, immutable model of a DM screen
│   ├── loading-manager.js   # Loading spinners and status
│   ├── rollcode-utils.js    # Roll code tag/modifier splicing helpers
│   ├── custom-action-codec.js # Custom action codes (byte-identical copy in ts-discord-bot)
│   └── components/          # Reusable UI components
│       └── site-nav.js      # The one nav bar, mounted into #site-nav on every page
├── resource/                # Data files
│   ├── masteries.js         # 40+ mastery definitions with roles
│   ├── expertise.js         # Expertise system definitions
│   ├── actions.js           # 60+ action definitions
│   ├── armor-abilities.js   # Equipment abilities by type/rank
│   ├── build-sheet.js       # Build sheet rendering logic
│   ├── dm-screen.js         # DM Screen page controller
│   └── action-toggles.js    # Per-action toggle buttons and inputs
└── css/                     # Styling
    ├── app.css              # Main application styles
    ├── build-sheet.css      # Build sheet specific styles
    ├── dm-screen.css        # DM Screen styles
    └── index.css            # Landing page styles
```

## Features

### Core Systems
- **Multi-Page Flow**: Structured progression through mastery → expertise → rank → action → build
- **Secondary Roles**: Masteries have primary and secondary roles for expanded action access
- **Downcasting**: Visual indicators when using masteries outside primary role
- **Expertise System**: Separate character expertise from equipment ranks
- **Rank Validation**: Enforces 2×S, 4×A+ (cumulative) distribution caps (B and below unlimited)

### Advanced Features
- **Advanced Filtering**: Dual-layer filtering (role + use type) with AND/OR logic
- **Action Modifiers**: Toggle buttons for AoE, Versatile, and special flags
- **State Persistence**: localStorage-first with URL parameter fallback
- **Build Sharing**: Compact build codes for easy sharing
- **API Integration**: Import characters from TerraSphere Character Manager
- **Discord Integration**: Generate bot commands from actions

### DM Screen
- `dm-screen.html` lets a DM write **custom actions** — a name, dice everyone takes, a save or check, and a chart of degrees — grouped into cycles.
- Each action exports as a pasteable code (`1…`); a whole cycle as a list (`L1…`); a whole screen as a backup (`S1…`). Players paste action codes into their build sheet; the Discord bot rolls them with `?r custom`.
- The working screen autosaves in the browser; **Save** keeps named screens in IndexedDB beside saved builds.

## Development Workflow

### No Build System
- Pure vanilla JavaScript/HTML/CSS
- No compilation or package management required
- Edit files directly and refresh browser to test

### Before every upload: `pnpm run stamp`
Every local `<script src>` and `<link href>` carries `?v=<stamp>`. The stamp
script rewrites them with the current time and writes `shared/app-version.js`
and `version.json`. Browsers and Cloudflare then fetch the new files instead
of serving cached ones, and an old cached page reloads itself once
(`shared/update-check.js`). `pnpm test` fails if any asset is unstamped.

Steps, in this order:

1. `pnpm run stamp`
2. `pnpm test`
3. Upload `shared/`, `resource/` and `css/` first.
4. Upload the `*.html` files next.
5. Upload `version.json` last.

The order matters. If an HTML file lands before the JS it points at, a visitor
in that window fetches the new URL and gets the old file, and Cloudflare caches
that old file under the new URL for up to two hours. Uploading `version.json`
last means no page reloads itself until everything else is in place.

If the site is broken after an upload, run `pnpm run stamp` again and re-upload
in the same order. A fresh stamp is a clean slate; nothing has to be purged.

Cloudflare must stay on its default caching level, where the query string is
part of the cache key. Do not add a "Cache Everything" rule for `/build/`, or
`?v=` stops busting the edge cache and the reload brings back old HTML.

Every `pnpm run stamp` rewrites the stamp on about 120 lines across the 8 HTML
files plus the two generated files. When two branches both changed a `<head>`,
do not hand-resolve those hunks: take either side, then run `pnpm run stamp`
once after the merge.

### Adding Features

#### Data Modifications
- **Add Mastery**: Edit `resource/masteries.js`
- **Add Action**: Edit `resource/actions.js`
- **Add Expertise**: Edit `resource/expertise.js`
- **Add Equipment**: Edit `resource/armor-abilities.js`

#### UI Changes
- **Page Layout**: Edit individual `.html` files
- **Styling**: Edit files in `css/` directory
- **Components**: Edit files in `shared/components/`

#### Logic Updates
- **State Management**: Modify `shared/state-manager.js`
- **Calculations**: Edit `shared/calculations.js`
- **URL Sharing**: Edit `shared/build-encoder.js`
- **Data Loading**: Edit `shared/data-loader.js`

### Testing

1. **Multi-page Flow**: Start at `mastery-selector.html`
2. **Character Import**: Test `index.html#load.{charId}`
3. **Build Import**: Test `index.html#import.{buildCode}`
4. **State Persistence**: Navigate between pages to verify data retention
5. **Build Codes**: Test export/import functionality

## Key Files for Common Tasks

| Task | File(s) |
|------|---------|
| Add new mastery | `resource/masteries.js` |
| Add new action | `resource/actions.js` |
| Add new expertise | `resource/expertise.js` |
| Modify calculations | `shared/calculations.js` |
| Change page layout | Individual `.html` files |
| Update styling | `css/app.css`, `css/build-sheet.css` |
| Fix state bugs | `shared/state-manager.js` |
| Update API integration | `index.html` (loadCharacterProfile function) |

## Architecture Patterns

### State Management
- Centralized state in `BuildState` class
- localStorage as primary persistence
- URL parameters for sharing and deep linking
- Event listeners for reactive updates

### Data Flow
1. Load state from localStorage or URL
2. User interaction triggers state updates
3. State changes notify listeners
4. UI updates automatically
5. State persists to localStorage

### Component Communication
- Global references for key instances
- Shared modules for common functionality
- Data caching in `data-loader.js`
- Event-based communication between pages
