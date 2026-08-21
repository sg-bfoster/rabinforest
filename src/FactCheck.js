// FactCheck.js — the stilltrue `verify` primitive as an interactive playground:
// does the source actually support the claim?
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './config/api';

const VERDICT_LABELS = {
  supported: 'Supported',
  not_supported: 'Not supported',
  cant_tell: "Can't tell",
};

const FactCheck = () => {
  const [claim, setClaim] = useState('');
  const [source, setSource] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if ((result || error) && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result, error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!claim.trim() || !source.trim() || isChecking) return;

    setIsChecking(true);
    setResult(null);
    setError(null);
    try {
      const { data } = await axios.post(API_ENDPOINTS.FACT_CHECK, {
        claim: claim.trim(),
        source: source.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Fact check failed. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div>
      <h2 className="screen-h2">One claim, one source.</h2>
      <p className="screen-sub">
        Paste a claim and the source that supposedly backs it — text or a URL. A judge model
        reads only the source and rules: supported, not supported, or can't tell. This is the
        trust layer behind{' '}
        <a href="https://www.askgwinnett.com" target="_blank" rel="noopener noreferrer">AskGwinnett</a>,
        packaged as{' '}
        <a href="https://github.com/sg-bfoster/stilltrue" target="_blank" rel="noopener noreferrer">stilltrue</a>.
      </p>
      <form onSubmit={handleSubmit} className="fact-check-form">
        <div className="field">
          <label htmlFor="fc-claim">Claim</label>
          <textarea
            id="fc-claim"
            className="input"
            rows="2"
            value={claim}
            disabled={isChecking}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Ex: The first day of school is August 5."
            required
          />
        </div>
        <div className="field">
          <label htmlFor="fc-source">Source — paste text, or a URL (https://…)</label>
          <textarea
            id="fc-source"
            className="input"
            rows="6"
            value={source}
            disabled={isChecking}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste the source text here, or a single URL to fetch."
            required
          />
        </div>
        <div className="fact-check-actions">
          <button type="submit" className="btn btn-primary" disabled={isChecking}>
            {isChecking ? <span className="spinner" /> : 'Check'}
          </button>
          {(result || error) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
            >
              Clear result
            </button>
          )}
        </div>
      </form>

      <div ref={resultRef} />
      {error && <p className="error-message" style={{ marginTop: 'var(--space-4)' }}>{error}</p>}

      {result && (
        <div className="fact-check-result">
          <span className={`fact-check-verdict verdict-${result.verdict}`}>
            {VERDICT_LABELS[result.verdict] || result.verdict}
          </span>
          <p className="fact-check-reasoning">{result.reasoning}</p>
          {result.evidence && (
            <blockquote className="fact-check-evidence">“{result.evidence}”</blockquote>
          )}
          {(result.sourceUrl || result.truncated) && (
            <p className="fact-check-meta">
              {result.sourceUrl && <>Judged against {result.sourceUrl}. </>}
              {result.truncated && <>Source was truncated to the first 20,000 characters.</>}
            </p>
          )}
        </div>
      )}

      <p className="fact-check-footer">
        Powered by{' '}
        <a href="https://github.com/sg-bfoster/stilltrue" target="_blank" rel="noopener noreferrer">stilltrue</a>
        {' '}—{' '}
        <a href="https://www.npmjs.com/package/stilltrue" target="_blank" rel="noopener noreferrer">npm</a>
        {' '}·{' '}
        <a href="https://github.com/sg-bfoster/stilltrue" target="_blank" rel="noopener noreferrer">GitHub</a>.
        Your tests check your code — stilltrue checks your facts.
      </p>
    </div>
  );
};

export default FactCheck;
