export const emergencyData = {
  firstAidInstructions: {
    Cardiac: {
      title: 'Cardiac Emergency - First Aid',
      steps: [
        'Call 108 immediately or ask someone to call',
        'Have the person sit or lie down in a comfortable position',
        'Loosen any tight clothing around the neck and chest',
        'If the person is unconscious and not breathing, begin CPR',
        'If available, use an AED (Automated External Defibrillator)',
        'Stay with the person until emergency services arrive',
        'Do not give food or water',
      ],
      warnings: [
        'Do NOT leave the person alone',
        'Do NOT give aspirin unless directed by emergency services',
        'If person loses consciousness, begin CPR immediately',
      ],
    },
    Accident: {
      title: 'Accident / Trauma - First Aid',
      steps: [
        'Ensure the scene is safe before approaching',
        'Call 108 immediately',
        'Do NOT move the person unless in immediate danger',
        'Keep the person still and calm',
        'Control any bleeding by applying firm pressure',
        'Keep the person warm with a blanket if available',
        'Monitor breathing and consciousness',
        'Do not remove any embedded objects',
      ],
      warnings: [
        'Do NOT move a person with suspected spinal injury',
        'Do NOT remove a helmet if spinal injury is suspected',
        'Do NOT give food or water',
      ],
    },
    Breathing: {
      title: 'Breathing Difficulty - First Aid',
      steps: [
        'Call 108 immediately',
        'Help the person sit upright - do not lay them flat',
        'Loosen any tight clothing around neck and chest',
        'Keep the person calm - anxiety worsens breathing',
        'If they have an inhaler, help them use it',
        'Open windows for fresh air if indoors',
        'If breathing stops, begin rescue breathing',
      ],
      warnings: [
        'Do NOT lay the person flat if they are having trouble breathing',
        'Do NOT give food or water',
        'If lips turn blue, this is critical - call 108 immediately',
      ],
    },
    Bleeding: {
      title: 'Severe Bleeding - First Aid',
      steps: [
        'Call 108 for severe bleeding',
        'Apply firm, direct pressure to the wound',
        'Use a clean cloth, bandage, or clothing',
        'Do NOT remove the cloth - add more on top if it soaks through',
        'Elevate the injured area above heart level if possible',
        'Keep pressure for at least 10-15 minutes',
        'If a limb is severely injured, consider tourniquet above the wound',
        'Keep the person warm and calm',
      ],
      warnings: [
        'Do NOT remove embedded objects from wounds',
        'Do NOT use a tourniquet unless bleeding is life-threatening',
        'Do NOT give food or water',
      ],
    },
    Burns: {
      title: 'Burns - First Aid',
      steps: [
        'Remove the person from the source of burn',
        'Cool the burn with cool (not cold) running water for 20 minutes',
        'Do NOT use ice, butter, or toothpaste',
        'Remove jewelry and clothing near the burn (if not stuck)',
        'Cover loosely with a clean, non-fluffy material',
        'Call 108 for severe burns, burns on face/hands/genitals',
        'Do not burst any blisters',
      ],
      warnings: [
        'Do NOT use ice - it can cause frostbite',
        'Do NOT apply butter, oil, or toothpaste',
        'Do NOT burst blisters',
        'Chemical burns: flush with water for 20+ minutes',
      ],
    },
    Seizure: {
      title: 'Seizure - First Aid',
      steps: [
        'Stay calm and time the seizure',
        'Clear the area of hard or sharp objects',
        'Do NOT restrain the person',
        'Gently cushion the head with something soft',
        'Turn the person on their side (recovery position) after convulsions stop',
        'Call 108 if seizure lasts more than 5 minutes',
        'Stay with the person until fully conscious',
      ],
      warnings: [
        'Do NOT put anything in the person\'s mouth',
        'Do NOT restrain the person',
        'Call 108 if: first seizure, lasts >5 min, person doesn\'t wake up',
      ],
    },
    Stroke: {
      title: 'Stroke - FAST Response',
      steps: [
        'Remember FAST: Face, Arms, Speech, Time',
        'F - Face drooping? Ask them to smile',
        'A - Arm weakness? Ask them to raise both arms',
        'S - Speech difficulty? Ask them to repeat a simple phrase',
        'T - Time to call 108 immediately if any signs present',
        'Note the time symptoms started',
        'Keep the person calm and still',
        'Do not give food or water',
      ],
      warnings: [
        'Do NOT give aspirin or other medications',
        'Do NOT give food or water',
        'Time is critical - every minute counts',
        'Do NOT let the person "sleep it off"',
      ],
    },
    Poisoning: {
      title: 'Poisoning - First Aid',
      steps: [
        'Call 108 or Poison Control immediately',
        'Do NOT induce vomiting unless directed by medical professionals',
        'If conscious, keep the person calm',
        'If unconscious, place in recovery position',
        'Collect information: what was taken, how much, when',
        'Bring the container/substance to the hospital',
        'Monitor breathing and consciousness',
      ],
      warnings: [
        'Do NOT induce vomiting without medical advice',
        'Do NOT give milk or water unless directed',
        'For chemical exposure: remove contaminated clothing, flush skin with water',
      ],
    },
    General: {
      title: 'General Emergency - First Aid',
      steps: [
        'Call 108 immediately',
        'Keep the person calm and still',
        'Assess: Is the person conscious? Breathing?',
        'If not breathing, begin CPR',
        'Control any visible bleeding',
        'Keep the person warm',
        'Do not move unless in immediate danger',
        'Stay with the person until help arrives',
      ],
      warnings: [
        'Do NOT give food or water',
        'Do NOT move a person with possible spinal injury',
        'Call 108 if unsure - it is always better to call',
      ],
    },
  } as Record<string, { title: string; steps: string[]; warnings: string[] }>,

  bystanderGuides: {
    cpr: {
      title: 'CPR - Cardiopulmonary Resuscitation',
      steps: [
        'Check for responsiveness - tap shoulders, shout "Are you okay?"',
        'Call 108 or ask someone to call',
        'Place heel of hand on center of chest',
        'Push down hard and fast - at least 2 inches deep',
        'Give 30 compressions at 100-120 per minute',
        'Give 2 rescue breaths - tilt head, lift chin, pinch nose',
        'Continue 30:2 ratio until help arrives',
      ],
    },
    bleeding: {
      title: 'Controlling Severe Bleeding',
      steps: [
        'Call 108 immediately',
        'Put on gloves if available',
        'Apply firm, direct pressure to the wound',
        'Use clean cloth, bandage, or clothing',
        'Do NOT remove the cloth - add more on top',
        'Elevate the injured area above heart level',
        'Maintain pressure for at least 10-15 minutes',
        'If limb bleeding is uncontrolled, apply tourniquet 2-3 inches above wound',
      ],
    },
    breathing: {
      title: 'Helping with Breathing Difficulty',
      steps: [
        'Call 108 immediately',
        'Help person sit upright - do not lay flat',
        'Loosen tight clothing around neck and chest',
        'Keep person calm - anxiety worsens breathing',
        'Open windows for fresh air',
        'If they have an inhaler, help them use it',
        'If breathing stops, begin rescue breathing',
      ],
    },
    general: {
      title: 'General Emergency Response',
      steps: [
        'Ensure the scene is safe for you to approach',
        'Call 108 immediately',
        'Check if person is conscious - tap and shout',
        'Check if person is breathing',
        'If not breathing, begin CPR',
        'Control any visible bleeding',
        'Keep person warm and still',
        'Stay with them until help arrives',
      ],
    },
  } as Record<string, { title: string; steps: string[] }>,

  goodSamaritanLaw: `Under the Good Samaritan Law (India), any person who in good faith provides emergency medical assistance to an accident victim shall not be liable for any civil or criminal action. You CANNOT be detained by police or hospital staff, held financially liable, or forced to take responsibility. Your identity will be kept confidential. Help confidently — you are legally protected.`,

  emergencyNumbers: {
    ambulance: '108',
    police: '100',
    fire: '101',
    disaster: '1078',
    women: '1091',
    child: '1098',
  },

  cprSteps: [
    'Check for responsiveness',
    'Call 108',
    'Position hands on center of chest',
    '30 compressions (hard & fast)',
    '2 rescue breaths',
    'Repeat until help arrives',
  ],

  bleedingControlSteps: [
    'Apply direct pressure',
    'Use clean cloth',
    'Do not remove cloth',
    'Elevate if possible',
    'Maintain pressure 10-15 min',
    'Consider tourniquet for limbs',
  ],

  recoveryPositionSteps: [
    'Kneel beside the person',
    'Place nearest arm at right angle',
    'Bring far arm across chest',
    'Bend far knee up',
    'Roll person toward you',
    'Tilt head back to open airway',
    'Monitor breathing',
  ],
};

export default emergencyData;
