// ============================================================
//  Doodlz Word List — 300+ categorized words
// ============================================================

const WORDS = {
  animals: [
    'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'tiger', 'lion',
    'zebra', 'monkey', 'kangaroo', 'parrot', 'shark', 'whale', 'octopus',
    'butterfly', 'frog', 'turtle', 'rabbit', 'bear', 'fox', 'wolf', 'owl',
    'eagle', 'flamingo', 'crocodile', 'hippo', 'gorilla', 'cheetah', 'panda',
    'koala', 'deer', 'horse', 'cow', 'pig', 'sheep', 'chicken', 'duck', 'goose',
    'crab', 'lobster', 'starfish', 'jellyfish', 'snail', 'bee', 'ant', 'spider',
  ],
  food: [
    'pizza', 'hamburger', 'sushi', 'taco', 'ice cream', 'cake', 'cookie', 'donut',
    'sandwich', 'hot dog', 'pasta', 'noodles', 'dumpling', 'pancake', 'waffle',
    'apple', 'banana', 'strawberry', 'watermelon', 'pineapple', 'grapes', 'lemon',
    'carrot', 'broccoli', 'mushroom', 'corn', 'tomato', 'potato', 'onion',
    'coffee', 'tea', 'juice', 'milkshake', 'bubble tea', 'popcorn', 'pretzel',
    'croissant', 'bagel', 'burrito', 'nachos', 'fries', 'soup', 'salad', 'steak',
  ],
  objects: [
    'chair', 'table', 'lamp', 'clock', 'mirror', 'window', 'door', 'stairs',
    'umbrella', 'backpack', 'wallet', 'key', 'lock', 'scissors', 'pencil',
    'notebook', 'book', 'newspaper', 'envelope', 'stamp', 'phone', 'laptop',
    'camera', 'headphones', 'speaker', 'television', 'remote', 'battery',
    'flashlight', 'candle', 'glasses', 'hat', 'gloves', 'scarf', 'shoe',
    'sock', 'belt', 'watch', 'ring', 'necklace', 'crown', 'trophy', 'medal',
    'bottle', 'cup', 'plate', 'spoon', 'fork', 'knife', 'bowl', 'pan',
  ],
  places: [
    'beach', 'mountain', 'forest', 'desert', 'island', 'lake', 'river', 'ocean',
    'castle', 'palace', 'pyramid', 'lighthouse', 'bridge', 'tunnel', 'cave',
    'airport', 'train station', 'hospital', 'school', 'library', 'museum',
    'stadium', 'park', 'playground', 'zoo', 'farm', 'factory', 'restaurant',
    'hotel', 'bank', 'church', 'temple', 'market', 'theater', 'circus',
  ],
  actions: [
    'running', 'jumping', 'swimming', 'flying', 'climbing', 'dancing', 'singing',
    'sleeping', 'eating', 'drinking', 'reading', 'writing', 'painting', 'cooking',
    'driving', 'fishing', 'surfing', 'skiing', 'skating', 'boxing', 'kicking',
    'throwing', 'catching', 'clapping', 'waving', 'pointing', 'hugging', 'laughing',
    'crying', 'thinking', 'dreaming', 'sneezing', 'yawning', 'blinking',
  ],
  vehicles: [
    'car', 'truck', 'bus', 'train', 'airplane', 'helicopter', 'rocket', 'spaceship',
    'boat', 'ship', 'submarine', 'motorcycle', 'bicycle', 'scooter', 'skateboard',
    'hot air balloon', 'tractor', 'ambulance', 'fire truck', 'police car', 'taxi',
  ],
  nature: [
    'rainbow', 'cloud', 'sun', 'moon', 'star', 'lightning', 'tornado', 'volcano',
    'earthquake', 'wave', 'waterfall', 'glacier', 'coral reef', 'cactus', 'tree',
    'flower', 'rose', 'sunflower', 'mushroom', 'leaf', 'grass', 'vine', 'seashell',
  ],
  sports: [
    'football', 'basketball', 'tennis', 'golf', 'volleyball', 'baseball', 'cricket',
    'badminton', 'bowling', 'archery', 'fencing', 'wrestling', 'gymnastics',
    'swimming', 'diving', 'surfing', 'snowboarding', 'ice hockey', 'polo',
  ],
  professions: [
    'doctor', 'nurse', 'firefighter', 'police officer', 'teacher', 'chef', 'farmer',
    'astronaut', 'pilot', 'sailor', 'soldier', 'judge', 'lawyer', 'scientist',
    'artist', 'musician', 'actor', 'dancer', 'athlete', 'magician', 'clown',
  ],
};

const ALL_WORDS = Object.values(WORDS).flat();

/**
 * Get N random words from the pool (no repeats)
 * @param {number} count
 * @returns {string[]}
 */
function getRandomWords(count = 3) {
  const shuffled = [...ALL_WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { WORDS, ALL_WORDS, getRandomWords };
