import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ─── Supported Languages ──────────────────────────────────────────
export type Language = 'en' | 'ta' | 'hi' | 'te' | 'ml';

export const LANGUAGE_LABELS: Record<Language, string> = {
    en: 'English',
    ta: 'Tamil',
    hi: 'Hindi',
    te: 'Telugu',
    ml: 'Malayalam',
};

export const LANGUAGE_LIST: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'ml', label: 'മലയാളം' },
];

// ─── Translation Keys ─────────────────────────────────────────────
const translations: Record<string, Record<Language, string>> = {
    // ── Brand ─────────────────
    'brand.name': { en: 'MediScan Secure Full', ta: 'மெடிஸ்கேன்', hi: 'मेडीस्कैन', te: 'మెడిస్కాన్', ml: 'മെഡിസ്കാൻ' },
    'brand.tagline': { en: 'Secure Go', ta: 'பாதுகாப்பான', hi: 'सुरक्षित गो', te: 'సురక్షిత గో', ml: 'സുരക്ഷിത ഗോ' },
    'brand.version': { en: 'MediScan Secure Full v1.0', ta: 'மெடிஸ்கேன் v1.0', hi: 'मेडीस्कैन v1.0', te: 'మెడిస్కాన్ v1.0', ml: 'മെഡിസ്കാൻ v1.0' },

    // ── Navigation ────────────
    'nav.home': { en: 'Home', ta: 'முகப்பு', hi: 'होम', te: 'హోమ్', ml: 'ഹോം' },
    'nav.search': { en: 'Search', ta: 'தேடல்', hi: 'खोजें', te: 'శోధన', ml: 'തിരയൽ' },
    'nav.reminders': { en: 'Reminders', ta: 'நினைவூட்டல்', hi: 'रिमाइंडर', te: 'రిమైండర్లు', ml: 'ഓർമ്മപ്പെടുത്തലുകൾ' },
    'nav.history': { en: 'History', ta: 'வரலாறு', hi: 'इतिहास', te: 'చరిత్ర', ml: 'ചരിത്രം' },
    'nav.profile': { en: 'Profile', ta: 'சுயவிவரம்', hi: 'प्रोफ़ाइल', te: 'ప్రొఫైల్', ml: 'പ്രൊഫൈൽ' },

    // ── Login Page ────────────
    'login.email': { en: 'Email', ta: 'மின்னஞ்சல்', hi: 'ईमेल', te: 'ఇమెయిల్', ml: 'ഇമെയിൽ' },
    'login.password': { en: 'Password', ta: 'கடவுச்சொல்', hi: 'पासवर्ड', te: 'పాస్‌వర్డ్', ml: 'പാസ്‌വേഡ്' },
    'login.signIn': { en: 'Sign In', ta: 'உள்நுழைக', hi: 'साइन इन', te: 'సైన్ ఇన్', ml: 'സൈൻ ഇൻ' },
    'login.signingIn': { en: 'Signing in...', ta: 'உள்நுழைகிறது...', hi: 'साइन इन हो रहा है...', te: 'సైన్ ఇన్ అవుతోంది...', ml: 'സൈൻ ഇൻ ചെയ്യുന്നു...' },
    'login.noAccount': { en: "Don't have an account?", ta: 'கணக்கு இல்லையா?', hi: 'खाता नहीं है?', te: 'ఖాతా లేదా?', ml: 'അക്കൗണ്ട് ഇല്ലേ?' },
    'login.signUp': { en: 'Sign Up', ta: 'பதிவு செய்க', hi: 'साइन अप', te: 'సైన్ అప్', ml: 'സൈൻ അപ്പ്' },
    'login.error': { en: 'Error', ta: 'பிழை', hi: 'त्रुटि', te: 'లోపం', ml: 'പിശക്' },
    'login.fillAll': { en: 'Please fill in all fields', ta: 'அனைத்து புலங்களையும் நிரப்பவும்', hi: 'कृपया सभी फ़ील्ड भरें', te: 'దయచేసి అన్ని ఫీల్డ్‌లను నింపండి', ml: 'എല്ലാ ഫീൽഡുകളും പൂരിപ്പിക്കുക' },
    'login.failed': { en: 'Login Failed', ta: 'உள்நுழைவு தோல்வி', hi: 'लॉगिन विफल', te: 'లాగిన్ విఫలమైంది', ml: 'ലോഗിൻ പരാജയം' },

    // ── Signup Page ───────────
    'signup.createAccount': { en: 'Create Account', ta: 'கணக்கை உருவாக்கு', hi: 'खाता बनाएं', te: 'ఖాతాను సృష్టించండి', ml: 'അക്കൗണ്ട് സൃഷ്ടിക്കുക' },
    'signup.fullName': { en: 'Full Name', ta: 'முழு பெயர்', hi: 'पूरा नाम', te: 'పూర్తి పేరు', ml: 'മുഴുവൻ പേര്' },
    'signup.creating': { en: 'Creating...', ta: 'உருவாக்குகிறது...', hi: 'बना रहा है...', te: 'సృష్టిస్తోంది...', ml: 'സൃഷ്ടിക്കുന്നു...' },
    'signup.hasAccount': { en: 'Already have an account?', ta: 'ஏற்கனவே கணக்கு உள்ளதா?', hi: 'पहले से खाता है?', te: 'ఇప్పటికే ఖాతా ఉందా?', ml: 'ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?' },
    'signup.failed': { en: 'Signup Failed', ta: 'பதிவு தோல்வி', hi: 'साइनअप विफल', te: 'సైన్ అప్ విఫలమైంది', ml: 'സൈൻ അപ്പ് പരാജയം' },

    // ── Dashboard ─────────────
    'dash.welcome': { en: 'Welcome back,', ta: 'மீண்டும் வரவேற்கிறோம்,', hi: 'वापस स्वागत है,', te: 'తిరిగి స్వాగతం,', ml: 'തിരികെ സ്വാഗതം,' },
    'dash.user': { en: 'User', ta: 'பயனர்', hi: 'उपयोगकर्ता', te: 'వినియోగదారుడు', ml: 'ഉപയോക്താവ്' },
    'dash.activeMeds': { en: 'Active Medicines', ta: 'செயலில் உள்ள மருந்துகள்', hi: 'सक्रिय दवाएं', te: 'యాక్టివ్ మందులు', ml: 'സജീവ മരുന്നുകൾ' },
    'dash.todaysDoses': { en: "Today's Doses", ta: 'இன்றைய மருந்துகள்', hi: 'आज की खुराक', te: 'నేటి డోస్‌లు', ml: 'ഇന്നത്തെ ഡോസുകൾ' },
    'dash.adherence': { en: 'Adherence', ta: 'கடைப்பிடிப்பு', hi: 'अनुपालन', te: 'అనుసరణ', ml: 'അനുസരണം' },
    'dash.searchMeds': { en: 'Search Medicines', ta: 'மருந்துகளை தேடு', hi: 'दवाएं खोजें', te: 'మందులు శోధించండి', ml: 'മരുന്നുകൾ തിരയുക' },
    'dash.findDrug': { en: 'Find drug info', ta: 'மருந்து தகவல் காண', hi: 'दवा जानकारी खोजें', te: 'మందు సమాచారం కనుగొనండి', ml: 'മരുന്ന് വിവരം കണ്ടെത്തുക' },
    'dash.history': { en: 'History', ta: 'வரலாறு', hi: 'इतिहास', te: 'చరిత్ర', ml: 'ചരിത്രം' },
    'dash.viewLogs': { en: 'View past logs', ta: 'கடந்த பதிவுகள்', hi: 'पिछले लॉग देखें', te: 'గత లాగ్‌లు చూడండి', ml: 'കഴിഞ്ഞ ലോഗുകൾ കാണുക' },
    'dash.myMeds': { en: 'My Medicines', ta: 'என் மருந்துகள்', hi: 'मेरी दवाएं', te: 'నా మందులు', ml: 'എന്റെ മരുന്നുകൾ' },
    'dash.manageReminders': { en: 'Manage reminders', ta: 'நினைவூட்டல் நிர்வகி', hi: 'रिमाइंडर प्रबंधित करें', te: 'రిమైండర్లు నిర్వహించండి', ml: 'ഓർമ്മപ്പെടുത്തലുകൾ നിയന്ത്രിക്കുക' },
    'dash.scanRx': { en: 'Scan Rx', ta: 'ஸ்கேன் Rx', hi: 'स्कैन Rx', te: 'స్కాన్ Rx', ml: 'സ്കാൻ Rx' },
    'dash.scanPresc': { en: 'Scan prescription', ta: 'மருந்துச்சீட்டு ஸ்கேன்', hi: 'प्रिस्क्रिप्शन स्कैन करें', te: 'ప్రిస్క్రిప్షన్ స్కాన్', ml: 'കുറിപ്പടി സ്കാൻ ചെയ്യുക' },
    'dash.aiAssistant': { en: 'AI Assistant', ta: 'AI உதவியாளர்', hi: 'AI सहायक', te: 'AI అసిస్టెంట్', ml: 'AI അസിസ്റ്റന്റ്' },
    'dash.askAnything': { en: 'Ask anything', ta: 'எதையும் கேளுங்கள்', hi: 'कुछ भी पूछें', te: 'ఏదైనా అడగండి', ml: 'എന്തും ചോദിക്കൂ' },
    'dash.todaysSchedule': { en: "Today's Schedule", ta: 'இன்றைய அட்டவணை', hi: 'आज का शेड्यूल', te: 'నేటి షెడ్యూల్', ml: 'ഇന്നത്തെ ഷെഡ്യൂൾ' },
    'dash.noReminders': { en: 'No reminders set up yet.', ta: 'இதுவரை நினைவூட்டல் இல்லை.', hi: 'अभी तक कोई रिमाइंडर नहीं।', te: 'ఇంకా రిమైండర్లు లేవు.', ml: 'ഇതുവരെ ഓർമ്മപ്പെടുത്തലുകൾ ഇല്ല.' },
    'dash.taken': { en: 'Taken', ta: 'எடுத்தது', hi: 'लिया', te: 'తీసుకున్నారు', ml: 'എടുത്തു' },
    'dash.upcoming': { en: 'Upcoming', ta: 'வரவிருக்கும்', hi: 'आने वाला', te: 'రాబోయే', ml: 'വരാനിരിക്കുന്ന' },
    'dash.recentScans': { en: 'Recent Scans', ta: 'சமீபத்திய ஸ்கேன்கள்', hi: 'हालिया स्कैन', te: 'ఇటీవలి స్కాన్లు', ml: 'സമീപകാല സ്കാനുകൾ' },
    'dash.noScans': { en: 'No recent scans yet.', ta: 'இதுவரை ஸ்கேன்கள் இல்லை.', hi: 'अभी तक कोई स्कैन नहीं।', te: 'ఇంకా స్కాన్లు లేవు.', ml: 'ഇതുവരെ സ്കാനുകൾ ഇല്ല.' },

    // ── Search Medicines ──────
    'search.title': { en: 'Find Medicines', ta: 'மருந்துகளை கண்டறிக', hi: 'दवाएं खोजें', te: 'మందులు కనుగొనండి', ml: 'മരുന്നുകൾ കണ്ടെത്തുക' },
    'search.placeholder': { en: 'Search medicines... (e.g. Dolo, Paracetamol)', ta: 'மருந்துகளை தேடு... (எ.கா. டோலோ, பாராசிட்டமால்)', hi: 'दवाएं खोजें... (जैसे डोलो, पेरासिटामोल)', te: 'మందులు శోధించండి... (ఉదా. డోలో, పారాసిటమాల్)', ml: 'മരുന്നുകൾ തിരയുക... (ഉദാ. ഡോളോ, പാരസെറ്റമോൾ)' },
    'search.typeToSearch': { en: 'Type a medicine name to search', ta: 'தேட மருந்தின் பெயரை தட்டச்சு செய்க', hi: 'खोजने के लिए दवा का नाम टाइप करें', te: 'శోధించడానికి మందు పేరు టైప్ చేయండి', ml: 'തിരയാൻ മരുന്നിന്റെ പേര് ടൈപ്പ് ചെയ്യുക' },
    'search.resultsAppear': { en: 'Results appear as you type', ta: 'தட்டச்சு செய்யும்போது முடிவுகள் தோன்றும்', hi: 'टाइप करते ही परिणाम दिखेंगे', te: 'టైప్ చేసేటప్పుడు ఫలితాలు కనిపిస్తాయి', ml: 'ടൈപ്പ് ചെയ്യുമ്പോൾ ഫലങ്ങൾ ദൃശ്യമാകും' },
    'search.noResults': { en: 'No results for', ta: 'இதற்கு முடிவுகள் இல்லை', hi: 'कोई परिणाम नहीं', te: 'ఫలితాలు లేవు', ml: 'ഫലങ്ങൾ ഇല്ല' },
    'search.view': { en: 'View →', ta: 'காண் →', hi: 'देखें →', te: 'చూడండి →', ml: 'കാണുക →' },
    'search.orScan': { en: 'Or scan a prescription', ta: 'அல்லது மருந்துச்சீட்டை ஸ்கேன் செய்க', hi: 'या प्रिस्क्रिप्शन स्कैन करें', te: 'లేదా ప్రిస్క్రిప్షన్ స్కాన్ చేయండి', ml: 'അല്ലെങ്കിൽ കുറിപ്പടി സ്കാൻ ചെയ്യുക' },

    // ── Medicine Detail ───────
    'med.title': { en: 'Medicine Details', ta: 'மருந்து விவரங்கள்', hi: 'दवा विवरण', te: 'మందు వివరాలు', ml: 'മരുന്ന് വിശദാംശങ്ങൾ' },
    'med.composition': { en: 'Composition', ta: 'கலவை', hi: 'संरचना', te: 'కూర్పు', ml: 'ഘടന' },
    'med.description': { en: 'Description', ta: 'விளக்கம்', hi: 'विवरण', te: 'వివరణ', ml: 'വിവരണം' },
    'med.price': { en: 'Price', ta: 'விலை', hi: 'कीमत', te: 'ధర', ml: 'വില' },
    'med.packSize': { en: 'Pack Size', ta: 'பேக் அளவு', hi: 'पैक आकार', te: 'ప్యాక్ సైజు', ml: 'പായ്ക്ക് വലിപ്പം' },
    'med.notFound': { en: 'Medicine not found', ta: 'மருந்து கிடைக்கவில்லை', hi: 'दवा नहीं मिली', te: 'మందు కనుగొనబడలేదు', ml: 'മരുന്ന് കണ്ടെത്തിയില്ല' },
    'med.goBack': { en: 'Go Back', ta: 'திரும்பு', hi: 'वापस जाएं', te: 'వెనుకకు వెళ్ళండి', ml: 'തിരികെ പോകുക' },
    'med.addToBox': { en: 'Add to My Box & Set Reminder', ta: 'என் பெட்டியில் சேர் & நினைவூட்டல்', hi: 'मेरे बॉक्स में जोड़ें और रिमाइंडर सेट करें', te: 'నా బాక్స్‌కు జోడించు & రిమైండర్ సెట్', ml: 'എന്റെ ബോക്‌സിൽ ചേർക്കുക & ഓർമ്മപ്പെടുത്തൽ' },
    'med.addedReminder': { en: 'Added & Reminder Set', ta: 'சேர்க்கப்பட்டது & நினைவூட்டல் அமைக்கப்பட்டது', hi: 'जोड़ा गया और रिमाइंडर सेट किया', te: 'జోడించబడింది & రిమైండర్ సెట్', ml: 'ചേർത്തു & ഓർമ്മപ്പെടുത്തൽ സെറ്റ്' },
    'med.setupReminder': { en: 'Set Up Reminder', ta: 'நினைவூட்டலை அமை', hi: 'रिमाइंडर सेट करें', te: 'రిమైండర్ సెట్ చేయండి', ml: 'ഓർമ്മപ്പെടുത്തൽ സജ്ജമാക്കുക' },
    'med.stockQty': { en: 'Stock Quantity', ta: 'கையிருப்பு அளவு', hi: 'स्टॉक मात्रा', te: 'స్టాక్ పరిమాణం', ml: 'സ്റ്റോക്ക് അളവ്' },
    'med.howMany': { en: 'How many tablets/units do you have?', ta: 'உங்களிடம் எத்தனை மாத்திரைகள் உள்ளன?', hi: 'आपके पास कितनी गोलियाँ हैं?', te: 'మీ దగ్గర ఎన్ని టాబ్లెట్లు ఉన్నాయి?', ml: 'നിങ്ങളുടെ കൈയിൽ എത്ര ഗുളികകൾ ഉണ്ട്?' },
    'med.dosage': { en: 'Dosage per intake', ta: 'ஒவ்வொரு முறை மருந்தளவு', hi: 'प्रति खुराक', te: 'ప్రతి డోస్', ml: 'ഓരോ ഡോസ്' },
    'med.whenToTake': { en: 'When to take', ta: 'எப்போது எடுக்க வேண்டும்', hi: 'कब लें', te: 'ఎప్పుడు తీసుకోవాలి', ml: 'എപ്പോൾ കഴിക്കണം' },
    'med.beforeFood': { en: 'Before Food', ta: 'உணவுக்கு முன்', hi: 'खाने से पहले', te: 'భోజనానికి ముందు', ml: 'ഭക്ഷണത്തിന് മുമ്പ്' },
    'med.afterFood': { en: 'After Food', ta: 'உணவுக்கு பின்', hi: 'खाने के बाद', te: 'భోజనం తర్వాత', ml: 'ഭക്ഷണത്തിന് ശേഷം' },
    'med.withFood': { en: 'With Food', ta: 'உணவுடன்', hi: 'खाने के साथ', te: 'భోజనంతో', ml: 'ഭക്ഷണത്തോടൊപ്പം' },
    'med.anyTime': { en: 'Any Time', ta: 'எந்நேரமும்', hi: 'कभी भी', te: 'ఎప్పుడైనా', ml: 'എപ്പോഴും' },
    'med.beforeFoodDesc': { en: '30 min before meals', ta: 'உணவுக்கு 30 நிமிடங்களுக்கு முன்', hi: 'भोजन से 30 मिनट पहले', te: 'భోజనానికి 30 నిమిషాల ముందు', ml: 'ഭക്ഷണത്തിന് 30 മിനിറ്റ് മുമ്പ്' },
    'med.afterFoodDesc': { en: 'Right after meals', ta: 'உணவுக்கு பிறகு', hi: 'भोजन के तुरंत बाद', te: 'భోజనం తర్వాత వెంటనే', ml: 'ഭക്ഷണത്തിന് ശേഷം ഉടൻ' },
    'med.withFoodDesc': { en: 'During meals', ta: 'உணவின் போது', hi: 'भोजन के दौरान', te: 'భోజన సమయంలో', ml: 'ഭക്ഷണ സമയത്ത്' },
    'med.anyTimeDesc': { en: 'No restriction', ta: 'கட்டுப்பாடு இல்லை', hi: 'कोई प्रतिबंध नहीं', te: 'ఆంక్షలు లేవు', ml: 'നിയന്ത്രണമില്ല' },
    'med.morning': { en: 'Morning', ta: 'காலை', hi: 'सुबह', te: 'ఉదయం', ml: 'രാവിലെ' },
    'med.afternoon': { en: 'Afternoon', ta: 'மதியம்', hi: 'दोपहर', te: 'మధ్యాహ్నం', ml: 'ഉച്ചയ്ക്ക്' },
    'med.evening': { en: 'Evening', ta: 'மாலை', hi: 'शाम', te: 'సాయంత్రం', ml: 'വൈകുന്നേരം' },
    'med.night': { en: 'Night', ta: 'இரவு', hi: 'रात', te: 'రాత్రి', ml: 'രാത്രി' },
    'med.timeOfDay': { en: 'Time(s) of Day', ta: 'நாளின் நேரம்', hi: 'दिन का समय', te: 'రోజులో సమయం', ml: 'ദിവസത്തിലെ സമയം' },
    'med.addTime': { en: '+ Add another time', ta: '+ மற்றொரு நேரம் சேர்', hi: '+ एक और समय जोड़ें', te: '+ మరొక సమయం జోడించండి', ml: '+ മറ്റൊരു സമയം ചേർക്കുക' },
    'med.dose': { en: 'Dose', ta: 'மருந்தளவு', hi: 'खुराक', te: 'డోస్', ml: 'ഡോസ്' },
    'med.days': { en: 'Days', ta: 'நாட்கள்', hi: 'दिन', te: 'రోజులు', ml: 'ദിവസങ്ങൾ' },
    'med.selectAll': { en: 'Select All', ta: 'அனைத்தையும் தேர்வு', hi: 'सभी चुनें', te: 'అన్నీ ఎంచుకోండి', ml: 'എല്ലാം തിരഞ്ഞെടുക്കുക' },
    'med.deselectAll': { en: 'Deselect All', ta: 'அனைத்தையும் நீக்கு', hi: 'सभी अचयन करें', te: 'అన్నీ తీసివేయండి', ml: 'എല്ലാം ഒഴിവാക്കുക' },
    'med.saving': { en: 'Saving...', ta: 'சேமிக்கிறது...', hi: 'सहेज रहा है...', te: 'సేవ్ అవుతోంది...', ml: 'സേവ് ചെയ്യുന്നു...' },
    'med.saveReminder': { en: 'Add to Box & Save Reminder', ta: 'பெட்டியில் சேர் & நினைவூட்டல் சேமி', hi: 'बॉक्स में जोड़ें और रिमाइंडर सेव करें', te: 'బాక్స్‌కు జోడించు & రిమైండర్ సేవ్', ml: 'ബോക്‌സിൽ ചേർക്കുക & ഓർമ്മപ്പെടുത്തൽ സേവ്' },

    // ── Reminders ─────────────
    'rem.title': { en: 'My Reminders', ta: 'என் நினைவூட்டல்கள்', hi: 'मेरे रिमाइंडर', te: 'నా రిమైండర్లు', ml: 'എന്റെ ഓർമ്മപ്പെടുത്തലുകൾ' },
    'rem.noReminders': { en: 'No reminders yet. Add medicines from the Search page.', ta: 'இதுவரை நினைவூட்டல் இல்லை. தேடல் பக்கத்தில் மருந்துகளை சேர்க்கவும்.', hi: 'अभी कोई रिमाइंडर नहीं। खोज पृष्ठ से दवाएं जोड़ें।', te: 'ఇంకా రిమైండర్లు లేవు. శోధన పేజీ నుండి మందులు జోడించండి.', ml: 'ഇതുവരെ ഓർമ്മപ്പെടുത്തലുകൾ ഇല്ല. തിരയൽ പേജിൽ നിന്ന് മരുന്നുകൾ ചേർക്കുക.' },
    'rem.stock': { en: 'Stock:', ta: 'கையிருப்பு:', hi: 'स्टॉक:', te: 'స్టాక్:', ml: 'സ്റ്റോക്ക്:' },
    'rem.taken': { en: 'Taken', ta: 'எடுத்தது', hi: 'लिया', te: 'తీసుకున్నారు', ml: 'എടുത്തു' },
    'rem.skip': { en: 'Skip', ta: 'தவிர்', hi: 'छोड़ें', te: 'దాటవేయి', ml: 'ഒഴിവാക്കുക' },
    'rem.editReminder': { en: 'Edit Reminder', ta: 'நினைவூட்டலை திருத்து', hi: 'रिमाइंडर संपादित करें', te: 'రిమైండర్ సవరించండి', ml: 'ഓർമ്മപ്പെടുത്തൽ തിരുത്തുക' },
    'rem.deleted': { en: 'Deleted', ta: 'நீக்கப்பட்டது', hi: 'हटाया गया', te: 'తొలగించబడింది', ml: 'ഇല്ലാതാക്കി' },
    'rem.allRemoved': { en: 'All reminders for {name} removed', ta: '{name} இன் அனைத்து நினைவூட்டல்களும் நீக்கப்பட்டன', hi: '{name} के सभी रिमाइंडर हटाए गए', te: '{name} కోసం అన్ని రిమైండర్లు తీసివేయబడ్డాయి', ml: '{name} ന്റെ എല്ലാ ഓർമ്മപ്പെടുത്തലുകളും നീക്കം ചെയ്തു' },

    // ── History ────────────────
    'hist.title': { en: 'History Log', ta: 'வரலாற்று பதிவு', hi: 'इतिहास लॉग', te: 'చరిత్ర లాగ్', ml: 'ചരിത്ര ലോഗ്' },
    'hist.noHistory': { en: 'No history yet. Take or skip a medicine to see entries here.', ta: 'இதுவரை வரலாறு இல்லை. மருந்தை எடுக்கவும் அல்லது தவிர்க்கவும்.', hi: 'अभी तक कोई इतिहास नहीं। यहां प्रविष्टियाँ देखने के लिए दवा लें या छोड़ें।', te: 'ఇంకా చరిత్ర లేదు. ఇక్కడ ఎంట్రీలు చూడటానికి మందు తీసుకోండి లేదా దాటవేయండి.', ml: 'ഇതുവരെ ചരിത്രമില്ല. ഇവിടെ എൻട്രികൾ കാണാൻ മരുന്ന് കഴിക്കുക അല്ലെങ്കിൽ ഒഴിവാക്കുക.' },
    'hist.today': { en: 'Today', ta: 'இன்று', hi: 'आज', te: 'ఈరోజు', ml: 'ഇന്ന്' },
    'hist.yesterday': { en: 'Yesterday', ta: 'நேற்று', hi: 'कल', te: 'నిన్న', ml: 'ഇന്നലെ' },

    // ── Profile / Settings ────
    'prof.title': { en: 'Settings', ta: 'அமைப்புகள்', hi: 'सेटिंग्स', te: 'సెట్టింగ్‌లు', ml: 'ക്രമീകരണങ്ങൾ' },
    'prof.profileInfo': { en: 'Profile Information', ta: 'சுயவிவர தகவல்', hi: 'प्रोफ़ाइल जानकारी', te: 'ప్రొఫైల్ సమాచారం', ml: 'പ്രൊഫൈൽ വിവരങ്ങൾ' },
    'prof.fullName': { en: 'Full Name', ta: 'முழு பெயர்', hi: 'पूरा नाम', te: 'పూర్తి పేరు', ml: 'മുഴുവൻ പേര്' },
    'prof.email': { en: 'Email', ta: 'மின்னஞ்சல்', hi: 'ईमेल', te: 'ఇమెయిల్', ml: 'ഇമെയിൽ' },
    'prof.saveChanges': { en: 'Save Changes', ta: 'மாற்றங்களை சேமி', hi: 'परिवर्तन सहेजें', te: 'మార్పులు సేవ్ చేయండి', ml: 'മാറ്റങ്ങൾ സേവ് ചെയ്യുക' },
    'prof.saving': { en: 'Saving...', ta: 'சேமிக்கிறது...', hi: 'सहेज रहा है...', te: 'సేవ్ అవుతోంది...', ml: 'സേവ് ചെയ്യുന്നു...' },
    'prof.saved': { en: 'Saved', ta: 'சேமிக்கப்பட்டது', hi: 'सहेजा गया', te: 'సేవ్ చేయబడింది', ml: 'സേവ് ചെയ്തു' },
    'prof.profileUpdated': { en: 'Profile updated successfully', ta: 'சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது', hi: 'प्रोफ़ाइल सफलतापूर्वक अपडेट किया गया', te: 'ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది', ml: 'പ്രൊഫൈൽ വിജയകരമായി അപ്‌ഡേറ്റ് ചെയ്തു' },
    'prof.langPref': { en: 'Language Preference', ta: 'மொழி விருப்பம்', hi: 'भाषा प्राथमिकता', te: 'భాషా ప్రాధాన్యత', ml: 'ഭാഷാ മുൻഗണന' },
    'prof.security': { en: 'Security', ta: 'பாதுகாப்பு', hi: 'सुरक्षा', te: 'భద్రత', ml: 'സുരക്ഷ' },
    'prof.changePassword': { en: 'Change Password', ta: 'கடவுச்சொல்லை மாற்று', hi: 'पासवर्ड बदलें', te: 'పాస్‌వర్డ్ మార్చండి', ml: 'പാസ്‌വേഡ് മാറ്റുക' },
    'prof.currentPassword': { en: 'Current password', ta: 'தற்போதைய கடவுச்சொல்', hi: 'वर्तमान पासवर्ड', te: 'ప్రస్తుత పాస్‌వర్డ్', ml: 'നിലവിലെ പാസ്‌വേഡ്' },
    'prof.newPassword': { en: 'New password', ta: 'புதிய கடவுச்சொல்', hi: 'नया पासवर्ड', te: 'కొత్త పాస్‌వర్డ్', ml: 'പുതിയ പാസ്‌വേഡ്' },
    'prof.updatePassword': { en: 'Update Password', ta: 'கடவுச்சொல்லை புதுப்பி', hi: 'पासवर्ड अपडेट करें', te: 'పాస్‌వర్డ్ అప్‌డేట్', ml: 'പാസ്‌വേഡ് അപ്‌ഡേറ്റ്' },
    'prof.changing': { en: 'Changing...', ta: 'மாற்றுகிறது...', hi: 'बदल रहा है...', te: 'మారుస్తోంది...', ml: 'മാറ്റുന്നു...' },
    'prof.passwordChanged': { en: 'Password changed successfully', ta: 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது', hi: 'पासवर्ड सफलतापूर्वक बदला गया', te: 'పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది', ml: 'പാസ്‌വേഡ് വിജയകരമായി മാറ്റി' },
    'prof.fillBoth': { en: 'Please fill in both password fields', ta: 'இரண்டு கடவுச்சொல் புலங்களையும் நிரப்பவும்', hi: 'कृपया दोनों पासवर्ड फ़ील्ड भरें', te: 'దయచేసి రెండు పాస్‌వర్డ్ ఫీల్డ్‌లను నింపండి', ml: 'രണ്ട് പാസ്‌വേഡ് ഫീൽഡുകളും പൂരിപ്പിക്കുക' },
    'prof.logout': { en: 'Logout', ta: 'வெளியேறு', hi: 'लॉग आउट', te: 'లాగ్ అవుట్', ml: 'ലോഗ് ഔട്ട്' },
    'prof.success': { en: 'Success', ta: 'வெற்றி', hi: 'सफल', te: 'విజయం', ml: 'വിജയം' },

    // ── Scan Prescription ─────
    'scan.title': { en: 'Scan Prescription', ta: 'மருந்துச்சீட்டை ஸ்கேன் செய்', hi: 'प्रिस्क्रिप्शन स्कैन करें', te: 'ప్రిస్క్రిప్షన్ స్కాన్ చేయండి', ml: 'കുറിപ്പടി സ്കാൻ ചെയ്യുക' },
    'scan.takePhoto': { en: 'Take a photo or upload your prescription', ta: 'புகைப்படம் எடுக்கவும் அல்லது மருந்துச்சீட்டை பதிவேற்றவும்', hi: 'फोटो लें या अपना प्रिस्क्रिप्शन अपलोड करें', te: 'ఫోటో తీయండి లేదా మీ ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయండి', ml: 'ഫോട്ടോ എടുക്കുക അല്ലെങ്കിൽ കുറിപ്പടി അപ്‌ലോഡ് ചെയ്യുക' },
    'scan.selectImage': { en: 'Select Image', ta: 'படத்தை தேர்வு செய்', hi: 'छवि चुनें', te: 'చిత్రాన్ని ఎంచుకోండి', ml: 'ചിത്രം തിരഞ്ഞെടുക്കുക' },
    'scan.camera': { en: 'Camera', ta: 'கேமரா', hi: 'कैमरा', te: 'కెమెరా', ml: 'ക്യാമറ' },
    'scan.gallery': { en: 'Gallery', ta: 'கேலரி', hi: 'गैलरी', te: 'గ్యాలరీ', ml: 'ഗാലറി' },
    'scan.handwritten': { en: 'Handwritten prescriptions supported', ta: 'கையெழுத்து மருந்துச்சீட்டுகளும் ஆதரிக்கப்படுகின்றன', hi: 'हस्तलिखित नुस्खे समर्थित हैं', te: 'చేతిరాత ప్రిస్క్రిప్షన్లు మద్దతు ఇస్తుంది', ml: 'കൈയ്യെഴുത്ത് കുറിപ്പടികൾ പിന്തുണയ്ക്കുന്നു' },
    'scan.scanning': { en: 'Scanning Prescription...', ta: 'மருந்துச்சீட்டை ஸ்கேன் செய்கிறது...', hi: 'प्रिस्क्रिप्शन स्कैन हो रहा है...', te: 'ప్రిస్క్రిప్షన్ స్కాన్ అవుతోంది...', ml: 'കുറിപ്പടി സ്കാൻ ചെയ്യുന്നു...' },
    'scan.extract': { en: 'Extract Medicines', ta: 'மருந்துகளை பிரித்தெடு', hi: 'दवाएं निकालें', te: 'మందులను ఎక్స్‌ట్రాక్ట్ చేయండి', ml: 'മരുന്നുകൾ എക്‌സ്ട്രാക്റ്റ് ചെയ്യുക' },
    'scan.medsFound': { en: 'Medicines Found', ta: 'கண்டறியப்பட்ட மருந்துகள்', hi: 'पाई गई दवाएं', te: 'కనుగొన్న మందులు', ml: 'കണ്ടെത്തിയ മരുന്നുകൾ' },
    'scan.found': { en: 'found', ta: 'கண்டறியப்பட்டது', hi: 'मिला', te: 'కనుగొన్నారు', ml: 'കണ്ടെത്തി' },
    'scan.noMatch': { en: 'No medicines matched in our database.', ta: 'எங்கள் தரவுத்தளத்தில் மருந்துகள் பொருந்தவில்லை.', hi: 'हमारे डेटाबेस में कोई दवा मेल नहीं खाई।', te: 'మా డేటాబేస్‌లో మందులు సరిపోలలేదు.', ml: 'ഞങ്ങളുടെ ഡാറ്റാബേസിൽ മരുന്നുകൾ പൊരുത്തപ്പെട്ടില്ല.' },
    'scan.trySearch': { en: 'Try searching manually in the Search tab', ta: 'தேடல் தாவலில் கைமுறையாக தேடவும்', hi: 'खोज टैब में मैन्युअल रूप से खोजें', te: 'శోధన ట్యాబ్‌లో మాన్యువల్‌గా శోధించండి', ml: 'തിരയൽ ടാബിൽ മാനുവലായി തിരയുക' },
    'scan.viewRaw': { en: 'View raw text', ta: 'மூல உரையை காண', hi: 'कच्चा टेक्स्ट देखें', te: 'రా టెక్స్ట్ చూడండి', ml: 'റോ ടെക്‌സ്റ്റ് കാണുക' },
    'scan.failed': { en: 'Failed to process image. Please try again.', ta: 'படத்தை செயலாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', hi: 'छवि प्रोसेस करने में विफल। कृपया पुन: प्रयास करें।', te: 'చిత్రాన్ని ప్రాసెస్ చేయడం విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.', ml: 'ചിത്രം പ്രോസസ്സ് ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.' },

    // ── AI Chat ───────────────
    'chat.title': { en: 'AI Health Assistant', ta: 'AI சுகாதார உதவியாளர்', hi: 'AI स्वास्थ्य सहायक', te: 'AI ఆరోగ్య అసిస్టెంట్', ml: 'AI ആരോഗ്യ അസിസ്റ്റന്റ്' },
    'chat.greeting': { en: 'Hello! I am your MediScan assistant. How can I help you today?', ta: 'வணக்கம்! நான் உங்கள் மெடிஸ்கேன் உதவியாளர். இன்று நான் எப்படி உங்களுக்கு உதவ முடியும்?', hi: 'नमस्ते! मैं आपका मेडीस्कैन सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?', te: 'హలో! నేను మీ మెడిస్కాన్ అసిస్టెంట్. ఈ రోజు నేను మీకు ఎలా సహాయం చేయగలను?', ml: 'ഹലോ! ഞാൻ നിങ്ങളുടെ മെഡിസ്കാൻ അസിസ്റ്റന്റ് ആണ്. ഇന്ന് എനിക്ക് എങ്ങനെ സഹായിക്കാനാകും?' },
    'chat.placeholder': { en: 'Ask about medicines, symptoms...', ta: 'மருந்துகள், அறிகுறிகள் பற்றி கேளுங்கள்...', hi: 'दवाओं, लक्षणों के बारे में पूछें...', te: 'మందులు, లక్షణాల గురించి అడగండి...', ml: 'മരുന്നുകൾ, രോഗലക്ഷണങ്ങൾ കുറിച്ച് ചോദിക്കൂ...' },
    'chat.error': { en: "Sorry, I'm having trouble connecting right now. Please try again.", ta: 'மன்னிக்கவும், இப்போது இணைப்பதில் சிக்கல் உள்ளது. மீண்டும் முயற்சிக்கவும்.', hi: 'क्षमा करें, अभी कनेक्ट करने में समस्या हो रही है। कृपया पुन: प्रयास करें।', te: 'క్షమించండి, ప్రస్తుతం కనెక్ట్ చేయడంలో సమస్య ఉంది. దయచేసి మళ్ళీ ప్రయత్నించండి.', ml: 'ക്ഷമിക്കണം, ഇപ്പോൾ കണക്ട് ചെയ്യുന്നതിൽ പ്രശ്നമുണ്ട്. വീണ്ടും ശ്രമിക്കുക.' },

    // ── Not Found ─────────────
    'notFound.title': { en: 'Oops! Page not found', ta: 'அச்சச்சோ! பக்கம் காணப்படவில்லை', hi: 'उफ़! पृष्ठ नहीं मिला', te: 'అయ్యో! పేజీ కనుగొనబడలేదు', ml: 'ക്ഷമിക്കണം! പേജ് കണ്ടെത്തിയില്ല' },
    'notFound.return': { en: 'Return to Home', ta: 'முகப்புக்கு திரும்பு', hi: 'होम पर लौटें', te: 'హోమ్‌కు తిరిగి వెళ్ళండి', ml: 'ഹോമിലേക്ക് മടങ്ങുക' },

    // ── Common ────────────────
    'common.error': { en: 'Error', ta: 'பிழை', hi: 'त्रुटि', te: 'లోపం', ml: 'പിശക്' },
    'common.success': { en: 'Success', ta: 'வெற்றி', hi: 'सफल', te: 'విజయం', ml: 'വിജയം' },
    'common.loading': { en: 'Loading...', ta: 'ஏற்றுகிறது...', hi: 'लोड हो रहा है...', te: 'లోడ్ అవుతోంది...', ml: 'ലോഡ് ചെയ്യുന്നു...' },
};

// ─── Context ──────────────────────────────────────────────────────
interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getSavedLang(): Language {
    try {
        const saved = localStorage.getItem('mediscan_lang');
        if (saved && saved in LANGUAGE_LABELS) return saved as Language;
    } catch { /* ignore */ }
    return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>(getSavedLang);

    const setLang = useCallback((newLang: Language) => {
        setLangState(newLang);
        localStorage.setItem('mediscan_lang', newLang);
    }, []);

    const t = useCallback((key: string, vars?: Record<string, string>): string => {
        const entry = translations[key];
        if (!entry) return key; // fallback to key
        let text = entry[lang] || entry.en || key;
        if (vars) {
            for (const [k, v] of Object.entries(vars)) {
                text = text.replace(`{${k}}`, v);
            }
        }
        return text;
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
    return ctx;
}
