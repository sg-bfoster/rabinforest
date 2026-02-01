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
  whoop: {
    key: 'whoop',
    displayName: 'Whoop',
    category: 'portfolio',
    summary:
      'Designed and developed the UX/UI and implemented the web app UI, focusing on enterprise-style workflows, data-rich screens, and integrations.',
    screenshotPaths: [
      '/screenshots/whoop1.png',
      '/screenshots/whoop2.png',
      '/screenshots/whoop3.png',
      '/screenshots/whoop4.png',
      '/screenshots/whoop5.png',
      '/screenshots/whoop6.png',
    ],
    // Used for the thumbnail in chat
    screenshotPath: '/screenshots/whoop1.png',
    url: null,
    // Keep patterns focused; broader triggers are weighted in scoreRules.
    patterns: [/\bwhoop\b/gi, /whoop\s*everything\s*mobile/gi, /whoopsales/gi],
    // High aggressiveness, but require a meaningful combined match to avoid false positives.
    minScore: 3,
    scoreRules: [
      // Strong identifiers
      { pattern: /\bwhoop\b/gi, score: 5 },
      { pattern: /whoop\s*everything\s*mobile/gi, score: 5 },
      { pattern: /whoopsales/gi, score: 4 },

      // Strong feature phrases
      { pattern: /\bcontact\s*management\b/gi, score: 3 },
      { pattern: /\bmedia\s*library\b/gi, score: 3 },
      { pattern: /\bcreate\s*sms\b/gi, score: 3 },
      { pattern: /\breports?\s*&?\s*analytics\b/gi, score: 3 },
      { pattern: /\btag\s*cloud\b/gi, score: 2 },
      { pattern: /\bapp\s*builder\b/gi, score: 2 },

      // Weaker keyword hints (need to combine with others to pass minScore)
      { pattern: /\binitiative(s)?\b/gi, score: 1 },
      { pattern: /\bsms\b/gi, score: 1 },
    ],
  },
  concurrent: {
    key: 'concurrent',
    displayName: 'Concurrent (ECS)',
    category: 'portfolio',
    summary:
      'Designed and developed the UX/UI and implemented dashboards and admin configuration screens for an Enterprise Control System, emphasizing data visualization and complex workflows.',
    screenshotPaths: [
      '/screenshots/ConcurrentECS-webtool.png',
      '/screenshots/ConcurrentECS-webtool2.png',
    ],
    screenshotPath: '/screenshots/ConcurrentECS-webtool.png',
    url: null,
    patterns: [
      /\bconcurrent\b/gi,
      /\benterprise\s*control\s*system\b/gi,
      /\becs\b/gi,
      /\bdata\s*intelligence\b/gi,
      /\btopology\s*management\b/gi,
      /\brequest\s*router(\s*service)?\b/gi,
    ],
    minScore: 3,
    scoreRules: [
      // Strong identifiers
      { pattern: /\bconcurrent\b/gi, score: 5 },
      { pattern: /\benterprise\s*control\s*system\b/gi, score: 5 },
      { pattern: /\becs\b/gi, score: 4 },
      { pattern: /\bedge\/tcs\b/gi, score: 4 },
      { pattern: /\bdata\s*intelligence\b/gi, score: 3 },

      // Strong feature phrases
      { pattern: /\bsystem\s*dashboard\b/gi, score: 3 },
      { pattern: /\bmanage\s*topology\b/gi, score: 3 },
      { pattern: /\btopology\s*management\b/gi, score: 3 },
      { pattern: /\brequest\s*router(\s*service)?\b/gi, score: 3 },
      { pattern: /\bgeographic\s*restrictions\b/gi, score: 3 },
      { pattern: /\btoken\s*authentication\b/gi, score: 3 },
      { pattern: /\badvanced\s*configuration\b/gi, score: 2 },
      { pattern: /\bip\s*restrictions\b/gi, score: 2 },
    ],
  },
  silk: {
    key: 'silk',
    displayName: 'Silk',
    category: 'portfolio',
    summary:
      'Designed and developed the UX/UI and implemented a web-based interface for operational workflows, focusing on usability, information density, and integrations.',
    screenshotPaths: ['/screenshots/silk1.png', '/screenshots/silk2.png'],
    screenshotPath: '/screenshots/silk1.png',
    url: null,
    patterns: [/\bsilk\b/gi, /silk\s*information\s*systems/gi, /\bpm\/emr\b/gi, /\bemr\b/gi],
    minScore: 3,
    scoreRules: [
      // Strong identifiers
      { pattern: /\bsilk\b/gi, score: 5 },
      { pattern: /silk\s*information\s*systems/gi, score: 5 },
      { pattern: /\bpm\/emr\b/gi, score: 4 },
      { pattern: /\bemr\b/gi, score: 3 },

      // Strong feature phrases
      { pattern: /\bpatient\s*registration\b/gi, score: 3 },
      { pattern: /\bpatient\s*summary\b/gi, score: 3 },
      { pattern: /\bmedical\s*record\b/gi, score: 3 },
      { pattern: /\bclinic(al)?\s*reporting\b/gi, score: 3 },

      // Weaker hints
      { pattern: /\bscheduling\b/gi, score: 1 },
      { pattern: /\bbilling\b/gi, score: 1 },
      { pattern: /\breporting\b/gi, score: 1 },
      { pattern: /\bsaas\b/gi, score: 1 },
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

  const safeTest = (pattern, value) => {
    try {
      // Patterns are frequently /g; reset to avoid lastIndex issues across calls.
      pattern.lastIndex = 0;
      return pattern.test(value);
    } catch {
      return false;
    }
  };

  // Check each site configuration
  Object.values(SITE_CONFIG).forEach((site) => {
    // Skip if already found
    if (foundKeys.has(site.key)) {
      return;
    }

    // Check if any pattern matches / compute score for portfolio items.
    let score = 0;
    let hasMatch = false;

    if (Array.isArray(site.scoreRules) && site.scoreRules.length > 0) {
      score = site.scoreRules.reduce((acc, rule) => {
        if (rule?.pattern && typeof rule?.score === 'number' && safeTest(rule.pattern, text)) {
          return acc + rule.score;
        }
        return acc;
      }, 0);
      hasMatch = score >= (typeof site.minScore === 'number' ? site.minScore : 1);
    } else {
      hasMatch = site.patterns.some((pattern) => safeTest(pattern, text));
      score = hasMatch ? 1 : 0;
    }

    if (hasMatch) {
      const screenshotPaths = Array.isArray(site.screenshotPaths) && site.screenshotPaths.length > 0
        ? site.screenshotPaths
        : (site.screenshotPath ? [site.screenshotPath] : []);

      detectedSites.push({
        key: site.key,
        category: site.category || 'site',
        displayName: site.displayName,
        // Back-compat (single thumbnail image)
        screenshotPath: site.screenshotPath || screenshotPaths[0],
        // New: gallery support
        screenshotPaths,
        summary: site.summary || '',
        url: site.url || null,
        _score: score,
      });
      foundKeys.add(site.key);
    }
  });

  // Cap portfolio matches to at most 2 to avoid UI spam.
  const portfolio = detectedSites
    .filter((s) => s.category === 'portfolio')
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, 2);
  const nonPortfolio = detectedSites.filter((s) => s.category !== 'portfolio');
  const capped = [...nonPortfolio, ...portfolio];

  // Remove internal scoring field before returning.
  return capped.map(({ _score, ...rest }) => rest);
};

/**
 * Get site configuration by key
 * @param {string} key - Site key
 * @returns {Object|null} Site configuration or null if not found
 */
export const getSiteConfig = (key) => {
  return SITE_CONFIG[key] || null;
};
