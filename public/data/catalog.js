// Repair catalog shared by the browser app and the server.
//
// Each appliance has a list of repairs. Each repair has:
//   symptom      what the homeowner notices
//   cause        the usual culprit
//   difficulty   1 (easy) – 3 (advanced)
//   time         rough time estimate
//   cost         rough parts cost in USD
//   tools/parts  what to have on hand
//   steps        the procedure
//   proSignals   when to stop and call a professional
//   videos       tutorial sources. `query` opens a YouTube search; add a
//                `youtubeId` (the 11-character id from a video URL) to embed
//                a specific, vetted video inside the app.

export const SAFETY_BASICS = [
  "Unplug the appliance or switch off its circuit breaker before opening any panel.",
  "For gas appliances, turn the gas supply valve off. If you smell gas, leave the house and call your gas utility — do not repair.",
  "Shut off the water supply before working on anything connected to plumbing.",
  "Take a photo of wiring and part positions before disconnecting anything.",
  "Wear safety glasses and work gloves; sheet-metal edges inside appliances are sharp.",
];

export const CATALOG = [
  {
    id: "refrigerator",
    name: "Refrigerator",
    icon: "🧊",
    category: "Kitchen",
    hazards: ["electrical"],
    identifyHints: [
      "Tall insulated cabinet with one or more doors, keeps food cold",
      "Model/serial label is usually inside the fresh-food compartment on a side wall or under the crisper drawers",
    ],
    repairs: [
      {
        id: "fridge-not-cooling",
        symptom: "Not cooling, but the light and fans run",
        cause: "Dirty condenser coils or a failed condenser fan",
        difficulty: 1,
        time: "30–60 min",
        cost: "$0–$40",
        tools: ["Coil cleaning brush", "Vacuum with crevice tool", "Nut driver or screwdriver", "Flashlight"],
        parts: ["Condenser fan motor (only if it does not spin)"],
        steps: [
          "Unplug the refrigerator and pull it away from the wall.",
          "Remove the lower rear access panel (or the front toe-kick grille on some models).",
          "Brush and vacuum dust from the condenser coils until the metal is visible.",
          "Check the condenser fan blade spins freely by hand; clear any debris.",
          "Plug the fridge back in and confirm the condenser fan runs alongside the compressor.",
          "If the fan does not run, replace the condenser fan motor (two screws and a wiring plug on most models).",
          "Give the fridge 24 hours to return to temperature (37°F / 3°C fresh food).",
        ],
        proSignals: [
          "Compressor clicks on and off every few minutes without running",
          "Oily residue on tubing, which can indicate a refrigerant leak",
        ],
        videos: [
          { title: "How to clean refrigerator condenser coils", query: "how to clean refrigerator condenser coils" },
          { title: "Replace a refrigerator condenser fan motor", query: "replace refrigerator condenser fan motor" },
        ],
      },
      {
        id: "fridge-leaking",
        symptom: "Water pooling on the floor or under the crisper drawers",
        cause: "Clogged defrost drain line",
        difficulty: 1,
        time: "20–40 min",
        cost: "$0",
        tools: ["Turkey baster or syringe", "Warm water", "Pipe cleaner or thin flexible wire", "Towels"],
        parts: [],
        steps: [
          "Unplug the refrigerator and lay towels down.",
          "Locate the defrost drain hole, usually at the back of the freezer floor or the back wall of the fresh-food section.",
          "Melt any ice in the drain with warm water from a baster.",
          "Push a pipe cleaner gently down the drain to clear debris.",
          "Flush with a mix of warm water and a teaspoon of baking soda until it drains freely into the pan underneath.",
          "Empty and wipe the drain pan beneath the fridge, then plug it back in.",
        ],
        proSignals: ["The drain freezes again within days — this can point to a failed defrost heater or control board"],
        videos: [{ title: "Unclog a refrigerator defrost drain", query: "unclog refrigerator defrost drain" }],
      },
      {
        id: "fridge-ice-maker",
        symptom: "Ice maker stopped making ice",
        cause: "Frozen fill tube, clogged water filter, or a failed water inlet valve",
        difficulty: 2,
        time: "30–90 min",
        cost: "$0–$60",
        tools: ["Hair dryer", "Multimeter", "Screwdriver", "Bucket"],
        parts: ["Water filter", "Water inlet valve (if it fails testing)"],
        steps: [
          "Confirm the ice maker's shut-off arm or switch is in the ON position.",
          "Replace the water filter if it is older than six months.",
          "Unplug the fridge and gently warm the fill tube where it enters the ice maker with a hair dryer on low.",
          "Check the household water supply valve behind the fridge is fully open.",
          "If still no water, test the water inlet valve solenoid with a multimeter (most read 200–500 ohms); replace it if it reads open.",
        ],
        proSignals: ["Water leaks from the inlet valve connection after reassembly"],
        videos: [
          { title: "Ice maker not working troubleshooting", query: "refrigerator ice maker not making ice fix" },
          { title: "Test and replace a water inlet valve", query: "replace refrigerator water inlet valve" },
        ],
      },
    ],
  },
  {
    id: "dishwasher",
    name: "Dishwasher",
    icon: "🍽️",
    category: "Kitchen",
    hazards: ["electrical", "water"],
    identifyHints: [
      "Built-in under the counter with a fold-down front door and pull-out racks",
      "Label is usually on the edge of the door or the side of the tub opening",
    ],
    repairs: [
      {
        id: "dishwasher-not-draining",
        symptom: "Standing water in the bottom after a cycle",
        cause: "Clogged filter, blocked drain hose, or a sink garbage-disposal knockout plug",
        difficulty: 1,
        time: "20–45 min",
        cost: "$0",
        tools: ["Towels", "Small cup", "Soft brush", "Screwdriver", "Pliers"],
        parts: [],
        steps: [
          "Turn off power at the breaker and bail out the standing water.",
          "Remove the bottom rack and twist out the filter assembly at the base of the tub.",
          "Scrub the filter under warm water with a soft brush.",
          "Check the drain sump for glass, seeds, or labels and remove them.",
          "Under the sink, check the drain hose for kinks. If a disposal was recently installed, make sure the knockout plug was removed.",
          "Reinstall the filter, restore power, and run a short rinse cycle.",
        ],
        proSignals: ["You hear humming but no draining after clearing the filter — the drain pump may have failed"],
        videos: [
          { title: "Clean a dishwasher filter", query: "how to clean dishwasher filter" },
          { title: "Dishwasher not draining fix", query: "dishwasher not draining fix" },
        ],
      },
      {
        id: "dishwasher-dirty-dishes",
        symptom: "Dishes come out dirty or gritty",
        cause: "Clogged spray arms or filter",
        difficulty: 1,
        time: "20–30 min",
        cost: "$0",
        tools: ["Toothpick", "Soft brush", "White vinegar"],
        parts: [],
        steps: [
          "Remove the lower and upper spray arms (they usually unscrew or unclip).",
          "Clear each spray hole with a toothpick and rinse the arms.",
          "Clean the filter as described in the draining guide.",
          "Run the kitchen tap until hot before starting the dishwasher.",
          "Run an empty hot cycle with a cup of white vinegar upright on the top rack.",
        ],
        proSignals: [],
        videos: [{ title: "Clean dishwasher spray arms", query: "clean dishwasher spray arms" }],
      },
      {
        id: "dishwasher-door-leak",
        symptom: "Water leaking from the door",
        cause: "Worn or dirty door gasket",
        difficulty: 1,
        time: "15–30 min",
        cost: "$15–$40",
        tools: ["Damp cloth", "Mild detergent"],
        parts: ["Replacement door gasket for your model"],
        steps: [
          "Turn off power to the dishwasher.",
          "Wipe the door gasket and tub edge with mild detergent to remove food buildup.",
          "Inspect the gasket for cracks, flattening, or tears.",
          "To replace it, pull the old gasket out of its channel and press the new one in, starting at the center top and working down each side.",
          "Check the dishwasher is level side to side, then run a test cycle.",
        ],
        proSignals: ["Leak comes from underneath the unit rather than the door"],
        videos: [{ title: "Replace a dishwasher door gasket", query: "replace dishwasher door gasket" }],
      },
    ],
  },
  {
    id: "washing-machine",
    name: "Washing Machine",
    icon: "🧺",
    category: "Laundry",
    hazards: ["electrical", "water"],
    identifyHints: [
      "Drum appliance with a top lid or round front door and a detergent dispenser",
      "Label is often under the lid, around the door opening, or on the back panel",
    ],
    repairs: [
      {
        id: "washer-wont-drain",
        symptom: "Won't drain or spin; clothes stay soaked",
        cause: "Clogged drain pump filter or kinked drain hose",
        difficulty: 1,
        time: "30–45 min",
        cost: "$0",
        tools: ["Shallow pan", "Towels", "Flat screwdriver"],
        parts: [],
        steps: [
          "Unplug the washer.",
          "On front-loaders, open the small access door at the bottom front.",
          "Put a shallow pan and towels below, then slowly unscrew the drain pump filter to release water.",
          "Remove coins, hair ties, and lint from the filter and its housing.",
          "Check the drain hose behind the washer is not kinked or pushed too far into the standpipe.",
          "Reinstall the filter hand-tight and run a drain/spin cycle.",
        ],
        proSignals: ["The pump hums but water doesn't move after cleaning, or the motor smells burnt"],
        videos: [{ title: "Clean a washing machine drain pump filter", query: "clean front load washer drain pump filter" }],
      },
      {
        id: "washer-shaking",
        symptom: "Shakes violently or walks across the floor during spin",
        cause: "Unlevel feet, unbalanced load, or worn suspension parts",
        difficulty: 2,
        time: "20–90 min",
        cost: "$0–$60",
        tools: ["Bubble level", "Adjustable wrench", "Putty knife"],
        parts: ["Suspension rods or shock absorbers (only if worn)"],
        steps: [
          "Redistribute the load and test with a normal-size load.",
          "Place a level on top of the washer front-to-back and side-to-side.",
          "Adjust the leveling feet and tighten their lock nuts against the cabinet.",
          "On new installs, confirm the shipping bolts were removed from the back.",
          "If it still shakes, inspect the suspension rods (top-load) or shock absorbers (front-load) and replace worn ones as a set.",
        ],
        proSignals: ["Loud grinding or the drum feels loose when moved by hand — likely drum bearings"],
        videos: [
          { title: "Level a washing machine", query: "how to level a washing machine" },
          { title: "Replace washer suspension rods", query: "replace top load washer suspension rods" },
        ],
      },
      {
        id: "washer-smell",
        symptom: "Musty or mildew smell",
        cause: "Residue and mold in the door seal and dispenser",
        difficulty: 1,
        time: "30 min",
        cost: "$0–$10",
        tools: ["Spray bottle", "Microfiber cloth", "Old toothbrush"],
        parts: ["Washing machine cleaner tablets (optional)"],
        steps: [
          "Pull back the door boot seal and wipe out trapped debris and slime.",
          "Scrub the seal folds with diluted bleach or vinegar (never mix the two).",
          "Remove the detergent dispenser drawer and soak it in hot soapy water.",
          "Run the hottest cleaning cycle with a cleaner tablet or two cups of vinegar.",
          "Leave the door and drawer ajar between washes to let it dry.",
        ],
        proSignals: [],
        videos: [{ title: "Clean a smelly front load washer", query: "clean smelly front load washer gasket" }],
      },
    ],
  },
  {
    id: "dryer",
    name: "Clothes Dryer",
    icon: "🌀",
    category: "Laundry",
    hazards: ["electrical", "gas", "fire"],
    identifyHints: [
      "Tumbling drum with a lint screen and a large exhaust vent out the back",
      "Label is usually inside the door frame or on the back panel",
    ],
    repairs: [
      {
        id: "dryer-no-heat",
        symptom: "Tumbles but doesn't heat, or takes multiple cycles",
        cause: "Clogged exhaust vent, blown thermal fuse, or failed heating element",
        difficulty: 2,
        time: "45–120 min",
        cost: "$0–$70",
        tools: ["Dryer vent brush kit", "Multimeter", "Nut driver set", "Shop vacuum"],
        parts: ["Thermal fuse", "Heating element (electric) or igniter (gas)"],
        steps: [
          "Unplug the dryer (and shut the gas valve on gas dryers).",
          "Disconnect and clean the full exhaust vent run with a vent brush; airflow problems cause most heat failures.",
          "Remove the rear access panel and locate the thermal fuse on the exhaust duct.",
          "Test the thermal fuse for continuity with a multimeter; replace it if it reads open.",
          "On electric dryers, test the heating element (usually 7–50 ohms). Replace it if it reads open.",
          "Reassemble, reconnect the vent, and test on a timed-dry setting.",
        ],
        proSignals: [
          "Gas dryer: anything involving the gas valve or gas line",
          "The thermal fuse blows again — the root cause has not been fixed",
        ],
        videos: [
          { title: "Clean a dryer vent", query: "how to clean dryer vent duct" },
          { title: "Test and replace a dryer thermal fuse", query: "test replace dryer thermal fuse" },
        ],
      },
      {
        id: "dryer-squeaking",
        symptom: "Squealing, thumping, or rumbling while running",
        cause: "Worn drum rollers, idler pulley, or drive belt",
        difficulty: 2,
        time: "1–2 hrs",
        cost: "$25–$50",
        tools: ["Nut driver set", "Putty knife", "Screwdriver"],
        parts: ["Dryer repair kit (rollers, idler pulley, belt) for your model"],
        steps: [
          "Unplug the dryer and move it away from the wall.",
          "Open the cabinet (front panel or top lid depending on model) following the manual.",
          "Release belt tension at the idler pulley and lift out the drum.",
          "Spin each drum roller and the idler pulley by hand; replace any that wobble, grind, or have flat spots.",
          "Install the new belt with the ribbed side facing the drum.",
          "Reinstall the drum, route the belt around the motor pulley and idler, and test.",
        ],
        proSignals: [],
        videos: [{ title: "Replace dryer rollers and belt", query: "replace dryer drum rollers belt idler pulley" }],
      },
    ],
  },
  {
    id: "water-heater",
    name: "Water Heater",
    icon: "🔥",
    category: "Utility",
    hazards: ["electrical", "gas", "scald", "water"],
    identifyHints: [
      "Large cylindrical tank (or wall-mounted box for tankless) with cold and hot water pipes on top",
      "Gas units have a flue pipe and a burner control; electric units have one or two access panels on the side",
    ],
    repairs: [
      {
        id: "water-heater-no-hot-water-electric",
        symptom: "No hot water (electric)",
        cause: "Tripped high-limit reset or failed heating element",
        difficulty: 2,
        time: "30–120 min",
        cost: "$0–$40",
        tools: ["Non-contact voltage tester", "Multimeter", "Element wrench (1-1/2\")", "Garden hose"],
        parts: ["Heating element and gasket (only if failed)"],
        steps: [
          "Turn off the water heater's breaker and confirm power is off with a voltage tester.",
          "Remove the upper access panel and insulation; press the red high-limit reset button.",
          "Restore power and wait an hour. If there's still no hot water, turn power off again.",
          "Test each element with a multimeter (typically 10–30 ohms). An open reading means it has failed.",
          "To replace an element: shut off the cold supply, drain the tank below the element, unscrew it with an element wrench, and install the new one with a new gasket.",
          "Refill the tank completely (open a hot tap until water flows steadily) BEFORE restoring power.",
        ],
        proSignals: [
          "The reset button trips repeatedly",
          "Water leaking from the tank body itself — the tank needs replacing",
        ],
        videos: [
          { title: "Electric water heater no hot water", query: "electric water heater no hot water troubleshooting" },
          { title: "Replace a water heater element", query: "replace electric water heater element" },
        ],
      },
      {
        id: "water-heater-flush",
        symptom: "Popping/rumbling noise or reduced hot water",
        cause: "Sediment buildup in the bottom of the tank",
        difficulty: 1,
        time: "45–90 min",
        cost: "$0",
        tools: ["Garden hose", "Bucket", "Flat screwdriver"],
        parts: [],
        steps: [
          "Turn the thermostat to 'vacation'/pilot (gas) or switch off the breaker (electric).",
          "Shut off the cold water supply valve on top of the tank.",
          "Attach a hose to the drain valve and run it to a floor drain or outside.",
          "Open a hot water tap in the house, then open the drain valve. Water will be HOT.",
          "When the tank is empty, briefly open the cold supply to stir up and flush remaining sediment.",
          "Close the drain valve, refill with a hot tap open until it runs steadily, then restore heat.",
        ],
        proSignals: ["The drain valve leaks after closing and won't stop"],
        videos: [{ title: "How to flush a water heater", query: "how to flush a tank water heater" }],
      },
      {
        id: "water-heater-pilot",
        symptom: "No hot water (gas) — pilot light is out",
        cause: "Pilot blown out or a dirty/failed thermocouple",
        difficulty: 2,
        time: "15–60 min",
        cost: "$0–$25",
        tools: ["Long lighter (if not push-button ignition)", "Flashlight", "Wrench set"],
        parts: ["Thermocouple (only if pilot won't stay lit)"],
        steps: [
          "Read the relighting instructions printed on the tank's label — follow them exactly.",
          "Turn the gas control knob to OFF and wait 5–10 minutes for gas to clear.",
          "Turn the knob to PILOT, press and hold it, and ignite the pilot.",
          "Keep holding for 30–60 seconds, release, then turn the knob to ON.",
          "If the pilot goes out when released, the thermocouple likely needs replacing.",
        ],
        proSignals: [
          "Any smell of gas — leave the house and call the gas utility",
          "Sealed-combustion units you cannot see the pilot on",
        ],
        videos: [{ title: "Relight a gas water heater pilot", query: "relight gas water heater pilot light" }],
      },
    ],
  },
  {
    id: "garbage-disposal",
    name: "Garbage Disposal",
    icon: "🗑️",
    category: "Kitchen",
    hazards: ["electrical", "cutting"],
    identifyHints: [
      "Cylindrical unit mounted under the kitchen sink drain, with a wall switch",
      "Has a red reset button and a hex socket in the bottom center",
    ],
    repairs: [
      {
        id: "disposal-jammed",
        symptom: "Hums but doesn't spin",
        cause: "Jammed flywheel",
        difficulty: 1,
        time: "10–20 min",
        cost: "$0",
        tools: ["1/4\" hex (Allen) wrench", "Flashlight", "Tongs or pliers"],
        parts: [],
        steps: [
          "Turn the disposal switch OFF and unplug it or switch off its breaker.",
          "Never put your hand in the disposal. Use tongs to remove visible objects.",
          "Insert a 1/4\" hex wrench into the socket on the bottom of the unit.",
          "Work the wrench back and forth until it turns a full rotation freely.",
          "Press the red reset button on the bottom.",
          "Restore power, run cold water, and switch it on.",
        ],
        proSignals: ["No hum and no response after pressing reset — check the breaker, then the switch wiring"],
        videos: [{ title: "Unjam a garbage disposal", query: "unjam garbage disposal hex wrench" }],
      },
      {
        id: "disposal-leak",
        symptom: "Leaking underneath",
        cause: "Loose drain connection or failed sink flange seal",
        difficulty: 2,
        time: "30–90 min",
        cost: "$0–$10",
        tools: ["Flashlight", "Paper towels", "Screwdriver", "Plumber's putty"],
        parts: ["Dishwasher hose clamp or drain gasket (as needed)"],
        steps: [
          "Switch off power. Dry the unit and put a paper towel under it.",
          "Run water and watch where the drip starts: top (sink flange), side (dishwasher or drain pipe), or bottom.",
          "Side leaks: tighten the dishwasher hose clamp or the discharge pipe bolts.",
          "Top leaks: remove the disposal, reseat the sink flange with fresh plumber's putty, and remount.",
          "Bottom leaks mean the internal seals have failed — the unit needs replacing.",
        ],
        proSignals: [],
        videos: [{ title: "Fix a leaking garbage disposal", query: "fix leaking garbage disposal" }],
      },
    ],
  },
  {
    id: "oven-range",
    name: "Oven / Range",
    icon: "🍳",
    category: "Kitchen",
    hazards: ["electrical", "gas", "burn"],
    identifyHints: [
      "Cooktop burners or a glass surface on top with an oven cavity below",
      "Label is usually on the oven frame behind the door, or inside the storage drawer",
    ],
    repairs: [
      {
        id: "oven-not-heating-electric",
        symptom: "Electric oven won't heat or bakes unevenly",
        cause: "Burnt-out bake or broil element",
        difficulty: 2,
        time: "30–60 min",
        cost: "$25–$60",
        tools: ["Nut driver or screwdriver", "Multimeter", "Needle-nose pliers"],
        parts: ["Bake or broil element for your model"],
        steps: [
          "Switch off the oven's breaker and let the oven cool completely.",
          "Look for blisters, breaks, or bright spots on the element.",
          "Remove the two screws holding the element to the back wall and gently pull it forward to reach the wires.",
          "Test the element terminals with a multimeter (typically 15–40 ohms). An open reading means it has failed.",
          "Transfer the wires one at a time to the new element, push it back, and refit the screws.",
          "Restore power and preheat to 350°F to test.",
        ],
        proSignals: ["New element doesn't heat — the control board or relay may have failed"],
        videos: [{ title: "Replace an oven bake element", query: "replace electric oven bake element" }],
      },
      {
        id: "range-burner-wont-light",
        symptom: "Gas burner clicks but won't light",
        cause: "Clogged burner ports or a wet/dirty igniter",
        difficulty: 1,
        time: "15–30 min",
        cost: "$0",
        tools: ["Straight pin or paper clip", "Soft brush", "Dish soap"],
        parts: [],
        steps: [
          "Turn the burner knobs off and let the cooktop cool.",
          "Lift off the grate, burner cap, and burner head.",
          "Clear the gas ports with a straight pin — don't use a toothpick, which can break off.",
          "Wash caps and heads in soapy water and let them dry FULLY.",
          "Wipe the ceramic igniter clean, reassemble with the cap seated flat, and test.",
        ],
        proSignals: ["Gas smell with the burner off — shut the gas valve and call a professional"],
        videos: [{ title: "Gas stove burner won't light fix", query: "gas stove burner clicking won't light fix" }],
      },
    ],
  },
  {
    id: "hvac",
    name: "Furnace / Air Conditioner",
    icon: "❄️",
    category: "HVAC",
    hazards: ["electrical", "gas"],
    identifyHints: [
      "Indoor cabinet with an air filter slot and ductwork (furnace/air handler), or an outdoor box with a large fan on top (AC condenser/heat pump)",
      "Label is on the inside of the furnace door or on the side of the outdoor unit",
    ],
    repairs: [
      {
        id: "hvac-weak-airflow",
        symptom: "Weak airflow or system runs constantly",
        cause: "Clogged air filter",
        difficulty: 1,
        time: "5–10 min",
        cost: "$5–$30",
        tools: ["Flashlight"],
        parts: ["Air filter matching the size printed on the old filter's frame"],
        steps: [
          "Set the thermostat to OFF.",
          "Slide out the filter from the furnace, air handler, or return-air grille.",
          "Note the size and the airflow arrow on the frame.",
          "Insert the new filter with the arrow pointing toward the blower (away from the return duct).",
          "Turn the system back on. Replace filters every 1–3 months.",
        ],
        proSignals: [],
        videos: [{ title: "How to change a furnace filter", query: "how to change furnace air filter" }],
      },
      {
        id: "hvac-ac-not-cooling",
        symptom: "AC runs but blows warm air",
        cause: "Dirty outdoor condenser coil, tripped breaker, or a frozen indoor coil",
        difficulty: 1,
        time: "30–60 min",
        cost: "$0–$20",
        tools: ["Garden hose with spray nozzle", "Fin comb (optional)", "Coil cleaner (optional)"],
        parts: [],
        steps: [
          "Check the filter first (see weak airflow guide).",
          "Look at the indoor refrigerant line: if it's iced over, set the system to OFF with the fan ON for a few hours to thaw.",
          "Turn off power at the outdoor disconnect box.",
          "Clear leaves and debris; keep 2 feet of clearance around the unit.",
          "Rinse the condenser fins from the inside out with gentle hose pressure (no pressure washer).",
          "Restore power and confirm the outdoor fan and compressor both run.",
        ],
        proSignals: [
          "Outdoor fan doesn't spin or hums — often a capacitor, which can hold a dangerous charge",
          "Coil re-freezes after thawing — possible low refrigerant",
        ],
        videos: [{ title: "Clean an AC condenser unit", query: "how to clean ac condenser coils outside unit" }],
      },
      {
        id: "hvac-thermostat",
        symptom: "System won't turn on at all",
        cause: "Dead thermostat batteries, tripped breaker, or furnace door safety switch",
        difficulty: 1,
        time: "10–20 min",
        cost: "$0–$5",
        tools: ["AA/AAA batteries", "Screwdriver"],
        parts: [],
        steps: [
          "Replace the thermostat batteries and confirm it's set to HEAT or COOL with the right setpoint.",
          "Check the HVAC breaker and the service switch near the furnace (looks like a light switch).",
          "Make sure the furnace front door is fully closed — it presses a safety switch.",
          "Check the condensate pan/drain for standing water; a float switch can shut the system off.",
          "Wait 5 minutes after any reset for the system's safety delay.",
        ],
        proSignals: ["Furnace control board shows a flashing error code you can't resolve"],
        videos: [{ title: "Furnace won't turn on troubleshooting", query: "furnace won't turn on troubleshooting" }],
      },
    ],
  },
  {
    id: "toilet",
    name: "Toilet",
    icon: "🚽",
    category: "Plumbing",
    hazards: ["water"],
    identifyHints: [
      "Bowl and tank with a flush handle",
      "Manufacturer and model are often stamped inside the tank behind the water line",
    ],
    repairs: [
      {
        id: "toilet-running",
        symptom: "Runs constantly or refills on its own",
        cause: "Worn flapper or misadjusted fill valve",
        difficulty: 1,
        time: "15–45 min",
        cost: "$5–$25",
        tools: ["Sponge", "Adjustable wrench", "Food coloring"],
        parts: ["Universal flapper", "Fill valve kit (if needed)"],
        steps: [
          "Put a few drops of food coloring in the tank; if color appears in the bowl within 15 minutes, the flapper leaks.",
          "Shut off the water at the valve behind the toilet and flush to empty the tank.",
          "Unhook the old flapper from the overflow tube ears and chain, then install the new one.",
          "Adjust the chain so it has about 1/2\" of slack.",
          "Set the fill valve float so the water stops about 1\" below the top of the overflow tube.",
          "Turn the water back on and test several flushes.",
        ],
        proSignals: ["Water leaking from the base of the toilet onto the floor (wax ring) if you're not comfortable lifting the toilet"],
        videos: [
          { title: "Fix a running toilet", query: "fix running toilet replace flapper" },
          { title: "Replace a toilet fill valve", query: "replace toilet fill valve" },
        ],
      },
      {
        id: "toilet-clogged",
        symptom: "Clogged or flushes weakly",
        cause: "Blockage in the trap",
        difficulty: 1,
        time: "10–30 min",
        cost: "$0–$30",
        tools: ["Flange plunger", "Toilet auger", "Rubber gloves"],
        parts: [],
        steps: [
          "Don't flush again if the bowl is near full. Close the tank flapper by hand if it is rising.",
          "Use a flange (bell-shaped) plunger: seal it over the outlet and push/pull firmly 15–20 times.",
          "If that fails, feed a toilet auger into the bowl and crank clockwise to break up or retrieve the clog.",
          "Flush to test. Repeat as needed.",
        ],
        proSignals: ["Multiple drains in the house back up at once — likely a main sewer line issue"],
        videos: [{ title: "Use a toilet auger", query: "how to use a toilet auger" }],
      },
    ],
  },
];

export const CATALOG_IDS = CATALOG.map((a) => a.id);

export function findAppliance(id) {
  return CATALOG.find((a) => a.id === id) || null;
}

export function findRepair(applianceId, repairId) {
  const appliance = findAppliance(applianceId);
  return appliance ? appliance.repairs.find((r) => r.id === repairId) || null : null;
}

export function youtubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function youtubeEmbedUrl(youtubeId) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`;
}

// Simple keyword search across appliances and symptoms.
export function searchCatalog(text) {
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const results = [];
  for (const appliance of CATALOG) {
    for (const repair of appliance.repairs) {
      const haystack = [appliance.name, appliance.category, repair.symptom, repair.cause, ...repair.steps]
        .join(" ")
        .toLowerCase();
      const score = terms.reduce((n, t) => n + (haystack.includes(t) ? 1 : 0), 0);
      if (score > 0) results.push({ appliance, repair, score });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}
