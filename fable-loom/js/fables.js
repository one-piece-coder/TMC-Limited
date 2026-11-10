/*
 * The Fable Loom — story engine.
 * Builds grand, fable-style tales from hand-written story parts:
 * a realm, a calamity, a flawed hero, escalating trials, a turning point,
 * a final guardian, a homecoming and a moral with a real-life lesson.
 * Every fable is reproducible from its seed and settings.
 */
(function (root) {
  'use strict';

  // ---------- Random numbers (seeded so a fable can be shared) ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rng, list) => list[Math.floor(rng() * list.length)];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const article = (word) => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
  const titleCase = (s) => s.split(' ').map(cap).join(' ');

  // ---------- The world ----------
  const CREATURES = [
    'fox', 'tortoise', 'lion', 'hare', 'owl', 'ant', 'crow', 'elephant', 'mouse',
    'wolf', 'stag', 'heron', 'badger', 'ox', 'sparrow', 'bear', 'lynx', 'tiger'
  ];

  const NAMES = [
    'Aldric', 'Bramblewick', 'Corvin', 'Dain', 'Elowen', 'Fennick', 'Galen', 'Halcyon',
    'Isolde', 'Juniper', 'Kestrel', 'Lorcan', 'Maelis', 'Nimbus', 'Orla', 'Peregrin',
    'Quillon', 'Rowan', 'Sable', 'Thistle', 'Ulric', 'Vesper', 'Wren', 'Yarrow', 'Zephyr'
  ];

  const COMPANION_TRAITS = [
    'quiet wisdom', 'unshakable loyalty', 'a gentle and patient heart',
    'a sharp mind and sharper eyes', 'steady, unshowy courage', 'endless good humor'
  ];

  const REALMS = [
    { name: 'the Kingdom of Ashvale', desc: 'a land of copper hills and singing rivers, ringed by mountains that wore crowns of eternal snow', landmark: 'the Obsidian Spire' },
    { name: 'the Evergreen Dominion', desc: 'an ancient forest so vast that its oldest trees remembered the birth of the moon', landmark: 'the Heartwood Throne' },
    { name: 'the Sunken Isles of Meridian', desc: 'a scattering of jeweled islands where the tides spoke in riddles', landmark: 'the Lighthouse of Nine Flames' },
    { name: 'the Golden Steppe of Orrin', desc: 'an endless sea of grass that rippled like a lion’s mane beneath a sky too wide to measure', landmark: 'the Standing Stones of Orrin' },
    { name: 'the Frostmarch', desc: 'a realm of glaciers and dancing northern lights, where even the wind wore armor of ice', landmark: 'the Citadel of Winter’s Breath' },
    { name: 'the Dunes of Kehar', desc: 'a desert of red gold where buried cities slept beneath the sand', landmark: 'the Sphinx-Gate of Kehar' },
    { name: 'the Cloudreach Highlands', desc: 'a country of cliffs so tall that eagles nested among the stars', landmark: 'the Bridge of Seven Winds' },
    { name: 'the Valley of Lanterns', desc: 'a misty valley where fireflies gathered in their millions to light the long nights', landmark: 'the Shrine of the Silver Willow' }
  ];

  const CALAMITIES = [
    { crisis: 'the great river had dried to a trickle of dust', prize: 'the Rain-Pearl', destination: 'the summit of Mount Ithar', resolution: 'the great river roared back to life, flooding the valleys with silver water' },
    { crisis: 'the sun had not risen for forty days and forty nights', prize: 'the Lantern of First Dawn', destination: 'the edge of the world, where the sky meets the sea', resolution: 'the sun rose in a blaze of gold for the first time in forty days' },
    { crisis: 'a creeping blight was turning every leaf and blade of grass to grey ash', prize: 'the Seed of the First Tree', destination: 'the Garden at the Heart of the Mountain', resolution: 'the grey ash bloomed into a sea of green' },
    { crisis: 'a winter without end had frozen the hearth of every den and burrow', prize: 'the Ember Crown', destination: 'the Forge of the Sleeping Titan', resolution: 'warmth flooded back into every hearth, and the ice wept itself into spring' },
    { crisis: 'the ancient Song that kept the land in harmony had fallen silent', prize: 'the Moonharp', destination: 'the Tower of Echoes beyond the Whispering Sea', resolution: 'the ancient Song rang out once more from every hill and hollow' },
    { crisis: 'the stars themselves had begun to fall from the sky, one by one', prize: 'the Starloom', destination: 'the Observatory of the Old Ones', resolution: 'the fallen stars rose back into their places in the heavens' },
    { crisis: 'a great sickness had settled over the young of every kind', prize: 'the Chalice of Evermere', destination: 'the hidden spring of Evermere', resolution: 'the young ones rose from their beds, healthy and strong' }
  ];

  const GUARDIANS = [
    { name: 'Vharos the Storm-Wyrm', desc: 'a serpent of thunderclouds whose scales crackled with lightning' },
    { name: 'the Hollow King', desc: 'a towering figure of bone and shadow who had not spoken to a living creature in a thousand years' },
    { name: 'Grimmaw the Stone Colossus', desc: 'a giant of living granite with moss for a beard and boulders for fists' },
    { name: 'the Sphinx of Many Questions', desc: 'a lioness as tall as a cathedral, with eyes like twin suns' },
    { name: 'the Weaver of Nightmares', desc: 'a spider as vast as a castle, whose silver webs could catch dreams' },
    { name: 'Ignar the Flame-Eagle', desc: 'a bird of living fire whose wingbeats scorched the clouds' }
  ];

  const ELDERS = [
    { text: 'Old Mother Willow, the oldest tree in all the land', kind: null },
    { text: 'the blind Oracle of the Moonwell', kind: null },
    { text: 'the Council of the Ancient Ones', kind: null },
    { text: 'Grandfather Tortoise, who had seen nine hundred winters', kind: 'tortoise' },
    { text: 'the White Stag, keeper of the old ways', kind: 'stag' },
    { text: 'the Owl-Sage of the high towers', kind: 'owl' }
  ];

  // ---------- Story parts shared by every lesson ----------
  const OPENINGS = [
    'Long ago, in the age when animals still spoke and the stars still listened, there lay {realm}, {realmDesc}.',
    'In the days before memory, when the mountains were young and the rivers were still learning their courses, there was a land called {realm}: {realmDesc}.',
    'Once upon a time, beyond the edges of every map, stretched {realm}, {realmDesc}.',
    'Hear now a tale the old ones tell, of {realm}, {realmDesc}.'
  ];

  const HERO_INTROS = [
    'At its heart rose {landmark}, and in its shadow lived {aKind} named {hero}.',
    'In the shadow of {landmark} there lived {aKind} named {hero}.'
  ];

  const CALLS = [
    'But dark times came to {realm}. {Crisis}, and every creature, great and small, despaired. At last {elder} summoned {hero} and spoke: \'Only {prize}, which lies at {destination}, can save us. The road is long and terrible, and many who have walked it never returned. Yet I believe you are the one who must go.\'',
    'One fateful morning, the creatures of {realm} awoke to find that {crisis}. {Elder} declared that only {prize}, hidden at {destination}, could undo the calamity. Many stepped back. By fate or by fortune, the task fell to {hero}.',
    'Then came the Year of Sorrow, when {crisis}. {Elder} gathered every creature beneath {landmark} and proclaimed that someone must journey to {destination} and bring back {prize}, or all would be lost. One by one, every eye turned to {hero}.'
  ];

  const COMPANIONS = [
    '{He} did not set out alone. With {him} went {cname}, {aCkind} of {ctrait}, who had been {his} friend since they were both small.',
    '{cname}, {aCkind} known for {ctrait}, insisted on coming along. \'Every road is shorter with a friend,\' {che} said, and would hear no argument.'
  ];

  const PERILS = [
    'Their first trial came at the Sea of Storms, where waves rose as tall as castles and lightning split the sky into a thousand burning pieces. For three days and three nights, {hero} and {cname} clung to a raft of driftwood while the ocean tried to swallow them whole. When at last they washed up on a black-sand shore, they were bruised and battered, but alive, and closer to their goal.',
    'First they had to cross the Ashen Peaks, where the mountains themselves breathed fire and rivers of molten stone carved glowing paths through the night. The heat was so fierce that the air shimmered and the ground cracked beneath their feet. But {hero} and {cname} pressed on, leaping from stone to stone above the burning rivers, until the fiery peaks lay behind them.',
    'Their road led first through the Forest of Endless Night, where no sunlight had fallen for a thousand years and strange eyes glimmered between the trees. Whispering voices called their names, begging them to leave the path. {hero} and {cname} walked side by side and never strayed, until at last a pale dawn broke through the canopy.',
    'Before them stretched the Desert of Mirages, where the sands shifted like a living sea and phantom oases shimmered on every horizon. Twice {hero} ran toward water that turned to dust the moment {he} reached it. But {cname} read the stars each night, and together they found the true path across the dunes.',
    'The Shattered Sky came first: a chain of floating islands drifting high above the clouds, joined only by bridges of ancient rope that swayed in winds strong enough to tear trees from the earth. {hero} crossed each bridge with {his} heart pounding, while far below the clouds churned like a hungry sea.',
    'Their first great trial was the Frozen Wastes, where blizzards howled like a thousand wolves and the cold was deep enough to freeze a breath in midair. {hero} and {cname} huddled together through the endless white nights, sharing every scrap of warmth, until the ice gave way to the first green shoots of a distant valley.'
  ];

  const GUARDIAN_INTROS = [
    'At last, after many weeks and many wounds, {hero} and {cname} reached {destination}. There, coiled around {prize}, waited {guardian}, {guardianDesc}.',
    'The final road ended at {destination}. The ground shook, the sky darkened, and before {prize} rose {guardian}, {guardianDesc}.'
  ];

  const ENDINGS = [
    '{hero} returned to {realm} carrying {prize}, and the moment it touched the land, {resolution}. The creatures sang {his} name from every hill and hollow. But {hero} knew that the greatest treasure {he} had brought home was not {prize} at all. It was the lesson {he} had learned along the way.',
    'When {hero} and {cname} came home, {resolution}. A great feast was held beneath {landmark}, and the tale of their journey was told for a hundred generations. Yet whenever the young ones asked {hero} about {his} greatest victory, {he} never spoke of {guardian}. {He} spoke instead of the day {he} changed.',
    'And so {prize} came home to {realm}, and {resolution}. {hero} lived out {his} days in peace and honor, a changed {kind}, and {cname} remained at {his} side until the very end.'
  ];

  // ---------- Lessons: the hero's flaw, the trials it causes, and the moral ----------
  const LESSONS = [
    {
      id: 'patience', name: 'Patience', flawAdj: 'Impatient',
      intro: '{hero} was the most impatient {kind} in all of {realm}. {He} gulped {his} meals, interrupted {his} elders, and rose before the sun only to complain that it was late. \'Why wait,\' {he} often said, \'when the world can be seized right now?\'',
      trial: 'On the seventh day they reached the Glass Marsh, where the ground was a thin crust of crystal over a bottomless mire. \'We must test each step,\' warned {cname}, tapping the surface slowly. But {hero} could not bear the delay. {He} bounded ahead, and the glass shattered beneath {him}. Only {cname}\'s desperate lunge saved {him} from sinking into the black depths forever. They lost a full day dragging themselves free, the very day {hero} had tried so hard to save.',
      darkest: 'Beyond the marsh rose the Door of Seasons, a great stone gate carved with the faces of spring, summer, autumn and winter. Across it ran a single line: I open only for those who wait. {hero} pounded on the door. {He} shouted at it, shoved it, and pried at it with stones until {his} strength gave out. The door did not move. As the night grew cold, {hero} slumped against the stone, defeated, and for the first time in {his} life {he} simply sat still.',
      turning: 'In that stillness, {he} noticed things {he} had never seen before: the way the moonlight crept slowly across the carvings, touching first winter\'s face, then spring\'s, then summer\'s. When the light reached autumn, a soft click echoed through the stone, and the door swung open. {hero} understood. The door had been waiting for {him} to stop rushing, so that it could show {him} the way.',
      climax: 'When the guardian rose before {him}, {hero} did not charge. {He} watched, and {he} waited. {He} saw that the creature\'s fury came in great waves, and that between each wave there was a single heartbeat of calm. {He} counted the waves, one, two, three, and in the stillness after the third {he} slipped past the guardian\'s reach and claimed {prize}. The guardian, who had defeated a hundred hasty heroes, bowed its great head. \'Many have come faster,\' it rumbled, \'but none have come wiser.\'',
      morals: [
        'Patience is the wisdom to act at the right moment.',
        'The swiftest path is not always the shortest one.'
      ],
      applications: [
        'When you feel the urge to rush a decision, like sending an angry message, making a big purchase, or quitting something hard, pause and give it a day. Many doors in life open only when the timing is right.',
        'Skills, careers and relationships grow in seasons. Keep showing up even when results are slow. The light reaches the lock eventually.'
      ]
    },
    {
      id: 'humility', name: 'Humility', flawAdj: 'Proud',
      intro: '{hero} was the strongest {kind} in {realm}, and {he} never let anyone forget it. {He} had won every contest, climbed every peak, and wore {his} victories like a golden cloak. \'I need no one\'s advice,\' {he} would declare, \'for there is nothing anyone could teach me.\'',
      trial: 'At the Bridge of Bones, an ancient, crumbling span over a canyon of howling winds, a little old beetle sat beside the path. \'Traveler,\' it chirped, \'the third plank is rotten. Step over it.\' {hero} laughed. \'Who are you to instruct me?\' {He} strode forward, and the third plank cracked like thunder. {He} dangled over the abyss until {cname} hauled {him} up, trembling, while the beetle simply shook its head.',
      darkest: 'At last they came to the Hall of Mirrors, where every reflection showed not a face but a heart. {cname} passed through easily. But when {hero} entered, the mirrors filled with an enormous, swollen likeness of {himself}, so large that it blocked every passage. The harder {he} pushed, the larger the reflection grew, until {he} was trapped in a prison made of {his} own pride.',
      turning: 'Exhausted, {hero} lowered {his} head and whispered words {he} had never spoken: \'I cannot do this alone. I was wrong.\' At once the great reflection shrank to {his} true size, no smaller and no larger, and a narrow path appeared. {He} walked out humbled, and {cname} noticed that {hero} now walked a little more lightly, as if a heavy crown had fallen from {his} head.',
      climax: 'The guardian looked down at {hero} with contempt. \'Another champion who thinks {himself} mightier than me?\' But {hero} only bowed. \'I am not mightier than you. I have come to ask, not to take. My people are suffering, and I would be grateful for your help.\' The guardian, who had crushed a thousand boasting warriors, fell silent in astonishment. No one had ever asked. Slowly, it stepped aside and offered {prize} freely.',
      morals: [
        'Pride builds walls; humility builds bridges.',
        'Whoever believes there is nothing left to learn has already stopped growing.'
      ],
      applications: [
        'Ask for help before you need rescuing. Seeking advice from a coworker, friend or mentor is a sign of strength.',
        'Listen to people regardless of their title or status. The most valuable warning can come from the least expected voice.'
      ]
    },
    {
      id: 'honesty', name: 'Honesty', flawAdj: 'Silver-Tongued',
      intro: '{hero} was the cleverest talker in all of {realm}. {He} could talk {his} way out of any trouble and into any feast, and when the truth was inconvenient, {he} simply polished it into something shinier. \'A little lie,\' {he} often said with a wink, \'never hurt anyone.\'',
      trial: 'At the Toll-Gate of the River Folk, the otters demanded to know why the travelers sought passage. Rather than speak plainly, {hero} spun a grand tale: {he} was royalty from a distant land, carrying gold for their queen. The otters let them pass with bows and cheers. But word travels quickly on the river, and when the lie was discovered, the River Folk cut the ropes of every ferry, leaving {hero} and {cname} stranded on the far bank with no way home.',
      darkest: 'Deeper in the wilds stood the Truthwood, a forest whose trees could hear every word spoken beneath them. With every lie the branches tightened, and with every truth they parted. Out of long habit, {hero} told {cname} that {he} was not afraid, that {he} knew the way, that all was well. With each falsehood the branches wove tighter, until the two friends were sealed inside a cage of living wood and the air itself grew thin.',
      turning: 'In the darkness, {cname} asked softly, \'Do you really know the way?\' And {hero}, perhaps for the first time, told the whole truth. \'No. I am lost. I am frightened. And I lied to the River Folk, which is why we cannot go home.\' The branches sighed and drew back, and moonlight spilled through. {hero} felt lighter than {he} had in years, as though each lie had been a stone {he} had carried without knowing it.',
      climax: 'The guardian could see into the heart of every creature that approached, and it had devoured every liar who had ever stood before it. \'Why have you come?\' it thundered. {hero} did not flatter it or invent a tale. {He} said simply, \'I have come because my home is dying, and I need {prize} to save it. I have made mistakes on this journey, and I will not hide them from you.\' The guardian\'s eyes glowed with something like respect. \'Truth,\' it said, \'is the only key I have ever accepted.\'',
      morals: [
        'A lie may carry you across the river, but only the truth can bring you home.',
        'Trust is built on honesty, and once it cracks, it is slow to mend.'
      ],
      applications: [
        'When you make a mistake at work or at home, own it early and plainly. People forgive errors far more readily than they forgive cover-ups.',
        'Small exaggerations add up. Being someone whose word can be relied on is one of the most valuable reputations you can build.'
      ]
    },
    {
      id: 'courage', name: 'Courage', flawAdj: 'Timid',
      intro: '{hero} was the most timid {kind} in all of {realm}. {He} jumped at falling leaves, hid from thunderstorms, and had never once ventured past the edge of {his} own meadow. Yet {his} heart was kind, and kindness is often where bravery begins to grow.',
      trial: 'At the Caverns of Echoing Dread, every sound returned a hundredfold louder, and every shadow seemed to reach out with long, grasping fingers. {hero} froze at the entrance, shaking from head to tail. \'I can\'t,\' {he} whispered. \'Then we\'ll go slowly,\' said {cname}, \'one step at a time.\' They took one step, and then another. The shadows howled, but they did not bite.',
      darkest: 'At the heart of the cavern the ground gave way, and {cname} tumbled into a pit where a nest of shadow-serpents coiled and hissed. {hero} stood at the edge, every instinct screaming at {him} to run back to the safety of {his} meadow and never leave again. {He} turned. {He} took one step away. And then {he} heard {cname} call {his} name.',
      turning: '{hero} realized that courage did not mean feeling no fear. It meant feeling all of it and walking through anyway. With {his} heart pounding like a war drum, {he} leapt into the pit, swinging a burning branch to drive back the serpents, and pulled {cname} to safety. When they climbed out, {hero} was still shaking. But {he} was no longer the same creature who had entered the caves.',
      climax: 'When the guardian rose before {him}, the old terror flooded back, stronger than ever. {His} knees trembled and {his} voice cracked. But {he} did not run. {He} stepped forward, step by trembling step, until {he} stood at the guardian\'s very feet. \'I am afraid of you,\' {he} said. \'But I am more afraid of what will happen to my home if I turn back.\' The guardian had sent fearless warriors fleeing by the hundred. But a creature who was terrified and came anyway was a true hero. It lowered {prize} gently before {him}.',
      morals: [
        'Courage is deciding that something matters more than your fear.',
        'Every great journey begins with a single frightened step.'
      ],
      applications: [
        'The job interview, the difficult conversation, the new class, the first day of anything: you do not have to stop being scared to begin. Take one step, then the next.',
        'When fear tells you to turn back, ask what you stand to lose by not trying. That answer is often the courage you need.'
      ]
    },
    {
      id: 'perseverance', name: 'Perseverance', flawAdj: 'Fickle',
      intro: '{hero} was {aKind} of many beginnings and very few endings. {He} had started a great burrow and abandoned it when the wind blew, begun to learn the old songs and quit at the third verse, and set out to cross the hills only to turn back at the first steep slope. \'If it\'s hard,\' {he} reasoned, \'it must not be meant for me.\'',
      trial: 'The Mountain of a Thousand Steps rose before them, its stairway carved into the cliff face and vanishing into the clouds. By the hundredth step, {hero} was aching. By the three-hundredth, {he} sat down and declared the quest impossible. \'Then rest,\' said {cname}, \'but don\'t go down.\' {hero} grumbled, but {he} rested, and then rose, and climbed one more step. And then one more.',
      darkest: 'Near the summit, a terrible avalanche thundered down the mountain and buried the stair, and all their progress, beneath a wall of ice and stone. Days of climbing were undone in an instant. {hero} stared at the ruin and heard every old voice inside {him} at once: You see? It was never meant for you. Go home. {He} turned to {cname}, ready to give up for good.',
      turning: 'But below them, {hero} spotted an old mountain goat chipping a new path through the ice, one patient strike at a time. \'How long have you been at it?\' {hero} asked. \'Forty years,\' said the goat. \'The mountain throws down avalanches, and I keep climbing. One of us will tire first, and it won\'t be me.\' Something in {hero} took root. {He} picked up a stone and began to dig. It took eleven days. {He} did not stop.',
      climax: 'The guardian set before {hero} not one trial but a hundred: walls of fire, floods of black water, storms of razor hail. Each time {hero} fell, {he} rose again. Each time {he} was thrown back, {he} returned. At last the guardian itself grew weary. \'Why do you not give up?\' it roared. \'Because,\' said {hero}, rising for the hundredth time, \'I have given up on enough things in my life. I will not give up on this one.\' Astonished, the guardian surrendered {prize}.',
      morals: [
        'A mountain is climbed in a thousand stubborn steps, never in a single leap.',
        'Falling down is not failure. Refusing to rise again is.'
      ],
      applications: [
        'When a setback undoes your progress, like a failed exam, a rejected application or a broken habit, treat it as a detour and start again from where you stand.',
        'Big goals are won through small, steady efforts. Commit to the next step, not the whole mountain.'
      ]
    },
    {
      id: 'kindness', name: 'Kindness', flawAdj: 'Cold-Hearted',
      intro: '{hero} was {aKind} of great ambition and little warmth. {He} had no time for anyone smaller or weaker than {himself}. When a fledgling fell from its nest, {hero} stepped over it. When a lost duckling begged for directions, {hero} looked away. \'The world rewards the strong,\' {he} would say. \'Why waste a moment on the weak?\'',
      trial: 'On the road through the Thornwild, they came upon a tiny moth tangled in a spider\'s web, its wings beating weakly. {cname} paused to free it. \'Leave it,\' snapped {hero}. \'We have no time for such things.\' But {cname} freed the moth anyway, and it fluttered off into the brambles. {hero} rolled {his} eyes and marched on, thinking no more of it.',
      darkest: 'That night the Thornwild closed around them: a maze of black brambles with no path in or out, where every direction led back to the same clearing. Hours turned to days. Their food ran out, and their hope with it. {hero}, who had always believed that strength alone could solve anything, slashed at the thorns until {he} was bloodied and exhausted, and still the maze held them fast.',
      turning: 'Then a soft glow appeared in the darkness. It was the little moth, leading a cloud of a thousand moths whose wings shimmered like stars. They knew every hidden passage of the Thornwild and guided the travelers out by dawn. \'You saved one of us,\' the moth said to {cname}. Then it turned to {hero}. \'And we save even those who would not save us.\' {hero} had no words. For the first time {he} felt shame, and beneath it something warmer.',
      climax: 'When they reached the guardian, they found it wounded, an ancient spear lodged deep in its side from some long-forgotten battle. It snarled at them in pain. The old {hero} would have struck while it was weak. Instead, {hero} approached slowly, drew out the spear with great care, and bound the wound with moss and cloth. The guardian looked at {him} with shining eyes. \'For a thousand years, heroes have come to take from me,\' it said. \'You are the first who came to give.\' And it placed {prize} gently at {his} feet.',
      morals: [
        'No act of kindness, however small, is ever wasted.',
        'True strength is measured by how we treat those who can do nothing for us.'
      ],
      applications: [
        'Hold the door, learn the name of the person who cleans your office, help the new colleague find their way. Small kindnesses ripple outward in ways you may never see.',
        'Treat everyone with respect because of who you want to be, not because of what they can do for you.'
      ]
    },
    {
      id: 'teamwork', name: 'Teamwork', flawAdj: 'Solitary',
      intro: '{hero} was {aKind} who did everything alone. {He} hunted alone, built alone, and celebrated {his} victories alone. \'Others only slow me down,\' {he} declared. \'A team is just a crowd of people waiting to disappoint you.\'',
      trial: 'At the River of Roaring Rapids, {cname} suggested they build a raft together. {hero} scoffed and tried to leap across the stones alone. {He} made it halfway before the current swept {him} off {his} feet and dragged {him} downstream. {He} washed up hours later, battered and half-drowned, to find that {cname} had calmly crossed on a raft of woven reeds and was waiting by a fire.',
      darkest: 'Beyond the river stood the Gate of Three Locks, each keyhole set so far from the others that no single creature could ever reach them all at once. {hero} tried for a day and a night, stretching, leaping and cursing, until {he} collapsed in the dust. Whoever had built the gate knew a truth that {hero} had spent {his} whole life refusing to learn.',
      turning: 'Sitting in the dust, {hero} at last turned to {cname} and said very quietly, \'I can\'t do this by myself.\' Together they called on the creatures of the nearby woods: a family of squirrels, a stubborn old goat and a pair of nimble lizards. With a helper at every lock, the gate swung open with a sound like a great sigh. {hero} looked around at the cheering band of strangers who were strangers no longer, and felt something {he} had never felt alone. {He} belonged.',
      climax: 'The guardian was too vast and too powerful for any single hero. But {hero} no longer stood alone. While {cname} drew the guardian\'s eye to the left, the squirrels raced up its back, the goat butted against its legs, and the lizards darted between its claws. In the confusion, {hero} reached {prize}. When the guardian finally saw them all working as one, it laughed, a sound like an earthquake. \'At last,\' it said, \'a hero who understands that no one is great alone.\'',
      morals: [
        'Alone we can do so little; together we can do so much.',
        'The strongest chain is made of many links, each holding the others up.'
      ],
      applications: [
        'At work, at school or at home, share the load. Ask for other people\'s ideas and strengths. Projects go further when no one carries everything alone.',
        'Value the people around you. The skills you lack are often the very skills someone nearby is glad to offer.'
      ]
    },
    {
      id: 'gratitude', name: 'Gratitude', flawAdj: 'Ungrateful',
      intro: '{hero} had a warm den, loyal friends and plenty to eat, yet {he} was the most discontented {kind} in all of {realm}. {His} den was never grand enough, {his} meals never fine enough, {his} friends never quite impressive enough. {He} spent {his} days gazing at what others had and sighing over what {he} lacked.',
      trial: 'In the Bazaar of Wishes, where merchants sold dreams in glass bottles, {hero} traded away {his} warm traveling cloak for a bottle that promised Something Better. When {he} opened it, it held only an echo of {his} own voice saying, \'Not enough, not enough.\' That night the frost came down from the mountains, and {hero} shivered until dawn, longing for the plain old cloak {he} had never once appreciated.',
      darkest: 'In the Valley of Gold, every rock, every leaf and every drop of water was made of pure gold. {hero} gasped in delight and filled {his} pack until {he} could barely walk. But gold cannot be eaten, and golden water cannot be drunk. Days passed. Starving and parched among unimaginable riches, {hero} finally understood how much {he} had been given back home, and how rarely {he} had said thank you for any of it.',
      turning: '{cname} shared the last of their bread, a simple, stale crust. {hero} ate it slowly and declared it the finest meal {he} had ever tasted. In that moment of thankfulness, the golden valley shimmered, and a spring of clear, sweet water bubbled up at {his} feet. {hero} emptied {his} pack of gold and filled it with water instead, laughing at how foolish {he} had been.',
      climax: 'The guardian offered {hero} a choice: {prize}, which {his} people needed, or a mountain of treasure, fame across every land, and a palace grander than any king\'s. The old {hero} would have grabbed the treasure without a thought. But now {he} remembered {his} warm den, {his} loyal friends and that simple crust of bread. \'I already have more than I ever realized,\' {he} said. \'I\'ll take only what my people need.\' The guardian smiled, for this was the true test, and only a grateful heart could pass it.',
      morals: [
        'Gratitude turns what we have into enough.',
        'The richest creature is the one who needs the least.'
      ],
      applications: [
        'Each day, name three things you are grateful for: a meal, a friend, a warm bed. It trains your mind to notice abundance instead of lack.',
        'Thank the people in your life out loud. A simple thank-you strengthens bonds and reminds you how much you already have.'
      ]
    },
    {
      id: 'prudence', name: 'Prudence', flawAdj: 'Reckless',
      intro: '{hero} was the boldest {kind} in {realm}, and also the most reckless. {He} leapt before {he} looked, spoke before {he} thought, and charged before {he} planned. \'Thinking is for the slow,\' {he} liked to say. \'Fortune favors the bold!\'',
      trial: 'At the edge of the Burning Wastes, {cname} suggested they fill their waterskins and wait for the cool of night to cross. {hero} laughed and charged into the desert at high noon with a single sip of water. By midday {he} was staggering. By afternoon {he} had collapsed. Only {cname}, who had packed extra water, kept {him} alive until the stars rose.',
      darkest: 'In the Labyrinth of the Mad Architect, every wrong turn sank the floor deeper into a pool of rising quicksilver. {hero} charged left, then right, then left again without a thought, and soon the silver was at {his} chest. {cname} was trapped beside {him}. There was no more time for boldness. There was only time to think, or to drown.',
      turning: 'So, for once, {hero} stopped and thought. {He} studied the walls and found faint marks scratched by those who had come before: arrows, all pointing the same way. {He} remembered every turn they had taken and saw the pattern in the maze. Step by careful step, {he} led them out, and as they stood dripping on solid ground, {cname} said, \'That was the bravest thing I\'ve ever seen you do.\' \'I just thought first,\' said {hero}. \'Exactly,\' said {cname}.',
      climax: 'Before facing the guardian, {hero} did something {he} had never done before a fight. {He} watched, and {he} planned. {He} noticed that the guardian always shielded its left side, that it blinked slowly in bright light, and that it never looked up. So {hero} climbed the cliff above, waited for the sun to blaze behind {him}, and dropped down at the perfect moment to claim {prize}. Outwitted rather than overpowered, the guardian roared with laughter. \'Boldness wins battles,\' it said, \'but wisdom wins wars.\'',
      morals: [
        'Look before you leap. The bold who plan go further than the bold who don\'t.',
        'Courage without wisdom is a sword without a handle.'
      ],
      applications: [
        'Before a big decision, like a move, an investment or a new commitment, take time to gather information and make a plan. Boldness works best when preparation backs it up.',
        'Pack the extra water: save for emergencies, back up your work, and think one step ahead. Your future self will thank you.'
      ]
    },
    {
      id: 'generosity', name: 'Generosity', flawAdj: 'Greedy',
      intro: '{hero} was the wealthiest {kind} in all of {realm}, with vaults of acorns, seeds and shining stones piled to the ceiling. Yet {he} never shared a single crumb. When neighbors went hungry in the long winters, {hero} locked {his} doors tighter. \'What\'s mine is mine,\' {he} said, counting {his} treasures again and again.',
      trial: 'On the road, they met a starving family of hedgehogs. {cname} gave them half of their food without a second thought. {hero} clutched {his} pack and gave nothing. That night a band of brigand magpies descended, and because {hero}\'s pack was the heaviest and richest, they stole it whole, leaving {him} with nothing at all. The hedgehogs, meanwhile, slipped away into the night, safe and fed.',
      darkest: 'Penniless, {hero} came to the Bridge of the Toll-Keeper, who demanded payment from every traveler. {He} had nothing to give, and {cname} had already spent their last coin. They camped by the river for days, watching others cross, while {hero}\'s hunger grew sharp and {his} pride grew thin. For the first time in {his} life, {hero} knew what it was to have nothing, and to need.',
      turning: 'On the fourth day, the hedgehog family appeared over the hill. They had heard of the travelers\' plight and gathered berries, roots and a handful of copper coins from their own small stores, enough to pay the toll. \'You helped us when we had nothing,\' they told {cname}. Then they pressed food upon {hero} too, asking nothing in return. {hero} wept, for {he} finally understood that giving does not make you poorer.',
      climax: 'The guardian sat atop a hoard of treasure taller than mountains, guarding {prize} jealously. \'You will never take my treasure!\' it hissed. But {hero} recognized something in the creature\'s lonely, glittering eyes. {He} saw {himself}. \'I don\'t want your treasure,\' {he} said gently. \'I only want to share what I have learned: a heart closed around its riches is the poorest heart of all.\' The guardian, alone with its gold for ten thousand years, wept a single tear of molten silver. It gave {prize} freely, and asked if it, too, might come and see what sharing was like.',
      morals: [
        'The hand that gives also gathers.',
        'Wealth hoarded is a prison; wealth shared is a garden.'
      ],
      applications: [
        'Give what you can, whether time, skills or resources, to those who need it. Generosity builds a web of goodwill that catches you when you fall.',
        'Measure your wealth not only by what you have, but by what you have helped others gain.'
      ]
    }
  ];

  // ---------- Text helpers ----------
  function fill(template, ctx) {
    return template.replace(/\{(\w+)\}/g, (m, key) => (key in ctx ? ctx[key] : m));
  }

  // Straight quotes in the templates become typographic quotes.
  function smarten(text) {
    return text
      .replace(/(^|[\s(])'/g, '$1“')          // opening quote
      .replace(/([.,!?])'/g, '$1”')           // closing quote after punctuation
      .replace(/'/g, '’');                     // everything else is an apostrophe
  }

  function render(template, ctx) {
    const text = smarten(fill(template, ctx));
    // Capitalize the first letter of every paragraph.
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // ---------- Generator ----------
  function generate(options) {
    const opts = options || {};
    const seed = (opts.seed >>> 0) || Math.floor(Math.random() * 1e6);
    const rng = mulberry32(seed);

    const lesson = LESSONS.find((l) => l.id === opts.lesson) || pick(rng, LESSONS);
    const kind = CREATURES.includes(opts.kind) ? opts.kind : pick(rng, CREATURES);
    const customName = (opts.name || '').trim().slice(0, 40);
    const heroName = customName || pick(rng, NAMES);
    const heroPron = rng() < 0.5 ? 'he' : 'she';

    const ckind = pick(rng, CREATURES.filter((c) => c !== kind));
    const cname = pick(rng, NAMES.filter((n) => n !== heroName));
    const cPron = rng() < 0.5 ? 'he' : 'she';

    const realm = pick(rng, REALMS);
    const calamity = pick(rng, CALAMITIES);
    const guardian = pick(rng, GUARDIANS);
    const elder = pick(rng, ELDERS.filter((e) => e.kind !== kind));

    const P = heroPron === 'he'
      ? { he: 'he', his: 'his', him: 'him', himself: 'himself' }
      : { he: 'she', his: 'her', him: 'her', himself: 'herself' };

    const ctx = {
      hero: heroName, kind, aKind: article(kind),
      he: P.he, He: cap(P.he), his: P.his, His: cap(P.his), him: P.him, himself: P.himself,
      cname, ckind, aCkind: article(ckind), ctrait: pick(rng, COMPANION_TRAITS),
      che: cPron, Che: cap(cPron),
      realm: realm.name, realmDesc: realm.desc, landmark: realm.landmark,
      crisis: calamity.crisis, Crisis: cap(calamity.crisis),
      prize: calamity.prize, destination: calamity.destination, resolution: calamity.resolution,
      guardian: guardian.name, guardianDesc: guardian.desc,
      elder: elder.text, Elder: cap(elder.text)
    };

    const sections = [
      { label: 'Once', text: [pick(rng, OPENINGS), pick(rng, HERO_INTROS), lesson.intro].join(' ') },
      { label: 'The Calling', text: [pick(rng, CALLS), pick(rng, COMPANIONS)].join(' ') },
      { label: 'The First Trial', text: pick(rng, PERILS) },
      { label: 'The Second Trial', text: lesson.trial },
      { label: 'The Darkest Hour', text: lesson.darkest },
      { label: 'The Turning', text: lesson.turning },
      { label: 'The Guardian', text: pick(rng, GUARDIAN_INTROS) + ' ' + lesson.climax },
      { label: 'Homecoming', text: pick(rng, ENDINGS) }
    ].map((s) => ({ label: s.label, text: render(s.text, ctx) }));

    const title = rng() < 0.6
      ? `The ${lesson.flawAdj} ${titleCase(kind)} and ${calamity.prize}`
      : `${heroName} the ${titleCase(kind)} and the Quest for ${calamity.prize}`;

    const moral = smarten(pick(rng, lesson.morals));
    const application = smarten(pick(rng, lesson.applications));

    const words = sections.reduce((n, s) => n + s.text.split(/\s+/).length, 0) +
      moral.split(/\s+/).length + application.split(/\s+/).length;

    return {
      seed, title, sections, moral, application,
      lesson: { id: lesson.id, name: lesson.name },
      hero: { name: heroName, kind, custom: Boolean(customName) },
      companion: { name: cname, kind: ckind },
      realm: realm.name, prize: calamity.prize, guardian: guardian.name,
      words, minutes: Math.max(1, Math.round(words / 200))
    };
  }

  function toPlainText(fable) {
    return [
      fable.title, '',
      ...fable.sections.map((s) => s.text + '\n'),
      'Moral: ' + fable.moral, '',
      'In your own life: ' + fable.application
    ].join('\n');
  }

  const api = {
    generate, toPlainText,
    lessons: LESSONS.map((l) => ({ id: l.id, name: l.name })),
    creatures: CREATURES.slice()
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FableEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
