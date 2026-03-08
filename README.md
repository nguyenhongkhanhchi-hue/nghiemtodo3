# NghiemWork - Smart Todo App with Real-time Collaboration

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-yellow.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39.3-green.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-blue.svg)](https://tailwindcss.com/)

A modern, intelligent todo application built with React, TypeScript, and Supabase, featuring real-time collaboration, Eisenhower matrix task management, and AI-powered assistance.

## 🌟 Features

### ✅ Core Functionality
- **Task Management**: Create, edit, complete, and organize tasks
- **Eisenhower Matrix**: Smart task prioritization (Do First, Schedule, Delegate, Eliminate)
- **Real-time Sync**: Instant updates across devices and users
- **Deadline Management**: Set deadlines with smart notifications
- **Timer & Pomodoro**: Built-in task timer with productivity tracking

### 👥 Collaboration & Team Features
- **Workspace Management**: Create and manage team workspaces
- **Group Tasks**: Assign tasks to team members
- **Real-time Chat**: Group messaging with channels
- **Task Assignment**: Delegate tasks to specific users
- **Activity Feed**: Track team progress and updates

### 🤖 AI & Smart Features
- **AI Assistant**: Lucy AI chatbot for task suggestions
- **Voice Commands**: Speech-to-text task creation
- **Smart Templates**: Reusable task templates
- **Auto-Quadrant**: Intelligent task categorization
- **Vietnamese Voice**: Native Vietnamese voice announcements

### 📊 Analytics & Gamification
- **Statistics Dashboard**: Comprehensive productivity analytics
- **Gamification System**: XP, levels, achievements, and rewards
- **Streak Tracking**: Daily completion streaks
- **Performance Metrics**: Task completion rates and time tracking

### 🎨 User Experience
- **Dark/Light Theme**: Modern UI with theme switching
- **Responsive Design**: Works perfectly on mobile and desktop
- **PWA Support**: Install as a web app
- **Offline Support**: Basic functionality without internet
- **Keyboard Shortcuts**: Power user shortcuts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nguyenhongkhanhchi-hue/nghiemtodo3.git
   cd nghiemtodo3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup** (Optional for real-time features)
   Run the SQL in `realtime-schema.sql` in your Supabase SQL Editor

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:8080`

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing

### Backend & Database
- **Supabase** - Backend-as-a-Service with real-time features
- **PostgreSQL** - Robust database
- **Row Level Security** - Database-level security

### UI & UX
- **Radix UI** - Accessible component primitives
- **Lucide Icons** - Beautiful icon set
- **Custom CSS Variables** - Consistent theming
- **Responsive Design** - Mobile-first approach

### Additional Libraries
- **Speech Recognition API** - Voice commands
- **Web Audio API** - Sound effects and voice synthesis
- **Service Workers** - PWA and background sync
- **Web Notifications** - Browser notifications

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── features/       # Feature-specific components
│   ├── layout/         # Layout components
│   └── ui/            # Base UI components
├── hooks/              # Custom React hooks
├── lib/               # Utility functions and services
├── pages/             # Page components
├── stores/            # Zustand state stores
└── types/             # TypeScript type definitions
```

## 🎯 Key Components

### Task Management
- `TaskList.tsx` - Main task display and management
- `TaskViewModal.tsx` - Task details and editing
- `AddTaskInput.tsx` - Task creation interface

### Real-time Features
- `realtimeSync.ts` - Supabase real-time subscriptions
- `GroupChatPage.tsx` - Real-time messaging
- `CollaborationPage.tsx` - Team workspace management

### AI & Smart Features
- `AIPage.tsx` - Lucy AI assistant
- `autoQuadrant.ts` - Smart task categorization
- `useVietnameseVoice.ts` - Voice announcements

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Database
npm run db:reset     # Reset local database
npm run db:seed      # Seed database with sample data
```

### Environment Variables

Create `.env.local` for local development:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: AI Service
VITE_OPENAI_API_KEY=your-openai-key
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Netlify
1. Build command: `npm run build`
2. Publish directory: `dist`
3. Add environment variables

### Manual Build
```bash
npm run build
# Upload dist/ folder to your hosting service
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by NghiemWork Team
- Inspired by productivity methodologies and modern web technologies
- Special thanks to the open-source community

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/nguyenhongkhanhchi-hue/nghiemtodo3/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nguyenhongkhanhchi-hue/nghiemtodo3/discussions)
- **Email**: support@nghiemwork.com

---

**🌟 Star this repo if you find it helpful!**

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [OnSpace]() and click on Share -> Publish.
