// Site detection utility for identifying mentions of sites Brian worked on

// Site configuration mapping
const SITE_CONFIG = {
  rabinforest: {
    key: 'rabinforest',
    displayName: 'Rabin Forest',
    screenshotPath: '/screenshots/rabinforest-screenshot.png',
    url: 'https://www.rabinforest.com',
    patterns: [
      /rabin\s*forest/gi,
      /rabinforest\.com/gi,
      /www\.rabinforest\.com/gi,
      /https?:\/\/.*rabinforest\.com/gi,
    ],
  },
  brianfoster_net: {
    key: 'brianfoster_net',
    displayName: 'brianfoster.net',
    screenshotPath: '/screenshots/brianfoster-net-screenshot.png',
    url: 'http://www.brianfoster.net',
    patterns: [
      /brianfoster\.net/gi,
      /www\.brianfoster\.net/gi,
      /https?:\/\/.*brianfoster\.net/gi,
      /brian\s*foster\.net/gi,
    ],
  },
  briantfoster_com: {
    key: 'briantfoster_com',
    displayName: 'briantfoster.com',
    screenshotPath: '/screenshots/briantfoster-com-screenshot.png',
    url: 'http://www.briantfoster.com',
    patterns: [
      /briantfoster\.com/gi,
      /www\.briantfoster\.com/gi,
      /https?:\/\/.*briantfoster\.com/gi,
      /brian\s*t\s*foster\.com/gi,
    ],
  },
  findmeplaces: {
    key: 'findmeplaces',
    displayName: 'Find Me Places',
    screenshotPath: '/screenshots/findmeplaces-screenshot.png',
    url: 'https://fmp.rabinforest.com',
    patterns: [
      /find\s*me\s*places/gi,
      /fmp\.rabinforest\.com/gi,
      /www\.fmp\.rabinforest\.com/gi,
      /https?:\/\/.*fmp\.rabinforest\.com/gi,
    ],
  },
  cadillac: {
    key: 'cadillac',
    displayName: 'Cadillac Protection Plan',
    screenshotPath: '/screenshots/cadillac-screenshot.png',
    url: 'https://www.mycadillacprotection.com',
    patterns: [
      /cadillac\s*protection\s*plan/gi,
      /mycadillacprotection\.com/gi,
      /www\.mycadillacprotection\.com/gi,
      /https?:\/\/.*mycadillacprotection\.com/gi,
      /cadillac\s*protection/gi,
    ],
  },
  chevrolet: {
    key: 'chevrolet',
    displayName: 'Chevrolet Protection Plan',
    screenshotPath: '/screenshots/chevrolet-screenshot.png',
    url: 'https://www.mychevroletprotection.com',
    patterns: [
      /chevrolet\s*protection\s*plan/gi,
      /mychevroletprotection\.com/gi,
      /www\.mychevroletprotection\.com/gi,
      /https?:\/\/.*mychevroletprotection\.com/gi,
      /chevrolet\s*protection/gi,
    ],
  },
  buick: {
    key: 'buick',
    displayName: 'Buick Protection',
    screenshotPath: '/screenshots/buick-screenshot.png',
    url: 'https://www.mybuickprotection.com',
    patterns: [
      /buick\s*protection/gi,
      /mybuickprotection\.com/gi,
      /www\.mybuickprotection\.com/gi,
      /https?:\/\/.*mybuickprotection\.com/gi,
    ],
  },
  gmc: {
    key: 'gmc',
    displayName: 'GMC Protection',
    screenshotPath: '/screenshots/gmc-screenshot.png',
    url: 'https://www.mygmcprotection.com',
    patterns: [
      /gmc\s*protection/gi,
      /mygmcprotection\.com/gi,
      /www\.mygmcprotection\.com/gi,
      /https?:\/\/.*mygmcprotection\.com/gi,
    ],
  },
  nissan: {
    key: 'nissan',
    displayName: 'Nissan Protection Plan',
    screenshotPath: '/screenshots/nissan-screenshot.png',
    url: 'https://www.mynissanprotection.ca',
    patterns: [
      /nissan\s*protection\s*plan/gi,
      /mynissanprotection\.ca/gi,
      /www\.mynissanprotection\.ca/gi,
      /https?:\/\/.*mynissanprotection\.ca/gi,
      /nissan\s*protection/gi,
    ],
  },
  oneprotect: {
    key: 'oneprotect',
    displayName: 'One Protect Plans',
    screenshotPath: '/screenshots/one-protect-screenshot.png',
    url: 'https://www.oneprotectplans.com',
    patterns: [
      /one\s*protect\s*plans/gi,
      /oneprotectplans\.com/gi,
      /www\.oneprotectplans\.com/gi,
      /https?:\/\/.*oneprotectplans\.com/gi,
      /one\s*protect/gi,
    ],
  },
  mini: {
    key: 'mini',
    displayName: 'MINI Motoring Protection',
    screenshotPath: '/screenshots/mini-screenshot.png',
    url: 'https://www.myminiprotection.com',
    patterns: [
      /mini\s*motoring\s*protection/gi,
      /mini\s*protection/gi,
      /myminiprotection\.com/gi,
      /www\.myminiprotection\.com/gi,
      /https?:\/\/.*myminiprotection\.com/gi,
    ],
  },
  bmw: {
    key: 'bmw',
    displayName: 'BMW Ultimate Protection',
    screenshotPath: '/screenshots/bmw-screenshot.png',
    url: 'https://www.mybmwprotection.com',
    patterns: [
      /bmw\s*ultimate\s*protection/gi,
      /bmw\s*protection/gi,
      /mybmwprotection\.com/gi,
      /www\.mybmwprotection\.com/gi,
      /https?:\/\/.*mybmwprotection\.com/gi,
    ],
  },
  extraprotection: {
    key: 'extraprotection',
    displayName: 'Extra Protection',
    screenshotPath: '/screenshots/extraprotect-screenshot.png',
    url: 'https://www.extraprotection.com',
    patterns: [
      /extra\s*protection/gi,
      /extraprotection\.com/gi,
      /www\.extraprotection\.com/gi,
      /https?:\/\/.*extraprotection\.com/gi,
    ],
  },
  rev: {
    key: 'rev',
    displayName: 'REV Protection Plans',
    screenshotPath: '/screenshots/rev-screenshot.png',
    url: 'https://www.revprotectionplans.com',
    patterns: [
      /rev\s*protection\s*plans/gi,
      /revprotectionplans\.com/gi,
      /www\.revprotectionplans\.com/gi,
      /https?:\/\/.*revprotectionplans\.com/gi,
      /rev\s*protection/gi,
    ],
  },
  porsche: {
    key: 'porsche',
    displayName: 'Porsche Protection',
    screenshotPath: '/screenshots/porsche-screenshot.png',
    url: 'https://www.protectyourporsche.com',
    patterns: [
      /porsche\s*protection/gi,
      /protectyourporsche\.com/gi,
      /www\.protectyourporsche\.com/gi,
      /https?:\/\/.*protectyourporsche\.com/gi,
    ],
  },
  lfs: {
    key: 'lfs',
    displayName: 'LFS Service Drive',
    screenshotPath: '/screenshots/lambo-screenshot.png',
    url: 'https://www.lfsservicedrive.com',
    patterns: [
      /lfs\s*service\s*drive/gi,
      /lfsservicedrive\.com/gi,
      /www\.lfsservicedrive\.com/gi,
      /https?:\/\/.*lfsservicedrive\.com/gi,
      /lamborghini\s*financial\s*services/gi,
      /lamborghini\s*protection/gi,
    ],
  },
  hyundai: {
    key: 'hyundai',
    displayName: 'Hyundai Protection',
    screenshotPath: '/screenshots/hyundai-screenshot.png',
    url: 'https://www.myhyundaiprotection.com',
    patterns: [
      /hyundai\s*protection/gi,
      /myhyundaiprotection\.com/gi,
      /www\.myhyundaiprotection\.com/gi,
      /https?:\/\/.*myhyundaiprotection\.com/gi,
    ],
  },
  genesis: {
    key: 'genesis',
    displayName: 'Genesis Protection',
    screenshotPath: '/screenshots/genesis-screenshot.png',
    url: 'https://www.mygenesisprotection.com',
    patterns: [
      /genesis\s*protection/gi,
      /mygenesisprotection\.com/gi,
      /www\.mygenesisprotection\.com/gi,
      /https?:\/\/.*mygenesisprotection\.com/gi,
    ],
  },
};

/**
 * Detects sites mentioned in the given text
 * @param {string} text - The text to search for site mentions
 * @returns {Array} Array of detected site objects with metadata
 */
export const detectSitesInText = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const detectedSites = [];
  const foundKeys = new Set(); // Prevent duplicates

  // Check each site configuration
  Object.values(SITE_CONFIG).forEach((site) => {
    // Skip if already found
    if (foundKeys.has(site.key)) {
      return;
    }

    // Check if any pattern matches
    const hasMatch = site.patterns.some((pattern) => pattern.test(text));

    if (hasMatch) {
      detectedSites.push({
        key: site.key,
        displayName: site.displayName,
        screenshotPath: site.screenshotPath,
        url: site.url,
      });
      foundKeys.add(site.key);
    }
  });

  return detectedSites;
};

/**
 * Get site configuration by key
 * @param {string} key - Site key
 * @returns {Object|null} Site configuration or null if not found
 */
export const getSiteConfig = (key) => {
  return SITE_CONFIG[key] || null;
};
