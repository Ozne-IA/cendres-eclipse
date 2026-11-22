// Shared by the renderer and the service worker's build-time precache list.
export const BIOME_BACKDROP_URLS: Record<string, string> = {
  catacombes: '/src/assets/images/biome_catacombes_bg_1795125904324.jpg',
  viaduc: '/src/assets/images/biome_viaduc_bg_1795125905664.jpg',
  fleche: '/src/assets/images/biome_fleche_bg_1795125905927.jpg',
  sanctuaire: '/src/assets/images/biome_sanctuaire_bg_1795125905684.jpg',
};

// A missing cinematic backdrop falls back to the corresponding classic image.
export const BIOME_BACKDROP_V2_URLS: Record<string, string> = {
  catacombes: '/src/assets/images/v2/biome_catacombes_v2.jpg',
  viaduc: '/src/assets/images/v2/biome_viaduc_v2.jpg',
  fleche: '/src/assets/images/v2/biome_fleche_v2.jpg',
  sanctuaire: '/src/assets/images/v2/biome_sanctuaire_v2.jpg',
};

export const TITLE_HERO_ARTWORK_URL = '/assets/aistudio/Creating_video_game_hero_concept_082510a8_2K_39b1471f.webp';
