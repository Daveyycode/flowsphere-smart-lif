# FlowSphere - Smart Life Management Platform

One app to simplify your entire life — home, work, and family in perfect flow.

## 🚀 Overview

FlowSphere is a unified platform that brings together family safety, smart home control, notification intelligence, security monitoring, and AI-powered insights into one beautiful, privacy-first interface.

## 📱 User Application

The main user application is accessible at the root URL (`/` or `index.html`):
- Dashboard with stats and insights
- Smart device control
- CCTV & security monitoring
- Intelligent automations
- Family safety tracking
- Notification management with AI categorization
- Settings and subscription management

## 🔐 Admin Panel (Owner Only)

**For app owners only**: Access the admin dashboard by navigating to `/admin.html`

The admin panel is completely separate from the user interface and includes:
- System analytics and insights
- User management capabilities
- Advanced configuration options
- Strict ownership verification (non-owners see an access denied screen)

**To access admin:**
1. Navigate to `/admin.html` in your browser
2. The system will automatically verify your ownership
3. Only the app owner will see the admin dashboard
4. All other users will see an access denied message

## 🛠️ Development

This is a React + TypeScript application built with Vite, using:
- Tailwind CSS for styling
- Shadcn UI components
- Framer Motion for animations
- Phosphor Icons
- useKV for persistent storage

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
