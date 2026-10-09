/**
 * VibePair Relationship AI Engine ("VibeCupid")
 * Privacy-first: Runs client-side with rich generative heuristics.
 * Supports date planning, sincere apologies, conversation prompts, and custom love letters.
 */

export interface DateIdea {
  title: string;
  category: 'cozy' | 'adventure' | 'romantic' | 'creative' | 'playful';
  duration: string;
  description: string;
  tips: string[];
}

export interface ApologyTemplate {
  tone: 'gentle' | 'accountable' | 'reassuring' | 'playful';
  subject: string;
  text: string;
}

export const DATE_IDEAS: DateIdea[] = [
  {
    title: 'Starlight Pillow Fort Cinema',
    category: 'cozy',
    duration: '2 - 3 hours',
    description: 'Build a giant cozy pillow fort with fairy lights, warm blankets, homemade hot cocoa, and binge-watch nostalgic childhood animated movies.',
    tips: ['Put phones on "Do Not Disturb"', 'Prepare popcorn with melted butter & cinnamon', 'End with a cozy forehead kiss'],
  },
  {
    title: 'Neon Sunset Rooftop Picnic',
    category: 'romantic',
    duration: '1.5 hours',
    description: 'Find a scenic spot or balcony right before golden hour. Pack sparkling cider, strawberries, cheese, and a Bluetooth speaker playing chill synth-wave.',
    tips: ['Watch the skyline change colors', 'Take 3 candid photos of each other', 'Share 1 secret dream for the next year'],
  },
  {
    title: 'Midnight Bake-Off Challenge',
    category: 'creative',
    duration: '2 hours',
    description: 'Bake chocolate lava cakes or decorate mini cupcakes blindfolded or using only 4 mystery ingredients in the kitchen.',
    tips: ['Play an energetic playlist', 'Winner gets 3 free back massages', 'Flour smudges on cheeks are mandatory'],
  },
  {
    title: 'Virtual World Date & Star Gazing',
    category: 'playful',
    duration: '1 - 2 hours',
    description: 'Meet inside your VibePair 3D world, design a secret garden sanctuary together, and slow-dance by the glowing ocean shore.',
    tips: ['Place fairy lights together', 'Sync your favorite romantic music', 'Use the Live Avatar voice effects for silly laughs'],
  },
  {
    title: 'Memory Lane Scavenger Hunt',
    category: 'romantic',
    duration: '2 hours',
    description: 'Write 4 tiny handwritten clues or riddles pointing to places or objects that hold special memories from when you first met.',
    tips: ['Keep each clue cute and nostalgic', 'The final treasure is a heartfelt letter or sweet treat', 'Embrace sweet laughter'],
  },
  {
    title: 'Cook a 3-Course Gourmet Dinner Together',
    category: 'romantic',
    duration: '2.5 hours',
    description: 'Pick an Italian pasta or sushi night recipe neither of you has tried before. One is the head chef, the other is the sous-chef, with wine and jazz.',
    tips: ['Light tapered candles on the table', 'Dress up a little just for each other', 'Leave dishes for tomorrow morning'],
  },
];

export const CONVERSATION_STARTERS = [
  {
    category: 'Deep & Vulnerable',
    question: 'What is a moment with me that made you feel completely safe and deeply loved?',
  },
  {
    category: 'Deep & Vulnerable',
    question: 'If you could pause time for 24 hours right now, just for the two of us, how would we spend it?',
  },
  {
    category: 'Sweet & Romantic',
    question: 'What was the very first thought that crossed your mind when you first saw my face?',
  },
  {
    category: 'Future & Dreams',
    question: 'Describe our dream vacation cabin in 5 words—what does it smell and look like?',
  },
  {
    category: 'Fun & Playful',
    question: 'If we were partners in a goofy bank heist movie, who is the getaway driver and who accidentally drops the bag?',
  },
  {
    category: 'Intimacy & Touch',
    question: 'Which of my little daily habits or expressions makes your heart skip a beat?',
  },
  {
    category: 'Sweet & Romantic',
    question: 'What is one song that always makes you think of me whenever you hear it playing?',
  },
];

export const APOLOGY_TEMPLATES: ApologyTemplate[] = [
  {
    tone: 'gentle',
    subject: 'For snapping or being impatient',
    text: "Hey love, I want to sincerely apologize for how I reacted earlier. I was feeling overwhelmed, but that is never an excuse to take it out on you. Your feelings matter so much to me, and you didn't deserve that energy. Can I give you a long hug whenever you're ready?",
  },
  {
    tone: 'accountable',
    subject: 'For forgetting or misunderstanding',
    text: "I am really sorry I dropped the ball on this. I understand why you feel disappointed, and you have every right to feel that way. I value our promises, and I'm actively putting reminders in place so it doesn't happen again. How can I make this right for you today?",
  },
  {
    tone: 'reassuring',
    subject: 'For emotional distance or being busy',
    text: "I've been caught up in my head and work lately, and I realize I haven't been as present with you as you deserve. You are my top priority and my favorite person in the world. I want to put everything else away tonight and just be with you.",
  },
  {
    tone: 'playful',
    subject: 'For a silly disagreement or stubbornness',
    text: "I admit it... I was being stubborn and grumpy. You were right, and my ego got in the way! Please forgive your silly partner? I come bearing your favorite treats and infinite apologies. 🥺❤️",
  },
];

export function generateLoveMessage(type: 'morning' | 'night' | 'random' | 'miss_you', partnerName: string): string {
  const name = partnerName || 'my favorite human';
  switch (type) {
    case 'morning':
      return `Good morning ${name} ✨ Waking up knowing you are in my life makes every morning feel lighter. I hope your day is as bright, warm, and wonderful as your smile. Sending you the tightest hug to start your day! ☕💖`;
    case 'night':
      return `Good night ${name} 🌙 Rest your pretty eyes and sweet mind. Thank you for being my sanctuary today and every day. I'll see you in our dreams and tomorrow morning. Sweet dreams, my love. 💫`;
    case 'miss_you':
      return `Just sitting here thinking about your laugh and how much better everything is when you're around ${name}. Counting down the minutes until I get to hold you again. You have my whole heart! 🧸💌`;
    case 'random':
    default:
      return `A quick reminder just because: you are adored, you are cherished, and I am so grateful the universe brought us together ${name}. Never forget how special you are to me! 🌸✨`;
  }
}
