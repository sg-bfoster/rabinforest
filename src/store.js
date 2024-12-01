import { configureStore } from '@reduxjs/toolkit';
import assistantReducer from './features/assistantSlice';

const store = configureStore({
  reducer: {
    assistant: assistantReducer,
  },
});

export default store;