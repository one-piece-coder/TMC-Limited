'use strict';

/* =========================================================
   Meal Planner — breakfast / lunch / dinner, day/week/month,
   with an automatic meal generator. Data is kept in localStorage.
   ========================================================= */

const SLOTS = ['breakfast', 'lunch', 'dinner'];
const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const STORE_KEY = 'mealPlanner.v1';

// [name, types (b/l/d), vegetarian, quick (<= 30 min)]
const DEFAULT_MEALS = [
  // Breakfast
  ['Scrambled eggs & toast', 'b', 1, 1],
  ['Overnight oats', 'b', 1, 1],
  ['Greek yogurt parfait', 'b', 1, 1],
  ['Avocado toast', 'b', 1, 1],
  ['Pancakes', 'b', 1, 0],
  ['Waffles with berries', 'b', 1, 0],
  ['Breakfast burrito', 'bl', 0, 1],
  ['Veggie omelette', 'b', 1, 1],
  ['Banana smoothie bowl', 'b', 1, 1],
  ['Bagel & cream cheese', 'b', 1, 1],
  ['French toast', 'b', 1, 0],
  ['Bacon, eggs & hash browns', 'b', 0, 0],
  ['Oatmeal with apples & cinnamon', 'b', 1, 1],
  ['Breakfast sandwich', 'b', 0, 1],
  ['Shakshuka', 'bd', 1, 0],
  ['Peanut butter banana toast', 'b', 1, 1],
  ['Chia pudding', 'b', 1, 1],
  ['Huevos rancheros', 'b', 1, 0],
  ['Egg muffin cups', 'b', 1, 0],
  ['Granola & milk', 'b', 1, 1],
  // Lunch
  ['Turkey club sandwich', 'l', 0, 1],
  ['Chicken Caesar salad', 'l', 0, 1],
  ['Tomato soup & grilled cheese', 'l', 1, 1],
  ['Chicken wrap', 'l', 0, 1],
  ['Quinoa power bowl', 'l', 1, 1],
  ['Tuna salad sandwich', 'l', 0, 1],
  ['Caprese panini', 'l', 1, 1],
  ['Chicken noodle soup', 'ld', 0, 0],
  ['Greek salad with pita', 'l', 1, 1],
  ['Burrito bowl', 'ld', 0, 1],
  ['BLT', 'l', 0, 1],
  ['Hummus & veggie wrap', 'l', 1, 1],
  ['Cobb salad', 'l', 0, 1],
  ['Lentil soup', 'ld', 1, 0],
  ['Chicken quesadilla', 'ld', 0, 1],
  ['Egg salad sandwich', 'l', 1, 1],
  ['Asian chicken salad', 'l', 0, 1],
  ['Black bean soup', 'ld', 1, 0],
  ['Pasta salad', 'l', 1, 1],
  ['Sushi bowl', 'l', 0, 1],
  // Dinner
  ['Spaghetti bolognese', 'd', 0, 0],
  ['Chicken stir-fry', 'd', 0, 1],
  ['Tacos', 'ld', 0, 1],
  ['Baked salmon & roasted vegetables', 'd', 0, 1],
  ['Homemade pizza', 'd', 1, 0],
  ['Beef chili', 'd', 0, 0],
  ['Chicken fajitas', 'd', 0, 1],
  ['Vegetable curry with rice', 'd', 1, 0],
  ['Grilled steak & potatoes', 'd', 0, 0],
  ['Teriyaki chicken & rice', 'd', 0, 1],
  ['Shrimp scampi', 'd', 0, 1],
  ['Lasagna', 'd', 0, 0],
  ['Mushroom risotto', 'd', 1, 0],
  ['Burgers & sweet potato fries', 'd', 0, 0],
  ['Pork chops & applesauce', 'd', 0, 0],
  ['Chicken Alfredo', 'd', 0, 1],
  ['Stuffed bell peppers', 'd', 0, 0],
  ['Veggie fried rice', 'ld', 1, 1],
  ['Sheet-pan chicken & veggies', 'd', 0, 0],
  ['Beef & broccoli', 'd', 0, 1],
  ['Eggplant parmesan', 'd', 1, 0],
  ['Fish tacos', 'd', 0, 1],
  ['Roast chicken', 'd', 0, 0],
  ['Pad thai', 'd', 0, 1],
  ['Chickpea & spinach stew', 'd', 1, 1],
  ['Meatloaf & mashed potatoes', 'd', 0, 0],
  ['Pesto pasta with peas', 'ld', 1, 1],
  ['BBQ pulled pork sandwiches', 'd', 0, 0],
  ['Black bean enchiladas', 'd', 1, 0],
  ['Lemon garlic shrimp & orzo', 'd', 0, 1],
  // More fish & seafood
  ['Smoked salmon bagel', 'b', 0, 1],
  ['Smoked salmon scrambled eggs', 'b', 0, 1],
  ['Tuna Niçoise salad', 'l', 0, 0],
  ['Tuna melt', 'l', 0, 1],
  ["Shrimp po' boy", 'l', 0, 1],
  ['Cod with lemon & herbs', 'd', 0, 1],
  ['Fish & chips', 'd', 0, 0],
  ['Salmon teriyaki bowl', 'd', 0, 1],
  ['Cajun shrimp pasta', 'd', 0, 1],
  ['Crab cakes & salad', 'd', 0, 0],
  ['Mussels in white wine', 'd', 0, 1],
  ['Shrimp fried rice', 'ld', 0, 1],
  ['Grilled tilapia & rice', 'd', 0, 1],
  ['Seared tuna steaks', 'd', 0, 1],
  ['Salmon cakes', 'd', 0, 0],
  // Vegan
  ['Tofu scramble', 'b', 1, 1],
  ['Vegan overnight oats', 'b', 1, 1],
  ['Berry smoothie bowl', 'b', 1, 1],
  ['Chickpea salad sandwich', 'l', 1, 1],
  ['Falafel pita', 'l', 1, 1],
  ['Buddha bowl', 'ld', 1, 0],
  ['Tofu stir-fry', 'd', 1, 1],
  ['Lentil bolognese', 'd', 1, 0],
  ['Black bean tacos', 'ld', 1, 1],
  ['Vegan chili', 'd', 1, 0],
  ['Stuffed sweet potatoes', 'ld', 1, 0],
  // Light (low calorie)
  ['Zucchini noodles with marinara', 'ld', 1, 1],
  ['Turkey lettuce wraps', 'ld', 0, 1],
  ['Cauliflower fried rice', 'ld', 1, 1],
  ['Grilled chicken salad', 'l', 0, 1],
];

// Rough calories per serving, for the low-calorie option and daily totals (estimates only).
const DEFAULT_KCAL = {
  'Scrambled eggs & toast': 350, 'Overnight oats': 380, 'Greek yogurt parfait': 300, 'Avocado toast': 320,
  'Pancakes': 520, 'Waffles with berries': 550, 'Breakfast burrito': 600, 'Veggie omelette': 280,
  'Banana smoothie bowl': 400, 'Bagel & cream cheese': 400, 'French toast': 480, 'Bacon, eggs & hash browns': 650,
  'Oatmeal with apples & cinnamon': 320, 'Breakfast sandwich': 450, 'Shakshuka': 380, 'Peanut butter banana toast': 380,
  'Chia pudding': 280, 'Huevos rancheros': 500, 'Egg muffin cups': 250, 'Granola & milk': 420,
  'Smoked salmon bagel': 430, 'Smoked salmon scrambled eggs': 380,
  'Turkey club sandwich': 600, 'Chicken Caesar salad': 470, 'Tomato soup & grilled cheese': 550, 'Chicken wrap': 520,
  'Quinoa power bowl': 480, 'Tuna salad sandwich': 480, 'Caprese panini': 560, 'Chicken noodle soup': 300,
  'Greek salad with pita': 420, 'Burrito bowl': 650, 'BLT': 500, 'Hummus & veggie wrap': 400, 'Cobb salad': 550,
  'Lentil soup': 320, 'Chicken quesadilla': 600, 'Egg salad sandwich': 450, 'Asian chicken salad': 400,
  'Black bean soup': 350, 'Pasta salad': 450, 'Sushi bowl': 520, 'Tuna Niçoise salad': 420, 'Tuna melt': 520,
  "Shrimp po' boy": 650,
  'Spaghetti bolognese': 650, 'Chicken stir-fry': 480, 'Tacos': 550, 'Baked salmon & roasted vegetables': 450,
  'Homemade pizza': 700, 'Beef chili': 520, 'Chicken fajitas': 550, 'Vegetable curry with rice': 550,
  'Grilled steak & potatoes': 700, 'Teriyaki chicken & rice': 600, 'Shrimp scampi': 580, 'Lasagna': 700,
  'Mushroom risotto': 550, 'Burgers & sweet potato fries': 850, 'Pork chops & applesauce': 550, 'Chicken Alfredo': 850,
  'Stuffed bell peppers': 450, 'Veggie fried rice': 450, 'Sheet-pan chicken & veggies': 480, 'Beef & broccoli': 550,
  'Eggplant parmesan': 600, 'Fish tacos': 480, 'Roast chicken': 550, 'Pad thai': 650, 'Chickpea & spinach stew': 380,
  'Meatloaf & mashed potatoes': 650, 'Pesto pasta with peas': 600, 'BBQ pulled pork sandwiches': 700,
  'Black bean enchiladas': 550, 'Lemon garlic shrimp & orzo': 480, 'Cod with lemon & herbs': 400, 'Fish & chips': 850,
  'Salmon teriyaki bowl': 550, 'Cajun shrimp pasta': 700, 'Crab cakes & salad': 450, 'Mussels in white wine': 450,
  'Shrimp fried rice': 480, 'Grilled tilapia & rice': 400, 'Seared tuna steaks': 420, 'Salmon cakes': 420,
  'Tofu scramble': 300, 'Vegan overnight oats': 350, 'Berry smoothie bowl': 330, 'Chickpea salad sandwich': 420,
  'Falafel pita': 520, 'Buddha bowl': 520, 'Tofu stir-fry': 420, 'Lentil bolognese': 480, 'Black bean tacos': 420,
  'Vegan chili': 380, 'Stuffed sweet potatoes': 400, 'Zucchini noodles with marinara': 250,
  'Turkey lettuce wraps': 320, 'Cauliflower fried rice': 280, 'Grilled chicken salad': 350,
};
// Food Network specialty recipes (links checked Nov 2026). Ingredients are a shopping summary;
// the linked recipe has exact amounts.
// [name, types, vegetarian, quick, kcal, chef, ingredients, recipe link]
const SPECIALTY_MEALS = [
  ["Alton Brown's Overnight Oatmeal", "b", 1, 0, 350, "Alton Brown", "steel-cut oats, dried cranberries, dried figs, half-and-half", "https://www.foodnetwork.com/recipes/alton-brown/overnight-oatmeal-recipe-1939324"],
  ["Alton Brown's \"Instant\" Pancakes", "b", 1, 1, 520, "Alton Brown", "flour, sugar, baking powder, baking soda, buttermilk, eggs, butter, maple syrup", "https://www.foodnetwork.com/recipes/alton-brown/instant-pancake-mix-recipe-1938544"],
  ["Alton Brown's Shakshuka", "bd", 1, 0, 380, "Alton Brown", "eggs, red bell peppers, tomatoes, onions, garlic, harissa, bread", "https://www.foodnetwork.com/recipes/alton-brown/shakshuka-7424000"],
  ["Ree Drummond's Frittata", "b", 1, 0, 350, "Ree Drummond", "eggs, mushrooms, asparagus, potatoes, roasted red peppers, parmesan cheese", "https://www.foodnetwork.com/recipes/ree-drummond/frittata-2593843"],
  ["Ree Drummond's Cinnamon Rolls", "b", 1, 0, 450, "Ree Drummond", "flour, milk, sugar, yeast, butter, cinnamon, brown sugar, powdered sugar, maple flavoring", "https://www.foodnetwork.com/recipes/ree-drummond/cinnamon-rolls-recipe2-2119941"],
  ["Ree Drummond's Herbalicious Breakfast Casserole", "b", 1, 0, 480, "Ree Drummond", "onion rolls, eggs, milk, cream cheese, mozzarella, pesto", "https://www.foodnetwork.com/recipes/ree-drummond/herbalicious-breakfast-casserole-5458018"],
  ["Ina Garten's Tomato Soup & Grilled Cheese Croutons", "l", 0, 0, 550, "Ina Garten", "onions, garlic, chicken broth, canned crushed tomatoes, saffron, orzo, heavy cream, bread, gruyère cheese, butter", "https://www.foodnetwork.com/recipes/ina-garten/easy-tomato-soup-grilled-cheese-croutons-recipe-2109038"],
  ["Guy Fieri's Trash Can Nachos", "ld", 0, 0, 900, "Guy Fieri", "tortilla chips, flank steak, black beans, cheddar cheese, monterey jack cheese, salsa, sour cream, jalapeños, avocados", "https://www.foodnetwork.com/recipes/guy-fieri/trash-can-nachos-3582107"],
  ["Ree Drummond's Chicken Spaghetti", "d", 0, 0, 650, "Ree Drummond", "whole chicken, spaghetti, cream of mushroom soup, onions, bell peppers, cheddar cheese, seasoned salt, cayenne", "https://www.foodnetwork.com/recipes/ree-drummond/chicken-spaghetti-recipe-2108829"],
  ["Ree Drummond's Perfect Pot Roast", "d", 0, 0, 600, "Ree Drummond", "chuck roast, onions, carrots, red wine, beef broth, tomato paste, thyme, rosemary", "https://www.foodnetwork.com/videos/rees-perfect-pot-roast-0216872"],
  ["Ina Garten's Perfect Roast Chicken", "d", 0, 0, 550, "Ina Garten", "whole chicken, lemons, garlic, thyme, onions, carrots, fennel, butter", "https://www.foodnetwork.com/recipes/ina-garten/perfect-roast-chicken-recipe-1940592"],
  ["Ina Garten's Lemon Chicken Breasts", "d", 0, 0, 420, "Ina Garten", "chicken breasts, garlic, white wine, lemons, oregano, thyme", "https://www.foodnetwork.com/recipes/ina-garten/lemon-chicken-breasts-recipe-1923711"],
  ["Ina Garten's Weeknight Bolognese", "d", 0, 0, 650, "Ina Garten", "ground beef, garlic, red pepper flakes, red wine, canned crushed tomatoes, tomato paste, heavy cream, basil, spaghetti, parmesan cheese", "https://www.foodnetwork.com/videos/inas-weeknight-bolognese-0223269"],
  ["Ina Garten's Crispy Chicken with Lemon Orzo", "d", 0, 0, 650, "Ina Garten", "chicken breasts, flour, eggs, panko breadcrumbs, butter, orzo, lemons, feta cheese, parsley", "https://www.foodnetwork.com/recipes/ina-garten/crispy-chicken-with-lemon-orzo-12049023"],
  ["Giada De Laurentiis's Chicken Piccata", "d", 0, 0, 450, "Giada De Laurentiis", "chicken breasts, flour, butter, lemons, chicken broth, capers, parsley", "https://www.foodnetwork.com/recipes/giada-de-laurentiis/chicken-piccata-recipe2-1913809"],
  ["Giada De Laurentiis's Lemon Spaghetti", "ld", 1, 1, 550, "Giada De Laurentiis", "spaghetti, parmesan cheese, lemons, basil", "https://www.foodnetwork.com/recipes/giada-de-laurentiis/lemon-spaghetti-recipe-1915566"],
  ["Rachael Ray's Vodka Cream Pasta", "d", 0, 1, 650, "Rachael Ray", "penne pasta, shallots, garlic, vodka, chicken broth, canned crushed tomatoes, heavy cream, basil", "https://www.foodnetwork.com/recipes/rachael-ray/you-wont-be-single-for-long-vodka-cream-pasta-recipe-1912258"],
  ["Rachael Ray's Pasta with Vodka Sauce & Shrimp", "d", 0, 1, 650, "Rachael Ray", "shrimp, penne pasta, shallots, garlic, vodka, canned crushed tomatoes, heavy cream, basil", "https://www.foodnetwork.com/recipes/rachael-ray/pasta-with-vodka-sauce-and-shrimp-5638998"],
  ["Bobby Flay's Fish Tacos", "ld", 0, 0, 480, "Bobby Flay", "white fish fillets, limes, ancho chili powder, jalapeños, cilantro, tortillas, cabbage", "https://www.foodnetwork.com/recipes/bobby-flay/fish-tacos-recipe-1940773"],
  ["Alton Brown's Baked Macaroni & Cheese", "d", 1, 0, 650, "Alton Brown", "elbow macaroni, butter, flour, milk, cheddar cheese, onions, eggs, panko breadcrumbs, bay leaves", "https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524"],
];

const LOW_CAL_MAX = 450; // a meal counts as low calorie at or under this many kcal

// Ingredients for the starter meals (pantry basics like salt, pepper and oil are left out).
const DEFAULT_INGREDIENTS = {
  'Scrambled eggs & toast': 'eggs, bread, butter',
  'Overnight oats': 'rolled oats, milk, chia seeds, honey, berries',
  'Greek yogurt parfait': 'greek yogurt, granola, berries, honey',
  'Avocado toast': 'bread, avocados, lemons, eggs',
  'Pancakes': 'flour, milk, eggs, butter, maple syrup, baking powder',
  'Waffles with berries': 'flour, milk, eggs, butter, berries, maple syrup, baking powder',
  'Breakfast burrito': 'tortillas, eggs, breakfast sausage, cheddar cheese, salsa, potatoes',
  'Veggie omelette': 'eggs, bell peppers, onions, spinach, cheddar cheese',
  'Banana smoothie bowl': 'bananas, frozen berries, greek yogurt, granola, milk',
  'Bagel & cream cheese': 'bagels, cream cheese',
  'French toast': 'bread, eggs, milk, cinnamon, maple syrup, butter',
  'Bacon, eggs & hash browns': 'bacon, eggs, frozen hash browns',
  'Oatmeal with apples & cinnamon': 'rolled oats, apples, cinnamon, milk, brown sugar',
  'Breakfast sandwich': 'english muffins, eggs, bacon, cheddar cheese',
  'Shakshuka': 'eggs, canned crushed tomatoes, onions, bell peppers, garlic, cumin, paprika, feta cheese, bread',
  'Peanut butter banana toast': 'bread, peanut butter, bananas',
  'Chia pudding': 'chia seeds, milk, maple syrup, berries',
  'Huevos rancheros': 'eggs, tortillas, black beans, salsa, avocados, queso fresco',
  'Egg muffin cups': 'eggs, spinach, bell peppers, cheddar cheese, onions',
  'Granola & milk': 'granola, milk, berries',
  'Turkey club sandwich': 'bread, deli turkey, bacon, lettuce, tomatoes, mayonnaise',
  'Chicken Caesar salad': 'chicken breasts, romaine lettuce, parmesan cheese, croutons, caesar dressing, lemons',
  'Tomato soup & grilled cheese': 'canned tomato soup, bread, cheddar cheese, butter',
  'Chicken wrap': 'tortillas, chicken breasts, lettuce, tomatoes, ranch dressing, cheddar cheese',
  'Quinoa power bowl': 'quinoa, chickpeas, cucumbers, cherry tomatoes, avocados, feta cheese, lemons',
  'Tuna salad sandwich': 'canned tuna, mayonnaise, celery, bread, lettuce',
  'Caprese panini': 'ciabatta bread, fresh mozzarella, tomatoes, basil, pesto',
  'Chicken noodle soup': 'chicken breasts, egg noodles, carrots, celery, onions, chicken broth',
  'Greek salad with pita': 'cucumbers, tomatoes, red onions, kalamata olives, feta cheese, pita bread',
  'Burrito bowl': 'rice, ground beef, black beans, corn, salsa, cheddar cheese, lettuce, sour cream',
  'BLT': 'bacon, lettuce, tomatoes, bread, mayonnaise',
  'Hummus & veggie wrap': 'tortillas, hummus, cucumbers, carrots, spinach, bell peppers',
  'Cobb salad': 'romaine lettuce, chicken breasts, bacon, eggs, avocados, blue cheese, tomatoes',
  'Lentil soup': 'lentils, carrots, celery, onions, garlic, vegetable broth, canned diced tomatoes',
  'Chicken quesadilla': 'tortillas, chicken breasts, cheddar cheese, bell peppers, salsa, sour cream',
  'Egg salad sandwich': 'eggs, mayonnaise, bread, lettuce, mustard',
  'Asian chicken salad': 'chicken breasts, cabbage, carrots, green onions, sesame dressing, almonds',
  'Black bean soup': 'black beans, onions, garlic, vegetable broth, cumin, sour cream',
  'Pasta salad': 'rotini pasta, cherry tomatoes, cucumbers, kalamata olives, italian dressing, mozzarella',
  'Sushi bowl': 'sushi rice, sashimi-grade salmon, cucumbers, avocados, soy sauce, nori',
  'Spaghetti bolognese': 'spaghetti, ground beef, canned crushed tomatoes, onions, garlic, carrots, parmesan cheese',
  'Chicken stir-fry': 'chicken breasts, broccoli, bell peppers, snap peas, soy sauce, garlic, ginger, rice',
  'Tacos': 'ground beef, taco seasoning, taco shells, lettuce, tomatoes, cheddar cheese, sour cream',
  'Baked salmon & roasted vegetables': 'salmon fillets, broccoli, carrots, lemons, garlic',
  'Homemade pizza': 'pizza dough, pizza sauce, mozzarella, bell peppers, mushrooms',
  'Beef chili': 'ground beef, kidney beans, canned diced tomatoes, onions, chili powder, cheddar cheese, sour cream',
  'Chicken fajitas': 'chicken breasts, bell peppers, onions, tortillas, fajita seasoning, sour cream, salsa',
  'Vegetable curry with rice': 'chickpeas, coconut milk, curry paste, potatoes, cauliflower, spinach, onions, rice',
  'Grilled steak & potatoes': 'steaks, potatoes, butter, garlic, green beans',
  'Teriyaki chicken & rice': 'chicken thighs, teriyaki sauce, rice, broccoli, green onions',
  'Shrimp scampi': 'shrimp, linguine, garlic, butter, lemons, parsley, white wine',
  'Lasagna': 'lasagna noodles, ground beef, ricotta cheese, mozzarella, marinara sauce, parmesan cheese, eggs',
  'Mushroom risotto': 'arborio rice, mushrooms, onions, parmesan cheese, vegetable broth, butter, white wine',
  'Burgers & sweet potato fries': 'ground beef, burger buns, cheddar cheese, lettuce, tomatoes, sweet potatoes, ketchup',
  'Pork chops & applesauce': 'pork chops, applesauce, green beans, potatoes',
  'Chicken Alfredo': 'fettuccine, chicken breasts, heavy cream, parmesan cheese, butter, garlic, broccoli',
  'Stuffed bell peppers': 'bell peppers, ground beef, rice, canned diced tomatoes, onions, mozzarella',
  'Veggie fried rice': 'rice, eggs, frozen peas & carrots, green onions, soy sauce, garlic',
  'Sheet-pan chicken & veggies': 'chicken thighs, potatoes, broccoli, red onions, bell peppers, garlic',
  'Beef & broccoli': 'flank steak, broccoli, soy sauce, garlic, ginger, rice, brown sugar',
  'Eggplant parmesan': 'eggplant, marinara sauce, mozzarella, parmesan cheese, breadcrumbs, eggs, spaghetti',
  'Fish tacos': 'white fish fillets, tortillas, cabbage, limes, sour cream, avocados, cilantro',
  'Roast chicken': 'whole chicken, potatoes, carrots, onions, lemons, garlic, thyme',
  'Pad thai': 'rice noodles, chicken breasts, eggs, bean sprouts, peanuts, green onions, limes, pad thai sauce',
  'Chickpea & spinach stew': 'chickpeas, spinach, canned diced tomatoes, onions, garlic, vegetable broth, cumin, bread',
  'Meatloaf & mashed potatoes': 'ground beef, breadcrumbs, eggs, onions, ketchup, potatoes, milk, butter',
  'Pesto pasta with peas': 'penne pasta, pesto, frozen peas, parmesan cheese',
  'BBQ pulled pork sandwiches': 'pork shoulder, bbq sauce, burger buns, coleslaw mix',
  'Black bean enchiladas': 'black beans, tortillas, enchilada sauce, cheddar cheese, onions, corn, sour cream',
  'Lemon garlic shrimp & orzo': 'shrimp, orzo, lemons, garlic, spinach, parmesan cheese',
  'Smoked salmon bagel': 'bagels, cream cheese, smoked salmon, red onions, capers',
  'Smoked salmon scrambled eggs': 'eggs, smoked salmon, chives, bread',
  'Tuna Niçoise salad': 'canned tuna, eggs, green beans, potatoes, kalamata olives, lettuce, dijon mustard',
  'Tuna melt': 'canned tuna, bread, cheddar cheese, mayonnaise',
  "Shrimp po' boy": 'shrimp, hoagie rolls, lettuce, tomatoes, mayonnaise, cornmeal',
  'Cod with lemon & herbs': 'cod fillets, lemons, parsley, butter, garlic, rice, asparagus',
  'Fish & chips': 'white fish fillets, flour, potatoes, frozen peas, tartar sauce',
  'Salmon teriyaki bowl': 'salmon fillets, teriyaki sauce, rice, edamame, cucumbers, green onions',
  'Cajun shrimp pasta': 'shrimp, penne pasta, heavy cream, cajun seasoning, bell peppers, parmesan cheese, garlic',
  'Crab cakes & salad': 'crab meat, breadcrumbs, mayonnaise, eggs, dijon mustard, mixed greens, lemons',
  'Mussels in white wine': 'mussels, white wine, garlic, shallots, butter, parsley, french bread',
  'Shrimp fried rice': 'shrimp, rice, eggs, frozen peas & carrots, green onions, soy sauce',
  'Grilled tilapia & rice': 'tilapia fillets, rice, lemons, zucchini, paprika',
  'Seared tuna steaks': 'tuna steaks, sesame seeds, soy sauce, rice, bok choy',
  'Salmon cakes': 'canned salmon, breadcrumbs, eggs, green onions, lemons, mixed greens',
  'Tofu scramble': 'firm tofu, spinach, bell peppers, onions, nutritional yeast, bread',
  'Vegan overnight oats': 'rolled oats, oat milk, chia seeds, maple syrup, berries',
  'Berry smoothie bowl': 'frozen berries, bananas, oat milk, almond butter, rolled oats',
  'Chickpea salad sandwich': 'chickpeas, vegan mayo, celery, dijon mustard, bread, lettuce',
  'Falafel pita': 'falafel, pita bread, cucumbers, tomatoes, red onions, tahini',
  'Buddha bowl': 'quinoa, sweet potatoes, chickpeas, kale, avocados, tahini, lemons',
  'Tofu stir-fry': 'firm tofu, broccoli, bell peppers, snap peas, soy sauce, garlic, ginger, rice',
  'Lentil bolognese': 'lentils, spaghetti, canned crushed tomatoes, onions, garlic, carrots, celery',
  'Black bean tacos': 'black beans, taco shells, lettuce, salsa, avocados, corn, limes',
  'Vegan chili': 'kidney beans, black beans, canned diced tomatoes, onions, bell peppers, chili powder, corn',
  'Stuffed sweet potatoes': 'sweet potatoes, black beans, corn, salsa, avocados, cilantro',
  'Zucchini noodles with marinara': 'zucchini, marinara sauce, garlic, basil, parmesan cheese',
  'Turkey lettuce wraps': 'ground turkey, butter lettuce, carrots, green onions, soy sauce, garlic, ginger',
  'Cauliflower fried rice': 'cauliflower rice, eggs, frozen peas & carrots, green onions, soy sauce, garlic',
  'Grilled chicken salad': 'chicken breasts, mixed greens, cherry tomatoes, cucumbers, balsamic vinaigrette',
};

// Store aisles for the grocery list. Anything not listed lands in "Other".
const AISLES = [
  ['Produce', 'berries, avocados, lemons, limes, bananas, apples, bell peppers, onions, red onions, spinach, potatoes, garlic, lettuce, romaine lettuce, tomatoes, cherry tomatoes, cucumbers, carrots, celery, basil, cabbage, green onions, broccoli, snap peas, ginger, mushrooms, cauliflower, green beans, sweet potatoes, eggplant, cilantro, thyme, parsley, bean sprouts, chives, asparagus, shallots, zucchini, bok choy, mixed greens, coleslaw mix, kale, butter lettuce, firm tofu, red bell peppers, jalapeños, rosemary, fennel, oregano'],
  ['Meat', 'breakfast sausage, bacon, deli turkey, chicken breasts, chicken thighs, ground beef, steaks, pork chops, flank steak, whole chicken, pork shoulder, ground turkey, chuck roast'],
  ['Fish & seafood', 'smoked salmon, canned tuna, sashimi-grade salmon, shrimp, salmon fillets, white fish fillets, cod fillets, crab meat, mussels, tilapia fillets, tuna steaks, canned salmon'],
  ['Dairy & refrigerated', 'eggs, butter, milk, greek yogurt, cheddar cheese, cream cheese, feta cheese, queso fresco, parmesan cheese, fresh mozzarella, mozzarella, blue cheese, sour cream, ricotta cheese, heavy cream, hummus, oat milk, half-and-half, buttermilk, gruyère cheese, monterey jack cheese'],
  ['Bakery', 'onion rolls, bread, bagels, tortillas, english muffins, ciabatta bread, pita bread, hoagie rolls, burger buns, french bread, taco shells, pizza dough'],
  ['Frozen', 'frozen berries, frozen hash browns, frozen peas & carrots, frozen peas, edamame, falafel, cauliflower rice'],
  ['Pantry', 'rolled oats, chia seeds, honey, granola, flour, maple syrup, baking powder, peanut butter, brown sugar, black beans, chickpeas, canned crushed tomatoes, canned diced tomatoes, canned tomato soup, egg noodles, chicken broth, vegetable broth, quinoa, rice, sushi rice, arborio rice, lentils, kidney beans, coconut milk, spaghetti, linguine, rotini pasta, penne pasta, fettuccine, lasagna noodles, orzo, rice noodles, croutons, almonds, peanuts, kalamata olives, breadcrumbs, applesauce, corn, nori, white wine, sesame seeds, cornmeal, nutritional yeast, almond butter, tahini, steel-cut oats, dried cranberries, dried figs, sugar, baking soda, roasted red peppers, yeast, powdered sugar, maple flavoring, tortilla chips, cream of mushroom soup, red wine, beef broth, tomato paste, panko breadcrumbs, vodka, elbow macaroni'],
  ['Sauces, spices & condiments', 'salsa, mayonnaise, mustard, dijon mustard, caesar dressing, ranch dressing, sesame dressing, italian dressing, pesto, soy sauce, cumin, paprika, cinnamon, taco seasoning, chili powder, fajita seasoning, curry paste, teriyaki sauce, marinara sauce, pizza sauce, ketchup, bbq sauce, enchilada sauce, pad thai sauce, capers, tartar sauce, cajun seasoning, vegan mayo, balsamic vinaigrette, harissa, saffron, seasoned salt, cayenne, red pepper flakes, ancho chili powder, bay leaves'],
];
const AISLE_OF = new Map();
AISLES.forEach(([aisle, list]) => list.split(', ').forEach((i) => AISLE_OF.set(i, aisle)));
const AISLE_ORDER = [...AISLES.map((a) => a[0]), 'Other'];
const SEAFOOD = new Set(AISLES.find((a) => a[0] === 'Fish & seafood')[1].split(', '));
const LIB_VERSION = 4;
// How many starter meals each library version had, so an upgrade only adds meals that are new to that person
// (starter meals they deleted stay deleted). v4 added the Food Network specialty meals after these.
const MEALS_AT_VERSION = { 1: 70, 2: 70, 3: 100, 4: 120 };
// Ingredients that come from animals (used to work out which starter meals are vegan)
const NOT_VEGAN = new Set([
  ...AISLES.filter((a) => a[0] === 'Meat' || a[0] === 'Fish & seafood').flatMap((a) => a[1].split(', ')),
  ...AISLES.find((a) => a[0] === 'Dairy & refrigerated')[1].split(', ').filter((x) => x !== 'hummus' && x !== 'oat milk'),
  'honey', 'mayonnaise', 'caesar dressing', 'ranch dressing', 'pesto', 'tartar sauce', 'egg noodles', 'granola',
]);
const isLowCal = (m) => typeof m.kcal === 'number' && m.kcal > 0 && m.kcal <= LOW_CAL_MAX;
const kcalOf = (name) => findMeal(name)?.kcal || 0;

function parseIngredients(text) {
  const seen = new Set();
  return String(text || '').split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter((x) => x && !seen.has(x) && seen.add(x));
}

function buildDefaultLibrary() {
  const specials = SPECIALTY_MEALS.map(([name, t, veg, quick, kcal, chef, ing, url], i) => {
    const ingredients = parseIngredients(ing);
    return {
      id: 's' + i, name, types: SLOTS.filter((s) => t.includes(s[0])), veg: !!veg, quick: !!quick,
      fish: ingredients.some((x) => SEAFOOD.has(x)),
      vegan: !!veg && !ingredients.some((x) => NOT_VEGAN.has(x)),
      kcal, ingredients, special: true, chef, url,
    };
  });
  return [...buildStarterMeals(), ...specials];
}

function buildStarterMeals() {
  return DEFAULT_MEALS.map(([name, t, veg, quick], i) => {
    const ingredients = parseIngredients(DEFAULT_INGREDIENTS[name]);
    return {
      id: 'd' + i,
      name,
      types: SLOTS.filter((s) => t.includes(s[0])),
      veg: !!veg,
      quick: !!quick,
      fish: ingredients.some((x) => SEAFOOD.has(x)),
      vegan: !!veg && !ingredients.some((x) => NOT_VEGAN.has(x)),
      kcal: DEFAULT_KCAL[name] || 0,
      ingredients,
    };
  });
}

/** Bring a library saved by an older version up to date: add fish/vegan tags,
 *  calories and ingredients to starter meals, and add any new starter meals. */
function migrateLibrary() {
  if (state.libVersion >= LIB_VERSION) return false;
  const defaults = buildDefaultLibrary();
  const byName = new Map(defaults.map((m) => [m.name.toLowerCase(), m]));
  const have = new Set();
  for (const m of state.library) {
    const d = byName.get(m.name.toLowerCase());
    have.add(m.name.toLowerCase());
    if (!Array.isArray(m.ingredients)) m.ingredients = d ? d.ingredients.slice() : [];
    if (typeof m.fish !== 'boolean') m.fish = d ? d.fish : m.ingredients.some((x) => SEAFOOD.has(x));
    if (typeof m.vegan !== 'boolean') m.vegan = d ? d.vegan : !!m.veg && m.ingredients.length > 0 && !m.ingredients.some((x) => NOT_VEGAN.has(x));
    if (typeof m.kcal !== 'number') m.kcal = d ? d.kcal : 0;
    if (d?.special && !m.url) Object.assign(m, { special: true, chef: d.chef, url: d.url });
  }
  const used = new Set(state.library.map((m) => m.id));
  for (const d of defaults.slice(MEALS_AT_VERSION[state.libVersion] || 70)) {
    if (have.has(d.name.toLowerCase())) continue;
    if (used.has(d.id)) d.id = d.id + '-' + Date.now().toString(36);
    state.library.push(d);
  }
  state.libVersion = LIB_VERSION;
  return true;
}

/* ---------------- State ---------------- */

const state = {
  view: 'week',
  cursor: startOfDay(new Date()),
  weekStart: 0,
  plans: {},     // { 'YYYY-MM-DD': { breakfast: {name, note}, ... } }
  library: [],
  libVersion: LIB_VERSION,
  grocery: { checked: {}, extras: [] }, // checked: { 'from_to': [item, ...] }
};

function normalizeGrocery(g) {
  return {
    checked: g && typeof g.checked === 'object' && !Array.isArray(g.checked) ? g.checked : {},
    extras: Array.isArray(g?.extras) ? g.extras.filter((x) => typeof x === 'string') : [],
  };
}

/*
 * Storage. Two modes:
 *  - "local": the plan lives in this browser's localStorage (opening index.html directly).
 *  - "cloud": when the page is hosted as a claude.ai artifact and the viewer is signed in,
 *    each person's plan is saved privately to their own account (db: data/users/<id>/...),
 *    so everyone who opens the shared link gets their own planner that follows them across devices.
 *    Docs: "settings" {library, weekStart} and one "m-YYYY-MM" doc per month {days}.
 */
const store = {
  mode: 'local',
  col: null,
  loaded: false,
  written: new Map(), // docId -> JSON last confirmed in the cloud
  timer: null,
  flushing: false,
  again: false,
  hadLocalData: false,
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (raw) {
      state.plans = raw.plans || {};
      state.library = Array.isArray(raw.library) ? raw.library : buildDefaultLibrary();
      state.weekStart = raw.weekStart === 1 ? 1 : 0;
      if (['day', 'week', 'month'].includes(raw.view)) state.view = raw.view;
      state.libVersion = raw.libVersion || 1;
      state.grocery = normalizeGrocery(raw.grocery);
      migrateLibrary();
      store.hadLocalData = true;
      return;
    }
  } catch (e) { /* storage blocked or corrupt — fall through to defaults */ }
  state.library = buildDefaultLibrary();
}

function saveLocal() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      plans: state.plans,
      library: state.library,
      weekStart: state.weekStart,
      view: state.view,
      libVersion: state.libVersion,
      grocery: state.grocery,
    }));
    return true;
  } catch (e) {
    return false;
  }
}

function save() {
  if (store.mode === 'cloud') {
    // Remember the view locally (a per-browser convenience); data goes to the account.
    clearTimeout(store.timer);
    store.timer = setTimeout(flush, 500);
    setStatus('saving');
  } else if (!saveLocal()) {
    toast('Could not save — browser storage is unavailable');
  }
}

function docsFromState() {
  const docs = { settings: { library: state.library, weekStart: state.weekStart, libVersion: state.libVersion, grocery: state.grocery } };
  for (const [k, v] of Object.entries(state.plans)) {
    const id = 'm-' + k.slice(0, 7);
    (docs[id] = docs[id] || { days: {} }).days[k] = v;
  }
  // Months emptied locally still need writing so the cloud copy is cleared too.
  for (const id of store.written.keys()) if (!docs[id]) docs[id] = { days: {} };
  return docs;
}

async function flush() {
  if (store.mode !== 'cloud') return;
  if (store.flushing) { store.again = true; return; }
  store.flushing = true;
  try {
    for (const [id, body] of Object.entries(docsFromState())) {
      const json = JSON.stringify(body);
      if (store.written.get(id) === json) continue;
      try {
        await store.col.doc(id).set(body);
      } catch (e) {
        if (e?.code !== 'unavailable') throw e;
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));
        await store.col.doc(id).set(body);
      }
      store.written.set(id, json);
    }
    setStatus('cloud');
  } catch (e) {
    if (e?.code === 'quota_exceeded') {
      setStatus('error');
      toast('Your saved plan is full. Erase old months from the ⋯ menu to keep saving.');
    } else if (e?.code === 'invalid_argument' || e?.code === 'revoked' || e?.code === 'not_granted') {
      // This viewer can't write to account storage (e.g. view-only access): keep working in this browser.
      goLocal('This link is view-only for saving, so your plan is kept in this browser.');
    } else {
      setStatus('error');
      toast('Could not save your plan. Check your connection; it will retry on your next change.');
    }
  }
  store.flushing = false;
  if (store.again) { store.again = false; flush(); }
}

function goLocal(msg) {
  store.mode = 'local';
  saveLocal();
  setStatus('local');
  if (msg) toast(msg);
}

function applyRemote(snap) {
  const local = docsFromState();
  const isDirty = (id) => store.written.has(id) && JSON.stringify(local[id]) !== store.written.get(id);

  if (!store.loaded) {
    if (snap.empty) {
      if (snap.metadata.fromCache) return; // wait for the store's definitive answer
      // First visit with this account: keep whatever is on screen (local data or a sample week).
      store.loaded = true;
      if (!store.hadLocalData) seedSampleWeek();
      flush();
      return;
    }
    store.loaded = true;
    state.plans = {};
  }

  let changed = false;
  for (const d of snap.docs) {
    const json = JSON.stringify(d.data());
    if (store.written.get(d.id) === json || isDirty(d.id)) continue;
    const body = JSON.parse(json);
    store.written.set(d.id, json);
    changed = true;
    if (d.id === 'settings') {
      if (Array.isArray(body.library)) state.library = body.library;
      state.weekStart = body.weekStart === 1 ? 1 : 0;
      state.libVersion = body.libVersion || 1;
      state.grocery = normalizeGrocery(body.grocery);
      if (migrateLibrary()) save();
    } else if (d.id.startsWith('m-')) {
      const month = d.id.slice(2);
      for (const k of Object.keys(state.plans)) if (k.startsWith(month)) delete state.plans[k];
      Object.assign(state.plans, body.days || {});
    }
  }
  if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites && !store.timer && !store.flushing) setStatus('cloud');
  if (changed) render();
}

async function connectCloud() {
  const c = window.claude;
  if (!c || typeof c.use !== 'function') return false;
  setStatus('loading');
  const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
  const uid = db && user ? await user.id() : null;
  if (!uid) return false;
  store.col = db.collection('data/users/' + uid);
  store.mode = 'cloud';
  const slow = setTimeout(() => { if (!store.loaded) setStatus('slow'); }, 10000);
  store.col.onSnapshot((snap) => {
    if (!snap.metadata.fromCache) clearTimeout(slow);
    applyRemote(snap);
  }, () => {
    clearTimeout(slow);
    goLocal(store.loaded ? 'Lost connection to your saved plan; changes are now kept in this browser.' : null);
  });
  return true;
}

const STATUS_TEXT = {
  loading: ['Loading your plan…', 'busy'],
  slow: ["Can't reach your saved plan yet", 'warn'],
  saving: ['Saving…', 'busy'],
  cloud: ['Saved to your account', 'ok'],
  local: ['Saved in this browser', 'ok'],
  error: ['Not saved', 'warn'],
};
function setStatus(kind) {
  const el = document.getElementById('save-status');
  if (!el) return;
  if (kind === 'cloud' || kind === 'error') store.timer = null;
  const [text, tone] = STATUS_TEXT[kind];
  el.textContent = text;
  el.dataset.tone = tone;
}

function seedSampleWeek() {
  const [from, to] = currentRange('week');
  generate({ from, to, slots: SLOTS, onlyEmpty: true, noRepeat: 5, quiet: true });
  toast('Here’s a sample week to start. Tap any meal to change it.');
}

/* ---------------- Date helpers ---------------- */

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function key(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function sameDay(a, b) { return key(a) === key(b); }
function startOfWeek(d) { return addDays(d, -((d.getDay() - state.weekStart + 7) % 7)); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function daysBetween(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);

function currentRange(view = state.view) {
  const c = state.cursor;
  if (view === 'day') return [c, c];
  if (view === 'week') { const s = startOfWeek(c); return [s, addDays(s, 6)]; }
  return [startOfMonth(c), endOfMonth(c)];
}

/* ---------------- Plan access ---------------- */

function getMeal(dateKey, slot) { return state.plans[dateKey]?.[slot] || null; }
function setMeal(dateKey, slot, meal) {
  if (meal && meal.name) {
    state.plans[dateKey] = state.plans[dateKey] || {};
    state.plans[dateKey][slot] = { name: meal.name, note: meal.note || '' };
  } else if (state.plans[dateKey]) {
    delete state.plans[dateKey][slot];
    if (!Object.keys(state.plans[dateKey]).length) delete state.plans[dateKey];
  }
}

/* ---------------- Rendering ---------------- */

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slotButton(dateKey, slot) {
  const m = getMeal(dateKey, slot);
  return `<button class="slot ${m ? 'filled' : ''}" data-slot="${slot}" data-date="${dateKey}">
    <span class="label">${SLOT_LABEL[slot]}</span>
    <span class="name ${m ? '' : 'empty'}">${m ? esc(m.name) + (findMeal(m.name)?.special ? ' <span class="star" title="Food Network specialty">⭐</span>' : '') : 'Add a meal'}</span>
    ${m && (m.note || kcalOf(m.name)) ? `<span class="note">${[m.note, kcalOf(m.name) ? `~${kcalOf(m.name)} kcal` : ''].filter(Boolean).map(esc).join(' · ')}</span>` : ''}
  </button>`;
}

function dayKcal(dateKey) {
  return SLOTS.reduce((n, s) => { const m = getMeal(dateKey, s); return n + (m ? kcalOf(m.name) : 0); }, 0);
}
function kcalLabel(n) { return n ? `~${n.toLocaleString()} kcal` : '';
}

function render() {
  document.querySelectorAll('.view-switch button').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === state.view));

  const [from, to] = currentRange();
  const today = startOfDay(new Date());
  const title = $('#period-title');

  if (state.view === 'day') {
    title.textContent = fmt(state.cursor, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const k = key(state.cursor);
    const total = dayKcal(k);
    view.innerHTML = `<div class="day-view">
      ${SLOTS.map((s) => slotButton(k, s)).join('')}
      ${total ? `<p class="day-kcal">Day total: <strong>${kcalLabel(total)}</strong> <span class="muted">(estimate)</span></p>` : ''}
      <div class="day-tools">
        <button data-action="gen-day" class="primary">✨ Generate this day</button>
        <button data-action="grocery-day">🛒 Grocery list for this day</button>
        <button data-action="clear-day" class="danger">Clear day</button>
      </div>
    </div>`;
  } else if (state.view === 'week') {
    const sameMonth = from.getMonth() === to.getMonth();
    title.textContent = sameMonth
      ? `${fmt(from, { month: 'long', day: 'numeric' })} – ${to.getDate()}, ${to.getFullYear()}`
      : `${fmt(from, { month: 'short', day: 'numeric' })} – ${fmt(to, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    view.innerHTML = `<div class="week-view">${daysBetween(from, to).map((d) => {
      const k = key(d);
      return `<section class="week-day ${sameDay(d, today) ? 'today' : ''}">
        <header><a href="#" data-goto="${k}">${fmt(d, { weekday: 'short' })}</a><span class="dnum">${fmt(d, { month: 'short', day: 'numeric' })}</span></header>
        ${SLOTS.map((s) => slotButton(k, s)).join('')}
        ${dayKcal(k) ? `<span class="wk-kcal">${kcalLabel(dayKcal(k))}</span>` : ''}
      </section>`;
    }).join('')}</div>`;
  } else {
    title.textContent = fmt(state.cursor, { month: 'long', year: 'numeric' });
    const gridStart = startOfWeek(from);
    const gridEnd = addDays(startOfWeek(to), 6);
    const dows = daysBetween(gridStart, addDays(gridStart, 6)).map((d) =>
      `<div class="month-dow">${fmt(d, { weekday: 'short' })}</div>`).join('');
    const cells = daysBetween(gridStart, gridEnd).map((d) => {
      const k = key(d);
      const cls = [d.getMonth() !== from.getMonth() && 'other', sameDay(d, today) && 'today'].filter(Boolean).join(' ');
      const minis = SLOTS.map((s) => {
        const m = getMeal(k, s);
        return m ? `<span class="mini" data-slot="${s}" title="${SLOT_LABEL[s]}: ${esc(m.name)}">${esc(m.name)}</span>` : '';
      }).join('');
      const dots = SLOTS.map((s) => `<i data-slot="${s}" class="${getMeal(k, s) ? '' : 'off'}"></i>`).join('');
      return `<button class="month-cell ${cls}" data-goto="${k}">
        <span class="dnum">${d.getDate()}</span>${minis}<span class="dots">${dots}</span>
      </button>`;
    }).join('');
    view.innerHTML = `<div class="month-view">${dows}${cells}</div>`;
  }

  // Stats: how many slots are planned in the visible range
  const days = daysBetween(from, to);
  const filled = days.reduce((n, d) => n + SLOTS.filter((s) => getMeal(key(d), s)).length, 0);
  $('#period-stats').textContent = `${filled} / ${days.length * 3} meals planned`;
}

/* ---------------- Navigation ---------------- */

function shift(dir) {
  const c = state.cursor;
  if (state.view === 'day') state.cursor = addDays(c, dir);
  else if (state.view === 'week') state.cursor = addDays(c, 7 * dir);
  else {
    // Keep day-of-month in range when moving months
    const target = new Date(c.getFullYear(), c.getMonth() + dir, 1);
    const last = endOfMonth(target).getDate();
    state.cursor = new Date(target.getFullYear(), target.getMonth(), Math.min(c.getDate(), last));
  }
  render();
}

function setView(v) { state.view = v; save(); render(); }

/* ---------------- Meal generator ---------------- */

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * Fill each requested slot in [from, to] with a meal from the library.
 * - Respects filters (vegetarian / quick).
 * - Avoids repeating the same meal within `noRepeat` days (looking at
 *   both existing plans and meals chosen during this run).
 * - Falls back to the least-recently-used option if the library is too small.
 */
function generate({ from, to, slots, onlyEmpty = true, specials = 'mix', diet = 'any', quick = false, fish = 'any', lowCal = false, noRepeat = 5, leftovers = false, quiet = false }) {
  const dietOk = (m) => diet === 'any' || (diet === 'vegan' ? m.vegan : diet === 'pescatarian' ? (m.veg || m.fish) : m.veg);
  const pool = state.library.filter((m) => (specials === 'only' ? m.special : specials === 'none' ? !m.special : true) && dietOk(m) && (!quick || m.quick) && (!lowCal || isLowCal(m))
    && (fish === 'any' || (fish === 'only' ? m.fish : !m.fish)));
  let count = 0;
  const missing = new Set();

  // Last date (as day index) each meal name was used, seeded with plans before the range
  const lastUsed = new Map();
  const dayIndex = (d) => Math.round(d.getTime() / 86400000);
  const lookback = addDays(from, -Math.max(noRepeat, 1));
  for (const d of daysBetween(lookback, addDays(from, -1))) {
    for (const s of SLOTS) {
      const m = getMeal(key(d), s);
      if (m) lastUsed.set(m.name.toLowerCase(), dayIndex(d));
    }
  }

  for (const d of daysBetween(from, to)) {
    const k = key(d);
    const di = dayIndex(d);
    // Count meals already on this day so we don't duplicate within the day
    const todays = new Set(SLOTS.map((s) => getMeal(k, s)?.name.toLowerCase()).filter(Boolean));

    for (const slot of SLOTS) {
      const existing = getMeal(k, slot);
      if (!slots.includes(slot) || (onlyEmpty && existing)) {
        if (existing) lastUsed.set(existing.name.toLowerCase(), di);
        continue;
      }
      if (existing) todays.delete(existing.name.toLowerCase());

      // Leftovers: reuse yesterday's dinner for lunch
      if (leftovers && slot === 'lunch') {
        const y = getMeal(key(addDays(d, -1)), 'dinner');
        if (y) {
          setMeal(k, slot, { name: y.name, note: 'Leftovers' });
          todays.add(y.name.toLowerCase());
          count++;
          continue;
        }
      }

      const candidates = pool.filter((m) => m.types.includes(slot) && !todays.has(m.name.toLowerCase()));
      if (!candidates.length) { missing.add(slot); continue; }

      const fresh = candidates.filter((m) => {
        const last = lastUsed.get(m.name.toLowerCase());
        return last === undefined || di - last > noRepeat;
      });
      let choice;
      // "Mix some in": about one meal in four comes from the specialty recipes when one fits
      const freshSpecial = fresh.filter((m) => m.special);
      if (specials === 'mix' && freshSpecial.length && Math.random() < 0.25) choice = pick(freshSpecial);
      else if (fresh.length) choice = pick(specials === 'mix' && fresh.some((m) => !m.special) ? fresh.filter((m) => !m.special) : fresh);
      else {
        // Least recently used
        const oldest = Math.min(...candidates.map((m) => lastUsed.get(m.name.toLowerCase()) ?? -Infinity));
        choice = pick(candidates.filter((m) => (lastUsed.get(m.name.toLowerCase()) ?? -Infinity) === oldest));
      }

      setMeal(k, slot, { name: choice.name });
      lastUsed.set(choice.name.toLowerCase(), di);
      todays.add(choice.name.toLowerCase());
      count++;
    }
  }
  save();
  render();
  if (quiet) return;
  let msg = count ? `Generated ${count} meal${count === 1 ? '' : 's'} ✨` : 'Nothing to fill — all slots already planned';
  if (missing.size) msg += ` (no ${[...missing].join('/')} options match your filters)`;
  toast(msg);
}

function clearRange(from, to, slots = SLOTS) {
  for (const d of daysBetween(from, to)) for (const s of slots) setMeal(key(d), s, null);
  save();
  render();
}

/* ---------------- Slot editor dialog ---------------- */

const dlgSlot = $('#dlg-slot');
let editing = null;

function openSlot(dateKey, slot) {
  editing = { dateKey, slot };
  const m = getMeal(dateKey, slot);
  $('#slot-title').textContent = `${SLOT_LABEL[slot]} · ${fmt(parseKey(dateKey), { weekday: 'long', month: 'short', day: 'numeric' })}`;
  $('#slot-name').value = m?.name || '';
  $('#slot-note').value = m?.note || '';
  updateRecipeLink();
  const options = state.library.filter((x) => x.types.includes(slot)).sort((a, b) => a.name.localeCompare(b.name));
  $('#slot-options').innerHTML = options.map((o) => `<option value="${esc(o.name)}"></option>`).join('');
  // Show a handful of random suggestions as one-tap chips
  const shuffled = options.slice().sort(() => Math.random() - 0.5).slice(0, 8);
  $('#slot-suggestions').innerHTML = shuffled.map((o) => `<button type="button" data-suggest="${esc(o.name)}">${esc(o.name)}</button>`).join('');
  dlgSlot.showModal();
  $('#slot-name').focus();
}

function updateRecipeLink() {
  const lib = findMeal($('#slot-name').value.trim());
  const a = $('#slot-recipe');
  a.hidden = !lib?.url;
  if (lib?.url) { a.href = lib.url; a.textContent = `View ${lib.chef ? lib.chef + '’s' : 'the'} recipe on foodnetwork.com ↗`; }
}
$('#slot-name').addEventListener('input', updateRecipeLink);
$('#slot-suggestions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-suggest]');
  if (b) { $('#slot-name').value = b.dataset.suggest; updateRecipeLink(); }
});
$('#slot-random').addEventListener('click', () => {
  const opts = state.library.filter((x) => x.types.includes(editing.slot) && x.name !== $('#slot-name').value);
  if (opts.length) $('#slot-name').value = pick(opts).name;
  updateRecipeLink();
});
$('#slot-clear').addEventListener('click', () => {
  setMeal(editing.dateKey, editing.slot, null);
  save(); render(); dlgSlot.close();
});
dlgSlot.addEventListener('close', () => {
  if (dlgSlot.returnValue === 'save' && editing) {
    const name = $('#slot-name').value.trim();
    setMeal(editing.dateKey, editing.slot, name ? { name, note: $('#slot-note').value.trim() } : null);
    save(); render();
  }
  dlgSlot.returnValue = '';
  editing = null;
});

/* ---------------- Generator dialog ---------------- */

const dlgGen = $('#dlg-generate');
const formGen = $('#form-generate');

function openGenerator(range = state.view) {
  formGen.range.value = range;
  const [from, to] = currentRange(range === 'custom' ? 'week' : range);
  formGen.from.value = key(from);
  formGen.to.value = key(to);
  syncCustom();
  dlgGen.showModal();
}
function syncCustom() {
  $('.custom-range', formGen).classList.toggle('show', formGen.range.value === 'custom');
}
formGen.addEventListener('change', (e) => {
  if (e.target.name === 'range') {
    syncCustom();
    if (e.target.value !== 'custom') {
      const [f, t] = currentRange(e.target.value);
      formGen.from.value = key(f); formGen.to.value = key(t);
    }
  }
});

function genRange() {
  if (formGen.range.value === 'custom') {
    if (!formGen.from.value || !formGen.to.value) return null;
    let f = parseKey(formGen.from.value), t = parseKey(formGen.to.value);
    if (f > t) [f, t] = [t, f];
    if ((t - f) / 86400000 > 366) { toast('Please choose a range of a year or less'); return null; }
    return [f, t];
  }
  return currentRange(formGen.range.value);
}
function genSlots() {
  return [...formGen.querySelectorAll('input[name=slot]:checked')].map((i) => i.value);
}

dlgGen.addEventListener('close', () => {
  if (dlgGen.returnValue !== 'go') return;
  dlgGen.returnValue = '';
  const r = genRange();
  const slots = genSlots();
  if (!r) return;
  if (!slots.length) { toast('Pick at least one meal to generate'); return; }
  generate({
    from: r[0], to: r[1], slots,
    onlyEmpty: formGen.onlyEmpty.checked,
    diet: formGen.diet.value,
    specials: formGen.specials.value,
    quick: formGen.quick.checked,
    fish: formGen.fish.value,
    lowCal: formGen.lowCal.checked,
    noRepeat: Math.max(0, Math.min(30, parseInt(formGen.noRepeat.value, 10) || 0)),
    leftovers: formGen.leftovers.checked,
  });
});
$('#gen-clear').addEventListener('click', async () => {
  const r = genRange();
  const slots = genSlots();
  if (!r || !slots.length) return;
  dlgGen.close();
  if (!(await ask('Clear the selected meals in this range?', 'Clear meals'))) return;
  clearRange(r[0], r[1], slots);
  toast('Meals cleared');
});

/* ---------------- Library dialog ---------------- */

const dlgLib = $('#dlg-library');
const formAdd = $('#form-add-meal');

function renderLibrary() {
  const q = $('#lib-search').value.trim().toLowerCase();
  const t = $('#lib-type').value;
  const tag = $('#lib-tag').value;
  const items = state.library
    .filter((m) => (!q || m.name.toLowerCase().includes(q) || (m.ingredients || []).some((i) => i.includes(q)))
      && (!t || m.types.includes(t))
      && (!tag || (tag === 'nofish' ? !m.fish : tag === 'lowcal' ? isLowCal(m) : m[tag])))
    .sort((a, b) => a.name.localeCompare(b.name));
  $('#lib-list').innerHTML = items.length ? items.map((m) => `<li>
      <span class="n">${esc(m.name)}${m.vegan ? ' 🌱' : m.veg ? ' 🥦' : ''}${m.fish ? ' 🐟' : ''}${m.quick ? ' ⚡' : ''}${isLowCal(m) ? ' 🪶' : ''}${m.special ? ' ⭐' : ''}${m.kcal ? ` <span class="kc">~${m.kcal} kcal</span>` : ''}
        <small class="ing">${m.ingredients?.length ? esc(m.ingredients.join(', ')) : 'No ingredients yet'}${m.url ? ` · <a href="${esc(m.url)}" target="_blank" rel="noopener">Recipe ↗</a>` : ''}</small></span>
      ${m.types.map((s) => `<span class="tag ${s}">${s[0].toUpperCase()}</span>`).join('')}
      <button data-edit="${esc(m.id)}" aria-label="Edit ${esc(m.name)}">✎</button>
      <button data-del="${esc(m.id)}" aria-label="Remove ${esc(m.name)}">✕</button>
    </li>`).join('') : '<li class="muted">No meals found</li>';
}

formAdd.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = formAdd.name.value.trim();
  const types = [...formAdd.querySelectorAll('input[name=type]:checked')].map((i) => i.value);
  if (!name) return;
  if (!types.length) { toast('Choose breakfast, lunch and/or dinner'); return; }
  const editingId = formAdd.dataset.editing;
  if (state.library.some((m) => m.id !== editingId && m.name.toLowerCase() === name.toLowerCase())) { toast('That meal is already in your library'); return; }
  const vegan = formAdd.vegan.checked;
  const kcal = Math.max(0, Math.min(5000, parseInt(formAdd.kcal.value, 10) || 0));
  const fields = { name, types, veg: formAdd.veg.checked || vegan, vegan, quick: formAdd.quick.checked, fish: formAdd.fish.checked,
    kcal, ingredients: parseIngredients(formAdd.ingredients.value) };
  const existing = editingId && state.library.find((m) => m.id === editingId);
  if (existing) {
    // Keep planned meals pointing at the renamed meal
    if (existing.name !== name) {
      for (const day of Object.values(state.plans)) for (const s of SLOTS) if (day[s]?.name === existing.name) day[s].name = name;
    }
    Object.assign(existing, fields);
    toast(`Saved “${name}”`);
  } else {
    state.library.push({ id: 'u' + Date.now().toString(36), ...fields });
    toast(`Added “${name}”`);
  }
  save();
  resetMealForm();
  renderLibrary();
  render();
});

function resetMealForm() {
  formAdd.reset();
  delete formAdd.dataset.editing;
  $('#meal-form-submit').textContent = 'Add meal';
  $('#meal-form-cancel').hidden = true;
}
$('#meal-form-cancel').addEventListener('click', resetMealForm);
formAdd.vegan.addEventListener('change', () => { if (formAdd.vegan.checked) formAdd.veg.checked = true; });
// Typing seafood into the ingredients ticks the fish box for you
formAdd.ingredients.addEventListener('input', () => {
  if (parseIngredients(formAdd.ingredients.value).some((x) => SEAFOOD.has(x))) formAdd.fish.checked = true;
});

function editMeal(id) {
  const m = state.library.find((x) => x.id === id);
  if (!m) return;
  formAdd.dataset.editing = id;
  formAdd.name.value = m.name;
  formAdd.querySelectorAll('input[name=type]').forEach((i) => { i.checked = m.types.includes(i.value); });
  formAdd.veg.checked = !!m.veg;
  formAdd.quick.checked = !!m.quick;
  formAdd.fish.checked = !!m.fish;
  formAdd.vegan.checked = !!m.vegan;
  formAdd.kcal.value = m.kcal || '';
  formAdd.ingredients.value = (m.ingredients || []).join(', ');
  $('#meal-form-submit').textContent = 'Save changes';
  $('#meal-form-cancel').hidden = false;
  formAdd.name.focus();
}

function openLibrary({ search = '', editName = null } = {}) {
  resetMealForm();
  $('#lib-search').value = search;
  renderLibrary();
  if (!dlgLib.open) dlgLib.showModal();
  if (editName) {
    const m = findMeal(editName);
    if (m) editMeal(m.id);
    else { formAdd.name.value = editName; formAdd.ingredients.focus(); }
  }
}
$('#lib-list').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-edit]');
  if (ed) { editMeal(ed.dataset.edit); return; }
  const b = e.target.closest('[data-del]');
  if (!b) return;
  state.library = state.library.filter((m) => m.id !== b.dataset.del);
  save();
  renderLibrary();
});
$('#lib-search').addEventListener('input', renderLibrary);
$('#lib-type').addEventListener('change', renderLibrary);
$('#lib-tag').addEventListener('change', renderLibrary);

/* ---------------- More / settings ---------------- */

const dlgMore = $('#dlg-more');
$('#opt-weekstart').addEventListener('change', (e) => {
  state.weekStart = Number(e.target.value);
  save(); render();
});
$('#btn-export').addEventListener('click', async () => {
  const json = JSON.stringify({ plans: state.plans, library: state.library, weekStart: state.weekStart, libVersion: state.libVersion, grocery: state.grocery }, null, 2);
  const filename = `meal-plan-${key(new Date())}.json`;
  if (window.claude?.use) {
    const dl = await window.claude.use('downloads');
    if (dl) {
      try { await dl.save({ filename, data: json }); } catch (e) {
        if (e?.code !== 'declined') toast('Could not save the backup file here.');
      }
    } else {
      toast('Backups can’t be downloaded in this view.');
    }
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (typeof data.plans !== 'object' || !Array.isArray(data.library)) throw new Error('bad file');
    state.plans = data.plans;
    state.library = data.library;
    if (data.weekStart === 0 || data.weekStart === 1) state.weekStart = data.weekStart;
    state.libVersion = data.libVersion || 1;
    state.grocery = normalizeGrocery(data.grocery);
    migrateLibrary();
    save(); render();
    dlgMore.close();
    toast('Backup imported');
  } catch {
    toast('That file is not a valid meal plan backup');
  }
  e.target.value = '';
});
$('#btn-reset-lib').addEventListener('click', async () => {
  dlgMore.close();
  if (!(await ask('Replace your meal library with the default meals? Your planned meals are kept.', 'Restore defaults'))) return;
  state.library = buildDefaultLibrary();
  state.libVersion = LIB_VERSION;
  save();
  toast('Default library restored');
});
$('#btn-wipe').addEventListener('click', async () => {
  dlgMore.close();
  if (!(await ask('Erase every planned meal? This cannot be undone.', 'Erase all'))) return;
  state.plans = {};
  save(); render();
  toast('All planned meals erased');
});

/* ---------------- Global events ---------------- */

document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
// Click on the backdrop closes a dialog
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

document.querySelector('.view-switch').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (b) setView(b.dataset.view);
});
$('#btn-prev').addEventListener('click', () => shift(-1));
$('#btn-next').addEventListener('click', () => shift(1));
$('#btn-today').addEventListener('click', () => { state.cursor = startOfDay(new Date()); render(); });
$('#btn-generate').addEventListener('click', () => openGenerator());
$('#btn-library').addEventListener('click', () => openLibrary());
$('#btn-grocery').addEventListener('click', () => openGrocery());
$('#btn-more').addEventListener('click', () => { $('#opt-weekstart').value = String(state.weekStart); dlgMore.showModal(); });

view.addEventListener('click', (e) => {
  const slot = e.target.closest('.slot');
  if (slot) { openSlot(slot.dataset.date, slot.dataset.slot); return; }
  const go = e.target.closest('[data-goto]');
  if (go) { e.preventDefault(); state.cursor = parseKey(go.dataset.goto); setView('day'); return; }
  const act = e.target.closest('[data-action]');
  if (act?.dataset.action === 'gen-day') {
    generate({ from: state.cursor, to: state.cursor, slots: SLOTS, onlyEmpty: true, noRepeat: 5 });
  } else if (act?.dataset.action === 'grocery-day') {
    openGrocery('day');
  } else if (act?.dataset.action === 'clear-day') {
    clearRange(state.cursor, state.cursor);
  }
});

// Keyboard shortcuts (ignored while typing or when a dialog is open)
document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const map = { ArrowLeft: () => shift(-1), ArrowRight: () => shift(1), t: () => $('#btn-today').click(),
    d: () => setView('day'), w: () => setView('week'), m: () => setView('month'), g: () => openGenerator(), l: () => openGrocery() };
  if (map[e.key]) { e.preventDefault(); map[e.key](); }
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ---------------- Grocery list ---------------- */

const dlgGro = $('#dlg-grocery');
const gro = { range: 'week', from: null, to: null };

function findMeal(name) {
  const n = String(name).toLowerCase();
  return state.library.find((m) => m.name.toLowerCase() === n) || null;
}

function groceryRange() {
  if (gro.range === 'custom' && gro.from && gro.to) {
    let f = parseKey(gro.from), t = parseKey(gro.to);
    if (f > t) [f, t] = [t, f];
    return [f, t];
  }
  return currentRange(gro.range === 'day' ? 'day' : 'week');
}

/** Gather ingredients for every planned meal in [from, to].
 *  Leftover meals are skipped, since their groceries were bought for the original dinner. */
function buildGroceryList(from, to) {
  const items = new Map(); // ingredient -> Set(meal names)
  const missing = new Set();
  let meals = 0, leftovers = 0;
  for (const d of daysBetween(from, to)) {
    for (const s of SLOTS) {
      const m = getMeal(key(d), s);
      if (!m) continue;
      if (/^leftovers?$/i.test(m.note || '')) { leftovers++; continue; }
      meals++;
      const lib = findMeal(m.name);
      if (!lib || !lib.ingredients?.length) { missing.add(m.name); continue; }
      for (const ing of lib.ingredients) {
        if (!items.has(ing)) items.set(ing, new Set());
        items.get(ing).add(lib.name);
      }
    }
  }
  const counts = new Map();
  for (const d of daysBetween(from, to)) for (const s of SLOTS) {
    const m = getMeal(key(d), s);
    if (m && !/^leftovers?$/i.test(m.note || '')) counts.set(m.name.toLowerCase(), (counts.get(m.name.toLowerCase()) || 0) + 1);
  }
  const groups = new Map(AISLE_ORDER.map((a) => [a, []]));
  for (const [ing, mealSet] of items) {
    const times = [...mealSet].reduce((n, name) => n + (counts.get(name.toLowerCase()) || 1), 0);
    groups.get(AISLE_OF.get(ing) || 'Other').push({ name: ing, meals: [...mealSet].sort(), times });
  }
  for (const list of groups.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return { groups, missing: [...missing].sort(), meals, leftovers };
}

function groKey(from, to) { return key(from) + '_' + key(to); }
function checkedSet(from, to) { return new Set(state.grocery.checked[groKey(from, to)] || []); }
function setChecked(from, to, set) {
  const k = groKey(from, to);
  if (set.size) state.grocery.checked[k] = [...set];
  else delete state.grocery.checked[k];
  // Keep only the 12 most recent lists' check marks
  const keys = Object.keys(state.grocery.checked).sort();
  while (keys.length > 12) delete state.grocery.checked[keys.shift()];
  save();
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function renderGrocery() {
  const [from, to] = groceryRange();
  const { groups, missing, meals, leftovers } = buildGroceryList(from, to);
  const checked = checkedSet(from, to);
  dlgGro.querySelectorAll('[data-gro-range]').forEach((b) => b.classList.toggle('active', b.dataset.groRange === gro.range));
  $('.gro-custom', dlgGro).hidden = gro.range !== 'custom';

  const label = sameDay(from, to)
    ? fmt(from, { weekday: 'long', month: 'short', day: 'numeric' })
    : `${fmt(from, { weekday: 'short', month: 'short', day: 'numeric' })} – ${fmt(to, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  let total = 0, done = 0;
  const sections = [];
  for (const [aisle, list] of groups) {
    if (!list.length) continue;
    total += list.length;
    sections.push(`<section class="gro-aisle"><h4>${esc(aisle)}</h4><ul>${list.map((it) => {
      const on = checked.has(it.name);
      if (on) done++;
      return `<li class="${on ? 'done' : ''}"><label><input type="checkbox" data-item="${esc(it.name)}" ${on ? 'checked' : ''} />
        <span class="gi"><span class="gn">${esc(cap(it.name))}</span>${it.times > 1 ? `<span class="gc">×${it.times}</span>` : ''}
        <small>${esc(it.meals.join(', '))}</small></span></label></li>`;
    }).join('')}</ul></section>`);
  }
  const extras = state.grocery.extras;
  if (extras.length) {
    total += extras.length;
    sections.push(`<section class="gro-aisle"><h4>Also buy</h4><ul>${extras.map((x, i) => {
      const on = checked.has('+' + x);
      if (on) done++;
      return `<li class="${on ? 'done' : ''}"><label><input type="checkbox" data-item="${esc('+' + x)}" ${on ? 'checked' : ''} />
        <span class="gi"><span class="gn">${esc(cap(x))}</span></span></label>
        <button type="button" class="gro-x" data-extra-del="${i}" aria-label="Remove ${esc(x)}">✕</button></li>`;
    }).join('')}</ul></section>`);
  }

  $('#gro-summary').textContent = meals
    ? `${label} · ${meals} meal${meals === 1 ? '' : 's'} · ${total} item${total === 1 ? '' : 's'}${done ? ` · ${done} checked off` : ''}${leftovers ? ` · ${leftovers} leftover meal${leftovers === 1 ? '' : 's'} skipped` : ''}`
    : `${label} · no meals planned yet`;
  $('#gro-list').innerHTML = sections.length ? sections.join('') : `<p class="gro-empty">Nothing to buy yet. Plan some meals for ${sameDay(from, to) ? 'this day' : 'these days'} (or use ✨ Generate meals), and their ingredients show up here.</p>`;
  $('#gro-missing').innerHTML = missing.length
    ? `<p><strong>No ingredients saved for:</strong> ${missing.map((n) => `<button type="button" class="linkish" data-add-ing="${esc(n)}">${esc(n)}</button>`).join(', ')}. Tap a meal to add its ingredients.</p>`
    : '';
}

function openGrocery(range) {
  gro.range = range || (state.view === 'day' ? 'day' : 'week');
  const [f, t] = currentRange(gro.range === 'day' ? 'day' : 'week');
  gro.from = gro.from || key(f);
  gro.to = gro.to || key(t);
  $('#gro-from').value = gro.from;
  $('#gro-to').value = gro.to;
  renderGrocery();
  dlgGro.showModal();
}

dlgGro.addEventListener('click', async (e) => {
  const r = e.target.closest('[data-gro-range]');
  if (r) {
    gro.range = r.dataset.groRange;
    if (gro.range !== 'custom') {
      const [f, t] = currentRange(gro.range);
      gro.from = key(f); gro.to = key(t);
      $('#gro-from').value = gro.from; $('#gro-to').value = gro.to;
    }
    renderGrocery();
    return;
  }
  const del = e.target.closest('[data-extra-del]');
  if (del) {
    state.grocery.extras.splice(Number(del.dataset.extraDel), 1);
    save(); renderGrocery();
    return;
  }
  const add = e.target.closest('[data-add-ing]');
  if (add) {
    dlgGro.close();
    openLibrary({ editName: add.dataset.addIng });
  }
});
$('#gro-list').addEventListener('change', (e) => {
  const cb = e.target.closest('[data-item]');
  if (!cb) return;
  const [from, to] = groceryRange();
  const set = checkedSet(from, to);
  if (cb.checked) set.add(cb.dataset.item); else set.delete(cb.dataset.item);
  setChecked(from, to, set);
  renderGrocery();
});
['#gro-from', '#gro-to'].forEach((id) => $(id).addEventListener('change', () => {
  gro.from = $('#gro-from').value; gro.to = $('#gro-to').value;
  if (gro.from && gro.to && Math.abs(parseKey(gro.to) - parseKey(gro.from)) / 86400000 > 62) {
    toast('Please choose a range of two months or less');
    return;
  }
  renderGrocery();
}));
$('#gro-add').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#gro-extra').value.trim();
  if (!v) return;
  if (!state.grocery.extras.some((x) => x.toLowerCase() === v.toLowerCase())) state.grocery.extras.push(v);
  $('#gro-extra').value = '';
  save(); renderGrocery();
});
$('#gro-uncheck').addEventListener('click', () => {
  const [from, to] = groceryRange();
  setChecked(from, to, new Set());
  renderGrocery();
});
$('#gro-copy').addEventListener('click', () => {
  const [from, to] = groceryRange();
  const { groups } = buildGroceryList(from, to);
  const checked = checkedSet(from, to);
  const lines = [`Grocery list · ${fmt(from, { month: 'short', day: 'numeric' })}${sameDay(from, to) ? '' : ' – ' + fmt(to, { month: 'short', day: 'numeric' })}`];
  for (const [aisle, list] of groups) {
    const left = list.filter((it) => !checked.has(it.name));
    if (!left.length) continue;
    lines.push('', aisle.toUpperCase(), ...left.map((it) => `☐ ${cap(it.name)}${it.times > 1 ? ` (×${it.times})` : ''}`));
  }
  const extras = state.grocery.extras.filter((x) => !checked.has('+' + x));
  if (extras.length) lines.push('', 'ALSO BUY', ...extras.map((x) => `☐ ${cap(x)}`));
  const text = lines.join('\n');
  const fallback = () => {
    const ta = $('#gro-text');
    ta.hidden = false;
    ta.value = text;
    ta.focus();
    ta.select();
    toast('Select all and copy the list below');
  };
  try {
    navigator.clipboard.writeText(text).then(() => toast('Grocery list copied'), fallback);
  } catch { fallback(); }
});
dlgGro.addEventListener('close', () => { $('#gro-text').hidden = true; });

/* In-page confirmation (native confirm() is blocked when hosted) */
function ask(message, okLabel = 'OK') {
  const dlg = $('#dlg-confirm');
  $('#confirm-msg').textContent = message;
  $('#confirm-ok').textContent = okLabel;
  dlg.returnValue = '';
  dlg.showModal();
  return new Promise((resolve) => dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true }));
}

load();
render();
setStatus('local');
connectCloud().then((ok) => {
  if (!ok) {
    store.mode = 'local';
    setStatus('local');
    if (!store.hadLocalData) { seedSampleWeek(); saveLocal(); }
  }
});
