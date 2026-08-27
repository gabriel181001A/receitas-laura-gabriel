import { buildShoppingList, parseIngredient, classifyAisle } from './server/lib/aisles.js';

const casos = [
  '500g de espaguete', '3 ovos', '2 e 1/2 xicaras de farinha de trigo',
  '1 colher de sopa de fermento', 'Sal a gosto', '6 dentes de alho fatiados',
  '1/2 xicara de azeite', 'Cobertura: 3 colheres de leite', '200g de peito de frango',
  '1 lata de leite condensado', 'Salsinha picada', '1,5 L de leite',
  '½ cebola picada', 'duas bananas', '2 filés de salmão',
];

console.log('--- parseIngredient + secao ---');
for (const c of casos) {
  const p = parseIngredient(c);
  console.log(
    String(c).padEnd(34),
    '=> qty:', String(p.qty).padEnd(6),
    'un:', String(p.unit).padEnd(14),
    'nome:', String(p.name).padEnd(22),
    '[' + classifyAisle(p.name) + ']',
  );
}

console.log('\n--- lista de compras somando 2 receitas ---');
const lista = buildShoppingList([
  { text: '3 ovos', recipeTitle: 'Bolo' },
  { text: '2 ovos', recipeTitle: 'Panqueca' },
  { text: '500g de farinha de trigo', recipeTitle: 'Bolo' },
  { text: '250g de farinha de trigo', recipeTitle: 'Panqueca' },
  { text: 'Sal a gosto', recipeTitle: 'Panqueca' },
  { text: '1 cebola', recipeTitle: 'Molho' },
]);
for (const i of lista) console.log(`[${i.aisle}]`.padEnd(15), i.label, '<-', i.recipes.join(', '));
