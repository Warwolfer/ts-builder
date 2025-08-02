// Build encoding/decoding for TerraSphere Build Editor

const BuildEncoder = {
  // Generate build code from state
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
  
  // Load build from current URL hash
  loadFromURL() {
    const hash = window.location.hash;
    if (hash.includes('#load.') || hash.includes('#sample.') || hash.includes('#import.')) {
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