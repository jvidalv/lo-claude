export type VerbPack = 'berrus' | 'random' | 'custom';

const berrusVerbs: string[] = [
  'Harvesting Garnatxa grapes',
  'Clearing rats from the sewers',
  'Counting pesetas',
  'Sharpening the puñalada trapera',
  'Dodging a Jabalí Rabioso',
  'Looting xatarra',
  'Exploring Terra Alta',
  'Preparing pan con tomate',
  'Bribing the Town Guard',
  'Fleeing from a Duende Ratonero',
  'Mining copper in Xalets',
  'Blaming the meta',
  'Surviving The Sin',
  'Haggling at the Konomat',
  'Chasing a Goblin Pringao',
  'Brewing something suspicious',
  'Descending into Cueva de Mocos',
  'Taking a siesta',
  'Robbing the Banco',
  "Picking someone else's boots",
  'Flexing for nobody',
  'Muttering about pension plans',
  'Smelling incense and poor choices',
  'Collecting duros de xatarra',
];

const randomVerbs: string[] = [
  'Reticulating splines',
  'Compiling the compiler',
  'Asking Stack Overflow',
  'Deploying to localhost',
  'Refactoring the refactor',
  'Googling the error message',
  'Blaming the intern',
  'Checking if it works on my machine',
  'Adding more RAM',
  'Turning it off and on again',
  'Updating dependencies',
  'Reading the docs (for once)',
  'Deleting node_modules',
  'Waiting for CI',
  'Clearing the cache',
  'Reverting the revert',
  'Copying from production',
  'Writing unit tests (maybe)',
  'Fixing the fix',
  'Pushing to main (YOLO)',
  'Blaming DNS',
  'Rubber ducking',
  'Bikeshedding the variable name',
  'Overengineering the solution',
  'Shipping it and hoping for the best',
  'Ignoring the linter',
  'Praying to the demo gods',
  'Hydrating the server',
  'Flattening the dependency tree',
  'Warming up the JIT',
];

const verbPacks: Record<VerbPack, string[]> = {
  berrus: berrusVerbs,
  random: randomVerbs,
  custom: [],
};

export function getVerbs(pack: VerbPack): string[] {
  return verbPacks[pack];
}

export function getVerbPackDescription(pack: VerbPack): string {
  switch (pack) {
    case 'berrus':
      return 'Catalan/fantasy RPG themed (e.g. "Harvesting Garnatxa grapes", "Chasing a Goblin Pringao")';
    case 'random':
      return 'Developer humor (e.g. "Reticulating splines", "Blaming DNS")';
    case 'custom':
      return 'Enter your own verbs';
  }
}
