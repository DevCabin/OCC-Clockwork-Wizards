// NerdyMugs Configuration
// Swap this file to change the entire content machine

export const siteConfig = {
  name: "NerdyMugs",
  tagline: "Coffee Mugs for Nerds",
  affiliateId: "georgwebsi-20",
};

export const voiceConfig = {
  tone: ["witty", "clever", "warm", "nerdy"],
  never: ["generic", "salesy", "cringe", "basic", "bland"],
  sampleLines: [
    "Spock would call this mug 'fascinating.' We call it Tuesday.",
    "This mug has more force than Anakin's midichlorian count.",
  ],
};

export const audienceConfig = {
  description: "Self-aware nerds, geeks, and pop-culture addicts who drink too much coffee and own it proudly.",
};

export const scheduleConfig = {
  postsPerDay: 3,
  quietDays: ["Sunday"],
};

export interface CategoryConfig {
  name: string;
  weight: number;
  searchTerms: string[];
  tags: string[];
  triviaHooks: string[];
}

export const categoriesConfig: CategoryConfig[] = [
  {
    name: "Star Trek",
    weight: 3,
    searchTerms: ["star trek mug", "spock mug", "enterprise coffee mug"],
    tags: ["kirk", "spock", "picard", "boldly go", "trekkie"],
    triviaHooks: ["character quotes", "episode references", "behind the scenes"],
  },
  {
    name: "Star Wars",
    weight: 3,
    searchTerms: ["star wars mug", "darth vader mug", "yoda coffee mug"],
    tags: ["jedi", "sith", "mandalorian", "lightsaber", "force"],
    triviaHooks: ["film trivia", "character lore", "fan theories"],
  },
  {
    name: "Retro Gaming",
    weight: 2,
    searchTerms: ["retro gaming mug", "nintendo coffee mug", "pixel art mug"],
    tags: ["mario", "zelda", "pac-man", "8bit", "nostalgia"],
    triviaHooks: ["speedrun facts", "easter eggs", "dev stories"],
  },
  {
    name: "Marvel",
    weight: 2,
    searchTerms: ["marvel mug", "avengers coffee mug", "spiderman mug"],
    tags: ["avengers", "spidey", "wolverine", "deadpool"],
    triviaHooks: ["comic origins", "MCU vs comics", "creator stories"],
  },
];

export const rotationConfig = {
  strategy: "weighted_random" as const,
  noSameCategoryTwiceInADay: true,
  maxSameCategoryPerWeek: 5,
};

export const contentRulesConfig = {
  titleMaxChars: 80,
  captionMaxChars: 160,
  descriptionMinWords: 80,
  descriptionMaxWords: 250,
  mustInclude: ["one trivia fact", "one character reference"],
  alwaysEndWith: "call to action with personality",
};

// Trivia database by category
export const triviaDatabase: Record<string, string[]> = {
  "Star Trek": [
    "Leonard Nimoy originally didn't want to play Spock—he was worried about being typecast as an alien for life.",
    "The Vulcan salute was invented on the spot by Leonard Nimoy, based on a Jewish blessing gesture he saw as a child.",
    "Patrick Stewart was so convinced TNG would fail, he didn't unpack his suitcase for the first six weeks.",
    "William Shatner sold his kidney stone for $25,000 to benefit Habitat for Humanity.",
    "The original Enterprise model is on display at the Smithsonian—it's 11 feet long and took 1,200 hours to build.",
    "Gene Roddenberry pitched Star Trek as 'Wagon Train to the stars' to skeptical NBC executives.",
    "DeForest Kelley was originally offered the role of Spock before being cast as Dr. McCoy.",
  ],
  "Star Wars": [
    "Yoda was almost played by a monkey wearing a mask. Thank the Force for puppeteers.",
    "The sound of a lightsaber is a combination of a film projector hum and TV static.",
    "Harrison Ford was carpentrying for George Lucas when he got the Han Solo audition.",
    "Darth Vader's breathing was recorded by Ben Burtt using a scuba regulator.",
    "The Millennium Falcon's shape was inspired by a half-eaten hamburger.",
    "Alec Guinness hated Star Wars and called it 'fairy-tale rubbish'—but took 2% of the gross.",
    "The word 'Ewok' is never spoken in Return of the Jedi.",
  ],
  "Retro Gaming": [
    "Super Mario Bros. was designed to fit on a 256-kilobit cartridge—smaller than a single modern photo.",
    "The Konami Code was created by Kazuhisa Hashimoto because he couldn't beat his own game.",
    "Pac-Man was originally called Puck-Man in Japan, but changed for the US to prevent vandalism.",
    "The Legend of Zelda was the first console game with a save feature.",
    "Tetris was created by a Soviet computer scientist in his spare time.",
    "Sonic was designed to be faster than Mario after Sega conducted focus groups with kids.",
    "The original Donkey Kong was Nintendo's first real hit—before that, they made playing cards.",
  ],
  "Marvel": [
    "Stan Lee created the X-Men as a lazy way to explain superpowers—mutation covers everything.",
    "Wolverine was originally supposed to be an actual wolverine mutated into human form.",
    "Spider-Man's web-shooters were mechanical because Stan Lee thought a radioactive spider giving organic webs was too gross.",
    "Deadpool was created as a Deathstroke parody and shares the same real name: Wade Wilson.",
    "Iron Man was created in a bet—Stan Lee dared to make a character that everyone should hate.",
    "The Hulk was originally gray, but printing issues made him green.",
    "Captain America's shield is made of vibranium, but the formula was never replicated.",
  ],
};

// Video suggestions by category
export const videoSuggestions: Record<string, string[]> = {
  "Star Trek": [
    "Search YouTube for: 'Every Star Trek opening ranked'",
    "Search YouTube for: 'Best Spock moments compilation'",
    "Search YouTube for: 'Star Trek behind the scenes documentary'",
    "Search YouTube for: 'Why Deep Space Nine is secretly the best Trek'",
  ],
  "Star Wars": [
    "Search YouTube for: 'Star Wars prequels revisited'",
    "Search YouTube for: 'The making of The Empire Strikes Back'",
    "Search YouTube for: 'Why the sequels missed the point'",
    "Search YouTube for: 'Mandalorian season breakdown'",
  ],
  "Retro Gaming": [
    "Search YouTube for: 'World record speedrun Super Mario Bros'",
    "Search YouTube for: 'Hidden secrets in classic Nintendo games'",
    "Search YouTube for: 'Evolution of Zelda dungeons'",
    "Search YouTube for: 'Why retro games are harder than modern games'",
  ],
  "Marvel": [
    "Search YouTube for: 'MCU timeline explained'",
    "Search YouTube for: 'Comic book origins vs movies'",
    "Search YouTube for: 'Stan Lee cameo compilation'",
    "Search YouTube for: 'What if the MCU had started in the 90s'",
  ],
};

// YouTube channel suggestions by category
export const channelSuggestions: Record<string, string[]> = {
  "Star Trek": ["Trekyards", "EC Henry", "The 7th Rule", "Mission Log"],
  "Star Wars": ["Star Wars Theory", "HelloGreedo", "Eckhart's Ladder", "The Stupendous Wave"],
  "Retro Gaming": ["Scott The Woz", "Gaming Historian", "MetalJesusRocks", "Stop Skeletons From Fighting"],
  "Marvel": ["New Rockstars", "ComicBookCast2", "Emergency Awesome", "The Cosmic Wonder"],
};
