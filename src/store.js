import { configureStore } from '@reduxjs/toolkit';
import assistantReducer from './features/assistantSlice';
import modalReducer from './features/modalSlice';


const store = configureStore({
  reducer: {
    assistant: assistantReducer,
    modal: modalReducer,
  },
});

export default store;