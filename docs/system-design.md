# ContextCam — Detailed Project Explanation and System Design

## 1. Project Overview
ContextCam is a React Native mobile application built with Expo. It lets users point their phone at labels, contracts, or academic content, extract text from the image, detect the likely context of the content, and receive AI-generated analysis. The app supports three analysis modes:

- Health mode for medical or nutrition-related content
- Legal mode for contracts and agreements
- Academic mode for formulas, concepts, and technical explanations

The core pipeline is:

Capture image -> OCR text extraction -> mode detection -> Gemini analysis -> result display -> optional history save

---

## 2. Directory Structure and Purpose

### Root level files
- package.json: Defines dependencies, scripts, and the Expo/React Native project configuration.
- app.json: Expo app metadata including app name, package name, splash screen, and web configuration.
- README.md: User-facing overview of features, setup instructions, and usage guidance.
- tsconfig.json: TypeScript compiler settings for the project.
- expo-env.d.ts: Type declarations for Expo environment variables.
- android/: Native Android project files generated for Expo/React Native builds.
- assets/: Icons, images, and app branding assets.
- patches/: Compatibility patches for packages.
- scripts/: Utility scripts such as the reset project helper.

### Source code structure
- src/app/: Screens and route-based pages.
- src/components/: Reusable UI components.
- src/config/: App styling and design tokens.
- src/constants/: Shared theme definitions.
- src/hooks/: Custom hooks for theme and platform behavior.
- src/navigation/: Navigation setup for tabs and stacks.
- src/utils/: Business logic modules for OCR, AI, mode detection, and storage.
- src/global.css: Global styles for web or shared styling.

---

## 3. File-by-File Explanation

### Root files

#### package.json
This file is the project manifest. It includes:
- Expo and React Native dependencies
- Camera, OCR, AI, storage, and navigation libraries
- Scripts such as start, android, web, and lint

It defines the app as an Expo-managed React Native project.

#### app.json
This file contains Expo application configuration such as:
- app name and slug
- app orientation and icon settings
- Android package identifier
- plugin setup for Expo Router and splash screen

#### README.md
This document explains the purpose of the app, the workflow, setup instructions, and important usage notes. It also describes the mode detection keywords.

#### tsconfig.json
TypeScript compiler configuration used for type checking and module resolution.

#### expo-env.d.ts
This file provides TypeScript support for environment variables used by Expo.

---

### Application screens

#### src/app/index.js
This is the main camera screen.
Responsibilities:
- Requests camera permission from the user
- Opens the built-in camera view
- Captures an image
- Sends the image to OCR processing
- Calls the main processing pipeline after OCR text is recovered
- Navigates to the result screen with the analysis payload

It is the primary entry point for the scanning experience.

#### src/app/result.js
This screen displays the analysis result after processing.
Responsibilities:
- Reads the scan result passed from the camera screen
- Shows extracted text, AI-generated analysis, and timestamp
- Lets the user switch between HEALTH, LEGAL, and ACADEMIC modes
- Lets the user save the result to local history
- Lets the user scan again

This is the main presentation layer for the outcome of the scan.

#### src/app/history.js
This screen shows saved scans from local storage.
Responsibilities:
- Loads past scan results from AsyncStorage
- Warns the user about scans approaching automatic deletion
- Lets the user view a saved scan again
- Lets the user export or mark a scan as backed up
- Lets the user delete entries

#### src/app/settings.js
This screen provides app-level settings and information.
Responsibilities:
- Shows the app version and total scan count
- Allows clearing all saved history
- Explains the app purpose and capabilities

#### src/app/_layout.js
This file configures the app layout using Expo Router tabs. It defines the visible tabs and hides the result screen from the tab bar.

---

### Navigation

#### src/navigation/TabNavigator.js
This file defines the tab-based navigation structure.
Responsibilities:
- Creates the bottom tab navigator
- Groups camera and result flow into a stack
- Connects the three main sections: Scan, History, Settings

---

### Shared UI components

#### src/components/app-tabs.tsx
A tab component designed for Expo Router navigation. It is more aligned with a native-tab style experience and is part of the app’s UI scaffolding.

#### src/components/animated-icon.tsx
This component creates an animated splash/icon experience. It uses Reanimated and Expo Image for a polished startup visual.

#### src/components/themed-text.tsx
A reusable text wrapper with theme-aware styling.

#### src/components/ui/collapsible.tsx
A reusable collapsible UI component that can be used for expandable sections.

#### src/components/external-link.tsx
A small helper component for rendering links that open external URLs.

#### src/components/hint-row.tsx
A lightweight UI component that likely helps display hints or tips in the interface.

#### src/components/web-badge.tsx
A web-specific badge UI element used for web compatibility.

---

### Design and theme files

#### src/config/colors.js
Defines the app’s visual theme tokens:
- colors for primary, secondary, accent, text, borders, and mode badges
- spacing values
- typography scale

This file centralizes styling values so the app remains consistent.

#### src/constants/theme.ts
Defines the light and dark theme palette shared by components.

#### src/hooks/use-theme.ts
Returns the correct color values depending on the active theme.

#### src/hooks/use-color-scheme.ts
Provides the current color scheme for the app.

#### src/hooks/use-color-scheme.web.ts
A web-specific implementation of the same hook.

---

### Utility modules

#### src/utils/ocrService.js
This module performs OCR on the captured image.
Responsibilities:
- Reads the image file as base64
- Sends it to the Gemini vision API for OCR
- Returns extracted text or an error message

It is the first major processing step after image capture.

#### src/utils/modeDetector.js
This module contains the lightweight keyword-based logic for detecting the scan category.
Responsibilities:
- Scores the extracted text for health, legal, and academic keywords
- Returns a detected mode when confidence is high
- Falls back to Gemini if the keyword score is weak

#### src/utils/geminiService.js
This module wraps calls to Google Gemini.
Responsibilities:
- Reads the API key from the environment
- Sends prompts to Gemini
- Returns the model response
- Handles common API errors such as rate-limit or invalid key issues

#### src/utils/processingService.js
This module orchestrates the full processing pipeline.
Responsibilities:
- Checks whether the device has internet access
- Detects the mode based on text
- Uses Gemini for analysis with a mode-specific instruction prompt
- Returns a structured result object

This file acts as the application’s main analysis service coordinator.

#### src/utils/storageService.js
This module handles persistent local storage.
Responsibilities:
- Saves scans to AsyncStorage
- Loads all saved scans
- Deletes a single item or clears all history
- Warns users before old scans are automatically deleted
- Marks scans as backed up

This is the persistence layer of the app.

---

### Global and platform files

#### src/global.css
A global stylesheet used for shared web styling.

#### android/...
These files are generated or needed for Android builds, permissions, and packaging. They support the native side of the app.

#### assets/...
These contain the app’s graphics and icons used by Expo and Android.

---

## 4. System Design

### 4.1 High-Level Architecture
The application follows a simple client-driven architecture:

- Frontend: React Native + Expo
- Camera input: Expo Camera
- OCR: Gemini Vision via image-to-text processing
- Analysis: Gemini text generation API
- Storage: AsyncStorage on-device
- Navigation: Expo Router + React Navigation

### 4.2 Main Components
1. Camera Screen
   - Captures image and begins processing

2. OCR Service
   - Extracts text from the image

3. Mode Detector
   - Classifies text into HEALTH, LEGAL, or ACADEMIC using keyword heuristics

4. Processing Service
   - Coordinates analysis and fallback logic

5. Gemini Service
   - Sends structured prompts to the AI model and returns analysis text

6. Storage Service
   - Persists scan data locally on the device

7. Result and History Screens
   - Presents results and allows review or reuse of previous scans

### 4.3 Data Flow
1. User captures an image
2. The app sends the image to OCR
3. OCR returns extracted text
4. The text is classified into a mode
5. Gemini generates a contextual analysis
6. The result is shown to the user
7. The user can save the result to local history

### 4.4 Data Model
Each saved scan contains fields such as:
- id
- mode
- extractedText
- analysis
- timestamp
- savedAt
- backedUp

### 4.5 Design Strengths
- Simple and maintainable architecture
- Clear separation of concerns across screens and services
- Local persistence for privacy and offline readiness
- Easy extension to support more modes or export formats

### 4.6 Limitations and Risks
- OCR accuracy depends heavily on image quality
- AI analysis requires internet access
- Local storage is device-only and not synced across devices
- Current mode detection is keyword-based and may be imperfect

### 4.7 Security and Privacy Considerations
- The app stores scan results locally only
- Text is sent to Gemini for analysis only when internet access is present
- The current design does not include cloud sync or user accounts

---

## 5. How the App Works End-to-End

1. The user opens the camera screen.
2. The app requests camera permission if needed.
3. The user captures an image.
4. The image is passed to OCR.
5. If the OCR succeeds, the text is analyzed.
6. The app chooses a mode and prompts Gemini.
7. The result is displayed in the result screen.
8. The user can save it to history for later review.

---

## 6. Recommended Improvements
- Add real PDF export instead of a placeholder action
- Improve mode detection with a stronger ML-based classifier
- Add offline fallback summaries or cached analyses
- Add user authentication and cloud backup
- Add better error handling and retry logic

---

## 7. Conclusion
ContextCam is a compact but well-structured Expo-based mobile app that combines camera capture, OCR, AI analysis, and local persistence. Its design is simple, practical, and easy to extend, making it a solid foundation for a more advanced document-analysis platform.
