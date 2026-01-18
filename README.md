# Rabin Forest

A modern React portfolio application featuring an AI-powered personal assistant, multiple AI chat interfaces, and dynamic content management. "Rabin Forest" is an anagram for "Brian Foster" and serves as both a personal portfolio and AI playground.

**Live Site**: https://www.rabinforest.com

![Rabin Forest](public/forest-space-background.png)

## Overview

Rabin Forest is a full-featured web application that combines:
- **Personal AI Assistant**: A Gemini AI-powered assistant trained on Brian Foster's professional background and experience
- **Multiple AI Interfaces**: Various chat experiences with OpenAI and Google Gemini
- **Admin Panel**: Content management system for updating the AI assistant's knowledge base
- **Dynamic Resume**: Integration with backend service for generating up-to-date resume PDFs
- **Link Management**: Smart link collection and display system

The application features a responsive design with a forest-themed UI, slide-out navigation panels, and persistent conversation history.

## Features

### Core Features

- **Personal AI Assistant (Home Page)**
  - Gemini AI assistant trained on Brian Foster's information stored in Firebase Firestore
  - Answers questions about professional background, skills, experience, and portfolio
  - Maintains conversation history in local storage
  - Returns structured JSON responses with text and links
  - Automatically extracts and displays relevant links in the navigation panel

- **Admin Panel** (`/admin`)
  - Password-protected content editor
  - Updates assistant knowledge base in Firebase Firestore
  - Real-time content editing with auto-save
  - Responsive design for desktop and mobile

- **AI Chat Interfaces**
  - **AI Chat**: Direct interface to Gemini AI for general text generation
  - **AI Chat Bots**: Conversation simulator with two AI assistants discussing topics
  - **Playground**: Experimental AI features and testing

- **DALL-E Integration**
  - Image generation interface
  - Customizable size, quality, and style options

- **Special Features**
  - **Emma Splash Page**: Special landing page for visitors from emmajanefoster.net
  - **Link Management**: Persistent links displayed in navbar and slide-out panel
  - **Splash Screen**: Animated splash screen on initial load
  - **Modal System**: Contextual help modals for different sections

### Technical Features

- **Responsive Design**: Adaptive layout for desktop, tablet, and mobile
- **Persistent State**: Conversation history saved in local storage
- **Redux State Management**: Centralized state with Redux Toolkit
- **Dynamic API Configuration**: Automatically detects production vs development
- **HTTPS Enforcement**: Redirects HTTP to HTTPS in production

## Prerequisites

- Node.js (v14 or higher, tested with v20.x)
- npm (v6 or higher)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sg-bfoster/rabinforest.git
   cd rabinforest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Create `.env` file for local development:
   ```env
   REACT_APP_ADMIN_PASSWORD=your_admin_password
   REACT_APP_API_BASE_URL=http://localhost:8081
   ```

4. Start the development server:
   ```bash
   npm run start-dev
   ```

5. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run start-dev`: Starts the development server with hot reloading (port 3000)
- `npm run build`: Builds the app for production
- `npm start`: Serves the production build using `serve`
- `npm test`: Runs the test suite
- `npm run eject`: Ejects from Create React App (one-way operation)

## Project Structure

```
rabinforest/
├── public/                 # Static assets
│   ├── index.html
│   └── forest-space-background.png
├── src/
│   ├── App.js             # Main application component with routing
│   ├── Home.js            # Personal AI assistant page
│   ├── Admin.js           # Admin content editor
│   ├── AI-Chat.js         # Direct Gemini AI interface
│   ├── AI-Chat-Bots.js    # Dual AI conversation simulator
│   ├── Playground.js      # Experimental AI features
│   ├── Dalle-3.js         # DALL-E image generation
│   ├── EmmaSplashPage.js # Special landing page
│   ├── config/
│   │   └── api.js        # API endpoint configuration
│   ├── features/          # Redux slices
│   │   ├── assistantSlice.js
│   │   └── modalSlice.js
│   ├── services/          # API service providers
│   │   └── dalleServiceProvider.js
│   └── components/        # Reusable components
│       ├── Navbar.js
│       ├── Footer.js
│       ├── SlideOutPanel.js
│       ├── Menu.js
│       └── Modal.js
└── package.json
```

## API Integration

The application connects to the `bfoster-services` backend API:

### Development
- Default: `http://localhost:8081`
- Can be overridden with `REACT_APP_API_BASE_URL` environment variable

### Production
- Automatically uses: `https://bfoster-services.herokuapp.com`
- Detected based on hostname (rabinforest.com)

### API Endpoints Used

- `POST /ai/gemini-assistant` - Personal assistant queries
- `GET /ai/assistant-bfoster` - Retrieve assistant content
- `PUT /ai/assistant-bfoster` - Update assistant content
- `POST /ai/generate-text-gemini` - Direct text generation
- `POST /ai/ai-chat` - OpenAI chat completion
- `POST /ai/generate-image-rf` - DALL-E image generation
- `GET /resume` - Download dynamic resume PDF

## State Management

Uses Redux Toolkit for state management:

- **assistantSlice**: Manages conversation state, links, and thread IDs
- **modalSlice**: Controls modal visibility and content

## Key Components

### Home Page
The main personal assistant interface that:
- Maintains conversation history in local storage
- Sends queries to Gemini AI with context about Brian Foster
- Displays responses with extracted links
- Shows links in the slide-out panel

### Admin Panel
Password-protected content management:
- Fetches current content from Firebase
- Allows editing of assistant knowledge base
- Saves changes to Firebase Firestore
- Real-time validation and error handling

### Slide-Out Panel
Navigation and link display:
- Shows persistent links from conversations
- Displays new links from current session
- Responsive: always visible on desktop, slide-out on mobile

## Environment Configuration

### Development
- API automatically points to `localhost:8081`
- Hot reloading enabled
- Development tools available

### Production
- API automatically points to Heroku backend
- HTTPS enforcement
- Optimized production build

## Deployment

### Heroku

The application is configured for Heroku deployment:

1. Ensure `heroku-postbuild` script runs: `npm run build`
2. Deploy:
   ```bash
   git push heroku main
   ```

### Environment Variables (Heroku)

Set in Heroku dashboard if needed:
- `REACT_APP_ADMIN_PASSWORD` - Admin panel password
- `REACT_APP_API_BASE_URL` - Override API base URL (usually not needed)

## Technologies Used

- **React 18** - UI framework
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests
- **Font Awesome** - Icon library
- **Create React App** - Build tooling

## Security Features

- **HTTPS Enforcement**: Automatically redirects HTTP to HTTPS in production
- **Admin Authentication**: Password-protected admin panel
- **CORS Protection**: Backend API validates referrer headers
- **Rate Limiting**: Backend API implements rate limiting

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile devices
- Progressive enhancement for older browsers

## License

MIT License

## Author

Brian Foster - https://www.rabinforest.com

## Related Projects

- **bfoster-services**: Backend API service (https://github.com/sg-bfoster/bfoster-services)
- **brianfoster.net**: Portfolio site showcasing React skills
- **briantfoster.com**: Portfolio site showcasing Angular skills

## Acknowledgements

- AI services provided by OpenAI and Google Gemini
- Background images and assets created by Brian Foster
- Built with modern React best practices 
