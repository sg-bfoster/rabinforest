import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { openModal } from './features/modalSlice';
import { Hero, ScreenBody } from './components/Hero';
import { getAllSites, screenshotModalFor } from './utils/siteDetector';

// Grouping is page layout, not detection. SITE_CONFIG stays the catalog;
// anything added there and not listed here still renders in "Also".
const GROUPS = [
  {
    id: 'safeguard',
    title: 'Safe-Guard brand platforms',
    blurb:
      'The fourteen automotive protection sites he owns the frontend for. REV is the live example; the rest are brand skins of the same platform.',
    compact: true,
    keys: [
      'rev',
      'cadillac',
      'chevrolet',
      'buick',
      'gmc',
      'nissan',
      'oneprotect',
      'mini',
      'bmw',
      'extraprotection',
      'porsche',
      'lfs',
      'hyundai',
      'genesis',
    ],
  },
  {
    id: 'own',
    title: 'His own work',
    blurb: 'Live sites and projects he built independently. Thumbnails open the screenshot gallery.',
    compact: false,
    keys: [
      'askgwinnett',
      'stilltrue',
      'callmata',
      'lost_corridors',
      'tellspinners',
      'experimental_cheese',
      'rabinai',
      'rabinforest',
      'brianfoster_net',
      'findmeplaces',
    ],
  },
  {
    id: 'earlier',
    title: 'Earlier career',
    blurb: 'Internal products — screenshots only, no public URL.',
    compact: false,
    keys: ['whoop', 'concurrent', 'silk'],
  },
];

const linkLabel = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'github.com' || host === 'npmjs.com') {
      return `${host}${parsed.pathname.replace(/\/$/, '')}`;
    }
    return host;
  } catch {
    return url;
  }
};

const LinkCard = ({ site, compact }) => {
  const dispatch = useDispatch();
  const hasThumb = Boolean(site.screenshotPath);
  const docs = Array.isArray(site.docs) ? site.docs.filter((d) => d?.url) : [];

  const openGallery = () => dispatch(openModal(screenshotModalFor(site)));

  return (
    <article className={`links-card${compact ? ' links-card--compact' : ''}`}>
      {hasThumb ? (
        <button
          type="button"
          className="links-card-thumb"
          onClick={openGallery}
          aria-label={`View ${site.displayName} screenshots`}
          title={`View ${site.displayName} screenshots`}
        >
          <img src={site.screenshotPath} alt="" />
        </button>
      ) : (
        <div className="links-card-thumb links-card-thumb--empty" aria-hidden="true" />
      )}
      <div className="links-card-body">
        <h3 className="links-card-name">{site.displayName}</h3>
        {!compact && site.summary ? (
          <p className="links-card-summary">{site.summary}</p>
        ) : null}
        <div className="links-card-meta">
          {site.url ? (
            <a href={site.url} target="_blank" rel="noopener noreferrer">
              {linkLabel(site.url)}
            </a>
          ) : (
            <span className="links-card-nolink">No public URL</span>
          )}
          {docs.map((doc) => (
            <a key={doc.url} href={doc.url} target="_blank" rel="noopener noreferrer">
              {doc.label || 'Doc'}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
};

const Explore = () => {
  const sections = useMemo(() => {
    const all = getAllSites();
    const byKey = Object.fromEntries(all.map((site) => [site.key, site]));
    const listed = new Set(GROUPS.flatMap((group) => group.keys));
    const built = GROUPS.map((group) => ({
      ...group,
      sites: group.keys.map((key) => byKey[key]).filter(Boolean),
    })).filter((group) => group.sites.length);
    const leftovers = all.filter((site) => !listed.has(site.key));
    if (leftovers.length) {
      built.push({
        id: 'also',
        title: 'Also in the catalog',
        blurb: 'In the assistant catalog, not yet grouped above.',
        compact: false,
        sites: leftovers,
      });
    }
    return built;
  }, []);

  return (
    <>
      <Hero>
        <h1 className="hero-h1">Explore.</h1>
        <p className="hero-sub hero-sub--page">
          Every site, screenshot, and document the assistant can point at — laid out,
          so you don&apos;t have to ask. <br/> &nbsp;
        </p>
      </Hero>
      <ScreenBody width="links">
        {sections.map((section) => (
          <section key={section.id} className="links-section">
            <h2>{section.title}</h2>
            {section.blurb ? <p className="links-section-blurb">{section.blurb}</p> : null}
            <div className={`links-grid${section.compact ? ' links-grid--compact' : ''}`}>
              {section.sites.map((site) => (
                <LinkCard key={site.key} site={site} compact={section.compact} />
              ))}
            </div>
          </section>
        ))}
      </ScreenBody>
    </>
  );
};

export default Explore;
