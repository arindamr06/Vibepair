# VibePair 💖✨
> A Private, End-to-End Encrypted 3D Sanctuary & Communication Space for Couples.

![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwind-css)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge&logo=three.js)
![WebCrypto](https://img.shields.io/badge/Encryption-AES--256--GCM-pink?style=for-the-badge)

VibePair is a modern, private web application built for couples featuring a dark cyberpunk-luxe UI with neon purple/pink accents, a multiplayer 3D sandbox world, customizable 3D avatars, real-time voice & video calls with DSP voice effects, relationship AI, and client-side end-to-end encryption. **No registration or account signups required.**

---

## ✨ Features

### 🔒 1. Private Communication & E2EE (No Login Required)
- **WebCrypto SubtleCrypto Engine**: Client-side AES-256-GCM encryption with keys derived via PBKDF2 (100,000 iterations).
- **Safety Fingerprint**: SHA-256 room fingerprint verification ensures zero man-in-the-middle interception.
- **Instant Pair Links**: 1-click invite link generation (`?room=...&key=...`) to pair in seconds.
- **1-to-1 Encrypted Chat**:
  - Disappearing messages with self-destruct burner timers (10s, 30s, 1m, 5m, Off).
  - Encrypted audio voice notes recording and playback.
  - Secret photo sharing with privacy blur-to-reveal filter.
  - Love reactions with burst counters.
  - Live typing indicator and presence detection.
- **WebRTC Voice & Video Calling**: Real-time peer-to-peer audio and video calls, with a **Live 3D Avatar Video Mode**.

### 👤 2. Live 3D Avatar Studio
- **Procedural 3D Character Engine**: Modular Three.js character generator with stylized low-poly aesthetics and hierarchical joint rigging.
- **Deep Customization**:
  - 6 Hairstyles (Cute Buns, Anime Spikes, Long Waves, Chic Bob, Messy Bedhead, Afro Puffs) with 8 hair dye colors.
  - 6 Skin complexions, 6 eye colors.
  - Fashion: Cozy Hoodie, Cyber Jacket, Date Night Dress, Silk Pajamas, Summer Breeze Tee.
  - Accessories: Cat Ears, Angel Halo, Spectacles, Headsets, Heart Earrings.
  - Expressions: Sweet Smile, Shy Blush, Playful Wink, Adoring Love Eyes, Sleepy, Kissy Face.
  - Procedural Skeletal Animations: Idle breathing, Walking, Running, Hip Dance, Cheerful Wave, Warm Hug, Sweet Kiss, Holding Hands, and Sitting.
- **Real-Time Voice Effects DSP**: Live microphone transformation:
  - 🐣 *Cute Chipmunk* (High harmonics boost)
  - 🐻 *Deep Velvet* (Warm low-end bass)
  - 🤖 *Cyber Android* (Sawtooth ring modulation)
  - ✨ *Cosmic Echo* (Stereo feedback delay)
  - 📻 *Vintage Radio* (Bandpass wave shaping)

### 🏡 3. Shared 3D World Sandbox
- **Multiplayer Synchronized Sandbox**: Build your world together in real time.
- **Over 20 Craftable Objects**:
  - *Architecture*: Cozy Cottage House (with chimney & warm windows), Neon Heart Arch, Romantic Bridge.
  - *Furniture*: Cloud Lovers Bed, Velvet Loveseat, Candlelit Dining Table, Roaring Fireplace.
  - *Nature*: Sakura Blossom Trees, Blooming Rose Bushes, Marble Starlight Fountain.
  - *Lighting*: Vintage Street Lanterns, Electric Neon Wall Hearts.
  - *Pets & Fun*: Cozy Calico Kitten (purrs), Shiba Puppy (wags tail), Swan Love Boat.
- **Object Manipulation**: Grid snapping, moving, 45° rotation, scaling, color palette recoloring, deleting, and multi-level **Undo Stack**.
- **Real-time Sync**: Synchronized across windows and devices via WebRTC DataChannel + BroadcastChannel + LocalStorage.

### 💖 4. Consensual Couple Interactions & Activities
- **Proximity Intimacy Bar**: When avatars walk within 2.8m of each other: *Warm Hug*, *Sweet Kiss*, *Hold Hands*, *Slow Dance*, *Cuddle*.
- **Mutual Consent Flow**: Intimate interactions pop up a mutual consent modal on the partner's screen before triggering synchronized paired animations and confetti!
- **Dynamic Atmosphere**:
  - Day/Night lighting cycle slider (Midnight, Sunrise, Golden Hour, Sunset).
  - Weather Particle Systems: Falling Sakura Blossoms, Rain, Snow, and Fireflies.
  - Lo-Fi Ambient Synthesizer: Generative relaxing romantic chord soundscape.
- **Couple Mini-Games**:
  - *Couple Trivia*: Synchronized quiz with real-time answer match score.
  - *Romantic Truth or Dare*: Interactive couple dice roller with playful prompts.
  - *Love Doodles*: Real-time shared canvas for finger and stylus sketching.
- **Shared Memories Wall**:
  - Live "Days in Love" counter.
  - Polaroid board with pinned couple photos, date memories, and milestone notes.

### 🛡️ 5. Privacy & Safety Shield
- **Tab & Window Blur Shield**: Automatically veils the interface whenever focus is lost or the user switches tabs.
- **Screenshot Deterrence Watermark**: Dynamic diagonal watermark displaying session room code and verification fingerprint.
- **Capture Attempt Detection**: Detects `PrintScreen` key events and displays a safety reminder banner.
- **Emergency Panic Mode**: Double-tap `Escape` (or click the shield icon) to instantly replace the entire screen with a neutral "Project Strategy Notes" disguise document.

### 🤖 6. VibeCupid Relationship AI
- **Date Night Generator**: Curated ideas with duration, category, and intimacy tips.
- **Sincere Apology Drafter**: De-escalating templates across gentle, accountable, reassuring, and playful tones with 1-click **Send to Chat**.
- **Deep Conversation Starters**: Questions across vulnerability, dreams, and sweet memories.
- **Personalized Love Notes**: Generators for Morning, Night, Miss You, and Random Affirmations.

### 📱 7. Full Mobile Phone & Touch Optimization
- **On-Screen Virtual Touch Joystick**: 360° virtual thumbstick on the bottom-left for smooth mobile walking.
- **RUN / Sprint Touch Button**: Tap and hold to run.
- **Native Floating Mobile Bottom Dock**: Quick access to World, Chat, Avatar, Games, Memories, and AI Cupid.
- **Mobile Bottom-Sheet Build Catalog**: Slides up smoothly as a mobile-friendly bottom sheet.
- **Touch-drag Avatar Studio & Finger Canvas**: Multi-touch 360° avatar inspection and responsive touch drawing.

---

## 🛠️ Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **3D Graphics**: [Three.js](https://threejs.org/)
- **Real-Time DSP**: Web Audio API
- **Cryptography**: Web Crypto API (`crypto.subtle` AES-256-GCM + PBKDF2)
- **Networking**: WebRTC P2P Streams, Data Channels, and BroadcastChannel
- **Icons & Effects**: [Lucide React](https://lucide.dev/), Canvas Confetti

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v20/v26)
- npm or yarn

### Installation
```bash
git clone https://github.com/arindamr06/Vibepair.git
cd Vibepair
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Dual-Window Testing (Simulate 2 Partners)
1. Open [http://localhost:3000](http://localhost:3000) in **Tab 1**.
2. Click **"Copy Instant Invite Link for Partner"** or copy the Room Code.
3. Open a second window or incognito tab (**Tab 2**) and paste the URL.
4. Both partners are instantly connected via client-side end-to-end encryption!

---

## 📄 License
MIT License. Built with love for couples everywhere. 💖
