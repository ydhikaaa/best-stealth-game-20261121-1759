// levels.js — the five cars of the sleeper train "Midnight Manifest" as data.
// World coordinates: each car interior is WORLD_W x WORLD_H units. Cover is
// either "high" (blocks sight and movement: luggage stacks, crates, seat
// rows, tables, the bar) or "low" (blocks movement; a sneaking player right
// behind it is hidden). Lamps throw pools of light; gravel patches are loud.

export const WORLD_W = 880;
export const WORLD_H = 620;

export const CAR_NAMES = [
  'Baggage Car',
  'Sleeper Car',
  'Dining Car',
  'Lounge Car',
  'Vault Car',
];

const high = (x, y, w, h, kind) => ({ x, y, w, h, kind });
const low = (x, y, w, h, kind) => ({ x, y, w, h, kind });
const lamp = (x, y) => ({ x, y, r: 96, on: true });
const gravel = (x, y, w, h) => ({ x, y, w, h });
const loot = (x, y, name, value) => ({ x, y, name, value, taken: false });
const guard = (path, speed) => ({ path, speed });

export const CARS = [
  {
    name: 'Car 1 — Baggage Car',
    intro: 'Crates, mail sacks and one sleepy warden with a lantern. Learn the shadows.',
    playerStart: { x: 46, y: 310 },
    exit: { x: 852, y: 310 },
    coins: 5, smokes: 2, douses: 3,
    lamps: [lamp(220, 150), lamp(450, 470), lamp(680, 150)],
    gravel: [gravel(300, 260, 150, 100), gravel(560, 380, 130, 90)],
    coverHigh: [
      high(150, 90, 90, 60, 'crates'), high(150, 420, 90, 60, 'crates'),
      high(360, 180, 110, 70, 'luggage'), high(360, 420, 110, 70, 'luggage'),
      high(600, 250, 90, 120, 'crates'), high(740, 90, 80, 60, 'luggage'),
    ],
    coverLow: [
      low(250, 300, 70, 26, 'sacks'), low(520, 120, 70, 26, 'sacks'),
      low(520, 500, 70, 26, 'sacks'), low(730, 470, 70, 26, 'sacks'),
    ],
    loot: [
      loot(190, 120, 'Brass Compass', 120),
      loot(415, 215, 'Silver Flask', 150),
      loot(645, 310, 'Jade Brooch', 200),
      loot(780, 120, 'Pearl Clasp', 180),
    ],
    guards: [
      guard([[120, 200], [420, 200], [420, 520], [120, 520]], 62),
      guard([[780, 520], [560, 520], [560, 110], [780, 110]], 58),
    ],
  },
  {
    name: 'Car 2 — Sleeper Car',
    intro: 'Berths and drawn curtains. Three wardens walk the corridor tonight.',
    playerStart: { x: 46, y: 310 },
    exit: { x: 852, y: 310 },
    coins: 5, smokes: 2, douses: 3,
    lamps: [lamp(200, 310), lamp(450, 120), lamp(450, 500), lamp(700, 310)],
    gravel: [gravel(330, 270, 120, 80)],
    coverHigh: [
      high(140, 70, 130, 54, 'berth'), high(140, 496, 130, 54, 'berth'),
      high(330, 70, 130, 54, 'berth'), high(330, 496, 130, 54, 'berth'),
      high(520, 70, 130, 54, 'berth'), high(520, 496, 130, 54, 'berth'),
      high(700, 70, 110, 54, 'berth'), high(700, 496, 110, 54, 'berth'),
    ],
    coverLow: [
      low(215, 300, 80, 22, 'curtain'), low(405, 300, 80, 22, 'curtain'),
      low(595, 300, 80, 22, 'curtain'), low(760, 300, 60, 22, 'curtain'),
    ],
    loot: [
      loot(205, 97, 'Gold Locket', 160),
      loot(395, 523, 'Ivory Comb', 140),
      loot(585, 97, 'Ruby Studs', 220),
      loot(755, 523, 'Onyx Ring', 190),
      loot(450, 310, 'Pocket Watch', 250),
    ],
    guards: [
      guard([[110, 190], [770, 190]], 66),
      guard([[770, 430], [110, 430]], 66),
      guard([[450, 90], [450, 530]], 54),
    ],
  },
  {
    name: 'Car 3 — Dining Car',
    intro: 'White linen, silver trays, and lamplight everywhere. Stay low, stay dark.',
    playerStart: { x: 46, y: 310 },
    exit: { x: 852, y: 310 },
    coins: 5, smokes: 2, douses: 3,
    lamps: [lamp(230, 180), lamp(230, 440), lamp(460, 310), lamp(690, 180), lamp(690, 440)],
    gravel: [gravel(520, 260, 110, 100), gravel(160, 270, 90, 80)],
    coverHigh: [
      high(170, 130, 120, 56, 'table'), high(170, 434, 120, 56, 'table'),
      high(380, 130, 120, 56, 'table'), high(380, 434, 120, 56, 'table'),
      high(590, 130, 120, 56, 'table'), high(590, 434, 120, 56, 'table'),
      high(770, 262, 60, 96, 'counter'),
    ],
    coverLow: [
      low(230, 300, 90, 22, 'bench'), low(440, 300, 90, 22, 'bench'),
      low(650, 300, 90, 22, 'bench'), low(120, 520, 90, 22, 'bench'),
    ],
    loot: [
      loot(230, 158, 'Silver Salver', 180),
      loot(440, 462, 'Crystal Decanter', 240),
      loot(650, 158, 'Gold Cruet Set', 210),
      loot(800, 310, 'Vintage Cognac', 300),
      loot(120, 90, 'Pearl Napkin Ring', 130),
    ],
    guards: [
      guard([[120, 240], [740, 240], [740, 380], [120, 380]], 60),
      guard([[740, 90], [140, 90], [140, 540], [740, 540]], 56),
      guard([[460, 540], [460, 90]], 64),
    ],
  },
  {
    name: 'Car 4 — Lounge Car',
    intro: 'The bar is polished brass and the wardens are wide awake. Four lanterns sweep the room.',
    playerStart: { x: 46, y: 310 },
    exit: { x: 852, y: 310 },
    coins: 5, smokes: 2, douses: 4,
    lamps: [lamp(210, 160), lamp(440, 470), lamp(660, 160), lamp(800, 470)],
    gravel: [gravel(360, 250, 140, 110), gravel(620, 330, 110, 80)],
    coverHigh: [
      high(700, 60, 140, 64, 'bar'), high(120, 80, 110, 60, 'armchairs'),
      high(120, 480, 110, 60, 'armchairs'), high(330, 90, 100, 56, 'cabinet'),
      high(330, 474, 100, 56, 'cabinet'), high(560, 90, 100, 56, 'armchairs'),
      high(560, 474, 100, 56, 'cabinet'),
    ],
    coverLow: [
      low(240, 300, 90, 22, 'sofa'), low(470, 300, 90, 22, 'sofa'),
      low(680, 300, 90, 22, 'sofa'), low(120, 300, 70, 22, 'plant'),
    ],
    loot: [
      loot(770, 92, 'Aged Single Malt', 320),
      loot(175, 110, 'Emerald Cufflinks', 260),
      loot(380, 502, 'Sapphire Pendant', 340),
      loot(610, 118, 'Gold Cigar Case', 280),
      loot(450, 310, 'Diamond Tie Pin', 380),
    ],
    guards: [
      guard([[100, 200], [640, 200], [640, 420], [100, 420]], 64),
      guard([[790, 540], [790, 170]], 60),
      guard([[250, 90], [250, 530]], 58),
      guard([[520, 530], [520, 90], [120, 90]], 62),
    ],
  },
  {
    name: 'Car 5 — Vault Car',
    intro: 'The last car. Five wardens, one legend: the Velmora Star. Take it and vanish.',
    playerStart: { x: 46, y: 310 },
    exit: { x: 852, y: 310 },
    coins: 5, smokes: 2, douses: 4,
    lamps: [lamp(200, 140), lamp(440, 310), lamp(680, 140), lamp(440, 500), lamp(700, 480)],
    gravel: [gravel(280, 260, 130, 100), gravel(560, 260, 130, 100)],
    coverHigh: [
      high(140, 240, 70, 140, 'safe'), high(670, 240, 70, 140, 'safe'),
      high(300, 80, 110, 60, 'strongbox'), high(300, 480, 110, 60, 'strongbox'),
      high(470, 80, 110, 60, 'strongbox'), high(470, 480, 110, 60, 'strongbox'),
      high(395, 262, 90, 96, 'vaultdoor'),
    ],
    coverLow: [
      low(230, 300, 80, 22, 'sacks'), low(570, 300, 80, 22, 'sacks'),
      low(440, 130, 80, 22, 'sacks'), low(440, 490, 80, 22, 'sacks'),
    ],
    loot: [
      loot(345, 110, 'Gold Ingot', 400),
      loot(525, 510, 'Platinum Chain', 360),
      loot(175, 310, 'Royal Signet', 420),
      loot(705, 310, 'Crown Ruby', 450),
      loot(440, 310, 'THE VELMORA STAR', 1000),
    ],
    guards: [
      guard([[110, 150], [770, 150]], 68),
      guard([[770, 470], [110, 470]], 68),
      guard([[440, 60], [440, 560]], 60),
      guard([[180, 560], [180, 60], [700, 60], [700, 560]], 56),
      guard([[620, 400], [260, 400], [260, 220], [620, 220]], 64),
    ],
  },
];
