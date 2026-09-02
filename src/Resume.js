// Resume.js — displays the generated resume PDF inline, with a download option.
import React from 'react';
import API_BASE_URL from './config/api';
import { Hero, ScreenBody } from './components/Hero';

const RESUME_URL = `${API_BASE_URL}/resume`;

const Resume = () => (
  <>
    <Hero>
      <h1 className="hero-h1">Resume.</h1>
      <p className="hero-sub hero-sub--page">
        Generated fresh from the same source content the assistant answers out of, so it can
        never drift from what the model tells you.<br />&nbsp;
      </p>
    </Hero>
    <ScreenBody width="resume">
      <div className="screen-actions">
        <a className="btn btn-primary" href={`${RESUME_URL}?download=1`}>
          Download PDF
        </a>
        <a className="btn btn-secondary" href={RESUME_URL} target="_blank" rel="noopener noreferrer">
          Open in new tab
        </a>
      </div>
      <iframe className="resume-frame" src={RESUME_URL} title="Brian Foster resume" />
    </ScreenBody>
  </>
);

export default Resume;
