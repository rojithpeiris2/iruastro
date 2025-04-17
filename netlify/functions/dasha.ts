import { Handler } from '@netlify/functions';
import * as Astronomy from 'astronomy-engine';
import moment from 'moment-timezone';
import 'dotenv/config';

interface Location {
    latitude: number;
    longitude: number;
    elevation?: number;
}

interface DashaRequest {
    dob: string;
    time: string;
    location: Location;
    timezone?: string;
    language?: 'en' | 'si';
}

interface DashaPeriod {
    planet: string;
    startDate: string;
    endDate: string;
    generalOutcome?:string
    prediction?: string;
    translatedPlanet?: string;
    antardasha?: DashaPeriod[];
}

interface DashaResponse {
    message: string;
    mainDasha: DashaPeriod[];
}

type PlanetName = 'Ketu' | 'Venus' | 'Sun' | 'Moon' | 'Mars' | 'Rahu' | 'Jupiter' | 'Saturn' | 'Mercury';

// Vimshottari Dasha periods in years
const dashaPeriods: Record<PlanetName, number> = {
    'Ketu': 7,
    'Venus': 20,
    'Sun': 6,
    'Moon': 10,
    'Mars': 7,
    'Rahu': 18,
    'Jupiter': 16,
    'Saturn': 19,
    'Mercury': 17
};

// Planet sequence in Vimshottari Dasha
const planetSequence: PlanetName[] = [
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
    'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

// Language translations
const translations = {
    en: {
        planets: {
            'Ketu': 'Ketu',
            'Venus': 'Venus',
            'Sun': 'Sun',
            'Moon': 'Moon',
            'Mars': 'Mars',
            'Rahu': 'Rahu',
            'Jupiter': 'Jupiter',
            'Saturn': 'Saturn',
            'Mercury': 'Mercury'
        },
        predictions: {
            'Ketu': 'Ketu is a shadow planet, often associated with spiritual detachment, past-life karma, and mysticism. During this dasha, material ambitions tend to lose importance, and life may bring unexplainable separations or losses that push the native toward self-realization. This period can feel isolating, as relationships and attachments begin to dissolve. In careers, there may be instability, sudden changes, or a withdrawal from positions of power. Health might suffer due to unknown causes or psychological stress. Yet, if Ketu is well-placed, it can be a time of deep inner growth, powerful intuitive development, and liberation from worldly entanglements. It’s a phase where renunciation, detachment, and spirituality become dominant themes.',
            'Venus': 'Venus brings a long and generally pleasant period characterized by love, luxury, relationships, artistic expression, and comfort. Individuals may find success in areas related to creativity, fashion, design, entertainment, or any beauty-related industry. This is often a period where romantic relationships flourish, and marriage or long-term partnerships may begin. Financially, this can be a prosperous time with gains from investments, vehicles, homes, and other material comforts. However, if Venus is afflicted, the native might indulge in lust, overconsumption, or unhealthy attachments, leading to emotional disappointment or financial issues. Spiritually, Venus can open the path to divine love and devotion (bhakti) if channeled correctly.',
            'Sun': 'The Sun’s dasha is a time of ego development, leadership, and self-expression. Individuals are often drawn into the spotlight, assuming positions of authority or responsibility. This can be a favorable time for political, government, or administrative careers, and recognition for one’s efforts is likely. The native’s relationship with the father or authority figures may come into focus, for better or worse. The Sun also governs health, vitality, and inner strength. If well-placed, this period boosts confidence and respect, but if afflicted, it may bring ego clashes, loss of reputation, or health issues related to the heart or eyes. It tests your sense of purpose and your ability to lead with integrity.',
            'Moon': 'The Moon governs emotions, mind, mother, and nurturing energy. This dasha heightens sensitivity and emotional intelligence. It’s a time when the native may focus on home life, emotional security, and close relationships. The Moon also governs public image, so people in professions involving the public, hospitality, or healing may thrive. If well-placed, it brings peace, maternal support, and mental clarity. However, if the Moon is afflicted, it can bring emotional turbulence, mood swings, and mental health struggles like depression or anxiety. The person becomes more in tune with their intuitive and subconscious world, which can be either healing or overwhelming, depending on chart strength.',
            'Mars': "Mars brings raw energy, ambition, and courage. This period is action-packed and tests one's willpower and aggression. It’s excellent for careers that involve risk, discipline, or competition—such as the military, sports, engineering, or entrepreneurship. When well-placed, Mars brings rapid success through hard work, assertiveness, and fearlessness. However, when poorly placed, it leads to conflicts, accidents, impulsiveness, and violent behavior. Mars also affects relationships—especially the marital bond—through dominance or sexual frustration. This dasha demands physical activity and strategic action. Spiritually, Mars can channel its energy into disciplined sadhana (practice) and service.",
            'Rahu': "Rahu, the North Node, brings a long period marked by intense desires, material ambition, deception, and foreign influences. This period can bring sudden rise or fall, exposure to foreign cultures, technology, and even scandals or fame. The native might experience a strong craving for recognition, power, or sensual pleasures. If well-placed, Rahu can offer immense success in unconventional fields like politics, media, or IT. But when afflicted, it leads to illusion, addiction, fraud, or betrayal. Psychologically, the person may face confusion, anxiety, or identity crises. Rahu tempts with the world, but also teaches that desire without wisdom leads to suffering. This dasha transforms the individual by breaking their attachment to illusions.",
            'Jupiter': "Jupiter brings wisdom, expansion, and blessings. It’s often one of the most favorable dashas, depending on its strength in the chart. Jupiter governs education, children, marriage (especially for women), ethics, and spiritual growth. This period is ideal for deepening knowledge, starting a family, or becoming a teacher/mentor. Financial growth is common, especially through law, teaching, banking, or philosophy. The person becomes more optimistic, charitable, and spiritually inclined. If afflicted, Jupiter’s excess can lead to overconfidence, self-righteousness, or legal problems. This dasha rewards those who walk the path of dharma (righteousness), and those who misuse its gifts may later face karmic corrections.",
            'Saturn': "Saturn is the great teacher and taskmaster. Its dasha is long and can feel heavy, but it builds maturity, patience, and discipline. This period often brings responsibilities, hard work, delays, and tests in every area of life. The native may feel isolated, restricted, or burdened—especially in relationships and career. However, those who embrace responsibility, serve others, and live ethically often receive immense long-term rewards. Saturn strengthens your foundations. If poorly placed, it brings depression, loss, health issues, and karmic suffering. Spiritually, it forces introspection and renunciation of ego. The soul is refined through trials. By the end of this dasha, the person is usually wiser and more grounded.",
            'Mercury': "Mercury governs intellect, communication, business, and adaptability. This dasha is fast-paced, favoring those in fields like writing, teaching, commerce, IT, and diplomacy. The native becomes mentally agile, witty, and curious. Financial gains through clever thinking or trading are common. When well-placed, Mercury enhances speech, negotiation, and analytical ability. If afflicted, it causes mental restlessness, deceit, or anxiety. Relationships during this period can be stimulating but unstable. This is a time when adaptability and intelligence can elevate one’s status quickly. Spiritually, Mercury can help the native question belief systems and refine their understanding of truth through logic and study."
        },
        generalOutcome : {
            'Ketu': 'Mysterious losses, spiritual awakening',
            'Venus': 'Romance, creativity, wealth',
            'Sun': 'Leadership, ego tests, recognition',
            'Moon': 'Domestic happiness or mental instability',
            'Mars': 'Action, risk-taking, conflict or gain',
            'Rahu': 'Unconventional success or chaos',
            'Jupiter': 'Education, family, spiritual growth',
            'Saturn': 'Delays, trials, maturity, hard-earned success',
            'Mercury': 'Business success, mental stimulation'
        },
    },
    si: {
        planets: {
            'Ketu': 'කේතු',
            'Venus': 'සිකුරු',
            'Sun': 'රවි',
            'Moon': 'චන්ද්‍ර',
            'Mars': 'කුජ',
            'Rahu': 'රාහු',
            'Jupiter': 'ගුරු',
            'Saturn': 'ශනි',
            'Mercury': 'බුධ'
        },
        predictions: {
            "Ketu": "කේතු යනු සෙවනැලි ග්‍රහයෙක් වන අතර එය ආත්මීය විනිවිදභාවය, පෙර ජන්ම කර්ම සහ අධිභෞතිකත්වය සමඟ සම්බන්ධ වේ. මෙම දශාව තුළ ද්‍රව්යමය අභිලාෂයන් වැදගත්කම අඩු වන අතර ජීවිතයේ පැහැදිලි කළ නොහැකි වෙන්වීම් හෝ අලාභ සිදුවිය හැකි අතර එමඟින් පුද්ගලයා ආත්ම සාක්ෂාත්කරණය කරා යොමු වේ. මෙම කාලය තනිවීමක් ලෙස හැඟිය හැකිය, මන්ද සබඳතා සහ බැඳීම් අඩුවී යයි. වෘත්තීය ජීවිතයේ අස්ථාවරත්වය, අකස්මාත්‍ර වෙනස්වීම් හෝ බලතල ස්ථාන වලින් ඉවත්වීම් සිදුවිය හැකිය. නිශ්චිත හේතු නොමැතිව හෝ මානසික ආතතිය නිසා සෞඛ්‍ය ගැටළු ඇති විය හැකිය. කෙසේ වෙතත්, කේතු හොඳින් ස්ථාපිත වී ඇත්නම්, එය ගැඹුරු අභ්‍යන්තර වර්ධනය, බලවත් අන්තර්දෘෂ්ටික විකාසය සහ ලෝකයේ බැඳීම් වලින් මිදීමේ කාලයක් විය හැකිය. මෙය ත්‍යාගශීලී භාවය, විනිවිදභාවය සහ ආත්මීයත්වය ප්‍රධාන තේමා වන අවධියකි.",
            "Venus": "ශුක්‍ර දශාව ආදරය, විලාසිතා, සබඳතා, කලාත්මක ප්‍රකාශන සහ සැපයුම් වැනි ගති ගුණ මගින් සංලක්ෂිත දිගු හා සාමාන්‍යයෙන් සතුටුදායක කාලයක් ගෙන එයි. පුද්ගලයන්ට නිර්මාණශීලිත්වය, විලාසිතා, නිර්මාණ, විනෝදාස්වාදය හෝ අලංකාරය සම්බන්ධ කර්මාන්ත වල සාර්ථකත්වය ලබා ගත හැකිය. මෙය බොහෝ විට ආදරණීය සබඳතා වර්ධනය වන කාලයක් වන අතර විවාහය හෝ දිගුකාලීන සහභාගීත්වය ආරම්භ විය හැකිය. මූල්‍යමය වශයෙන්, මෙය ආයෝජන, වාහන, නිවාස සහ අනෙකුත් භෞතික සැපයුම් වලින් ලාභ ලබා ගත හැකි සමෘද්ධිමත් කාලයකි. කෙසේ වෙතත්, ශුක්‍ර අපහසුතාවයන්ට ලක් වී ඇත්නම්, පුද්ගලයා කාමය, අතිභෝගත්වය හෝ අසශීලී බැඳීම් වල නියැලීමට ඉඩ ඇති අතර එමඟින් චිත්තවේදනාත්මක අසනීප හෝ මූල්‍ය ගැටළු ඇති විය හැකිය. ආත්මීය වශයෙන්, ශුක්‍ර නිවැරදිව මග පෙන්වන්නේ නම් එය දිව්‍යමය ආදරය සහ භක්තිය කරා ගමන් කිරීමට මග පාදා දෙයි.",
            "Sun": "රවිගේ දශාව අහංකාරය, නායකත්වය සහ ස්වයං ප්‍රකාශනය වර්ධනය කරන කාලයකි. පුද්ගලයන් බොහෝ විට spot එලයට ඇදී ගොස් බලතල ස්ථාන හෝ වගකීම් දරණ තනතුරු භාර ගනීති. මෙය දේශපාලන, රජය හෝ පරිපාලන වෘත්තීන් සඳහා උචිත කාලයක් වන අතර ඔවුන්ගේ ප්‍රයත්න සඳහා පිළිගැනීමක් ලැබිය හැකිය. පියා හෝ බලතල ස්ථාන වල පුද්ගලයන් සමඟ සබඳතා වඩාත් වැදගත් විය හැකිය, එය හොඳට හෝ නරකට. රවි සෞඛ්‍යය, ශක්තිය සහ අභ්‍යන්තර ශක්තිය ද පාලනය කරයි. හොඳින් ස්ථාපිත වී ඇත්නම්, මෙම කාලය ආත්ම විශ්වාසය සහ ගෞරවය වර්ධනය කරයි, නමුත් අපහසුතාවයන්ට ලක් වී ඇත්නම් අහංකාරයේ ගැටුම්, කීර්තිනාමය අහිමි වීම හෝ හෘදය හෝ ඇස් සම්බන්ධ සෞඛ්‍ය ගැටළු ඇති විය හැකිය. එය ඔබේ අරමුණු සහ සංකල්පය සමඟ සංයමයෙන් නායකත්වය දැරීමේ හැකියාව පරීක්ෂා කරයි.",
            "Moon": "චන්ද්‍රයා චිත්තවේග, මනස, මව සහ පෝෂණ ශක්තිය පාලනය කරයි. මෙම දශාව සංවේදනශීලීත්වය සහ චිත්තවේගීය බුද්ධිය වර්ධනය කරයි. මෙය පුද්ගලයා නිවසේ ජීවිතය, චිත්තවේගීය සුරක්ෂිතභාවය සහ සමීප සබඳතා වෙත අවධානය යොමු කරන කාලයකි. චන්ද්‍රයා මහජන චිත්‍රය ද පාලනය කරයි, එබැවින් මහජන, අතිථි සත්කාර හෝ සායනික වෘත්තීන් වල නියැලෙන පුද්ගලයන්ට යහපත් අවස්ථා ලැබිය හැකිය. හොඳින් ස්ථාපිත වී ඇත්නම්, එය සාමය, මාතෘ සහයෝගය සහ මානසික පැහැදිලි භාවය ගෙන එයි. කෙසේ වෙතත්, චන්ද්‍රයා අපහසුතාවයන්ට ලක් වී ඇත්නම්, එය චිත්තවේගීය අස්ථාවරත්වය, මනෝභාවයේ වෙනස්වීම් සහ චිත්තවේගීය ගැටළු (උදා: අවපීඩනය හෝ කාංසාව) ඇති කළ හැකිය. පුද්ගලයා ඔවුන්ගේ අන්තර්දෘෂ්ටික හා යටිසුවඳැරුණු ලෝකය සමඟ වැඩි සුසංයෝගයක් ඇති කර ගනී, එය ඔවුන්ගේ ජාතක බලය අනුව සානි සුවදායක හෝ අතිශයින් බරපතල විය හැකිය.",
            "Mars": "කුජ ග්‍රහයා ගෙන එන්නේ අමිහිරි ශක්තිය, අභිලාෂය සහ ධෛර්යයයි. මෙම කාලය ක්‍රියාශීලී වන අතර එක් අයෙකුගේ අධිෂ්ඨානය හා ආක්‍රමණශීලීත්වය පරීක්ෂා කරයි. යුධ හමුදා, ක්‍රීඩා, ඉංජිනේරු විද්‍යාව හෝ ව්‍යවසායකත්වය වැනි අවදානම්, විනය හෝ තරඟකාරීත්වය සම්බන්ධ වෘත්තීන් සඳහා මෙය විශිෂ්ට කාලයකි. හොඳින් ස්ථාපිත වී ඇත්නම්, කුජ දැඩි වැඩ, නිර්භීතභාවය සහ නිර්භයක්‍රමවත් බව මගින් ඉක්මන් සාර්ථකත්වය ගෙන එයි. කෙසේ වෙතත්, නරක ලෙස ස්ථාපිත වී ඇත්නම්, එය ගැටුම්, අනතුරු, ආවේගශීලී චර්යාව සහ ත්‍රස්තවාදී හැසිරීම් වලට තුඩු දිය හැකිය. කුජ සබඳතා (විශේෂයෙන් විවාහ බන්ධනය) ද බලපායි—නායකත්වය හෝ ලිංගික නොසන්සුන්තාවය මගින්. මෙම දශාව ශාරීරික ක්‍රියාකාරකම් සහ උපායමාර්ගික ක්‍රියාමාර්ග ඉල්ලා සිටී. ආත්මීය වශයෙන්, කුජ එහි ශක්තිය විනයගරුක සාධන (පුරුදු) සහ සේවය තුළට යොමු කළ හැකිය.",
            "Rahu": "රාහු ගෙන එන්නේ තීව්‍ර ආශා, ද්‍රව්යමය අභිලාෂය, වංචා සහ විදේශීය බලපෑම් වලින් සංලක්ෂිත දිගු කාලයකි. මෙම කාලය තුළ අක්‍රමණශීලී ඉහළ යාමක් හෝ පහත වැටීමක්, විදේශීය සංස්කෘතීන්, තාක්ෂණය සහ අපකීර්තිය හෝ කීර්තියට ලක්වීම සිදුවිය හැකිය. පුද්ගලයාට පිළිගැනීම, බලය හෝ ලෝකීය සුඛෝපභෝගීත්වය පිළිබඳ තීව්‍ර ආශා ඇති විය හැකිය. හොඳින් ස්ථාපිත වී ඇත්නම්, රාහු දේශපාලනය, මාධ්‍ය හෝ තොරතුරු තාක්ෂණය වැනි සාම්ප්‍රදායික නොවන ක්ෂේත්‍ර වල විශාල සාර්ථකත්වය ලබා දිය හැකිය. නමුත් අපහසුතාවයන්ට ලක් වී ඇත්නම්, එය මායා, ආසක්තිය, වංචා හෝ විශ්වාසභංගත්වය වැනි දේවල් වලට තුඩු දිය හැකිය. මානසික වශයෙන්, පුද්ගලයා ව්‍යාකූලත්වය, කාංසාව හෝ අනන්‍යතා අර්බුද වලට මුහුණ දිය හැකිය. රාහු ලෝකයෙන් ප්‍රලෝභනය කරයි, නමුත් ඥානය නොමැතිව ආශා කිරීම දුකට තුඩු දෙන බව ඉගැන්වීම ද කරයි. මෙම දශාව පුද්ගලයා ඔවුන්ගේ මායා වලට ඇති බැඳීම් බිඳ දමා පරිවර්තනය කරයි.",
            "Jupiter": "ගුරු ග්‍රහයා ඥානය, ප්‍රසාරණය සහ ආශිර්වාද ගෙන එයි. ජාතක රාශියේ එහි ශක්තිය අනුව මෙය බොහෝ විට වාසනාවන්ත දශාවක් වේ. ගුරු අධ්‍යාපනය, දරුවන්, විවාහය (විශේෂයෙන් කාන්තාවන් සඳහා), ආචාර ධර්ම සහ ආත්මීය වර්ධනය පාලනය කරයි. මෙම කාලය දැනුම ගැඹුරු කර ගැනීම, පවුලක් ආරම්භ කිරීම හෝ ගුරු/මාර්ගදර්ශක වීම සඳහා ඉතා සුදුසුය. නීතිය, ඉගැන්වීම, බැංකුකරණය හෝ දර්ශනය වැනි ක්ෂේත්‍ර හරහා මූල්‍ය වර්ධනය සිදුවිය හැකිය. පුද්ගලයා වඩාත් ආශාවන්ත, දානශීලී සහ ආත්මීය ලෙස නැඹුරු වේ. අපහසුතාවයන්ට ලක් වී ඇත්නම්, ගුරුගේ අධික භාවය අධිශ්‍රද්ධාව, ස්වයං-සාධාරණත්වය හෝ නීතිමය ගැටළු වලට තුඩු දිය හැකිය. මෙම දශාව ධර්මය (සදාචාරය) මග පිළිපදින අයට ප්‍රතිඵල ලබා දෙන අතර එහි ත්‍යාග අනිසි ලෙස භාවිතා කරන අයට පසුව කර්මික නිවැරදි කිරීම් මුහුණ දිය හැකිය.",
            "Saturn": "සෙනසුරු යනු මහා ගුරුවරයා සහ කාර්ය භාර ගන්නා අයයි. එහි දශාව දිගු වන අතර බරපතල යැයි හැඟිය හැකි නමුත් එය පරිණතභාවය, ඉවසීම සහ විනය ගොඩනඟයි. මෙම කාලය ජීවිතයේ සෑම අංශයකම වගකීම්, දැඩි වැඩ, ප්‍රමාද සහ පරීක්ෂණ ගෙන එයි. පුද්ගලයා වෙන්වීම, සීමා කිරීම් හෝ බර යැයි හැඟිය හැකිය—විශේෂයෙන් සබඳතා සහ වෘත්තීය ජීවිතය තුළ. කෙසේ වෙතත්, වගකීම් භාර ගන්නා, අන් අයට සේවය කරන සහ සදාචාරමය ජීවිතයක් ගත කරන අයට දිගු කාලීන විශාල ඵලදායීතා ලැබිය හැකිය. සැනසුම් ඔබේ අත්තිවාරම් ශක්තිමත් කරයි. නරක ලෙස ස්ථාපිත වී ඇත්නම්, එය අවපීඩනය, අලාභ, සෞඛ්‍ය ගැටළු සහ කර්මික දුක්ඛිත භාවය ගෙන එයි. ආත්මීය වශයෙන්, එය අභ්‍යන්තර ගවේෂණය සහ අහංකාරය අත්හැරීමට බල කරයි. ආත්මය පරීක්ෂණ හරහා පිරිසිදු කරනු ලැබේ. මෙම දශාව අවසානයේ පුද්ගලයා සාමාන්‍යයෙන් ඥානවන්ත හා වඩාත් ස්ථාවර වේ.",
            "Mercury": "බුධ බුද්ධිය, සන්නිවේදනය, ව්‍යාපාර සහ අනුවර්තනය පාලනය කරයි. මෙම දශාව වේගවත් වන අතර ලේඛන, ඉගැන්වීම, වාණිජ, තොරතුරු තාක්ෂණය සහ රාජ්‍ය තාන්ත්‍රික වැනි ක්ෂේත්‍ර වල නියැලෙන අයට උචිතයි. පුද්ගලයා මානසික වශයෙන් ක්‍රියාශීලී, විචක්ෂණශීලී සහ කුතුහලයෙන් පිරි වේ. උපායමාර්ගික චින්තනය හෝ වෙළඳාම් හරහා මූල්‍ය ලාභ ලැබිය හැකිය. හොඳින් ස්ථාපිත වී ඇත්නම්, බුධ වාචික හැකියාව, සාකච්ඡා කිරීම සහ විශ්ලේෂණාත්මක හැකියාව වර්ධනය කරයි. අපහසුතාවයන්ට ලක් වී ඇත්නම්, එය මානසික අස්ථාවරත්වය, වංචා හෝ කාංසාව ඇති කළ හැකිය. මෙම කාලය තුළ සබඳතා උත්තේජනය කරන නමුත් අස්ථාවර විය හැකිය. මෙය අනුවර්තනය හා බුද්ධිය මගින් යමෙකුගේ තත්ත්වය ඉක්මනින් ඉහළ නංවා ගත හැකි කාලයකි. ආත්මීය වශයෙන්, බුධ පුද්ගලයාට ඇදහිලි පද්ධති පිළිබඳව ප්‍රශ්න ඇසීමට සහ තර්කනය හා අධ්‍යයනය හරහා සත්‍යය පිළිබඳ ඔවුන්ගේ අවබෝධය පිරිපහදු කිරීමට උපකාරී වේ."
        },
        generalOutcome : {
            "Ketu": "අද්භූත අලාභ, ආත්මික අවබෝධය",
            "Venus": "ප්‍රේමය, නිර්මාණශීලිත්වය, සම්පත්",
            "Sun": "නායකත්වය, අහංකාරයේ පරීක්ෂා, පිළිගැනීම",
            "Moon": "ගෘහස්ථ සතුට හෝ මානසික අස්ථාවරත්වය",
            "Mars": "ක්‍රියා, අවදානම් ගැනීම, ගැටුම් හෝ ලාභ",
            "Rahu": "සාම්ප්‍රදායික නොවන සාර්ථකත්වය හෝ අවුල්",
            "Jupiter": "අධ්‍යාපනය, පවුල, ආත්මික වර්ධනය",
            "Saturn": "ප්‍රමාද, පරීක්ෂණ, පරිණත භාවය, කැපවීමෙන් ලැබෙන ජය",
            "Mercury": "ව්‍යාපාරික සාර්ථකත්වය, මානසික උත්තේජනය"
        },
    }
};

function calculateAyanamsa(date: Date): number {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600;
    const yearDiff = (date.getTime() - referenceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
}

function getNakshatraLord(deg: number): PlanetName {
    const nakshatra = Math.floor(deg * 27 / 360);
    const lords: PlanetName[] = [
        'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
        'Rahu', 'Jupiter', 'Saturn', 'Mercury',
        'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
        'Rahu', 'Jupiter', 'Saturn', 'Mercury',
        'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
        'Rahu', 'Jupiter', 'Saturn', 'Mercury'
    ];
    return lords[nakshatra];
}

function calculateDashaPeriods(birthDate: Date, moonDegree: number, language: string = 'en'): DashaPeriod[] {
    const birthMoment = moment.utc(birthDate);
    const totalCycle = 120; // Total years in Vimshottari Dasha cycle
    
    // Calculate the consumed portion of the current dasha
    const nakshatra = Math.floor(moonDegree * 27 / 360);
    const progressInNakshatra = (moonDegree * 27 / 360) % 1;
    const currentLord = getNakshatraLord(moonDegree);
    
    // Find start index in sequence
    const startIndex = planetSequence.indexOf(currentLord);
    const dashas: DashaPeriod[] = [];
    
    // Calculate remaining portion of current dasha
    let currentDate = birthMoment.clone();
    const remainingYears = dashaPeriods[currentLord] * (1 - progressInNakshatra);
    
    // Generate all dasha periods
    for (let i = 0; i < 9; i++) {
        const planetIndex = (startIndex + i) % 9;
        const planet = planetSequence[planetIndex];
        const periodYears = i === 0 ? remainingYears : dashaPeriods[planet];
        
        const startDate = currentDate.clone();
        const endDate = currentDate.clone().add(periodYears, 'years');
        
        dashas.push({
            planet,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            generalOutcome: translations[language === 'si' ? 'si' : 'en'].generalOutcome[planet],
            prediction: translations[language === 'si' ? 'si' : 'en'].predictions[planet],
            translatedPlanet: translations[language === 'si' ? 'si' : 'en'].planets[planet],
            antardasha: calculateAntarDasha(startDate.toDate(), endDate.toDate(), planet, language)
        });
        
        currentDate = endDate;
    }
    
    return dashas;
}

function calculateAntarDasha(startDate: Date, endDate: Date, mahadashaLord: PlanetName, language: string = 'en'): DashaPeriod[] {
    const startMoment = moment.utc(startDate);
    const totalPeriod = moment.utc(endDate).diff(startMoment, 'years', true);
    const antardasha: DashaPeriod[] = [];
    
    // Start from the Mahadasha lord in the sequence
    const startIndex = planetSequence.indexOf(mahadashaLord);
    let currentDate = startMoment.clone();
    
    for (let i = 0; i < 9; i++) {
        const planetIndex = (startIndex + i) % 9;
        const planet = planetSequence[planetIndex];
        const periodYears = (dashaPeriods[planet] / 120) * totalPeriod;
        
        const antarStartDate = currentDate.clone();
        const antarEndDate = currentDate.clone().add(periodYears, 'years');
        
        antardasha.push({
            planet,
            startDate: antarStartDate.format('YYYY-MM-DD'),
            endDate: antarEndDate.format('YYYY-MM-DD'),
            translatedPlanet: translations[language === 'si' ? 'si' : 'en'].planets[planet]
        });
        
        currentDate = antarEndDate;
    }
    
    return antardasha;
}

function validateToken(event: any): boolean {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    return token === process.env.IRUASTRO_ACCESS_TOKEN;
}

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Only POST requests are allowed' }),
        };
    }

    if (!validateToken(event)) {
        return {
            statusCode: 401,
            body: JSON.stringify({ 
                message: "Unauthorized access. Please provide a valid Bearer token.",
                error: 'UNAUTHORIZED'
            }),
        };
    }

    try {
        if (!event.body) throw new Error('Request body is missing');
        const { dob, time, location, timezone = 'Asia/Colombo', language = 'en' }: DashaRequest = JSON.parse(event.body);

        const errors: string[] = [];
        if (!dob) errors.push('dob is required');
        if (!time) errors.push('time is required');
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            errors.push('Valid location.latitude and location.longitude are required');
        }

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Validation errors', errors }),
            };
        }

        const localDateTime = moment.tz(`${dob} ${time}`, 'YYYY-MM-DD HH:mm', timezone);
        if (!localDateTime.isValid()) throw new Error('Invalid date or time format');

        const dateTime = new Date(localDateTime.utc().format());
        
        // Calculate Moon's position
        const moonVector = Astronomy.GeoVector('Moon' as Astronomy.Body, dateTime, true);
        const moonEcliptic = Astronomy.Ecliptic(moonVector);
        const ayanamsa = calculateAyanamsa(dateTime);
        const moonSiderealLong = ((moonEcliptic.elon - ayanamsa + 360) % 360);

        // Calculate Vimshottari Dasha periods
        const dashaPeriods = calculateDashaPeriods(dateTime, moonSiderealLong, language);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: language === 'si' ? 'දශා ගණනය සාර්ථකයි' : 'Dasha periods calculated successfully',
                mainDasha: dashaPeriods
            }),
        };

    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: error?.message || 'An unexpected error occurred',
                error: error?.name || 'UNKNOWN_ERROR'
            }),
        };
    }
};
