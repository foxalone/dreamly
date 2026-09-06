import type { DreamCategory } from "@/lib/dream-categories";
import type { Locale } from "./config";

export type CategoryCopy = { label: string; description: string };

const EN: Record<DreamCategory, CategoryCopy> = {
  animals: { label: "Animal dreams", description: "Instinct, trust, boundaries, protection, and the untamed parts of the self." },
  body: { label: "Body dreams", description: "Confidence, health awareness, expression, identity, and personal control." },
  water: { label: "Water dreams", description: "Emotion, intuition, change, cleansing, and what moves below awareness." },
  "life-events": { label: "Life event dreams", description: "Beginnings, endings, responsibility, relationships, value, and transition." },
  "fear-nightmares": { label: "Fear & nightmare dreams", description: "Pressure, avoidance, insecurity, vulnerability, and the need for safety." },
  places: { label: "Place dreams", description: "Belonging, memory, inner structure, privacy, and emotional foundations." },
  movement: { label: "Movement dreams", description: "Freedom, direction, ambition, control, progress, and changing perspective." },
  objects: { label: "Object & value dreams", description: "Security, opportunity, self-worth, resources, and practical priorities." },
  people: { label: "People & relationship dreams", description: "Love, family, attachment, betrayal, longing, and the bonds that shape identity." },
  nature: { label: "Nature & disaster dreams", description: "Elemental force, upheaval, renewal, and events larger than personal control." },
  spiritual: { label: "Spiritual & supernatural dreams", description: "Faith, the unseen, protection, fear of the beyond, and messages from within." },
};

const ES: Record<DreamCategory, CategoryCopy> = {
  animals: { label: "Sueños de animales", description: "Instinto, confianza, límites, protección y lo indómito de uno mismo." },
  body: { label: "Sueños del cuerpo", description: "Confianza, salud, expresión, identidad y control personal." },
  water: { label: "Sueños de agua", description: "Emoción, intuición, cambio, limpieza y lo que se mueve bajo la conciencia." },
  "life-events": { label: "Sueños de la vida", description: "Comienzos, finales, responsabilidad, vínculos, valor y tránsito." },
  "fear-nightmares": { label: "Miedo y pesadillas", description: "Presión, evitación, inseguridad, vulnerabilidad y la necesidad de resguardo." },
  places: { label: "Sueños de lugares", description: "Pertenencia, memoria, estructura interior, intimidad y cimientos emocionales." },
  movement: { label: "Sueños de movimiento", description: "Libertad, rumbo, ambición, control, avance y cambio de perspectiva." },
  objects: { label: "Sueños de objetos y valor", description: "Seguridad, oportunidad, autoestima, recursos y prioridades prácticas." },
  people: { label: "Sueños de personas y vínculos", description: "Amor, familia, apego, traición, anhelo y los lazos que forman la identidad." },
  nature: { label: "Sueños de naturaleza y desastre", description: "Fuerza elemental, trastorno, renovación y lo que supera el control personal." },
  spiritual: { label: "Sueños espirituales y de lo oculto", description: "Fe, lo invisible, protección, temor a lo de más allá y mensajes interiores." },
};

const PT: Record<DreamCategory, CategoryCopy> = {
  animals: { label: "Sonhos com animais", description: "Instinto, confiança, limites, proteção e o lado indomado de si." },
  body: { label: "Sonhos com o corpo", description: "Confiança, saúde, expressão, identidade e controle pessoal." },
  water: { label: "Sonhos com água", description: "Emoção, intuição, mudança, limpeza e o que se move abaixo da consciência." },
  "life-events": { label: "Sonhos de acontecimentos", description: "Começos, fins, responsabilidade, vínculos, valor e transição." },
  "fear-nightmares": { label: "Medo e pesadelos", description: "Pressão, evitação, insegurança, vulnerabilidade e a necessidade de abrigo." },
  places: { label: "Sonhos de lugares", description: "Pertença, memória, estrutura interior, intimidade e alicerces emocionais." },
  movement: { label: "Sonhos de movimento", description: "Liberdade, rumo, ambição, controle, avanço e mudança de perspectiva." },
  objects: { label: "Sonhos de objetos e valor", description: "Segurança, oportunidade, autoestima, recursos e prioridades práticas." },
  people: { label: "Sonhos de pessoas e relações", description: "Amor, família, apego, traição, saudade e os laços que formam a identidade." },
  nature: { label: "Sonhos de natureza e desastre", description: "Força elemental, abalo, renovação e o que ultrapassa o controle pessoal." },
  spiritual: { label: "Sonhos espirituais e do invisível", description: "Fé, o oculto, proteção, temor do além e mensagens de dentro." },
};

const DE: Record<DreamCategory, CategoryCopy> = {
  animals: { label: "Tierträume", description: "Instinkt, Vertrauen, Grenzen, Schutz und das Ungezähmte im Selbst." },
  body: { label: "Körperträume", description: "Selbstbild, Gesundheit, Ausdruck, Identität und persönliche Kontrolle." },
  water: { label: "Wasserträume", description: "Gefühl, Intuition, Wandel, Reinigung und das, was unterhalb des Bewusstseins fließt." },
  "life-events": { label: "Lebensträume", description: "Anfänge, Enden, Verantwortung, Bindung, Wert und Übergang." },
  "fear-nightmares": { label: "Angst und Albträume", description: "Druck, Vermeidung, Unsicherheit, Verletzlichkeit und das Bedürfnis nach Schutz." },
  places: { label: "Ortsträume", description: "Zugehörigkeit, Erinnerung, innere Struktur, Intimität und emotionale Fundamente." },
  movement: { label: "Bewegungsträume", description: "Freiheit, Richtung, Ehrgeiz, Kontrolle, Fortschritt und Perspektivwechsel." },
  objects: { label: "Objekt- und Wertträume", description: "Sicherheit, Chance, Selbstwert, Ressourcen und praktische Prioritäten." },
  people: { label: "Menschen- und Beziehungsträume", description: "Liebe, Familie, Bindung, Verrat, Sehnsucht und die Bande, die Identität formen." },
  nature: { label: "Natur- und Katastrophenträume", description: "Elementare Kraft, Umbruch, Erneuerung und das, was größer ist als Kontrolle." },
  spiritual: { label: "Spirituelle und übersinnliche Träume", description: "Glaube, das Unsichtbare, Schutz, Furcht vor dem Jenseits und innere Botschaften." },
};

const RU: Record<DreamCategory, CategoryCopy> = {
  animals: { label: "Сны о животных", description: "Инстинкт, доверие, границы, защита и дикая часть себя." },
  body: { label: "Сны о теле", description: "Уверенность, здоровье, выражение, идентичность и личный контроль." },
  water: { label: "Сны о воде", description: "Чувство, интуиция, перемена, очищение и то, что движется ниже сознания." },
  "life-events": { label: "Сны о событиях жизни", description: "Начала, концы, ответственность, связи, ценность и переход." },
  "fear-nightmares": { label: "Страх и кошмары", description: "Давление, избегание, неуверенность, уязвимость и нужда в безопасности." },
  places: { label: "Сны о местах", description: "Принадлежность, память, внутренняя структура, частное и эмоциональный фундамент." },
  movement: { label: "Сны о движении", description: "Свобода, направление, амбиция, контроль, путь и смена взгляда." },
  objects: { label: "Сны о вещах и ценности", description: "Безопасность, возможность, самооценка, ресурсы и практические приоритеты." },
  people: { label: "Сны о людях и отношениях", description: "Любовь, семья, привязанность, предательство, тоска и связи, что формируют «я»." },
  nature: { label: "Сны о природе и бедствии", description: "Стихия, перелом, обновление и то, что больше личного контроля." },
  spiritual: { label: "Духовные и сверхъестественные сны", description: "Вера, невидимое, защита, страх запредельного и внутренние вести." },
};

const AR: Record<DreamCategory, CategoryCopy> = {
  animals: { label: "أحلام الحيوانات", description: "الغريزة، الثقة، الحدود، الحماية، والجوانب الجامحة من النفس." },
  body: { label: "أحلام الجسد", description: "الثقة، الوعي بالصحة، التعبير، الهوية، والسيطرة الشخصية." },
  water: { label: "أحلام الماء", description: "العاطفة، الحدس، التغيّر، التطهير، وما يتحرك تحت الوعي." },
  "life-events": { label: "أحلام أحداث الحياة", description: "بدايات ونهايات، مسؤولية، علاقات، قيمة، وانتقال." },
  "fear-nightmares": { label: "الخوف والكوابيس", description: "ضغط، تجنّب، انعدام أمان، هشاشة، والحاجة إلى ملاذ." },
  places: { label: "أحلام الأماكن", description: "انتماء، ذاكرة، بنية داخلية، خصوصية، وأسس عاطفية." },
  movement: { label: "أحلام الحركة", description: "حرية، اتجاه، طموح، سيطرة، تقدّم، وتغيّر في المنظور." },
  objects: { label: "أحلام الأشياء والقيمة", description: "أمان، فرصة، تقدير للذات، موارد، وأولويات عملية." },
  people: { label: "أحلام الناس والعلاقات", description: "حب، أسرة، تعلق، خيانة، شوق، والروابط التي تشكّل الهوية." },
  nature: { label: "أحلام الطبيعة والكوارث", description: "قوة عنصرية، اضطراب، تجديد، وما يتجاوز السيطرة الشخصية." },
  spiritual: { label: "أحلام روحية وغيبية", description: "إيمان، الغيب، حماية، خوف مما وراء، ورسائل من الداخل." },
};

const ALL: Record<Locale, Record<DreamCategory, CategoryCopy>> = {
  en: EN,
  es: ES,
  ar: AR,
  pt: PT,
  de: DE,
  ru: RU,
};

export function getCategoryCopy(locale: Locale, category: DreamCategory): CategoryCopy {
  return ALL[locale][category];
}

export function getAllCategoryCopy(locale: Locale): Record<DreamCategory, CategoryCopy> {
  return ALL[locale];
}
