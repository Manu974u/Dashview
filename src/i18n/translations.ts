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
      subtitle: 'Shout Go Dash, Drive free, Forget nothing!',

      overlayWarning: '⚠️ Overlay permission missing — tap to fix',
      overlayWarningDesc: 'Recording screen may not appear over other apps',

      batteryOptWarning: '🔋 Battery optimization is ON — tap to fix',
      batteryOptWarningDesc: 'Voice detection may be killed in the background. Tap → disable optimization for DashViewCar',

      honorWarning: '⚠️ Honor: background blocked by MagicOS',
      honorDesc: 'Settings → DashViewCar → Battery → No restrictions',
      honorAction: 'Open settings →',

      voiceTitle: 'Voice Detection',
      voiceListening: 'Listening for "Go Dash"...',
      voiceSaving: 'Saving clip...',
      voiceIdle: 'Say "Go Dash" to record',

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
        'DashViewCar uses your microphone continuously in the background to detect the wake word "Go Dash".\n\nThis may interfere with other voice assistants. Your audio is processed entirely on-device and never recorded or transmitted.',
      micModalConfirm: 'I understand, activate',

      voiceUnavailableTitle: 'Voice Recognition Unavailable',
      voiceUnavailableBody: 'Check that microphone permission is granted.',

      couldNotStartTitle: 'Could Not Start Service',
      couldNotStartBody: 'Background service failed to start.\n\n{error}',

      micRequiredTitle: 'Microphone Required',
      micRequiredBody: "Grant microphone access in Settings so DashViewCar can listen for 'Go Dash'.",

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
      emptyBody: 'Say "Go Dash" while Voice Detection is active, or run a test to get started.',
      shareMessage: 'DashViewCar clip — {timestamp}',
    },

    // ── OnboardingScreen ───────────────────────────────────────────────────
    onboarding: {
      slide1Title: 'Your phone.\nYour dashcam.',
      slide1Body: 'DashViewCar protects you on the road — silently, in the background.',
      slide2Title: 'Just say "Go Dash"',
      slide2Body: '"Go Dash" is all it takes. DashViewCar saves the moment automatically.',
      slide3Title: 'Smart protection',
      slide3Body: 'Enable speed drop detection for automatic emergency recording.',

      permTitle: 'Permissions required',
      permBody: 'DashViewCar needs the following permissions to work properly.',
      permCamera: 'Camera',
      permCameraDesc: 'Records video when triggered (duration configurable in Settings)',
      permMic: 'Microphone',
      permMicDesc: "Listens for the 'Go Dash' wake word",
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
      permMicRequiredDesc: "Microphone access is required to listen for the 'Go Dash' wake word.",
      permLocationRequired: 'Location required',
      permLocationRequiredDesc:
        'Location access is required to record GPS coordinates and speed metadata.',

      overlayTitle: 'One more thing',
      overlayBody:
        'Allow DashViewCar to appear over other apps — so the recording screen pops up instantly when you say "Go Dash", even if Waze or another app is open.',
      overlayGrantBtn: 'Grant permission automatically',
      overlayGranting: 'Opening settings...',
      overlayInstruction: 'Enable the toggle next to DashViewCar on the next screen, then come back here',
      overlayRetryBtn: 'Try again →',
      overlayNotGrantedYet: '⚠️ Permission not enabled yet — go back to settings and enable the toggle next to DashViewCar',
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
      wakeWordValue: '"Go Dash"',
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
      clipDurationTitle: 'Clip Duration',
      clipDurationDesc: 'Recording length per trigger',
      clipDuration60: '60 sec',
      clipDuration120: '2 min',
      clipDuration240: '4 min',
      clipDuration480: '8 min',
      clipDurationWarning: '⚠️ Longer clips use more battery and storage',
      clipDurationBatteryNote60: 'Recommended — minimal battery impact',
      clipDurationBatteryNote120: 'Moderate battery usage',
      clipDurationBatteryNote240: 'High battery usage',
      clipDurationBatteryNote480: 'Very high battery usage — charge recommended',
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
      appVersionValue: 'DashViewCar v1.0.2',

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
      languageAutoDetected: 'Detected from your device settings',
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
      subtitle: 'Dis Go Dash, conduis libre, oublie rien !',

      overlayWarning: '⚠️ Permission superposition manquante — appuyez pour corriger',
      overlayWarningDesc: "L'écran de capture peut ne pas apparaître par-dessus les autres applis",

      batteryOptWarning: '🔋 Optimisation batterie active — appuyez pour corriger',
      batteryOptWarningDesc: "La détection vocale peut être tuée en arrière-plan. Appuyez → désactivez l'optimisation pour DashViewCar",

      honorWarning: '⚠️ Honor : arrière-plan bloqué par MagicOS',
      honorDesc: 'Paramètres → DashViewCar → Batterie → Aucune restriction',
      honorAction: 'Ouvrir les paramètres →',

      voiceTitle: 'Détection vocale',
      voiceListening: 'En écoute "Go Dash"...',
      voiceSaving: 'Sauvegarde en cours...',
      voiceIdle: 'Dites "Go Dash" pour enregistrer',

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
        'DashViewCar utilise votre microphone en continu en arrière-plan pour détecter le mot-clé "Go Dash".\n\nCela peut interférer avec d\'autres assistants vocaux. Le traitement audio s\'effectue entièrement sur l\'appareil, sans enregistrement ni transmission.',
      micModalConfirm: 'Je comprends, activer',

      voiceUnavailableTitle: 'Reconnaissance vocale indisponible',
      voiceUnavailableBody: "Vérifiez que la permission microphone est accordée.",

      couldNotStartTitle: 'Impossible de démarrer',
      couldNotStartBody: "Le service en arrière-plan n'a pas pu démarrer.\n\n{error}",

      micRequiredTitle: 'Microphone requis',
      micRequiredBody:
        "Accordez l'accès au microphone dans les Paramètres pour que DashViewCar puisse écouter le mot \"Go Dash\".",

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
        'Dites "Go Dash" avec la détection vocale active, ou lancez un test pour commencer.',
      shareMessage: 'Clip DashViewCar — {timestamp}',
    },

    // ── OnboardingScreen ───────────────────────────────────────────────────
    onboarding: {
      slide1Title: 'Votre téléphone.\nVotre dashcam.',
      slide1Body:
        "DashViewCar vous protège sur la route — silencieusement, en arrière-plan.",
      slide2Title: 'Dites juste "Go Dash"',
      slide2Body:
        '"Go Dash" suffit. DashViewCar sauvegarde le moment automatiquement.',
      slide3Title: 'Protection intelligente',
      slide3Body:
        "Activez la détection de chute de vitesse pour un enregistrement d'urgence automatique.",

      permTitle: 'Permissions requises',
      permBody:
        "DashViewCar a besoin des permissions suivantes pour fonctionner correctement.",
      permCamera: 'Caméra',
      permCameraDesc: 'Enregistre une vidéo au déclenchement (durée configurable dans Paramètres)',
      permMic: 'Microphone',
      permMicDesc: 'Écoute le mot-clé "Go Dash"',
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
        'L\'accès au microphone est nécessaire pour écouter le mot-clé "Go Dash".',
      permLocationRequired: 'Localisation requise',
      permLocationRequiredDesc:
        "L'accès à la localisation est nécessaire pour enregistrer les coordonnées GPS et la vitesse.",

      overlayTitle: 'Encore une chose',
      overlayBody:
        'Autorisez DashViewCar à s\'afficher par-dessus les autres applis — pour que l\'écran de capture s\'ouvre instantanément quand vous dites "Go Dash", même si Waze ou une autre appli est ouverte.',
      overlayGrantBtn: 'Accorder la permission automatiquement',
      overlayGranting: 'Ouverture des paramètres...',
      overlayInstruction: "Activez le bouton DashViewCar sur l'écran suivant, puis revenez ici",
      overlayRetryBtn: 'Réessayer →',
      overlayNotGrantedYet: "⚠️ Permission non activée — retournez aux paramètres et activez le bouton DashViewCar",
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
      wakeWordValue: '"Go Dash"',
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
      clipDurationTitle: 'Durée des clips',
      clipDurationDesc: 'Durée d\'enregistrement par déclenchement',
      clipDuration60: '60 sec',
      clipDuration120: '2 min',
      clipDuration240: '4 min',
      clipDuration480: '8 min',
      clipDurationWarning: '⚠️ Les clips plus longs consomment plus de batterie et de stockage',
      clipDurationBatteryNote60: 'Recommandé — impact batterie minimal',
      clipDurationBatteryNote120: 'Consommation batterie modérée',
      clipDurationBatteryNote240: 'Consommation batterie élevée',
      clipDurationBatteryNote480: 'Consommation très élevée — charge recommandée',
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
      appVersionValue: 'DashViewCar v1.0.2',

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
      languageLabel: "Langue de l'appli",
      languageAutoDetected: 'Détectée depuis les paramètres de votre appareil',
      langEn: 'English',
      langFr: 'Français',
    },
  },
} as const;

export type TranslationKeys = typeof translations.en;
