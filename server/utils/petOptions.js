const { fail } = require('./core');
const defaults = {
  Dog: ['Aspin', 'Beagle', 'Chihuahua', 'Dachshund', 'German Shepherd', 'Golden Retriever', 'Labrador Retriever', 'Pomeranian', 'Poodle', 'Pug', 'Shih Tzu', 'Siberian Husky', 'Mixed', 'Mixed breed', 'Unknown'],
  Cat: ['Puspin', 'Domestic shorthair', 'Domestic longhair', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll', 'Bengal', 'Mixed', 'Mixed breed', 'Unknown'],
};
const cache = new Map();
const title = value => value.split(/[ -]/).map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
async function getBreeds(species) {
  if (!defaults[species]) return { species, breeds: [], source: 'custom' };
  const saved = cache.get(species);
  if (saved && saved.expires > Date.now()) return saved.result;
  let breeds = defaults[species];
  let source = 'built-in fallback';
  try {
    const url = species === 'Dog' ? 'https://dog.ceo/api/breeds/list/all' : 'https://api.thecatapi.com/v1/breeds';
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('Breed service unavailable');
    const data = await response.json();
    const fetched = species === 'Dog'
      ? Object.entries(data.message).flatMap(([breed, sub]) => sub.length ? sub.map(value => title(`${value} ${breed}`)) : [title(breed)])
      : data.map(({ name }) => name);
    breeds = [...new Set([...breeds, ...fetched])].sort((a, b) => a.localeCompare(b));
    source = species === 'Dog' ? 'Dog CEO API + local breeds' : 'The Cat API + local breeds';
  } catch { /* Registration stays usable when an external catalogue is unavailable. */ }
  const result = { species, breeds, source };
  cache.set(species, { result, expires: Date.now() + (source.includes('fallback') ? 60000 : 86400000) });
  return result;
}
function validatePetGender(gender) {
  if (gender !== undefined && !['Male', 'Female', 'Unknown'].includes(gender))
    fail(400, 'Choose Male, Female, or Unknown for the pet gender.', { gender: 'Choose a valid pet gender.' });
}
async function validatePetRegistration(data) {
  validatePetGender(data.gender);
  if (!['Dog', 'Cat', 'Other'].includes(data.species)) fail(400, 'Choose Dog, Cat, or Other.', { species: 'Choose a valid species.' });
  if (data.species === 'Other') {
    if (typeof data.otherSpecies !== 'string' || !data.otherSpecies.trim() || data.otherSpecies.trim().length > 80)
      fail(400, 'Please specify the animal species.', { otherSpecies: 'Enter the species, for example Rabbit or Bird (up to 80 characters).' });
  } else {
    const { breeds } = await getBreeds(data.species);
    if (!breeds.some(breed => breed.toLowerCase() === String(data.breed || '').trim().toLowerCase()))
      fail(400, 'Choose a breed for the selected species.', { breed: `Choose a ${data.species.toLowerCase()} breed, Mixed breed, or Unknown.` });
  }
  if (data.picture && (typeof data.picture !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(data.picture)))
    fail(400, 'Use a PNG, JPG, or WebP pet picture.', { picture: 'Choose a supported image.' });
  const estimate = data.estimatedWeight ?? data.weight;
  if (estimate != null && estimate !== '' && (!Number.isFinite(Number(estimate)) || Number(estimate) <= 0 || Number(estimate) > 500))
    fail(400, 'Enter a valid estimated weight or leave it blank.', { weight: 'Estimated weight must be above 0 and at most 500 kg.' });
  return estimate == null || estimate === '' ? undefined : Number(estimate);
}
module.exports = { getBreeds, validatePetRegistration, validatePetGender };
