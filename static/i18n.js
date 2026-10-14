"use strict";

/* UI texts. Placeholders: {name}. Plurals: keys with .one / .other (see tn()). */
const I18N = {
  de: {
    "nav.studio": "Studio", "nav.capture": "Aufnehmen", "nav.voices": "Stimmen", "nav.gallery": "Galerie", "nav.settings": "Einstellungen",
    "tip.title": "Tipp", "tip.text": "Strg + Enter generiert im Studio. Tasten 1 bis 5 wechseln die Ansicht.",

    "studio.title": "Studio", "studio.sub": "Text eingeben, Stimme wählen, generieren.",
    "studio.text": "Text", "studio.placeholder": "Was soll die Stimme sagen? Zum Beispiel: Hallo, das ist meine geklonte Stimme.",
    "studio.expressive": "Ausdrucksstark", "studio.generate": "Generieren",

    "ctl.title": "Feinsteuerung", "ctl.reset": "Zurücksetzen",
    "ctl.emotion": "Gefühl", "ctl.events": "Geräusche", "ctl.emphasis": "Betonen",
    "ctl.modeStart": "Anfang", "ctl.modeCursor": "Wechsel", "ctl.segments": "{n} Abschnitte, jeder einzeln erzeugt: {list}", "result.segments": "{n} Abschnitte",
    "ctl.split": "Gefühlswechsel", "ctl.splitOn": "In Abschnitten (empfohlen)", "ctl.splitOff": "Alles in einem Durchgang",
    "ctl.splitHint": "Abschnitte: Jedes [Gefühl] startet einen neuen, einzeln erzeugten Abschnitt. Das wirkt zuverlässig, dauert aber länger. Ein Durchgang: ganzer Text auf einmal, ein Wechsel mitten im Text ist dann unsicher.",
    "ctl.emotionHint": "Ein Gefühl gilt für die ganze Zeile.", "ctl.emphasisHint": "Markiere zuerst ein Wort im Text.",
    "ctl.emotionWhere": "Anfang: gilt für den ganzen Text. Wechsel: neues Gefühl ab der Cursor-Stelle.", "ctl.eventsWhere": "mitten im Text, an der Cursor-Stelle", "ctl.emphasisWhere": "um ein einzelnes Wort",
    "ctl.emphasisBtn": "Wort markieren, dann klicken", "ctl.example": "So sieht das im Text aus:",
    "emo.angry": "wütend", "emo.contemplative": "nachdenklich", "emo.excited": "begeistert", "emo.joyful": "fröhlich", "emo.mundane": "sachlich",
    "emo.nervous": "nervös", "emo.sad": "traurig", "emo.stern": "streng", "emo.surprised": "überrascht", "emo.tender": "zärtlich",
    "evt.pause": "Pause", "evt.sigh": "Seufzen", "evt.gasp": "Luft holen", "evt.laugh": "Lachen", "evt.giggle": "Kichern",
    "evt.growl": "Knurren", "evt.gulp": "Schlucken", "evt.scoff": "Schnauben", "evt.sob": "Schluchzen", "evt.um": "Ähm",
    "pre.natural": "Natürlich", "pre.stable": "Stabil", "pre.lively": "Lebendig", "pre.audiobook": "Hörbuch", "pre.fast": "Zügig",
    "ctl.speed": "Tempo", "ctl.speedHint": "Das Modell hat keinen Tempo-Regler: Das Tempo wird nachträglich ohne Tonhöhenänderung angepasst.",
    "ctl.variation": "Lebendigkeit", "ctl.variationHint": "Niedrig: ruhig und stabil. Hoch: abwechslungsreich, aber mit mehr Risiko für Aussetzer.",
    "ctl.pause": "Pausenlänge", "ctl.pauseHint": "Länge aller Sprechpausen (Komma, Satzende). 1× = wie vom Modell erzeugt. Für eine einzelne Pause nimm das Geräusch „Pause“.",
    "ctl.auto": "Auto", "ctl.advanced": "Erweitert",
    "ctl.topP": "Streuung (top_p)", "ctl.topPHint": "Wie viele Varianten pro Laut zugelassen sind. Niedriger klingt gleichmäßiger.",
    "ctl.refPrompt": "Referenz im Prompt", "ctl.refPromptHint": "An: näher an deiner Stimme bei langen Texten. Aus: stabiler bei kurzen Texten.",
    "ctl.refAuto": "Auto (Modellstandard)", "ctl.refOn": "An", "ctl.refOff": "Aus",
    "ctl.seed": "Seed", "ctl.seedRandom": "Zufällig", "ctl.dice": "Leeren", "ctl.seedHint": "Gleicher Seed und gleiche Einstellungen ergeben denselben Take. Leer: jedes Mal neu.",
    "ctl.lock": "Seed fixieren", "ctl.locked": "Seed {s} fixiert. Der nächste Take nutzt ihn.", "result.seed": "Seed {s}",
    "ctl.emoHelp": "Gefühle wirken am besten mit „Ausdrucksstark“.",
    "result.title": "Ergebnis", "result.play": "Abspielen", "result.pause": "Pause", "result.download": "WAV laden",
    "result.fav": "☆ Merken", "result.faved": "★ Gemerkt", "result.meta": "{voice} · {d} s Audio in {t} s",
    "picker.title": "Stimme", "picker.new": "+ Neue", "picker.builtin": "Eingebaute Stimme", "picker.noClone": "ohne Cloning", "picker.auto": "Automatisch",
    "recent.title": "Zuletzt", "recent.all": "Alle", "recent.none": "Noch nichts generiert.",

    "cap.title": "Aufnehmen", "cap.sub": "Referenz aufnehmen oder hochladen. 10 bis 30 Sekunden einer Person, ruhiger Raum.",
    "cap.mic": "Mikrofon", "cap.file": "Datei", "cap.hint": "Lies den Text in normalem Tempo vor.", "cap.hintRec": "Aufnahme läuft. Zum Beenden erneut klicken.",
    "cap.dropTitle": "Audiodatei hier ablegen", "cap.dropSub": "oder klicken zum Auswählen. WAV, MP3, FLAC, OGG.",
    "cap.recAria": "Aufnahme starten", "cap.recording": "Aufnahme läuft",
    "cap.preview": "Vorschau und Speichern", "cap.empty": "Noch keine Aufnahme.<br>Nimm etwas auf oder lade eine Datei.",
    "cap.listen": "Anhören", "cap.discard": "Verwerfen", "cap.saveAs": "Speichern als", "cap.newVoice": "Neue Stimme", "cap.addTo": "Zu „{n}“ hinzufügen",
    "cap.nameVoice": "Name der Stimme", "cap.nameSample": "Bezeichnung dieses Samples",
    "cap.phVoice": "z. B. Alex oder Kollegin Sam", "cap.phSample": "z. B. ruhig, lebendig, Headset",
    "cap.recLang": "Sprache der Aufnahme", "cap.saveNew": "Als neue Stimme speichern", "cap.saveAdd": "Sample hinzufügen",
    "cap.needName": "Gib der Stimme einen Namen.", "cap.saved": "„{n}“ gespeichert.", "cap.sampleAdded": "Sample zu „{n}“ hinzugefügt.",
    "cap.useInStudio": "Im Studio nutzen", "cap.micUnsupported": "Mikrofonzugriff wird vom Browser nicht unterstützt.",
    "cap.micDenied": "Mikrofon nicht verfügbar oder Zugriff verweigert.", "cap.recFailed": "Die Aufnahme konnte nicht verarbeitet werden.",

    "report.good": "Sehr gute Referenz", "report.ok": "Brauchbare Referenz", "report.poor": "Schwache Referenz",
    "report.nums": "{d} s · Rauschabstand {snr} dB · Pegel {lvl} dBFS", "report.none": "Keine Auffälligkeiten.",
    "issue.too_short": "Nur {d} s. Ideal sind 10 bis 30 s.",
    "issue.short": "{d} s sind knapp. Ab ca. 10 s klingt der Klon deutlich stabiler.",
    "issue.clipping": "Die Aufnahme ist übersteuert. Sprich leiser oder gehe vom Mikro weg.",
    "issue.quiet": "Sehr leise Aufnahme. Näher ans Mikro oder Eingangspegel erhöhen.",
    "issue.noisy": "Viel Hintergrundrauschen oder Hall. Ruhiger Raum, Fenster zu, Mikro näher.",
    "issue.some_noise": "Leichtes Hintergrundrauschen. Ein ruhigerer Raum bringt hörbar mehr.",
    "verdict.good": "Sehr gut", "verdict.ok": "Brauchbar", "verdict.poor": "Schwach",

    "voices.title": "Stimmen", "voices.sub0": "Deine gespeicherten Klone.",
    "voices.sub.one": "{n} gespeicherte Stimme. Jede kann mehrere Samples haben.", "voices.sub.other": "{n} gespeicherte Stimmen. Jede kann mehrere Samples haben.",
    "voices.search": "Suchen", "voices.new": "Neue Stimme",
    "voices.meta": "{s} · {r} in Referenz · {d} s",
    "sample.one": "{n} Sample", "sample.other": "{n} Samples",
    "voices.samples": "Samples", "voices.use": "Nutzen",
    "voices.emptyTitle": "Noch keine Stimme", "voices.emptyText": "Nimm dich oder jemand anderen auf und leg die erste Stimme an.", "voices.emptyBtn": "Stimme aufnehmen",
    "voices.deleteTitle": "„{n}“ löschen?", "voices.deleteText": "Die Stimme und alle {c} Samples werden entfernt. Bereits generierte Clips bleiben in der Galerie.",
    "voices.deleted": "„{n}“ gelöscht.",

    "manage.info": "Für jeden Text baut die App aus den aktiven Samples eine Referenz: die besten zuerst, höchstens 30 Sekunden. Schalte Samples aus, um zu vergleichen, wie sich die Stimme ändert.",
    "manage.sub": "{l} · {s} · Referenz {d} s", "manage.off": "aus", "manage.in": "in Referenz", "manage.over": "zu viel für 30 s",
    "manage.on": "An", "manage.turnOff": "Aus", "manage.name": "Name", "manage.renameSample": "Sample umbenennen",
    "manage.deleteSample": "Sample löschen?", "manage.deleteSampleText": "„{n}“ wird entfernt.", "manage.close": "Schließen",
    "manage.rename": "Umbenennen", "manage.add": "+ Sample hinzufügen", "manage.renameVoice": "Stimme umbenennen", "manage.firstRecording": "Erste Aufnahme",

    "gal.title": "Galerie", "gal.sub": "{a} von {b} Clips", "gal.sub0": "Alles, was du generiert hast.", "gal.search": "Text suchen",
    "gal.allLangs": "Alle Sprachen", "gal.all": "Alle", "gal.favs": "★ Favoriten", "gal.allVoices": "Alle Stimmen",
    "gal.sortNew": "Neueste zuerst", "gal.sortOld": "Älteste zuerst", "gal.sortLong": "Längste zuerst",
    "gal.emptyTitle": "Noch nichts generiert", "gal.emptyText": "Im Studio erzeugte Clips landen hier.", "gal.toStudio": "Zum Studio",
    "gal.noHits": "Keine Treffer", "gal.adjust": "Passe Suche oder Filter an.", "gal.clone": "Klon",
    "gal.again": "Nochmal", "gal.againTitle": "Text ins Studio übernehmen", "gal.favAria": "Merken",
    "gal.deleteTitle": "Clip löschen?", "voices.noHits": "Keine Treffer", "voices.otherSearch": "Anderer Suchbegriff?",

    "common.select": "Auswählen", "common.done": "Fertig", "common.delete": "Löschen", "common.all": "Alle", "common.cancel": "Abbrechen",
    "common.ok": "OK", "common.save": "Speichern", "common.builtinLegacy": "Eingebaute Stimme",
    "sel.count": "{n} ausgewählt", "sel.undone": "Das lässt sich nicht rückgängig machen.",
    "sel.voices.one": "{n} Stimme löschen?", "sel.voices.other": "{n} Stimmen löschen?",
    "sel.clips.one": "{n} Clip löschen?", "sel.clips.other": "{n} Clips löschen?", "sel.deleted": "{n} gelöscht.",

    "st.ready": "Bereit", "st.error": "Modellfehler", "st.warming": "Wärme auf", "st.loading": "Modell wird geladen", "st.idle": "Start",
    "st.unreachable": "Server nicht erreichbar", "st.generating": "Generiere …", "st.generatingN": "Generiere … {s} s",
    "st.voices": "Stimmen", "st.used": "Belegt",
    "err.prefix": "Fehler: {m}", "err.server": "Server nicht erreichbar: {m}",
    "gen.emptyText": "Schreib zuerst einen Text.", "gen.loading": "Das Modell lädt noch. Einen Moment bitte.",

    "set.title": "Einstellungen", "set.sub": "Sprache, Voreinstellungen und rechtliche Hinweise.",
    "set.lang": "Sprache der Oberfläche", "set.langDesc": "Gilt für alle Menüs, Hinweise und Fehlermeldungen.",
    "set.genLang": "Standard-Sprache für Texte", "set.genLangDesc": "Vorausgewählt im Studio, solange du keine Stimme mit eigener Sprache nutzt.",
    "set.legal": "Rechtliches", "set.accepted": "Haftungsausschluss akzeptiert am {d}.", "set.notAccepted": "Der Haftungsausschluss wurde noch nicht akzeptiert.",
    "set.readDisclaimer": "Haftungsausschluss lesen",
    "set.about": "Über", "set.model": "Modell", "set.weights": "Gewichte", "set.device": "Gerät", "set.data": "Daten",
    "set.dataText": "Alle Aufnahmen, Stimmen und Clips liegen lokal im Ordner data/.",
    "set.network": "Netzwerk", "set.offline": "Offline: alle Modelle liegen lokal, es gibt keine Anfragen an Hugging Face.", "set.online": "Online: prüft beim Start Hugging Face (Modelle werden noch geladen oder VOICECLONE_OFFLINE=0).",
    "set.license": "Modelllizenz", "set.licenseText": "Stellon Labs Community License (privat und nicht-kommerziell frei, kommerziell begrenzt).",

    "disc.title": "Bevor es losgeht", "disc.intro": "VoiceClone kann Stimmen täuschend echt nachbilden. Bitte lies und bestätige Folgendes:",
    "disc.1.t": "Nur mit Einwilligung", "disc.1.p": "Klone nur Stimmen, bei denen die Person ausdrücklich zugestimmt hat. Das gilt auch für Kollegen, Freunde und Familie.",
    "disc.2.t": "Kein Missbrauch", "disc.2.p": "Nutze generierte Sprache nicht für Täuschung, Betrug, Identitätsdiebstahl, Rufschädigung oder Belästigung. Das kann zivil- und strafrechtliche Folgen haben.",
    "disc.3.t": "Kennzeichnung", "disc.3.p": "Wo Menschen glauben könnten, eine echte Person zu hören, kennzeichne den Inhalt als KI-generiert. In vielen Ländern ist das vorgeschrieben.",
    "disc.4.t": "Lokal und privat", "disc.4.p": "Aufnahmen, Stimmen und Clips bleiben auf diesem Rechner (Ordner data/). Übers Netz laufen nur der Modell-Download von Hugging Face sowie Schriftarten und Skripte von einem CDN.",
    "disc.5.t": "Lizenz und Haftung", "disc.5.p": "Das Modell steht unter der Stellon Labs Community License (kommerzielle Nutzung ist begrenzt). Die Software wird ohne Gewähr bereitgestellt, du nutzt sie auf eigene Verantwortung. Dies ist keine Rechtsberatung.",
    "disc.agree": "Ich habe das gelesen und verstanden und stimme zu.", "disc.start": "Zustimmen und starten", "disc.close": "Schließen",
  },

  en: {
    "nav.studio": "Studio", "nav.capture": "Record", "nav.voices": "Voices", "nav.gallery": "Gallery", "nav.settings": "Settings",
    "tip.title": "Tip", "tip.text": "Ctrl + Enter generates in the Studio. Keys 1 to 5 switch views.",

    "studio.title": "Studio", "studio.sub": "Enter text, pick a voice, generate.",
    "studio.text": "Text", "studio.placeholder": "What should the voice say? For example: Hello, this is my cloned voice.",
    "studio.expressive": "Expressive", "studio.generate": "Generate",

    "ctl.title": "Fine controls", "ctl.reset": "Reset",
    "ctl.emotion": "Emotion", "ctl.events": "Sounds", "ctl.emphasis": "Emphasize",
    "ctl.modeStart": "Start", "ctl.modeCursor": "Switch", "ctl.segments": "{n} sections, each generated separately: {list}", "result.segments": "{n} sections",
    "ctl.split": "Emotion switches", "ctl.splitOn": "As sections (recommended)", "ctl.splitOff": "All in one pass",
    "ctl.splitHint": "Sections: every [emotion] starts a new, separately generated section. This works reliably but takes longer. One pass: the whole text at once, a switch in the middle of the text is then unreliable.",
    "ctl.emotionHint": "One emotion applies to the whole line.", "ctl.emphasisHint": "Select a word in the text first.",
    "ctl.emotionWhere": "Start: applies to the whole text. Switch: new emotion from the cursor.", "ctl.eventsWhere": "inside the text, at the cursor", "ctl.emphasisWhere": "around a single word",
    "ctl.emphasisBtn": "select a word, then click", "ctl.example": "This is how it looks in the text:",
    "emo.angry": "angry", "emo.contemplative": "contemplative", "emo.excited": "excited", "emo.joyful": "joyful", "emo.mundane": "matter-of-fact",
    "emo.nervous": "nervous", "emo.sad": "sad", "emo.stern": "stern", "emo.surprised": "surprised", "emo.tender": "tender",
    "evt.pause": "Pause", "evt.sigh": "Sigh", "evt.gasp": "Gasp", "evt.laugh": "Laugh", "evt.giggle": "Giggle",
    "evt.growl": "Growl", "evt.gulp": "Gulp", "evt.scoff": "Scoff", "evt.sob": "Sob", "evt.um": "Um",
    "pre.natural": "Natural", "pre.stable": "Stable", "pre.lively": "Lively", "pre.audiobook": "Audiobook", "pre.fast": "Brisk",
    "ctl.speed": "Speed", "ctl.speedHint": "The model has no speed control: speed is adjusted afterwards without changing the pitch.",
    "ctl.variation": "Liveliness", "ctl.variationHint": "Low: calm and stable. High: more varied, but a higher risk of glitches.",
    "ctl.pause": "Pause length", "ctl.pauseHint": "Length of all speech pauses (comma, sentence end). 1× = as generated by the model. For a single pause use the “Pause” sound.",
    "ctl.auto": "Auto", "ctl.advanced": "Advanced",
    "ctl.topP": "Spread (top_p)", "ctl.topPHint": "How many variants per sound are allowed. Lower sounds more even.",
    "ctl.refPrompt": "Reference in prompt", "ctl.refPromptHint": "On: closer to your voice on long texts. Off: steadier on short texts.",
    "ctl.refAuto": "Auto (model default)", "ctl.refOn": "On", "ctl.refOff": "Off",
    "ctl.seed": "Seed", "ctl.seedRandom": "Random", "ctl.dice": "Clear", "ctl.seedHint": "Same seed and same settings give the same take. Empty: new every time.",
    "ctl.lock": "Lock seed", "ctl.locked": "Seed {s} locked. The next take will use it.", "result.seed": "Seed {s}",
    "ctl.emoHelp": "Emotions work best with “Expressive”.",
    "result.title": "Result", "result.play": "Play", "result.pause": "Pause", "result.download": "Download WAV",
    "result.fav": "☆ Save", "result.faved": "★ Saved", "result.meta": "{voice} · {d} s of audio in {t} s",
    "picker.title": "Voice", "picker.new": "+ New", "picker.builtin": "Built-in voice", "picker.noClone": "no cloning", "picker.auto": "Automatic",
    "recent.title": "Recent", "recent.all": "All", "recent.none": "Nothing generated yet.",

    "cap.title": "Record", "cap.sub": "Record or upload a reference: 10 to 30 seconds of one person in a quiet room.",
    "cap.mic": "Microphone", "cap.file": "File", "cap.hint": "Read the text at a natural pace.", "cap.hintRec": "Recording. Click again to stop.",
    "cap.dropTitle": "Drop an audio file here", "cap.dropSub": "or click to browse. WAV, MP3, FLAC, OGG.",
    "cap.recAria": "Start recording", "cap.recording": "Recording",
    "cap.preview": "Preview and save", "cap.empty": "No recording yet.<br>Record something or upload a file.",
    "cap.listen": "Listen", "cap.discard": "Discard", "cap.saveAs": "Save as", "cap.newVoice": "New voice", "cap.addTo": "Add to “{n}”",
    "cap.nameVoice": "Voice name", "cap.nameSample": "Label for this sample",
    "cap.phVoice": "e.g. Alex or a colleague", "cap.phSample": "e.g. calm, lively, headset",
    "cap.recLang": "Language of the recording", "cap.saveNew": "Save as new voice", "cap.saveAdd": "Add sample",
    "cap.needName": "Give the voice a name.", "cap.saved": "“{n}” saved.", "cap.sampleAdded": "Sample added to “{n}”.",
    "cap.useInStudio": "Use in Studio", "cap.micUnsupported": "Your browser does not support microphone access.",
    "cap.micDenied": "Microphone unavailable or access denied.", "cap.recFailed": "The recording could not be processed.",

    "report.good": "Very good reference", "report.ok": "Usable reference", "report.poor": "Weak reference",
    "report.nums": "{d} s · SNR {snr} dB · Level {lvl} dBFS", "report.none": "No issues found.",
    "issue.too_short": "Only {d} s. 10 to 30 s is ideal.",
    "issue.short": "{d} s is short. From about 10 s the clone sounds much more stable.",
    "issue.clipping": "The recording is clipping. Speak softer or move away from the mic.",
    "issue.quiet": "Very quiet recording. Move closer to the mic or raise the input level.",
    "issue.noisy": "Lots of background noise or reverb. Quieter room, window closed, mic closer.",
    "issue.some_noise": "Slight background noise. A quieter room helps noticeably.",
    "verdict.good": "Very good", "verdict.ok": "Usable", "verdict.poor": "Weak",

    "voices.title": "Voices", "voices.sub0": "Your saved clones.",
    "voices.sub.one": "{n} saved voice. Each can hold several samples.", "voices.sub.other": "{n} saved voices. Each can hold several samples.",
    "voices.search": "Search", "voices.new": "New voice",
    "voices.meta": "{s} · {r} in reference · {d} s",
    "sample.one": "{n} sample", "sample.other": "{n} samples",
    "voices.samples": "Samples", "voices.use": "Use",
    "voices.emptyTitle": "No voice yet", "voices.emptyText": "Record yourself or someone else and create the first voice.", "voices.emptyBtn": "Record a voice",
    "voices.deleteTitle": "Delete “{n}”?", "voices.deleteText": "The voice and all {c} samples will be removed. Clips you already generated stay in the gallery.",
    "voices.deleted": "“{n}” deleted.",

    "manage.info": "For every text the app builds a reference from the active samples: the best ones first, 30 seconds at most. Turn samples off to compare how the voice changes.",
    "manage.sub": "{l} · {s} · reference {d} s", "manage.off": "off", "manage.in": "in reference", "manage.over": "beyond the 30 s limit",
    "manage.on": "On", "manage.turnOff": "Off", "manage.name": "Name", "manage.renameSample": "Rename sample",
    "manage.deleteSample": "Delete sample?", "manage.deleteSampleText": "“{n}” will be removed.", "manage.close": "Close",
    "manage.rename": "Rename", "manage.add": "+ Add sample", "manage.renameVoice": "Rename voice", "manage.firstRecording": "First recording",

    "gal.title": "Gallery", "gal.sub": "{a} of {b} clips", "gal.sub0": "Everything you generated.", "gal.search": "Search text",
    "gal.allLangs": "All languages", "gal.all": "All", "gal.favs": "★ Favorites", "gal.allVoices": "All voices",
    "gal.sortNew": "Newest first", "gal.sortOld": "Oldest first", "gal.sortLong": "Longest first",
    "gal.emptyTitle": "Nothing generated yet", "gal.emptyText": "Clips you create in the Studio end up here.", "gal.toStudio": "Go to Studio",
    "gal.noHits": "No results", "gal.adjust": "Adjust search or filters.", "gal.clone": "Clone",
    "gal.again": "Again", "gal.againTitle": "Copy text to the Studio", "gal.favAria": "Save",
    "gal.deleteTitle": "Delete clip?", "voices.noHits": "No results", "voices.otherSearch": "Try another search?",

    "common.select": "Select", "common.done": "Done", "common.delete": "Delete", "common.all": "All", "common.cancel": "Cancel",
    "common.ok": "OK", "common.save": "Save", "common.builtinLegacy": "Built-in voice",
    "sel.count": "{n} selected", "sel.undone": "This cannot be undone.",
    "sel.voices.one": "Delete {n} voice?", "sel.voices.other": "Delete {n} voices?",
    "sel.clips.one": "Delete {n} clip?", "sel.clips.other": "Delete {n} clips?", "sel.deleted": "{n} deleted.",

    "st.ready": "Ready", "st.error": "Model error", "st.warming": "Warming up", "st.loading": "Loading model", "st.idle": "Starting",
    "st.unreachable": "Server unreachable", "st.generating": "Generating …", "st.generatingN": "Generating … {s} s",
    "st.voices": "Voices", "st.used": "Used",
    "err.prefix": "Error: {m}", "err.server": "Server unreachable: {m}",
    "gen.emptyText": "Write some text first.", "gen.loading": "The model is still loading. One moment please.",

    "set.title": "Settings", "set.sub": "Language, defaults and legal notices.",
    "set.lang": "Interface language", "set.langDesc": "Applies to all menus, notices and error messages.",
    "set.genLang": "Default language for texts", "set.genLangDesc": "Preselected in the Studio as long as you are not using a voice with its own language.",
    "set.legal": "Legal", "set.accepted": "Disclaimer accepted on {d}.", "set.notAccepted": "The disclaimer has not been accepted yet.",
    "set.readDisclaimer": "Read disclaimer",
    "set.about": "About", "set.model": "Model", "set.weights": "Weights", "set.device": "Device", "set.data": "Data",
    "set.dataText": "All recordings, voices and clips are stored locally in the data/ folder.",
    "set.network": "Network", "set.offline": "Offline: all models are local, no requests to Hugging Face.", "set.online": "Online: checks Hugging Face at startup (models still downloading or VOICECLONE_OFFLINE=0).",
    "set.license": "Model license", "set.licenseText": "Stellon Labs Community License (free for personal and non-commercial use, limited commercial use).",

    "disc.title": "Before you start", "disc.intro": "VoiceClone can imitate voices convincingly. Please read and confirm the following:",
    "disc.1.t": "Consent only", "disc.1.p": "Only clone voices when the person has explicitly agreed. This includes colleagues, friends and family.",
    "disc.2.t": "No misuse", "disc.2.p": "Do not use generated speech for deception, fraud, impersonation, defamation or harassment. This can have civil and criminal consequences.",
    "disc.3.t": "Labeling", "disc.3.p": "Where people could believe they are hearing a real person, label the content as AI-generated. Many jurisdictions require this.",
    "disc.4.t": "Local and private", "disc.4.p": "Recordings, voices and clips stay on this computer (data/ folder). Only the model download from Hugging Face plus fonts and scripts from a CDN use the network.",
    "disc.5.t": "License and liability", "disc.5.p": "The model is under the Stellon Labs Community License (commercial use is limited). The software is provided as is, without warranty, and you use it at your own risk. This is not legal advice.",
    "disc.agree": "I have read and understood this and agree.", "disc.start": "Agree and start", "disc.close": "Close",
  },
};

/* Speech languages of the model (each named in its own language) */
const SPEECH_LANGS = [["en", "English"], ["de", "Deutsch"], ["fr", "Français"], ["es", "Español"], ["it", "Italiano"],
  ["pt", "Português"], ["ru", "Русский"], ["zh", "中文"], ["ar", "العربية"], ["hi", "हिन्दी"]];
const RTL_LANGS = ["ar"];
const langName = (c) => (SPEECH_LANGS.find((l) => l[0] === c) || [c, String(c).toUpperCase()])[1];

let LANG = "de";
function t(key, params = {}) {
  const s = I18N[LANG]?.[key] ?? I18N.de[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ""));
}
/** Plural: tn("sample", 3) -> "3 samples" */
function tn(key, n, params = {}) { return t(`${key}.${n === 1 ? "one" : "other"}`, { n, ...params }); }
const LOCALE = () => (LANG === "de" ? "de-DE" : "en-GB");

function applyI18n(root = document) {
  document.documentElement.lang = LANG;
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml))); // only our own, fixed texts
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
}
