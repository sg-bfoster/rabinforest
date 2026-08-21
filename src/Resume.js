// Resume.js — displays the generated resume PDF inline, with a download option.
import React from 'react';
import API_BASE_URL from './config/api';

const RESUME_URL = `${API_BASE_URL}/resume`;

const Resume = () => (
  <div>
    <h2 className="screen-h2">Resume</h2>
    <p className="screen-sub">
      Brian Foster's current resume, generated fresh from the assistant's source content.
    </p>
    <div className="screen-actions">
      <a className="btn btn-primary" href={`${RESUME_URL}?download=1`}>
        Download PDF
      </a>
      <a className="btn btn-ghost" href={RESUME_URL} target="_blank" rel="noopener noreferrer">
        Open in new tab
      </a>
    </div>
    <iframe className="resume-frame" src={RESUME_URL} title="Brian Foster resume" />
  </div>
);

export default Resume;
