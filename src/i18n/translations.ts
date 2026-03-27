export type Language = 'en' | 'fr';

export const translations = {
  en: {
    // ── Common ─────────────────────────────────────────────────────────────
    common: {
      cancel: 'Cancel',
      ok: 'OK',
      skip: 'Skip',
      next: 'Next',
      getStarted: 'Get started',
      continue: 'Continue',
      settings: 'Settings',
      enable: 'Enable',
      delete: 'Delete',
    },

    // ── HomeScreen ─────────────────────────────────────────────────────────
    home: {
      title: 'Welcome to DashViewCar',
      subtitle: 'Shout Dash, Drive free, Forget nothing!',

      overlayWarning: '⚠️ Overlay permission missing — tap to fix',
      overlayWarningDesc: 'Recording screen may not appear over other apps',

      honorWarning: '⚠️ Honor: background blocked by MagicOS',
      honorDesc: 'Settings → DashViewCar → Battery → No restrictions',
      honorAction: 'Open settings →',

      voiceTitle: 'Voice Detection',
      voiceListening: 'Listening for "Dash"...',
      voiceSaving: 'Saving clip...',
      voiceIdle: 'Say "Dash" to record',

      speedTitle: 'Speed Protection',
      speedMonitoring: 'Monitoring — {speed} km/h',
      speedIdle: 'Auto-saves on sudden deceleration',
      speedLastDrop: '⚡ Last drop: {from}→{to} km/h',

      testTitle: 'Test Recording',
      testDesc: 'Verify your camera & storage',
      testBtn: 'Run Test',
      testBtnCountdown: 'Starting in {n}...',
      testBtnRecording: 'Test · {n}s left',
      testBtnSaving: 'Saving test clip...',
      testCancelBtn: 'Cancel',

      noCameraTitle: 'Camera Unavailable',
      noCameraDesc: 'No back camera detected.',

      voiceTriggered: '🎤 Voice triggered',
      speedTriggered: '⚡ Speed triggered',
      stopEarly: 'Stop Early',

      pillListening: '🎤 Listening',
      pillSaving: '💾 Saving...',

      micModalTitle: '⚠️ Microphone Notice',
      micModalBody:
        'DashViewCar uses your microphone continuously in the background to detect the wake word "Dash".\n\nThis may interfere with other voice assistants. Your audio is processed entirely on-device and never recorded or transmitted.',
      micModalConfirm: 'I understand, activate',

      voiceUnavailableTitle: 'Voice Recognition Unavailable',
      voiceUnavailableBody: 'Check that microphone permission is granted.',

      couldNotStartTitle: 'Could Not Start Service',
      couldNotStartBody: 'Background service failed to start.\n\n{error}',

      micRequiredTitle: 'Microphone Required',
      micRequiredBody: "Grant microphone access in Settings so DashViewCar can listen for 'Dash'.",

      testFailedTitle: 'Test Failed',
      saveFailedTitle: 'Save Failed',

      testSavedToast: 'Test clip saved ✅',
      batteryLowToast: 'DashViewCar paused — battery too low (<10%)',
      batteryWarnToast: '⚠️ Low battery ({level}%) — DashViewCar may stop to preserve charge',
    },

    // ── ClipsScreen ────────────────────────────────────────────────────────
    clips: {
      title: 'Your Clips',
      emptyTitle: 'No clips yet',
      emptyBody: 'Say "Dash" while Voice Detection is active, or run a test to get started.',
      shareMessage: 'DashViewCar clip — {timestamp}',
    },

    // ── OnboardingScreen ───────────────────────────────────────────────────
    onboarding: {
      slide1Title: 'Your phone.\nYour dashcam.',
      slide1Body: 'DashViewCar protects you on the road — silently, in the background.',
      slide2Title: 'Just say "Dash"',
      slide2Body: '"Dash" is all it takes. DashViewCar saves the moment automatically.',
      slide3Title: 'Smart protection',
      slide3Body: 'Enable speed drop detection for automatic emergency recording.',

      permTitle: 'Permissions required',
      permBody: 'DashViewCar needs the following permissions to work properly.',
      permCamera: 'Camera',
      permCameraDesc: 'Records 60 seconds when triggered',
      permMic: 'Microphone',
      permMicDesc: "Listens for the 'Dash' wake word",
      permLocation: 'Location (Always)',
      permLocationDesc: 'GPS coordinates and speed metadata',
      permStorage: 'Storage',
      permStorageDesc: 'Saves video clips to your device',
      permOverlay: 'Display over other apps',
      permOverlayDesc: 'Shows recording screen when triggered from background',
      permAllowBtn: 'Allow permissions',
      permRequesting: 'Requesting...',

      permCameraRequired: 'Camera required',
      permCameraRequiredDesc: 'Camera access is required to record when triggered.',
      permMicRequired: 'Microphone required',
      permMicRequiredDesc: "Microphone access is required to listen for the 'Dash' wake word.",
      permLocationRequired: 'Location required',
      permLocationRequiredDesc:
        'Location access is required to record GPS coordinates and speed metadata.',

      overlayTitle: 'One more thing',
      overlayBody:
        'Allow DashViewCar to appear over other apps — so the recording screen pops up instantly when you say "Dash", even if Waze or another app is open.',
      overlayGrantBtn: 'Grant permission →',
      overlayGranting: 'Opening settings...',
      overlayGranted: "✅ Permission granted — you're all set!",
      overlayNotYetTitle: 'Not enabled yet',
      overlayNotYetBody:
        'Enable "Display over other apps" for DashViewCar in Settings, then come back and tap Continue.',
      overlaySkip: 'Skip — recording screen may not appear over other apps',
    },

    // ── SettingsScreen ─────────────────────────────────────────────────────
    settings: {
      title: 'Settings',

      sectionVoice: 'Voice',
      wakeWord: 'Wake Word',
      wakeWordValue: '"Dash"',
      wakeWordNote: 'Premium: custom words coming soon',
      recognition: 'Recognition',
      recognitionValue: 'Offline · No internet needed',

      sectionSpeed: 'Speed',
      speedDropLabel: 'Speed Drop Detection',
      speedDropDesc: 'Auto-saves on sudden deceleration',
      speedGpsWarning: '⚠️ GPS must be active for this feature to work',
      speedEnableTitle: 'Enable Speed Protection',
      speedEnableBody: '⚠️ GPS must be active for this to work.',
      sensitivity: 'Detection Sensitivity',
      sensLow: 'Low',
      sensLowDesc: '50 km/h drop',
      sensMedium: 'Medium',
      sensMediumDesc: '30 km/h drop',
      sensHigh: 'High',
      sensHighDesc: '20 km/h drop',

      sectionVideo: 'Video',
      clipDuration: 'Clip Duration',
      clipDurationValue: '60 seconds (fixed)',
      quality: 'Quality',
      quality720: '720p',
      quality720Desc: 'Smaller files',
      quality1080: '1080p',
      quality1080Desc: 'Best quality',

      sectionStorage: 'Storage',
      autoDelete: 'Auto-Delete Clips',
      autoDeleteNever: 'Never',
      autoDeleteNeverDesc: '',
      autoDelete7: '7 days',
      autoDelete7Desc: '',
      autoDelete30: '30 days',
      autoDelete30Desc: '',
      clearAllBtn: '🗑  Clear all clips',
      clearAllTitle: 'Clear all clips?',
      clearAllBody: 'This will permanently delete all saved clips.',
      deleteAll: 'Delete All',

      sectionBattery: 'Battery Impact',
      batteryIntro: 'Estimated battery usage while DashViewCar is active:',
      batteryVoice: 'Voice Detection (VAD)',
      batteryVoiceDesc: '~2–4% per hour',
      batterySpeed: 'Speed Protection (GPS)',
      batterySpeedDesc: '~1–3% per hour',
      batteryRecording: 'Recording (when triggered)',
      batteryRecordingDesc: '~8–12% per minute',
      batteryLowNote: 'Voice detection pauses automatically when battery drops below 10%.',

      sectionAbout: 'About',
      appVersion: 'App Version',
      appVersionValue: 'DashViewCar v1.0.0',

      sectionDev: 'Developer',
      devReloadClips: '🔄  Reload clips from disk',
      devSimulateVoice: '🎤  Simulate voice trigger',
      devSpeedSims: 'Speed Protection Simulations',
      devNote: 'Each simulation uses the exact same save pipeline as a real trigger. Voice Detection must be ON.',
      devNotActiveTitle: 'Not active',
      devNotActiveBody: 'Enable Voice Detection from the Home screen first.',
      devGentleToast: '✅ Normal braking — not detected (need {threshold} km/h drop)',
      devNormalBrakingTitle: 'Not triggered',

      sectionLanguage: 'Language',
      languageLabel: 'App Language',
      langEn: 'English',
      langFr: 'Français',
    },
  },

  fr: {
    // ── Common ─────────────────────────────────────────────────────────────
    common: {
      cancel: 'Annuler',
      ok: 'OK',
      skip: 'Ignorer',
      next: 'Suivant',
      getStarted: 'Commencer',
      continue: 'Continuer',
      settings: 'Réglages',
      enable: 'Activer',
      delete: 'Supprimer',
    },

    // ── HomeScreen ─────────────────────────────────────────────────────────
    home: {
      title: 'Bienvenue sur DashViewCar',
      subtitle: 'Dis Dash, conduis libre, oublie rien !',

      overlayWarning: '⚠️ Permission superposition manquante — appuyez pour corriger',
      overlayWarningDesc: "L'écran de capture peut ne pas apparaître par-dessus les autres applis",

      honorWarning: '⚠️ Honor : arrière-plan bloqué par MagicOS',
      honorDesc: 'Paramètres → DashViewCar → Batterie → Aucune restriction',
      honorAction: 'Ouvrir les paramètres →',

      voiceTitle: 'Détection vocale',
      voiceListening: 'En écoute "Dash"...',
      voiceSaving: 'Sauvegarde en cours...',
      voiceIdle: 'Dites "Dash" pour enregistrer',

      speedTitle: 'Protection vitesse',
      speedMonitoring: 'Surveillance — {speed} km/h',
      speedIdle: 'Sauvegarde auto en cas de freinage brusque',
      speedLastDrop: '⚡ Dernière chute : {from}→{to} km/h',

      testTitle: 'Test enregistrement',
      testDesc: 'Vérifiez caméra & stockage',
      testBtn: 'Lancer le test',
      testBtnCountdown: 'Démarrage dans {n}...',
      testBtnRecording: 'Test · {n}s restantes',
      testBtnSaving: 'Sauvegarde du clip test...',
      testCancelBtn: 'Annuler',

      noCameraTitle: 'Caméra indisponible',
      noCameraDesc: "Aucune caméra arrière détectée.",

      voiceTriggered: '🎤 Déclenchement vocal',
      speedTriggered: '⚡ Déclenchement vitesse',
      stopEarly: 'Arrêter',

      pillListening: '🎤 En écoute',
      pillSaving: '💾 Sauvegarde...',

      micModalTitle: '⚠️ Avis microphone',
      micModalBody:
        'DashViewCar utilise votre microphone en continu en arrière-plan pour détecter le mot-clé "Dash".\n\nCela peut interférer avec d\'autres assistants vocaux. Le traitement audio s\'effectue entièrement sur l\'appareil, sans enregistrement ni transmission.',
      micModalConfirm: 'Je comprends, activer',

      voiceUnavailableTitle: 'Reconnaissance vocale indisponible',
      voiceUnavailableBody: "Vérifiez que la permission microphone est accordée.",

      couldNotStartTitle: 'Impossible de démarrer',
      couldNotStartBody: "Le service en arrière-plan n'a pas pu démarrer.\n\n{error}",

      micRequiredTitle: 'Microphone requis',
      micRequiredBody:
        "Accordez l'accès au microphone dans les Paramètres pour que DashViewCar puisse écouter le mot \"Dash\".",

      testFailedTitle: 'Test échoué',
      saveFailedTitle: 'Sauvegarde échouée',

      testSavedToast: 'Clip test sauvegardé ✅',
      batteryLowToast: 'DashViewCar mis en pause — batterie trop faible (<10%)',
      batteryWarnToast:
        '⚠️ Batterie faible ({level}%) — DashViewCar peut s\'arrêter pour préserver la charge',
    },

    // ── ClipsScreen ────────────────────────────────────────────────────────
    clips: {
      title: 'Vos clips',
      emptyTitle: 'Aucun clip pour l\'instant',
      emptyBody:
        'Dites "Dash" avec la détection vocale active, ou lancez un test pour commencer.',
      shareMessage: 'Clip DashViewCar — {timestamp}',
    },

    // ── OnboardingScreen ───────────────────────────────────────────────────
    onboarding: {
      slide1Title: 'Votre téléphone.\nVotre dashcam.',
      slide1Body:
        "DashViewCar vous protège sur la route — silencieusement, en arrière-plan.",
      slide2Title: 'Dites juste "Dash"',
      slide2Body:
        '"Dash" suffit. DashViewCar sauvegarde le moment automatiquement.',
      slide3Title: 'Protection intelligente',
      slide3Body:
        "Activez la détection de chute de vitesse pour un enregistrement d'urgence automatique.",

      permTitle: 'Permissions requises',
      permBody:
        "DashViewCar a besoin des permissions suivantes pour fonctionner correctement.",
      permCamera: 'Caméra',
      permCameraDesc: "Enregistre 60 secondes lorsque déclenché",
      permMic: 'Microphone',
      permMicDesc: 'Écoute le mot-clé "Dash"',
      permLocation: 'Localisation (toujours)',
      permLocationDesc: "Coordonnées GPS et métadonnées de vitesse",
      permStorage: 'Stockage',
      permStorageDesc: 'Sauvegarde les clips vidéo sur l\'appareil',
      permOverlay: 'Superposer aux autres applis',
      permOverlayDesc:
        "Affiche l'écran de capture lors d'un déclenchement en arrière-plan",
      permAllowBtn: 'Autoriser les permissions',
      permRequesting: 'En cours...',

      permCameraRequired: 'Caméra requise',
      permCameraRequiredDesc:
        'L\'accès à la caméra est nécessaire pour enregistrer lors d\'un déclenchement.',
      permMicRequired: 'Microphone requis',
      permMicRequiredDesc:
        'L\'accès au microphone est nécessaire pour écouter le mot-clé "Dash".',
      permLocationRequired: 'Localisation requise',
      permLocationRequiredDesc:
        "L'accès à la localisation est nécessaire pour enregistrer les coordonnées GPS et la vitesse.",

      overlayTitle: 'Encore une chose',
      overlayBody:
        'Autorisez DashViewCar à s\'afficher par-dessus les autres applis — pour que l\'écran de capture s\'ouvre instantanément quand vous dites "Dash", même si Waze ou une autre appli est ouverte.',
      overlayGrantBtn: 'Accorder la permission →',
      overlayGranting: 'Ouverture des paramètres...',
      overlayGranted: '✅ Permission accordée — tout est prêt !',
      overlayNotYetTitle: 'Pas encore activé',
      overlayNotYetBody:
        'Activez "Superposer aux autres applis" pour DashViewCar dans les Paramètres, puis revenez et appuyez sur Continuer.',
      overlaySkip:
        "Ignorer — l'écran de capture peut ne pas apparaître par-dessus les autres applis",
    },

    // ── SettingsScreen ─────────────────────────────────────────────────────
    settings: {
      title: 'Réglages',

      sectionVoice: 'Voix',
      wakeWord: 'Mot-clé',
      wakeWordValue: '"Dash"',
      wakeWordNote: 'Premium : mots personnalisés bientôt disponibles',
      recognition: 'Reconnaissance',
      recognitionValue: 'Hors ligne · Sans internet',

      sectionSpeed: 'Vitesse',
      speedDropLabel: 'Détection de chute de vitesse',
      speedDropDesc: 'Sauvegarde auto en cas de freinage brusque',
      speedGpsWarning: '⚠️ Le GPS doit être actif pour cette fonction',
      speedEnableTitle: 'Activer la protection vitesse',
      speedEnableBody: '⚠️ Le GPS doit être actif pour que ça fonctionne.',
      sensitivity: 'Sensibilité de détection',
      sensLow: 'Faible',
      sensLowDesc: 'Chute de 50 km/h',
      sensMedium: 'Moyenne',
      sensMediumDesc: 'Chute de 30 km/h',
      sensHigh: 'Élevée',
      sensHighDesc: 'Chute de 20 km/h',

      sectionVideo: 'Vidéo',
      clipDuration: 'Durée du clip',
      clipDurationValue: '60 secondes (fixe)',
      quality: 'Qualité',
      quality720: '720p',
      quality720Desc: 'Fichiers plus légers',
      quality1080: '1080p',
      quality1080Desc: 'Meilleure qualité',

      sectionStorage: 'Stockage',
      autoDelete: 'Suppression automatique',
      autoDeleteNever: 'Jamais',
      autoDeleteNeverDesc: '',
      autoDelete7: '7 jours',
      autoDelete7Desc: '',
      autoDelete30: '30 jours',
      autoDelete30Desc: '',
      clearAllBtn: '🗑  Supprimer tous les clips',
      clearAllTitle: 'Supprimer tous les clips ?',
      clearAllBody: 'Cela supprimera définitivement tous les clips sauvegardés.',
      deleteAll: 'Tout supprimer',

      sectionBattery: 'Impact batterie',
      batteryIntro:
        "Consommation estimée de la batterie lorsque DashViewCar est actif :",
      batteryVoice: 'Détection vocale (VAD)',
      batteryVoiceDesc: '~2–4 % par heure',
      batterySpeed: 'Protection vitesse (GPS)',
      batterySpeedDesc: '~1–3 % par heure',
      batteryRecording: "Enregistrement (lors d'un déclenchement)",
      batteryRecordingDesc: '~8–12 % par minute',
      batteryLowNote:
        "La détection vocale se met en pause automatiquement lorsque la batterie descend en dessous de 10 %.",

      sectionAbout: 'À propos',
      appVersion: 'Version',
      appVersionValue: 'DashViewCar v1.0.0',

      sectionDev: 'Développeur',
      devReloadClips: '🔄  Recharger les clips depuis le disque',
      devSimulateVoice: '🎤  Simuler un déclenchement vocal',
      devSpeedSims: 'Simulations protection vitesse',
      devNote:
        "Chaque simulation utilise exactement le même pipeline de sauvegarde qu'un vrai déclenchement. La détection vocale doit être activée.",
      devNotActiveTitle: 'Non actif',
      devNotActiveBody:
        "Activez la détection vocale depuis l'écran d'accueil d'abord.",
      devGentleToast:
        '✅ Freinage normal — non détecté (besoin de {threshold} km/h de chute)',
      devNormalBrakingTitle: 'Non déclenché',

      sectionLanguage: 'Langue',
      languageLabel: 'Langue de l\'appli',
      langEn: 'English',
      langFr: 'Français',
    },
  },
} as const;

export type TranslationKeys = typeof translations.en;
