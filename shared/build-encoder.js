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
      characterName 
    } = state;
    
    // Create build parts
    const masteryCode = chosenMasteries.join(',');
    const rankCode = chosenMasteriesRanks.join(',');
    const actionCode = chosenActions.join(',');
    
    // Handle character name
    const nameCode = characterName ? '.' + characterName.replace(/ /gi, '_') : '';
    
    // Create build details string
    const buildDetails = [
      masteryCode,
      rankCode,
      armorType || '',
      armorRank.toString(),
      weaponRank.toString(),
      actionCode,
      nameCode
    ].join('.');
    
    // Determine hash type
    const hashType = window.location.href.includes('#load.') ? '#import.' : '#sample.';
    
    // Encode and create full URL
    const encodedBuild = btoa(buildDetails);
    return baseURL + 'build-sheet.html' + hashType + encodedBuild;
  },
  
  // Decode build code from URL hash or encoded string
  decodeBuildCode(encodedString) {
    try {
      // Remove hash and type prefixes if present
      let cleanEncoded = encodedString;
      if (cleanEncoded.includes('#')) {
        cleanEncoded = cleanEncoded.split('.').pop();
      }
      
      // Decode base64
      const decoded = atob(cleanEncoded);
      const parts = decoded.split('.');
      
      if (parts.length < 6) {
        throw new Error('Invalid build code format');
      }
      
      // Extract character name if present
      let characterName = '';
      if (parts.length > 6 && parts[6]) {
        characterName = parts[6].replace(/_/gi, ' ');
      }
      
      const buildData = {
        chosenMasteries: parts[0] ? parts[0].split(',').filter(m => m) : [],
        chosenMasteriesRanks: parts[1] ? parts[1].split(',').map(r => parseInt(r) || 0) : [],
        armorType: parts[2] || null,
        armorRank: parseInt(parts[3]) || 0,
        weaponRank: parseInt(parts[4]) || 0,
        chosenActions: parts[5] ? parts[5].split(',').filter(a => a) : [],
        characterName: characterName
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