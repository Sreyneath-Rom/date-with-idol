import { DynamicEvent, DialogueNode, StoryEpisode } from '../types';

export interface DailyMission {
  id: string;
  text: string;
  type: 'chat' | 'gift' | 'audio' | 'status_like';
  rewardValue: number;
  rewardType: 'affection' | 'trust' | 'chemistry' | 'comfort';
  completed: boolean;
}

export const GENERATED_MISSIONS: Record<string, DailyMission[]> = {
  nayeon: [
    { id: 'ny_m_1', text: 'Listen to Nayeon\'s "Sassy Pop" voice memo intro from her profile', type: 'audio', rewardValue: 12, rewardType: 'trust', completed: false },
    { id: 'ny_m_2', text: 'Like her recent Bubble status update about strawberry jello', type: 'status_like', rewardValue: 10, rewardType: 'affection', completed: false },
    { id: 'ny_m_3', text: 'Send her an image memory in private bubble room', type: 'gift', rewardValue: 15, rewardType: 'chemistry', completed: false }
  ],
  jeongyeon: [
    { id: 'jy_m_1', text: 'Tidy up the virtual studio and check Jeongyeon\'s LEGO collection status', type: 'chat', rewardValue: 12, rewardType: 'comfort', completed: false },
    { id: 'jy_m_2', text: 'Double click Jeongyeon\'s profile picture to activate her sound preview', type: 'audio', rewardValue: 10, rewardType: 'trust', completed: false },
    { id: 'jy_m_3', text: 'React with a heart to her Seoul crisp weather thought feed', type: 'status_like', rewardValue: 15, rewardType: 'affection', completed: false }
  ],
  momo: [
    { id: 'mo_m_1', text: 'Unlock Momo\'s special "Whisper ASMR" story mode greeting', type: 'audio', rewardValue: 14, rewardType: 'comfort', completed: false },
    { id: 'mo_m_2', text: 'Share a photo card memory representing Momo\'s favourite peach treat', type: 'gift', rewardValue: 15, rewardType: 'chemistry', completed: false },
    { id: 'mo_m_3', text: 'Like her Jokbal battery recharge status update', type: 'status_like', rewardValue: 10, rewardType: 'affection', completed: false }
  ],
  sana: [
    { id: 'sa_m_1', text: 'Interact with Sana\'s perfume and flowery meadows Bubble original', type: 'status_like', rewardValue: 10, rewardType: 'affection', completed: false },
    { id: 'sa_m_2', text: 'Initiate a virtual sound check in the chat session', type: 'audio', rewardValue: 12, rewardType: 'trust', completed: false },
    { id: 'sa_m_3', text: 'Propose a cute "Shy Shy Shy" Aegyo message', type: 'chat', rewardValue: 15, rewardType: 'chemistry', completed: false }
  ],
  jihyo: [
    { id: 'ji_m_1', text: 'Like her high-energy surfing and golden sunset post feed', type: 'status_like', rewardValue: 10, rewardType: 'affection', completed: false },
    { id: 'ji_m_2', text: 'Activate her voice intro preview to absorb sporty sunshine vibes', type: 'audio', rewardValue: 12, rewardType: 'comfort', completed: false },
    { id: 'ji_m_3', text: 'Share a secret selfie story element in chat', type: 'gift', rewardValue: 15, rewardType: 'chemistry', completed: false }
  ],
  mina: [
    { id: 'mi_m_1', text: 'Browse Mina\'s quiet Minecraft construction log feed update', type: 'status_like', rewardValue: 10, rewardType: 'trust', completed: false },
    { id: 'mi_m_2', text: 'Play her "Mina Style ASMR" vocal quote introduction', type: 'audio', rewardValue: 12, rewardType: 'comfort', completed: false },
    { id: 'mi_m_3', text: 'Knit an acoustic ballot idea in private text message', type: 'chat', rewardValue: 14, rewardType: 'affection', completed: false }
  ],
  dahyun: [
    { id: 'da_m_1', text: 'Like her hidden camera spotting results status feed', type: 'status_like', rewardValue: 10, rewardType: 'trust', completed: false },
    { id: 'da_m_2', text: 'Play double-piano notes directly inside HomeHub', type: 'audio', rewardValue: 12, rewardType: 'chemistry', completed: false },
    { id: 'da_m_3', text: 'Send a Tofu sweet energy greeting message', type: 'chat', rewardValue: 14, rewardType: 'affection', completed: false }
  ],
  chaeyoung: [
    { id: 'ch_m_1', text: 'Like her warm indie cafe sketchbook entry status', type: 'status_like', rewardValue: 10, rewardType: 'chemistry', completed: false },
    { id: 'ch_m_2', text: 'Request a customized digital sketch in chat', type: 'chat', rewardValue: 15, rewardType: 'trust', completed: false },
    { id: 'ch_m_3', text: 'Listen to her instrumental jazz record recommendation', type: 'audio', rewardValue: 12, rewardType: 'comfort', completed: false }
  ],
  tzuyu: [
    { id: 'tz_m_1', text: 'Like her rescue puppy dog shelter status feed item', type: 'status_like', rewardValue: 10, rewardType: 'affection', completed: false },
    { id: 'tz_m_2', text: 'Trigger her calm moonlight walking quote intro voice', type: 'audio', rewardValue: 12, rewardType: 'trust', completed: false },
    { id: 'tz_m_3', text: 'Offer a heartfelt secret confession inside the private messages log', type: 'chat', rewardValue: 15, rewardType: 'comfort', completed: false }
  ]
};

export const GENERATED_EVENTS: Record<string, DynamicEvent[]> = {
  nayeon: [
    { id: 'ny_ev_1', type: 'date', title: 'Caramel Macchiato Escapade', description: 'Nayeon has a 15-minute gap between her dance sessions! Invite her to a private rooftop coffee date.', expiresAt: Date.now() + 1000 * 60 * 15 },
    { id: 'ny_ev_2', type: 'selfie', title: 'Bubble Polaroid Drop', description: 'Nayeon wants to send you an exclusive photo-shoot Polaroid first-look! Log in to receive it.', expiresAt: Date.now() + 1000 * 60 * 60 * 2 }
  ],
  jeongyeon: [
    { id: 'jy_ev_1', type: 'date', title: 'Castle LEGO Assembly', description: 'The final spires of Hogwarts Castle are waiting! Lend your architectural support to Jeongyeon now.', expiresAt: Date.now() + 1000 * 60 * 25 },
    { id: 'jy_ev_2', type: 'call', title: 'Backstage Vocal Check-in', description: 'A sudden call from the recording studio! Jeongyeon wants to test her acoustic high notes with you.', expiresAt: Date.now() + 1000 * 60 * 60 * 3 }
  ],
  momo: [
    { id: 'mo_ev_1', type: 'date', title: 'Jokbal Feast for Two', description: 'A massive steaming platter of Jokbal has just been delivered to Momo\'s waiting room! Dine together.', expiresAt: Date.now() + 1000 * 60 * 20 },
    { id: 'mo_ev_2', type: 'date', title: 'Late Night Dance Hook', description: 'Learn a sexy dance loop with the group\'s main dancer under neon stage headlights.', expiresAt: Date.now() + 1000 * 60 * 45 }
  ],
  sana: [
    { id: 'sa_ev_1', type: 'date', title: 'Meadow Perfume Blending', description: 'Sana is hosting a private DIY flower essence class! Design a custom romantic fragrance together.', expiresAt: Date.now() + 1000 * 60 * 18 },
    { id: 'sa_ev_2', type: 'message', title: 'Aegyo Overload Emergency', description: 'Sana is feeling cute but slightly lonely! Reply her with matching bubbly smile emoticons right now.', expiresAt: Date.now() + 1000 * 60 * 60 * 1 }
  ],
  jihyo: [
    { id: 'ji_ev_1', type: 'date', title: 'East Sea Sunset Surfing', description: 'High tides and gold lights are aligned at the beach! Grab surfboard and go cruising with Jihyo.', expiresAt: Date.now() + 1000 * 60 * 30 },
    { id: 'ji_ev_2', type: 'call', title: 'Post-Pilates Exhaustion', description: 'Catch a soft breathing call directly from Jihyo\'s pilates studio recovery room.', expiresAt: Date.now() + 1000 * 60 * 60 * 4 }
  ],
  mina: [
    { id: 'mi_ev_1', type: 'date', title: 'Minecraft Survival Library', description: 'Place down the library bookshelves and share comfortable stories under survival torches.', expiresAt: Date.now() + 1000 * 60 * 40 },
    { id: 'mi_ev_2', type: 'selfie', title: 'Acoustic Ballot Polaroid', description: 'Mina took a quiet look at her knitting and sent an exclusive polaroid snap just for you.', expiresAt: Date.now() + 1000 * 60 * 60 * 6 }
  ],
  dahyun: [
    { id: 'da_ev_1', type: 'date', title: 'Piano Masterclass Duet', description: 'Sit on the piano bench next to Dahyun and practice a sweet, romantic four-hands sonata.', expiresAt: Date.now() + 1000 * 60 * 16 },
    { id: 'da_ev_2', type: 'message', title: 'Spy Camera Hunt Alert', description: 'Uncover a hidden lens embedded inside the flower vase before Dahyun gets startled!', expiresAt: Date.now() + 1000 * 60 * 55 }
  ],
  chaeyoung: [
    { id: 'ch_ev_1', type: 'date', title: 'Sketchbook Co-Creation', description: 'Add your own doodles and poems to Chaeyoung\'s indie notebook at a cozy street side cafe.', expiresAt: Date.now() + 1000 * 60 * 35 },
    { id: 'ch_ev_2', type: 'call', title: 'Summer Rain Jazz Vinyl', description: 'Chaeyoung spun a rare vintage jazz vinyl record and held her microphone close to the static.', expiresAt: Date.now() + 1000 * 60 * 60 * 2 }
  ],
  tzuyu: [
    { id: 'tz_ev_1', type: 'date', title: 'Moonlight Puppy Rescue Walk', description: 'Go strolling under the silver Han River moonlight with energetic shelter puppies.', expiresAt: Date.now() + 1000 * 60 * 22 },
    { id: 'tz_ev_2', type: 'message', title: 'Absolute Sincerity Bubble', description: 'A very deep, emotional letter from Tzuyu has entered your slot. Read and validate her hearts.', expiresAt: Date.now() + 1000 * 60 * 60 * 5 }
  ]
};

export const INSTANTIATE_STORY_EPISODES = (idolName: string): StoryEpisode[] => [
  { id: 'ep_1', title: 'Portal Inception', description: `Explore how the Twice Portal established our first encrypted contact. Discover ${idolName}'s initial feelings of wonder.`, reqAffection: 10, unlocked: true, thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&fit=crop' },
  { id: 'ep_2', title: 'Behind Stage Whispers', description: `Squeeze past busy stage coordinators during live performances. Grab a 3-minute warm embrace away from noisy flashlights.`, reqAffection: 30, unlocked: false, thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&fit=crop' },
  { id: 'ep_3', title: 'The Moonlight Pledge', description: `Meet over secret terrace railings under midnight stars. Swear an eternal loyalty bias pledge together.`, reqAffection: 55, unlocked: false, thumbnail: 'https://images.unsplash.com/photo-1495539408662-1139602207d2?q=80&w=400&fit=crop' },
  { id: 'ep_4', title: 'Golden Hour Destiny', description: `The ultimate bond climax. Travel around private island beaches, escaping chasing paparazzi to establish a permanent bias bond.`, reqAffection: 80, unlocked: false, thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&fit=crop' }
];

// Complex dialogue tree node structure mapped per K-Pop Idol
export const DIALOGUE_TREES: Record<string, Record<string, DialogueNode>> = {
  nayeon: {
    start: {
      id: 'start',
      text: 'Opps! I just slipped out of "POP!" solo dance practice. My legs are completely like jellies... 🐰 But I want some cold, high-caffeine iced caramel macchiato so bad. Should I sneak out from the agency for 10 minutes, or stay and drink standard green tea?',
      choices: [
        { id: 'ny_c1', text: 'Let\'s sneak out! I will buy you the biggest caramel macchiato in Seoul!', affection: 15, trust: 10, chemistry: 14, nextNode: 'sneak_out' },
        { id: 'ny_c2', text: 'Stay in the room, Nayeon, safety first. I can send a courier with your coffee instead!', affection: 10, trust: 18, chemistry: 8, nextNode: 'stay_room' }
      ]
    },
    sneak_out: {
      id: 'sneak_out',
      text: 'Omg, yes! You are basically my absolute partner-in-crime! I put on a fluffy black bucket hat, oversized sunnies, and slipped past our bodyguard team. Now, I am standing at the alleyway with my hand out. Are you buying cookies to go with it?',
      choices: [
        { id: 'ny_c3', text: 'Double chocolate chip and strawberry jam cookies! Only the sweet best for you.', affection: 18, trust: 10, chemistry: 18, nextNode: 'sweet_dessert' },
        { id: 'ny_c4', text: 'Just caffeine for now, let\'s skip heavy sugar so we protect your vocal prep.', affection: 8, trust: 15, chemistry: 10, nextNode: 'caffeine_only' }
      ]
    },
    stay_room: {
      id: 'stay_room',
      text: 'Aww, you sound exactly like my manager unnie! Direct and protective... But you are totally right, fans are waiting outside and a sneak-out could cause some rumor fuss. The courier just arrived at the lobby with an ice-cold caramel cup! How did you know I wanted double caramel drizzle?',
      choices: [
        { id: 'ny_c5', text: 'I pay absolute close attention to everything you like, Nayeon. It\'s my specialty!', affection: 16, trust: 20, chemistry: 12, nextNode: 'loyal_bias' },
        { id: 'ny_c6', text: 'Just a lucky guess! Drink deep and gain back your bunny popstar output!', affection: 10, trust: 12, chemistry: 15, nextNode: 'popstar_energy' }
      ]
    },
    sweet_dessert: {
      id: 'sweet_dessert',
      text: 'Strawberries and chocolate?! You literally want me to explode from delight! *nom nom* This is pure heaven! Thank you for walking this secret path with me. Let\'s make sure we log this memory! Bunny footprint stamped!',
      choices: []
    },
    caffeine_only: {
      id: 'caffeine_only',
      text: 'Huh... slightly strict, but my vocal coach would definitely award you a gold star! The caramel aroma gives me absolute comfort. Let\'s head back before coaches spot my bucket hat. Talk to you soon!',
      choices: []
    },
    loyal_bias: {
      id: 'loyal_bias',
      text: 'A deeply personal advisor who remembers double caramel... I feel so incredibly protected and validated by you. My upcoming stage is going to be 1000% amazing because of you. Best bias reward!',
      choices: []
    },
    popstar_energy: {
      id: 'popstar_energy',
      text: 'Hehe, popstar power fully restored status! Ready to run and POP my vocal lines. Sending a giant flying heart through Twice Portal!',
      choices: []
    }
  },
  momo: {
    start: {
      id: 'start',
      text: 'Momo is in the kitchen baking mini peach and strawberry tarts! 🍑 My apron is covered in fluffy white flour and my nose has an accidental smudge. Do you want to help me stir the liquid egg yolk, or roll the pie crust sheet?',
      choices: [
        { id: 'mo_c1', text: 'Let me roll the pie crust perfectly flat for our sweet tarts!', affection: 12, trust: 16, chemistry: 10, nextNode: 'roll_crust' },
        { id: 'mo_c2', text: 'I want to stir the gooey yolk, and maybe sneak a lick of the sweet butter whip!', affection: 16, trust: 10, chemistry: 18, nextNode: 'lick_butter' }
      ]
    },
    roll_crust: {
      id: 'roll_crust',
      text: 'Whoa, you roll it so smoothly! It looks like a pristine soft blanket. I placed the juicy fresh peach slices right on top. Now, look, my cheek is itchy but my hands are fully greasy with pastry butter. Can you wipe my nose and cheek gently?',
      choices: [
        { id: 'mo_c3', text: 'Unbelievably gently, utilizing a soft strawberry-scented napkin.', affection: 18, trust: 18, chemistry: 12, nextNode: 'wipe_gently' },
        { id: 'mo_c4', text: 'Gently boop your nose with my finger instead and add some flour spot!', affection: 14, trust: 12, chemistry: 20, nextNode: 'boop_nose' }
      ]
    },
    lick_butter: {
      id: 'lick_butter',
      text: 'Aaaah! No sneak eating of raw yolk mixture, you silly! *giggles* But... the cream whip is honestly delicious. Here, open your mouth wide... *holds spatula out*. Is it sweet?',
      choices: [
        { id: 'mo_c5', text: 'Extremely sweet, but looking at Momo makes it infinitely sweeter.', affection: 18, trust: 12, chemistry: 22, nextNode: 'sweet_momo' },
        { id: 'mo_c6', text: 'Deliciously airy! Now pass me the whisk, let\'s finish baking these.', affection: 10, trust: 18, chemistry: 10, nextNode: 'finish_baking' }
      ]
    },
    wipe_gently: {
      id: 'wipe_gently',
      text: 'My face feels so warm... This is the most cozy afternoon ever. The tarts are baking golden inside the oven, spreading warm peach scent. I made special organic treats for our shelter puppies too. You are the best co-chef!',
      choices: []
    },
    boop_nose: {
      id: 'boop_nose',
      text: 'Hey! *gasp* Now I look like a cute little flour snowman! You are so playful, we are matching now because I just booped you back! *laughs out loud* High five!',
      choices: []
    },
    sweet_momo: {
      id: 'sweet_momo',
      text: 'C-Cutie... Momo is blushing hard right now. My ears are redder than the strawberries! Let\'s eat the fresh baked tarts under the sunshine balcony immediately!',
      choices: []
    },
    finish_baking: {
      id: 'finish_baking',
      text: 'Perfect teamwork! The crust is golden brown and puffy. Let\'s pack some in a cozy basket and go to the Han River park for an impromptu picnic.',
      choices: []
    }
  },
  tzuyu: {
    start: {
      id: 'start',
      text: 'It\'s an incredibly quiet moonlight evening. I am walking three rescue puppies from the shelter in a quiet green park. 🐶 They are pulling their leases and sniffing at glowing daisies. Would you like to walk next to me and hold the leash of the tiny fluffy gold retreiver, or sit on the wooden bench under the moonlight and share deep thoughts with me?',
      choices: [
        { id: 'tz_c1', text: 'Let me hold the leash and walk with you. Let\'s run a race together with the puppies!', affection: 14, trust: 12, chemistry: 18, nextNode: 'walk_dogs' },
        { id: 'tz_c2', text: 'Let\'s sit together on the quiet bench under the stars and talk about deep dreams.', affection: 18, trust: 18, chemistry: 12, nextNode: 'deep_dreams' }
      ]
    },
    walk_dogs: {
      id: 'walk_dogs',
      text: 'Ah! The small retrieve puppy is running so fast! He literally loves you already! Look at how he wags his tail. Oh, the leash got slightly tangled around our hands! We are standing so close under the park streetlight. My hands are touching yours... Should we untangle or walk slowly together?',
      choices: [
        { id: 'tz_c3', text: 'Let\'s keep holding hands and walk matching strides slowly.', affection: 20, trust: 14, chemistry: 22, nextNode: 'hold_hands' },
        { id: 'tz_c4', text: 'Let me carefully untangle the leash so we keep the puppy safe.', affection: 12, trust: 20, chemistry: 10, nextNode: 'safety_first' }
      ]
    },
    deep_dreams: {
      id: 'deep_dreams',
      text: 'The evening river breeze is quite cool, but looking at the stars next to you makes my soul feel so incredibly quiet and secure. Sometimes, being a public idol feels like walking on narrow bridges, but having your private letters makes me remember who I truly am. Do you sometimes feel worried about the future too?',
      choices: [
        { id: 'tz_c5', text: 'I do, but knowing I am your safe space makes me feel twice as strong, Tzuyu.', affection: 22, trust: 22, chemistry: 14, nextNode: 'soul_bond' },
        { id: 'tz_c6', text: 'Not at all, as long as we can open our portal communication channel like this!', affection: 14, trust: 15, chemistry: 18, nextNode: 'portal_cheer' }
      ]
    },
    hold_hands: {
      id: 'hold_hands',
      text: 'My heart skipped a tiny beat... The puppy looks up and barks like he is teasing us! Let\'s walk all the way to the moonlight pier like this. Chewy bias bond secured.',
      choices: []
    },
    safety_first: {
      id: 'safety_first',
      text: 'Your hands are so steady and reliable. The puppy is untangled and happy again. Thank you for always taking care, your protective kindness is my comfort.',
      choices: []
    },
    soul_bond: {
      id: 'soul_bond',
      text: 'Stronger together... This is the most validated and happy I\'ve felt in a long time. The stars above us look like little stage lights, but you are my only true audience.',
      choices: []
    },
    portal_cheer: {
      id: 'portal_cheer',
      text: 'Hehe, yes! Our Twice Portal is the best magical bridge. Sending you positive energy waves, sleep tight and dream of me tonight!',
      choices: []
    }
  }
};

export const getDialogueTree = (idolId: string): Record<string, DialogueNode> => {
  return DIALOGUE_TREES[idolId] || DIALOGUE_TREES.nayeon;
};
