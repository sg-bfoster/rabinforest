import React from 'react';

/**
 * The read-aloud icons, in ONE place.
 *
 * They started life inline in Home.js for the chat's per-answer button. When
 * the imagery page's "Ask the box what it sees" panel needed the same control,
 * copying them would have guaranteed the two drift — the usual way a product
 * ends up with two speakers that are almost the same shape.
 *
 * WHY SVG AND NOT AN EMOJI. These replaced 🔊 and ◼, which were set at 12px
 * and unreadable: an emoji is a full-colour glyph drawn by the OS, so its
 * detail collapses at small sizes, it cannot inherit the button's colour, and
 * it renders differently on every platform. These draw in currentColor, so a
 * button's existing hover and focus rules recolour the icon for free.
 *
 * ONE sound arc, not the two or three a speaker usually carries. At 16px the
 * extra arcs merge into a smudge, and one still reads unmistakably as sound.
 */
export const SpeakerIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M3 6h2.6L9.4 2.8v10.4L5.6 10H3z" fill="currentColor" />
    <path
      d="M11.6 5.6a3.4 3.4 0 0 1 0 4.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const StopIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />
  </svg>
);
