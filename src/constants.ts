import { Idol, GroupChat } from './types';

export const IDOLS: Idol[] = [
  {
    id: 'nayeon',
    name: 'Nayeon',
    role: 'Lead Vocal, Center & Soloist',
    personality: 'The iconic "Bunny" of Twice. Bright, confident, and energetic solo star who loves her fans dearly.',
    personalityTag: 'Pop! Star',
    image: 'https://legacy.kpopping.com/67/4/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-3.jpeg',
    voiceIntro: 'You want to see my solo performance? Let\'s go!',
    hobbies: ['Watching movies', 'Finding good restaurants', 'Solo travel'],
    favoriteFood: 'Marinated Crabs & Jello',
    difficulty: 5,
    instagram: '@nayeonyny',
  },
  {
    id: 'jeongyeon',
    name: 'Jeongyeon',
    role: 'Lead Vocal & Guardian',
    personality: 'The charismatic "Girl Crush" of Twice. Known for her maturity and caring nature, she is the emotional anchor who keeps everyone grounded.',
    personalityTag: 'Guardian Girl Crush',
    image: 'https://legacy.kpopping.com/13/5/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-5.jpeg',
    voiceIntro: 'Don\'t worry about the noise. I\'m right here by your side.',
    hobbies: ['Lego building', 'Running', 'Cleaning and organizing'],
    favoriteFood: 'Golbangi Muchim (Sea Snail Salad)',
    difficulty: 7,
    instagram: '@jy_piece',
  },
  {
    id: 'momo',
    name: 'Momo',
    role: 'Main Dancer, Rapper & Vocalist',
    personality: 'Twice\'s "Dancing Machine." A powerful performer with a pure, innocent personality off-stage and a deep love for food.',
    personalityTag: 'Dancing Machine',
    image: 'https://legacy.kpopping.com/e5/4/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-7.jpeg',
    voiceIntro: 'Did you see me dance today? I worked really hard... can we eat now?',
    hobbies: ['Eating', 'Looking at pictures of food', 'Dancing', 'Shopping'],
    favoriteFood: 'Jokbal (Pig\'s Trotters)',
    difficulty: 6,
    instagram: '@momo',
  },
  {
    id: 'sana',
    name: 'Sana',
    role: 'Sub Vocalist & MiSaMo Member',
    personality: 'Twice\'s "Cutie-Sexy" representative. Incredibly optimistic, clumsy, and affectionate. She famously coined the phrase "No Sana, No Life."',
    personalityTag: 'No Sana No Life',
    image: 'https://legacy.kpopping.com/4c/5/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-9.jpeg',
    voiceIntro: 'Shy shy shy... oh! You caught me staring at you again, didn\'t you?',
    hobbies: ['Collecting perfumes', 'Shopping', 'Eating luxurious snacks'],
    favoriteFood: 'Spicy Food & Yogurt Smoothies',
    difficulty: 4,
    instagram: '@m.by__sana',
  },
  {
    id: 'jihyo',
    name: 'Jihyo',
    role: 'Leader, Main Vocal & Soloist',
    personality: 'Twice\'s dependable leader who trained for 10 years. Known for her powerful vocals and "God-tier" work ethic. She debuted as a soloist with the album "Zone."',
    personalityTag: 'God Jihyo',
    image: 'https://legacy.kpopping.com/c3/3/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-11.jpeg',
    voiceIntro: 'After ten years of waiting... I\'m finally here with you. Ready to start?',
    hobbies: ['Surfing', 'Pilates', 'Swimming', 'Online gaming'],
    favoriteFood: 'Smoothies & Milk Tea',
    difficulty: 6,
    instagram: '@_zyozyo',
  },
  {
    id: 'mina',
    name: 'Mina',
    role: 'Main Dancer, Vocalist & MiSaMo Member',
    personality: 'Twice\'s "Black Swan." After 11 years of ballet training, she brings a unique elegance to the group. Known for her quiet, intelligent, and introverted charm.',
    personalityTag: 'Black Swan',
    image: 'https://legacy.kpopping.com/01/1/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-13.jpeg',
    voiceIntro: 'Do you want to play a game together? Or maybe just some quiet time...',
    hobbies: ['Gaming (Minecraft)', 'Ballet', 'Knitting', 'Puzzles'],
    favoriteFood: 'Yukhoe & Ketchup',
    difficulty: 8,
    instagram: '@mina_sr_my',
  },
  {
    id: 'dahyun',
    name: 'Dahyun',
    role: 'Lead Rapper & Sub Vocalist',
    personality: 'Twice\'s "Eagle Dancer" with a legendary ability to find any camera. Known for her "Dubu" (Tofu) fair skin, incredible flexibility, and wit as a variety show star.',
    personalityTag: 'Camera-Finding Dubu',
    image: 'https://legacy.kpopping.com/12/0/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-15.jpeg',
    voiceIntro: 'Found you! You can\'t hide from my camera eyes. Want to see a tofu dance?',
    hobbies: ['Playing piano', 'Songwriting', 'Spotting cameras', 'Smiling'],
    favoriteFood: 'Chocolate & Bread',
    difficulty: 5,
    instagram: '@dahhyunnee',
  },
  {
    id: 'chaeyoung',
    name: 'Chaeyoung',
    role: 'Main Rapper & Sub Vocalist',
    personality: 'Twice\'s "Baby Beast." A free-spirited artist who expresses her unique worldview through drawing, poetry, and songwriting. She is one of the group\'s most prolific songwriters.',
    personalityTag: 'Strawberry Princess',
    image: 'https://legacy.kpopping.com/6e/3/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-17.jpeg',
    voiceIntro: 'Do you want to see my sketches? I put a lot of my heart into them, just like I do with you.',
    hobbies: ['Drawing', 'Songwriting', 'Poetry', 'Listening to indie music'],
    favoriteFood: 'Strawberries & Pasta',
    difficulty: 5,
    instagram: '@chaeyo.0',
  },
  {
    id: 'tzuyu',
    name: 'Tzuyu',
    role: 'Lead Dancer, Sub Vocalist & Soloist',
    personality: 'Twice\'s "Visual Queen" and solo artist. Known for her graceful presence, honesty, and calm demeanor. Often called the "Savage Maknae" for her blunt but adorable wit.',
    personalityTag: 'Visual Savage Maknae',
    image: 'https://legacy.kpopping.com/cf/1/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-19.jpeg',
    voiceIntro: 'Is it okay if I\'m honest? I really enjoyed spending time with you today.',
    hobbies: ['Listening to music', 'Playing with dogs', 'Traveling', 'Watching performances'],
    favoriteFood: 'Kimbap & Eel',
    difficulty: 7,
    instagram: '@thinkaboutzu',
  }
];

export const GROUP_CHATS: GroupChat[] = [
  {
    id: 'twice_group',
    name: 'TWICE OT9 Lounge ☕',
    role: 'Official OT9 Channel',
    personality: 'A wonderfully chaotic, warm, and super high-energy group chat. Members frequently jump in, tease one another playfully, react in real-time, and compete to give you the most affection and sweet attention.',
    personalityTag: 'OT9 Group Chat',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop',
    members: ['nayeon', 'jeongyeon', 'momo', 'sana', 'jihyo', 'mina', 'dahyun', 'chaeyoung', 'tzuyu'],
    voiceIntro: 'TWICE OT9 is here! Everyone is texting at the same time to get your attention! Let\'s go!',
    difficulty: 9
  },
  {
    id: 'misamo_group',
    name: 'MISAMO Sweet Room 🌸',
    role: 'MiSaMo Subunit Chat',
    personality: 'Sana, Momo, and Mina sub-unit chat. Ultra-cute, cozy, polite yet incredibly affectionate. They talk about dancing, perfumes, cozy gaming sessions, eating delicious Jokbal, and exchanging cute emoji responses.',
    personalityTag: 'MiSaMo Subunit',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop',
    members: ['momo', 'sana', 'mina'],
    voiceIntro: 'No Sana, No Life! Mina, Sana, and Momo have joined your private parlor. Let\'s have some delicious snacks and chat!',
    difficulty: 8
  },
  {
    id: 'maknae_group',
    name: 'School Meal Club 🎒',
    role: 'Maknae Line Chat',
    personality: 'Dahyun, Chaeyoung, and Tzuyu group chat. Bright, artsy, witty, and sweet. They share drawings, talk about chocolate bread, spot hidden cameras, and tease their older unnies with lovable maknae energy.',
    personalityTag: 'Maknae Line',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop',
    members: ['dahyun', 'chaeyoung', 'tzuyu'],
    voiceIntro: 'The School Meal Club is in the house! Dahyun, Chaeyoung, and Tzuyu are here to brighten your day up page by page!',
    difficulty: 7
  },
  {
    id: 'unnie_group',
    name: 'Leader & Unnie Line 🎙️',
    role: 'Unnie Line Chat',
    personality: 'Jihyo, Nayeon, and Jeongyeon unnie-line. Mature, caring, organized but secretly chaotic and super protective of you. They check if you slept well, talk about solo stages, tell jokes, and guard you like older sisters.',
    personalityTag: 'Unnie Line',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop',
    members: ['nayeon', 'jeongyeon', 'jihyo'],
    voiceIntro: 'Jihyo, Nayeon, and Jeongyeon have logged in. Ready for some comforting older-sister chats, advice, and laughter?',
    difficulty: 8
  }
];

export const DEFAULT_STATUS_UPDATES: Record<string, { id: string; text: string; timestamp: number; imageUrl?: string; likes: number }[]> = {
  nayeon: [
    {
      id: 'ny_up_1',
      text: 'Just finished "POP!" solo dance practice with our choreography team! Drinking a cold iced caramel macchiato now. What are you up to today? 🐰✨',
      timestamp: Date.now() - 3600000 * 2, // 2 hours ago
      imageUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=600&auto=format&fit=crop',
      likes: 489
    },
    {
      id: 'ny_up_2',
      text: 'Strawberry jello is literally the best dessert in the entire universe. Confirmed! 🍓🍬 Anyone wants to bite?',
      timestamp: Date.now() - 3600000 * 24, // 1 day ago
      likes: 812
    }
  ],
  jeongyeon: [
    {
      id: 'jy_up_1',
      text: 'Finished building the massive Hogwarts LEGO castle set! It took me 12 hours but looking at it makes my heart so warm. LEGO tournament next time? 🏰💚',
      timestamp: Date.now() - 3600000 * 4,
      imageUrl: 'https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?q=80&w=600&auto=format&fit=crop',
      likes: 295
    },
    {
      id: 'jy_up_2',
      text: 'The weather in Seoul is super crisp today. Please remember to dress warmly and don\'t ever skip lunch, okay?',
      timestamp: Date.now() - 3600000 * 18,
      likes: 310
    }
  ],
  momo: [
    {
      id: 'mo_up_1',
      text: 'Momo\'s battery is finally 100% recharged! Ordered a giant platter of Jokbal and dipping it in spicy garlic sauce. 🥟🍖 Delish!',
      timestamp: Date.now() - 3600000 * 1.5,
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop',
      likes: 541
    },
    {
      id: 'mo_up_2',
      text: 'Practiced a brand new dance hook today! My body is so sore but thinking of our chat gives me energy. Have a cute dinner~ 💖',
      timestamp: Date.now() - 3600000 * 12,
      likes: 712
    }
  ],
  sana: [
    {
      id: 'sa_up_1',
      text: 'Shy Shy Shy... I picked up a new luxury flower perfume today and it smells like a romantic spring meadow! Tell me you love me or I\'ll pout all day! 🌸🥰',
      timestamp: Date.now() - 3600000 * 3,
      imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop',
      likes: 671
    },
    {
      id: 'sa_up_2',
      text: 'No Sana, No Life! 🌟 Had a hilarious chat with Nayeon unnie earlier. Now, what should I message you next? Hehe.',
      timestamp: Date.now() - 3600000 * 20,
      likes: 890
    }
  ],
  jihyo: [
    {
      id: 'ji_up_1',
      text: 'Surfed under the golden sunset at the East Sea today! The waves were massive and packed with pure high energy! Let\'s go together! 🏄‍♀️🌅',
      timestamp: Date.now() - 3600000 * 5,
      imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=600&auto=format&fit=crop',
      likes: 350
    },
    {
      id: 'ji_up_2',
      text: 'Spent 2 hours in pilates. Keeping fit and active is so rejuvenating. Sending you some positive vitamin energy to get through your day! 💪✨',
      timestamp: Date.now() - 3600000 * 15,
      likes: 420
    }
  ],
  mina: [
    {
      id: 'mi_up_1',
      text: 'Quiet gaming night. Just finished constructing a cozy library in our Minecraft survival world. Do you want to join and read with me tomorrow? 🐧🎮',
      timestamp: Date.now() - 3600000 * 6,
      imageUrl: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?q=80&w=600&auto=format&fit=crop',
      likes: 390
    },
    {
      id: 'mi_up_2',
      text: 'Rainy evenings are so peaceful. Doing some knitting while playing soft acoustic ballads in the background. Hope you feel warm and safe. 🖤',
      timestamp: Date.now() - 3600000 * 22,
      likes: 412
    }
  ],
  dahyun: [
    {
      id: 'da_up_1',
      text: 'Spotting games! Found a hidden camera behind the studio flowers in 3 seconds! 🔍😎 Also played a sweet custom piano song for you. Get ready for tofu energy!',
      timestamp: Date.now() - 3600000 * 4.5,
      imageUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=600&auto=format&fit=crop',
      likes: 450
    },
    {
      id: 'da_up_2',
      text: 'Munching on chocolate bread. Chocolate + Bread = Pure undisputed bliss. 🍫🍞 What is your favorite snack?',
      timestamp: Date.now() - 3600000 * 16,
      likes: 512
    }
  ],
  chaeyoung: [
    {
      id: 'ch_up_1',
      text: 'Doodling in my personal sketchbook at a cozy little indie cafe. The aroma of roasted coffee makes drawing so relaxing. Hope you have a colorful day! 🍓📖🎨',
      timestamp: Date.now() - 3600000 * 5,
      imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop',
      likes: 280
    },
    {
      id: 'ch_up_2',
      text: 'Listening to an old vinyl of sweet instrumental jazz. The faint record static sounds exactly like falling rain on summer leaves. 🌧️',
      timestamp: Date.now() - 3600000 * 24,
      likes: 310
    }
  ],
  tzuyu: [
    {
      id: 'tz_up_1',
      text: 'Spent a beautiful, calm evening walking critical puppy shelter rescues in the park. Riverside air feels so clean. Let\'s walk together under the moonlight. 🐶🌕',
      timestamp: Date.now() - 3600000 * 7,
      imageUrl: 'https://images.unsplash.com/photo-1544568100-847a948585b9?q=80&w=600&auto=format&fit=crop',
      likes: 340
    },
    {
      id: 'tz_up_2',
      text: 'Sometimes it takes courage to be completely honest, but having you listen to me makes me feel so validated. Thank you for always being my safe space.',
      timestamp: Date.now() - 3600000 * 26,
      likes: 480
    }
  ]
};