import type { Locale } from "./config";
import type { LoveDimension } from "@/lib/loveCompatibility";

export const RELATIONSHIP_STATUSES = ["together", "dating", "crush", "ex", "curious"] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

type Copy = {
  seoTitle: string; seoDescription: string; eyebrow: string; title: string;
  yourName: string; theirName: string; nameOptional: string; yourBirthday: string; theirBirthday: string;
  statusLabel: string; statuses: Record<RelationshipStatus, string>;
  reveal: string; dateError: string;
  resultEyebrow: string; resultTitle: string; overallMatch: string; yourSign: string; theirSign: string;
  lifePath: string; dimensionsTitle: string; dimensions: Record<LoveDimension, string>;
  strengthTitle: string; strengthText: string; growthTitle: string; growthText: string;
  reflectionTitle: string; reflections: Record<RelationshipStatus, string>;
  startOver: string; youFallback: string; themFallback: string;
};

export const loveCompatibilityCopy: Record<Locale, Copy> = {
  en: {
    seoTitle: "Love Compatibility: Zodiac & Numerology | Dreamly", seoDescription: "Explore a symbolic love match with zodiac signs and life path numbers. Compare six relationship themes and find a question worth discussing.",
    eyebrow: "DREAMLY · LOVE MATCH", title: "Explore your connection",
    yourName: "Your name", theirName: "Their name", nameOptional: "Optional", yourBirthday: "Your birthday", theirBirthday: "Their birthday",
    statusLabel: "Where are you now?", statuses: { together: "Together", dating: "Dating", crush: "I have a crush", ex: "Former partner", curious: "Just curious" },
    reveal: "Reveal our match", dateError: "Enter two valid birthdays that are not in the future.",
    resultEyebrow: "YOUR LOVE MATCH", resultTitle: "{you} & {them}", overallMatch: "Overall compatibility", yourSign: "Your sign", theirSign: "Their sign", lifePath: "Life path {number}",
    dimensionsTitle: "Your connection at a glance", dimensions: { emotional: "Emotional connection", communication: "Communication", romance: "Romance & passion", trust: "Trust & stability", longTerm: "Long-term potential", values: "Shared values" },
    strengthTitle: "Where you may connect", strengthText: "{dimension} stands out in this symbolic reading. What does that look like for each of you in real life?", growthTitle: "Worth talking about", growthText: "{dimension} invites a conversation. Ask what each of you needs rather than treating this score as a verdict.",
    reflectionTitle: "A question for your situation", reflections: { together: "What helps both of you feel understood when life gets busy?", dating: "What pace feels comfortable for each of you as you get to know one another?", crush: "What small, respectful step could help you learn whether the interest is mutual?", ex: "What did this connection teach you about what you need now?", curious: "Which qualities matter most to you in a relationship?" },
    startOver: "Try another match", youFallback: "You", themFallback: "Them",
  },
  es: {
    seoTitle: "Compatibilidad amorosa: zodiaco y numerología | Dreamly", seoDescription: "Explora una conexión simbólica con signos zodiacales y números de vida. Compara seis temas de pareja y encuentra una pregunta para conversar.",
    eyebrow: "DREAMLY · COMPATIBILIDAD AMOROSA", title: "Explora su conexión",
    yourName: "Tu nombre", theirName: "Su nombre", nameOptional: "Opcional", yourBirthday: "Tu fecha de nacimiento", theirBirthday: "Su fecha de nacimiento",
    statusLabel: "¿En qué etapa están?", statuses: { together: "Estamos juntos", dating: "Estamos saliendo", crush: "Me gusta alguien", ex: "Exp pareja", curious: "Solo tengo curiosidad" },
    reveal: "Ver nuestra conexión", dateError: "Ingresa dos fechas de nacimiento válidas que no sean futuras.",
    resultEyebrow: "SU CONEXIÓN", resultTitle: "{you} y {them}", overallMatch: "Compatibilidad general", yourSign: "Tu signo", theirSign: "Su signo", lifePath: "Camino de vida {number}",
    dimensionsTitle: "Su conexión de un vistazo", dimensions: { emotional: "Conexión emocional", communication: "Comunicación", romance: "Romance y pasión", trust: "Confianza y estabilidad", longTerm: "Potencial a largo plazo", values: "Valores compartidos" },
    strengthTitle: "Donde pueden conectar", strengthText: "{dimension} destaca en esta lectura simbólica. ¿Cómo se manifiesta para cada quien en la vida real?", growthTitle: "Vale la pena hablarlo", growthText: "{dimension} abre una conversación. Pregúntense qué necesita cada quien en vez de tomar la cifra como un veredicto.",
    reflectionTitle: "Una pregunta para su momento", reflections: { together: "¿Qué les ayuda a sentirse comprendidos cuando la vida se acelera?", dating: "¿Qué ritmo les resulta cómodo mientras se conocen?", crush: "¿Qué paso pequeño y respetuoso te ayudaría a saber si el interés es mutuo?", ex: "¿Qué te enseñó este vínculo sobre lo que necesitas hoy?", curious: "¿Qué cualidades valoras más en una relación?" },
    startOver: "Probar otra conexión", youFallback: "Tú", themFallback: "La otra persona",
  },
  ar: {
    seoTitle: "توافق الحب: الأبراج وعلم الأعداد | Dreamly", seoDescription: "استكشف توافقًا رمزيًا عبر الأبراج وأرقام مسار الحياة، وقارن ستة جوانب للعلاقة مع سؤال يفتح باب الحوار.",
    eyebrow: "DREAMLY · توافق الحب", title: "استكشف ما يجمعكما",
    yourName: "اسمك", theirName: "اسم الطرف الآخر", nameOptional: "اختياري", yourBirthday: "تاريخ ميلادك", theirBirthday: "تاريخ ميلاد الطرف الآخر",
    statusLabel: "ما طبيعة العلاقة الآن؟", statuses: { together: "نحن معًا", dating: "نتعارف", crush: "أنا معجب بشخص", ex: "شريك سابق", curious: "مجرد فضول" },
    reveal: "اعرض توافقنا", dateError: "أدخل تاريخي ميلاد صحيحين لا يقعان في المستقبل.",
    resultEyebrow: "قراءتكما", resultTitle: "{you} و{them}", overallMatch: "التوافق العام", yourSign: "برجك", theirSign: "برج الطرف الآخر", lifePath: "مسار الحياة {number}",
    dimensionsTitle: "العلاقة في لمحة", dimensions: { emotional: "التواصل العاطفي", communication: "الحوار", romance: "الرومانسية والشغف", trust: "الثقة والاستقرار", longTerm: "إمكانات الاستمرار", values: "القيم المشتركة" },
    strengthTitle: "جانب قد يجمعكما", strengthText: "يبرز جانب {dimension} في هذه القراءة الرمزية. كيف يظهر ذلك لكل منكما في الواقع؟", growthTitle: "موضوع يستحق الحديث", growthText: "يدعو جانب {dimension} إلى الحوار. اسأل عما يحتاجه كل طرف بدل اعتبار الرقم حكمًا نهائيًا.",
    reflectionTitle: "سؤال يناسب وضعك", reflections: { together: "ما الذي يساعدكما على الشعور بأن كلًا منكما مسموع حين تزدحم الحياة؟", dating: "ما الوتيرة المريحة لكليكما خلال التعارف؟", crush: "ما الخطوة الصغيرة والمحترمة التي قد تكشف إن كان الاهتمام متبادلًا؟", ex: "ماذا علّمتك هذه العلاقة عما تحتاجه الآن؟", curious: "ما الصفات الأهم بالنسبة إليك في العلاقة؟" },
    startOver: "جرّب توافقًا آخر", youFallback: "أنت", themFallback: "الطرف الآخر",
  },
  pt: {
    seoTitle: "Compatibilidade amorosa: signos e numerologia | Dreamly", seoDescription: "Explore uma afinidade simbólica com signos e números do caminho de vida. Compare seis temas da relação e encontre uma pergunta para conversar.",
    eyebrow: "DREAMLY · COMPATIBILIDADE AMOROSA", title: "Explore a conexão de vocês",
    yourName: "Seu nome", theirName: "Nome da outra pessoa", nameOptional: "Opcional", yourBirthday: "Sua data de nascimento", theirBirthday: "Data de nascimento da outra pessoa",
    statusLabel: "Em que momento vocês estão?", statuses: { together: "Estamos juntos", dating: "Estamos saindo", crush: "Tenho uma paixão", ex: "Ex-parceiro(a)", curious: "Só por curiosidade" },
    reveal: "Ver nossa conexão", dateError: "Informe duas datas de nascimento válidas que não estejam no futuro.",
    resultEyebrow: "A CONEXÃO DE VOCÊS", resultTitle: "{you} e {them}", overallMatch: "Compatibilidade geral", yourSign: "Seu signo", theirSign: "Signo da outra pessoa", lifePath: "Caminho de vida {number}",
    dimensionsTitle: "A conexão em seis aspectos", dimensions: { emotional: "Conexão emocional", communication: "Comunicação", romance: "Romance e paixão", trust: "Confiança e estabilidade", longTerm: "Potencial a longo prazo", values: "Valores em comum" },
    strengthTitle: "Onde vocês podem se encontrar", strengthText: "{dimension} se destaca nesta leitura simbólica. Como isso aparece para cada um na vida real?", growthTitle: "Vale conversar sobre", growthText: "{dimension} convida ao diálogo. Perguntem o que cada um precisa, sem tratar a pontuação como sentença.",
    reflectionTitle: "Uma pergunta para este momento", reflections: { together: "O que ajuda vocês a se sentirem compreendidos quando a rotina aperta?", dating: "Que ritmo deixa os dois à vontade enquanto se conhecem?", crush: "Que pequeno passo respeitoso ajudaria você a descobrir se o interesse é recíproco?", ex: "O que essa relação ensinou sobre o que você precisa agora?", curious: "Quais qualidades mais importam para você em uma relação?" },
    startOver: "Testar outra conexão", youFallback: "Você", themFallback: "A outra pessoa",
  },
  de: {
    seoTitle: "Liebeskompatibilität: Sternzeichen & Numerologie | Dreamly", seoDescription: "Entdecke eine symbolische Verbindung mit Sternzeichen und Lebenswegzahlen. Vergleiche sechs Beziehungsthemen und finde eine Frage für ein Gespräch.",
    eyebrow: "DREAMLY · LIEBESKOMPATIBILITÄT", title: "Entdecke eure Verbindung",
    yourName: "Dein Name", theirName: "Name der anderen Person", nameOptional: "Optional", yourBirthday: "Dein Geburtstag", theirBirthday: "Geburtstag der anderen Person",
    statusLabel: "Wo steht ihr gerade?", statuses: { together: "Wir sind zusammen", dating: "Wir lernen uns kennen", crush: "Ich bin verliebt", ex: "Frühere Beziehung", curious: "Einfach neugierig" },
    reveal: "Unsere Verbindung ansehen", dateError: "Gib zwei gültige Geburtstage ein, die nicht in der Zukunft liegen.",
    resultEyebrow: "EURE VERBINDUNG", resultTitle: "{you} & {them}", overallMatch: "Gesamtkompatibilität", yourSign: "Dein Zeichen", theirSign: "Anderes Zeichen", lifePath: "Lebenswegzahl {number}",
    dimensionsTitle: "Eure Verbindung im Überblick", dimensions: { emotional: "Gefühlsnähe", communication: "Kommunikation", romance: "Romantik & Leidenschaft", trust: "Vertrauen & Beständigkeit", longTerm: "Langfristiges Potenzial", values: "Gemeinsame Werte" },
    strengthTitle: "Wo ihr euch finden könnt", strengthText: "{dimension} fällt in dieser symbolischen Deutung auf. Wie zeigt sich das für euch im Alltag?", growthTitle: "Ein Gesprächsthema", growthText: "{dimension} lädt zum Gespräch ein. Fragt einander nach euren Bedürfnissen, statt die Zahl als Urteil zu sehen.",
    reflectionTitle: "Eine Frage für eure Situation", reflections: { together: "Was hilft euch, euch auch in hektischen Zeiten verstanden zu fühlen?", dating: "Welches Tempo fühlt sich beim Kennenlernen für euch beide gut an?", crush: "Welcher kleine, respektvolle Schritt könnte zeigen, ob das Interesse gegenseitig ist?", ex: "Was hast du aus dieser Verbindung über deine heutigen Bedürfnisse gelernt?", curious: "Welche Eigenschaften sind dir in einer Beziehung am wichtigsten?" },
    startOver: "Andere Verbindung ansehen", youFallback: "Du", themFallback: "Die andere Person",
  },
  ru: {
    seoTitle: "Любовная совместимость: зодиак и нумерология | Dreamly", seoDescription: "Исследуйте символическую совместимость по знакам зодиака и числам жизненного пути. Шесть сторон отношений и вопрос для разговора.",
    eyebrow: "DREAMLY · ЛЮБОВНАЯ СОВМЕСТИМОСТЬ", title: "Исследуйте вашу связь",
    yourName: "Ваше имя", theirName: "Имя другого человека", nameOptional: "Необязательно", yourBirthday: "Ваша дата рождения", theirBirthday: "Дата рождения другого человека",
    statusLabel: "Что между вами сейчас?", statuses: { together: "Мы вместе", dating: "Мы встречаемся", crush: "Я влюблён(а)", ex: "Бывший партнёр", curious: "Просто интересно" },
    reveal: "Узнать о нашей связи", dateError: "Укажите две действительные даты рождения, не позже сегодняшнего дня.",
    resultEyebrow: "ВАША СВЯЗЬ", resultTitle: "{you} и {them}", overallMatch: "Общая совместимость", yourSign: "Ваш знак", theirSign: "Другой знак", lifePath: "Число жизненного пути {number}",
    dimensionsTitle: "Шесть сторон вашей связи", dimensions: { emotional: "Эмоциональная близость", communication: "Общение", romance: "Романтика и страсть", trust: "Доверие и стабильность", longTerm: "Долгосрочный потенциал", values: "Общие ценности" },
    strengthTitle: "Что может вас сближать", strengthText: "В этой символической трактовке выделяется {dimension}. Как это проявляется у каждого из вас в жизни?", growthTitle: "О чём стоит поговорить", growthText: "Тема «{dimension}» приглашает к разговору. Спросите друг друга о потребностях, вместо того чтобы принимать число за приговор.",
    reflectionTitle: "Вопрос для вашей ситуации", reflections: { together: "Что помогает каждому из вас чувствовать, что его слышат, когда дел становится слишком много?", dating: "Какой темп сближения комфортен вам обоим?", crush: "Какой небольшой и уважительный шаг поможет понять, взаимна ли симпатия?", ex: "Чему эта связь научила вас в отношении того, что вам нужно сейчас?", curious: "Какие качества для вас важнее всего в отношениях?" },
    startOver: "Проверить другую пару", youFallback: "Вы", themFallback: "Другой человек",
  },
};

type AiCopy = {
  yourGenderLabel: string; theirGenderLabel: string; genders: { woman: string; man: string };
  yourStory: string; theirStory: string; yourStoryHint: string; theirStoryHint: string;
  yourPhoto: string; theirPhoto: string; addPhoto: string; changePhoto: string; removePhoto: string; photoProcessing: string;
  photoError: string; yourPhotoInvalid: string; theirPhotoInvalid: string; photoInvalidTitle: string; photoInvalidDismiss: string;
  accessTitle: string; accessText: string; watchAd: string; subscribe: string; adUnavailable: string;
  saveLocal: string; savedLocal: string; saveSignIn: string; saveToAccount: string; saving: string; saved: string; saveError: string;
  genderError: string; loading: string; loadingBody: string; aiError: string; rateError: string; summaryTitle: string;
};

type ProfileCopy = {
  empty: string; loading: string; error: string; retry: string; close: string; open: string;
  remove: string; confirmTitle: string; confirmBody: string; confirmDelete: string; cancel: string; deleteError: string;
};

export const loveMatchProfileCopy: Record<Locale, ProfileCopy> = {
  en: {
    empty: "Save a match to your account to see it here.",
    loading: "Loading your matches…", error: "Your matches could not be loaded.", retry: "Try again", close: "Close", open: "Open {you} and {them}",
    remove: "Remove {you} and {them}", confirmTitle: "Delete this match?", confirmBody: "{you} and {them} will be removed from your profile.", confirmDelete: "Delete", cancel: "Cancel", deleteError: "Could not delete this match. Please try again.",
  },
  es: {
    empty: "Guarda una lectura en tu cuenta para verla aquí.",
    loading: "Cargando tus lecturas…", error: "No pudimos cargar tus lecturas.", retry: "Reintentar", close: "Cerrar", open: "Abrir {you} y {them}",
    remove: "Quitar a {you} y {them}", confirmTitle: "¿Eliminar esta lectura?", confirmBody: "{you} y {them} se quitarán de tu perfil.", confirmDelete: "Eliminar", cancel: "Cancelar", deleteError: "No pudimos eliminar esta lectura. Inténtalo de nuevo.",
  },
  ar: {
    empty: "احفظ قراءة التوافق في حسابك لتظهر هنا.",
    loading: "نجلب توافقاتك…", error: "تعذر تحميل التوافقات.", retry: "حاول مجددًا", close: "إغلاق", open: "افتح {you} و{them}",
    remove: "احذف {you} و{them}", confirmTitle: "حذف هذا التوافق؟", confirmBody: "سيُزال {you} و{them} من حسابك.", confirmDelete: "حذف", cancel: "إلغاء", deleteError: "تعذر حذف التوافق. حاول مجددًا.",
  },
  pt: {
    empty: "Salve uma leitura na sua conta para vê-la aqui.",
    loading: "Carregando suas leituras…", error: "Não foi possível carregar suas leituras.", retry: "Tentar de novo", close: "Fechar", open: "Abrir {you} e {them}",
    remove: "Remover {you} e {them}", confirmTitle: "Excluir esta leitura?", confirmBody: "{you} e {them} serão removidos do seu perfil.", confirmDelete: "Excluir", cancel: "Cancelar", deleteError: "Não foi possível excluir esta leitura. Tente novamente.",
  },
  de: {
    empty: "Speichere eine Deutung in deinem Konto, um sie hier zu sehen.",
    loading: "Deine Deutungen werden geladen…", error: "Deine Deutungen konnten nicht geladen werden.", retry: "Erneut versuchen", close: "Schließen", open: "{you} und {them} öffnen",
    remove: "{you} und {them} entfernen", confirmTitle: "Diese Deutung löschen?", confirmBody: "{you} und {them} werden aus deinem Profil entfernt.", confirmDelete: "Löschen", cancel: "Abbrechen", deleteError: "Die Deutung konnte nicht gelöscht werden. Bitte versuche es erneut.",
  },
  ru: {
    empty: "Сохраните разбор в аккаунте, чтобы увидеть его здесь.",
    loading: "Загружаем ваши разборы…", error: "Не удалось загрузить разборы.", retry: "Повторить", close: "Закрыть", open: "Открыть {you} и {them}",
    remove: "Удалить {you} и {them}", confirmTitle: "Удалить этот разбор?", confirmBody: "{you} и {them} исчезнут из профиля.", confirmDelete: "Удалить", cancel: "Отмена", deleteError: "Не удалось удалить разбор. Попробуйте снова.",
  },
};

export const loveMatchAiCopy: Record<Locale, AiCopy> = {
  en: {
    yourPhoto: "Your photo", theirPhoto: "Their photo", addPhoto: "Add photo", changePhoto: "Change photo", removePhoto: "Remove", photoProcessing: "Preparing photo…",
    photoError: "Choose a JPEG, PNG or WebP photo under 8 MB.", yourPhotoInvalid: "Your photo does not show a person. Love Match cannot compare a person with an animal or object. Please replace it.", theirPhotoInvalid: "Their photo does not show a person. Love Match cannot compare a person with an animal or object. Please replace it.", photoInvalidTitle: "Please replace the photo", photoInvalidDismiss: "Got it",
    accessTitle: "Unlock this Love Match", accessText: "Watch an ad for this check, or use a subscription.", watchAd: "Watch an ad", subscribe: "See subscription", adUnavailable: "The ad was not completed or is unavailable. Try again or use a subscription.",
    saveLocal: "Save", savedLocal: "Saved", saveSignIn: "Sign in and save", saveToAccount: "Save to account", saving: "Saving…", saved: "Saved to your account", saveError: "Could not save this match. Please try again.",
    yourGenderLabel: "YOU", theirGenderLabel: "THEM", genders: { woman: "Woman", man: "Man" },
    yourStory: "About you", theirStory: "About the other person", yourStoryHint: "What matters to you in this connection?", theirStoryHint: "What do you know about them and how you relate?",
    genderError: "Choose a gender option for both people.", loading: "Your match is in progress", loadingBody: "Please wait while we prepare your match.", aiError: "The reading could not be created right now. Please try again.", rateError: "Today's reading limit has been reached. Please come back tomorrow.", summaryTitle: "Your reading",
  },
  es: {
    yourPhoto: "Tu foto", theirPhoto: "Foto de la otra persona", addPhoto: "Añadir foto", changePhoto: "Cambiar foto", removePhoto: "Quitar", photoProcessing: "Preparando foto…",
    photoError: "Elige una foto JPEG, PNG o WebP de menos de 8 MB.", yourPhotoInvalid: "Tu foto no muestra a una persona. No podemos comparar a una persona con un animal u objeto. Cámbiala.", theirPhotoInvalid: "La otra foto no muestra a una persona. No podemos comparar a una persona con un animal u objeto. Cámbiala.", photoInvalidTitle: "Cambia la foto", photoInvalidDismiss: "Entendido",
    accessTitle: "Desbloquear esta compatibilidad", accessText: "Mira un anuncio para esta consulta o usa una suscripción.", watchAd: "Ver un anuncio", subscribe: "Ver suscripción", adUnavailable: "El anuncio no se completó o no está disponible. Inténtalo de nuevo o usa una suscripción.",
    saveLocal: "Guardar", savedLocal: "Guardado", saveSignIn: "Inicia sesión y guarda", saveToAccount: "Guardar en tu cuenta", saving: "Guardando…", saved: "Guardada en tu cuenta", saveError: "No pudimos guardar esta lectura. Inténtalo de nuevo.",
    yourGenderLabel: "TÚ", theirGenderLabel: "OTRA", genders: { woman: "Mujer", man: "Hombre" },
    yourStory: "Sobre ti", theirStory: "Sobre la otra persona", yourStoryHint: "¿Qué es importante para ti en esta conexión?", theirStoryHint: "¿Qué sabes de esa persona y de cómo se relacionan?",
    genderError: "Elige una opción de género para ambas personas.", loading: "Tu compatibilidad está en curso", loadingBody: "Espera un momento mientras preparamos tu compatibilidad.", aiError: "No pudimos crear la lectura ahora. Inténtalo de nuevo.", rateError: "Se alcanzó el límite de lecturas de hoy. Vuelve mañana.", summaryTitle: "Su lectura",
  },
  ar: {
    yourPhoto: "صورتك", theirPhoto: "صورة الشخص الآخر", addPhoto: "أضف صورة", changePhoto: "غيّر الصورة", removePhoto: "إزالة", photoProcessing: "نُجهز الصورة…",
    photoError: "اختر صورة JPEG أو PNG أو WebP بحجم أقل من ٨ ميغابايت.", yourPhotoInvalid: "صورتك لا تُظهر شخصًا. لا يمكن مقارنة إنسان بحيوان أو شيء. اختر صورة أخرى.", theirPhotoInvalid: "صورة الطرف الآخر لا تُظهر شخصًا. لا يمكن مقارنة إنسان بحيوان أو شيء. اختر صورة أخرى.", photoInvalidTitle: "اختر صورة أخرى", photoInvalidDismiss: "حسنًا",
    accessTitle: "افتح قراءة التوافق", accessText: "شاهد إعلانًا لهذه القراءة أو استخدم الاشتراك.", watchAd: "شاهد إعلانًا", subscribe: "عرض الاشتراك", adUnavailable: "لم يكتمل الإعلان أو لم يتوفر. حاول مجددًا أو استخدم الاشتراك.",
    saveLocal: "حفظ", savedLocal: "تم الحفظ", saveSignIn: "سجّل الدخول واحفظ", saveToAccount: "احفظ في الحساب", saving: "جارٍ الحفظ…", saved: "حُفظت في حسابك", saveError: "تعذر حفظ القراءة. حاول مجددًا.",
    yourGenderLabel: "أنت", theirGenderLabel: "الآخر", genders: { woman: "امرأة", man: "رجل" },
    yourStory: "عن نفسك", theirStory: "عن الشخص الآخر", yourStoryHint: "ما الذي يهمك في هذه العلاقة؟", theirStoryHint: "ماذا تعرف عن هذا الشخص وطريقة تواصلكما؟",
    genderError: "اختر خيارًا لكل شخص.", loading: "توافقكما قيد الإعداد", loadingBody: "يرجى الانتظار بينما نجهّز نتيجة التوافق.", aiError: "تعذر إعداد القراءة الآن. حاول مجددًا.", rateError: "بلغت حد القراءات لهذا اليوم. عد غدًا.", summaryTitle: "قراءتكما",
  },
  pt: {
    yourPhoto: "Sua foto", theirPhoto: "Foto da outra pessoa", addPhoto: "Adicionar foto", changePhoto: "Trocar foto", removePhoto: "Remover", photoProcessing: "Preparando foto…",
    photoError: "Escolha uma foto JPEG, PNG ou WebP de até 8 MB.", yourPhotoInvalid: "Sua foto não mostra uma pessoa. Não dá para comparar uma pessoa com um animal ou objeto. Troque a foto.", theirPhotoInvalid: "A outra foto não mostra uma pessoa. Não dá para comparar uma pessoa com um animal ou objeto. Troque a foto.", photoInvalidTitle: "Troque a foto", photoInvalidDismiss: "Entendi",
    accessTitle: "Desbloquear esta leitura", accessText: "Assista a um anúncio para esta consulta ou use uma assinatura.", watchAd: "Assistir a um anúncio", subscribe: "Ver assinatura", adUnavailable: "O anúncio não foi concluído ou está indisponível. Tente de novo ou use uma assinatura.",
    saveLocal: "Salvar", savedLocal: "Salvo", saveSignIn: "Entre e salve", saveToAccount: "Salvar na conta", saving: "Salvando…", saved: "Salva na sua conta", saveError: "Não foi possível salvar esta leitura. Tente novamente.",
    yourGenderLabel: "VOCÊ", theirGenderLabel: "OUTRA", genders: { woman: "Mulher", man: "Homem" },
    yourStory: "Sobre você", theirStory: "Sobre a outra pessoa", yourStoryHint: "O que importa para você nessa conexão?", theirStoryHint: "O que você sabe sobre essa pessoa e a relação de vocês?",
    genderError: "Escolha uma opção de gênero para cada pessoa.", loading: "A compatibilidade de vocês está em andamento", loadingBody: "Aguarde enquanto preparamos a compatibilidade de vocês.", aiError: "Não foi possível criar a leitura agora. Tente novamente.", rateError: "O limite de leituras de hoje foi atingido. Volte amanhã.", summaryTitle: "A leitura de vocês",
  },
  de: {
    yourPhoto: "Dein Foto", theirPhoto: "Foto der anderen Person", addPhoto: "Foto hinzufügen", changePhoto: "Foto ändern", removePhoto: "Entfernen", photoProcessing: "Foto wird vorbereitet…",
    photoError: "Wähle ein JPEG-, PNG- oder WebP-Foto unter 8 MB.", yourPhotoInvalid: "Dein Foto zeigt keinen Menschen. Ein Mensch lässt sich nicht mit einem Tier oder Gegenstand vergleichen. Bitte ersetze es.", theirPhotoInvalid: "Das andere Foto zeigt keinen Menschen. Ein Mensch lässt sich nicht mit einem Tier oder Gegenstand vergleichen. Bitte ersetze es.", photoInvalidTitle: "Bitte ersetze das Foto", photoInvalidDismiss: "Verstanden",
    accessTitle: "Diese Deutung freischalten", accessText: "Sieh dir für diese Prüfung eine Werbung an oder nutze ein Abo.", watchAd: "Werbung ansehen", subscribe: "Abo ansehen", adUnavailable: "Die Werbung wurde nicht abgeschlossen oder ist nicht verfügbar. Versuche es erneut oder nutze ein Abo.",
    saveLocal: "Speichern", savedLocal: "Gespeichert", saveSignIn: "Anmelden und speichern", saveToAccount: "Im Konto speichern", saving: "Wird gespeichert…", saved: "In deinem Konto gespeichert", saveError: "Die Deutung konnte nicht gespeichert werden. Bitte versuche es erneut.",
    yourGenderLabel: "DU", theirGenderLabel: "ANDERER", genders: { woman: "Frau", man: "Mann" },
    yourStory: "Über dich", theirStory: "Über die andere Person", yourStoryHint: "Was ist dir an dieser Verbindung wichtig?", theirStoryHint: "Was weißt du über die Person und euer Miteinander?",
    genderError: "Wähle für beide Personen eine Geschlechtsoption.", loading: "Euer Match wird erstellt", loadingBody: "Bitte warte einen Moment, während wir euer Match vorbereiten.", aiError: "Die Deutung konnte gerade nicht erstellt werden. Bitte versuche es erneut.", rateError: "Das Tageslimit für Deutungen ist erreicht. Komm morgen wieder.", summaryTitle: "Eure Deutung",
  },
  ru: {
    yourPhoto: "Ваше фото", theirPhoto: "Фото другого человека", addPhoto: "Добавить фото", changePhoto: "Заменить фото", removePhoto: "Удалить", photoProcessing: "Подготавливаем фото…",
    photoError: "Выберите фото JPEG, PNG или WebP размером до 8 МБ.", yourPhotoInvalid: "На вашем фото нет человека. Нельзя сравнить человека с животным или предметом. Замените фото.", theirPhotoInvalid: "На втором фото нет человека. Нельзя сравнить человека с животным или предметом. Замените фото.", photoInvalidTitle: "Замените фото", photoInvalidDismiss: "Понятно",
    accessTitle: "Открыть Love Match", accessText: "Посмотрите рекламу для этой проверки или используйте подписку.", watchAd: "Посмотреть рекламу", subscribe: "Посмотреть подписку", adUnavailable: "Реклама не завершена или недоступна. Попробуйте снова или используйте подписку.",
    saveLocal: "Сохранить", savedLocal: "Сохранено", saveSignIn: "Войти и сохранить", saveToAccount: "Сохранить в аккаунт", saving: "Сохраняем…", saved: "Сохранено в аккаунте", saveError: "Не удалось сохранить разбор. Попробуйте снова.",
    yourGenderLabel: "ВЫ", theirGenderLabel: "ДРУГОЙ", genders: { woman: "Женщина", man: "Мужчина" },
    yourStory: "О вас", theirStory: "О другом человеке", yourStoryHint: "Что для вас важно в этой связи?", theirStoryHint: "Что вы знаете об этом человеке и ваших отношениях?",
    genderError: "Выберите вариант для каждого человека.", loading: "Ваша совместимость готовится", loadingBody: "Подождите немного — мы готовим ваш результат.", aiError: "Сейчас не удалось создать разбор. Попробуйте ещё раз.", rateError: "Лимит разборов на сегодня исчерпан. Вернитесь завтра.", summaryTitle: "Ваш разбор",
  },
};
