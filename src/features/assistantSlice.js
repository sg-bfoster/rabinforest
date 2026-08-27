import { createSlice } from '@reduxjs/toolkit';

// The old fetchAssistantResponse thunk (POST /ai/assistant, the OpenAI
// threads route) lived here. It was never dispatched — Home.js talks to
// /ai/gemini-assistant directly — so the thunk, its extraReducers, and the
// server route were removed together on 2026-08-27.

const assistantSlice = createSlice({
  name: 'assistant',
  initialState: {
    conversation: JSON.parse(localStorage.getItem('conversation')) || [],
    persistentLinks: JSON.parse(localStorage.getItem('persistentLinks')) || [],
    threadId: localStorage.getItem('threadId') || null,
    loading: false,
    error: null,
    newLinks: [],
  },
  reducers: {
    resetAssistantState(state) {
      state.conversation = [];
      state.persistentLinks = [];
      state.threadId = null;
      state.newLinks = [];
      state.error = null;
      localStorage.removeItem('conversation');
      localStorage.removeItem('threadId');
    },
    addLink(state, action) {
      const newLink = action.payload;
      let updatedLinks;

      if (newLink.isImage) {
        updatedLinks = [
          newLink,
          ...state.persistentLinks.filter((l) => !(l.isImage && l.text === newLink.text)),
        ];
      } else {
        updatedLinks = [newLink, ...state.persistentLinks];
        updatedLinks = Array.from(new Set(updatedLinks.map(JSON.stringify))).map(JSON.parse);
      }

      state.persistentLinks = updatedLinks;
      state.newLinks = [newLink];

      try {
        const storable = updatedLinks.map((link) =>
          link.isImage
            ? { url: link.url, text: link.text, isImage: true, imageId: link.imageId }
            : link
        );
        localStorage.setItem('persistentLinks', JSON.stringify(storable));
      } catch {
        // Quota exceeded (large images) — links still live in Redux for this session
      }
    },
    clearLinks(state) {
      state.persistentLinks = [];
      localStorage.removeItem('persistentLinks');
      state.newLinks = [];
    }
  },
});

export const { resetAssistantState, addLink ,clearLinks } = assistantSlice.actions;
export default assistantSlice.reducer;