// Build encoding/decoding for TerraSphere Build Editor

const BuildEncoder = {
  // Generate compact build code using mastery IDs (much shorter format)
  generateCompactBuildCode(state, baseURL = 'https://terrarp.com/build/') {
    // Load mastery data to get ID mappings
    if (!window.masterylist) {
      console.warn('Mastery data not loaded, using regular format');
      return this.generateBuildCode(state, baseURL);
    }
    
    const { 
      chosenMasteries, 
      chosenMasteriesRanks, 
      armorType, 
      armorRank, 
      weaponRank, 
      chosenActions, 
      characterName,
      characterRace,
      characterTitle,
      threadCode
    } = state;
    
    // Convert mastery names to IDs (huge space savings!)
    const masteryIds = chosenMasteries.map(masteryName => {
      const mastery = window.masterylist.find(m => m.lookup === masteryName);
      return mastery ? mastery.id : 0;
    }).join(',');
    
    // Pack ranks into single string (55555 instead of 5,5,5,5,5)
    const rankString = chosenMasteriesRanks.join('');
    
    // Single letter for armor type (h/m/l instead of heavy/medium/light)
    const armorShort = armorType ? armorType.charAt(0) : '';
    
    // Convert action names to IDs for even more space savings
    let actionCode = chosenActions.join(','); // fallback
    if (window.actionlist) {
      const actionIds = chosenActions.map(actionName => {
        const action = window.actionlist.find(a => a.lookup === actionName);
        return action ? action.id : 0;
      }).join(',');
      actionCode = actionIds;
    }
    
    // Only include character data if present (with prefixes to identify them)
    const charParts = [];
    if (characterName) charParts.push('n:' + characterName.replace(/ /gi, '_'));
    if (characterRace) charParts.push('r:' + characterRace.replace(/ /gi, '_'));
    if (characterTitle) charParts.push('t:' + characterTitle.replace(/ /gi, '_'));
    if (threadCode) charParts.push('c:' + threadCode.replace(/ /gi, '_'));
    if (state.profileBannerUrl) {
      // Extract just the unique part from terrarp banner URLs to save space
      // From: https://terrarp.com/data/profile_banners/l/0/135.jpg?1718997316
      // To: 135.jpg?1718997316
      const bannerMatch = state.profileBannerUrl.match(/\/profile_banners\/[^\/]+\/[^\/]+\/(.+)$/);
      const shortBanner = bannerMatch ? bannerMatch[1] : encodeURIComponent(state.profileBannerUrl);
      charParts.push('b:' + shortBanner);
    }
    
    const charData = charParts.join('&');
    
    // Create ultra-compact build string
    const compactParts = [
      masteryIds,              // "17,15,5,20,31" instead of "animancy,slash-weapons,astramancy,harmonic-magic,metamorph"
      rankString,              // "55555" instead of "5,5,5,5,5"  
      armorShort,              // "h" instead of "heavy"
      armorRank,               // "5"
      weaponRank,              // "5"
      actionCode,              // Keep action names for now
      charData                 // "n:Lune&r:Human&t:Steel_Reclaimer"
    ].filter(part => part !== '');
    
    const compactDetails = compactParts.join('|');
    
    // Add version indicator for compact format
    const hashType = state.profileBannerUrl ? '#compact-import.' : '#compact.';
    
    // Encode (handle Unicode)
    const encodedBuild = btoa(encodeURIComponent(compactDetails).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
    return baseURL + 'build-sheet.html' + hashType + encodedBuild;
  },

  // Generate build code from state (original format for compatibility)
  generateBuildCode(state, baseURL = 'https://terrarp.com/build/') {
    const { 
      chosenMasteries, 
      chosenMasteriesRanks, 
      armorType, 
      armorRank, 
      weaponRank, 
      chosenActions, 
      characterName,
      characterRace,
      characterTitle,
      threadCode
    } = state;
    
    // Create build parts
    const masteryCode = chosenMasteries.join(',');
    const rankCode = chosenMasteriesRanks.join(',');
    const actionCode = chosenActions.join(',');
    
    // Handle character info fields
    const nameCode = characterName ? characterName.replace(/ /gi, '_') : '';
    const raceCode = characterRace ? characterRace.replace(/ /gi, '_') : '';
    const titleCode = characterTitle ? characterTitle.replace(/ /gi, '_') : '';
    const threadCodeParam = threadCode ? threadCode.replace(/ /gi, '_') : '';
    
    // URL encode the banner URL to handle special characters like dots
    const bannerUrlEncoded = state.profileBannerUrl ? encodeURIComponent(state.profileBannerUrl) : '';
    
    // Create build details string
    const buildDetails = [
      masteryCode,
      rankCode,
      armorType || '',
      armorRank.toString(),
      weaponRank.toString(),
      actionCode,
      nameCode,
      raceCode,
      titleCode,
      threadCodeParam,
      bannerUrlEncoded
    ].join('|');
    
    // Determine hash type - use import for imported characters, sample for manual builds
    const hashType = state.profileBannerUrl ? '#import.' : '#sample.';
    
    // Encode and create full URL (handle Unicode characters)
    const encodedBuild = btoa(encodeURIComponent(buildDetails).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
    return baseURL + 'build-sheet.html' + hashType + encodedBuild;
  },
  
  // Decode build code from URL hash or encoded string
  decodeBuildCode(encodedString) {
    try {
      // Remove hash and type prefixes if present
      let cleanEncoded = encodedString;
      if (cleanEncoded.includes('#')) {
        // Handle different hash types: #import., #sample., #load.
        const hashMatch = cleanEncoded.match(/#(?:import|sample|load)\.(.+)$/);
        if (hashMatch) {
          cleanEncoded = hashMatch[1];
        } else {
          // Fallback to old method
          cleanEncoded = cleanEncoded.split('.').pop();
        }
      }
      
      // Decode base64 (handle Unicode characters)
      const decoded = decodeURIComponent(atob(cleanEncoded).replace(/./g, (char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)));
      
      // Try new format first (pipe-delimited), then fall back to old format (dot-delimited)
      let parts = decoded.split('|');
      let isNewFormat = parts.length >= 6;
      
      if (!isNewFormat) {
        // Fall back to old format for backward compatibility
        parts = decoded.split('.');
        if (parts.length < 6) {
          throw new Error('Invalid build code format');
        }
      }
      
      // Extract character info fields based on format
      let characterName = '';
      let characterRace = '';
      let characterTitle = '';
      let threadCode = '';
      let profileBannerUrl = '';
      
      if (isNewFormat) {
        // New format: 6=name, 7=race, 8=title, 9=threadCode, 10=bannerUrl
        if (parts.length > 6 && parts[6]) {
          characterName = parts[6].replace(/_/gi, ' ');
        }
        if (parts.length > 7 && parts[7]) {
          characterRace = parts[7].replace(/_/gi, ' ');
        }
        if (parts.length > 8 && parts[8]) {
          characterTitle = parts[8].replace(/_/gi, ' ');
        }
        if (parts.length > 9 && parts[9]) {
          threadCode = parts[9].replace(/_/gi, ' ');
        }
        if (parts.length > 10 && parts[10]) {
          profileBannerUrl = decodeURIComponent(parts[10]);
        }
      } else {
        // Old format: 6=name, 7=threadCode, 8=bannerUrl (no race/title)
        if (parts.length > 6 && parts[6]) {
          characterName = parts[6].replace(/_/gi, ' ');
        }
        if (parts.length > 7 && parts[7]) {
          threadCode = parts[7].replace(/_/gi, ' ');
        }
        if (parts.length > 8 && parts[8]) {
          profileBannerUrl = decodeURIComponent(parts[8]);
        }
      }
      
      const buildData = {
        chosenMasteries: parts[0] ? parts[0].split(',').filter(m => m) : [],
        chosenMasteriesRanks: parts[1] ? parts[1].split(',').map(r => parseInt(r) || 0) : [],
        armorType: parts[2] || null,
        armorRank: parseInt(parts[3]) || 0,
        weaponRank: parseInt(parts[4]) || 0,
        chosenActions: parts[5] ? parts[5].split(',').filter(a => a) : [],
        characterName: characterName,
        characterRace: characterRace,
        characterTitle: characterTitle,
        threadCode: threadCode,
        profileBannerUrl: profileBannerUrl
      };
      
      return {
        success: true,
        data: buildData
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid build code: ' + error.message
      };
    }
  },
  
  // Decode compact build code
  decodeCompactBuildCode(encodedString) {
    try {
      // Handle compact format
      let cleanEncoded = encodedString;
      if (cleanEncoded.includes('#')) {
        const hashMatch = cleanEncoded.match(/#(?:compact-import|compact)\.(.+)$/);
        if (hashMatch) {
          cleanEncoded = hashMatch[1];
        } else {
          return { success: false, error: 'Not a compact build code' };
        }
      }
      
      // Decode base64 (handle Unicode)
      const decoded = decodeURIComponent(atob(cleanEncoded).replace(/./g, (char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)));
      const parts = decoded.split('|');
      
      if (parts.length < 6) {
        throw new Error('Invalid compact build code format');
      }
      
      // Convert mastery IDs back to names
      let chosenMasteries = [];
      if (window.masterylist && parts[0]) {
        const masteryIds = parts[0].split(',').map(id => parseInt(id));
        chosenMasteries = masteryIds.map(id => {
          const mastery = window.masterylist.find(m => m.id === id);
          return mastery ? mastery.lookup : '';
        }).filter(name => name);
      }
      
      // Convert action IDs back to names
      let chosenActions = [];
      if (window.actionlist && parts[5]) {
        const actionIds = parts[5].split(',').map(id => parseInt(id));
        chosenActions = actionIds.map(id => {
          const action = window.actionlist.find(a => a.id === id);
          return action ? action.lookup : '';
        }).filter(name => name);
      } else {
        // Fallback for non-ID format
        chosenActions = parts[5] ? parts[5].split(',').filter(a => a) : [];
      }
      
      // Unpack ranks from single string
      const chosenMasteriesRanks = parts[1] ? parts[1].split('').map(r => parseInt(r) || 0) : [];
      
      // Expand armor type
      const armorTypeMap = { 'h': 'heavy', 'm': 'medium', 'l': 'light' };
      const armorType = armorTypeMap[parts[2]] || parts[2] || null;
      
      // Parse character data
      let characterName = '', characterRace = '', characterTitle = '', threadCode = '', profileBannerUrl = '';
      if (parts[6]) {
        const charParts = parts[6].split('&');
        charParts.forEach(part => {
          if (part.startsWith('n:')) characterName = part.substring(2).replace(/_/gi, ' ');
          if (part.startsWith('r:')) characterRace = part.substring(2).replace(/_/gi, ' ');
          if (part.startsWith('t:')) characterTitle = part.substring(2).replace(/_/gi, ' ');
          if (part.startsWith('c:')) threadCode = part.substring(2).replace(/_/gi, ' ');
          if (part.startsWith('b:')) {
            const shortBanner = part.substring(2);
            // Reconstruct full terrarp banner URL from shortened form
            // From: 135.jpg?1718997316
            // To: https://terrarp.com/data/profile_banners/l/0/135.jpg?1718997316
            if (shortBanner.includes('.jpg') || shortBanner.includes('.png')) {
              profileBannerUrl = `https://terrarp.com/data/profile_banners/l/0/${shortBanner}`;
            } else {
              // Fallback for non-standard URLs
              profileBannerUrl = decodeURIComponent(shortBanner);
            }
          }
        });
      }
      
      return {
        success: true,
        data: {
          chosenMasteries,
          chosenMasteriesRanks,
          armorType,
          armorRank: parseInt(parts[3]) || 0,
          weaponRank: parseInt(parts[4]) || 0,
          chosenActions,
          characterName,
          characterRace,
          characterTitle,
          threadCode,
          profileBannerUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid compact build code: ' + error.message
      };
    }
  },

  // Load build from current URL hash
  loadFromURL() {
    const hash = window.location.hash;
    if (hash.includes('#compact-import.') || hash.includes('#compact.')) {
      return this.decodeCompactBuildCode(hash);
    } else if (hash.includes('#load.') || hash.includes('#sample.') || hash.includes('#import.')) {
      return this.decodeBuildCode(hash);
    }
    return { success: false, error: 'No build code found in URL' };
  },
  
  // Generate short share code (for forum posts, etc.)
  generateShortCode(state) {
    const buildCode = this.generateBuildCode(state, '');
    const encoded = buildCode.split('.').pop();
    return encoded.substring(0, 8).toUpperCase(); // First 8 characters as short code
  },
  
  // Create shareable URLs for different contexts
  generateShareURLs(state) {
    const baseCode = this.generateBuildCode(state);
    
    return {
      full: baseCode,
      direct: baseCode.replace('#sample.', '#import.'),
      forum: `[url=${baseCode}]My Build[/url]`,
      discord: `Check out my build: ${baseCode}`
    };
  },
  
  // Validate build code format
  validateBuildCode(encodedString) {
    const result = this.decodeBuildCode(encodedString);
    if (!result.success) {
      return result;
    }
    
    const { data } = result;
    
    // Validate mastery count
    if (data.chosenMasteries.length > 5) {
      return {
        success: false,
        error: 'Invalid build: Too many masteries selected'
      };
    }
    
    // Validate rank count matches mastery count
    if (data.chosenMasteriesRanks.length !== data.chosenMasteries.length) {
      return {
        success: false,
        error: 'Invalid build: Mastery and rank counts do not match'
      };
    }
    
    // Validate armor type
    if (data.armorType && !['heavy', 'medium', 'light'].includes(data.armorType)) {
      return {
        success: false,
        error: 'Invalid build: Invalid armor type'
      };
    }
    
    // Validate rank ranges
    const invalidRanks = data.chosenMasteriesRanks.some(rank => rank < 0 || rank > 5);
    if (invalidRanks || data.armorRank < 0 || data.armorRank > 5 || 
        data.weaponRank < 0 || data.weaponRank > 5) {
      return {
        success: false,
        error: 'Invalid build: Ranks must be between 0 and 5'
      };
    }
    
    return {
      success: true,
      data: data
    };
  },
  
  // Migration helper for old build codes
  migrateLegacyCode(legacyCode) {
    // This would handle any old format conversions if needed
    // For now, just pass through to normal decoder
    return this.decodeBuildCode(legacyCode);
  }
};

// Make available globally
window.BuildEncoder = BuildEncoder;