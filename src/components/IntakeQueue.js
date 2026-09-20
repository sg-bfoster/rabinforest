import React, { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS, getAdminHeaders } from '../config/api';

/**
 * The operator queue: what a blocked source needs a person to do, as a
 * checklist you work down.
 *
 * Mulberry (and any city after it) sits behind a Cloudflare managed
 * challenge, so its minutes are collected by hand — a person opens the
 * listing pages a challenge is built to admit, saves them, and the intake
 * script folds them in. That is a deliberate choice, not a gap waiting to be
 * automated (bfoster-services/docs/CITY_SELECTION_RULE.md).
 *
 * The work was already knowable — GET /askgwinnett/admin/manual-tasks has
 * served it since the watchdog learned to generate it. What was missing is
 * somewhere to DO it: the JSON tells you there are eight steps, it does not
 * remember which three you finished before the phone rang.
 *
 * EVERYTHING HERE IS GENERATED. The cities, the listing links and the
 * commands all come from the server, which builds them from pilot-civicplus's
 * own CITIES config. A hand-written checklist would be wrong the first time a
 * category id changed — and wrong in the worst way, because a saved page from
 * the wrong URL parses to zero records without erroring.
 */

/** Tick state lives per city per MONTH, so a new cycle starts clean. */
const cycleKey = (cityKey) => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `rf-intake-${cityKey}-${month}`;
};

const loadTicks = (cityKey) => {
  try {
    return JSON.parse(localStorage.getItem(cycleKey(cityKey)) || '{}') || {};
  } catch {
    // Private windows and blocked site data throw on access, not just on
    // write. An unusable checklist is still a usable page.
    return {};
  }
};

const saveTicks = (cityKey, ticks) => {
  try {
    localStorage.setItem(cycleKey(cityKey), JSON.stringify(ticks));
  } catch {
    /* the list still works this session; it just will not be remembered */
  }
};

/** Clipboard with a fallback: navigator.clipboard is absent on plain http. */
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
};

const daysSince = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 86400000) : null;
};

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="intake-copy"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        }
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function CityTasks({ task }) {
  const [ticks, setTicks] = useState(() => loadTicks(task.key));

  const toggle = (id) => {
    setTicks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveTicks(task.key, next);
      return next;
    });
  };

  const links = task.links || [];
  const commands = task.commands || [];
  // The drop step is a real step — the PDFs do not arrive by themselves — so
  // it counts toward "done" rather than sitting as untracked prose.
  const stepIds = [
    ...links.map((_, i) => `save-${i}`),
    'drop',
    ...commands.map((_, i) => `cmd-${i}`),
  ];
  const doneCount = stepIds.filter((id) => ticks[id]).length;
  const allDone = doneCount === stepIds.length;

  const openAll = () => {
    // Sequential window.open calls from one gesture; popup blockers allow the
    // first and may refuse the rest, so the individual links stay clickable.
    links.forEach((l) => window.open(l.url, '_blank', 'noopener'));
  };

  const blockedDays = daysSince(task.blockedSince);

  return (
    <section className={`intake-city${allDone ? ' is-done' : ''}`}>
      <header className="intake-city-head">
        <div>
          <h3 className="intake-city-name">{task.label || task.key}</h3>
          <p className="intake-city-meta">
            Unreachable for {task.errorStreak} straight check
            {task.errorStreak === 1 ? '' : 's'}
            {blockedDays !== null && ` · blocked ${blockedDays} day${blockedDays === 1 ? '' : 's'}`}
          </p>
          {task.lastError && <p className="intake-city-err">{task.lastError}</p>}
        </div>
        <div className="intake-progress" aria-label={`${doneCount} of ${stepIds.length} steps done`}>
          {doneCount}/{stepIds.length}
        </div>
      </header>

      <ol className="intake-steps">
        <li>
          <div className="intake-step-head">
            <strong>Open each listing page and “Save Page As” into the drop folder</strong>
            {links.length > 1 && (
              <button type="button" className="intake-copy" onClick={openAll}>
                Open all {links.length}
              </button>
            )}
          </div>
          <ul className="intake-links">
            {links.map((l, i) => (
              <li key={l.url}>
                <label className="intake-check">
                  <input
                    type="checkbox"
                    checked={Boolean(ticks[`save-${i}`])}
                    onChange={() => toggle(`save-${i}`)}
                  />
                  <span>{l.label}</span>
                </label>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="intake-link">
                  open ↗
                </a>
              </li>
            ))}
          </ul>
        </li>

        <li>
          <label className="intake-check">
            <input type="checkbox" checked={Boolean(ticks.drop)} onChange={() => toggle('drop')} />
            <strong>Saved pages and any PDFs are in the drop folder</strong>
          </label>
          <div className="intake-cmd">
            <code>{task.dropPath}</code>
            <CopyButton text={task.dropPath} label="Copy path" />
          </div>
        </li>

        <li>
          <div className="intake-step-head">
            <strong>Run these in bfoster-services</strong>
          </div>
          <ul className="intake-cmds">
            {commands.map((c, i) => (
              <li key={c}>
                <label className="intake-check">
                  <input
                    type="checkbox"
                    checked={Boolean(ticks[`cmd-${i}`])}
                    onChange={() => toggle(`cmd-${i}`)}
                  />
                  <code>{c}</code>
                </label>
                <CopyButton text={c} />
              </li>
            ))}
          </ul>
          <p className="intake-note">
            The first command prints only the PDFs still missing — a quiet month means
            downloading nothing and stopping there.
          </p>
        </li>
      </ol>

      <footer className="intake-city-foot">
        {allDone && <span className="intake-done-tag">All steps ticked</span>}
        <button
          type="button"
          className="intake-reset"
          onClick={() => {
            setTicks({});
            saveTicks(task.key, {});
          }}
        >
          Reset this month
        </button>
      </footer>
    </section>
  );
}

export default function IntakeQueue() {
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.MANUAL_TASKS, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error(`Queue fetch failed (${res.status})`);
      const data = await res.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="admin-status">Loading the queue…</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <div className="intake-queue">
      <div className="intake-head">
        <p className="intake-intro">
          Sources the freshness watchdog has confirmed unreachable, and the work each one
          needs by hand. Ticks are remembered per month and start clean on the 1st.
        </p>
        <button type="button" className="btn" onClick={load}>
          Refresh
        </button>
      </div>

      {tasks.length === 0 ? (
        // The normal state, and it should read as good news rather than as a
        // page that failed to load.
        <p className="admin-status ok">
          Nothing queued — every source is answering. No manual work to do.
        </p>
      ) : (
        tasks.map((t) => <CityTasks key={t.key} task={t} />)
      )}
    </div>
  );
}
