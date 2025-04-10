# Rabin Forest

A modern React application featuring AI-powered chat interfaces with Gemini AI and ChatGPT integration.

![Rabin Forest](public/forest-space-background.png)

## Overview

Rabin Forest is a web application that provides multiple AI chat interfaces:

- **Home**: A personal assistant powered by Gemini AI
- **AI Chat**: A direct interface to Gemini AI for text generation
- **AI Chat Bots**: A conversation simulator with two AI assistants discussing topics

The application features a responsive design with a slide-out panel for navigation and a modern UI with a forest theme.

## Features

- **Multiple AI Interfaces**: Different chat experiences with various AI models
- **Responsive Design**: Works on both desktop and mobile devices
- **Persistent Conversations**: Saves chat history in local storage
- **Dynamic UI**: Adjusts layout based on screen size
- **Modern UI Components**: Includes modals, slide-out panels, and more

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/rabinforest.git
   cd rabinforest
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run start-dev
   ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run start-dev`: Starts the development server with hot reloading
- `npm run build`: Builds the app for production
- `npm start`: Serves the production build
- `npm test`: Runs the test suite
- `npm run eject`: Ejects from Create React App (one-way operation)

## Project Structure

- `src/`: Source code directory
  - `App.js`: Main application component
  - `Home.js`: Home page with Gemini AI personal assistant
  - `AI-Chat.js`: Direct interface to Gemini AI
  - `AI-Chat-Bots.js`: Conversation simulator with two AI assistants
  - `features/`: Redux slices for state management
  - `services/`: API service calls
  - `App.css`: Main stylesheet

## Deployment

The application is configured for deployment on Heroku:

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI
3. Run the following commands:
   ```
   heroku create
   git push heroku main
   ```

## Technologies Used

- React 18
- Redux Toolkit for state management
- React Router for navigation
- Axios for API requests
- Font Awesome for icons

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Background image from [source]
- AI services provided by [provider]
