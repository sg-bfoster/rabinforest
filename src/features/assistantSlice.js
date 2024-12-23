import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Thunk for making the API call
export const fetchAssistantResponse = createAsyncThunk(
  'assistant/fetchResponse',
  async ({ inputText, threadId }, { getState, rejectWithValue }) => {
    try {
      const response = await fetch('https://bfoster-services.herokuapp.com/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: inputText, threadId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data; // Return the full response for further processing
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

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
      const updatedLinks = [newLink, ...state.persistentLinks];

      // Ensure no duplicates
      const uniqueLinks = Array.from(new Set(updatedLinks.map(JSON.stringify))).map(JSON.parse);

      state.persistentLinks = uniqueLinks;
      state.newLinks = [newLink];
      localStorage.setItem('persistentLinks', JSON.stringify(uniqueLinks));
    },
    clearLinks(state) {
      state.persistentLinks = [];
      localStorage.removeItem('persistentLinks');
      state.newLinks = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssistantResponse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssistantResponse.fulfilled, (state, action) => {
        state.loading = false;
        const { answer, links, threadId } = action.payload;

        // Update threadId
        if (threadId) {
          state.threadId = threadId;
          localStorage.setItem('threadId', threadId);
        }

        // Update conversation
        const newConversation = [
          ...state.conversation,
          { role: 'user', content: action.meta.arg.inputText },
          { role: 'assistant', content: answer },
        ];
        state.conversation = newConversation;
        localStorage.setItem('conversation', JSON.stringify(newConversation));

        // Update links
        if (links && links.length > 0) {
          // Map links into objects with { url, text } format
          const formattedLinks = links.map((link) => ({
            url: link,
            text: link, // Use the URL as text for simplicity; modify if you have different text for each link
          }));

          // Merge with existing links and remove duplicates
          const updatedLinks = Array.from(
            new Set([
              ...formattedLinks.map(JSON.stringify), // Convert to strings for deduplication
              ...state.persistentLinks.map(JSON.stringify),
            ])
          ).map(JSON.parse); // Convert back to objects

          state.persistentLinks = updatedLinks;
          state.newLinks = formattedLinks;
          localStorage.setItem('persistentLinks', JSON.stringify(updatedLinks));
        }
      })
      .addCase(fetchAssistantResponse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'An error occurred.';
        state.conversation.push({ role: 'assistant', content: 'An error occurred. Please try again.' });
      });
  },
});

export const { resetAssistantState, addLink ,clearLinks } = assistantSlice.actions;
export default assistantSlice.reducer;