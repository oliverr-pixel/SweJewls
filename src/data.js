export const PHONE = { display: '076-328 20 09', e164: '+46763282009' };

export const PRODUCTS = {
  silver: { id: 'silver', name: 'Diamantsilverarmband', price: 250, kind: 'Armband' },
  gold: { id: 'gold', name: 'Guldarmband', price: 300, kind: 'Armband' },
  // Halsbandet erbjuds i två färger. Ta bort `finishes` om det bara finns en.
  necklace: { id: 'necklace', name: 'Halsband', price: 350, kind: 'Halsband', finishes: ['Silver', 'Guld'] },
};

export const formatKr = (n) => `${n.toLocaleString('sv-SE')} kr`;
