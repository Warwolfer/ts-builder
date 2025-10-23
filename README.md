# TerraSphere Build Editor

A web-based character build planner for the TerraSphere RPG system featuring multi-page architecture, expertise system, and secondary role support.

## Project Structure

```
/
├── mastery-selector.html    # Page 1: Select masteries + equipment types
├── expertise-selector.html  # Page 2: Assign ranks to masteries and expertise
├── action-selector.html     # Page 3: Choose actions based on masteries
├── build-sheet.html         # Page 4: Final build display and sharing
├── index.html               # Entry point for imports and character loading
├── shared/                  # Shared modules
│   ├── state-manager.js     # Global state + localStorage persistence
│   ├── dom-utils.js         # DOM manipulation helpers
│   ├── calculations.js      # Stat calculations and validations
│   ├── build-encoder.js     # Build code encoding/decoding
│   ├── data-loader.js       # Data loading and caching
│   ├── loading-manager.js   # Loading spinners and status
│   ├── config.js            # Configuration constants
│   └── components/          # Reusable UI components
├── resource/                # Data files
│   ├── masteries.js         # 40+ mastery definitions with roles
│   ├── expertise.js         # Expertise system definitions
│   ├── actions.js           # 700+ action definitions
│   ├── armor-abilities.js   # Equipment abilities by type/rank
│   ├── build-sheet.js       # Build sheet rendering logic
│   └── card-templates.js    # Action card templates
└── css/                     # Styling
    ├── app.css              # Main application styles
    ├── build-sheet.css      # Build sheet specific styles
    └── index.css            # Landing page styles
```

## Features

### Core Systems
- **Multi-Page Flow**: Structured progression through mastery → expertise → action → build
- **Secondary Roles**: Masteries have primary and secondary roles for expanded action access
- **Downcasting**: Visual indicators when using masteries outside primary role
- **Expertise System**: Separate character expertise from equipment ranks
- **Rank Validation**: Enforces 1×S, 2×A, 3×B distribution caps

### Advanced Features
- **Advanced Filtering**: Dual-layer filtering (role + use type) with AND/OR logic
- **Action Modifiers**: Toggle buttons for AoE, Versatile, and special flags
- **State Persistence**: localStorage-first with URL parameter fallback
- **Build Sharing**: Compact build codes for easy sharing
- **API Integration**: Import characters from TerraSphere Character Manager
- **Discord Integration**: Generate bot commands from actions

## Development Workflow

### No Build System
- Pure vanilla JavaScript/HTML/CSS
- No compilation or package management required
- Edit files directly and refresh browser to test

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
