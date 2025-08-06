# TerraSphere Build Editor

## Project Structure

```
/
├── v2/                          # V2 system (ACTIVE DEVELOPMENT)
│   ├── mastery-selector.html    # Page 1: Select masteries + equipment
│   ├── expertise-selector.html  # Page 2: Assign ranks 
│   ├── action-selector.html     # Page 3: Choose actions
│   ├── build-sheet.html         # Page 4: Final build display
│   ├── shared/                  # V2 shared modules
│   └── resource/                # V2 data files
├── shared/                      # Legacy shared modules
│   ├── state-manager.js         # Global state + localStorage
│   ├── dom-utils.js             # DOM helpers
│   ├── calculations.js          # Stat calculations
│   ├── build-encoder.js         # URL sharing codes
│   └── data-loader.js           # Data loading/caching
├── resource/                    # Legacy data files
│   ├── actions.js               # Action definitions
│   ├── masteries.js             # Mastery system
│   └── armor-abilities.js       # Equipment data
├── mastery-selector.html        # Legacy multi-page system
├── rank-selector.html           
└── index.html                   # Original single-page version
```

## Development Workflow

### Adding Features
- **V2 System**: Edit files in `/v2` directory - this is the active version
- **Legacy**: Edit root-level files only for compatibility fixes

### Data Modifications
- **Masteries**: Edit `v2/resource/masteries.js`
- **Actions**: Edit `v2/resource/actions.js` 
- **Equipment**: Edit `v2/resource/armor-abilities.js`

### UI Changes
- **Page Layout**: Edit individual `.html` files
- **Styling**: Edit `app.css` (shared across all pages)
- **Logic**: Edit corresponding `.js` files or shared modules

### State Management
- **Cross-page data**: Modify `shared/state-manager.js`
- **Calculations**: Edit `shared/calculations.js`
- **URL sharing**: Edit `shared/build-encoder.js`

## Testing

1. **Multi-page flow**: Start at `v2/mastery-selector.html`
2. **Legacy system**: Open `index.html`
3. **State persistence**: Navigate between pages to verify data retention
4. **Build codes**: Test sharing URLs and import/export

## No Build System
- Pure vanilla JavaScript/HTML/CSS
- No compilation or package management required
- Edit files directly and refresh browser

## Key Files for Common Tasks

- **Add new mastery**: `v2/resource/masteries.js`
- **Add new action**: `v2/resource/actions.js` 
- **Modify calculations**: `shared/calculations.js`
- **Change page layout**: Individual `.html` files
- **Update styling**: `app.css`
- **Fix state bugs**: `shared/state-manager.js`