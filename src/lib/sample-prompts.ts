/**
 * Trade-specific sample prompts for the estimate form.
 * Each trade has 6 detailed prompts that rotate with a fade animation.
 */
export const SAMPLE_PROMPTS: Record<string, string[]> = {
  general_contractor: [
    "2,500 sq ft kitchen and bathroom remodel in a 1960s ranch house. Gut the kitchen down to studs, new cabinets, quartz countertops, tile backsplash, all new appliances. Two bathrooms — full gut and rebuild with new tile, vanities, and fixtures.",
    "Build a 400 sq ft detached garage with concrete slab, framing, siding to match the house, one garage door, electrical panel, and lighting. Include permits.",
    "Full interior renovation of a 3-bedroom, 2-bath condo. New flooring throughout (LVP), paint all walls and ceilings, replace all interior doors and trim, update both bathrooms with new vanities and tile.",
    "Finish a 1,200 sq ft basement — frame walls, insulate, drywall, drop ceiling, LVP flooring, one full bathroom, a wet bar area, and egress window install. Include electrical and plumbing.",
    "Repair fire damage in a 1,800 sq ft home. Demo and remove damaged drywall, framing, and flooring in living room and kitchen. Rebuild to match existing finishes. Includes smoke remediation.",
    "Whole-house renovation of a 2,200 sq ft colonial. New roof, windows, siding, gutters. Interior: refinish hardwood floors, new kitchen cabinets, paint throughout, update all 3 bathrooms.",
  ],
  plumbing: [
    "Repipe an entire 2,400 sq ft home from galvanized to PEX. 2.5 bathrooms, kitchen, laundry, and two outdoor hose bibs. Cut and patch drywall as needed.",
    "Install a tankless water heater (Rinnai or Navien) to replace a 50-gallon tank. Run new gas line, vent through wall, and add recirculation pump.",
    "Rough-in plumbing for a new basement bathroom — toilet, vanity sink, and walk-in shower. Includes breaking concrete for drain lines and tying into existing stack.",
    "Replace sewer line from house to street, approximately 60 feet. Camera inspection, excavation, new 4-inch PVC, and backfill. Includes city permit.",
    "Kitchen remodel plumbing: relocate sink 4 feet, add gas line for range, install garbage disposal, dishwasher hookup, and pot filler at stove.",
    "Install a whole-house water filtration system and water softener. Includes bypass valves, drain connection, and new outdoor hose bib.",
  ],
  electrical: [
    "Upgrade electrical panel from 100A to 200A service. New meter base, panel, main breaker, and reconnect all existing circuits. Includes utility coordination and permit.",
    "Wire a 2,000 sq ft new construction home — 200A panel, all outlets, switches, lighting, smoke/CO detectors, bathroom fans, kitchen circuits, and EV charger outlet in garage.",
    "Add 20 recessed lights throughout main floor, install dimmer switches, and add under-cabinet LED lighting in kitchen. Patch and paint all ceiling holes.",
    "Install a Level 2 EV charger (240V/50A) in detached garage. Run conduit and wire from main panel, approximately 80 feet. Include GFCI breaker and permit.",
    "Rewire a 1940s bungalow — replace knob-and-tube with Romex throughout. 15 rooms, new panel, all new outlets and switches. Includes opening and patching walls.",
    "Commercial tenant build-out electrical: 3,000 sq ft office space. 200A sub-panel, 40 outlets, 30 LED fixtures, data/phone rough-in, exit signs, and fire alarm tie-in.",
  ],
  hvac: [
    "Replace a 3-ton AC unit and 80,000 BTU furnace in a 1,800 sq ft home. Includes new thermostat, refrigerant lines, condensate drain, and ductwork modifications.",
    "Install a ductless mini-split system — one outdoor unit with 4 indoor heads for a 2,000 sq ft home. Includes line sets, electrical, and condensate pumps.",
    "Full ductwork replacement in a 2,400 sq ft two-story home. Remove old ductwork, install new insulated flex and metal trunk lines, seal all connections.",
    "Install a whole-house humidifier and air purification system on existing HVAC. Includes bypass duct, water line, and smart thermostat with humidity control.",
    "Commercial HVAC install for a 4,000 sq ft restaurant. Two 5-ton rooftop units, kitchen hood make-up air unit, ductwork, controls, and permits.",
    "Add AC to a 1,500 sq ft home that only has a furnace. Install 2.5-ton condenser, coil, line set, new thermostat, and modify existing ductwork for cooling.",
  ],
  roofing: [
    "Tear off and replace a 30-square asphalt shingle roof on a two-story colonial. Includes ice and water shield, synthetic underlayment, ridge vent, and new flashing around chimney and skylights.",
    "Install a standing seam metal roof on a 2,000 sq ft ranch home. Remove existing shingles, add synthetic underlayment, install 24-gauge panels with snow guards.",
    "Repair storm damage on a 40-square roof — replace 15 squares of shingles, fix damaged decking (10 sheets of plywood), new pipe boots, and replace damaged gutters on south side.",
    "Flat roof replacement on a 1,500 sq ft commercial building. Remove old EPDM, install new TPO single-ply membrane, tapered insulation, and new drains.",
    "Cedar shake roof tear-off and replacement with architectural shingles. 25 squares, includes skip sheathing removal, new plywood decking, and ridge vent system.",
    "Install 6 solar-ready roof penetrations, replace flashing around 3 skylights, and add gutter guards to 200 linear feet of existing gutters.",
  ],
  painting: [
    "Paint the entire interior of a 3,000 sq ft home — walls and ceilings in all rooms, trim and doors throughout. Includes patching nail holes, light sanding, primer where needed.",
    "Exterior paint job on a 2,500 sq ft two-story home. Power wash, scrape and sand peeling areas, prime bare wood, two coats on body, contrasting trim and shutters.",
    "Cabinet refinishing — 30 doors and 15 drawer fronts. Strip existing finish, sand, prime, spray two coats of lacquer. Includes removing and reinstalling hardware.",
    "Commercial interior painting: 5,000 sq ft office space. Patch and repair drywall, prime all walls, two coats of low-VOC paint. Accent walls in conference rooms.",
    "Stain a 600 sq ft cedar deck and matching pergola. Power wash, sand, apply two coats of semi-transparent stain. Includes railing spindles and all trim.",
    "Repaint all exterior trim, fascia, and soffit on a 2,000 sq ft home. Scrape, prime, and paint approximately 400 linear feet. Access requires 28-foot ladders.",
  ],
  carpentry: [
    "Build a 12x16 covered deck with composite decking, pressure-treated framing, aluminum railing, and built-in bench seating. Includes concrete pier footings and permit.",
    "Install crown molding throughout the main floor — living room, dining room, kitchen, and hallway. Approximately 200 linear feet of 5.25-inch crown with corner blocks.",
    "Custom built-in bookcase wall unit for a home office — 12 feet wide, floor to ceiling, adjustable shelves, cabinet base with doors, painted to match trim.",
    "Frame and finish a 10x12 addition for a mudroom. Includes exterior door, bench with cubbies, coat hooks, tile floor, and tie-in to existing roof.",
    "Replace 14 interior doors and all associated casing/trim throughout a 2,000 sq ft home. Includes pre-hung doors, new hardware, and paint-grade trim.",
    "Build a custom kitchen island — 4x8 feet with shaker panel sides, open shelving on one end, overhang for stools, and prep for countertop and sink.",
  ],
  concrete: [
    "Pour a 24x24 concrete patio with broom finish, expansion joints, and one step down from the back door. Includes excavation, gravel base, and forming.",
    "Replace a 60-foot driveway — remove old cracked concrete, re-grade, new gravel base, 4-inch reinforced pour with expansion joints. Includes approach apron.",
    "Build a 4-foot retaining wall, 40 feet long, using decorative concrete block with cap stones. Includes drainage stone, filter fabric, and drain tile behind wall.",
    "Pour a 30x40 garage slab with 6-inch thickness, wire mesh, turned-down edges, and floor drain. Includes grading, compacted gravel, and vapor barrier.",
    "Stamped concrete patio — 400 sq ft with ashlar slate pattern, two-tone coloring, and sealed finish. Includes forming, pouring, stamping, and acid stain.",
    "Foundation repair: underpin 20 linear feet of settling foundation with concrete piers. Includes excavation, forming, pouring, and waterproofing membrane.",
  ],
  landscaping: [
    "Full backyard landscape design and install — 2,000 sq ft. Includes paver patio, fire pit area, planting beds with 20 shrubs and perennials, sod, and landscape lighting.",
    "Install a drip irrigation system for front and back yards — 6 zones, smart controller, drip lines for beds, and pop-up sprinklers for lawn. Includes backflow preventer.",
    "Build a 6-foot cedar privacy fence, 150 linear feet, with steel posts set in concrete. Includes one walk gate and one double drive gate.",
    "Grade and seed a 5,000 sq ft yard after new construction. Includes topsoil delivery, rough and fine grading, hydroseeding, and erosion blankets.",
    "Hardscape project: 800 sq ft paver patio with built-in seating wall, 3-foot retaining wall, and stone steps connecting to upper lawn area.",
    "Landscape lighting install — 20 fixtures on three zones. Path lights along walkway, uplights on trees, and wash lights on house facade. Low-voltage with transformer.",
  ],
  remodeling: [
    "Full kitchen remodel — gut 200 sq ft kitchen, new layout with island, custom cabinets, quartz countertops, tile backsplash, all new appliances, and lighting.",
    "Master bathroom remodel — remove tub, install walk-in tiled shower with glass door, new vanity with double sinks, heated floors, and new lighting.",
    "Basement finishing — 1,000 sq ft, includes framing, insulation, drywall, LVP flooring, drop ceiling, recessed lighting, one bathroom, and a wet bar.",
    "Open up floor plan by removing wall between kitchen and living room. Includes structural beam install, drywall repair, flooring transition, and electrical reroute.",
    "Convert a detached two-car garage into an ADU/studio apartment. Insulate walls and ceiling, add bathroom, kitchenette, mini-split HVAC, and new entry door.",
    "Whole-house remodel of a 1,600 sq ft ranch — new kitchen, two updated bathrooms, refinish all hardwood, paint throughout, and new lighting fixtures.",
  ],
  flooring: [
    "Install 1,500 sq ft of engineered hardwood throughout main floor — living room, dining room, kitchen, and hallway. Includes removal of old carpet, subfloor prep, and new baseboards.",
    "Tile two bathrooms — master bath (120 sq ft floor + shower walls) and guest bath (80 sq ft floor + tub surround). Large format porcelain tile with linear drain in master.",
    "Install 2,000 sq ft of luxury vinyl plank throughout entire home. Remove existing flooring (mix of carpet and laminate), level subfloor, and install new LVP with transitions.",
    "Refinish 1,200 sq ft of existing red oak hardwood floors. Sand down to bare wood, fill gaps, apply three coats of water-based poly in satin finish.",
    "Commercial flooring: install 3,000 sq ft of carpet tile in office spaces and 1,000 sq ft of porcelain tile in lobbies and restrooms. Includes moisture testing.",
    "Remove ceramic tile in kitchen and install new 12x24 porcelain tile with heated floor mat. Approximately 250 sq ft including backerboard and leveling.",
  ],
  commercial: [
    "Tenant build-out for a 3,000 sq ft dental office. Framing for 6 operatories, reception area, sterilization room, ADA bathroom, and mechanical room. Includes MEP rough-ins.",
    "Restaurant build-out — 2,500 sq ft space. Commercial kitchen with hood system, walk-in cooler, dining area for 60 seats, ADA restrooms, and exterior patio.",
    "Office renovation — 5,000 sq ft open floor plan conversion. Demo cubicle walls, new flooring, paint, update lighting to LED, add 4 glass-front conference rooms.",
    "Retail store fit-out in a strip mall — 1,800 sq ft. Includes storefront glass, dressing rooms, custom shelving/displays, POS counter, lighting, and ADA compliance.",
    "Warehouse conversion to office/warehouse mix — 8,000 sq ft total. Build 2,000 sq ft of office space with drop ceiling, HVAC, and restrooms. Warehouse gets lighting and electrical.",
    "Medical clinic renovation — 4,000 sq ft. 8 exam rooms, reception/waiting area, lab space, nurse station, ADA upgrades, and specialized HVAC for infection control.",
  ],
  windows_doors: [
    "Replace 15 double-hung windows in a 2,000 sq ft home with energy-efficient vinyl windows. Includes removal, installation, insulation, and interior trim.",
    "Install a new front entry door — fiberglass with sidelights and transom. Includes removing old door, new threshold, weatherstripping, hardware, and paint.",
    "Replace 8 windows and a sliding glass door with impact-rated hurricane windows and doors. Includes permits and engineering for coastal building code.",
    "Install 4 egress windows in a basement finishing project. Includes cutting foundation walls, window wells, drains, and interior trim.",
    "Replace all interior doors (12 total) with solid-core shaker-style doors. Includes new jambs, casing, hinges, and lever hardware throughout.",
    "Install a 16x7 insulated steel garage door with belt-drive opener, keypad, and smart-home integration. Remove old door and tracks.",
  ],
  siding: [
    "Reside a 2,200 sq ft two-story home with James Hardie fiber cement lap siding. Includes removal of old vinyl siding, housewrap, and all trim and corners.",
    "Install stone veneer on the lower half of the front facade — approximately 400 sq ft. Includes metal lath, scratch coat, and manufactured stone.",
    "Replace damaged vinyl siding on one side of a home — approximately 600 sq ft. Match existing color and profile, replace damaged housewrap underneath.",
    "Full exterior makeover: new LP SmartSide siding, new soffit and fascia, wrap all windows and doors with aluminum coil stock. 1,800 sq ft ranch home.",
    "Install cedar shake siding on 3 gable ends — approximately 300 sq ft total. Includes housewrap, starter course, and stain.",
    "Board and batten siding on a 500 sq ft addition to match the existing farmhouse style. Includes primed LP SmartSide boards, trim, and paint.",
  ],
  new_home_builder: [
    "Build a 2,400 sq ft single-story ranch home on a crawl space foundation. 3 bed, 2 bath, open floor plan with kitchen island, attached 2-car garage. Standard finishes — vinyl siding, architectural shingles, LVP flooring, granite countertops.",
    "New construction 3,200 sq ft two-story colonial on a full basement. 4 bed, 2.5 bath, formal dining, home office, mudroom, and 3-car garage. Hardwood main floor, tile bathrooms, quartz countertops.",
    "Spec home build — 1,800 sq ft 3 bed/2 bath on slab. Budget-friendly finishes: vinyl plank, laminate counters, builder-grade fixtures. Includes grading, driveway, and basic landscaping.",
    "Custom home 4,000 sq ft on walk-out basement lot. 5 bed, 3.5 bath, great room with stone fireplace, chef's kitchen with double island, covered rear patio, and finished basement with wet bar and media room.",
    "Build a 1,200 sq ft starter home — 3 bed/1 bath ranch on slab. Simple roof line, standard finishes throughout. Includes site work, well, and septic system in a rural lot.",
    "New construction duplex — two 1,400 sq ft units, each with 2 bed/2 bath. Shared foundation and roof, separate utilities, driveways, and entrances. Vinyl siding, LVP floors, standard finishes.",
  ],
  other: [
    "General home repair list: fix squeaky stairs, replace two toilets, install ceiling fans in 3 bedrooms, patch drywall in hallway, and re-caulk all tubs and showers.",
    "Handyman project: mount 4 TVs, assemble patio furniture set, install closet organizer system, and replace kitchen faucet and garbage disposal.",
    "Property maintenance for rental: turn a 2-bedroom apartment between tenants. Patch and paint walls, deep clean, replace carpet in bedrooms, and fix bathroom exhaust fan.",
    "Install a whole-house generator (22kW) with automatic transfer switch. Includes concrete pad, gas line, electrical connections, and permit.",
    "Build and install a custom mudroom storage system — bench with shoe cubbies, coat hooks, upper cabinets, and beadboard back panel. 8 feet wide.",
    "Accessibility modifications: install grab bars in 2 bathrooms, wheelchair ramp at front entry (20 feet), widen 3 doorways, and lower kitchen countertop section.",
  ],
}

/**
 * Get a shuffled set of sample prompts for the given trades.
 * Combines all prompts from selected trades, deduplicates, and shuffles.
 */
export function getPromptsForTrades(trades: string[]): string[] {
  if (trades.length === 0) {
    // Default to general contractor + remodeling prompts
    return shuffleArray([
      ...(SAMPLE_PROMPTS.general_contractor || []),
      ...(SAMPLE_PROMPTS.remodeling || []),
    ])
  }

  const allPrompts: string[] = []
  for (const trade of trades) {
    const prompts = SAMPLE_PROMPTS[trade]
    if (prompts) {
      allPrompts.push(...prompts)
    }
  }

  return shuffleArray(allPrompts)
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
