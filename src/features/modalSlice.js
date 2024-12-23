import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isVisible: false,
  type: null, // e.g., 'about', 'example', 'confirmation', etc.
  payload: {}, // Additional data for the modal
  title: '', // Optional: Modal title
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openModal(state, action) {
      state.isVisible = true;
      state.type = action.payload.type || null;
      state.payload = action.payload.payload || {};
      state.title = action.payload.title || '';
    },
    closeModal(state) {
      state.isVisible = false;
      state.type = null;
      state.payload = {};
      state.title = '';
    },
  },
});

export const { openModal, closeModal } = modalSlice.actions;

// Selector
export const selectModal = (state) => state.modal;

export default modalSlice.reducer;