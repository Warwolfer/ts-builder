# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **TerraSphere Build Editor** - a web-based character build planner for the TerraSphere RPG system. It's a client-side JavaScript application that allows users to create and customize character builds by selecting masteries, equipment, and actions.

## Architecture

### Core Files Structure
- `index.html` - Main HTML structure with navigation, mastery selectors, and build display
- `app.js` - Main application logic and build management (large file ~29k tokens)
- `actions.js` - Action definitions and data (700+ action objects with dice rolls, descriptions, etc.)
- `masteries.js` - Mastery system definitions (defense, offense, support, alter categories)
- `safecharacters.js` - Character encoding mappings for URL-safe strings
- `app.css` - Styling (referenced but not analyzed)

### Key Components
- **Mastery System**: Four categories (Defense, Offense, Support, Alter) with various magical/combat specializations
- **Action System**: Complex action definitions with roll formulas, Discord integration codes, and mastery requirements
- **Equipment System**: Weapon and armor ranking (E through S ranks)
- **Build Code System**: Character builds encoded/decoded via thread codes for sharing

### Data Flow
1. User selects masteries and equipment through UI
2. Available actions filtered based on mastery selections
3. Build stats calculated dynamically
4. Discord roll commands generated for gameplay integration
5. Build encoded to shareable thread code

## Development

### No Build System
This project uses vanilla JavaScript/HTML/CSS with no build tools, package managers, or development servers. Files are served directly.

### Development Workflow
- Edit files directly in any editor
- Open `index.html` in browser to test
- No compilation or bundling required
- All JavaScript is loaded via `<script>` tags in HTML

### External Dependencies
- TerraSphere asset CDN (terrarp.com) for images and icons
- No npm packages or external libraries

## Key Features to Understand

### Thread Code System
- Character builds are encoded/decoded using a custom thread code format
- Allows sharing builds via short alphanumeric codes
- Critical for user experience and build persistence

### Discord Integration  
- Actions generate Discord bot roll commands (`?r command format`)
- Includes advantage/disadvantage mechanics
- Auto-calculates bonuses based on mastery ranks and equipment

### Dynamic Action Filtering
- Actions are filtered based on selected masteries
- Complex mastery requirement system determines available actions
- UI updates reactively as user makes selections