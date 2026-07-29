/**
 * Seed detailed content for all services (whatIncluded, whatNotIncluded,
 * serviceProcess, requirements, importantNotes, cancellationPolicy).
 * Safe to re-run — only updates rows where what_included IS NULL.
 *
 * Run with:
 *   pnpm --filter @servenow/server exec tsx src/database/seed-service-details.ts
 */
import { eq, isNull } from 'drizzle-orm';
import { db } from '../config/database.js';
import { services } from './schema/index.js';

const details: Record<string, {
  whatIncluded: string;
  whatNotIncluded: string;
  serviceProcess: string;
  requirements: string;
  importantNotes: string;
  cancellationPolicy: string;
}> = {
  'AC Service': {
    whatIncluded:
      'Filter cleaning and washing\nCoil cleaning (indoor + outdoor unit)\nDrainage pipe flush\nRefrigerant level check\nPerformance and cooling efficiency test\nCleaning of outer body and panel',
    whatNotIncluded:
      'Gas refilling or top-up (charged separately)\nReplacement of any parts or spare parts\nWindow AC service (covers split ACs only)\nElectrical wiring repair',
    serviceProcess:
      'Technician arrives and inspects the AC unit\nFilters and coils are removed and washed\nDrainage pipe is cleared of blockages\nRefrigerant pressure is checked\nAll components are reassembled and tested\nCooling performance is verified before leaving',
    requirements:
      'AC must be accessible (no heavy furniture blocking it)\nPower socket must be available near the unit\nSwitchboard or MCB must be functional\nEnsure pets are kept away from the work area',
    importantNotes:
      'Service covers up to 2 units; additional units are charged separately\nTechnician will inform you before any extra charges are applied\nService does not cover units older than 10 years without prior assessment\nBook at least 4 hours in advance',
    cancellationPolicy:
      'Free cancellation up to 2 hours before the scheduled time\nCancellations within 2 hours are charged 20% of the service fee\nNo-show by customer is charged in full',
  },

  'Bathroom Cleaning': {
    whatIncluded:
      'Scrubbing of tiles, walls, and floor\nToilet bowl, seat, and tank disinfection\nSink and tap cleaning and descaling\nShower and glass partition cleaning\nMirror and fixture wiping\nDustbin cleaning\nFinal disinfectant spray',
    whatNotIncluded:
      'Plumbing repairs or drain unblocking\nReplacement of fittings or accessories\nExterior window cleaning\nDeep grout re-sealing',
    serviceProcess:
      'Pre-treatment spray applied to tiles and grout\nToilet, sink, and fixtures scrubbed thoroughly\nFloor mopped with disinfectant solution\nGlass surfaces cleaned streak-free\nFinal wipe-down and sanitisation of all surfaces\nQuality check before completion',
    requirements:
      'Running water supply must be available\nBathroom should be cleared of personal items\nProvider must have access to the bathroom for the full duration\nVentilation (window or fan) preferred during service',
    importantNotes:
      'Heavily stained grout may require an additional deep-clean session\nHard water stains on glass may need specialised treatment\nScent-sensitive customers should ventilate the area after service',
    cancellationPolicy:
      'Free cancellation up to 1 hour before scheduled time\nLate cancellations within 1 hour attract a 15% fee\nRescheduling is free if done 3+ hours in advance',
  },

  'Classic Facial': {
    whatIncluded:
      'Skin analysis and consultation\nDouble cleanse with professional products\nSteam treatment to open pores\nManual extraction (blackheads and whiteheads)\nFace massage (10 minutes)\nFace pack suited to your skin type\nSunscreen or moisturiser finish',
    whatNotIncluded:
      'Chemical peels or advanced treatments\nEyebrow threading or waxing\nMedical-grade skin treatments\nProduct take-home kit',
    serviceProcess:
      'Skin type analysed and products selected accordingly\nCleansing and exfoliation to prep the skin\nSteam opens pores for better extraction\nGentle extraction of impurities\nRelaxing massage to improve circulation\nMask applied and removed\nFinal moisturiser or SPF applied',
    requirements:
      'Remove contact lenses before the session\nInform the professional of any allergies or active acne\nFace should be free of heavy makeup\nA clean well-lit room with a comfortable surface is ideal',
    importantNotes:
      'Avoid sun exposure for 24 hours post-facial\nMild redness after extraction is normal and fades within a few hours\nFor sensitive skin, a patch test will be done first\nDo not apply makeup immediately after the service',
    cancellationPolicy:
      'Free cancellation up to 2 hours before appointment\nWithin 2 hours: 25% cancellation fee applies\nRescheduling allowed once without charge',
  },

  'Curtain Cleaning': {
    whatIncluded:
      'Removal of curtains from rods (if required)\nDry vacuuming to remove dust and loose debris\nSpot treatment for stains\nSteam cleaning for fabric curtains\nDry cleaning for delicate fabrics\nRe-hanging after cleaning',
    whatNotIncluded:
      'Repair of torn or damaged curtains\nReplacement of hooks, rings, or rods\nCleaning of blinds or shutters\nIroning or pressing (available as add-on)',
    serviceProcess:
      'Curtains inspected for fabric type and stains\nLoose dust vacuumed off\nStain pre-treatment applied where needed\nSteam or dry-clean process carried out\nCurtains dried and re-hung\nFinal inspection for quality',
    requirements:
      'Rods and hooks must be in good condition\nProvide access to a power socket for steam equipment\nInform us of delicate or embroidered fabrics in advance\nClear the area around curtain fixtures',
    importantNotes:
      'Heavily soiled curtains may require multiple passes\nDelicate fabrics like silk or lace need extra care and time\nSome stains may not be fully removable\nDo not close windows during service to allow drying',
    cancellationPolicy:
      'Free cancellation up to 3 hours before service\nWithin 3 hours: 20% fee applies\nNo-show charged at full rate',
  },

  'Dry Cleaning': {
    whatIncluded:
      'Pick-up from your location\nInspection and tagging of each garment\nProfessional dry-clean process\nSpot stain treatment\nPressing and folding\nDrop-off with garment report',
    whatNotIncluded:
      'Same-day service (standard TAT is 48–72 hours)\nRepair of tears or loose buttons (add-on available)\nCleaning of shoes or bags',
    serviceProcess:
      'Professional picks up garments and issues a receipt\nEach item is inspected and labelled\nDry cleaning solvent removes stains and odours\nGarments are pressed and packed\nDelivery to your doorstep within 48–72 hours',
    requirements:
      'Garments should be handed over in a bag or basket\nMention specific stain instructions at pick-up\nDelicate or designer garments must be flagged upfront\nEnsure someone is available for pick-up and delivery',
    importantNotes:
      'Old or set stains may not be completely removable\nGarments with "Hand Wash Only" labels will not be dry-cleaned without explicit consent\nTAT may extend during peak seasons',
    cancellationPolicy:
      'Cancel pick-up at least 2 hours in advance for a full refund\nGarments already collected cannot be returned uncleaned\nDamage claims must be raised within 24 hours of delivery',
  },

  'Fan Installation': {
    whatIncluded:
      'Ceiling fan mounting and wiring\nRegulator installation (if provided by customer)\nElectrical connection and testing\nOld fan removal (if replacement)\nSafety check of wiring and switchboard',
    whatNotIncluded:
      'Supply of fan or regulator\nNew wiring or switchboard installation\nFan repair or servicing\nPainting or wall finishing after installation',
    serviceProcess:
      'Electrician inspects the existing hook or mounting point\nWiring is checked for safety\nFan is mounted and balanced\nRegulator and wiring connected\nFan tested at all speeds\nWork area cleaned up',
    requirements:
      'Fan and all accessories (canopy, blades, regulator) must be available\nPower must be accessible via MCB\nCeiling hook or mounting box must be present\nWork area must be cleared of furniture',
    importantNotes:
      'Ceiling height above 10 ft may require additional scaffolding — inform us in advance\nOld wiring issues discovered during work will be quoted separately\nInstallation of more than 2 fans in one visit may take longer',
    cancellationPolicy:
      'Free cancellation up to 1 hour before appointment\nWithin 1 hour: 10% of service fee is charged\nRescheduling is free with 2+ hours notice',
  },

  'Full Home Deep Cleaning': {
    whatIncluded:
      'Dusting of all surfaces, shelves, and fans\nSweeping, vacuuming, and mopping of all floors\nKitchen surface and appliance exterior wipe-down\nBathroom scrubbing and disinfection\nBalcony and utility area cleaning\nInside cabinet and drawer cleaning\nWindow sill and glass cleaning (interior)',
    whatNotIncluded:
      'Exterior window cleaning above ground floor\nCarpet shampooing (booked separately)\nLaundry or dishwashing\nGarbage disposal outside premises\nCleaning of attic or inaccessible spaces',
    serviceProcess:
      'Team arrives and divides work area by zone\nDry dusting and vacuuming done first\nWet mopping and surface sanitisation follows\nBathrooms and kitchen deep-cleaned last\nFinal walkthrough with customer for sign-off',
    requirements:
      'All rooms must be accessible\nFamily members and pets should vacate during cleaning if possible\nRunning water and power must be available\nPlease secure valuables before team arrival',
    importantNotes:
      'Deep cleaning for a 2BHK typically takes 4–6 hours; 3BHK+ may take longer\nA team of 2–4 professionals will be assigned\nPost-cleaning ventilation recommended for 30 minutes\nPremium add-ons (sofa, carpet, mattress) can be booked alongside',
    cancellationPolicy:
      'Free cancellation up to 4 hours before scheduled time\nWithin 4 hours: 25% fee applies\nSame-day cancellation: 50% fee applies',
  },

  'Haircut for Men': {
    whatIncluded:
      'Consultation on preferred style\nShampoo and conditioning wash\nPrecision haircut (scissors or clippers)\nBlowdry and styling\nNeck clean-up with razor\nComplimentary scalp massage',
    whatNotIncluded:
      'Hair colouring or highlights\nBeard trim or shave (add-on available)\nHair treatment or spa\nProduct for take-home use',
    serviceProcess:
      'Style consultation and preferences noted\nHair washed with shampoo and conditioner\nHair cut to desired length and style\nBlowdried and styled\nNeck line cleaned with razor\nFinal look checked with customer',
    requirements:
      'Sit in a chair with good lighting\nHave a reference photo ready if you want a specific style\nInform the professional of any scalp conditions\nEnsure the area is clear for the professional to work',
    importantNotes:
      'Stylist will follow your reference as closely as possible — exact results depend on hair type\nFor curly or textured hair, results may differ from straight-hair references\nService takes approximately 30–45 minutes',
    cancellationPolicy:
      'Free cancellation up to 1 hour before appointment\nWithin 1 hour: 20% fee charged\nNo-show is charged in full',
  },

  'Kitchen Deep Cleaning': {
    whatIncluded:
      'Degreasing of chimney, hob, and burners\nInside and outside of microwave and OTG\nCabinet exterior and handles cleaning\nCounter top and backsplash scrubbing\nSink descaling and disinfection\nAppliance exterior wipe-down (fridge, dishwasher)\nFloor mopping with kitchen-safe solution',
    whatNotIncluded:
      'Inside fridge or dishwasher cleaning (add-on)\nDrain unblocking or plumbing\nReplacement of any fittings\nDishwashing of utensils',
    serviceProcess:
      'Kitchen cleared and pre-treated with degreaser\nChimney filters and burners soaked and scrubbed\nSurfaces, tiles, and backsplash cleaned\nSink and drain area disinfected\nAppliances wiped down and polished\nFloor mopped and dried\nFinal inspection with customer',
    requirements:
      'Kitchen must be cleared of dishes and perishables before service\nGas connection should be turned off at cylinder\nProvide access to hot water if available\nChimney filters should be accessible',
    importantNotes:
      'Heavy grease build-up may require additional time or a follow-up session\nDo not use the kitchen for at least 1 hour post-cleaning\nChimney inside baffle or mesh cleaning is a separate service',
    cancellationPolicy:
      'Free cancellation up to 2 hours before service\nWithin 2 hours: 20% fee\nRescheduling free with 3+ hours notice',
  },

  'Pipe Leak Repair': {
    whatIncluded:
      'Leak diagnosis and source identification\nPipe joint sealing or re-fitting\nReplacement of washers and O-rings (up to 3)\nPost-repair leak test\nMinor concealed pipe access (up to 1 access point)',
    whatNotIncluded:
      'Full pipe replacement or re-routing\nWall breaking or heavy civil work\nReplacement parts other than washers or O-rings\nBathroom or kitchen fixture replacement',
    serviceProcess:
      'Plumber inspects the leak and traces the source\nWater supply isolated to the affected section\nJoint or fitting is repaired or re-sealed\nWashers and O-rings replaced as needed\nWater supply restored and tested for leaks\nArea cleaned and reported to customer',
    requirements:
      'Main water supply stopcock location must be known\nClear access to the affected pipe area\nInform us if the pipe is concealed inside walls\nEnsure the area is dry before plumber arrives for accurate diagnosis',
    importantNotes:
      'Hidden leaks behind walls may require additional assessment\nWall cutting and restoration is not included and will be quoted separately\nCustomer must monitor for 24 hours after repair and report if leak persists',
    cancellationPolicy:
      'Free cancellation up to 1 hour before appointment\nLate cancellation: 10% fee\nEmergency bookings are non-refundable',
  },

  'Shoe Cleaning & Restoration': {
    whatIncluded:
      'Surface dirt and mud removal\nDeep clean of upper, sole, and laces\nStain treatment (oil, water, or scuff marks)\nConditioner application for leather shoes\nDeodorant treatment for insoles\nBuff and polish for leather\nPacking and return',
    whatNotIncluded:
      'Sole replacement or repair\nDye or colour restoration for heavily faded shoes\nCleaning of cleats or sports boots with metal studs\nSame-day service (standard TAT: 24–48 hours)',
    serviceProcess:
      'Shoes inspected and condition noted\nLaces removed and soaked separately\nUpper cleaned with cleaner appropriate to material\nSole scrubbed and midsole cleaned\nStain treatment applied and buffed\nConditioner or protectant applied\nPacked and returned',
    requirements:
      'Shoes must be handed over without inserts or orthotics\nMention specific stains or problem areas at pick-up\nCustomer must be available for pick-up and delivery',
    importantNotes:
      'Deep stains on canvas or suede may not be fully removed\nLeather shoes may darken slightly after conditioning — this is normal\nAvoid water for 24 hours after treatment',
    cancellationPolicy:
      'Cancel pick-up at least 2 hours before for full refund\nShoes already collected cannot be returned uncleaned',
  },

  'Single Room Painting': {
    whatIncluded:
      'Surface preparation (sanding and crack filling)\nPrimer coat application\n2 coats of interior emulsion paint\nMasking of switches, sockets, and fixtures\nClean-up of paint spills and debris\nFinal finish inspection',
    whatNotIncluded:
      'Supply of paint (customer to provide)\nFurniture moving or protection\nTextured or designer finishes\nCeiling or exterior painting\nRepair of major wall damage',
    serviceProcess:
      'Painter inspects walls and fills cracks and holes\nSurfaces sanded smooth\nMasking tape applied to protect fixtures\nPrimer coat applied and dried\nTwo coats of chosen colour applied\nFinal touch-ups and clean-up done',
    requirements:
      'Paint and all materials (rollers, brushes) must be provided by customer\nFurniture must be moved away from walls before painter arrives\nRoom must be ventilated during and after painting\nElectricity to sockets in the room should be switched off at MCB',
    importantNotes:
      'Painting a standard 120 sq ft room typically takes 6–8 hours\nAvoid touching walls for at least 4 hours after completion\nFor dark colours, additional coats may be needed (quoted separately)\nStrong paint odour is normal — ventilate the room for 24 hours',
    cancellationPolicy:
      'Free cancellation up to 4 hours before scheduled time\nWithin 4 hours: 30% fee applies\nWork already started cannot be refunded',
  },

  'Sofa Cleaning': {
    whatIncluded:
      'Dry vacuuming of all sofa surfaces and crevices\nFabric or leather-appropriate deep cleaning\nSpot stain treatment\nDeodorant and anti-bacterial spray\nFinal steam treatment (fabric sofas)\nConditioning for leather sofas',
    whatNotIncluded:
      'Repair of tears, broken springs, or frame issues\nRe-upholstering\nCleaning of separately removable cushion covers (add-on)\nMattress or carpet cleaning',
    serviceProcess:
      'Sofa vacuumed to remove loose dust and crumbs\nStains spotted and pre-treated\nDeep clean solution applied and worked in\nSteam extraction or leather clean done\nDeodorant spray applied\nDrying time: 1–2 hours for fabric',
    requirements:
      'Sofa must be accessible from all sides\nRemove loose cushions and covers if possible\nRunning water and power socket required\nKeep pets and children away during service and for 2 hours after',
    importantNotes:
      'Sofa should not be sat on for at least 2 hours after cleaning\nFabric sofas may appear slightly wet — allow full drying before use\nOld stains may not fully lift in a single session\nLeather sofas should be kept away from direct sunlight for 24 hours post-conditioning',
    cancellationPolicy:
      'Free cancellation up to 2 hours before service\nWithin 2 hours: 20% fee\nSame-day cancellation: 40% fee',
  },

  'Stain Removal Treatment': {
    whatIncluded:
      'Assessment of stain type and fabric\nPre-treatment spray application\nProfessional stain removal for up to 5 stains\nSteam treatment where applicable\nFinal fabric inspection',
    whatNotIncluded:
      'Laundering or full wash of the garment\nPermanent or chemical-set stain removal guarantee\nReplacement in case of irreversible stain\nMore than 5 stains (additional charge per stain)',
    serviceProcess:
      'Stains assessed and fabric type determined\nAppropriate remover selected\nPre-treatment applied and worked in gently\nSteam or blotting used for extraction\nFabric checked under light\nFinal report given to customer',
    requirements:
      'Garments or items must be brought clean of other dirt\nMention all stains at the start — hidden stains found later may be out of scope\nDelicate or dry-clean-only fabrics must be flagged\nEnsure item is dry before handing over',
    importantNotes:
      'Results depend on stain age, type, and fabric — old stains may not fully lift\nProfessional will not guarantee 100% removal for set or chemical stains\nPatch test on a hidden area available on request',
    cancellationPolicy:
      'Cancel at least 1 hour before for a full refund\nWork already commenced is non-refundable',
  },

  'Steam Ironing': {
    whatIncluded:
      'Steam ironing of all garments (shirts, trousers, sarees, kurtas, etc.)\nHanging or folding as preferred\nUp to 15 garments per session',
    whatNotIncluded:
      'Washing or dry cleaning\nRepair of tears or stitching\nMore than 15 garments (charged per additional piece)\nIroning of leather or PVC garments',
    serviceProcess:
      'Garments sorted by fabric type\nSteam iron adjusted for each fabric\nEach garment pressed to remove creases\nGarments hung or folded as requested\nBatch checked for quality before handover',
    requirements:
      'Garments should be provided clean and dry\nPower socket near the work area required\nA flat surface (ironing board or table) should be available\nClear any fragile items from the workspace',
    importantNotes:
      'Heavily wrinkled garments may take additional time\nDelicate fabrics like silk and organza are done with a pressing cloth\nCustomer should inspect garments at time of handover',
    cancellationPolicy:
      'Free cancellation up to 1 hour before service\nLate cancellations: 10% fee\nRescheduling free with 2+ hours notice',
  },

  'Switch & Socket Repair': {
    whatIncluded:
      'Fault diagnosis of faulty switch or socket\nReplacement of switch or socket plate (if provided by customer)\nWiring reconnection and insulation check\nSafety test of repaired point\nUp to 3 switches or sockets per booking',
    whatNotIncluded:
      'Supply of switch or socket (customer to provide)\nNew wiring installation\nMCB or distribution board work\nRepair of appliances connected to the socket',
    serviceProcess:
      'Electrician isolates power to the affected point\nFaulty switch or socket removed and inspected\nNew unit installed and wiring reconnected\nInsulation and earthing checked\nPower restored and functionality tested\nWork area tidied',
    requirements:
      'Customer must provide the replacement switch or socket\nLocation of MCB or switchboard must be known\nPower to the circuit must be accessible\nKeep children away from the work area during repair',
    importantNotes:
      'Old or non-standard wiring discovered may need additional work (quoted separately)\nDo not use the repaired socket for heavy appliances for 1 hour after repair\nMore than 3 units in one visit may require additional time',
    cancellationPolicy:
      'Free cancellation up to 1 hour before appointment\nWithin 1 hour: 10% fee\nRescheduling is free with 2+ hours notice',
  },

  'Tap Repair & Installation': {
    whatIncluded:
      'Diagnosis of tap fault (dripping, stiff, or broken)\nWasher, cartridge, or O-ring replacement\nNew tap installation (if tap is provided by customer)\nThread sealing and leak test\nClean-up of work area',
    whatNotIncluded:
      'Supply of tap or fittings\nPipe replacement or re-routing\nWall-breaking or concealed plumbing\nBathroom renovation or tiling',
    serviceProcess:
      'Plumber shuts off water supply to the affected area\nFaulty tap removed and fault diagnosed\nWasher, cartridge, or O-ring replaced as needed\nNew tap fitted with thread tape for sealing\nWater restored and tap tested for leaks\nWork area cleaned',
    requirements:
      'Location of water shutoff valve must be accessible\nIf installing a new tap, it must be available before plumber arrives\nInform us if the tap is concealed or requires wall access\nClear the sink and surrounding area before the visit',
    importantNotes:
      'Mixer taps or sensor taps may require additional time\nOld or corroded pipes may complicate removal — quoted separately if encountered\nCustomer should monitor for drips for 24 hours after repair',
    cancellationPolicy:
      'Free cancellation up to 1 hour before appointment\nLate cancellation: 10% fee\nEmergency bookings are non-refundable',
  },

  'Wash & Fold Service': {
    whatIncluded:
      'Machine wash with quality detergent\nSoftener rinse\nDrying (machine or hang-dry based on fabric)\nFolding and packing\nUp to 5 kg of laundry per session\nDrop-back to your location',
    whatNotIncluded:
      'Dry cleaning or hand-wash-only garments\nIroning or pressing (add-on available)\nStain removal treatment (add-on available)\nPick-up and drop for orders under 2 kg',
    serviceProcess:
      'Garments sorted by colour and fabric\nMachine washed at appropriate temperature\nSoftener added during rinse cycle\nGarments dried and inspected\nFolded and packed neatly in a bag\nDropped back at your door',
    requirements:
      'Laundry must be packed in a bag for pick-up\nSeparate whites from colours before handing over (or inform us to do so)\nMention any delicate items that need cold wash\nEnsure someone is available for pick-up and drop-off',
    importantNotes:
      'Standard TAT is 24–48 hours\nDelicate items like woolens may be returned unironed\nDo not include items with "Dry Clean Only" labels\nCustomer should check garments at time of delivery',
    cancellationPolicy:
      'Cancel pick-up at least 2 hours before for full refund\nGarments already collected cannot be returned unwashed',
  },
};

async function seed() {
  const rows = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(isNull(services.whatIncluded));

  console.log(`Found ${rows.length} service(s) without detail content.`);

  let updated = 0;
  for (const row of rows) {
    const content = details[row.name];
    if (!content) {
      console.log(`  ⚠ No content defined for: "${row.name}" — skipping`);
      continue;
    }
    await db.update(services)
      .set({
        whatIncluded:       content.whatIncluded,
        whatNotIncluded:    content.whatNotIncluded,
        serviceProcess:     content.serviceProcess,
        requirements:       content.requirements,
        importantNotes:     content.importantNotes,
        cancellationPolicy: content.cancellationPolicy,
      })
      .where(eq(services.id, row.id));
    console.log(`  ✓ ${row.name}`);
    updated++;
  }
  console.log(`\nDone. Updated ${updated}/${rows.length} services.`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
